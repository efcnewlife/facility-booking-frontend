import { describe, expect, it } from "vitest";
import {
  buildRoomsSearchQuery,
  canAdvance,
  isRecurringScheduleValid,
  isRecurringSharedTimeValid,
  isRecurringWhenValid,
  isSameWeekday,
  isStartBookingStep,
  isWhenEndAfterStart,
  isWhenValid,
  nextStep,
  parseBookingDetailsQuery,
  parseRoomsSearchQuery,
  previousStep,
  toBookingDetailsSearchParams,
  toRoomsSearchParams,
  occurrencePeriodForDate,
  weekdayForDate,
  weeklyOccurrenceDates,
  type RecurringWhenValue,
  type StartBookingAnswers,
} from "./startBookingFlow";

const blankWhen = { date: null, start: null, end: null };
const blankRecurringWhen: RecurringWhenValue = {
  weekday: null,
  firstOccurrenceDate: null,
  lastOccurrenceDate: null,
  startTime: null,
  endTime: null,
  roomIds: [],
};

const answers = (overrides: Partial<StartBookingAnswers> = {}): StartBookingAnswers => {
  const { when: whenOverride, recurringWhen: recurringWhenOverride, ...rest } = overrides;
  return {
    isMinistryBooking: null,
    ministryId: null,
    frequency: null,
    ...rest,
    when: { ...blankWhen, ...whenOverride },
    recurringWhen: { ...blankRecurringWhen, ...recurringWhenOverride },
  };
};

const recurringWhen = (overrides: Partial<RecurringWhenValue> = {}): RecurringWhenValue => ({
  ...blankRecurringWhen,
  ...overrides,
});

describe("isStartBookingStep", () => {
  it("accepts the four Start booking questions", () => {
    expect(isStartBookingStep("ministry_choice")).toBe(true);
    expect(isStartBookingStep("select_ministry")).toBe(true);
    expect(isStartBookingStep("frequency")).toBe(true);
    expect(isStartBookingStep("when")).toBe(true);
  });

  it("rejects removed or legacy steps", () => {
    expect(isStartBookingStep("space_needed")).toBe(false);
    expect(isStartBookingStep("select_date")).toBe(false);
    expect(isStartBookingStep("create_ministry")).toBe(false);
    expect(isStartBookingStep("pending_approval")).toBe(false);
    expect(isStartBookingStep("multi_room_choice")).toBe(false);
    expect(isStartBookingStep("duration_hours")).toBe(false);
    expect(isStartBookingStep(null)).toBe(false);
  });
});

describe("nextStep", () => {
  it("goes from ministry Yes to ministry name", () => {
    expect(nextStep("ministry_choice", answers({ isMinistryBooking: true }))).toBe("select_ministry");
  });

  it("skips ministry name when the answer is No", () => {
    expect(nextStep("ministry_choice", answers({ isMinistryBooking: false }))).toBe("frequency");
  });

  it("does not leave ministry choice until Yes or No is chosen", () => {
    expect(nextStep("ministry_choice", answers())).toBe(null);
  });

  it("goes from ministry name to One-time vs Repeated", () => {
    expect(nextStep("select_ministry", answers({ isMinistryBooking: true, ministryId: "m-1" }))).toBe("frequency");
  });

  it("goes from One-time to date and time", () => {
    expect(nextStep("frequency", answers({ frequency: "one_time" }))).toBe("when");
  });

  it("goes from Repeated to shared Start Time and End Time", () => {
    expect(nextStep("frequency", answers({ frequency: "repeated" }))).toBe("recurring_when");
  });

  it("goes from a valid shared time pair to Rooms in Repeated mode", () => {
    const now = new Date("2026-08-13T12:00:00");
    const sharedTime = recurringWhen({
      startTime: "09:00",
      endTime: "10:00",
    });
    expect(nextStep("recurring_when", answers({ frequency: "repeated", recurringWhen: sharedTime }), now)).toBe(
      "rooms"
    );
  });

  it("goes from conflict review to series creation", () => {
    expect(nextStep("recurring_conflicts", answers())).toBe("create_series");
  });

  it("does not continue from an incomplete shared time pair", () => {
    expect(nextStep("recurring_when", answers({ frequency: "repeated" }))).toBe(null);
    expect(
      nextStep(
        "recurring_when",
        answers({ frequency: "repeated", recurringWhen: recurringWhen({ startTime: "09:00", endTime: null }) })
      )
    ).toBe(null);
    expect(
      nextStep(
        "recurring_when",
        answers({
          frequency: "repeated",
          recurringWhen: recurringWhen({ startTime: "10:00", endTime: "09:00" }),
        })
      )
    ).toBe(null);
  });

  it("goes from a date-only When to the Timetable", () => {
    const now = new Date("2026-08-13T12:00:00");
    expect(nextStep("when", answers({ when: { date: "2026-08-20", start: null, end: null } }), now)).toBe("rooms");
  });

  it("goes from a valid When to the Timetable", () => {
    const now = new Date("2026-08-13T12:00:00");
    expect(nextStep("when", answers({ when: { date: "2026-08-20", start: "09:00", end: "11:00" } }), now)).toBe(
      "rooms"
    );
  });
});

