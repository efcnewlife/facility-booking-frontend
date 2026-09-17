import moment from "moment";

import { intervalStaysOnSameDay, type WhenSeedRange } from "./timetableRules";
import type { BookingLine, TimetableCartState } from "./timetableRules";

const TIME_FORMAT = "HH:mm";

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

export const whenSeedFromSearch = (start?: string, end?: string): WhenSeedRange | null => {
  if (!start || !end || !isClock(start) || !isClock(end)) {
    return null;
  }
  if (!intervalStaysOnSameDay({ start, end })) {
    return null;
  }
  return { start, end };
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
    sharedTime: null,
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
