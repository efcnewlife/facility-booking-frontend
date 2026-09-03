import moment from "moment";

import { intervalStaysOnSameDay, MAX_BOOKING_LINES, type WhenSeedRange } from "./timetableRules";
import type { BookingLine, TimetableCartState } from "./timetableRules";

const DATE_FORMAT = "YYYY-MM-DD";
const TIME_FORMAT = "HH:mm";
const FIELD_SEP = "~";
const LINE_SEP = ",";

export interface BookingLineDraft {
  facilityId: string;
  start: string;
  end: string;
  sequence: number;
}

export interface BookingCartDraft {
  date: string;
  ministryId?: string;
  lines: BookingLineDraft[];
}

const isClock = (value: string): boolean => moment(value, TIME_FORMAT, true).isValid() || value === "24:00";

const encodeLine = (line: BookingLineDraft): string => {
  return [line.sequence, line.facilityId, line.start, line.end].join(FIELD_SEP);
};

const decodeLine = (raw: string): BookingLineDraft | null => {
  const parts = raw.split(FIELD_SEP);
  if (parts.length !== 4) {
    return null;
  }
  const sequence = Number.parseInt(parts[0], 10);
  const facilityId = parts[1];
  const start = parts[2];
  const end = parts[3];
  if (!Number.isFinite(sequence) || sequence < 1 || !facilityId || !isClock(start) || !isClock(end)) {
    return null;
  }
  if (!intervalStaysOnSameDay({ start, end })) {
    return null;
  }
  return { sequence, facilityId, start, end };
};

const parseLinesParam = (raw: string | null): BookingLineDraft[] => {
  if (!raw) {
    return [];
  }
  const lines: BookingLineDraft[] = [];
  const seen = new Set<string>();
  for (const segment of raw.split(LINE_SEP)) {
    const trimmed = segment.trim();
    if (!trimmed) {
      continue;
    }
    const line = decodeLine(trimmed);
    if (!line) {
      continue;
    }
    const key = `${line.facilityId}\0${line.start}\0${line.end}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    lines.push(line);
    if (lines.length >= MAX_BOOKING_LINES) {
      break;
    }
  }
  return lines.sort((left, right) => left.sequence - right.sequence);
};

export const whenSeedFromSearch = (start?: string, end?: string): WhenSeedRange | null => {
  if (!start || !end || !isClock(start) || !isClock(end)) {
    return null;
  }
  if (!intervalStaysOnSameDay({ start, end })) {
    return null;
  }
  return { start, end };
};

export const parseBookingCartDraft = (params: URLSearchParams): BookingCartDraft | null => {
  const date = params.get("date");
  if (!date || !moment(date, DATE_FORMAT, true).isValid()) {
    return null;
  }
  const lines = parseLinesParam(params.get("lines"));
  if (lines.length === 0) {
    return null;
  }
  const ministryId = params.get("ministryId") || undefined;
  return { date, ministryId, lines };
};

export const toBookingCartDraftParams = (draft: BookingCartDraft): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("date", draft.date);
  params.set(
    "lines",
    [...draft.lines]
      .sort((left, right) => left.sequence - right.sequence)
      .slice(0, MAX_BOOKING_LINES)
      .map(encodeLine)
      .join(LINE_SEP)
  );
  if (draft.ministryId) {
    params.set("ministryId", draft.ministryId);
  }
  return params;
};

export const cartStateToDraft = (
  date: string,
  ministryId: string | undefined,
  state: TimetableCartState
): BookingCartDraft | null => {
  if (state.lines.length === 0) {
    return null;
  }
  return {
    date,
    ministryId,
    lines: state.lines.map((line) => ({
      facilityId: line.facilityId,
      start: line.start,
      end: line.end,
      sequence: line.sequence,
    })),
  };
};

export const draftToCartState = (draft: BookingCartDraft, whenSeed: WhenSeedRange | null): TimetableCartState => {
  return {
    lines: draft.lines.map((line) => ({
      facilityId: line.facilityId,
      start: line.start,
      end: line.end,
      sequence: line.sequence,
    })),
    pinned: null,
    whenSeed,
  };
};

export const bookingLinesFromDraft = (draft: BookingCartDraft): BookingLine[] => {
  return draft.lines.map((line) => ({
    facilityId: line.facilityId,
    start: line.start,
    end: line.end,
    sequence: line.sequence,
  }));
};