describe("previousStep", () => {
  it("returns Home from ministry choice", () => {
    expect(previousStep("ministry_choice", answers())).toBe("home");
  });

  it("returns ministry choice from ministry name", () => {
    expect(previousStep("select_ministry", answers({ isMinistryBooking: true }))).toBe("ministry_choice");
  });

  it("returns ministry choice from frequency after No", () => {
    expect(previousStep("frequency", answers({ isMinistryBooking: false }))).toBe("ministry_choice");
  });

  it("returns ministry name from frequency after Yes", () => {
    expect(previousStep("frequency", answers({ isMinistryBooking: true }))).toBe("select_ministry");
  });

  it("returns frequency from date and time", () => {
    expect(previousStep("when", answers({ frequency: "one_time" }))).toBe("frequency");
  });

  it("returns frequency from the recurring occurrence form", () => {
    expect(previousStep("recurring_when", answers({ frequency: "repeated" }))).toBe("frequency");
  });

  it("returns the recurring occurrence form from conflict review, to revise rooms or time", () => {
    expect(previousStep("recurring_conflicts", answers({ frequency: "repeated" }))).toBe("recurring_when");
  });
});

describe("canAdvance", () => {
  it("allows ministry choice only after Yes or No", () => {
    expect(canAdvance("ministry_choice", answers())).toBe(false);
    expect(canAdvance("ministry_choice", answers({ isMinistryBooking: true }))).toBe(true);
    expect(canAdvance("ministry_choice", answers({ isMinistryBooking: false }))).toBe(true);
  });

  it("allows ministry name only when an active ministry is selected", () => {
    expect(canAdvance("select_ministry", answers({ isMinistryBooking: true }))).toBe(false);
    expect(canAdvance("select_ministry", answers({ isMinistryBooking: true, ministryId: "m-1" }))).toBe(true);
  });

  it("allows frequency Continue for either One-time or Repeated", () => {
    expect(canAdvance("frequency", answers({ frequency: "repeated" }))).toBe(true);
    expect(canAdvance("frequency", answers({ frequency: "one_time" }))).toBe(true);
    expect(canAdvance("frequency", answers())).toBe(false);
  });

  it("allows Search on When only when the date and optional time pair are valid", () => {
    const now = new Date("2026-08-13T12:00:00");
    expect(canAdvance("when", answers(), now)).toBe(false);
    expect(canAdvance("when", answers({ when: { date: "2026-08-20", start: null, end: null } }), now)).toBe(true);
    expect(canAdvance("when", answers({ when: { date: "2026-08-20", start: "09:00", end: "11:00" } }), now)).toBe(true);
    expect(canAdvance("when", answers({ when: { date: "2026-08-20", start: "09:00", end: null } }), now)).toBe(false);
  });

  it("allows Repeated shared time Continue only for a complete end-after-start pair", () => {
    expect(canAdvance("recurring_when", answers({ frequency: "repeated" }))).toBe(false);
    expect(
      canAdvance(
        "recurring_when",
        answers({ frequency: "repeated", recurringWhen: recurringWhen({ startTime: "09:00", endTime: "10:00" }) })
      )
    ).toBe(true);
    expect(
      canAdvance(
        "recurring_when",
        answers({ frequency: "repeated", recurringWhen: recurringWhen({ startTime: "10:00", endTime: "09:00" }) })
      )
    ).toBe(false);
  });
});

