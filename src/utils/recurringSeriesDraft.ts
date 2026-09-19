import type { RecurringSeriesDraftDetail } from "@/api/services/facilityService";
import { isValidBookingTitle, normalizeBookingTitle } from "./bookingTitle";
import { canCreateRecurringSeriesWithExclusions } from "./recurringBookingConflicts";
import type { CreateRecurringSeriesDraftPayload } from "@/api/services/facilityService";
import { weekdayForDate } from "./startBookingFlow";
import { emptyCartState, type TimetableCartState } from "./timetableRules";

export const clockFromLocalTime = (localTime: string): string => {
  const [hours, minutes] = localTime.split(":");
  if (!hours || minutes == null) {
    return localTime;
  }
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
};

export const canConfirmSeriesDraft = (draft: RecurringSeriesDraftDetail): boolean => {
  return draft.isConfirmable && isValidBookingTitle(draft.title ?? "");
};

export const seriesDraftNeedsTimetableRevision = (draft: RecurringSeriesDraftDetail): boolean => {
  if (draft.isConfirmable) {
    return false;
  }
  return canCreateRecurringSeriesWithExclusions(draft.conflicts, draft.excludedDates);
};

export const seriesDraftToUpdatePayload = (
  draft: RecurringSeriesDraftDetail,
  overrides: { title?: string | null; excludedDates?: string[] } = {}
): CreateRecurringSeriesDraftPayload => {
  const title = overrides.title !== undefined ? overrides.title : draft.title;
  return {
    title: title ? normalizeBookingTitle(title) : null,
    ministryId: draft.ministryId,
    firstOccurrenceDate: draft.firstOccurrenceDate,
    lastOccurrenceDate: draft.lastOccurrenceDate,
    localStartTime: draft.localStartTime,
    localEndTime: draft.localEndTime,
    rooms: draft.rooms,
    excludedDates: overrides.excludedDates ?? draft.excludedDates,
  };
};

export const toRepeatedTimetableSearchParams = (draft: RecurringSeriesDraftDetail): URLSearchParams => {
  const start = clockFromLocalTime(draft.localStartTime);
  const end = clockFromLocalTime(draft.localEndTime);
  const params = new URLSearchParams();
  params.set("frequency", "repeated");
  params.set("date", draft.firstOccurrenceDate);
  params.set("lastDate", draft.lastOccurrenceDate);
  const weekday = weekdayForDate(draft.firstOccurrenceDate);
  if (weekday != null) {
    params.set("weekday", String(weekday));
  }
  params.set("start", start);
  params.set("end", end);
  if (draft.ministryId) {
    params.set("ministryId", draft.ministryId);
  }
  const roomIds = [...draft.rooms].sort((left, right) => left.sequence - right.sequence).map((room) => room.facilityId);
  if (roomIds.length > 0) {
    params.set("rooms", roomIds.join(","));
  }
  return params;
};

export const repeatedCartFromDraft = (draft: RecurringSeriesDraftDetail): TimetableCartState => {
  const start = clockFromLocalTime(draft.localStartTime);
  const end = clockFromLocalTime(draft.localEndTime);
  const whenSeed = { start, end };
  const rooms = [...draft.rooms].sort((left, right) => left.sequence - right.sequence);
  return {
    ...emptyCartState(whenSeed),
    sharedTime: whenSeed,
    lines: rooms.map((room, index) => ({
      sequence: index + 1,
      facilityId: room.facilityId,
      start,
      end,
    })),
  };
};

export const parseRepeatedRoomIds = (params: URLSearchParams): string[] => {
  const raw = params.get("rooms");
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
};
