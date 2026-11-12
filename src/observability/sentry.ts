import * as Sentry from "@sentry/react";
import type { RootOptions } from "react-dom/client";
import { BOOKING_API_PREFIX, REQUEST_CONFIG } from "@/api/config";
import { ENV_CONFIG } from "@/config/env";
import { resolveSentryInit, type SentryConfig } from "@/observability/sentryConfig";
import {
  sanitizeBreadcrumb,
  sanitizeEnvelope,
  sanitizeEvent,
  sanitizeLog,
  sanitizeRecordingEvent,
  sanitizeReplayEvent,
  sanitizeSpan,
  sanitizeUrl,
} from "@/observability/sentryPrivacy";

const ENV_SENTRY_CONFIG: SentryConfig = {
  mode: ENV_CONFIG.APP_ENV,
  dsn: ENV_CONFIG.SENTRY_DSN,
  enabled: ENV_CONFIG.SENTRY_ENABLED,
  releaseVersion: ENV_CONFIG.SENTRY_RELEASE_VERSION,
  tracesSampleRate: ENV_CONFIG.SENTRY_TRACES_SAMPLE_RATE,
  replaysSessionSampleRate: ENV_CONFIG.SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
  replaysOnErrorSampleRate: ENV_CONFIG.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
  apiUrl: `${REQUEST_CONFIG.BASE_URL}${BOOKING_API_PREFIX}`,
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

// Every recorded text node and input is masked and media is blocked; network frames keep no headers or bodies.
const privateReplayIntegration = () =>
  Sentry.replayIntegration({
    maskAllText: true,
    maskAllInputs: true,
    blockAllMedia: true,
    // Replay's defaults plus link targets, which can carry email addresses (`mailto:`) and query values.
    maskAttributes: ["title", "placeholder", "aria-label", "href"],
    // Uncompressed recordings let `sanitizeEnvelope` clean snapshot page URLs before transmission.
    useCompression: false,
    networkDetailAllowUrls: [],
    networkCaptureBodies: false,
    beforeAddRecordingEvent: sanitizeRecordingEvent,
  });

const replayEventPrivacyIntegration: Parameters<typeof Sentry.addIntegration>[0] = {
  name: "ReplayEventPrivacy",
  processEvent: (event: Sentry.Event) =>
    event.type === "replay_event" ? sanitizeReplayEvent(event as Sentry.ErrorEvent) : event,
};

type SentryTransport = NonNullable<Sentry.BrowserOptions["transport"]>;

const privateTransport =
  (makeTransport: SentryTransport): SentryTransport =>
  (options) => {
    const transport = makeTransport(options);
    return { ...transport, send: (envelope) => transport.send(sanitizeEnvelope(envelope)) };
  };

type InitSentryOverrides = Pick<Sentry.BrowserOptions, "transport">;

let replaySampleRates = { session: 0, onError: 0 };
let telemetryMemberId: string | null = null;
let replayRestart: Promise<void> | null = null;

/** Initializes the Sentry client at most once; returns whether this call created it. */
export const initSentry = (config: SentryConfig = ENV_SENTRY_CONFIG, overrides: InitSentryOverrides = {}) => {
  if (Sentry.isInitialized()) return false;

  const resolved = resolveSentryInit(config);
  if (!resolved.enabled) return false;

  const tracing = resolved.tracesSampleRate !== undefined;
  const replay = resolved.replaysSessionSampleRate !== undefined || resolved.replaysOnErrorSampleRate !== undefined;
  replaySampleRates = {
    session: resolved.replaysSessionSampleRate ?? 0,
    onError: resolved.replaysOnErrorSampleRate ?? 0,
  };

  // Tracing and Replay run only with a configured sample rate. No sessions, metrics, or client reports.
  Sentry.init({
    dsn: resolved.dsn,
    environment: resolved.environment,
    release: resolved.release,
    defaultIntegrations: false,
    integrations: [
      ...(tracing ? [Sentry.browserTracingIntegration()] : []),
      ...(replay ? [privateReplayIntegration(), replayEventPrivacyIntegration] : []),
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
    tracesSampleRate: resolved.tracesSampleRate,
    replaysSessionSampleRate: resolved.replaysSessionSampleRate,
    replaysOnErrorSampleRate: resolved.replaysOnErrorSampleRate,
    tracePropagationTargets: tracing ? resolved.tracePropagationTargets : [],
    sendClientReports: false,
    beforeSend: sanitizeEvent,
    beforeBreadcrumb: sanitizeBreadcrumb,
    beforeSendLog: sanitizeLog,
    beforeSendSpan: sanitizeSpan,
    beforeSendMetric: () => null,
    transport: privateTransport(overrides.transport ?? Sentry.makeFetchTransport),
  });
  return true;
};

/** Ends the current Replay and starts the next one under the configured sampling. */
const restartReplay = async (replay: NonNullable<ReturnType<typeof Sentry.getReplay>>) => {
  await replay.stop();
  if (Math.random() < replaySampleRates.session) {
    replay.start();
  } else if (replaySampleRates.onError > 0) {
    replay.startBuffering();
  }
};

const applyTelemetryUser = () => {
  Sentry.setUser(telemetryMemberId ? { id: telemetryMemberId } : null);
};

/**
 * Sets the telemetry user to the internal member ID only; `null` clears it. When a member signs out or
 * the account changes, the previous member's Replay ends without any identity, and a new one starts.
 * No member is attributed until that Replay has ended, so a quick sign-in cannot tag its last segment.
 */
export const setTelemetryUser = (memberId: string | null) => {
  const previousMemberId = telemetryMemberId;
  telemetryMemberId = memberId;
  const replay = Sentry.getReplay();
  if (replay && previousMemberId && previousMemberId !== memberId) {
    Sentry.setUser(null);
    const restart = replayRestart ? replayRestart.then(() => restartReplay(replay)) : restartReplay(replay);
    replayRestart = restart;
    void restart.finally(() => {
      if (replayRestart !== restart) return;
      replayRestart = null;
      applyTelemetryUser();
    });
    return;
  }
  if (!replayRestart) applyTelemetryUser();
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
