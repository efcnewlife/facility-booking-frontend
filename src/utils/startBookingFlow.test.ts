import { describe, expect, it } from "vitest";
import {
  buildRoomsSearchQuery,
  canAdvance,
  isStartBookingStep,
  isWhenEndAfterStart,
  isWhenValid,
  nextStep,
  parseBookingDetailsQuery,
  parseRoomsSearchQuery,
  previousStep,
  toBookingDetailsSearchParams,
  toRoomsSearchParams,
  type StartBookingAnswers,
} from "./startBookingFlow";

const blankWhen = { date: null, start: null, end: null };

const answers = (overrides: Partial<StartBookingAnswers> = {}): StartBookingAnswers => {
  const { when: whenOverride, ...rest } = overrides;
  return {
    isMinistryBooking: null,
    ministryId: null,
    frequency: null,
    ...rest,
    when: { ...blankWhen, ...whenOverride },
  };
};

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

  it("does not continue from Repeated", () => {
    expect(nextStep("frequency", answers({ frequency: "repeated" }))).toBe(null);
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

  it("allows frequency Continue only for One-time", () => {
    expect(canAdvance("frequency", answers({ frequency: "repeated" }))).toBe(false);
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
