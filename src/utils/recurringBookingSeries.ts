import type {
  CreateRecurringBookingSeriesPayload,
  PreviewRecurringBookingSeriesPayload,
} from "@/api/services/facilityService";
import type { StartBookingAnswers } from "./startBookingFlow";
import { isRecurringWhenValid } from "./startBookingFlow";

const toLocalTime = (clock: string): string => `${clock}:00`;

export const buildPreviewRecurringBookingSeriesPayload = (
  answers: StartBookingAnswers,
  now: Date = new Date()
): PreviewRecurringBookingSeriesPayload | null => {
  if (!isRecurringWhenValid(answers.recurringWhen, now)) {
    return null;
  }
  const { firstOccurrenceDate, lastOccurrenceDate, startTime, endTime, roomIds } = answers.recurringWhen;
  const ministryId = answers.isMinistryBooking && answers.ministryId ? answers.ministryId : null;

  return {
    ministryId,
    firstOccurrenceDate: firstOccurrenceDate as string,
    lastOccurrenceDate: lastOccurrenceDate as string,
    localStartTime: toLocalTime(startTime as string),
    localEndTime: toLocalTime(endTime as string),
    isMissionAligned: Boolean(ministryId),
    rooms: roomIds.map((facilityId, index) => ({ facilityId, sequence: index })),
  };
};

export const buildCreateRecurringBookingSeriesPayload = (
  answers: StartBookingAnswers,
  now: Date = new Date(),
  excludedDates: string[] = []
): CreateRecurringBookingSeriesPayload | null => {
  const preview = buildPreviewRecurringBookingSeriesPayload(answers, now);
  if (!preview) {
    return null;
  }
  return { ...preview, excludedDates };
};
