import type {
  BookingDraftDetail,
  CreateBookingDraftPayload,
  PreviewQuotePayload,
} from "@/api/services/facilityService";

import { clockFromDateTime, combineDateAndClock } from "./bookingDateTime";
import { normalizeBookingTitle } from "./bookingTitle";
import type { BookingCartDraft, BookingLineDraft } from "./bookingCartDraft";
import { clockToMinutes, isRoomAvailable, MAX_BOOKING_LINES, type RoomDay } from "./timetableRules";

export interface CreateBookingFromDraftPayload {
  title: string;
  startAt: string;
  endAt: string;
  ministryId?: string | null;
  rooms: Array<{
    facilityId: string;
    startAt: string;
    endAt: string;
    sequence: number;
  }>;
  bookingDraftId?: string | null;
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

const mapDraftLineToInterval = (
  date: string,
  line: BookingLineDraft
): { facilityId: string; startAt: string; endAt: string; sequence: number } => ({
  facilityId: line.facilityId,
  startAt: combineDateAndClock(date, line.start),
  endAt: combineDateAndClock(date, line.end),
  sequence: line.sequence,
});

export const buildPreviewQuotePayload = (draft: BookingCartDraft): PreviewQuotePayload => ({
  ministryId: draft.ministryId || null,
  lines: draft.lines.map((line) => mapDraftLineToInterval(draft.date, line)),
});

export const buildCreateBookingPayload = (
  draft: BookingCartDraft,
  title: string,
  bookingDraftId?: string | null
): CreateBookingFromDraftPayload => {
  const envelope = envelopeClocks(draft.lines);
  return {
    title: normalizeBookingTitle(title),
    startAt: combineDateAndClock(draft.date, envelope.start),
    endAt: combineDateAndClock(draft.date, envelope.end),
    ministryId: draft.ministryId || null,
    rooms: draft.lines.map((line) => mapDraftLineToInterval(draft.date, line)),
    bookingDraftId: bookingDraftId || null,
  };
};

export const buildCreateBookingDraftPayload = (draft: BookingCartDraft): CreateBookingDraftPayload => ({
  title: normalizeBookingTitle(draft.title ?? ""),
  ministryId: draft.ministryId || null,
  lines: draft.lines.map((line) => mapDraftLineToInterval(draft.date, line)),
});

export const bookingDraftDetailToCartDraft = (detail: BookingDraftDetail): BookingCartDraft => ({
  date: detail.date,
  ministryId: detail.ministryId || undefined,
  title: detail.title,
  lines: detail.lines.map((line) => ({
    facilityId: line.facilityId,
    start: clockFromDateTime(detail.date, line.startAt),
    end: clockFromDateTime(detail.date, line.endAt),
    sequence: line.sequence,
  })),
});

export const removeLineFromDraft = (draft: BookingCartDraft, sequence: number): BookingCartDraft | null => {
  const lines = draft.lines.filter((line) => line.sequence !== sequence);
  if (lines.length === 0) {
    return null;
  }
  return { ...draft, lines };
};

export const replaceLineInDraft = (
  draft: BookingCartDraft,
  sequence: number,
  line: Pick<BookingLineDraft, "facilityId" | "start" | "end">
): BookingCartDraft => {
  return {
    ...draft,
    lines: draft.lines.map((item) => (item.sequence === sequence ? { ...item, ...line } : item)),
  };
};

export const canAddRoomToDraft = (draft: BookingCartDraft, maxLines: number = MAX_BOOKING_LINES): boolean => {
  return draft.lines.length < maxLines;
};
