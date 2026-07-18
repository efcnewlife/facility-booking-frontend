export type AppEnv = "development" | "staging" | "production" | "test";

export const ENV_CONFIG = {
  APP_ENV: (import.meta.env.MODE as AppEnv) || "development",
  NODE_ENV: import.meta.env.PROD ? "production" : "development",

  APP_NAME: import.meta.env.VITE_APP_NAME || "Facility Booking",
  APP_TITLE: import.meta.env.VITE_APP_TITLE || "Facility Booking",
  APP_VERSION: import.meta.env.VITE_APP_VERSION || "0.1.0",

  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000",
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || "90000", 10),

  SKIP_AUTH: import.meta.env.VITE_SKIP_AUTH === "true",
  SHOW_DEV_LOGIN: import.meta.env.VITE_SHOW_DEV_LOGIN === "true",
  DEV_LOGIN_EMAIL: (import.meta.env.VITE_DEV_LOGIN_EMAIL as string | undefined) || "dev@local.test",

  AZURE_CLIENT_ID: (import.meta.env.VITE_AZURE_CLIENT_ID as string | undefined) || "",
  AZURE_TENANT_ID: (import.meta.env.VITE_AZURE_TENANT_ID as string | undefined) || "",
  AZURE_REDIRECT_URI: (import.meta.env.VITE_AZURE_REDIRECT_URI as string | undefined) || "",
} as const;

export const IS_DEV = ENV_CONFIG.APP_ENV === "development";
export const IS_SKIP_AUTH = IS_DEV && ENV_CONFIG.SKIP_AUTH;
export const IS_SHOW_DEV_LOGIN = IS_DEV && ENV_CONFIG.SHOW_DEV_LOGIN;
export const IS_MICROSOFT_LOGIN_ENABLED =
  Boolean(ENV_CONFIG.AZURE_CLIENT_ID?.trim()) && Boolean(ENV_CONFIG.AZURE_TENANT_ID?.trim());
