const RELEASE_PREFIX = "facility-booking-frontend";

export type TelemetryEnvironment = "dev" | "stg" | "prod";

export type SentryConfig = {
  /** Vite build mode (`import.meta.env.MODE`). */
  mode: string;
  dsn: string;
  /** `"true"` / `"false"` overrides the per-environment default; anything else keeps it. */
  enabled: string;
  /** Production semantic version or staging short commit SHA; ignored for local runs. */
  releaseVersion: string;
  /** Sample rates in `0..1`; unset or invalid leaves that feature off. */
  tracesSampleRate: string;
  replaysSessionSampleRate: string;
  replaysOnErrorSampleRate: string;
  /** Absolute NewLife API URL prefix; only requests under it carry trace propagation headers. */
  apiUrl: string;
};

/** Collection options that only matter once telemetry is enabled. */
type CollectionOptions = {
  tracesSampleRate: number | undefined;
  replaysSessionSampleRate: number | undefined;
  replaysOnErrorSampleRate: number | undefined;
  tracePropagationTargets: RegExp[];
};

export type SentryInit =
  | ({ enabled: true; dsn: string; environment: TelemetryEnvironment; release: string } & CollectionOptions)
  | { enabled: false; reason: "unknown-mode" | "disabled" | "missing-dsn" | "invalid-release" };

const TELEMETRY_ENVIRONMENTS = new Map<string, TelemetryEnvironment>([
  ["development", "dev"],
  ["staging", "stg"],
  ["production", "prod"],
]);

const RELEASE_VERSION_PATTERNS: Record<Exclude<TelemetryEnvironment, "dev">, RegExp> = {
  stg: /^[0-9a-f]{7,12}$/,
  prod: /^\d+\.\d+\.\d+$/,
};

const SAMPLE_RATE = /^(?:0(?:\.\d+)?|1(?:\.0+)?|\.\d+)$/;

const parseSampleRate = (value: string) => {
  const rate = value.trim();
  return SAMPLE_RATE.test(rate) ? Number(rate) : undefined;
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Anchors propagation to the API's own origin and path, so look-alike hosts and other services never match. */
const apiPropagationTargets = (apiUrl: string): RegExp[] => {
  const prefix = apiUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^/?#]+\//i.test(`${prefix}/`)) return [];
  return [new RegExp(`^${escapeRegExp(prefix)}(?:[/?#]|$)`)];
};

export const resolveSentryInit = (config: SentryConfig): SentryInit => {
  const environment = TELEMETRY_ENVIRONMENTS.get(config.mode);
  if (!environment) return { enabled: false, reason: "unknown-mode" };

  const enabledByDefault = environment !== "dev";
  const enabled = config.enabled === "true" || (enabledByDefault && config.enabled !== "false");
  if (!enabled) return { enabled: false, reason: "disabled" };

  const dsn = config.dsn.trim();
  if (!dsn) return { enabled: false, reason: "missing-dsn" };

  let version = "local";
  if (environment !== "dev") {
    version = config.releaseVersion.trim();
    if (!RELEASE_VERSION_PATTERNS[environment].test(version)) return { enabled: false, reason: "invalid-release" };
  }

  return {
    enabled: true,
    dsn,
    environment,
    release: `${RELEASE_PREFIX}@${version}`,
    tracesSampleRate: parseSampleRate(config.tracesSampleRate),
    replaysSessionSampleRate: parseSampleRate(config.replaysSessionSampleRate),
    replaysOnErrorSampleRate: parseSampleRate(config.replaysOnErrorSampleRate),
    tracePropagationTargets: apiPropagationTargets(config.apiUrl),
  };
};
