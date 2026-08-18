export const SLOT_MINUTES = 30;
export const MAX_SELECTED_ROOMS = 3;

export type CellState = "available" | "unavailable" | "closed" | "override";

export type TimetableView = "available" | "all";

export type CapacityBand = "1-10" | "10-25" | "25-50" | "50+";

export type RoomsSpace = "single" | "multiple";

export type RoomShortcutCode = "gym" | "sanctuary-hall";

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
  templates: RoomTemplateWindow[];
  cells: TimeCell[];
}

export interface BookingInterval {
  start: string;
  end: string;
}

export interface TimetableSelection {
  roomIds: string[];
  interval: BookingInterval | null;
}

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

export const intervalLengthMinutes = (interval: BookingInterval): number => {
  return clockToMinutes(interval.end) - clockToMinutes(interval.start);
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

const isCellInInterval = (cellStart: string, interval: BookingInterval): boolean => {
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

export const bookRoom = (selection: TimetableSelection, room: RoomDay, cellStart: string, space: RoomsSpace): TimetableSelection => {
  const current = selection.interval;
  if (current && isCellInInterval(cellStart, current) && isRoomAvailable(room, current)) {
    if (space === "single") {
      return { roomIds: [room.id], interval: current };
    }
    if (selection.roomIds.includes(room.id)) {
      return selection;
    }
    if (selection.roomIds.length >= MAX_SELECTED_ROOMS) {
      return selection;
    }
    return { roomIds: [...selection.roomIds, room.id], interval: current };
  }

  const nextInterval = emptyTimeBookInterval(room, cellStart);
  if (!nextInterval) {
    return selection;
  }
  return { roomIds: [room.id], interval: nextInterval };
};

export const canReviewBooking = (selection: TimetableSelection): boolean => {
  return selection.roomIds.length > 0 && selection.interval != null;
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

export const matchesRoomShortcut = (room: RoomDay, shortcut: RoomShortcutCode | undefined): boolean => {
  if (!shortcut) {
    return true;
  }
  return room.code === shortcut;
};

export const visibleRooms = (
  rooms: RoomDay[],
  view: TimetableView,
  interval: BookingInterval | null,
  band: CapacityBand | null,
  shortcut: RoomShortcutCode | undefined,
): RoomDay[] => {
  const filtered = rooms.filter((room) => matchesCapacityBand(room, band) && matchesRoomShortcut(room, shortcut));
  if (view === "all") {
    return filtered;
  }
  return filtered.filter((room) => isRoomAvailable(room, interval));
};

export const hasNoMatchingResults = (
  rooms: RoomDay[],
  view: TimetableView,
  interval: BookingInterval | null,
  band: CapacityBand | null,
  shortcut: RoomShortcutCode | undefined,
): boolean => {
  return view === "available" && visibleRooms(rooms, view, interval, band, shortcut).length === 0;
};

export const clearUnconfirmedSelection = (selection: TimetableSelection): TimetableSelection => {
  return { roomIds: [], interval: selection.interval };
};

export const removeSelectedRoom = (selection: TimetableSelection, roomId: string): TimetableSelection => {
  return { ...selection, roomIds: selection.roomIds.filter((id) => id !== roomId) };
};

export interface CellBlock extends TimeRange {
  state: CellState;
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