describe("isWhenValid", () => {
  const now = new Date("2026-08-13T14:30:00");

  it("rejects a blank When", () => {
    expect(isWhenValid(blankWhen, now)).toBe(false);
  });

  it("accepts a date without start and end", () => {
    expect(isWhenValid({ date: "2026-08-20", start: null, end: null }, now)).toBe(true);
  });

  it("rejects a date before today", () => {
    expect(isWhenValid({ date: "2026-08-12", start: "15:00", end: "16:00" }, now)).toBe(false);
  });

  it("rejects a date after one rolling year ahead", () => {
    expect(isWhenValid({ date: "2027-08-14", start: "09:00", end: "10:00" }, now)).toBe(false);
  });

  it("accepts today through one rolling year ahead", () => {
    expect(isWhenValid({ date: "2026-08-13", start: "15:00", end: "16:00" }, now)).toBe(true);
    expect(isWhenValid({ date: "2027-08-13", start: "09:00", end: "10:00" }, now)).toBe(true);
  });

  it("rejects only start or only end", () => {
    expect(isWhenValid({ date: "2026-08-20", start: "09:00", end: null }, now)).toBe(false);
    expect(isWhenValid({ date: "2026-08-20", start: null, end: "11:00" }, now)).toBe(false);
  });

  it("rejects end that is not after start", () => {
    expect(isWhenValid({ date: "2026-08-20", start: "09:00", end: "09:00" }, now)).toBe(false);
    expect(isWhenValid({ date: "2026-08-20", start: "11:00", end: "09:00" }, now)).toBe(false);
  });

  it("flags End before or equal to Start for the When warning", () => {
    expect(isWhenEndAfterStart({ date: null, start: "11:00", end: "09:00" })).toBe(false);
    expect(isWhenEndAfterStart({ date: null, start: "09:00", end: "09:00" })).toBe(false);
    expect(isWhenEndAfterStart({ date: null, start: "09:00", end: "11:00" })).toBe(true);
    expect(isWhenEndAfterStart({ date: null, start: "09:00", end: null })).toBe(true);
  });

  it("rejects a start that is not after now when the date is today", () => {
    expect(isWhenValid({ date: "2026-08-13", start: "14:30", end: "16:00" }, now)).toBe(false);
    expect(isWhenValid({ date: "2026-08-13", start: "14:29", end: "16:00" }, now)).toBe(false);
  });

  it("accepts a start after now on today", () => {
    expect(isWhenValid({ date: "2026-08-13", start: "14:31", end: "16:00" }, now)).toBe(true);
  });

  it("does not require start to be after now on a future date", () => {
    expect(isWhenValid({ date: "2026-08-14", start: "08:00", end: "09:00" }, now)).toBe(true);
  });

  it("accepts an end of 24:00 on the same calendar day", () => {
    expect(isWhenValid({ date: "2026-08-14", start: "23:00", end: "24:00" }, now)).toBe(true);
  });
});

describe("occurrencePeriodForDate", () => {
  it("treats January through June as jan_jun", () => {
    expect(occurrencePeriodForDate("2026-01-01")).toBe("jan_jun");
    expect(occurrencePeriodForDate("2026-06-30")).toBe("jan_jun");
  });

  it("treats July through December as jul_dec", () => {
    expect(occurrencePeriodForDate("2026-07-01")).toBe("jul_dec");
    expect(occurrencePeriodForDate("2026-12-31")).toBe("jul_dec");
  });

  it("returns null for an invalid date", () => {
    expect(occurrencePeriodForDate("not-a-date")).toBe(null);
  });
});

describe("isSameWeekday", () => {
  it("accepts dates seven days apart", () => {
    expect(isSameWeekday("2026-08-20", "2026-08-27")).toBe(true);
  });

  it("rejects dates on different weekdays", () => {
    expect(isSameWeekday("2026-08-20", "2026-08-28")).toBe(false);
  });
});

