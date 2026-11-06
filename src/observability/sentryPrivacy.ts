import type { Breadcrumb, BreadcrumbHint, ErrorEvent, EventHint, Log, StackFrame } from "@sentry/react";

/**
 * Privacy contract applied to every Sentry channel before transmission. Telemetry keeps code
 * locations, route paths, status codes, and the internal user ID; it never carries bodies,
 * credentials, tokens, names, email addresses, phone numbers, remarks, or query/fragment values.
 */

export const FILTERED = "[Filtered]";

const BEARER = /\bBearer\s+\S+/gi;
const JWT = /\beyJ[\w-]+\.[\w-]+\.[\w-]*/g;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONES = [
  /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?(?:[\s.-]?\d{2,4}){2,4}/g,
  /\(\d{3}\)\s?\d{3}[\s.-]\d{4}/g,
  /\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g,
];
const ABSOLUTE_URL = /\bhttps?:\/\/[^\s"'<>]+/g;
const QUERY_VALUE = /([?&][^=\s&#?]+)=[^&\s#"'<>]*/g;
const SENSITIVE_JSON_VALUE =
  /"([\w-]*(?:token|password|secret|authorization|cookie|remark|email|phone|name)[\w-]*)"\s*:\s*"(?:[^"\\]|\\.)*"/gi;
const SELECTOR_ATTRIBUTE = /\[[^\]]*\]/g;
const URL_CREDENTIALS = /^([a-z][\w+.-]*:\/\/)[^/@]*@/i;

const LOG_LEVELS = new Set<Log["level"]>(["warn", "error", "fatal"]);
const LOG_ATTRIBUTES = new Set([
  "sentry.origin",
  "sentry.environment",
  "sentry.release",
  "sentry.sdk.name",
  "sentry.sdk.version",
  "sentry.message.template",
  "sentry.trace.parent_span_id",
  "sentry.replay_id",
  "sentry._internal.replay_is_buffering",
  "user.id",
]);

const scrubIdentifiers = (text: string): string => {
  let scrubbed = text.replace(BEARER, `Bearer ${FILTERED}`).replace(JWT, FILTERED).replace(EMAIL, FILTERED);
  for (const phone of PHONES) {
    scrubbed = scrubbed.replace(phone, FILTERED);
  }
  return scrubbed;
};

/** Keeps scheme, host, path, and query keys; drops credentials, query values, and the fragment. */
export const sanitizeUrl = (url: string): string => {
  const [withoutFragment] = url.split("#", 1);
  const queryStart = withoutFragment.indexOf("?");
  const base = scrubIdentifiers(
    (queryStart === -1 ? withoutFragment : withoutFragment.slice(0, queryStart)).replace(URL_CREDENTIALS, "$1")
  );
  if (queryStart === -1) return base;

  const keys = withoutFragment
    .slice(queryStart + 1)
    .split("&")
    .filter(Boolean)
    .map((pair) => `${pair.split("=", 1)[0]}=${FILTERED}`);
  return keys.length > 0 ? `${base}?${keys.join("&")}` : base;
};

/** Pattern-based redaction for free-form text the app does not author (exception messages, logs). */
export const scrubText = (text: string): string =>
  scrubIdentifiers(text.replace(ABSOLUTE_URL, sanitizeUrl).replace(SENSITIVE_JSON_VALUE, `"$1":"${FILTERED}"`)).replace(
    QUERY_VALUE,
    `$1=${FILTERED}`
  );

/** Console arguments other than authored strings may be API errors carrying response bodies. */
const describeConsoleArgs = (args: unknown[]): string =>
  args.map((arg) => (typeof arg === "string" ? scrubText(arg) : FILTERED)).join(" ");

