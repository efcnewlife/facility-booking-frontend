import { describe, expect, it } from "vitest";
import {
  MAX_SELECTED_ROOMS,
  bookRoom,
  canReviewBooking,
  capacityBandFor,
  clearUnconfirmedSelection,
  displayBlocks,
  emptyTimeBookInterval,
  emptyTimePointerAction,
  hasNoMatchingResults,
  isRoomAvailable,
  matchesCapacityBand,
  removeSelectedRoom,
  scrollTargetClock,
  visibleRooms,
  type BookingInterval,
  type RoomDay,
  type TimetableSelection,
} from "./timetableRules";

const gymCells = (overrides: Partial<Record<string, RoomDay["cells"][number]["state"]>> = {}): RoomDay["cells"] => {
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
    const state = overrides[start] ?? (inOpenHours ? "available" : "closed");
    cells.push({ start, end, state });
  }
  return cells;
};

const gym = (overrides: Partial<RoomDay> = {}): RoomDay => ({
  id: "gym-id",
  code: "gym",
  name: "Gym",
  capacity: 200,
  photoUrls: [],
  templates: [{ start: "09:00", end: "17:00", slotDurationMinutes: 60 }],
  cells: gymCells(),
  ...overrides,
});

const chapel = (): RoomDay => ({
  id: "chapel-id",
  code: "chapel",
  name: "Chapel",
  capacity: 10,
  photoUrls: [],
  templates: [{ start: "09:00", end: "12:00", slotDurationMinutes: 60 }],
  cells: gymCells({
    "12:00": "closed",
    "12:30": "closed",
    "13:00": "closed",
    "13:30": "closed",
    "14:00": "closed",
    "14:30": "closed",
    "15:00": "closed",
    "15:30": "closed",
    "16:00": "closed",
    "16:30": "closed",
  }),
});

const sanctuary = (): RoomDay => ({
  id: "sanctuary-id",
  code: "sanctuary-hall",
  name: "Sanctuary",
  capacity: 25,
  photoUrls: [],
  templates: [{ start: "09:00", end: "17:00", slotDurationMinutes: 60 }],
  cells: gymCells(),
});

describe("emptyTimeBookInterval", () => {
  it("starts at the clicked Slot for Template duration 60", () => {
    expect(emptyTimeBookInterval(gym(), "09:30")).toEqual({ start: "09:30", end: "10:30" });
  });

  it("rejects a click that would extend past midnight", () => {
    const late = gym({
      templates: [{ start: "22:00", end: "24:00", slotDurationMinutes: 60 }],
      cells: gymCells({
        "22:00": "available",
        "22:30": "available",
        "23:00": "available",
        "23:30": "available",
      }),
    });
    expect(emptyTimeBookInterval(late, "23:30")).toBeNull();
  });
});

describe("isRoomAvailable", () => {
  it("allows an interval equal to Template duration", () => {
    expect(isRoomAvailable(gym(), { start: "10:00", end: "11:00" })).toBe(true);
  });

  it("rejects an interval shorter than Template duration", () => {
    expect(isRoomAvailable(gym(), { start: "10:00", end: "10:30" })).toBe(false);
  });

  it("allows an interval longer than duration that is not an integer multiple", () => {
    expect(isRoomAvailable(gym(), { start: "10:00", end: "11:30" })).toBe(true);
  });

  it("rejects an interval that includes Unavailable cells", () => {
    const occupied = gym({ cells: gymCells({ "10:00": "unavailable", "10:30": "unavailable" }) });
    expect(isRoomAvailable(occupied, { start: "10:00", end: "11:00" })).toBe(false);
  });

  it("rejects Override cells", () => {
    const overridden = gym({ cells: gymCells({ "10:00": "override", "10:30": "override" }) });
    expect(isRoomAvailable(overridden, { start: "10:00", end: "11:00" })).toBe(false);
    expect(emptyTimeBookInterval(overridden, "10:00")).toBeNull();
  });

  it("rejects an interval with missing Slots", () => {
    const sparse = gym({
      cells: gym().cells.filter((cell) => cell.start === "10:00"),
    });
    expect(isRoomAvailable(sparse, { start: "10:00", end: "11:00" })).toBe(false);
  });
});