describe("weeklyOccurrenceDates", () => {
  it("generates every 7 days from first through last, inclusive", () => {
    expect(weeklyOccurrenceDates("2026-08-20", "2026-09-10")).toEqual([
      "2026-08-20",
      "2026-08-27",
      "2026-09-03",
      "2026-09-10",
    ]);
  });

  it("returns a single date when first equals last", () => {
    expect(weeklyOccurrenceDates("2026-08-20", "2026-08-20")).toEqual(["2026-08-20"]);
  });

  it("returns an empty list when last is before first", () => {
    expect(weeklyOccurrenceDates("2026-08-27", "2026-08-20")).toEqual([]);
  });
});

describe("weekdayForDate", () => {
  it("returns moment weekday for a calendar date", () => {
    expect(weekdayForDate("2026-08-20")).toBe(4);
    expect(weekdayForDate("2026-08-16")).toBe(0);
  });

  it("returns null for an invalid date", () => {
    expect(weekdayForDate("not-a-date")).toBe(null);
  });
});

describe("isRecurringSharedTimeValid", () => {
  it("accepts a complete end-after-start pair", () => {
    expect(isRecurringSharedTimeValid(recurringWhen({ startTime: "09:00", endTime: "10:00" }))).toBe(true);
  });

  it("rejects a missing, half-filled, or inverted pair", () => {
    expect(isRecurringSharedTimeValid(blankRecurringWhen)).toBe(false);
    expect(isRecurringSharedTimeValid(recurringWhen({ startTime: "09:00", endTime: null }))).toBe(false);
    expect(isRecurringSharedTimeValid(recurringWhen({ startTime: "10:00", endTime: "09:00" }))).toBe(false);
    expect(isRecurringSharedTimeValid(recurringWhen({ startTime: "10:00", endTime: "10:00" }))).toBe(false);
  });
});

describe("isRecurringScheduleValid", () => {
  const now = new Date("2026-08-13T12:00:00");
  const valid = recurringWhen({
    weekday: 4,
    firstOccurrenceDate: "2026-08-20",
    lastOccurrenceDate: "2026-09-24",
    startTime: "09:00",
    endTime: "10:00",
  });

  it("accepts one weekday with Starts on and Ends on in the same use period", () => {
    expect(isRecurringScheduleValid(valid, now)).toBe(true);
  });

  it("rejects a missing weekday or missing bound", () => {
    expect(isRecurringScheduleValid({ ...valid, weekday: null }, now)).toBe(false);
    expect(isRecurringScheduleValid({ ...valid, firstOccurrenceDate: null }, now)).toBe(false);
    expect(isRecurringScheduleValid({ ...valid, lastOccurrenceDate: null }, now)).toBe(false);
  });

  it("rejects inverted dates, a weekday mismatch, or two use periods", () => {
    expect(isRecurringScheduleValid({ ...valid, lastOccurrenceDate: "2026-08-13" }, now)).toBe(false);
    expect(isRecurringScheduleValid({ ...valid, lastOccurrenceDate: "2026-09-25" }, now)).toBe(false);
    expect(isRecurringScheduleValid({ ...valid, weekday: 3 }, now)).toBe(false);
    expect(
      isRecurringScheduleValid(
        { ...valid, firstOccurrenceDate: "2026-06-25", lastOccurrenceDate: "2026-07-30", weekday: 4 },
        now
      )
    ).toBe(false);
  });

  it("does not require rooms to accept the schedule", () => {
    expect(isRecurringScheduleValid({ ...valid, roomIds: [] }, now)).toBe(true);
  });
});

