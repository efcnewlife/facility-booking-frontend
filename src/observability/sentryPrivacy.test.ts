import type { Breadcrumb, ErrorEvent, Log } from "@sentry/react";
import { describe, expect, it } from "vitest";
import {
  FILTERED,
  isApiFailureRejection,
  sanitizeBreadcrumb,
  sanitizeEvent,
  sanitizeLog,
  sanitizeUrl,
  scrubText,
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
