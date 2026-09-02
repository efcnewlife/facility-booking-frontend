export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string;
  avatar?: string;
  status: "active" | "inactive" | "suspended";
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  rememberMe?: boolean;
}

export interface MockLoginCredentials {
  email: string;
  rememberMe?: boolean;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
