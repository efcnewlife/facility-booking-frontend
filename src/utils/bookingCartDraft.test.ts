import { describe, expect, it } from "vitest";
import { emptyCartState } from "./timetableRules";
import { cartStateToDraft, draftToCartState, whenSeedFromSearch } from "./bookingCartDraft";

describe("whenSeedFromSearch", () => {
  it("returns null unless both start and end are present and valid", () => {
    expect(whenSeedFromSearch(undefined, undefined)).toBeNull();
    expect(whenSeedFromSearch("09:00", undefined)).toBeNull();
    expect(whenSeedFromSearch("09:00", "11:00")).toEqual({ start: "09:00", end: "11:00" });
  });
});

describe("cartStateToDraft", () => {
  it("encodes confirmed cart lines and the current Title for Booking Details navigation", () => {
    const state = {
      ...emptyCartState({ start: "09:00", end: "11:00" }, "Choir practice"),
      lines: [
        { facilityId: "room-a", start: "10:00", end: "11:00", sequence: 1 },
        { facilityId: "room-a", start: "14:00", end: "15:00", sequence: 2 },
      ],
    };
    expect(cartStateToDraft("2026-09-01", "m-1", state)).toEqual({
      date: "2026-09-01",
      ministryId: "m-1",
      title: "Choir practice",
      lines: state.lines,
    });
  });
});

describe("draftToCartState", () => {
  it("restores cart lines, Title, and optional When seed without pin", () => {
    const draft = {
      date: "2026-09-01",
      title: "Choir practice",
      lines: [{ sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" }],
    };
    const whenSeed = { start: "09:00", end: "11:00" };
    expect(draftToCartState(draft, whenSeed)).toEqual({
      lines: [{ facilityId: "room-a", start: "10:00", end: "11:00", sequence: 1 }],
      pinned: null,
      whenSeed,
      sharedTime: null,
      title: "Choir practice",
    });
  });

  it("defaults Title to an empty string when the draft has none", () => {
    const draft = {
      date: "2026-09-01",
      lines: [] as { sequence: number; facilityId: string; start: string; end: string }[],
    };
    expect(draftToCartState(draft, null).title).toBe("");
  });
});
