import type {
  Breadcrumb,
  BreadcrumbHint,
  BrowserOptions,
  ErrorEvent,
  EventHint,
  Log,
  replayIntegration,
  StackFrame,
} from "@sentry/react";

export type StreamedSpanJSON = Parameters<NonNullable<BrowserOptions["beforeSendSpan"]>>[0];
export type Envelope = Parameters<ReturnType<NonNullable<BrowserOptions["transport"]>>["send"]>[0];
export type RecordingEvent = Parameters<
  NonNullable<NonNullable<Parameters<typeof replayIntegration>[0]>["beforeAddRecordingEvent"]>
>[0];

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

/** Applies `scrubString` to every string nested in arrays and plain objects. */
const mapStrings = (value: unknown, scrubString: (text: string) => string): unknown => {
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((nested) => mapStrings(nested, scrubString));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, mapStrings(nested, scrubString)]));
  }
  return value;
};

const scrubDeep = (value: unknown): unknown => mapStrings(value, scrubText);

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

/** Span metadata that can carry query values, payloads, headers, or identity beyond the internal user ID. */
const DROPPED_SPAN_ATTRIBUTE = /query|fragment|body|header|cookie|user\.(?!id$)/i;

export const sanitizeSpan = (span: StreamedSpanJSON): StreamedSpanJSON => ({
  ...span,
  name: scrubText(span.name),
  attributes: Object.fromEntries(
    Object.entries(span.attributes)
      .filter(([key]) => !DROPPED_SPAN_ATTRIBUTE.test(key))
      .map(([key, value]) => [key, scrubDeep(value)])
  ),
});

type ReplayFrameData = Record<string, unknown> & {
  nodeId?: number;
  node?: { id: number; tagName: string };
  key?: unknown;
};

/** Breadcrumb categories whose `data` the shared breadcrumb sanitizer already rebuilds. */
const SANITIZED_BREADCRUMB_DATA = new Set(["console", "fetch", "xhr", "navigation"]);
const REPLAY_REQUEST_OPS = new Set(["resource.fetch", "resource.xhr"]);
/** Media paths can name the member (an uploaded photo file name, a per-member folder); keep only the origin. */
const REPLAY_MEDIA_OPS = new Set(["resource.img", "resource.video", "resource.audio"]);
const URL_LIKE = /^(?:https?:\/\/|\/)/i;

const URL_ORIGIN = /^[a-z][\w+.-]*:\/\/(?:[^/?#@]*@)?[^/?#@]+/i;

const urlOrigin = (url: string) => url.match(URL_ORIGIN)?.[0].replace(URL_CREDENTIALS, "$1") ?? FILTERED;

const scrubReplayValue = (value: unknown): unknown =>
  mapStrings(value, (text) => (URL_LIKE.test(text) ? sanitizeUrl(text) : scrubText(text)));

/** DOM frames keep the recorded node reference for highlighting, never its text, attributes, or typed key. */
const sanitizeReplayFrameData = (data: ReplayFrameData) => {
  const { node, ...rest } = data;
  delete rest.key;
  return pickDefined({
    ...(scrubReplayValue(rest) as Record<string, unknown>),
    node: node && { id: node.id, tagName: node.tagName, textContent: "", attributes: {} },
  });
};

type ReplayRequestData = {
  method?: unknown;
  statusCode?: unknown;
  request?: { size?: unknown };
  response?: { size?: unknown };
};

const sanitizeReplayRequestData = (data: ReplayRequestData) =>
  pickDefined({
    method: data.method,
    statusCode: data.statusCode,
    request: data.request && pickDefined({ size: data.request.size }),
    response: data.response && pickDefined({ size: data.response.size }),
  });

/**
 * Replay's own breadcrumb and span frames (console, clicks, keys, network, navigation). Masking of
 * recorded DOM text, inputs, and media is configured on the Replay integration itself.
 */
export const sanitizeRecordingEvent = (event: RecordingEvent): RecordingEvent => {
  if (event.data.tag === "breadcrumb") {
    const frame = event.data.payload;
    const sanitized = sanitizeBreadcrumb(frame as Breadcrumb) as typeof frame;
    if (frame.data && !SANITIZED_BREADCRUMB_DATA.has(frame.category)) {
      sanitized.data = sanitizeReplayFrameData(frame.data as ReplayFrameData);
    }
    return { ...event, data: { ...event.data, payload: sanitized } };
  }
  if (event.data.tag === "performanceSpan") {
    const frame = event.data.payload;
    const data =
      frame.data &&
      (REPLAY_REQUEST_OPS.has(frame.op)
        ? sanitizeReplayRequestData(frame.data as ReplayRequestData)
        : (scrubReplayValue(frame.data) as Record<string, unknown>));
    return {
      ...event,
      data: {
        ...event.data,
        payload: pickDefined({
          ...frame,
          description: REPLAY_MEDIA_OPS.has(frame.op)
            ? urlOrigin(frame.description)
            : scrubReplayValue(frame.description),
          data,
        }),
      },
    } as RecordingEvent;
  }
  return event;
};

/** Replay events skip `beforeSend`; they carry the visited URLs plus the usual request and user metadata. */
export const sanitizeReplayEvent = <T extends ErrorEvent & { urls?: string[] }>(event: T): T => {
  const sanitized = sanitizeEvent(event, {}) as T;
  if (event.urls) sanitized.urls = event.urls.map(sanitizeUrl);
  return sanitized;
};

/** rrweb's Meta event: the page URL captured with each full snapshot. */
const RRWEB_META_EVENT = 4;

type RawRecordingEvent = { type: number; data?: { href?: unknown } };

/**
 * Snapshot page URLs come from the DOM recorder, which `beforeAddRecordingEvent` never sees. Requires
 * Replay compression off so the recording is still JSON text; a binary recording is dropped, and a
 * malformed one throws so the transport sends nothing.
 */
const sanitizeReplayRecording = (payload: unknown): string | null => {
  if (typeof payload !== "string") return null;
  const headerEnd = payload.indexOf("\n");
  const events = JSON.parse(payload.slice(headerEnd + 1)) as RawRecordingEvent[];
  const sanitized = events.map((event) =>
    event.type === RRWEB_META_EVENT && typeof event.data?.href === "string"
      ? { ...event, data: { ...event.data, href: sanitizeUrl(event.data.href) } }
      : event
  );
  return `${payload.slice(0, headerEnd + 1)}${JSON.stringify(sanitized)}`;
};

type EnvelopeItem = [{ type: string; length?: number }, unknown];

export const sanitizeEnvelope = (envelope: Envelope): Envelope => {
  const [headers, items] = envelope as unknown as [unknown, EnvelopeItem[]];
  if (!items.some(([header]) => header.type === "replay_recording")) return envelope;

  const sanitizedItems = items.flatMap((item): EnvelopeItem[] => {
    const [header, payload] = item;
    if (header.type !== "replay_recording") return [item];
    const recording = sanitizeReplayRecording(payload);
    if (recording === null) return [];
    return [[{ ...header, length: new TextEncoder().encode(recording).length }, recording]];
  });
  return [headers, sanitizedItems] as unknown as Envelope;
};
