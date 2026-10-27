import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Sentry from "@sentry/react";
import { AxiosError, type AxiosAdapter, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
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
});

import { API_ENDPOINTS } from "@/api/config";
import facilityService from "@/api/services/facilityService";
import { httpClient } from "@/api/services/httpClient";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { change_app_language } from "@/i18n";
import { initSentry, sentryReactRootOptions } from "@/observability/sentry";
import type { SentryConfig } from "@/observability/sentryConfig";
import { createCapturedSentryTransport, resetSentryForTests } from "@/observability/sentryTestSupport";
import type { ApiError } from "@/types/api";

const LOCAL_OPT_IN: SentryConfig = {
  mode: "development",
  dsn: "https://public@o0.ingest.example.test/1",
  enabled: "true",
  releaseVersion: "",
};

const MEMBER_A_ID = "member-a-7f3e";
const MEMBER_B_ID = "member-b-91c2";
const EMAIL_A = "pii-marker-a@example.test";
const EMAIL_B = "pii-marker-b@example.test";
const NAME_MARKER = "Zebulonmarker";
const PHONE_MARKER = "416-555-0199";
const REMARK_MARKER = "remark-marker-q9";
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0b2tlbi1tYXJrZXIifQ.c2lnbmF0dXJlLW1hcmtlcg";
const REFRESH_TOKEN = "refresh-marker-r4";
const PRIVATE_MARKERS = [EMAIL_A, EMAIL_B, NAME_MARKER, PHONE_MARKER, REMARK_MARKER, ACCESS_TOKEN, REFRESH_TOKEN];

const MEMBERS: Record<string, { id: string; email: string; first_name: string }> = {
  [EMAIL_A]: { id: MEMBER_A_ID, email: EMAIL_A, first_name: NAME_MARKER },
  [EMAIL_B]: { id: MEMBER_B_ID, email: EMAIL_B, first_name: "Other" },
};

type FakeResponse = { status: number; data: unknown };

const EXPIRED_TOKEN = "expired-access-token";

let bookingResponse: FakeResponse;
let refreshResponse: FakeResponse;
let signedInEmail: string | null;

const backend = (config: InternalAxiosRequestConfig): FakeResponse => {
  const body = typeof config.data === "string" ? (JSON.parse(config.data) as Record<string, unknown>) : {};
  switch (`${config.method?.toUpperCase()} ${config.url}`) {
    case `POST ${API_ENDPOINTS.AUTH.MOCK_LOGIN}`:
      signedInEmail = String(body.email);
      return {
        status: 200,
        data: {
          member: MEMBERS[signedInEmail],
          token: { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN, tokenType: "bearer", expiresIn: 3600 },
        },
      };
    case `POST ${API_ENDPOINTS.AUTH.LOGOUT}`:
      signedInEmail = null;
      return { status: 200, data: {} };
    case `POST ${API_ENDPOINTS.AUTH.REFRESH}`:
      return refreshResponse;
    case `POST ${API_ENDPOINTS.FACILITY.BOOKINGS}`:
      if (config.headers.get("Authorization") === `Bearer ${EXPIRED_TOKEN}`) {
        return { status: 401, data: { detail: "Token expired" } };
      }
      return bookingResponse;
    default:
      return { status: 404, data: { detail: "Not found" } };
  }
};

const fakeAdapter: AxiosAdapter = async (config) => {
  const { status, data } = backend(config);
  const response = { status, data, statusText: "", headers: {}, config };
  if (status >= 400) {
    const code = status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST;
    throw new AxiosError(`Request failed with status code ${status}`, code, config, null, response);
  }
  return response;
};

const BookingHarness = () => {
  const { isLoading, user, loginAsMockUser, logout } = useAuth();
  const [feedback, setFeedback] = useState("");

  const book = async () => {
    setFeedback("");
    try {
      await facilityService.createBooking({
        title: `Choir practice for ${NAME_MARKER}`,
        startAt: "2099-09-01T10:00:00-04:00",
        endAt: "2099-09-01T11:00:00-04:00",
        rooms: [{ facilityId: "room-1" }],
        remark: `${REMARK_MARKER} call ${PHONE_MARKER}`,
      });
      setFeedback("Booked");
    } catch (error) {
      setFeedback((error as ApiError).message);
    }
  };

  return (
    <>
      <span data-testid="member">{isLoading ? "loading" : (user?.id ?? "signed-out")}</span>
      <button type="button" onClick={() => void loginAsMockUser({ email: EMAIL_A })}>
        Sign in as A
      </button>
      <button type="button" onClick={() => void loginAsMockUser({ email: EMAIL_B })}>
        Sign in as B
      </button>
      <button type="button" onClick={() => void logout()}>
        Sign out
      </button>
      <button type="button" onClick={() => void book()}>
        Book
      </button>
      <p role="status">{feedback}</p>
    </>
  );
};

const renderBooking = () =>
  render(
    <AuthProvider>
      <BookingHarness />
    </AuthProvider>
  );

