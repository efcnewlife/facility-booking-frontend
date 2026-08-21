import { API_ENDPOINTS, REQUEST_CONFIG } from "@/api";
import i18n from "@/i18n";
import type { ApiError, ApiResponse, TokenResponse } from "@/types/api";
import { deepKeysToSnakeCase } from "@/utils/caseConvert";
import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HttpStatusCode,
  InternalAxiosRequestConfig,
} from "axios";

type RequestInterceptor = (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>;
type ResponseInterceptor = (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

class HttpClient {
  private axiosInstance: AxiosInstance;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: REQUEST_CONFIG.BASE_URL,
      timeout: REQUEST_CONFIG.TIMEOUT,
      headers: REQUEST_CONFIG.HEADERS,
    });

    this.axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const headers = new AxiosHeaders(config.headers);
      headers.set("Accept-Language", this.resolveAcceptLanguage());
      config.headers = headers;
      return config;
    });

    this.setupDefaultInterceptors();
  }

  private addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  private addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  private addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  private async executeRequestInterceptors(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    let finalConfig = config;
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    return finalConfig;
  }

  private async executeResponseInterceptors(response: AxiosResponse): Promise<AxiosResponse> {
    let finalResponse = response;
    for (const interceptor of this.responseInterceptors) {
      finalResponse = await interceptor(finalResponse);
    }
    return finalResponse;
  }

  private async executeErrorInterceptors(error: ApiError): Promise<ApiError> {
    let finalError = error;
    for (const interceptor of this.errorInterceptors) {
      finalError = await interceptor(finalError);
    }
    return finalError;
  }

  private resolveAcceptLanguage(): string {
    const lng = i18n.language ?? "en";
    if (lng === "zh-TW") {
      return "zh-TW";
    }
    if (lng === "zh-CN") {
      return "zh-CN";
    }
    return "en";
  }

  private getErrorMessage(status: number): string {
    switch (status) {
      case HttpStatusCode.Unauthorized:
        return i18n.t("errors:unauthorized");
      case HttpStatusCode.Forbidden:
        return i18n.t("errors:forbidden");
      case HttpStatusCode.NotFound:
        return i18n.t("errors:notFound");
      case HttpStatusCode.InternalServerError:
        return i18n.t("errors:server");
      default:
        return i18n.t("errors:unknown");
    }
  }

  private handleError(error: AxiosError): ApiError {
    if (error.code === "ECONNABORTED") {
      return {
        code: HttpStatusCode.RequestTimeout,
        message: i18n.t("errors:timeout"),
      };
    }

    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data as
        { detail?: string; debug_detail?: unknown; url?: string; message?: string } | undefined;
      const backendDetail = responseData?.detail;
      const fallbackMessage = responseData?.message;
      const message =
        (typeof backendDetail === "string" && backendDetail) || fallbackMessage || this.getErrorMessage(status);

      return {
        code: status,
        message,
        details: {
          detail: backendDetail,
          debug_detail: responseData?.debug_detail,
          url: responseData?.url,
          ...responseData,
        },
      };
    }

    return {
      code: 0,
      message: i18n.t("errors:network"),
    };
  }

  private async retryRequest(config: AxiosRequestConfig, attempt = 1): Promise<AxiosResponse> {
    try {
      return await this.axiosInstance.request(config);
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const isTimeout = axiosError.code === "ECONNABORTED";
      const isNetworkError = !axiosError.response;
      const shouldRetry = isNetworkError || isTimeout || (typeof status === "number" && status >= 500);

      if (shouldRetry && attempt < REQUEST_CONFIG.RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_CONFIG.RETRY_DELAY));
        return this.retryRequest(config, attempt + 1);
      }
      throw error;
    }
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const processedConfig = await this.executeRequestInterceptors(config);
      const response = await this.retryRequest(processedConfig);
      const processedResponse = await this.executeResponseInterceptors(response);

      return {
        success: true,
        data: processedResponse.data,
        code: processedResponse.status,
      };
    } catch (error) {
      const apiError = this.handleError(error as AxiosError);

      if (
        apiError.code === HttpStatusCode.Unauthorized &&
        !this.isRefreshRequest(config) &&
        !this.isLoginRequest(config)
      ) {
        try {
          await this.getOrCreateRefreshPromise();
          const retriedConfig = await this.executeRequestInterceptors(config);
          const retriedResponse = await this.retryRequest(retriedConfig);
          const processedRetryResponse = await this.executeResponseInterceptors(retriedResponse);

          return {
            success: true,
            data: processedRetryResponse.data,
            code: processedRetryResponse.status,
          };
        } catch (retryError) {
          const finalError =
            retryError && typeof retryError === "object" && "code" in retryError
              ? (retryError as ApiError)
              : this.handleError(retryError as AxiosError);
          throw await this.executeErrorInterceptors(finalError);
        }
      }

      throw await this.executeErrorInterceptors(apiError);
    }
  }

  async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "GET", url, params });
  }

  async post<T = unknown>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>({ method: "POST", url, data });
  }

  private isRefreshRequest(config: AxiosRequestConfig): boolean {
    const url = typeof config.url === "string" ? config.url : "";
    return url === API_ENDPOINTS.AUTH.REFRESH;
  }

  private isLoginRequest(config: AxiosRequestConfig): boolean {
    const url = typeof config.url === "string" ? config.url : "";
    return url === API_ENDPOINTS.AUTH.MICROSOFT;
  }

  private async getOrCreateRefreshPromise(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshAccessToken().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async refreshAccessToken(): Promise<string> {
    const storedRefreshToken = localStorage.getItem("refresh_token");
    if (!storedRefreshToken) {
      throw {
        code: HttpStatusCode.Unauthorized,
        message: "No refresh token available",
      } as ApiError;
    }

    const response = await this.axiosInstance.post(API_ENDPOINTS.AUTH.REFRESH, {
      refresh_token: storedRefreshToken,
    });

    const data = response.data as TokenResponse;
    const newAccessToken = data.accessToken;
    const newRefreshToken = data.refreshToken;

    if (!newAccessToken) {
      throw {
        code: HttpStatusCode.Unauthorized,
        message: "Failed to refresh access token",
      } as ApiError;
    }

    localStorage.setItem("auth_token", newAccessToken);
    if (newRefreshToken) {
      localStorage.setItem("refresh_token", newRefreshToken);
    }

    return newAccessToken;
  }

  private getTokenFromStorage(): string | null {
    const sessionToken = sessionStorage.getItem("auth_token");
    if (sessionToken) {
      return sessionToken;
    }
    return localStorage.getItem("auth_token");
  }

  private setupDefaultInterceptors(): void {
    this.addRequestInterceptor(async (config) => {
      const token = this.getTokenFromStorage();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }

      if (config.data !== undefined && !(config.data instanceof FormData)) {
        config.data = deepKeysToSnakeCase(config.data);
      }

      if (config.params && typeof config.params === "object" && !(config.params instanceof URLSearchParams)) {
        config.params = deepKeysToSnakeCase(config.params) as typeof config.params;
      }

      return config;
    });

    this.addResponseInterceptor(async (response) => response);
    this.addErrorInterceptor(async (error) => {
      console.error("API Error:", error);
      return error;
    });
  }
}

export const httpClient = new HttpClient();

export default httpClient;
