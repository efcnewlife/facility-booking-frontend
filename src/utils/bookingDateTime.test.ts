import { describe, expect, it } from "vitest";

import { clockFromDateTime, combineDateAndClock } from "./bookingDateTime";

describe("combineDateAndClock / clockFromDateTime", () => {
  it("round-trips an ordinary clock on the given date", () => {
    const iso = combineDateAndClock("2026-09-01", "10:30");
    expect(clockFromDateTime("2026-09-01", iso)).toBe("10:30");
  });

  it("round-trips the 24:00 end-of-day sentinel", () => {
    const iso = combineDateAndClock("2026-09-01", "24:00");
    expect(clockFromDateTime("2026-09-01", iso)).toBe("24:00");
  });
});
