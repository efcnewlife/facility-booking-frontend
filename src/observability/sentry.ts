import * as Sentry from "@sentry/react";
import { ENV_CONFIG } from "@/config/env";
import { resolveSentryInit, type SentryConfig } from "@/observability/sentryConfig";

const ENV_SENTRY_CONFIG: SentryConfig = {
  mode: ENV_CONFIG.APP_ENV,
  dsn: ENV_CONFIG.SENTRY_DSN,
  enabled: ENV_CONFIG.SENTRY_ENABLED,
  releaseVersion: ENV_CONFIG.SENTRY_RELEASE_VERSION,
};

// Initialization-only slice: no automatic capture, breadcrumbs, logs, metrics, tracing, Replay,
// sessions, or client reports, and no personal or request data. Follow-up tickets opt features in.
const COLLECT_NOTHING: Sentry.BrowserOptions["dataCollection"] = {
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

  Sentry.init({
    dsn: resolved.dsn,
    environment: resolved.environment,
    release: resolved.release,
    defaultIntegrations: false,
    integrations: [],
    dataCollection: COLLECT_NOTHING,
    maxBreadcrumbs: 0,
    sendClientReports: false,
    beforeSendLog: () => null,
    beforeSendMetric: () => null,
    ...overrides,
  });
  return true;
};
