import { waitFor } from "@testing-library/react";
import * as Sentry from "@sentry/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RecordedRequest = { url: string; headers: Record<string, string> };

// Stand-ins for the browser network APIs, installed before Sentry instruments them.
const network = vi.hoisted(() => {
  const requests: RecordedRequest[] = [];
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
  });

  class FakeXMLHttpRequest extends EventTarget {
    static readonly DONE = 4;
    readyState = 0;
    status = 0;
    statusText = "";
    responseText = "";
    response = "";
    responseType = "";
    responseURL = "";
    timeout = 0;
    withCredentials = false;
    upload = new EventTarget();
    onreadystatechange: (() => void) | null = null;
    onloadend: (() => void) | null = null;
    private request: RecordedRequest = { url: "", headers: {} };

    open(_method: string, url: string) {
      this.request = { url, headers: {} };
      this.readyState = 1;
    }

    setRequestHeader(name: string, value: string) {
      this.request.headers[name.toLowerCase()] = value;
    }

    getAllResponseHeaders() {
      return "content-type: application/json\r\n";
    }

    getResponseHeader(name: string) {
      return name.toLowerCase() === "content-type" ? "application/json" : null;
    }

    abort() {}

    send() {
      requests.push(this.request);
      setTimeout(() => {
        this.status = 200;
        this.responseURL = this.request.url;
        this.responseText = this.response = JSON.stringify({ items: [] });
        this.readyState = 4;
        this.dispatchEvent(new Event("readystatechange"));
        this.onreadystatechange?.();
        this.dispatchEvent(new Event("load"));
        this.onloadend?.();
        this.dispatchEvent(new Event("loadend"));
      }, 0);
    }
  }
  Object.defineProperty(globalThis, "XMLHttpRequest", {
    configurable: true,
    writable: true,
    value: FakeXMLHttpRequest,
  });

  const fetchStub = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push({ url: request.url, headers: Object.fromEntries(request.headers.entries()) });
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };
  Object.defineProperty(globalThis, "fetch", { configurable: true, writable: true, value: fetchStub });

  return { requests };
});

import { API_ENDPOINTS, REQUEST_CONFIG } from "@/api";
import { BOOKING_API_PREFIX } from "@/api/config";
import { httpClient } from "@/api/services/httpClient";
import { initSentry } from "@/observability/sentry";
import type { SentryConfig } from "@/observability/sentryConfig";
import { createCapturedSentryTransport, resetSentryForTests } from "@/observability/sentryTestSupport";

const API_URL = `${REQUEST_CONFIG.BASE_URL}${BOOKING_API_PREFIX}`;

const TRACED: SentryConfig = {
  mode: "development",
  dsn: "https://public@o0.ingest.example.test/1",
  enabled: "true",
  releaseVersion: "",
  tracesSampleRate: "1",
  replaysSessionSampleRate: "",
  replaysOnErrorSampleRate: "",
  apiUrl: API_URL,
};

const MINISTRY_ID_MARKER = "ministry-marker-5d1";
const REMARK_MARKER = "remark-marker-q9";
const TOKEN_MARKER = "token-marker-t7";
const TRACE_HEADER = /^([0-9a-f]{32})-[0-9a-f]{16}-1$/;

const requestTo = (prefix: string) => network.requests.find((request) => request.url.startsWith(prefix));

describe("Sentry browser tracing", () => {
  beforeEach(async () => {
    await resetSentryForTests();
    network.requests.length = 0;
    localStorage.clear();
  });

  afterEach(async () => {
    await resetSentryForTests();
    window.history.replaceState(null, "", "/");
  });

  // Sentry keeps request instrumentation handlers after its client closes, so this runs before any
  // tracing client exists in this file.
  it("leaves requests untouched when tracing is not configured", async () => {
    const captured = createCapturedSentryTransport();
    expect(initSentry({ ...TRACED, tracesSampleRate: "" }, { transport: captured.transport })).toBe(true);

    await httpClient.get(API_ENDPOINTS.FACILITY.MY_BOOKINGS);
    await Sentry.flush();

    expect(network.requests).toHaveLength(1);
    expect(network.requests[0].headers).not.toHaveProperty("sentry-trace");
    expect(network.requests[0].headers).not.toHaveProperty("baggage");
    expect(captured.items.filter((item) => item.type !== "event")).toEqual([]);
  });

  it("continues the browser trace into NewLife API requests only", async () => {
    const captured = createCapturedSentryTransport();
    expect(initSentry(TRACED, { transport: captured.transport })).toBe(true);

    await httpClient.get(API_ENDPOINTS.FACILITY.MY_BOOKINGS);
    await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", { method: "POST" });
    await fetch("https://cdn.example.test/api/v1/config.json");
    await fetch(`https://evil.example.test/?next=${API_URL}/facility/bookings`);
    await fetch(`${REQUEST_CONFIG.BASE_URL}/admin${BOOKING_API_PREFIX}/user`);
    await fetch(`${API_URL}0/facility/bookings`);

    const apiRequest = requestTo(`${REQUEST_CONFIG.BASE_URL}${API_ENDPOINTS.FACILITY.MY_BOOKINGS}`);
    expect(apiRequest?.headers["sentry-trace"]).toMatch(TRACE_HEADER);
    expect(apiRequest?.headers.baggage).toContain("sentry-environment=dev");
    expect(apiRequest?.headers.authorization).toBeUndefined();
    for (const request of network.requests.filter((candidate) => candidate !== apiRequest)) {
      expect(request.headers).not.toHaveProperty("sentry-trace");
      expect(request.headers).not.toHaveProperty("baggage");
    }
  });

  it("exports the API request span in the propagated trace without query values", async () => {
    window.history.replaceState(null, "", `/rooms?note=${REMARK_MARKER}#id_token=${TOKEN_MARKER}`);
    const captured = createCapturedSentryTransport();
    initSentry(TRACED, { transport: captured.transport });

    await httpClient.get(API_ENDPOINTS.FACILITY.AVAILABILITY, { date: "2099-09-01", ministryId: MINISTRY_ID_MARKER });
    const [, traceId] = network.requests[0].headers["sentry-trace"].match(TRACE_HEADER)!;

    await waitFor(async () => {
      await Sentry.flush();
      expect(captured.spans()).toContainEqual(
        expect.objectContaining({
          trace_id: traceId,
          attributes: expect.objectContaining({
            "sentry.op": { type: "string", value: "http.client" },
            "url.full": { type: "string", value: `${REQUEST_CONFIG.BASE_URL}${API_ENDPOINTS.FACILITY.AVAILABILITY}` },
          }),
        })
      );
    });
    expect(JSON.stringify(captured.items)).not.toContain(MINISTRY_ID_MARKER);
    expect(JSON.stringify(captured.items)).not.toContain("2099-09-01");
    expect(JSON.stringify(captured.items)).not.toContain(REMARK_MARKER);
    expect(JSON.stringify(captured.items)).not.toContain(TOKEN_MARKER);
  });
});