describe("bookRoom", () => {
  const empty: TimetableSelection = { roomIds: [], interval: null };

  it("seeds Time from the clicked Slot when Time is empty", () => {
    const next = bookRoom(empty, gym(), "09:30", "single");
    expect(next.interval).toEqual({ start: "09:30", end: "10:30" });
    expect(next.roomIds).toEqual(["gym-id"]);
  });

  it("keeps Time and replaces the room in Single", () => {
    const selected: TimetableSelection = { roomIds: ["chapel-id"], interval: { start: "10:00", end: "11:00" } };
    const next = bookRoom(selected, gym(), "10:00", "single");
    expect(next.interval).toEqual({ start: "10:00", end: "11:00" });
    expect(next.roomIds).toEqual(["gym-id"]);
  });

  it("adds a second room in Multiple without changing Time", () => {
    const selected: TimetableSelection = { roomIds: ["chapel-id"], interval: { start: "10:00", end: "11:00" } };
    const next = bookRoom(selected, gym(), "10:00", "multiple");
    expect(next.interval).toEqual({ start: "10:00", end: "11:00" });
    expect(next.roomIds).toEqual(["chapel-id", "gym-id"]);
  });

  it("caps Multiple at three rooms", () => {
    const selected: TimetableSelection = {
      roomIds: ["a", "b", "c"],
      interval: { start: "10:00", end: "11:00" },
    };
    const next = bookRoom(selected, gym(), "10:00", "multiple");
    expect(next.roomIds).toHaveLength(MAX_SELECTED_ROOMS);
  });

  it("replaces the shared interval when BOOK starts a different span", () => {
    const selected: TimetableSelection = { roomIds: ["chapel-id"], interval: { start: "10:00", end: "11:00" } };
    const next = bookRoom(selected, gym(), "14:00", "multiple");
    expect(next.interval).toEqual({ start: "14:00", end: "15:00" });
    expect(next.roomIds).toEqual(["gym-id"]);
  });
});

describe("canReviewBooking", () => {
  it("is disabled until at least one room is selected", () => {
    expect(canReviewBooking({ roomIds: [], interval: { start: "10:00", end: "11:00" } })).toBe(false);
    expect(canReviewBooking({ roomIds: ["gym-id"], interval: { start: "10:00", end: "11:00" } })).toBe(true);
  });
});

describe("capacityBandFor", () => {
  it("counts capacity 10 as 1-10", () => {
    expect(capacityBandFor(10)).toBe("1-10");
    expect(matchesCapacityBand(gym({ capacity: 10 }), "1-10")).toBe(true);
    expect(matchesCapacityBand(gym({ capacity: 10 }), "10-25")).toBe(false);
  });
});

describe("visibleRooms", () => {
  const rooms = [gym(), chapel(), sanctuary()];
  const interval: BookingInterval = { start: "10:00", end: "11:00" };

  it("defaults Available rooms to rooms that can be BOOK'd", () => {
    const occupiedGym = gym({ cells: gymCells({ "10:00": "unavailable", "10:30": "unavailable" }) });
    const list = visibleRooms([occupiedGym, chapel()], "available", interval, null, undefined);
    expect(list.map((room) => room.id)).toEqual(["chapel-id"]);
  });

  it("keeps All rooms columns with no Available block", () => {
    const occupiedGym = gym({ cells: gymCells({ "10:00": "unavailable", "10:30": "unavailable" }) });
    const list = visibleRooms([occupiedGym, chapel()], "all", interval, null, undefined);
    expect(list.map((room) => room.id)).toEqual(["gym-id", "chapel-id"]);
  });

  it("filters by Room shortcut", () => {
    expect(visibleRooms(rooms, "all", interval, null, "gym").map((room) => room.code)).toEqual(["gym"]);
  });

  it("filters by capacity band", () => {
    expect(visibleRooms(rooms, "all", interval, "1-10", undefined).map((room) => room.code)).toEqual(["chapel"]);
  });
});

describe("hasNoMatchingResults", () => {
  it("is true on Available rooms when nothing can be BOOK'd", () => {
    const occupied = gym({ cells: gymCells({ "10:00": "unavailable", "10:30": "unavailable" }) });
    expect(hasNoMatchingResults([occupied], "available", { start: "10:00", end: "11:00" }, null, undefined)).toBe(true);
    expect(hasNoMatchingResults([occupied], "all", { start: "10:00", end: "11:00" }, null, undefined)).toBe(false);
  });
});

describe("clearUnconfirmedSelection", () => {
  it("clears rooms selected but not yet confirmed", () => {
    const selected: TimetableSelection = { roomIds: ["gym-id"], interval: { start: "10:00", end: "11:00" } };
    expect(clearUnconfirmedSelection(selected)).toEqual({ roomIds: [], interval: selected.interval });
  });
});

