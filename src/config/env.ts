export type AppEnv = "development" | "staging" | "production" | "test";

export const ENV_CONFIG = {
  APP_ENV: (import.meta.env.MODE as AppEnv) || "development",
  NODE_ENV: import.meta.env.PROD ? "production" : "development",

  APP_NAME: import.meta.env.VITE_APP_NAME || "Facility Booking",
  APP_TITLE: import.meta.env.VITE_APP_TITLE || "Facility Booking",
  APP_VERSION: import.meta.env.VITE_APP_VERSION || "0.1.0",

  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || "90000", 10),

  SHOW_MOCK_LOGIN: import.meta.env.VITE_SHOW_MOCK_LOGIN === "true",
  MOCK_LOGIN_EMAIL: (import.meta.env.VITE_MOCK_LOGIN_EMAIL as string | undefined) || "qa@test.local",
  MOCK_LOGIN_SECRET: (import.meta.env.VITE_MOCK_LOGIN_SECRET as string | undefined) || "",

  AZURE_CLIENT_ID: (import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined) || "",
  AZURE_TENANT_ID: (import.meta.env.VITE_AZURE_TENANT_ID as string | undefined) || "",
  AZURE_REDIRECT_URI: (import.meta.env.VITE_AZURE_REDIRECT_URI as string | undefined) || "",
} as const;

export const IS_DEV = ENV_CONFIG.APP_ENV === "development";
export const IS_STAGING = ENV_CONFIG.APP_ENV === "staging";
export const IS_PROD = ENV_CONFIG.APP_ENV === "production";
export const IS_SHOW_MOCK_LOGIN = !IS_PROD && ENV_CONFIG.SHOW_MOCK_LOGIN;
export const IS_MICROSOFT_LOGIN_ENABLED =
  Boolean(ENV_CONFIG.AZURE_CLIENT_ID?.trim()) && Boolean(ENV_CONFIG.AZURE_TENANT_ID?.trim());
