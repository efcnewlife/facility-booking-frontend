import { describe, expect, it } from "vitest";
import { emptyCartState } from "./timetableRules";
import {
  cartStateToDraft,
  draftToCartState,
  parseBookingCartDraft,
  toBookingCartDraftParams,
  whenSeedFromSearch,
} from "./bookingCartDraft";

describe("whenSeedFromSearch", () => {
  it("returns null unless both start and end are present and valid", () => {
    expect(whenSeedFromSearch(undefined, undefined)).toBeNull();
    expect(whenSeedFromSearch("09:00", undefined)).toBeNull();
    expect(whenSeedFromSearch("09:00", "11:00")).toEqual({ start: "09:00", end: "11:00" });
  });
});

describe("parseBookingCartDraft", () => {
  it("returns null when date or lines are missing", () => {
    expect(parseBookingCartDraft(new URLSearchParams())).toBeNull();
    expect(parseBookingCartDraft(new URLSearchParams("date=2026-09-01"))).toBeNull();
    expect(parseBookingCartDraft(new URLSearchParams("date=bad-date&lines=1~room-a~10:00~11:00"))).toBeNull();
  });

  it("reads multi-line drafts with facilityId, start, end, and sequence", () => {
    const params = new URLSearchParams(
      "date=2026-09-01&lines=1~room-a~10:00~11:00,2~room-b~14:00~15:00&ministryId=m-1"
    );
    expect(parseBookingCartDraft(params)).toEqual({
      date: "2026-09-01",
      ministryId: "m-1",
      lines: [
        { sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" },
        { sequence: 2, facilityId: "room-b", start: "14:00", end: "15:00" },
      ],
    });
  });

  it("drops duplicate lines and caps at three", () => {
    const params = new URLSearchParams(
      "date=2026-09-01&lines=1~room-a~10:00~11:00,2~room-a~10:00~11:00,3~room-b~12:00~13:00,4~room-c~13:00~14:00,5~room-d~14:00~15:00"
    );
    expect(parseBookingCartDraft(params)?.lines).toHaveLength(3);
  });
});

describe("toBookingCartDraftParams", () => {
  it("round-trips a multi-line draft", () => {
    const draft = {
      date: "2026-09-01",
      ministryId: "m-1",
      lines: [
        { sequence: 2, facilityId: "room-b", start: "14:00", end: "15:00" },
        { sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" },
      ],
    };
    expect(parseBookingCartDraft(toBookingCartDraftParams(draft))).toEqual({
      date: "2026-09-01",
      ministryId: "m-1",
      lines: [
        { sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" },
        { sequence: 2, facilityId: "room-b", start: "14:00", end: "15:00" },
      ],
    });
  });
});

describe("cartStateToDraft", () => {
  it("encodes confirmed cart lines for Booking Details navigation", () => {
    const state = {
      ...emptyCartState({ start: "09:00", end: "11:00" }),
      lines: [
        { facilityId: "room-a", start: "10:00", end: "11:00", sequence: 1 },
        { facilityId: "room-a", start: "14:00", end: "15:00", sequence: 2 },
      ],
    };
    expect(cartStateToDraft("2026-09-01", "m-1", state)).toEqual({
      date: "2026-09-01",
      ministryId: "m-1",
      lines: state.lines,
    });
  });
});

describe("draftToCartState", () => {
  it("restores cart lines and optional When seed without pin", () => {
    const draft = {
      date: "2026-09-01",
      lines: [{ sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" }],
    };
    const whenSeed = { start: "09:00", end: "11:00" };
    expect(draftToCartState(draft, whenSeed)).toEqual({
      lines: [{ facilityId: "room-a", start: "10:00", end: "11:00", sequence: 1 }],
      pinned: null,
      whenSeed,
    });
  });
});