describe("removeSelectedRoom", () => {
  it("drops that room and keeps the rest", () => {
    const selected: TimetableSelection = {
      roomIds: ["gym-id", "chapel-id"],
      interval: { start: "10:00", end: "11:00" },
    };
    expect(removeSelectedRoom(selected, "gym-id").roomIds).toEqual(["chapel-id"]);
  });
});

describe("displayBlocks", () => {
  it("does not paint Available when Time is empty", () => {
    const blocks = displayBlocks(gym(), null);
    expect(blocks.some((block) => block.state === "available")).toBe(false);
  });

  it("paints a Template-duration Available preview only on the hovered room", () => {
    const hover = { roomId: "gym-id", cellStart: "09:30" };
    expect(displayBlocks(gym(), null, hover).filter((block) => block.state === "available")).toEqual([
      { start: "09:30", end: "10:30", state: "available" },
    ]);
    expect(displayBlocks(chapel(), null, hover).some((block) => block.state === "available")).toBe(false);
  });

  it("does not preview Available that would cross midnight", () => {
    const late = gym({
      templates: [{ start: "22:00", end: "24:00", slotDurationMinutes: 60 }],
      cells: gymCells({
        "22:00": "available",
        "22:30": "available",
        "23:00": "available",
        "23:30": "available",
      }),
    });
    const blocks = displayBlocks(late, null, { roomId: "gym-id", cellStart: "23:30" });
    expect(blocks.some((block) => block.state === "available")).toBe(false);
  });

  it("paints Available only on the Booking interval", () => {
    const blocks = displayBlocks(gym(), { start: "10:00", end: "11:30" });
    expect(blocks.filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:30", state: "available" },
    ]);
  });

  it("paints committed Available without hover on rooms that cover the interval", () => {
    const interval = { start: "10:00", end: "11:00" };
    expect(displayBlocks(gym(), interval).filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:00", state: "available" },
    ]);
    expect(displayBlocks(chapel(), interval).filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:00", state: "available" },
    ]);
  });

  it("keeps Unavailable blocks when Time is set", () => {
    const occupied = gym({ cells: gymCells({ "13:00": "unavailable", "13:30": "unavailable" }) });
    const blocks = displayBlocks(occupied, { start: "10:00", end: "11:00" });
    expect(blocks).toContainEqual({ start: "13:00", end: "14:00", state: "unavailable" });
  });
});

describe("scrollTargetClock", () => {
  it("uses Start Time when the Booking interval pair is set", () => {
    expect(scrollTargetClock([gym(), chapel()], { start: "10:00", end: "11:30" })).toBe("10:00");
  });

  it("uses the earliest non-Closed Slot among the rooms when Time is empty", () => {
    const lateGym = gym({
      cells: gymCells({
        "00:00": "closed",
        "00:30": "closed",
        "08:00": "unavailable",
        "08:30": "unavailable",
      }),
    });
    const earlyChapel = gym({
      id: "chapel-id",
      code: "chapel",
      name: "Chapel",
      cells: gymCells({
        "00:00": "closed",
        "07:30": "available",
        "08:00": "available",
      }),
    });
    expect(scrollTargetClock([lateGym, earlyChapel], null)).toBe("07:30");
  });

  it("falls back to 00:00 when every Slot is Closed", () => {
    const closed = gym({
      cells: gym().cells.map((cell) => ({ ...cell, state: "closed" as const })),
    });
    expect(scrollTargetClock([closed], null)).toBe("00:00");
  });
});

describe("emptyTimePointerAction", () => {
  it("commits a mouse click without a prior preview", () => {
    expect(emptyTimePointerAction(null, "mouse", null, { roomId: "gym-id", cellStart: "09:30" })).toBe("commit");
  });

  it("previews the first touch on a cell and commits the second tap on the same cell", () => {
    const gymSlot = { roomId: "gym-id", cellStart: "09:30" };
    expect(emptyTimePointerAction(null, "touch", null, gymSlot)).toBe("preview");
    expect(emptyTimePointerAction(null, "touch", gymSlot, gymSlot)).toBe("commit");
    expect(emptyTimePointerAction(null, "touch", gymSlot, { roomId: "gym-id", cellStart: "10:00" })).toBe("preview");
  });

  it("commits when Time is already set", () => {
    expect(
      emptyTimePointerAction({ start: "10:00", end: "11:00" }, "touch", null, { roomId: "gym-id", cellStart: "10:00" })
    ).toBe("commit");
  });
});