describe("isRecurringWhenValid", () => {
  const now = new Date("2026-08-13T12:00:00");
  const valid = recurringWhen({
    firstOccurrenceDate: "2026-08-20",
    lastOccurrenceDate: "2026-09-24",
    startTime: "09:00",
    endTime: "10:00",
    roomIds: ["room-1"],
  });

  it("accepts a complete, same-weekday, same-use-period range with rooms", () => {
    expect(isRecurringWhenValid(valid, now)).toBe(true);
  });

  it("rejects a blank recurring When", () => {
    expect(isRecurringWhenValid(blankRecurringWhen, now)).toBe(false);
  });

  it("rejects a first occurrence before today", () => {
    expect(isRecurringWhenValid({ ...valid, firstOccurrenceDate: "2026-08-12" }, now)).toBe(false);
  });

  it("rejects a last occurrence before the first", () => {
    expect(isRecurringWhenValid({ ...valid, lastOccurrenceDate: "2026-08-13" }, now)).toBe(false);
  });

  it("rejects a last occurrence on a different weekday", () => {
    expect(isRecurringWhenValid({ ...valid, lastOccurrenceDate: "2026-09-25" }, now)).toBe(false);
  });

  it("rejects a range spanning two use periods", () => {
    expect(
      isRecurringWhenValid({ ...valid, firstOccurrenceDate: "2026-06-25", lastOccurrenceDate: "2026-07-30" }, now)
    ).toBe(false);
  });

  it("rejects a missing or inverted shared time window", () => {
    expect(isRecurringWhenValid({ ...valid, startTime: null, endTime: null }, now)).toBe(false);
    expect(isRecurringWhenValid({ ...valid, startTime: "10:00", endTime: "09:00" }, now)).toBe(false);
    expect(isRecurringWhenValid({ ...valid, startTime: "10:00", endTime: "10:00" }, now)).toBe(false);
  });

  it("rejects an empty room selection", () => {
    expect(isRecurringWhenValid({ ...valid, roomIds: [] }, now)).toBe(false);
  });
});

describe("buildRoomsSearchQuery", () => {
  const when = { date: "2026-09-01", start: "09:00", end: "11:00" };

  it("sends date and optional start/end without space or room shortcut params", () => {
    expect(buildRoomsSearchQuery(answers({ when }))).toEqual({
      date: "2026-09-01",
      start: "09:00",
      end: "11:00",
    });
  });

  it("includes ministryId only for a Ministry booking", () => {
    expect(buildRoomsSearchQuery(answers({ isMinistryBooking: true, ministryId: "m-1", when }))).toEqual({
      date: "2026-09-01",
      start: "09:00",
      end: "11:00",
      ministryId: "m-1",
    });
    expect(buildRoomsSearchQuery(answers({ isMinistryBooking: false, ministryId: "m-1", when }))).toEqual({
      date: "2026-09-01",
      start: "09:00",
      end: "11:00",
    });
  });

  it("does not put minHours or multiRoom on the Search query", () => {
    const query = buildRoomsSearchQuery(answers({ when }));
    expect(query).not.toBeNull();
    if (!query) {
      return;
    }
    expect(query).not.toHaveProperty("minHours");
    expect(query).not.toHaveProperty("multiRoom");
    const params = toRoomsSearchParams(query);
    expect(params.has("minHours")).toBe(false);
    expect(params.has("multiRoom")).toBe(false);
    expect(params.has("space")).toBe(false);
    expect(params.has("room")).toBe(false);
  });

  it("omits start and end when When is date-only", () => {
    expect(buildRoomsSearchQuery(answers({ when: { date: "2026-09-01", start: null, end: null } }))).toEqual({
      date: "2026-09-01",
    });
  });

  it("returns null when When is incomplete", () => {
    expect(buildRoomsSearchQuery(answers({ when: { date: null, start: null, end: null } }))).toBe(null);
    expect(buildRoomsSearchQuery(answers({ when: { date: "2026-09-01", start: "09:00", end: null } }))).toBe(null);
  });

  it("sends Repeated mode with the required shared time and preserved ministry", () => {
    const repeated = answers({
      isMinistryBooking: true,
      ministryId: "m-1",
      frequency: "repeated",
      recurringWhen: recurringWhen({
        weekday: 4,
        firstOccurrenceDate: "2026-08-20",
        lastOccurrenceDate: "2026-09-24",
        startTime: "09:00",
        endTime: "10:30",
      }),
    });
    expect(buildRoomsSearchQuery(repeated)).toEqual({
      frequency: "repeated",
      start: "09:00",
      end: "10:30",
      ministryId: "m-1",
      date: "2026-08-20",
      lastDate: "2026-09-24",
      weekday: 4,
    });
  });

  it("sends Repeated mode without dates when only shared time is known", () => {
    expect(
      buildRoomsSearchQuery(
        answers({
          frequency: "repeated",
          recurringWhen: recurringWhen({ startTime: "09:00", endTime: "10:00" }),
        })
      )
    ).toEqual({
      frequency: "repeated",
      start: "09:00",
      end: "10:00",
    });
  });
});

