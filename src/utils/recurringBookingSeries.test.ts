import { describe, expect, it } from "vitest";
import { buildCreateRecurringBookingSeriesPayload } from "./recurringBookingSeries";
import type { RecurringWhenValue, StartBookingAnswers } from "./startBookingFlow";

const blankWhen = { date: null, start: null, end: null };

const baseRecurringWhen: RecurringWhenValue = {
  firstOccurrenceDate: "2026-08-20",
  lastOccurrenceDate: "2026-09-24",
  startTime: "09:00",
  endTime: "10:30",
  roomIds: ["room-1", "room-2"],
};

const answers = (overrides: Partial<StartBookingAnswers> = {}): StartBookingAnswers => ({
  isMinistryBooking: null,
  ministryId: null,
  frequency: "repeated",
  when: blankWhen,
  recurringWhen: baseRecurringWhen,
  ...overrides,
});

const now = new Date("2026-08-13T12:00:00");

describe("buildCreateRecurringBookingSeriesPayload", () => {
  it("builds a Personal Rental payload with a null ministryId", () => {
    expect(buildCreateRecurringBookingSeriesPayload(answers({ isMinistryBooking: false }), now)).toEqual({
      ministryId: null,
      firstOccurrenceDate: "2026-08-20",
      lastOccurrenceDate: "2026-09-24",
      localStartTime: "09:00:00",
      localEndTime: "10:30:00",
      isMissionAligned: false,
      rooms: [
        { facilityId: "room-1", sequence: 0 },
        { facilityId: "room-2", sequence: 1 },
      ],
    });
  });

  it("builds a Ministry payload with isMissionAligned true", () => {
    expect(
      buildCreateRecurringBookingSeriesPayload(answers({ isMinistryBooking: true, ministryId: "ministry-1" }), now)
    ).toEqual({
      ministryId: "ministry-1",
      firstOccurrenceDate: "2026-08-20",
      lastOccurrenceDate: "2026-09-24",
      localStartTime: "09:00:00",
      localEndTime: "10:30:00",
      isMissionAligned: true,
      rooms: [
        { facilityId: "room-1", sequence: 0 },
        { facilityId: "room-2", sequence: 1 },
      ],
    });
  });

  it("returns null when the recurring When is incomplete", () => {
    expect(
      buildCreateRecurringBookingSeriesPayload(answers({ recurringWhen: { ...baseRecurringWhen, roomIds: [] } }), now)
    ).toBe(null);
  });
});
