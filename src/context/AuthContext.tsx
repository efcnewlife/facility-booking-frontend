import { ensureMsalReady, MSAL_LOGIN_SCOPES } from "@/auth/msalInstance";
import { authService } from "@/api/services/authService";
import { IS_SKIP_AUTH } from "@/config/env";
import i18n from "@/i18n";
import type { AuthState, DevLoginCredentials, User } from "@/types/auth";
import { createContext, type ReactNode, useContext, useEffect, useReducer } from "react";

type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: { user: User; token: string } }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_CLEAR_ERROR" };

interface AuthContextType extends AuthState {
  loginWithMicrosoft: (rememberMe: boolean) => Promise<void>;
  loginAsDevUser: (credentials: DevLoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isLoading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "AUTH_START":
      return { ...state, isLoading: true, error: null };
    case "AUTH_SUCCESS":
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        error: null,
      };
    case "AUTH_FAILURE":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: action.payload || null,
      };
    case "AUTH_LOGOUT":
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      };
    case "AUTH_CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initializeAuth = async () => {
      if (IS_SKIP_AUTH) {
        const devUser = authService.getUser();
        const devToken = authService.getToken();
        if (devUser && devToken) {
          dispatch({
            type: "AUTH_SUCCESS",
            payload: { user: devUser, token: devToken },
          });
        } else {
          dispatch({ type: "AUTH_FAILURE", payload: "" });
        }
        return;
      }

      if (!authService.isAuthenticated()) {
        const hasAccessToken = Boolean(authService.getToken());
        const hasRefreshToken = Boolean(authService.getRefreshToken());
        if (!hasAccessToken && !hasRefreshToken) {
          dispatch({ type: "AUTH_FAILURE", payload: "" });
          authService.clearAuth();
          return;
        }
      }

      try {
        dispatch({ type: "AUTH_START" });
        const response = await authService.getCurrentUser();
        if (response.success && response.data) {
          const token = authService.getToken();
          dispatch({
            type: "AUTH_SUCCESS",
            payload: { user: response.data, token: token || "" },
          });
        } else {
          dispatch({ type: "AUTH_FAILURE", payload: "" });
        }
      } catch {
        dispatch({ type: "AUTH_FAILURE", payload: "" });
      }
    };

    initializeAuth();
  }, []);

  const loginWithMicrosoft = async (rememberMe: boolean) => {
    try {
      dispatch({ type: "AUTH_START" });
      const msal = await ensureMsalReady();
      if (!msal) {
        dispatch({ type: "AUTH_FAILURE", payload: i18n.t("auth:microsoftNotConfigured") });
        return;
      }

      const authResult = await msal.loginPopup({ scopes: MSAL_LOGIN_SCOPES });
      if (authResult.account) {
        msal.setActiveAccount(authResult.account);
      }

      const idToken = authResult.idToken;
      if (!idToken) {
        dispatch({ type: "AUTH_FAILURE", payload: i18n.t("auth:noIdTokenFromMicrosoft") });
        return;
      }

      const response = await authService.loginWithMicrosoft(idToken, rememberMe);
      if (response.success && response.data) {
        const token = authService.getToken();
        dispatch({
          type: "AUTH_SUCCESS",
          payload: { user: response.data.user, token: token || "" },
        });
      } else {
        dispatch({
          type: "AUTH_FAILURE",
          payload: response.message || i18n.t("auth:microsoftSignInFailed"),
        });
      }
    } catch (error) {
      dispatch({
        type: "AUTH_FAILURE",
        payload: error instanceof Error ? error.message : i18n.t("auth:microsoftSignInFailed"),
      });
    }
  };

  const loginAsDevUser = async (credentials: DevLoginCredentials) => {
    try {
      dispatch({ type: "AUTH_START" });
      const response = authService.loginAsDevUser(credentials);

      if (response.success && response.data) {
        const token = authService.getToken();
        dispatch({
          type: "AUTH_SUCCESS",
          payload: { user: response.data.user, token: token || "" },
        });
      } else {
        dispatch({
          type: "AUTH_FAILURE",
          payload: response.message || i18n.t("auth:devLoginFailed"),
        });
      }
    } catch (error) {
      dispatch({
        type: "AUTH_FAILURE",
        payload: error instanceof Error ? error.message : i18n.t("auth:devLoginFailed"),
      });
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      dispatch({ type: "AUTH_LOGOUT" });
    }
  };

  const clearError = () => {
    dispatch({ type: "AUTH_CLEAR_ERROR" });
  };

  const value: AuthContextType = {
    ...state,
    loginWithMicrosoft,
    loginAsDevUser,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
