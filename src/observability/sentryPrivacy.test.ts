import type { Breadcrumb, ErrorEvent, Log } from "@sentry/react";
import { describe, expect, it } from "vitest";
import {
  type Envelope,
  FILTERED,
  isApiFailureRejection,
  type RecordingEvent,
  sanitizeBreadcrumb,
  sanitizeEvent,
  sanitizeEnvelope,
  sanitizeLog,
  sanitizeRecordingEvent,
  sanitizeSpan,
  sanitizeUrl,
  scrubText,
  type StreamedSpanJSON,
} from "@/observability/sentryPrivacy";

const EMAIL = "pii-marker@example.test";
const JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtYXJrZXIifQ.c2lnbmF0dXJl";

describe("sanitizeUrl", () => {
  it("keeps the path and query keys but drops query values, fragments, and credentials", () => {
    expect(sanitizeUrl(`https://user:pass@booking.example.test/rooms?date=2026-11-01&note=hi#id_token=${JWT}`)).toBe(
      `https://booking.example.test/rooms?date=${FILTERED}&note=${FILTERED}`
    );
  });

  it("handles relative URLs and personal data in the path", () => {
    expect(sanitizeUrl(`/api/v1/members/${EMAIL}?token=abc`)).toBe(`/api/v1/members/${FILTERED}?token=${FILTERED}`);
    expect(sanitizeUrl("/my-bookings/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      "/my-bookings/3fa85f64-5717-4562-b3fc-2c963f66afa6"
    );
  });
});

describe("scrubText", () => {
  it.each([
    [`Failed for ${EMAIL}`, `Failed for ${FILTERED}`],
    [`Bearer ${JWT}`, `Bearer ${FILTERED}`],
    [`token ${JWT} rejected`, `token ${FILTERED} rejected`],
    ["Call 416-555-0199 or (416) 555-0199 or +1 416 555 0199", `Call ${FILTERED} or ${FILTERED} or ${FILTERED}`],
    [
      "GET https://api.example.test/x?email=a&b=c#frag failed",
      `GET https://api.example.test/x?email=${FILTERED}&b=${FILTERED} failed`,
    ],
    [
      '{"accessToken":"abc","remark":"secret","id":"1"}',
      `{"accessToken":"${FILTERED}","remark":"${FILTERED}","id":"1"}`,
    ],
  ])("scrubs %j", (input, expected) => {
    expect(scrubText(input)).toBe(expected);
  });

  it("keeps dates and identifiers useful for diagnosis", () => {
    const text = "Booking 3fa85f64-5717-4562-b3fc-2c963f66afa6 on 2026-11-01 failed at 10:00";
    expect(scrubText(text)).toBe(text);
  });
});

describe("sanitizeBreadcrumb", () => {
  it("rebuilds console breadcrumbs from authored text only", () => {
    const apiError = { code: 500, message: `failed for ${EMAIL}`, details: { remark: "remark marker" } };
    const breadcrumb: Breadcrumb = {
      category: "console",
      level: "error",
      message: `API Error: ${JSON.stringify(apiError)}`,
      data: { arguments: ["API Error:", apiError], logger: "console" },
    };

    expect(sanitizeBreadcrumb(breadcrumb, { input: ["API Error:", apiError] })).toEqual({
      category: "console",
      level: "error",
      message: `API Error: ${FILTERED}`,
      data: { logger: "console" },
    });
  });

  it("keeps only method, status, and sanitized URL for HTTP breadcrumbs", () => {
    const breadcrumb: Breadcrumb = {
      category: "xhr",
      type: "http",
      data: {
        method: "POST",
        url: "https://api.example.test/api/v1/auth/mock-login?email=x",
        status_code: 200,
        request_body_size: 42,
        response_body_size: 512,
      },
    };

    expect(sanitizeBreadcrumb(breadcrumb)).toEqual({
      category: "xhr",
      type: "http",
      data: {
        method: "POST",
        url: `https://api.example.test/api/v1/auth/mock-login?email=${FILTERED}`,
        status_code: 200,
      },
    });
  });

  it("sanitizes navigation URLs", () => {
    expect(
      sanitizeBreadcrumb({ category: "navigation", data: { from: "/login#code=abc", to: "/rooms?date=x" } })
    ).toEqual({
      category: "navigation",
      data: { from: "/login", to: `/rooms?date=${FILTERED}` },
    });
  });

  it("drops attribute values from UI selectors", () => {
    expect(
      sanitizeBreadcrumb({
        category: "ui.click",
        message: 'div.card > button.remove[aria-label="Remove Jane Doe"][title="x"]',
        data: { nodeId: 7 },
      })
    ).toEqual({ category: "ui.click", message: "div.card > button.remove" });
  });
});

describe("sanitizeLog", () => {
  const consoleLog = (overrides: Partial<Log>): Log => ({
    level: "error",
    message: "",
    attributes: {
      "sentry.origin": "auto.log.console",
      "sentry.environment": "dev",
      "sentry.release": "facility-booking-frontend@local",
      "user.id": "member-1",
      "user.email": EMAIL,
      "user.name": "Jane",
    },
    ...overrides,
  });

  it.each(["trace", "debug", "info"] as const)("drops %s logs", (level) => {
    expect(sanitizeLog(consoleLog({ level, message: "hello" }))).toBeNull();
  });

  it("uses the console template and drops parameters and personal attributes", () => {
    const log = consoleLog({ message: `API Error: {"remark":"x","email":"${EMAIL}"}` });
    log.attributes = {
      ...log.attributes,
      "sentry.message.template": "API Error: {}",
      "sentry.message.parameter.0": { remark: "x" },
    };

    expect(sanitizeLog(log)).toEqual({
      level: "error",
      message: "API Error: {}",
      attributes: {
        "sentry.origin": "auto.log.console",
        "sentry.environment": "dev",
        "sentry.release": "facility-booking-frontend@local",
        "sentry.message.template": "API Error: {}",
        "user.id": "member-1",
      },
    });
  });

  it("filters serialized objects and keeps only the first line of untemplated messages", () => {
    expect(sanitizeLog(consoleLog({ message: '{"remark":"x"}' }))?.message).toBe(FILTERED);
    expect(sanitizeLog(consoleLog({ message: `Error: failed for ${EMAIL}\n    at Foo (app.js:1:1)` }))?.message).toBe(
      `Error: failed for ${FILTERED}`
    );
  });
});

describe("sanitizeEvent", () => {
  it.each([
    { code: 409, message: "Booking conflict", details: { error_code: "FACILITY_SCHEDULING_CONFLICT" } },
    { code: "401", message: "Unauthorized" },
  ])("drops API failure rejections already handled by the API client", (reason) => {
    expect(isApiFailureRejection(reason)).toBe(true);
    expect(sanitizeEvent({ type: undefined }, { originalException: reason })).toBeNull();
  });

  it("does not treat real exceptions as API failure rejections", () => {
    expect(isApiFailureRejection(Object.assign(new Error("x"), { code: 500 }))).toBe(false);
  });

  it("keeps only the internal user ID, safe request metadata, and scrubbed exception text", () => {
    const event: ErrorEvent = {
      type: undefined,
      message: `Failed for ${EMAIL}`,
      user: { id: "member-1", email: EMAIL, username: "jane", ip_address: "{{auto}}" },
      request: {
        url: "https://booking.example.test/rooms?date=2026-11-01#id_token=abc",
        headers: { "User-Agent": "jsdom", Referer: "https://booking.example.test/login?email=x" },
        cookies: { session: "abc" },
        data: { remark: "secret" },
      },
      extra: { __serialized__: { remark: "secret" } },
      tags: { note: EMAIL },
      exception: {
        values: [
          {
            type: "SyntaxError",
            value: `Unexpected token in "${EMAIL}"`,
            stacktrace: {
              frames: [{ filename: "https://booking.example.test/src/app.js?t=1", function: "f", vars: { a: "b" } }],
            },
          },
        ],
      },
    };

    expect(sanitizeEvent(event, {})).toEqual({
      type: undefined,
      message: `Failed for ${FILTERED}`,
      user: { id: "member-1" },
      request: {
        url: `https://booking.example.test/rooms?date=${FILTERED}`,
        headers: { "User-Agent": "jsdom" },
      },
      tags: { note: FILTERED },
      exception: {
        values: [
          {
            type: "SyntaxError",
            value: `Unexpected token in "${FILTERED}"`,
            stacktrace: {
              frames: [{ filename: `https://booking.example.test/src/app.js?t=${FILTERED}`, function: "f" }],
            },
          },
        ],
      },
    });
  });

  it("removes the user when no internal ID is set", () => {
    expect(sanitizeEvent({ type: undefined, user: { ip_address: "{{auto}}" } }, {})).toEqual({ type: undefined });
  });
});

describe("sanitizeSpan", () => {
  const span = (overrides: Partial<StreamedSpanJSON>): StreamedSpanJSON => ({
    trace_id: "0af7651916cd43dd8448eb211c80319c",
    span_id: "b7ad6b7169203331",
    name: "GET 127.0.0.1",
    start_timestamp: 1,
    end_timestamp: 2,
    status: "ok",
    is_segment: false,
    attributes: {},
    ...overrides,
  });

  it("keeps operational span metadata", () => {
    const attributes = {
      "sentry.op": "http.client",
      "http.request.method": "GET",
      "http.response.status_code": 200,
      "url.full": "http://127.0.0.1:8000/api/v1/facility/bookings/mine",
      "user.id": "member-a-7f3e",
    };

    expect(sanitizeSpan(span({ attributes }))).toEqual(span({ attributes }));
  });

  it("drops query, fragment, payload, header, and identity attributes beyond the internal user ID", () => {
    const sanitized = sanitizeSpan(
      span({
        attributes: {
          "url.query": "?email=a",
          "http.query": "?email=a",
          "url.fragment": "#id_token=x",
          "http.request.body": "{}",
          "http.request.header.authorization": `Bearer ${JWT}`,
          "user.email": EMAIL,
          "user.ip_address": "203.0.113.7",
          "user.id": "member-a-7f3e",
        },
      })
    );

    expect(sanitized.attributes).toEqual({ "user.id": "member-a-7f3e" });
  });

  it("scrubs URLs and personal data in span names and attribute values", () => {
    const sanitized = sanitizeSpan(
      span({
        name: `GET /api/v1/org/users/search?q=${EMAIL}`,
        attributes: {
          "url.full": `https://api.example.test/rooms?date=2026-11-01#id_token=${JWT}`,
          "sentry.segment.name": `/members/${EMAIL}`,
        },
      })
    );

    expect(sanitized.name).toBe(`GET /api/v1/org/users/search?q=${FILTERED}`);
    expect(sanitized.attributes).toEqual({
      "url.full": `https://api.example.test/rooms?date=${FILTERED}`,
      "sentry.segment.name": `/members/${FILTERED}`,
    });
  });
});

describe("sanitizeRecordingEvent", () => {
  const breadcrumb = (payload: Record<string, unknown>) =>
    ({
      type: 5,
      timestamp: 1,
      data: { tag: "breadcrumb", payload: { timestamp: 1, type: "default", ...payload } },
    }) as RecordingEvent;
  const performanceSpan = (payload: Record<string, unknown>) =>
    ({
      type: 5,
      timestamp: 1,
      data: { tag: "performanceSpan", payload: { startTimestamp: 1, endTimestamp: 2, ...payload } },
    }) as RecordingEvent;
  const payloadOf = (event: RecordingEvent | null | undefined) => (event?.data as { payload: unknown }).payload;

  it("drops console arguments and scrubs the message", () => {
    const sanitized = sanitizeRecordingEvent(
      breadcrumb({
        category: "console",
        level: "error",
        message: `Login failed for ${EMAIL}`,
        data: { logger: "console", arguments: [{ detail: EMAIL }] },
      })
    );

    expect(payloadOf(sanitized)).toEqual({
      timestamp: 1,
      type: "default",
      category: "console",
      level: "error",
      message: `Login failed for ${FILTERED}`,
      data: { logger: "console" },
    });
  });

  it("keeps the clicked node reference but not its text, attributes, or typed keys", () => {
    const node = { id: 7, tagName: "button", textContent: "Zebulonmarker", attributes: { "aria-label": EMAIL } };

    expect(
      payloadOf(
        sanitizeRecordingEvent(
          breadcrumb({ category: "ui.click", message: `button[aria-label="${EMAIL}"]`, data: { nodeId: 7, node } })
        )
      )
    ).toEqual({
      timestamp: 1,
      type: "default",
      category: "ui.click",
      message: "button",
      data: { nodeId: 7, node: { id: 7, tagName: "button", textContent: "", attributes: {} } },
    });
    expect(
      payloadOf(
        sanitizeRecordingEvent(
          breadcrumb({ category: "ui.keyDown", data: { nodeId: 7, node, key: "z", metaKey: true, shiftKey: false } })
        )
      )
    ).toMatchObject({ data: { nodeId: 7, metaKey: true, shiftKey: false } });
    expect(
      JSON.stringify(sanitizeRecordingEvent(breadcrumb({ category: "ui.keyDown", data: { key: "z" } })))
    ).not.toContain('"key"');
  });

  it("keeps only method, status, and sizes for network requests", () => {
    const sanitized = sanitizeRecordingEvent(
      performanceSpan({
        op: "resource.xhr",
        description: `http://127.0.0.1:8000/api/v1/org/users/search?q=${EMAIL}#frag`,
        data: {
          method: "GET",
          statusCode: 200,
          request: { size: 10, headers: { authorization: `Bearer ${JWT}` }, body: { remark: "remark-marker" } },
          response: { size: 20, body: { email: EMAIL } },
        },
      })
    );

    expect(payloadOf(sanitized)).toEqual({
      startTimestamp: 1,
      endTimestamp: 2,
      op: "resource.xhr",
      description: `http://127.0.0.1:8000/api/v1/org/users/search?q=${FILTERED}`,
      data: { method: "GET", statusCode: 200, request: { size: 10 }, response: { size: 20 } },
    });
  });

  it("removes query values and fragments from navigation URLs", () => {
    const sanitized = sanitizeRecordingEvent(
      performanceSpan({
        op: "navigation.push",
        description: `/rooms?date=2099-09-01#id_token=${JWT}`,
        data: { previous: `/login?email=${EMAIL}` },
      })
    );

    expect(payloadOf(sanitized)).toMatchObject({
      description: `/rooms?date=${FILTERED}`,
      data: { previous: `/login?email=${FILTERED}` },
    });
  });

  it.each(["resource.img", "resource.video", "resource.audio"])("keeps only the origin of %s URLs", (op) => {
    const sanitized = sanitizeRecordingEvent(
      performanceSpan({
        op,
        description: "https://user:pass@blob.example.test/avatars/Zebulonmarker.png?sig=abc",
        data: {},
      })
    );

    expect(payloadOf(sanitized)).toMatchObject({ description: "https://blob.example.test" });
    expect(
      payloadOf(sanitizeRecordingEvent(performanceSpan({ op, description: "Zebulonmarker.png", data: {} })))
    ).toMatchObject({
      description: FILTERED,
    });
  });

  it("passes Replay option frames through unchanged", () => {
    const options = {
      type: 5,
      timestamp: 1,
      data: { tag: "options", payload: { maskAllText: true, maskAllInputs: true, blockAllMedia: true } },
    } as RecordingEvent;

    expect(sanitizeRecordingEvent(options)).toEqual(options);
  });
});

describe("sanitizeEnvelope", () => {
  const recording = (events: unknown[]) => `${JSON.stringify({ segment_id: 0 })}\n${JSON.stringify(events)}`;
  const envelopeWith = (items: unknown[]) => [{ event_id: "e1" }, items] as unknown as Envelope;
  const byteLength = (text: string) => new TextEncoder().encode(text).length;

  it("removes query values and fragments from Replay snapshot page URLs and refreshes the item length", () => {
    const snapshot = { type: 2, data: { node: { type: 0 } }, timestamp: 2 };
    const raw = recording([
      {
        type: 4,
        data: { href: `http://127.0.0.1:5174/login?next=/rooms#code=${JWT}`, width: 800, height: 600 },
        timestamp: 1,
      },
      snapshot,
    ]);
    const replayEvent = [{ type: "replay_event" }, { replay_id: "r1" }];

    const [, items] = sanitizeEnvelope(
      envelopeWith([replayEvent, [{ type: "replay_recording", length: byteLength(raw) }, raw]])
    ) as unknown as [unknown, Array<[Record<string, unknown>, unknown]>];

    const [header, payload] = items[1];
    const expected = recording([
      {
        type: 4,
        data: { href: `http://127.0.0.1:5174/login?next=${FILTERED}`, width: 800, height: 600 },
        timestamp: 1,
      },
      snapshot,
    ]);
    expect(payload).toBe(expected);
    expect(header).toEqual({ type: "replay_recording", length: byteLength(expected) });
    expect(items[0]).toBe(replayEvent);
  });

  it("drops a Replay recording it cannot read", () => {
    const [, items] = sanitizeEnvelope(
      envelopeWith([
        [{ type: "replay_event" }, { replay_id: "r1" }],
        [{ type: "replay_recording", length: 3 }, new Uint8Array([1, 2, 3])],
      ])
    ) as unknown as [unknown, Array<[Record<string, unknown>, unknown]>];

    expect(items.map(([header]) => header.type)).toEqual(["replay_event"]);
  });

  it("refuses to pass a malformed Replay recording through", () => {
    const raw = `${JSON.stringify({ segment_id: 0 })}\n[{"type":4,"data":{"href":"/rooms?date=1"`;

    expect(() => sanitizeEnvelope(envelopeWith([[{ type: "replay_recording", length: raw.length }, raw]]))).toThrow();
  });

  it("leaves envelopes without Replay recordings untouched", () => {
    const envelope = envelopeWith([[{ type: "event" }, { message: "hello" }]]);

    expect(sanitizeEnvelope(envelope)).toBe(envelope);
  });
});
