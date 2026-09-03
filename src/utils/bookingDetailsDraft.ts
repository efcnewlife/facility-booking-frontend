import type { PreviewQuotePayload } from "@/api/services/facilityService";

import { combineDateAndClock } from "./bookingDateTime";
import type { BookingCartDraft, BookingLineDraft } from "./bookingCartDraft";
import { clockToMinutes, isRoomAvailable, MAX_BOOKING_LINES, type RoomDay } from "./timetableRules";

export interface CreateBookingFromDraftPayload {
  startAt: string;
  endAt: string;
  ministryId?: string | null;
  isMissionAligned?: boolean;
  rooms: Array<{
    facilityId: string;
    startAt: string;
    endAt: string;
    sequence: number;
  }>;
}

export const lineCoversAvailability = (rooms: RoomDay[], line: BookingLineDraft): boolean => {
  const room = rooms.find((item) => item.id === line.facilityId);
  if (!room) {
    return false;
  }
  return isRoomAvailable(room, { start: line.start, end: line.end });
};

export const allLinesCoverAvailability = (rooms: RoomDay[], draft: BookingCartDraft): boolean => {
  return draft.lines.every((line) => lineCoversAvailability(rooms, line));
};

export const envelopeClocks = (lines: BookingLineDraft[]): { start: string; end: string } => {
  let minStart = lines[0].start;
  let maxEnd = lines[0].end;
  for (const line of lines.slice(1)) {
    if (clockToMinutes(line.start) < clockToMinutes(minStart)) {
      minStart = line.start;
    }
    if (clockToMinutes(line.end) > clockToMinutes(maxEnd)) {
      maxEnd = line.end;
    }
  }
  return { start: minStart, end: maxEnd };
};

export const buildPreviewQuotePayload = (draft: BookingCartDraft): PreviewQuotePayload => ({
  ministryId: draft.ministryId || null,
  isMissionAligned: Boolean(draft.ministryId),
  lines: draft.lines.map((line) => ({
    facilityId: line.facilityId,
    startAt: combineDateAndClock(draft.date, line.start),
    endAt: combineDateAndClock(draft.date, line.end),
  })),
});

export const buildCreateBookingPayload = (draft: BookingCartDraft): CreateBookingFromDraftPayload => {
  const envelope = envelopeClocks(draft.lines);
  return {
    startAt: combineDateAndClock(draft.date, envelope.start),
    endAt: combineDateAndClock(draft.date, envelope.end),
    ministryId: draft.ministryId || null,
    isMissionAligned: Boolean(draft.ministryId),
    rooms: draft.lines.map((line) => ({
      facilityId: line.facilityId,
      startAt: combineDateAndClock(draft.date, line.start),
      endAt: combineDateAndClock(draft.date, line.end),
      sequence: line.sequence,
    })),
  };
};

export const removeLineFromDraft = (draft: BookingCartDraft, sequence: number): BookingCartDraft | null => {
  const lines = draft.lines.filter((line) => line.sequence !== sequence);
  if (lines.length === 0) {
    return null;
  }
  return { ...draft, lines };
};

export const canAddRoomToDraft = (draft: BookingCartDraft): boolean => {
  return draft.lines.length < MAX_BOOKING_LINES;
};
