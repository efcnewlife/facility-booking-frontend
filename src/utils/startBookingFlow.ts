import moment from "moment";

export const START_BOOKING_STEPS = ["ministry_choice", "select_ministry", "frequency", "when", "space_needed"] as const;

export type StartBookingStep = (typeof START_BOOKING_STEPS)[number];

export type BookingFrequency = "one_time" | "repeated";

export type SpaceNeededChoice = "single" | "multiple" | "gym" | "sanctuary";

export type RoomsSpace = "single" | "multiple";

export type RoomShortcutCode = "gym" | "sanctuary-hall";

export interface WhenValue {
  date: string | null;
  start: string | null;
  end: string | null;
}

export interface StartBookingAnswers {
  isMinistryBooking: boolean | null;
  ministryId: string | null;
  frequency: BookingFrequency | null;
  when: WhenValue;
  space: SpaceNeededChoice | null;
}

export interface RoomsSearchQuery {
  date: string;
  start?: string;
  end?: string;
  space: RoomsSpace;
  ministryId?: string;
  room?: RoomShortcutCode;
}

const DATE_FORMAT = "YYYY-MM-DD";
const TIME_FORMAT = "HH:mm";
const DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm";

const ROOM_SHORTCUT_CODES: Record<"gym" | "sanctuary", RoomShortcutCode> = {
  gym: "gym",
  sanctuary: "sanctuary-hall",
};

export const isStartBookingStep = (value: string | null): value is StartBookingStep => {
  return START_BOOKING_STEPS.some((step) => step === value);
};

const hasMinistryId = (answers: StartBookingAnswers): boolean => {
  return Boolean(answers.ministryId);
};

const hasCompleteWhen = (when: WhenValue): when is { date: string; start: string; end: string } => {
  return Boolean(when.date && when.start && when.end);
};

export const isWhenEndAfterStart = (when: WhenValue): boolean => {
  if (!when.start || !when.end) {
    return true;
  }
  const start = moment(when.start, TIME_FORMAT, true);
  const end = moment(when.end, TIME_FORMAT, true);
  if (!start.isValid() || !end.isValid()) {
    return true;
  }
  return end.isAfter(start);
};

export const isWhenValid = (when: WhenValue, now: Date): boolean => {
  if (!hasCompleteWhen(when)) {
    return false;
  }

  const date = moment(when.date, DATE_FORMAT, true);
  if (!date.isValid()) {
    return false;
  }

  const today = moment(now).startOf("day");
  const lastAllowed = moment(now).startOf("day").add(1, "year");
  if (date.isBefore(today, "day") || date.isAfter(lastAllowed, "day")) {
    return false;
  }

  const start = moment(`${when.date} ${when.start}`, DATE_TIME_FORMAT, true);
  const end = moment(`${when.date} ${when.end}`, DATE_TIME_FORMAT, true);
  if (!start.isValid() || !end.isValid()) {
    return false;
  }
  if (!isWhenEndAfterStart(when)) {
    return false;
  }
  if (date.isSame(today, "day") && !start.isAfter(moment(now))) {
    return false;
  }
  return true;
};

export const canAdvance = (step: StartBookingStep, answers: StartBookingAnswers, now: Date = new Date()): boolean => {
  switch (step) {
    case "ministry_choice":
      return answers.isMinistryBooking === true || answers.isMinistryBooking === false;
    case "select_ministry":
      return hasMinistryId(answers);
    case "frequency":
      return answers.frequency === "one_time";
    case "when":
      return isWhenValid(answers.when, now);
    case "space_needed":
      return answers.space != null;
  }
};

export const nextStep = (
  step: StartBookingStep,
  answers: StartBookingAnswers,
  now: Date = new Date(),
): StartBookingStep | "rooms" | null => {
  if (!canAdvance(step, answers, now)) {
    return null;
  }
  switch (step) {
    case "ministry_choice":
      return answers.isMinistryBooking ? "select_ministry" : "frequency";
    case "select_ministry":
      return "frequency";
    case "frequency":
      return "when";
    case "when":
      return "space_needed";
    case "space_needed":
      return "rooms";
  }
};

export const previousStep = (step: StartBookingStep, answers: StartBookingAnswers): StartBookingStep | "home" => {
  switch (step) {
    case "ministry_choice":
      return "home";
    case "select_ministry":
      return "ministry_choice";
    case "frequency":
      return answers.isMinistryBooking ? "select_ministry" : "ministry_choice";
    case "when":
      return "frequency";
    case "space_needed":
      return "when";
  }
};

export const buildRoomsSearchQuery = (answers: StartBookingAnswers): RoomsSearchQuery | null => {
  if (!hasCompleteWhen(answers.when) || answers.space == null) {
    return null;
  }

  const query: RoomsSearchQuery = {
    date: answers.when.date,
    start: answers.when.start,
    end: answers.when.end,
    space: answers.space === "multiple" ? "multiple" : "single",
  };

  if (answers.isMinistryBooking && answers.ministryId) {
    query.ministryId = answers.ministryId;
  }

  if (answers.space === "gym" || answers.space === "sanctuary") {
    query.room = ROOM_SHORTCUT_CODES[answers.space];
  }

  return query;
};

const parseTimeOfDay = (value: string | null): string | undefined => {
  if (!value || !moment(value, TIME_FORMAT, true).isValid()) {
    return undefined;
  }
  return value;
};

export const parseRoomsSearchQuery = (params: URLSearchParams): RoomsSearchQuery | null => {
  const date = params.get("date");
  if (!date || !moment(date, DATE_FORMAT, true).isValid()) {
    return null;
  }

  const start = parseTimeOfDay(params.get("start"));
  const end = parseTimeOfDay(params.get("end"));
  const space: RoomsSpace = params.get("space") === "multiple" ? "multiple" : "single";
  const roomParam = params.get("room");
  const room: RoomShortcutCode | undefined = roomParam === "gym" || roomParam === "sanctuary-hall" ? roomParam : undefined;
  const ministryId = params.get("ministryId") || undefined;

  const query: RoomsSearchQuery = { date, space };
  if (start) {
    query.start = start;
  }
  if (end) {
    query.end = end;
  }
  if (ministryId) {
    query.ministryId = ministryId;
  }
  if (room) {
    query.room = room;
  }
  return query;
};

export const toRoomsSearchParams = (query: RoomsSearchQuery): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("date", query.date);
  if (query.start) {
    params.set("start", query.start);
  }
  if (query.end) {
    params.set("end", query.end);
  }
  params.set("space", query.space);
  if (query.ministryId) {
    params.set("ministryId", query.ministryId);
  }
  if (query.room) {
    params.set("room", query.room);
  }
  return params;
};
