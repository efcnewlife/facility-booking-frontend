import { API_ENDPOINTS } from "@/api/config";
import { ENV_CONFIG, IS_SKIP_AUTH } from "@/config/env";
import i18n from "@/i18n";
import type { ApiError, ApiResponse, TokenResponse } from "@/types/api";
import type { AuthError, DevLoginCredentials, LoginResponse, User } from "@/types/auth";
import { httpClient } from "./httpClient";

interface MemberInfoResponse {
  id: string;
  email: string;
  first_name: string;
  last_name?: string | null;
  preferred_name?: string | null;
  preferredName?: string | null;
  roles?: string[];
  last_login_at?: string;
}

interface MemberLoginResponse {
  member: MemberInfoResponse;
  token: TokenResponse;
}

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user_data";
const REMEMBER_ME_KEY = "remember_me";
const REMEMBER_ME_EXPIRY = 30 * 24 * 60 * 60 * 1000;
const DEV_TOKEN_PREFIX = "dev_token_local_login";

const createDevUser = (email: string): User => {
  const nowIso = new Date().toISOString();
  return {
    id: "00000000-0000-4000-8000-000000000001",
    username: email,
    email,
    firstName: "Dev",
    lastName: "User",
    preferredName: "Dev User",
    status: "active",
    roles: ["member"],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

const isLocalDevToken = (token: string | null): boolean => {
  return Boolean(token?.startsWith(DEV_TOKEN_PREFIX));
};

const mapMemberToUser = (member: MemberInfoResponse): User => {
  const nowIso = new Date().toISOString();
  return {
    id: member.id,
    username: member.email,
    email: member.email,
    firstName: member.first_name || undefined,
    lastName: member.last_name || undefined,
    preferredName: member.preferred_name || member.preferredName || undefined,
    status: "active",
    roles: member.roles || [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

class AuthService {
  private inFlightCurrentUserPromise: Promise<ApiResponse<User>> | null = null;

  async loginWithMicrosoft(idToken: string, rememberMe: boolean): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await httpClient.post<MemberLoginResponse>(API_ENDPOINTS.AUTH.MICROSOFT, {
        idToken,
      });

      if (response.success && response.data) {
        const accessToken = response.data.token.accessToken;
        const user = mapMemberToUser(response.data.member);
        const refreshToken = response.data.token.refreshToken;
        const expiresAt = new Date(Date.now() + response.data.token.expiresIn * 1000).toISOString();

        this.setRememberMe(rememberMe);
        this.setToken(accessToken);
        this.clearOppositeStorage(rememberMe);

        if (refreshToken && rememberMe) {
          this.setRefreshToken(refreshToken);
        }

        this.setUser(user);

        return {
          success: true,
          data: {
            user,
            token: accessToken,
            refreshToken,
            expiresAt,
            rememberMe,
          },
          code: response.code,
        };
      }

      return {
        success: false,
        data: undefined as unknown as LoginResponse,
        code: response.code,
        error: response.error,
        message: response.message,
      };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Development-only local sign-in without Microsoft or backend API.
   */
  loginAsDevUser(credentials: DevLoginCredentials): ApiResponse<LoginResponse> {
    const email = credentials.email.trim() || ENV_CONFIG.DEV_LOGIN_EMAIL;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return {
        success: false,
        data: undefined as unknown as LoginResponse,
        code: 400,
        message: i18n.t("auth:devLoginInvalidEmail"),
      };
    }

    const user = createDevUser(email);
    const token = `${DEV_TOKEN_PREFIX}:${email}`;
    const rememberMe = credentials.rememberMe ?? false;

    this.setRememberMe(rememberMe);
    this.setToken(token);
    this.clearOppositeStorage(rememberMe);
    this.setUser(user);

    return {
      success: true,
      data: {
        user,
        token,
        rememberMe,
      },
      code: 200,
    };
  }

  async logout(): Promise<ApiResponse<void>> {
    try {
      const token = this.getToken();
      const refreshToken = this.getRefreshToken();
      if (token) {
        await httpClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
          accessToken: token,
          refreshToken,
        });
      }
    } catch (error) {
      console.warn("Logout API call failed, but clearing local state:", error);
    } finally {
      this.clearAuth();
    }

    return { success: true, data: undefined, code: 200 };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    if (this.inFlightCurrentUserPromise) {
      return this.inFlightCurrentUserPromise;
    }

    this.inFlightCurrentUserPromise = (async () => {
      try {
        const storedUser = this.getUser();
        const storedToken = this.getToken();
        if (isLocalDevToken(storedToken) && storedUser) {
          return { success: true, data: storedUser, code: 200 };
        }

        const response = await httpClient.get<MemberInfoResponse>(API_ENDPOINTS.AUTH.PROFILE);

        if (response.success && response.data) {
          const user = mapMemberToUser(response.data);
          this.setUser(user);
          return { success: true, data: user, code: response.code };
        }

        return {
          success: false,
          data: undefined as unknown as User,
          code: response.code,
          error: response.error,
          message: response.message,
        };
      } catch (error) {
        throw this.handleAuthError(error);
      } finally {
        this.inFlightCurrentUserPromise = null;
      }
    })();

    return this.inFlightCurrentUserPromise;
  }

  isAuthenticated(): boolean {
    if (IS_SKIP_AUTH) {
      return true;
    }

    const token = this.getToken();
    const user = this.getUser();
    if (isLocalDevToken(token) && user) {
      return true;
    }

    return Boolean(token && user);
  }

  getToken(): string | null {
    if (IS_SKIP_AUTH) {
      return "dev_token_skip_auth_mode";
    }

    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) {
      return sessionToken;
    }
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (!this.getRememberMe()) {
      return null;
    }

    const expiryTime = localStorage.getItem(`${REFRESH_TOKEN_KEY}_expiry`);
    if (expiryTime && Date.now() > parseInt(expiryTime, 10)) {
      this.clearAuth();
      return null;
    }

    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getUser(): User | null {
    let userData = localStorage.getItem(USER_KEY);
    if (!userData) {
      userData = sessionStorage.getItem(USER_KEY);
    }
    if (!userData) {
      return null;
    }
    return JSON.parse(userData) as User;
  }

  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(`${REFRESH_TOKEN_KEY}_expiry`);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  private setToken(token: string): void {
    if (this.getRememberMe()) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }

  private setRefreshToken(token: string): void {
    if (!this.getRememberMe()) {
      return;
    }
    const expiryTime = Date.now() + REMEMBER_ME_EXPIRY;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    localStorage.setItem(`${REFRESH_TOKEN_KEY}_expiry`, expiryTime.toString());
  }

  private setUser(user: User): void {
    if (this.getRememberMe()) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  private getRememberMe(): boolean {
    return localStorage.getItem(REMEMBER_ME_KEY) === "true";
  }

  private setRememberMe(rememberMe: boolean): void {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_ME_KEY, "true");
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }

  private clearOppositeStorage(rememberMe: boolean): void {
    if (rememberMe) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(`${REFRESH_TOKEN_KEY}_expiry`);
  }

  private handleAuthError(error: unknown): AuthError {
    if (error && typeof error === "object" && "code" in error && typeof (error as ApiError).code === "number") {
      const apiError = error as ApiError;
      if (apiError.code === 401) {
        this.clearAuth();
      }
      return {
        code: apiError.code.toString(),
        message: apiError.message || i18n.t("errors:unknown"),
        details: apiError.details,
      };
    }

    return {
      code: "UNKNOWN_ERROR",
      message: error instanceof Error ? error.message : i18n.t("errors:unknown"),
    };
  }
}

export const authService = new AuthService();

export default authService;
