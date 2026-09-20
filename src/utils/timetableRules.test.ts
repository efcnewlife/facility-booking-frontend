import { describe, expect, it } from "vitest";
import {
  addCartLine,
  applyRepeatedTimeReplacement,
  blockActionForInterval,
  canAddCartLine,
  canConfirmBookingTime,
  canReviewCart,
  capacityBandFor,
  cartPointerAction,
  confirmBookingTimePrefill,
  confirmBookingTimePrefillForCart,
  confirmRepeatedCartLine,
  displayBlocks,
  displayBlocksForCart,
  emptyCartState,
  emptyTimeBookInterval,
  emptyTimePointerAction,
  hasDuplicateLine,
  hasNoMatchingResults,
  intervalStaysOnSameDay,
  isBookableCellForCart,
  isRepeatedRoomSelectable,
  isRoomAvailable,
  isTimetableInitialLoad,
  isWhenSeedEligible,
  matchesCapacityBand,
  MAX_BOOKING_LINES,
  pinInterval,
  repeatedCartLineTime,
  removeCartLine,
  removeRepeatedCartLine,
  retainValidRepeatedRoomIds,
  scrollTargetClock,
  scrollTargetClockForCart,
  toggleRepeatedRoomSelection,
  updateCartLine,
  visibleRooms,
  type BookingInterval,
  type RepeatedCartState,
  type RoomDay,
  type TimetableCartState,
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

const whenSeed = { start: "10:00", end: "11:00" };

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

describe("isWhenSeedEligible", () => {
  it("is false when When seed is absent", () => {
    expect(isWhenSeedEligible(gym(), null)).toBe(false);
  });

  it("is true when the room can cover the When seed interval", () => {
    expect(isWhenSeedEligible(gym(), whenSeed)).toBe(true);
    expect(isWhenSeedEligible(chapel(), whenSeed)).toBe(true);
  });

  it("is false when the room cannot cover the When seed interval", () => {
    expect(isWhenSeedEligible(chapel(), { start: "10:00", end: "13:00" })).toBe(false);
  });
});

describe("pinInterval", () => {
  it("sets Pinned interval for one room only and keeps When seed on the cart state", () => {
    const state = emptyCartState(whenSeed);
    const next = pinInterval(state, gym(), "09:30");
    expect(next.pinned).toEqual({ facilityId: "gym-id", start: "09:30", end: "10:30" });
    expect(next.whenSeed).toEqual(whenSeed);
    expect(next.lines).toEqual([]);
  });

  it("does not change state when the clicked Slot cannot book", () => {
    const state = emptyCartState(whenSeed);
    const occupied = gym({ cells: gymCells({ "09:30": "unavailable" }) });
    expect(pinInterval(state, occupied, "09:30")).toBe(state);
  });

  it("replaces the previous pin when another room is clicked", () => {
    let state = pinInterval(emptyCartState(whenSeed), gym(), "09:30");
    state = pinInterval(state, chapel(), "10:00");
    expect(state.pinned).toEqual({ facilityId: "chapel-id", start: "10:00", end: "11:00" });
    expect(state.whenSeed).toEqual(whenSeed);
  });
});

describe("cart mutations", () => {
  const baseLine = { facilityId: "gym-id", start: "10:00", end: "11:00" };

  it("adds a confirmed Booking line with sequence", () => {
    const next = addCartLine(emptyCartState(), baseLine);
    expect(next?.lines).toEqual([{ ...baseLine, sequence: 1 }]);
  });

  it("rejects duplicate lines keyed by facilityId, start, and end", () => {
    const state: TimetableCartState = {
      lines: [{ ...baseLine, sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    expect(canAddCartLine(state, baseLine)).toBe(false);
    expect(addCartLine(state, baseLine)).toBeNull();
  });

  it("allows the same room at a different time as a separate line", () => {
    const state: TimetableCartState = {
      lines: [{ ...baseLine, sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    const afternoon = { facilityId: "gym-id", start: "14:00", end: "15:00" };
    expect(canAddCartLine(state, afternoon)).toBe(true);
    expect(addCartLine(state, afternoon)?.lines).toHaveLength(2);
  });

  it("caps the cart at three lines", () => {
    let state = emptyCartState();
    state = addCartLine(state, baseLine)!;
    state = addCartLine(state, { facilityId: "chapel-id", start: "10:00", end: "11:00" })!;
    state = addCartLine(state, { facilityId: "sanctuary-id", start: "10:00", end: "11:00" })!;
    expect(state.lines).toHaveLength(MAX_BOOKING_LINES);
    expect(canAddCartLine(state, { facilityId: "gym-id", start: "15:00", end: "16:00" })).toBe(false);
  });

  it("enforces a live cap passed in from the availability response instead of the hardcoded default", () => {
    let state = emptyCartState();
    state = addCartLine(state, baseLine, 2)!;
    state = addCartLine(state, { facilityId: "chapel-id", start: "10:00", end: "11:00" }, 2)!;
    expect(state.lines).toHaveLength(2);
    expect(canAddCartLine(state, { facilityId: "sanctuary-id", start: "10:00", end: "11:00" }, 2)).toBe(false);
    expect(addCartLine(state, { facilityId: "sanctuary-id", start: "10:00", end: "11:00" }, 2)).toBeNull();
  });

  it("allows up to the live cap when it is higher than the hardcoded default", () => {
    let state = emptyCartState();
    const rooms = ["gym-id", "chapel-id", "sanctuary-id", "office-id"];
    for (const facilityId of rooms) {
      state = addCartLine(state, { facilityId, start: "10:00", end: "11:00" }, 10)!;
    }
    expect(state.lines).toHaveLength(4);
    expect(canAddCartLine(state, { facilityId: "gym-id", start: "15:00", end: "16:00" }, 10)).toBe(true);
  });

  it("rejects lines that cross midnight", () => {
    expect(intervalStaysOnSameDay({ start: "23:00", end: "01:00" })).toBe(false);
    expect(canAddCartLine(emptyCartState(), { facilityId: "gym-id", start: "23:00", end: "01:00" })).toBe(false);
  });

  it("updates one line without creating a duplicate", () => {
    const state: TimetableCartState = {
      lines: [
        { facilityId: "gym-id", start: "10:00", end: "11:00", sequence: 1, lineSubtotal: "50.00", currency: "CAD" },
        { facilityId: "chapel-id", start: "10:00", end: "11:00", sequence: 2 },
      ],
      pinned: null,
      whenSeed: null,
    };
    const updated = updateCartLine(state, 1, { facilityId: "gym-id", start: "10:00", end: "12:00" });
    expect(updated?.lines.find((line) => line.sequence === 1)).toEqual({
      facilityId: "gym-id",
      start: "10:00",
      end: "12:00",
      sequence: 1,
      lineSubtotal: undefined,
      currency: undefined,
    });
    expect(hasDuplicateLine(updated!.lines, { facilityId: "chapel-id", start: "10:00", end: "11:00" })).toBe(true);
  });

  it("removes a line by sequence", () => {
    const state: TimetableCartState = {
      lines: [{ ...baseLine, sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    expect(removeCartLine(state, 1).lines).toEqual([]);
  });
});

describe("blockActionForInterval", () => {
  it("shows ADD until the line is confirmed in the cart", () => {
    const interval = { start: "10:00", end: "11:00" };
    expect(blockActionForInterval([], "gym-id", interval)).toBe("add");
    expect(blockActionForInterval([{ facilityId: "gym-id", ...interval, sequence: 1 }], "gym-id", interval)).toBe(
      "checkmark"
    );
  });

  it("returns ADD again after the matching line is removed", () => {
    const interval = { start: "10:00", end: "11:00" };
    const without = removeCartLine(
      {
        lines: [{ facilityId: "gym-id", ...interval, sequence: 1 }],
        pinned: null,
        whenSeed: null,
      },
      1
    );
    expect(blockActionForInterval(without.lines, "gym-id", interval)).toBe("add");
  });
});

describe("canReviewCart", () => {
  it("is disabled until at least one Booking line exists", () => {
    expect(canReviewCart(emptyCartState())).toBe(false);
    expect(
      canReviewCart({
        lines: [{ facilityId: "gym-id", start: "10:00", end: "11:00", sequence: 1 }],
        pinned: null,
        whenSeed: null,
      })
    ).toBe(true);
  });
});

describe("confirmBookingTimePrefill", () => {
  it("prefills the existing interval pair", () => {
    expect(confirmBookingTimePrefill(gym(), "09:30", { start: "10:00", end: "11:30" })).toEqual({
      start: "10:00",
      end: "11:30",
    });
  });

  it("prefills Slot start plus Template duration when no interval is provided", () => {
    expect(confirmBookingTimePrefill(gym(), "09:30", null)).toEqual({ start: "09:30", end: "10:30" });
  });
});

describe("confirmBookingTimePrefillForCart", () => {
  it("prefills from the pinned interval for that room", () => {
    const state = pinInterval(emptyCartState(), gym(), "09:30");
    expect(confirmBookingTimePrefillForCart(gym(), state, "09:30")).toEqual({ start: "09:30", end: "10:30" });
  });

  it("prefills from the line being edited", () => {
    const state: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "10:00", end: "11:30", sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    expect(confirmBookingTimePrefillForCart(gym(), state, "09:30", 1)).toEqual({ start: "10:00", end: "11:30" });
  });
});

describe("canConfirmBookingTime", () => {
  it("rejects an interval shorter than Template duration", () => {
    expect(canConfirmBookingTime(gym(), { start: "10:00", end: "10:30" })).toBe(false);
  });

  it("rejects Closed or Unavailable coverage", () => {
    const occupied = gym({ cells: gymCells({ "10:00": "unavailable", "10:30": "unavailable" }) });
    expect(canConfirmBookingTime(occupied, { start: "10:00", end: "11:00" })).toBe(false);
    expect(canConfirmBookingTime(gym(), { start: "07:00", end: "08:00" })).toBe(false);
  });

  it("rejects overnight or inverted times", () => {
    expect(canConfirmBookingTime(gym(), { start: "23:00", end: "01:00" })).toBe(false);
    expect(canConfirmBookingTime(gym(), { start: "11:00", end: "10:00" })).toBe(false);
  });

  it("allows a valid same-day interval", () => {
    expect(canConfirmBookingTime(gym(), { start: "10:00", end: "11:30" })).toBe(true);
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

  it("defaults Available rooms to rooms that can be booked for the interval", () => {
    const occupiedGym = gym({ cells: gymCells({ "10:00": "unavailable", "10:30": "unavailable" }) });
    const list = visibleRooms([occupiedGym, chapel()], "available", interval, null);
    expect(list.map((room) => room.id)).toEqual(["chapel-id"]);
  });

  it("keeps All rooms columns with no Available block", () => {
    const occupiedGym = gym({ cells: gymCells({ "10:00": "unavailable", "10:30": "unavailable" }) });
    const list = visibleRooms([occupiedGym, chapel()], "all", interval, null);
    expect(list.map((room) => room.id)).toEqual(["gym-id", "chapel-id"]);
  });

  it("filters by capacity band", () => {
    expect(visibleRooms(rooms, "all", interval, "1-10").map((room) => room.code)).toEqual(["chapel"]);
  });
});

describe("hasNoMatchingResults", () => {
  it("is true on Available rooms when nothing can be booked", () => {
    const occupied = gym({ cells: gymCells({ "10:00": "unavailable", "10:30": "unavailable" }) });
    expect(hasNoMatchingResults([occupied], "available", { start: "10:00", end: "11:00" }, null)).toBe(true);
    expect(hasNoMatchingResults([occupied], "all", { start: "10:00", end: "11:00" }, null)).toBe(false);
  });

  it("is true when availability has not loaded yet", () => {
    expect(hasNoMatchingResults([], "available", null, null)).toBe(true);
  });
});

describe("isTimetableInitialLoad", () => {
  it("is true only while the first availability fetch is in flight", () => {
    expect(isTimetableInitialLoad(true, 0)).toBe(true);
    expect(isTimetableInitialLoad(true, 2)).toBe(false);
    expect(isTimetableInitialLoad(false, 0)).toBe(false);
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

  it("paints Available only on the Booking interval", () => {
    const blocks = displayBlocks(gym(), { start: "10:00", end: "11:30" });
    expect(blocks.filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:30", state: "available" },
    ]);
  });
});

describe("displayBlocksForCart", () => {
  it("paints When seed highlight on eligible rooms without adding cart lines", () => {
    const state = emptyCartState(whenSeed);
    expect(displayBlocksForCart(gym(), state).filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:00", state: "available", overlayKind: "whenSeed" },
    ]);
    expect(
      displayBlocksForCart(chapel(), { ...state, whenSeed: { start: "10:00", end: "13:00" } }).some(
        (block) => block.state === "available"
      )
    ).toBe(false);
  });

  it("keeps When seed on other rooms when one room is pinned", () => {
    const state = pinInterval(emptyCartState(whenSeed), gym(), "09:30");
    expect(displayBlocksForCart(chapel(), state).filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:00", state: "available", overlayKind: "whenSeed" },
    ]);
    expect(displayBlocksForCart(gym(), state).filter((block) => block.state === "available")).toEqual([
      { start: "09:30", end: "10:30", state: "available", overlayKind: "pinned" },
    ]);
  });

  it("paints hover preview while another room is pinned", () => {
    const state = pinInterval(emptyCartState(whenSeed), gym(), "09:30");
    const hover = { roomId: "chapel-id", cellStart: "10:00" };
    expect(displayBlocksForCart(chapel(), state, hover).filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:00", state: "available", overlayKind: "whenSeed" },
      { start: "10:00", end: "11:00", state: "available", overlayKind: "hover" },
    ]);
  });

  it("does not paint hover preview when the preview overlaps the pinned interval", () => {
    const state = pinInterval(emptyCartState(), gym(), "09:30");
    expect(
      displayBlocksForCart(gym(), state, { roomId: "gym-id", cellStart: "09:30" }).filter(
        (block) => block.state === "available"
      )
    ).toEqual([{ start: "09:30", end: "10:30", state: "available", overlayKind: "pinned" }]);
    expect(
      displayBlocksForCart(gym(), state, { roomId: "gym-id", cellStart: "10:00" }).filter(
        (block) => block.state === "available"
      )
    ).toEqual([{ start: "09:30", end: "10:30", state: "available", overlayKind: "pinned" }]);
  });

  it("hides When seed on a room that already has a pinned interval", () => {
    const state = pinInterval(emptyCartState(whenSeed), gym(), "09:30");
    expect(displayBlocksForCart(gym(), state).filter((block) => block.state === "available")).toEqual([
      { start: "09:30", end: "10:30", state: "available", overlayKind: "pinned" },
    ]);
  });

  it("paints hover preview outside the pinned interval on the same room", () => {
    const state = pinInterval(emptyCartState(), gym(), "09:30");
    expect(
      displayBlocksForCart(gym(), state, { roomId: "gym-id", cellStart: "14:00" }).filter(
        (block) => block.state === "available"
      )
    ).toEqual([
      { start: "09:30", end: "10:30", state: "available", overlayKind: "pinned" },
      { start: "14:00", end: "15:00", state: "available", overlayKind: "hover" },
    ]);
  });

  it("hides When seed on a room that already has a committed line (regression: repeated Back to Timetable)", () => {
    const state: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "10:00", end: "11:00", sequence: 1 }],
      pinned: null,
      whenSeed,
    };
    expect(displayBlocksForCart(gym(), state).filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:00", state: "available", overlayKind: "committed" },
    ]);
    expect(displayBlocksForCart(chapel(), state).filter((block) => block.state === "available")).toEqual([
      { start: "10:00", end: "11:00", state: "available", overlayKind: "whenSeed" },
    ]);
  });

  it("paints a committed overlay for each cart line regardless of pinned state", () => {
    const state: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "09:30", end: "10:30", sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    expect(displayBlocksForCart(gym(), state).filter((block) => block.state === "available")).toEqual([
      { start: "09:30", end: "10:30", state: "available", overlayKind: "committed" },
    ]);
  });

  it("paints committed and pinned overlays together for different intervals on the same room", () => {
    const state: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "09:30", end: "10:30", sequence: 1 }],
      pinned: { facilityId: "gym-id", start: "14:00", end: "15:00" },
      whenSeed: null,
    };
    expect(displayBlocksForCart(gym(), state).filter((block) => block.state === "available")).toEqual([
      { start: "09:30", end: "10:30", state: "available", overlayKind: "committed" },
      { start: "14:00", end: "15:00", state: "available", overlayKind: "pinned" },
    ]);
  });

  it("does not paint hover preview when it overlaps a committed line", () => {
    const state: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "09:30", end: "10:30", sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    expect(
      displayBlocksForCart(gym(), state, { roomId: "gym-id", cellStart: "09:30" }).filter(
        (block) => block.state === "available"
      )
    ).toEqual([{ start: "09:30", end: "10:30", state: "available", overlayKind: "committed" }]);
  });
});

describe("Timetable checkmark reflects cart membership, not the pinned interval (regression #84)", () => {
  it("keeps the checkmark once Confirm Booking Time clears the pinned interval", () => {
    const pinnedState = pinInterval(emptyCartState(), gym(), "09:30");
    const confirmed = addCartLine(pinnedState, { facilityId: "gym-id", start: "09:30", end: "10:30" });
    expect(confirmed).not.toBeNull();
    const state = confirmed!;

    expect(state.pinned).toBeNull();

    const blocks = displayBlocksForCart(gym(), state).filter((block) => block.state === "available");
    expect(blocks).toEqual([{ start: "09:30", end: "10:30", state: "available", overlayKind: "committed" }]);
    expect(blockActionForInterval(state.lines, "gym-id", blocks[0])).toBe("checkmark");
  });

  it("keeps another interval in the same room's column hoverable, pinnable, and ADD-eligible", () => {
    const withLine: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "09:30", end: "10:30", sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    expect(isBookableCellForCart(gym(), "14:00", withLine)).toBe(true);

    const nowPinned = pinInterval(withLine, gym(), "14:00");
    const blocks = displayBlocksForCart(gym(), nowPinned).filter((block) => block.state === "available");
    expect(blocks).toEqual([
      { start: "09:30", end: "10:30", state: "available", overlayKind: "committed" },
      { start: "14:00", end: "15:00", state: "available", overlayKind: "pinned" },
    ]);
    expect(blockActionForInterval(nowPinned.lines, "gym-id", { start: "14:00", end: "15:00" })).toBe("add");
  });

  it("restores ADD on the block once the matching line is removed from the cart", () => {
    const state: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "09:30", end: "10:30", sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    const afterRemove = removeCartLine(state, 1);
    const blocks = displayBlocksForCart(gym(), afterRemove).filter((block) => block.state === "available");
    expect(blocks.some((block) => block.overlayKind === "committed")).toBe(false);
    expect(blockActionForInterval(afterRemove.lines, "gym-id", { start: "09:30", end: "10:30" })).toBe("add");
  });

  it("moves the checkmark to the new interval and clears the old one when a line is edited", () => {
    const state: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "09:30", end: "10:30", sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    const edited = updateCartLine(state, 1, { facilityId: "gym-id", start: "11:00", end: "12:00" });
    expect(edited).not.toBeNull();
    const nextState = edited!;

    const blocks = displayBlocksForCart(gym(), nextState).filter((block) => block.state === "available");
    expect(blocks).toEqual([{ start: "11:00", end: "12:00", state: "available", overlayKind: "committed" }]);
    expect(blockActionForInterval(nextState.lines, "gym-id", blocks[0])).toBe("checkmark");
  });

  it("blocks re-pinning a cell already covered by a committed line, preventing a duplicate overlay", () => {
    const state: TimetableCartState = {
      lines: [{ facilityId: "gym-id", start: "09:30", end: "10:30", sequence: 1 }],
      pinned: null,
      whenSeed: null,
    };
    expect(isBookableCellForCart(gym(), "09:30", state)).toBe(false);
    expect(isBookableCellForCart(gym(), "10:00", state)).toBe(false);
    expect(isBookableCellForCart(gym(), "14:00", state)).toBe(true);
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
});

describe("scrollTargetClockForCart", () => {
  it("prefers When seed start over pinned and earliest open Slot", () => {
    const pinned = { facilityId: "gym-id", start: "09:30", end: "10:30" };
    expect(scrollTargetClockForCart([gym(), chapel()], whenSeed, pinned)).toBe("10:00");
  });

  it("uses pinned start when When seed is absent", () => {
    const pinned = { facilityId: "gym-id", start: "09:30", end: "10:30" };
    expect(scrollTargetClockForCart([gym(), chapel()], null, pinned)).toBe("09:30");
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
  });
});

describe("cartPointerAction", () => {
  const gymSlot = { roomId: "gym-id", cellStart: "09:30" };

  it("commits a mouse pointer without a prior preview", () => {
    expect(cartPointerAction(null, "mouse", null, gymSlot)).toBe("commit");
  });

  it("previews the first touch on a cell and commits the second tap on the same cell", () => {
    expect(cartPointerAction(null, "touch", null, gymSlot)).toBe("preview");
    expect(cartPointerAction(null, "touch", gymSlot, gymSlot)).toBe("commit");
  });

  it("commits when a room is already pinned", () => {
    expect(
      cartPointerAction({ facilityId: "gym-id", start: "09:30", end: "10:30" }, "touch", null, {
        roomId: "gym-id",
        cellStart: "10:00",
      })
    ).toBe("commit");
  });
});

describe("toggleRepeatedRoomSelection", () => {
  const shared = { start: "10:00", end: "11:00" };

  it("selects a room that can cover the locked shared window", () => {
    expect(toggleRepeatedRoomSelection([], gym().id, [gym(), chapel()], shared, 3)).toEqual(["gym-id"]);
  });

  it("deselects a room that is already selected", () => {
    expect(toggleRepeatedRoomSelection(["gym-id"], gym().id, [gym()], shared, 3)).toEqual([]);
  });

  it("does not select a room that cannot cover the locked window", () => {
    expect(toggleRepeatedRoomSelection([], chapel().id, [chapel()], { start: "13:00", end: "14:00" }, 3)).toEqual([]);
  });

  it("does not produce a Pinned interval or Booking cart line", () => {
    const selected = toggleRepeatedRoomSelection([], gym().id, [gym()], shared, 3);
    expect(selected).toEqual(["gym-id"]);
    expect(selected).not.toHaveProperty("pinned");
    expect(selected).not.toHaveProperty("lines");
  });

  it("stops at the Booking line cap", () => {
    expect(toggleRepeatedRoomSelection(["gym-id"], chapel().id, [gym(), chapel()], shared, 1)).toEqual(["gym-id"]);
  });
});

describe("retainValidRepeatedRoomIds", () => {
  it("keeps rooms that still cover the current locked window", () => {
    expect(
      retainValidRepeatedRoomIds(["gym-id", "chapel-id"], [gym(), chapel()], { start: "10:00", end: "11:00" })
    ).toEqual(["gym-id", "chapel-id"]);
  });

  it("drops rooms that are no longer valid for the current proposal", () => {
    expect(
      retainValidRepeatedRoomIds(["gym-id", "chapel-id"], [gym(), chapel()], { start: "13:00", end: "14:00" })
    ).toEqual(["gym-id"]);
  });

  it("drops every selection when the shared window is missing", () => {
    expect(retainValidRepeatedRoomIds(["gym-id"], [gym()], null)).toEqual([]);
  });
});

describe("isRepeatedRoomSelectable", () => {
  it("follows the same coverage rule as One-time availability for that interval", () => {
    expect(isRepeatedRoomSelectable(gym(), { start: "10:00", end: "11:00" })).toBe(true);
    expect(isRepeatedRoomSelectable(chapel(), { start: "13:00", end: "14:00" })).toBe(false);
  });
});

describe("confirmRepeatedCartLine", () => {
  const firstInterval = { facilityId: "gym-id", start: "10:00", end: "11:00" };
  const emptyRepeated = (): RepeatedCartState => ({ ...emptyCartState(), sharedTime: null });

  it("locks shared time on the first confirmed interval", () => {
    const result = confirmRepeatedCartLine(emptyRepeated(), firstInterval, 3);
    expect(result.decision).toBe("added");
    expect(result.state.sharedTime).toEqual({ start: "10:00", end: "11:00" });
    expect(result.state.lines).toEqual([{ facilityId: "gym-id", start: "10:00", end: "11:00", sequence: 1 }]);
  });

  it("adds another room at the same shared time", () => {
    const locked = confirmRepeatedCartLine(emptyRepeated(), firstInterval, 3).state;
    const result = confirmRepeatedCartLine(locked, { facilityId: "chapel-id", start: "10:00", end: "11:00" }, 3);
    expect(result.decision).toBe("added");
    expect(result.state.sharedTime).toEqual({ start: "10:00", end: "11:00" });
    expect(result.state.lines.map((line) => line.facilityId)).toEqual(["gym-id", "chapel-id"]);
  });

  it("asks to replace time; cancelling that decision leaves rooms and shared time unchanged", () => {
    const locked = confirmRepeatedCartLine(emptyRepeated(), firstInterval, 3).state;
    const result = confirmRepeatedCartLine(locked, { facilityId: "gym-id", start: "13:00", end: "14:00" }, 3);
    expect(result.decision).toBe("replace");
    expect(result.state.lines).toHaveLength(1);
    expect(result.state.sharedTime).toEqual({ start: "10:00", end: "11:00" });
  });
});

describe("applyRepeatedTimeReplacement", () => {
  it("clears every room and previewable selection before locking the new time", () => {
    const emptyRepeated = (): RepeatedCartState => ({ ...emptyCartState(), sharedTime: null });
    const locked = confirmRepeatedCartLine(
      emptyRepeated(),
      { facilityId: "gym-id", start: "10:00", end: "11:00" },
      3
    ).state;
    const withChapel = confirmRepeatedCartLine(
      locked,
      { facilityId: "chapel-id", start: "10:00", end: "11:00" },
      3
    ).state;
    const replaced = applyRepeatedTimeReplacement(
      { ...withChapel, pinned: { facilityId: "gym-id", start: "13:00", end: "14:00" } },
      { facilityId: "gym-id", start: "13:00", end: "14:00" },
      3
    );
    expect(replaced.decision).toBe("added");
    expect(replaced.state.sharedTime).toEqual({ start: "13:00", end: "14:00" });
    expect(replaced.state.lines).toEqual([{ facilityId: "gym-id", start: "13:00", end: "14:00", sequence: 1 }]);
    expect(replaced.state.pinned).toBeNull();
  });
});

describe("removeRepeatedCartLine", () => {
  it("removes one room and keeps the shared time", () => {
    const emptyRepeated = (): RepeatedCartState => ({ ...emptyCartState(), sharedTime: null });
    let state = confirmRepeatedCartLine(
      emptyRepeated(),
      { facilityId: "gym-id", start: "10:00", end: "11:00" },
      3
    ).state;
    state = confirmRepeatedCartLine(state, { facilityId: "chapel-id", start: "10:00", end: "11:00" }, 3).state;
    const next = removeRepeatedCartLine(state, 1);
    expect(next.lines.map((line) => line.facilityId)).toEqual(["chapel-id"]);
    expect(next.sharedTime).toEqual({ start: "10:00", end: "11:00" });
  });
});

describe("repeatedCartLineTime", () => {
  it("presents every Repeated cart row with the shared time, not a per-room interval", () => {
    const state: RepeatedCartState = {
      ...emptyCartState(),
      sharedTime: { start: "10:00", end: "11:00" },
      lines: [{ facilityId: "gym-id", start: "10:00", end: "11:00", sequence: 1 }],
    };
    expect(repeatedCartLineTime(state, state.lines[0])).toEqual({ start: "10:00", end: "11:00" });
  });
});
