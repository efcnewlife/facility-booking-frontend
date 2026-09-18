import { describe, expect, it } from "vitest";
import {
  buildCreateRecurringBookingSeriesPayload,
  buildCreateRecurringSeriesDraftPayload,
  buildPreviewRecurringBookingSeriesPayload,
} from "./recurringBookingSeries";
import type { RecurringWhenValue, StartBookingAnswers } from "./startBookingFlow";

const blankWhen = { date: null, start: null, end: null };

const baseRecurringWhen: RecurringWhenValue = {
  weekday: 4,
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

describe("buildPreviewRecurringBookingSeriesPayload", () => {
  it("builds a preview payload with no excludedDates field", () => {
    expect(buildPreviewRecurringBookingSeriesPayload(answers({ isMinistryBooking: false }), now)).toEqual({
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

  it("returns null when the recurring When is incomplete", () => {
    expect(
      buildPreviewRecurringBookingSeriesPayload(answers({ recurringWhen: { ...baseRecurringWhen, roomIds: [] } }), now)
    ).toBe(null);
  });
});

describe("buildCreateRecurringBookingSeriesPayload", () => {
  it("builds a Personal Rental payload with a null ministryId, the trimmed title, and no exclusions", () => {
    expect(
      buildCreateRecurringBookingSeriesPayload(answers({ isMinistryBooking: false }), "  Weekly choir  ", now)
    ).toEqual({
      title: "Weekly choir",
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
      excludedDates: [],
    });
  });

  it("builds a Ministry payload with isMissionAligned true", () => {
    expect(
      buildCreateRecurringBookingSeriesPayload(
        answers({ isMinistryBooking: true, ministryId: "ministry-1" }),
        "Weekly choir",
        now
      )
    ).toEqual({
      title: "Weekly choir",
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
      excludedDates: [],
    });
  });

  it("carries excludedDates through to the create payload", () => {
    const payload = buildCreateRecurringBookingSeriesPayload(
      answers({ isMinistryBooking: false }),
      "Weekly choir",
      now,
      ["2026-08-27"]
    );
    expect(payload?.excludedDates).toEqual(["2026-08-27"]);
  });

  it("returns null when the recurring When is incomplete", () => {
    expect(
      buildCreateRecurringBookingSeriesPayload(
        answers({ recurringWhen: { ...baseRecurringWhen, roomIds: [] } }),
        "Weekly choir",
        now
      )
    ).toBe(null);
  });
});

describe("buildCreateRecurringSeriesDraftPayload", () => {
  it("maps a preview-ready Repeated proposal without requiring a Title", () => {
    expect(buildCreateRecurringSeriesDraftPayload(answers({ isMinistryBooking: false }), now, ["2026-08-27"])).toEqual({
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
      excludedDates: ["2026-08-27"],
    });
  });

  it("keeps an optional Title on replace so Booking Details can persist it", () => {
    expect(
      buildCreateRecurringSeriesDraftPayload(answers({ isMinistryBooking: false }), now, [], "  Weekly choir  ")
    ).toEqual(
      expect.objectContaining({
        title: "Weekly choir",
        excludedDates: [],
      })
    );
  });

  it("returns null when the Repeated proposal is incomplete", () => {
    expect(
      buildCreateRecurringSeriesDraftPayload(answers({ recurringWhen: { ...baseRecurringWhen, roomIds: [] } }), now)
    ).toBe(null);
  });
});
