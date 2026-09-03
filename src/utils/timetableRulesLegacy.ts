import {
  MAX_BOOKING_LINES,
  emptyTimeBookInterval,
  isCellInInterval,
  isRoomAvailable,
  matchesCapacityBand,
  type BookingInterval,
  type CapacityBand,
  type RoomDay,
  type TimetableView,
} from "./timetableRules";

/** @deprecated Retired with Timetable cart; kept for legacy Timetable UI until #72. */
export type RoomsSpace = "single" | "multiple";

/** @deprecated Retired room shortcut filter; kept for legacy Timetable UI until #72. */
export type RoomShortcutCode = "gym" | "sanctuary-hall";

/** @deprecated Shared Booking interval selection; use TimetableCartState instead. */
export interface TimetableSelection {
  roomIds: string[];
  interval: BookingInterval | null;
}

/** @deprecated Use MAX_BOOKING_LINES from timetableRules. */
export const MAX_SELECTED_ROOMS = MAX_BOOKING_LINES;

export const matchesRoomShortcut = (room: RoomDay, shortcut: RoomShortcutCode | undefined): boolean => {
  if (!shortcut) {
    return true;
  }
  return room.code === shortcut;
};

export const bookRoom = (
  selection: TimetableSelection,
  room: RoomDay,
  cellStart: string,
  space: RoomsSpace
): TimetableSelection => {
  const current = selection.interval;
  if (current && isCellInInterval(cellStart, current) && isRoomAvailable(room, current)) {
    if (space === "single") {
      return { roomIds: [room.id], interval: current };
    }
    if (selection.roomIds.includes(room.id)) {
      return selection;
    }
    if (selection.roomIds.length >= MAX_BOOKING_LINES) {
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

export const clearUnconfirmedSelection = (selection: TimetableSelection): TimetableSelection => {
  return { roomIds: [], interval: selection.interval };
};

export const removeSelectedRoom = (selection: TimetableSelection, roomId: string): TimetableSelection => {
  return { ...selection, roomIds: selection.roomIds.filter((id) => id !== roomId) };
};

export const visibleRoomsLegacy = (
  rooms: RoomDay[],
  view: TimetableView,
  interval: BookingInterval | null,
  band: CapacityBand | null,
  shortcut: RoomShortcutCode | undefined
): RoomDay[] => {
  const filtered = rooms.filter((room) => matchesCapacityBand(room, band) && matchesRoomShortcut(room, shortcut));
  if (view === "all") {
    return filtered;
  }
  return filtered.filter((room) => isRoomAvailable(room, interval));
};

export const hasNoMatchingResultsLegacy = (
  rooms: RoomDay[],
  view: TimetableView,
  interval: BookingInterval | null,
  band: CapacityBand | null,
  shortcut: RoomShortcutCode | undefined
): boolean => {
  return view === "available" && visibleRoomsLegacy(rooms, view, interval, band, shortcut).length === 0;
};
