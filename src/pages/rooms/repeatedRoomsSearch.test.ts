import { describe, expect, it } from "vitest";
import { whenSeedFromSearch } from "@/utils/bookingCartDraft";
import { proposalKeyForAnswers } from "@/utils/recurringSeriesReview";
import { parseRoomsSearchQuery, recurringWhenFromRoomsQuery, type StartBookingAnswers } from "@/utils/startBookingFlow";
import {
  applyRepeatedTimeReplacement,
  confirmRepeatedCartLine,
  emptyCartState,
  emptyTimeBookInterval,
  isBookableCellForCart,
  type RepeatedCartState,
  type RoomDay,
} from "@/utils/timetableRules";

const gymCells = (): RoomDay["cells"] => {
  const cells: RoomDay["cells"] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const startHour = Math.floor(minutes / 60);
    const startMinute = minutes % 60;
    const endMinutes = minutes + 30;
    const start = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
    const end =
      endMinutes >= 24 * 60
        ? "24:00"
        : `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const inOpenHours = minutes >= 9 * 60 && minutes < 17 * 60;
    cells.push({ start, end, state: inOpenHours ? "available" : "closed" });
  }
  return cells;
};

const gym = (): RoomDay => ({
  id: "gym-id",
  code: "gym",
  name: "Gym",
  capacity: 200,
  photoUrls: [],
  templates: [{ start: "09:00", end: "17:00", slotDurationMinutes: 60 }],
  cells: gymCells(),
});

const answersFromCart = (
  query: NonNullable<ReturnType<typeof parseRoomsSearchQuery>>,
  cart: RepeatedCartState
): StartBookingAnswers => {
  const roomIds = cart.lines.map((line) => line.facilityId);
  return {
    isMinistryBooking: false,
    ministryId: null,
    frequency: "repeated",
    when: { date: null, start: null, end: null },
    recurringWhen: {
      ...recurringWhenFromRoomsQuery(query, roomIds),
      startTime: cart.sharedTime?.start ?? null,
      endTime: cart.sharedTime?.end ?? null,
    },
  };
};

describe("Repeated /rooms search without a preselected time", () => {
  it("searches with First occurrence only and confirms the first interval into the cart", () => {
    const query = parseRoomsSearchQuery(new URLSearchParams("frequency=repeated&date=2026-08-20&weekday=4"));
    expect(query).toEqual({
      frequency: "repeated",
      date: "2026-08-20",
      weekday: 4,
    });
    const whenSeed = whenSeedFromSearch(query?.start, query?.end);
    expect(whenSeed).toBeNull();

    const rooms = [gym()];
    const empty: RepeatedCartState = { ...emptyCartState(whenSeed), sharedTime: null };
    expect(isBookableCellForCart(rooms[0], "10:00", empty)).toBe(true);
    const firstInterval = emptyTimeBookInterval(rooms[0], "10:00");
    expect(firstInterval).toEqual({ start: "10:00", end: "11:00" });
    if (!firstInterval) {
      throw new Error("expected a bookable 10:00 interval");
    }
    const confirmed = confirmRepeatedCartLine(
      empty,
      { facilityId: rooms[0].id, start: firstInterval.start, end: firstInterval.end },
      3
    );
    expect(confirmed.decision).toBe("added");
    expect(confirmed.state.sharedTime).toEqual({ start: "10:00", end: "11:00" });
    expect(confirmed.state.lines).toEqual([{ facilityId: "gym-id", start: "10:00", end: "11:00", sequence: 1 }]);
  });

  it("invalidates the previous proposal key when replacement clears the cart", () => {
    const query = parseRoomsSearchQuery(
      new URLSearchParams("frequency=repeated&date=2026-08-20&lastDate=2026-09-24&weekday=4")
    );
    if (!query) {
      throw new Error("expected Repeated search intent");
    }
    const first = confirmRepeatedCartLine(
      { ...emptyCartState(), sharedTime: null },
      { facilityId: "gym-id", start: "10:00", end: "11:00" },
      3
    ).state;
    const previousKey = proposalKeyForAnswers(answersFromCart(query, first));
    expect(previousKey).toContain("10:00");

    const replaced = applyRepeatedTimeReplacement(first, { facilityId: "gym-id", start: "13:00", end: "14:00" }, 3);
    const nextKey = proposalKeyForAnswers(answersFromCart(query, replaced.state));
    expect(nextKey).not.toBe(previousKey);
    expect(nextKey).toContain("13:00");
    expect(replaced.state.lines).toHaveLength(1);
  });
});
