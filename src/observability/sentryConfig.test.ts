import { describe, expect, it } from "vitest";
import { resolveSentryInit, type SentryConfig } from "@/observability/sentryConfig";

const DSN = "https://public@o0.ingest.example.test/1";

const config = (overrides: Partial<SentryConfig>): SentryConfig => ({
  mode: "production",
  dsn: DSN,
  enabled: "",
  releaseVersion: "0.2.33",
  ...overrides,
});

describe("resolveSentryInit", () => {
  it.each([
    ["development", "true", "", "dev", "facility-booking-frontend@local"],
    ["staging", "", "5ba2c79", "stg", "facility-booking-frontend@5ba2c79"],
    ["production", "", "0.2.33", "prod", "facility-booking-frontend@0.2.33"],
  ])("maps %s builds to the %s telemetry environment and release", (mode, enabled, releaseVersion, env, release) => {
    expect(resolveSentryInit(config({ mode, enabled, releaseVersion }))).toEqual({
      enabled: true,
      dsn: DSN,
      environment: env,
      release,
    });
  });

  it("labels opted-in local runs as local even when a version is configured", () => {
    expect(resolveSentryInit(config({ mode: "development", enabled: "true", releaseVersion: "0.2.33" }))).toMatchObject(
      {
        release: "facility-booking-frontend@local",
      }
    );
  });

  it("keeps local export off unless explicitly opted in", () => {
    expect(resolveSentryInit(config({ mode: "development", enabled: "" }))).toEqual({
      enabled: false,
      reason: "disabled",
    });
  });

  it.each(["test", "preview", "Production", ""])("never exports from the %s mode, even when opted in", (mode) => {
    expect(resolveSentryInit(config({ mode, enabled: "true" }))).toEqual({
      enabled: false,
      reason: "unknown-mode",
    });
  });

  it.each(["staging", "production"])("lets %s builds be switched off explicitly", (mode) => {
    expect(resolveSentryInit(config({ mode, enabled: "false", releaseVersion: "5ba2c79" }))).toEqual({
      enabled: false,
      reason: "disabled",
    });
  });

  it.each(["", "   "])("stays off without a DSN", (dsn) => {
    expect(resolveSentryInit(config({ dsn }))).toEqual({ enabled: false, reason: "missing-dsn" });
  });

  it.each([
    ["production", ""],
    ["production", "local"],
    ["production", "5ba2c79"],
    ["production", "v0.2.33"],
    ["staging", ""],
    ["staging", "local"],
    ["staging", "0.2.33"],
    ["staging", "5BA2C79"],
    ["staging", "5ba2c79d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7"],
  ])("refuses to label a %s build with release version %j", (mode, releaseVersion) => {
    expect(resolveSentryInit(config({ mode, releaseVersion }))).toEqual({
      enabled: false,
      reason: "invalid-release",
    });
  });
});
