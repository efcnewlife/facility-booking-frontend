import { ENV_CONFIG } from "@/config/env";

const BOOKING_API_PREFIX = "/api/v1";

export const API_ENDPOINTS = {
  AUTH: {
    MOCK_LOGIN: `${BOOKING_API_PREFIX}/auth/mock-login`,
    MICROSOFT: `${BOOKING_API_PREFIX}/auth/login/microsoft`,
    LOGOUT: `${BOOKING_API_PREFIX}/auth/logout`,
    REFRESH: `${BOOKING_API_PREFIX}/auth/refresh`,
    PROFILE: `${BOOKING_API_PREFIX}/auth/me`,
  },
  MINISTRY: {
    MINE: `${BOOKING_API_PREFIX}/ministry/ministries/mine`,
    APPLICATIONS: `${BOOKING_API_PREFIX}/ministry/applications`,
    APPLICATION: (ministryId: string) => `${BOOKING_API_PREFIX}/ministry/applications/${ministryId}`,
    RESUBMIT_APPLICATION: (ministryId: string) => `${BOOKING_API_PREFIX}/ministry/applications/${ministryId}/submit`,
    PENDING_APPROVALS_FOR_ME: `${BOOKING_API_PREFIX}/ministry/approvals/pending-for-me`,
    APPLICATION_DETAIL: (ministryId: string) => `${BOOKING_API_PREFIX}/ministry/approvals/${ministryId}`,
    APPROVE_APPLICATION: (ministryId: string) => `${BOOKING_API_PREFIX}/ministry/approvals/${ministryId}/approve`,
    REJECT_APPLICATION: (ministryId: string) => `${BOOKING_API_PREFIX}/ministry/approvals/${ministryId}/reject`,
    MINISTRY_TYPES: `${BOOKING_API_PREFIX}/ministry/catalog/ministry-types`,
    TARGET_AUDIENCES: `${BOOKING_API_PREFIX}/ministry/catalog/target-audiences`,
  },
  ORG: {
    ASSIGNABLE_POSITIONS: `${BOOKING_API_PREFIX}/org/positions/assignable`,
    LOCALES: `${BOOKING_API_PREFIX}/org/locales`,
    USER_SEARCH: `${BOOKING_API_PREFIX}/org/users/search`,
  },
  FACILITY: {
    AVAILABILITY: `${BOOKING_API_PREFIX}/facility/rooms/availability`,
    BOOKINGS: `${BOOKING_API_PREFIX}/facility/bookings`,
    PREVIEW_QUOTE: `${BOOKING_API_PREFIX}/facility/preview-quote`,
    MY_BOOKINGS: `${BOOKING_API_PREFIX}/facility/bookings/mine`,
    booking: (bookingId: string) => `${BOOKING_API_PREFIX}/facility/bookings/${bookingId}`,
    cancelBooking: (bookingId: string) => `${BOOKING_API_PREFIX}/facility/bookings/${bookingId}/cancel`,
  },
  CONTENT: {
    LEGAL_DOCUMENT: (product: string, kind: string) =>
      `${BOOKING_API_PREFIX}/content/legal-document/${product}/${kind}`,
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