const scrubFormattedMessage = (message: string): string => {
  const [firstLine] = message.split("\n", 1);
  return /^\s*[[{]/.test(firstLine) ? FILTERED : scrubText(firstLine);
};

const pickDefined = <T extends Record<string, unknown>>(record: T): Partial<T> =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as Partial<T>;

const sanitizeOptionalUrl = (value: unknown) => (typeof value === "string" ? sanitizeUrl(value) : undefined);

export const sanitizeBreadcrumb = (breadcrumb: Breadcrumb, hint?: BreadcrumbHint): Breadcrumb => {
  const { data, message, ...rest } = breadcrumb;
  const category = breadcrumb.category ?? "";

  if (category === "console") {
    const args = Array.isArray(hint?.input) ? (hint.input as unknown[]) : undefined;
    return {
      ...rest,
      message: args ? describeConsoleArgs(args) : scrubFormattedMessage(message ?? ""),
      data: { logger: "console" },
    };
  }
  if (category === "fetch" || category === "xhr") {
    return {
      ...rest,
      data: pickDefined({ method: data?.method, url: sanitizeOptionalUrl(data?.url), status_code: data?.status_code }),
    };
  }
  if (category === "navigation") {
    return { ...rest, data: pickDefined({ from: sanitizeOptionalUrl(data?.from), to: sanitizeOptionalUrl(data?.to) }) };
  }
  if (category.startsWith("ui.")) {
    return pickDefined({ ...rest, message: message && scrubText(message.replace(SELECTOR_ATTRIBUTE, "")) });
  }
  return pickDefined({ ...rest, message: message && scrubText(message) });
};

export const sanitizeLog = (log: Log): Log | null => {
  if (!LOG_LEVELS.has(log.level)) return null;

  const attributes = log.attributes ?? {};
  const template = attributes["sentry.message.template"];
  const message = typeof template === "string" ? scrubText(template) : scrubFormattedMessage(String(log.message));
  const safeAttributes = Object.fromEntries(
    Object.entries(attributes).filter(([key]) => LOG_ATTRIBUTES.has(key))
  ) as NonNullable<Log["attributes"]>;
  if (typeof template === "string") {
    safeAttributes["sentry.message.template"] = message;
  }
  return { ...log, message, attributes: safeAttributes };
};

/**
 * `ApiError` / `AuthError` objects rejected by the API client. Eligible failures are reported once
 * where they occur; their rejections (expected 4xx, conflicts, or already-reported 5xx) are not issues.
 */
export const isApiFailureRejection = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null || value instanceof Error) return false;
  const { code, message } = value as { code?: unknown; message?: unknown };
  return typeof message === "string" && (typeof code === "number" || typeof code === "string");
};

const scrubDeep = (value: unknown): unknown => {
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, scrubDeep(nested)]));
  }
  return value;
};

const sanitizeFrame = (frame: StackFrame): StackFrame =>
  pickDefined({
    ...frame,
    vars: undefined,
    filename: sanitizeOptionalUrl(frame.filename),
    abs_path: sanitizeOptionalUrl(frame.abs_path),
  });

export const sanitizeEvent = (event: ErrorEvent, hint: EventHint): ErrorEvent | null => {
  if (isApiFailureRejection(hint.originalException)) return null;

  const { user, request, ...rest } = event;
  const sanitized: ErrorEvent = rest;
  delete sanitized.extra;

  if (user?.id !== undefined && user.id !== null && user.id !== "") {
    sanitized.user = { id: String(user.id) };
  }
  if (request) {
    const userAgent = request.headers?.["User-Agent"];
    sanitized.request = pickDefined({
      url: sanitizeOptionalUrl(request.url),
      headers: userAgent ? { "User-Agent": userAgent } : undefined,
    });
  }
  if (event.message) sanitized.message = scrubText(event.message);
  if (event.logentry)
    sanitized.logentry = pickDefined({ message: event.logentry.message && scrubText(event.logentry.message) });
  if (event.transaction) sanitized.transaction = scrubText(event.transaction);
  if (event.tags) sanitized.tags = scrubDeep(event.tags) as ErrorEvent["tags"];
  if (event.contexts) sanitized.contexts = scrubDeep(event.contexts) as ErrorEvent["contexts"];
  if (event.breadcrumbs) sanitized.breadcrumbs = event.breadcrumbs.map((breadcrumb) => sanitizeBreadcrumb(breadcrumb));
  if (event.exception?.values) {
    sanitized.exception = {
      ...event.exception,
      values: event.exception.values.map((exception) =>
        pickDefined({
          ...exception,
          value: exception.value && scrubText(exception.value),
          stacktrace: exception.stacktrace && {
            ...exception.stacktrace,
            frames: exception.stacktrace.frames?.map(sanitizeFrame),
          },
        })
      ),
    };
  }
  return sanitized;
};
