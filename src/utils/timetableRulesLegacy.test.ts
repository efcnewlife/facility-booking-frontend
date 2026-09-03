import { describe, expect, it } from "vitest";
import { MAX_BOOKING_LINES, type RoomDay } from "./timetableRules";
import { bookRoom, canReviewBooking, type TimetableSelection } from "./timetableRulesLegacy";

const gymCells = (): RoomDay["cells"] => {
  const cells: RoomDay["cells"] = [];
  for (let minutes = 9 * 60; minutes < 17 * 60; minutes += 30) {
    const start = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const endMinutes = minutes + 30;
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    cells.push({ start, end, state: "available" });
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

describe("bookRoom legacy selection", () => {
  const empty: TimetableSelection = { roomIds: [], interval: null };

  it("seeds Time from the clicked Slot when Time is empty", () => {
    const next = bookRoom(empty, gym(), "09:30", "single");
    expect(next.interval).toEqual({ start: "09:30", end: "10:30" });
    expect(next.roomIds).toEqual(["gym-id"]);
  });

  it("caps Multiple at three rooms", () => {
    const selected: TimetableSelection = {
      roomIds: ["a", "b", "c"],
      interval: { start: "10:00", end: "11:00" },
    };
    const next = bookRoom(selected, gym(), "10:00", "multiple");
    expect(next.roomIds).toHaveLength(MAX_BOOKING_LINES);
  });
});

describe("canReviewBooking legacy selection", () => {
  it("requires at least one room and a shared interval", () => {
    expect(canReviewBooking({ roomIds: [], interval: { start: "10:00", end: "11:00" } })).toBe(false);
    expect(canReviewBooking({ roomIds: ["gym-id"], interval: { start: "10:00", end: "11:00" } })).toBe(true);
  });
});
