import { describe, expect, it, vi } from "vitest";
import type { BookingCartDraft } from "./bookingCartDraft";
import { clearStartBookingState } from "./startBookingEntry";
import { createFakeStorage } from "./testHelpers/cartStorage";
import { saveTimetableCart, TIMETABLE_CART_STORAGE_KEY } from "./timetableCartStorage";

const draft: BookingCartDraft = {
  date: "2026-09-14",
  ministryId: "m-1",
  lines: [{ sequence: 1, facilityId: "room-a", start: "10:00", end: "11:00" }],
};

describe("clearStartBookingState", () => {
  it("clears the persisted Timetable cart", async () => {
    const storage = createFakeStorage();
    saveTimetableCart(storage, draft);
    const deleteAllDrafts = vi.fn().mockResolvedValue(undefined);

    await clearStartBookingState(storage, deleteAllDrafts);

    expect(storage.getItem(TIMETABLE_CART_STORAGE_KEY)).toBeNull();
  });

  it("calls the Booking Draft bulk-delete operation", async () => {
    const storage = createFakeStorage();
    const deleteAllDrafts = vi.fn().mockResolvedValue(undefined);

    await clearStartBookingState(storage, deleteAllDrafts);

    expect(deleteAllDrafts).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when there is nothing to clear", async () => {
    const storage = createFakeStorage();
    const deleteAllDrafts = vi.fn().mockResolvedValue(undefined);

    await expect(clearStartBookingState(storage, deleteAllDrafts)).resolves.toBeUndefined();
    expect(storage.getItem(TIMETABLE_CART_STORAGE_KEY)).toBeNull();
  });

  it("does not throw when the bulk-delete call fails", async () => {
    const storage = createFakeStorage();
    saveTimetableCart(storage, draft);
    const deleteAllDrafts = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(clearStartBookingState(storage, deleteAllDrafts)).resolves.toBeUndefined();
    expect(storage.getItem(TIMETABLE_CART_STORAGE_KEY)).toBeNull();
  });
});
