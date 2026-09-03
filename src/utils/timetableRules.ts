export const SLOT_MINUTES = 30;
export const MAX_BOOKING_LINES = 3;

export type CellState = "available" | "unavailable" | "closed" | "override";

export type TimetableView = "available" | "all";

export type CapacityBand = "1-10" | "10-25" | "25-50" | "50+";

export type BlockAction = "add" | "checkmark";

export interface TimeRange {
  start: string;
  end: string;
}

export interface TimeCell extends TimeRange {
  state: CellState;
}

export interface RoomTemplateWindow extends TimeRange {
  slotDurationMinutes: number;
}

export interface RoomDay {
  id: string;
  code: string;
  name: string;
  capacity: number;
  photoUrls: string[];
  templates: RoomTemplateWindow[];
  cells: TimeCell[];
}

export type BookingInterval = TimeRange;

export type WhenSeedRange = TimeRange;

export interface BookingLine extends TimeRange {
  facilityId: string;
  sequence: number;
  lineSubtotal?: string | number | null;
  currency?: string | null;
}

export interface PinnedInterval extends TimeRange {
  facilityId: string;
}

export interface TimetableCartState {
  lines: BookingLine[];
  pinned: PinnedInterval | null;
  whenSeed: WhenSeedRange | null;
}

export const emptyCartState = (whenSeed: WhenSeedRange | null = null): TimetableCartState => ({
  lines: [],
  pinned: null,
  whenSeed,
});

export const clockToMinutes = (clock: string): number => {
  if (clock === "24:00") {
    return 24 * 60;
  }
  const [hours, minutes] = clock.split(":").map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
};

