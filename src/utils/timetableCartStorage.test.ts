import { describe, expect, it } from "vitest";
import type { BookingCartDraft } from "./bookingCartDraft";
import { createFakeStorage } from "./testHelpers/cartStorage";
import { loadTimetableCart, saveTimetableCart, TIMETABLE_CART_STORAGE_KEY } from "./timetableCartStorage";

const draft: BookingCartDraft = {
  date: "2026-09-14",
  ministryId: "m-1",
  lines: [{ sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" }],
};

describe("saveTimetableCart", () => {
  it("writes the draft under the storage key", () => {
    const storage = createFakeStorage();
    saveTimetableCart(storage, draft);
    expect(JSON.parse(storage.getItem(TIMETABLE_CART_STORAGE_KEY)!)).toEqual(draft);
  });

  it("clears storage when the draft is null", () => {
    const storage = createFakeStorage({ [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify(draft) });
    saveTimetableCart(storage, null);
    expect(storage.getItem(TIMETABLE_CART_STORAGE_KEY)).toBeNull();
  });

  it("clears storage when the draft has no lines", () => {
    const storage = createFakeStorage({ [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify(draft) });
    saveTimetableCart(storage, { ...draft, lines: [] });
    expect(storage.getItem(TIMETABLE_CART_STORAGE_KEY)).toBeNull();
  });
});

describe("loadTimetableCart", () => {
  it("returns null when nothing is stored", () => {
    const storage = createFakeStorage();
    expect(loadTimetableCart(storage, "2026-09-14", "m-1")).toBeNull();
  });

  it("restores a stored draft matching date and ministry", () => {
    const storage = createFakeStorage({ [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify(draft) });
    expect(loadTimetableCart(storage, "2026-09-14", "m-1")).toEqual(draft);
  });

  it("treats a stored draft for a different date as empty", () => {
    const storage = createFakeStorage({ [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify(draft) });
    expect(loadTimetableCart(storage, "2026-09-15", "m-1")).toBeNull();
  });

  it("treats a stored draft for a different ministry as empty", () => {
    const storage = createFakeStorage({ [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify(draft) });
    expect(loadTimetableCart(storage, "2026-09-14", "m-2")).toBeNull();
  });

  it("treats a stored draft for no ministry differently than one with a ministry", () => {
    const storage = createFakeStorage({ [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify(draft) });
    expect(loadTimetableCart(storage, "2026-09-14", undefined)).toBeNull();
  });

  it("matches when both the search and the stored draft have no ministry", () => {
    const storage = createFakeStorage({
      [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify({ ...draft, ministryId: undefined }),
    });
    expect(loadTimetableCart(storage, "2026-09-14", undefined)).toEqual({ ...draft, ministryId: undefined });
  });

  it("returns null for malformed JSON", () => {
    const storage = createFakeStorage({ [TIMETABLE_CART_STORAGE_KEY]: "not json" });
    expect(loadTimetableCart(storage, "2026-09-14", "m-1")).toBeNull();
  });

  it("returns null when the stored value is missing required fields", () => {
    const storage = createFakeStorage({ [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify({ ministryId: "m-1" }) });
    expect(loadTimetableCart(storage, "2026-09-14", "m-1")).toBeNull();
  });

  it("drops malformed lines and returns null once no valid line remains", () => {
    const storage = createFakeStorage({
      [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify({
        date: "2026-09-14",
        ministryId: "m-1",
        lines: [{ sequence: 1, facilityId: "room-a", start: "bad", end: "also-bad" }],
      }),
    });
    expect(loadTimetableCart(storage, "2026-09-14", "m-1")).toBeNull();
  });

  it("drops duplicate lines without truncating to the hardcoded default", () => {
    const storage = createFakeStorage({
      [TIMETABLE_CART_STORAGE_KEY]: JSON.stringify({
        date: "2026-09-14",
        ministryId: "m-1",
        lines: [
          { sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" },
          { sequence: 2, facilityId: "room-a", start: "10:00", end: "11:00" },
          { sequence: 3, facilityId: "room-b", start: "11:00", end: "12:00" },
          { sequence: 4, facilityId: "room-c", start: "12:00", end: "13:00" },
          { sequence: 5, facilityId: "room-d", start: "13:00", end: "14:00" },
        ],
      }),
    });
    expect(loadTimetableCart(storage, "2026-09-14", "m-1")?.lines).toHaveLength(4);
  });
});
