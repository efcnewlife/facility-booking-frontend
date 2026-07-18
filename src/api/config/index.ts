import { ENV_CONFIG } from "@/config/env";

const BOOKING_API_PREFIX = "/api/v1";

export const API_ENDPOINTS = {
  AUTH: {
    MICROSOFT: `${BOOKING_API_PREFIX}/auth/login/microsoft`,
    LOGOUT: `${BOOKING_API_PREFIX}/auth/logout`,
    REFRESH: `${BOOKING_API_PREFIX}/auth/refresh`,
    PROFILE: `${BOOKING_API_PREFIX}/auth/me`,
  },
} as const;

export const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const REQUEST_CONFIG = {
  BASE_URL: ENV_CONFIG.API_BASE_URL,
  TIMEOUT: ENV_CONFIG.API_TIMEOUT,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
} as const;