describe("parseRoomsSearchQuery", () => {
  it("returns null when date is missing or invalid", () => {
    expect(parseRoomsSearchQuery(new URLSearchParams())).toBe(null);
    expect(parseRoomsSearchQuery(new URLSearchParams("date=13-08-2026"))).toBe(null);
    expect(parseRoomsSearchQuery(new URLSearchParams("date=not-a-date"))).toBe(null);
  });

  it("reads date, optional interval, and ministry while ignoring legacy keys", () => {
    const params = new URLSearchParams(
      "date=2026-09-01&start=09:00&end=11:00&space=single&room=gym&ministryId=m-1&minHours=2&multiRoom=1"
    );
    expect(parseRoomsSearchQuery(params)).toEqual({
      date: "2026-09-01",
      start: "09:00",
      end: "11:00",
      ministryId: "m-1",
    });
  });

  it("drops a half-filled Time pair and keeps the date", () => {
    expect(parseRoomsSearchQuery(new URLSearchParams("date=2026-09-01&start=09:00&space=single"))).toEqual({
      date: "2026-09-01",
    });
  });

  it("reads Repeated mode without requiring Starts on yet", () => {
    expect(
      parseRoomsSearchQuery(new URLSearchParams("frequency=repeated&start=09:00&end=10:30&ministryId=m-1"))
    ).toEqual({
      frequency: "repeated",
      start: "09:00",
      end: "10:30",
      ministryId: "m-1",
    });
  });

  it("reads Repeated schedule bounds from the Rooms query", () => {
    expect(
      parseRoomsSearchQuery(
        new URLSearchParams("frequency=repeated&start=09:00&end=10:30&date=2026-08-20&lastDate=2026-09-24&weekday=4")
      )
    ).toEqual({
      frequency: "repeated",
      start: "09:00",
      end: "10:30",
      date: "2026-08-20",
      lastDate: "2026-09-24",
      weekday: 4,
    });
  });

  it("rejects Repeated mode without a valid shared time pair", () => {
    expect(parseRoomsSearchQuery(new URLSearchParams("frequency=repeated"))).toBe(null);
    expect(parseRoomsSearchQuery(new URLSearchParams("frequency=repeated&start=09:00"))).toBe(null);
    expect(parseRoomsSearchQuery(new URLSearchParams("frequency=repeated&start=10:00&end=09:00"))).toBe(null);
  });
});

describe("parseBookingDetailsQuery", () => {
  it("returns null when date, interval, or rooms are missing", () => {
    expect(parseBookingDetailsQuery(new URLSearchParams())).toBe(null);
    expect(parseBookingDetailsQuery(new URLSearchParams("date=2026-09-01&start=09:00&end=11:00&space=single"))).toBe(
      null
    );
    expect(parseBookingDetailsQuery(new URLSearchParams("date=2026-09-01&rooms=room-a&space=single"))).toBe(null);
    expect(parseBookingDetailsQuery(new URLSearchParams("start=09:00&end=11:00&rooms=room-a&space=single"))).toBe(null);
  });

  it("reads a draft snapshot of date, interval, rooms, and ministry", () => {
    const params = new URLSearchParams(
      "date=2026-09-01&start=09:00&end=11:00&space=multiple&rooms=room-a,room-b&ministryId=m-1&room=gym"
    );
    expect(parseBookingDetailsQuery(params)).toEqual({
      date: "2026-09-01",
      start: "09:00",
      end: "11:00",
      space: "multiple",
      roomIds: ["room-a", "room-b"],
      ministryId: "m-1",
      room: "gym",
    });
  });

  it("keeps at most three room ids and drops blanks", () => {
    expect(
      parseBookingDetailsQuery(new URLSearchParams("date=2026-09-01&start=09:00&end=11:00&space=single&rooms=a,,b,c,d"))
    ).toEqual({
      date: "2026-09-01",
      start: "09:00",
      end: "11:00",
      space: "single",
      roomIds: ["a", "b", "c"],
    });
  });
});

describe("toBookingDetailsSearchParams", () => {
  it("round-trips a draft snapshot", () => {
    const query = {
      date: "2026-09-01",
      start: "10:00",
      end: "11:30",
      roomIds: ["room-a"],
      ministryId: "m-1",
    };
    expect(parseBookingDetailsQuery(toBookingDetailsSearchParams(query))).toEqual(query);
  });
});
