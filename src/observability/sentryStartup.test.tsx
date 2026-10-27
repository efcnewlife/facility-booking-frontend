import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as Sentry from "@sentry/react";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
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
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

vi.mock("@/api/services/facilityService", () => {
  const facility = {
    getRecurringBookingWindowStatus: vi.fn().mockResolvedValue({ isOpen: true, nextOpeningDate: null }),
  };
  return { default: facility, facilityService: facility };
});

vi.mock("@/api/services/ministryService", () => ({
  default: { listMine: vi.fn().mockResolvedValue({ items: [] }) },
}));

vi.mock("@/context/MinistryMembershipContext", () => ({
  useMinistryMembership: () => ({
    isMinistryMember: false,
    canAccessMyMinistry: false,
    isLoading: false,
    refreshMembership: vi.fn(),
  }),
}));

import { initSentry } from "@/observability/sentry";
import type { SentryConfig } from "@/observability/sentryConfig";
import { createCapturedSentryTransport, resetSentryForTests } from "@/observability/sentryTestSupport";

import { AuthProvider } from "@/context/AuthContext";
import "@/i18n";
import LoginPage from "@/pages/login/LoginPage";
import StartBookingPage from "@/pages/start-booking/StartBookingPage";

const LOCAL_OPT_IN: SentryConfig = {
  mode: "development",
  dsn: "https://public@o0.ingest.example.test/1",
  enabled: "true",
  releaseVersion: "",
};

const SYNTHETIC_MESSAGE = "Facility Booking telemetry startup check";

const renderAt = (entry: string) =>
  render(
    <StrictMode>
      <AuthProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route element={<LoginPage />} path="/login" />
            <Route element={<StartBookingPage />} path="/start-booking" />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </StrictMode>
  );

const expectLoginUsable = async () => {
  renderAt("/login");
  expect(await screen.findByRole("img", { name: "NEW LIFE Booking" })).toBeInTheDocument();
  cleanup();
};

const expectStartBookingUsable = async () => {
  renderAt("/start-booking");
  expect(await screen.findByRole("heading", { name: "To start, are you booking for a ministry?" })).toBeInTheDocument();
  await userEvent.click(screen.getByLabelText(/^No/));
  await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(await screen.findByRole("heading", { name: "Is this a one-time or repeated booking?" })).toBeInTheDocument();
  cleanup();
};

const expectAppUsable = async () => {
  await expectLoginUsable();
  await expectStartBookingUsable();
};

describe("Sentry startup", () => {
  beforeEach(async () => {
    await resetSentryForTests();
  });

  afterEach(async () => {
    cleanup();
    await resetSentryForTests();
  });

  it("starts with canonical metadata and exports only the synthetic event", async () => {
    const captured = createCapturedSentryTransport();

    expect(initSentry(LOCAL_OPT_IN, { transport: captured.transport })).toBe(true);
    await expectAppUsable();
    Sentry.captureMessage(SYNTHETIC_MESSAGE);
    await Sentry.flush();

    expect(captured.items.map((item) => item.type)).toEqual(["event"]);
    const [event] = captured.events();
    expect(event).toMatchObject({
      message: SYNTHETIC_MESSAGE,
      environment: "dev",
      release: "facility-booking-frontend@local",
    });
    expect(event).not.toHaveProperty("user");
    expect(event.request).toEqual({ url: "http://localhost:3000/" });
    expect(event.breadcrumbs).toEqual([
      expect.objectContaining({ category: "ui.click", message: "input#ministry-no.sr-only" }),
      expect.objectContaining({ category: "ui.click", message: expect.stringMatching(/^button\./) }),
    ]);
  });

  it("initializes once across repeated startup", async () => {
    const first = createCapturedSentryTransport();
    const second = createCapturedSentryTransport();

    expect(initSentry(LOCAL_OPT_IN, { transport: first.transport })).toBe(true);
    expect(initSentry(LOCAL_OPT_IN, { transport: second.transport })).toBe(false);
    await expectAppUsable();
    Sentry.captureMessage(SYNTHETIC_MESSAGE);
    await Sentry.flush();

    expect(first.events()).toHaveLength(1);
    expect(second.items).toEqual([]);
  });

  it("stays uninitialized for the test build, whatever the local env file says", async () => {
    expect(initSentry()).toBe(false);
    expect(Sentry.isInitialized()).toBe(false);
    await expectAppUsable();
  });

  it.each([
    ["local export is not opted in", { ...LOCAL_OPT_IN, enabled: "" }],
    ["the DSN is missing", { ...LOCAL_OPT_IN, dsn: "" }],
  ])("leaves the app usable when %s", async (_, config) => {
    const captured = createCapturedSentryTransport();

    expect(initSentry(config, { transport: captured.transport })).toBe(false);
    await expectAppUsable();
    Sentry.captureMessage(SYNTHETIC_MESSAGE);
    await Sentry.flush();

    expect(Sentry.isInitialized()).toBe(false);
    expect(captured.sendAttempts()).toBe(0);
  });

  it("leaves the app usable when ingestion is unavailable", async () => {
    const captured = createCapturedSentryTransport({ unavailable: true });

    expect(initSentry(LOCAL_OPT_IN, { transport: captured.transport })).toBe(true);
    await expectAppUsable();
    expect(() => Sentry.captureMessage(SYNTHETIC_MESSAGE)).not.toThrow();
    await Sentry.flush();

    await waitFor(() => expect(captured.sendAttempts()).toBe(1));
    await expectAppUsable();
    await Sentry.flush();

    expect(captured.sendAttempts()).toBe(1);
  });
});
