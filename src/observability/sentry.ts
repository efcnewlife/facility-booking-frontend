import * as Sentry from "@sentry/react";
import type { RootOptions } from "react-dom/client";
import { ENV_CONFIG } from "@/config/env";
import { resolveSentryInit, type SentryConfig } from "@/observability/sentryConfig";
import { sanitizeBreadcrumb, sanitizeEvent, sanitizeLog, sanitizeUrl } from "@/observability/sentryPrivacy";

const ENV_SENTRY_CONFIG: SentryConfig = {
  mode: ENV_CONFIG.APP_ENV,
  dsn: ENV_CONFIG.SENTRY_DSN,
  enabled: ENV_CONFIG.SENTRY_ENABLED,
  releaseVersion: ENV_CONFIG.SENTRY_RELEASE_VERSION,
};

// The SDK collects no personal or request data itself; the internal member ID is set explicitly
// and every channel passes through `sentryPrivacy` before transmission.
const PRIVATE_DATA_COLLECTION: Sentry.BrowserOptions["dataCollection"] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
  frameContextLines: 0,
};

type InitSentryOverrides = Pick<Sentry.BrowserOptions, "transport">;

/** Initializes the Sentry client at most once; returns whether this call created it. */
export const initSentry = (config: SentryConfig = ENV_SENTRY_CONFIG, overrides: InitSentryOverrides = {}) => {
  if (Sentry.isInitialized()) return false;

  const resolved = resolveSentryInit(config);
  if (!resolved.enabled) return false;

  // No tracing, Replay, sessions, metrics, or client reports.
  Sentry.init({
    dsn: resolved.dsn,
    environment: resolved.environment,
    release: resolved.release,
    defaultIntegrations: false,
    integrations: [
      Sentry.eventFiltersIntegration(),
      Sentry.functionToStringIntegration(),
      Sentry.browserApiErrorsIntegration(),
      Sentry.breadcrumbsIntegration(),
      Sentry.consoleIntegration({ levels: ["warn", "error"] }),
      Sentry.globalHandlersIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.httpContextIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    ],
    dataCollection: PRIVATE_DATA_COLLECTION,
    sendClientReports: false,
    beforeSend: sanitizeEvent,
    beforeBreadcrumb: sanitizeBreadcrumb,
    beforeSendLog: sanitizeLog,
    beforeSendMetric: () => null,
    ...overrides,
  });
  return true;
};

/** Sets the telemetry user to the internal member ID only; `null` clears it. */
export const setTelemetryUser = (memberId: string | null) => {
  Sentry.setUser(memberId ? { id: memberId } : null);
};

class ApiFailureError extends Error {
  override name = "ApiFailureError";
}

const ID_SEGMENT = /^(?:\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const apiRoute = (url: string) =>
  sanitizeUrl(url)
    .split("?", 1)[0]
    .split("/")
    .map((segment) => (ID_SEGMENT.test(segment) ? "{id}" : segment))
    .join("/");

/**
 * Reports a 5xx API response as one issue per route and status. Bodies and backend messages are not
 * sent; 4xx responses (validation, auth, Booking conflicts), timeouts, and offline errors are not issues.
 */
export const reportApiFailure = (status: number, request: { method?: string; url?: string }) => {
  if (status < 500) return;

  const method = (request.method ?? "GET").toUpperCase();
  const route = apiRoute(request.url ?? "");
  Sentry.captureException(new ApiFailureError(`API ${status} ${method} ${route}`), {
    fingerprint: ["api-failure", method, route, String(status)],
    tags: { "api.method": method, "api.route": route, "api.status": status },
  });
};

/** Reports a defect raised inside the app's own code that was handled without surfacing globally. */
export const reportUnexpectedError = (error: Error) => {
  Sentry.captureException(error);
};

/** React root error hooks: report once, then keep React's default console/global reporting. */
export const sentryReactRootOptions = {
  onCaughtError: Sentry.reactErrorHandler((error) => console.error(error)),
  onUncaughtError: (error, errorInfo) => {
    Sentry.captureReactException(error, errorInfo, {
      mechanism: { handled: false, type: "auto.function.react.error_handler" },
    });
    reportError(error);
  },
} satisfies Pick<RootOptions, "onCaughtError" | "onUncaughtError">;
