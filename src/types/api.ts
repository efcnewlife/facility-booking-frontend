export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  code?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ApiError {
  code: number;
  message: string;
  details?: {
    detail?: string;
    debug_detail?: unknown;
    url?: string;
    message?: string;
    [key: string]: unknown;
  };
}
