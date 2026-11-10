import * as Sentry from "@sentry/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Replay never starts under jsdom, so the Replay handle is a controllable stand-in.
const replay = vi.hoisted(() => {
  let finishStop: () => void = () => {};
  return {
    stop: vi.fn(() => new Promise<void>((resolve) => (finishStop = resolve))),
    start: vi.fn(),
    startBuffering: vi.fn(),
    finishStop: () => finishStop(),
  };
});

vi.mock("@sentry/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@sentry/react")>()),
  getReplay: () => replay,
}));

import { initSentry, setTelemetryUser } from "@/observability/sentry";
import type { SentryConfig } from "@/observability/sentryConfig";
import { createCapturedSentryTransport, resetSentryForTests } from "@/observability/sentryTestSupport";

const REPLAYED: SentryConfig = {
  mode: "development",
  dsn: "https://public@o0.ingest.example.test/1",
  enabled: "true",
  releaseVersion: "",
  tracesSampleRate: "",
  replaysSessionSampleRate: "1",
  replaysOnErrorSampleRate: "",
  apiUrl: "http://127.0.0.1:8000/api/v1",
};

const MEMBER_A_ID = "member-a-7f3e";
const MEMBER_B_ID = "member-b-91c2";

const userOfNextEvent = async (captured: ReturnType<typeof createCapturedSentryTransport>, message: string) => {
  Sentry.captureMessage(message);
  await Sentry.flush();
  return captured.events().find((event) => event.message === message)?.user;
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const finishReplayStop = async () => {
  await settle();
  replay.finishStop();
  await settle();
};

describe("Replay identity transitions", () => {
  beforeEach(async () => {
    await resetSentryForTests();
    setTelemetryUser(null);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await finishReplayStop();
    setTelemetryUser(null);
    await finishReplayStop();
    await resetSentryForTests();
  });

  it("does not restart Replay when a member signs in", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(REPLAYED, { transport: captured.transport });

    setTelemetryUser(MEMBER_A_ID);

    expect(replay.stop).not.toHaveBeenCalled();
    expect(await userOfNextEvent(captured, "signed in")).toEqual({ id: MEMBER_A_ID });
  });

  it("ends the previous member's Replay before the next member is attributed", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(REPLAYED, { transport: captured.transport });
    setTelemetryUser(MEMBER_A_ID);

    setTelemetryUser(null);
    setTelemetryUser(MEMBER_B_ID);

    expect(replay.stop).toHaveBeenCalledTimes(1);
    expect(await userOfNextEvent(captured, "while the previous Replay ends")).toBeUndefined();

    await finishReplayStop();

    expect(replay.start).toHaveBeenCalledTimes(1);
    expect(await userOfNextEvent(captured, "after the new Replay starts")).toEqual({ id: MEMBER_B_ID });
  });

  it("ends the Replay on a direct account change", async () => {
    const captured = createCapturedSentryTransport();
    initSentry(REPLAYED, { transport: captured.transport });
    setTelemetryUser(MEMBER_A_ID);

    setTelemetryUser(MEMBER_B_ID);

    expect(await userOfNextEvent(captured, "during the account change")).toBeUndefined();
    await finishReplayStop();

    expect(replay.start).toHaveBeenCalledTimes(1);
    expect(await userOfNextEvent(captured, "after the account change")).toEqual({ id: MEMBER_B_ID });
  });
});