export const minutesToClock = (totalMinutes: number): string => {
  if (totalMinutes >= 24 * 60) {
    return "24:00";
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const intervalLengthMinutes = (interval: TimeRange): number => {
  return clockToMinutes(interval.end) - clockToMinutes(interval.start);
};

export const intervalStaysOnSameDay = (interval: TimeRange): boolean => {
  const startMinutes = clockToMinutes(interval.start);
  const endMinutes = clockToMinutes(interval.end);
  return startMinutes >= 0 && endMinutes > startMinutes && endMinutes <= 24 * 60;
};

export const durationForRoom = (room: RoomDay, atStart?: string): number => {
  if (atStart) {
    const startMinutes = clockToMinutes(atStart);
    const covering = room.templates.find((window) => {
      return clockToMinutes(window.start) <= startMinutes && startMinutes < clockToMinutes(window.end);
    });
    if (covering) {
      return covering.slotDurationMinutes;
    }
  }
  return room.templates[0]?.slotDurationMinutes ?? 0;
};

const cellsInRange = (room: RoomDay, start: string, end: string): TimeCell[] => {
  const startMinutes = clockToMinutes(start);
  const endMinutes = clockToMinutes(end);
  return room.cells.filter((cell) => {
    const cellStart = clockToMinutes(cell.start);
    return cellStart >= startMinutes && cellStart < endMinutes;
  });
};

export const emptyTimeBookInterval = (room: RoomDay, cellStart: string): BookingInterval | null => {
  const duration = durationForRoom(room, cellStart);
  if (duration <= 0) {
    return null;
  }
  const endMinutes = clockToMinutes(cellStart) + duration;
  if (endMinutes > 24 * 60) {
    return null;
  }
  const interval: BookingInterval = { start: cellStart, end: minutesToClock(endMinutes) };
  const cells = cellsInRange(room, interval.start, interval.end);
  const coveredMinutes = cells.reduce((sum, cell) => sum + (clockToMinutes(cell.end) - clockToMinutes(cell.start)), 0);
  if (coveredMinutes < duration || cells.some((cell) => cell.state !== "available")) {
    return null;
  }
  return interval;
};

export const isRoomAvailable = (room: RoomDay, interval: BookingInterval | null): boolean => {
  if (!interval) {
    return room.cells.some((cell) => cell.state === "available" && emptyTimeBookInterval(room, cell.start) != null);
  }
  const duration = durationForRoom(room, interval.start);
  if (intervalLengthMinutes(interval) < duration) {
    return false;
  }
  const cells = cellsInRange(room, interval.start, interval.end);
  const coveredMinutes = cells.reduce((sum, cell) => sum + (clockToMinutes(cell.end) - clockToMinutes(cell.start)), 0);
  if (coveredMinutes < intervalLengthMinutes(interval) || cells.some((cell) => cell.state !== "available")) {
    return false;
  }
  return true;
};

export const isCellInInterval = (cellStart: string, interval: TimeRange): boolean => {
  const startMinutes = clockToMinutes(interval.start);
  const endMinutes = clockToMinutes(interval.end);
  const cellMinutes = clockToMinutes(cellStart);
  return cellMinutes >= startMinutes && cellMinutes < endMinutes;
};

export const isBookableCell = (room: RoomDay, cellStart: string, interval: BookingInterval | null): boolean => {
  if (interval && isCellInInterval(cellStart, interval) && isRoomAvailable(room, interval)) {
    return true;
  }
  return emptyTimeBookInterval(room, cellStart) != null;
};

export const isBookableCellForCart = (room: RoomDay, cellStart: string, pinned: PinnedInterval | null): boolean => {
  if (pinned?.facilityId === room.id && isCellInInterval(cellStart, pinned) && isRoomAvailable(room, pinned)) {
    return true;
  }
  return emptyTimeBookInterval(room, cellStart) != null;
};

export const isWhenSeedEligible = (room: RoomDay, whenSeed: WhenSeedRange | null): boolean => {
  if (!whenSeed) {
    return false;
  }
  return isRoomAvailable(room, whenSeed);
};

export const lineIdentityKey = (line: Pick<BookingLine, "facilityId" | "start" | "end">): string => {
  return `${line.facilityId}\0${line.start}\0${line.end}`;
};

export const intervalsMatch = (left: TimeRange, right: TimeRange): boolean => {
  return left.start === right.start && left.end === right.end;
};

export const intervalsOverlap = (left: TimeRange, right: TimeRange): boolean => {
  return (
    clockToMinutes(left.start) < clockToMinutes(right.end) && clockToMinutes(right.start) < clockToMinutes(left.end)
  );
};

export const hasDuplicateLine = (
  lines: BookingLine[],
  candidate: Pick<BookingLine, "facilityId" | "start" | "end">
): boolean => {
  const key = lineIdentityKey(candidate);
  return lines.some((line) => lineIdentityKey(line) === key);
};

export const nextLineSequence = (lines: BookingLine[]): number => {
  if (lines.length === 0) {
    return 1;
  }
  return Math.max(...lines.map((line) => line.sequence)) + 1;
};

export const canAddCartLine = (
  state: TimetableCartState,
  line: Pick<BookingLine, "facilityId" | "start" | "end">
): boolean => {
  if (state.lines.length >= MAX_BOOKING_LINES) {
    return false;
  }
  if (hasDuplicateLine(state.lines, line)) {
    return false;
  }
  return intervalStaysOnSameDay(line);
};

export const pinInterval = (state: TimetableCartState, room: RoomDay, cellStart: string): TimetableCartState => {
  const interval = emptyTimeBookInterval(room, cellStart);
  if (!interval) {
    return state;
  }
  return {
    ...state,
    pinned: {
      facilityId: room.id,
      start: interval.start,
      end: interval.end,
    },
  };
};

export const pinnedIntervalForRoom = (state: TimetableCartState, facilityId: string): BookingInterval | null => {
  if (state.pinned?.facilityId !== facilityId) {
    return null;
  }
  return { start: state.pinned.start, end: state.pinned.end };
};

export const addCartLine = (
  state: TimetableCartState,
  line: Pick<BookingLine, "facilityId" | "start" | "end">
): TimetableCartState | null => {
  if (!canAddCartLine(state, line)) {
    return null;
  }
  const nextLine: BookingLine = {
    facilityId: line.facilityId,
    start: line.start,
    end: line.end,
    sequence: nextLineSequence(state.lines),
  };
  return {
    ...state,
    lines: [...state.lines, nextLine].sort((left, right) => left.sequence - right.sequence),
    pinned: state.pinned?.facilityId === line.facilityId ? null : state.pinned,
  };
};

export const updateCartLine = (
  state: TimetableCartState,
  sequence: number,
  line: Pick<BookingLine, "facilityId" | "start" | "end">
): TimetableCartState | null => {
  const existing = state.lines.find((item) => item.sequence === sequence);
  if (!existing) {
    return null;
  }
  const without = state.lines.filter((item) => item.sequence !== sequence);
  if (hasDuplicateLine(without, line)) {
    return null;
  }
  if (!intervalStaysOnSameDay(line)) {
    return null;
  }
  const updated: BookingLine = {
    facilityId: line.facilityId,
    start: line.start,
    end: line.end,
    sequence,
    lineSubtotal: undefined,
    currency: undefined,
  };
  return {
    ...state,
    lines: [...without, updated].sort((left, right) => left.sequence - right.sequence),
  };
};

export const removeCartLine = (state: TimetableCartState, sequence: number): TimetableCartState => {
  return {
    ...state,
    lines: state.lines.filter((line) => line.sequence !== sequence),
  };
};

export const setCartLineQuote = (
  state: TimetableCartState,
  sequence: number,
  lineSubtotal: string | number | null,
  currency: string | null
): TimetableCartState => {
  return {
    ...state,
    lines: state.lines.map((line) => (line.sequence === sequence ? { ...line, lineSubtotal, currency } : line)),
  };
};

export const findCartLineByIdentity = (
  lines: BookingLine[],
  facilityId: string,
  interval: TimeRange
): BookingLine | undefined => {
  return lines.find((line) => line.facilityId === facilityId && intervalsMatch(line, interval));
};

export const blockActionForInterval = (lines: BookingLine[], facilityId: string, interval: TimeRange): BlockAction => {
  if (findCartLineByIdentity(lines, facilityId, interval)) {
    return "checkmark";
  }
  return "add";
};

export const canReviewCart = (state: TimetableCartState): boolean => {
  return state.lines.length > 0;
};

export const confirmBookingTimePrefill = (
  room: RoomDay,
  cellStart: string,
  existing: BookingInterval | null
): BookingInterval | null => {
  if (existing) {
    return existing;
  }
  return emptyTimeBookInterval(room, cellStart);
};

export const confirmBookingTimePrefillForCart = (
  room: RoomDay,
  state: TimetableCartState,
  cellStart: string,
  editingSequence?: number
): BookingInterval | null => {
  if (editingSequence != null) {
    const editing = state.lines.find((line) => line.sequence === editingSequence);
    if (editing) {
      return { start: editing.start, end: editing.end };
    }
  }
  const pinned = pinnedIntervalForRoom(state, room.id);
  if (pinned) {
    return pinned;
  }
  return emptyTimeBookInterval(room, cellStart);
};

export const canConfirmBookingTime = (room: RoomDay, interval: BookingInterval | null): boolean => {
  if (!interval) {
    return false;
  }
  if (clockToMinutes(interval.end) <= clockToMinutes(interval.start)) {
    return false;
  }
  return isRoomAvailable(room, interval);
};

export const capacityBandFor = (capacity: number): CapacityBand | null => {
  if (capacity >= 1 && capacity <= 10) {
    return "1-10";
  }
  if (capacity > 10 && capacity <= 25) {
    return "10-25";
  }
  if (capacity > 25 && capacity <= 50) {
    return "25-50";
  }
  if (capacity > 50) {
    return "50+";
  }
  return null;
};

export const matchesCapacityBand = (room: RoomDay, band: CapacityBand | null): boolean => {
  if (!band) {
    return true;
  }
  return capacityBandFor(room.capacity) === band;
};

export const visibleRooms = (
  rooms: RoomDay[],
  view: TimetableView,
  interval: BookingInterval | null,
  band: CapacityBand | null
): RoomDay[] => {
  const filtered = rooms.filter((room) => matchesCapacityBand(room, band));
  if (view === "all") {
    return filtered;
  }
  return filtered.filter((room) => isRoomAvailable(room, interval));
};

export const hasNoMatchingResults = (
  rooms: RoomDay[],
  view: TimetableView,
  interval: BookingInterval | null,
  band: CapacityBand | null
): boolean => {
  return view === "available" && visibleRooms(rooms, view, interval, band).length === 0;
};

export const isTimetableInitialLoad = (loading: boolean, roomCount: number): boolean => {
  return loading && roomCount === 0;
};

export const scrollTargetClock = (rooms: RoomDay[], interval: BookingInterval | null): string => {
  if (interval) {
    return interval.start;
  }
  let earliest = Number.POSITIVE_INFINITY;
  for (const room of rooms) {
    for (const cell of room.cells) {
      if (cell.state !== "closed") {
        earliest = Math.min(earliest, clockToMinutes(cell.start));
      }
    }
  }
  if (!Number.isFinite(earliest)) {
    return "00:00";
  }
  return minutesToClock(earliest);
};

export const scrollTargetClockForCart = (
  rooms: RoomDay[],
  whenSeed: WhenSeedRange | null,
  pinned: PinnedInterval | null
): string => {
  if (whenSeed) {
    return whenSeed.start;
  }
  if (pinned) {
    return pinned.start;
  }
  return scrollTargetClock(rooms, null);
};

export interface HoverPreview {
  roomId: string;
  cellStart: string;
}

export type PointerKind = "mouse" | "touch";

export const emptyTimePointerAction = (
  interval: BookingInterval | null,
  pointerKind: PointerKind,
  hover: HoverPreview | null,
  target: HoverPreview
): "preview" | "commit" => {
  if (interval != null || pointerKind === "mouse") {
    return "commit";
  }
  if (hover?.roomId === target.roomId && hover.cellStart === target.cellStart) {
    return "commit";
  }
  return "preview";
};

export const cartPointerAction = (
  pinned: PinnedInterval | null,
  pointerKind: PointerKind,
  hover: HoverPreview | null,
  target: HoverPreview
): "preview" | "commit" => {
  if (pinned != null || pointerKind === "mouse") {
    return "commit";
  }
  if (hover?.roomId === target.roomId && hover.cellStart === target.cellStart) {
    return "commit";
  }
  return "preview";
};

export interface CellBlock extends TimeRange {
  state: CellState;
}

export type AvailableOverlayKind = "whenSeed" | "pinned" | "hover";

export interface TimetableDisplayBlock extends CellBlock {
  overlayKind?: AvailableOverlayKind;
}

export const contiguousBlocks = (room: RoomDay): CellBlock[] => {
  const blocks: CellBlock[] = [];
  for (const cell of room.cells) {
    const last = blocks[blocks.length - 1];
    if (last && last.state === cell.state) {
      last.end = cell.end;
    } else {
      blocks.push({ start: cell.start, end: cell.end, state: cell.state });
    }
  }
  return blocks;
};

export const displayBlocks = (
  room: RoomDay,
  interval: BookingInterval | null,
  hover: HoverPreview | null = null
): CellBlock[] => {
  const occupied = contiguousBlocks(room).filter(
    (block) => block.state === "unavailable" || block.state === "override"
  );
  if (interval && isRoomAvailable(room, interval)) {
    return [...occupied, { start: interval.start, end: interval.end, state: "available" }];
  }
  if (!interval && hover?.roomId === room.id) {
    const preview = emptyTimeBookInterval(room, hover.cellStart);
    if (preview) {
      return [...occupied, { start: preview.start, end: preview.end, state: "available" }];
    }
  }
  return occupied;
};

export const displayBlocksForCart = (
  room: RoomDay,
  state: TimetableCartState,
  hover: HoverPreview | null = null
): TimetableDisplayBlock[] => {
  const occupied = contiguousBlocks(room).filter(
    (block) => block.state === "unavailable" || block.state === "override"
  );
  const overlays: TimetableDisplayBlock[] = [];

  const pinned = pinnedIntervalForRoom(state, room.id);
  if (isWhenSeedEligible(room, state.whenSeed) && state.whenSeed && !pinned) {
    overlays.push({
      start: state.whenSeed.start,
      end: state.whenSeed.end,
      state: "available",
      overlayKind: "whenSeed",
    });
  }

  if (pinned && isRoomAvailable(room, pinned)) {
    overlays.push({ start: pinned.start, end: pinned.end, state: "available", overlayKind: "pinned" });
  }

  if (hover?.roomId === room.id) {
    const preview = emptyTimeBookInterval(room, hover.cellStart);
    if (preview && !(pinned && intervalsOverlap(preview, pinned))) {
      overlays.push({ start: preview.start, end: preview.end, state: "available", overlayKind: "hover" });
    }
  }

  return [...occupied, ...overlays];
};