const expectMember = (text: string) => waitFor(() => expect(screen.getByTestId("member")).toHaveTextContent(text));

const signIn = async (as: "A" | "B", memberId: string) => {
  await userEvent.click(screen.getByRole("button", { name: `Sign in as ${as}` }));
  await expectMember(memberId);
};

const signOut = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await expectMember("signed-out");
};

const book = async (expectedFeedback: string) => {
  await userEvent.click(screen.getByRole("button", { name: "Book" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(expectedFeedback), { timeout: 4000 });
};

// Invoke the global handlers the browser calls; jsdom forwards dispatched error events to Vitest as crashes.
const BOOKING_PAYLOAD = {
  title: "Choir practice",
  startAt: "2099-09-01T10:00:00-04:00",
  endAt: "2099-09-01T11:00:00-04:00",
  rooms: [{ facilityId: "room-1" }],
};

const seedExpiredRememberedSession = () => {
  localStorage.setItem("remember_me", "true");
  localStorage.setItem("auth_token", EXPIRED_TOKEN);
  localStorage.setItem("refresh_token", REFRESH_TOKEN);
  localStorage.setItem("refresh_token_expiry", String(Date.now() + 60_000));
};

const raiseWindowError = (error: Error) => {
  globalThis.onerror?.(error.message, "http://localhost:3000/src/main.tsx", 1, 1, error);
};

const raiseUnhandledRejection = (reason: unknown) => {
  const event = Object.assign(new Event("unhandledrejection"), { reason }) as PromiseRejectionEvent;
  globalThis.onunhandledrejection?.call(window, event);
};

const exceptionOf = (event: Record<string, unknown>) =>
  (event.exception as { values: Array<{ type: string; value: string }> }).values.at(-1);

const expectNoPrivateData = (payload: unknown) => {
  const serialized = JSON.stringify(payload);
  for (const marker of PRIVATE_MARKERS) {
    expect(serialized).not.toContain(marker);
  }
};

describe("Sentry error capture", () => {
  beforeEach(async () => {
    await resetSentryForTests();
    sessionStorage.clear();
    localStorage.clear();
    signedInEmail = null;
    bookingResponse = { status: 201, data: { id: "booking-1" } };
    refreshResponse = { status: 200, data: { accessToken: "fresh-access-token", refreshToken: REFRESH_TOKEN } };
    (httpClient as unknown as { axiosInstance: AxiosInstance }).axiosInstance.defaults.adapter = fakeAdapter;
    window.history.replaceState(null, "", `/rooms?note=${REMARK_MARKER}#id_token=${ACCESS_TOKEN}`);
    await change_app_language("en");
  });

  afterEach(async () => {
    cleanup();
    await resetSentryForTests();
    window.history.replaceState(null, "", "/");
  });

  it("reports an unexpected API failure once, as the signed-in member, without private data", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(LOCAL_OPT_IN, { transport: captured.transport });
    const detail = `Booking failed for ${EMAIL_A} (${NAME_MARKER})`;
    bookingResponse = { status: 500, data: { detail, debug_detail: { remark: REMARK_MARKER, phone: PHONE_MARKER } } };

    renderBooking();
    await expectMember("signed-out");
    await signIn("A", MEMBER_A_ID);
    await book(detail);
    await Sentry.flush();

    const events = captured.events();
    expect(events).toHaveLength(1);
    expect(exceptionOf(events[0])).toMatchObject({
      type: "ApiFailureError",
      value: `API 500 POST ${API_ENDPOINTS.FACILITY.BOOKINGS}`,
    });
    expect(events[0]).toMatchObject({
      environment: "dev",
      release: "facility-booking-frontend@local",
      user: { id: MEMBER_A_ID },
      request: { url: "http://localhost:3000/rooms" },
      fingerprint: ["api-failure", "POST", API_ENDPOINTS.FACILITY.BOOKINGS, "500"],
    });
    expect(Object.keys(events[0].user as object)).toEqual(["id"]);
    expect(captured.logs()).toContainEqual(
      expect.objectContaining({
        level: "error",
        body: "API Error: {}",
        attributes: expect.objectContaining({ "user.id": { type: "string", value: MEMBER_A_ID } }),
      })
    );
    expectNoPrivateData(captured.items);
  });

  it("keeps expected Booking conflicts and ordinary 4xx responses out of issues", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(LOCAL_OPT_IN, { transport: captured.transport });

    renderBooking();
    await signIn("A", MEMBER_A_ID);
    bookingResponse = {
      status: 409,
      data: { detail: "The room is already booked", error_code: "FACILITY_SCHEDULING_CONFLICT" },
    };
    await book("The room is already booked");
    bookingResponse = { status: 422, data: { detail: "End time must be after start time" } };
    await book("End time must be after start time");
    raiseUnhandledRejection({ code: 409, message: "The room is already booked", details: { remark: REMARK_MARKER } });
    await Sentry.flush();

    expect(captured.events()).toEqual([]);
    expectNoPrivateData(captured.items);
  });

  it("captures render errors, runtime errors, and unhandled rejections once each", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(LOCAL_OPT_IN, { transport: captured.transport });
    const Broken = () => {
      throw new Error(`Render failed for ${EMAIL_A}`);
    };
    const router = createMemoryRouter([{ path: "/", element: <Broken /> }]);

    render(<RouterProvider router={router} />, { onCaughtError: sentryReactRootOptions.onCaughtError });
    expect(await screen.findByText("Unexpected Application Error!")).toBeInTheDocument();
    const runtimeError = new SyntaxError(`Unexpected token 'p', "${EMAIL_A}" is not valid JSON`);
    raiseWindowError(runtimeError);
    raiseWindowError(runtimeError);
    raiseUnhandledRejection(new Error("Lazy chunk failed to load"));
    await Sentry.flush();

    expect(captured.events().map((event) => exceptionOf(event))).toEqual([
      expect.objectContaining({ type: "Error", value: "Render failed for [Filtered]" }),
      expect.objectContaining({ type: "SyntaxError", value: `Unexpected token 'p', "[Filtered]" is not valid JSON` }),
      expect.objectContaining({ type: "Error", value: "Lazy chunk failed to load" }),
    ]);
    expectNoPrivateData(captured.items);
  });

  it("attributes errors only to the current member and clears identity on logout", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(LOCAL_OPT_IN, { transport: captured.transport });

    renderBooking();
    await signIn("A", MEMBER_A_ID);
    raiseWindowError(new Error("while signed in as A"));
    await signOut();
    raiseWindowError(new Error("after sign out"));
    await signIn("B", MEMBER_B_ID);
    raiseWindowError(new Error("while signed in as B"));
    await Sentry.flush();

    const events = captured.events();
    expect(events.map((event) => [exceptionOf(event)?.value, event.user])).toEqual([
      ["while signed in as A", { id: MEMBER_A_ID }],
      ["after sign out", undefined],
      ["while signed in as B", { id: MEMBER_B_ID }],
    ]);
    expect(JSON.stringify(events.slice(1))).not.toContain(MEMBER_A_ID);
    expectNoPrivateData(captured.items);
  });

  it("keeps expected rejections out of issues after a token refresh", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(LOCAL_OPT_IN, { transport: captured.transport });
    seedExpiredRememberedSession();
    bookingResponse = { status: 409, data: { detail: "The room is already booked" } };

    await expect(facilityService.createBooking(BOOKING_PAYLOAD)).rejects.toBeDefined();
    localStorage.setItem("auth_token", EXPIRED_TOKEN);
    refreshResponse = { status: 401, data: { detail: "Refresh token expired" } };
    await expect(facilityService.createBooking(BOOKING_PAYLOAD)).rejects.toBeDefined();
    await Sentry.flush();

    expect(captured.events()).toEqual([]);
  });

  it("reports a failed token refresh once, under the refresh route", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(LOCAL_OPT_IN, { transport: captured.transport });
    seedExpiredRememberedSession();
    refreshResponse = { status: 500, data: { detail: `Refresh failed for ${EMAIL_A}` } };

    const results = await Promise.allSettled([
      facilityService.createBooking(BOOKING_PAYLOAD),
      facilityService.createBooking(BOOKING_PAYLOAD),
    ]);
    await Sentry.flush();

    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(captured.events().map((event) => exceptionOf(event)?.value)).toEqual([
      `API 500 POST ${API_ENDPOINTS.AUTH.REFRESH}`,
    ]);
    expectNoPrivateData(captured.items);
  });

  it("labels staging browser errors with the staging environment and commit release", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(
      { mode: "staging", dsn: LOCAL_OPT_IN.dsn, enabled: "", releaseVersion: "5ba2c79" },
      {
        transport: captured.transport,
      }
    );

    raiseWindowError(new Error("staging failure"));
    await Sentry.flush();

    expect(captured.events()).toEqual([
      expect.objectContaining({ environment: "stg", release: "facility-booking-frontend@5ba2c79" }),
    ]);
  });

  it("keeps login and Booking usable when telemetry is not configured", async () => {
    const captured = createCapturedSentryTransport();
    expect(initSentry({ ...LOCAL_OPT_IN, dsn: "" }, { transport: captured.transport })).toBe(false);

    renderBooking();
    await signIn("A", MEMBER_A_ID);
    await book("Booked");
    raiseWindowError(new Error("unconfigured failure"));
    await signOut();
    await Sentry.flush();

    expect(captured.sendAttempts()).toBe(0);
  });

  it("keeps login and Booking usable when ingestion is unavailable", async () => {
    const captured = createCapturedSentryTransport({ unavailable: true });
    initSentry(LOCAL_OPT_IN, { transport: captured.transport });

    renderBooking();
    await signIn("A", MEMBER_A_ID);
    raiseWindowError(new Error("undeliverable failure"));
    await book("Booked");
    await signOut();
    await Sentry.flush();

    await waitFor(() => expect(captured.sendAttempts()).toBeGreaterThan(0));
    await signIn("B", MEMBER_B_ID);
  });
});
