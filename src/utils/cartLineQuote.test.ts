import { describe, expect, it } from "vitest";
import { combineDateAndClock } from "./bookingDateTime";
import { emptyCartState, setCartLineQuote, updateCartLine } from "./timetableRules";

describe("combineDateAndClock", () => {
  it("combines a calendar date and clock into ISO", () => {
    const iso = combineDateAndClock("2026-09-02", "10:00");
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(iso).toString()).not.toBe("Invalid Date");
  });

  it("rolls midnight end times to the next calendar day", () => {
    const iso = combineDateAndClock("2026-09-02", "24:00");
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(iso >= combineDateAndClock("2026-09-02", "23:00")).toBe(true);
  });
});

describe("setCartLineQuote", () => {
  it("stores subtotal and currency on one line", () => {
    const state = {
      ...emptyCartState(),
      lines: [{ facilityId: "room-1", start: "10:00", end: "11:00", sequence: 1 }],
    };
    const next = setCartLineQuote(state, 1, "75.00", "CAD");
    expect(next.lines[0]?.lineSubtotal).toBe("75.00");
    expect(next.lines[0]?.currency).toBe("CAD");
  });
});

describe("updateCartLine quote reset", () => {
  it("clears line subtotal when the interval changes", () => {
    const state = {
      lines: [
        { facilityId: "room-1", start: "10:00", end: "11:00", sequence: 1, lineSubtotal: "50.00", currency: "CAD" },
      ],
      pinned: null,
      whenSeed: null,
    };
    const updated = updateCartLine(state, 1, { facilityId: "room-1", start: "10:00", end: "12:00" });
    expect(updated?.lines[0]?.lineSubtotal).toBeUndefined();
    expect(updated?.lines[0]?.currency).toBeUndefined();
  });
});
