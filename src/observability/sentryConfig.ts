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
};

export type SentryInit =
  | { enabled: true; dsn: string; environment: TelemetryEnvironment; release: string }
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

  return { enabled: true, dsn, environment, release: `${RELEASE_PREFIX}@${version}` };
};
