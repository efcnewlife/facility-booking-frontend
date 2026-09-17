import moment from "moment";

export const START_BOOKING_STEPS = [
  "ministry_choice",
  "select_ministry",
  "frequency",
  "when",
  "recurring_when",
  "recurring_conflicts",
] as const;

export type StartBookingStep = (typeof START_BOOKING_STEPS)[number];

export type BookingFrequency = "one_time" | "repeated";

export type RoomsSpace = "single" | "multiple";

export type RoomShortcutCode = "gym" | "sanctuary-hall";

export type RecurringUsePeriod = "jan_jun" | "jul_dec";

export interface WhenValue {
  date: string | null;
  start: string | null;
  end: string | null;
}

export interface RecurringWhenValue {
  weekday: number | null;
  firstOccurrenceDate: string | null;
  lastOccurrenceDate: string | null;
  startTime: string | null;
  endTime: string | null;
  roomIds: string[];
}

export interface StartBookingAnswers {
  isMinistryBooking: boolean | null;
  ministryId: string | null;
  frequency: BookingFrequency | null;
  when: WhenValue;
  recurringWhen: RecurringWhenValue;
}

export interface RoomsSearchQuery {
  date?: string;
  start?: string;
  end?: string;
  ministryId?: string;
  frequency?: BookingFrequency;
  weekday?: number;
  lastDate?: string;
}

const DATE_FORMAT = "YYYY-MM-DD";
const TIME_FORMAT = "HH:mm";
const DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm";

export const isStartBookingStep = (value: string | null): value is StartBookingStep => {
  return START_BOOKING_STEPS.some((step) => step === value);
};

const hasMinistryId = (answers: StartBookingAnswers): boolean => {
  return Boolean(answers.ministryId);
};

const hasHalfFilledTime = (when: WhenValue): boolean => {
  return Boolean(when.start) !== Boolean(when.end);
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
  if (!when.date || hasHalfFilledTime(when)) {
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

  if (!when.start && !when.end) {
    return true;
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

export const occurrencePeriodForDate = (date: string): RecurringUsePeriod | null => {
  const parsed = moment(date, DATE_FORMAT, true);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.month() <= 5 ? "jan_jun" : "jul_dec";
};

export const weekdayForDate = (date: string): number | null => {
  const parsed = moment(date, DATE_FORMAT, true);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.day();
};

export const isSameWeekday = (dateA: string, dateB: string): boolean => {
  const weekday_a = weekdayForDate(dateA);
  const weekday_b = weekdayForDate(dateB);
  if (weekday_a == null || weekday_b == null) {
    return false;
  }
  return weekday_a === weekday_b;
};

export const isDateOnWeekday = (date: string, weekday: number): boolean => {
  return weekdayForDate(date) === weekday;
};

/** Mirrors the backend's weekly_occurrence_dates: every 7 days from first through last, inclusive. */
export const weeklyOccurrenceDates = (firstOccurrenceDate: string, lastOccurrenceDate: string): string[] => {
  const first = moment(firstOccurrenceDate, DATE_FORMAT, true);
  const last = moment(lastOccurrenceDate, DATE_FORMAT, true);
  if (!first.isValid() || !last.isValid() || last.isBefore(first, "day")) {
    return [];
  }
  const dates: string[] = [];
  const cursor = first.clone();
  while (!cursor.isAfter(last, "day")) {
    dates.push(cursor.format(DATE_FORMAT));
    cursor.add(7, "days");
  }
  return dates;
};

export const isRecurringSharedTimeValid = (value: RecurringWhenValue): boolean => {
  if (!value.startTime || !value.endTime) {
    return false;
  }
  const start = moment(value.startTime, TIME_FORMAT, true);
  const end = moment(value.endTime, TIME_FORMAT, true);
  if (!start.isValid() || !end.isValid()) {
    return false;
  }
  return end.isAfter(start);
};

const isWeekdayValue = (weekday: number | null | undefined): weekday is number => {
  return weekday != null && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6;
};

export const isRecurringScheduleValid = (value: RecurringWhenValue, now: Date): boolean => {
  if (!isWeekdayValue(value.weekday) || !value.firstOccurrenceDate || !value.lastOccurrenceDate) {
    return false;
  }
  const first = moment(value.firstOccurrenceDate, DATE_FORMAT, true);
  const last = moment(value.lastOccurrenceDate, DATE_FORMAT, true);
  if (!first.isValid() || !last.isValid()) {
    return false;
  }
  const today = moment(now).startOf("day");
  if (first.isBefore(today, "day")) {
    return false;
  }
  if (last.isBefore(first, "day")) {
    return false;
  }
  if (
    !isDateOnWeekday(value.firstOccurrenceDate, value.weekday) ||
    !isDateOnWeekday(value.lastOccurrenceDate, value.weekday)
  ) {
    return false;
  }
  return occurrencePeriodForDate(value.firstOccurrenceDate) === occurrencePeriodForDate(value.lastOccurrenceDate);
};

export const isRecurringWhenValid = (value: RecurringWhenValue, now: Date): boolean => {
  const weekday = value.weekday ?? weekdayForDate(value.firstOccurrenceDate ?? "");
  const schedule: RecurringWhenValue = { ...value, weekday };
  if (!isRecurringScheduleValid(schedule, now)) {
    return false;
  }
  if (!isRecurringSharedTimeValid(value)) {
    return false;
  }
  return value.roomIds.length > 0;
};

export const canAdvance = (step: StartBookingStep, answers: StartBookingAnswers, now: Date = new Date()): boolean => {
  switch (step) {
    case "ministry_choice":
      return answers.isMinistryBooking === true || answers.isMinistryBooking === false;
    case "select_ministry":
      return hasMinistryId(answers);
    case "frequency":
      return answers.frequency === "one_time" || answers.frequency === "repeated";
    case "when":
      return isWhenValid(answers.when, now);
    case "recurring_when":
      return isRecurringSharedTimeValid(answers.recurringWhen);
    case "recurring_conflicts":
      /** Gated by conflict/exclusion state, which lives outside StartBookingAnswers; see canCreateRecurringSeriesWithExclusions. */
      return true;
  }
};

export const nextStep = (
  step: StartBookingStep,
  answers: StartBookingAnswers,
  now: Date = new Date()
): StartBookingStep | "rooms" | "create_series" | null => {
  if (!canAdvance(step, answers, now)) {
    return null;
  }
  switch (step) {
    case "ministry_choice":
      return answers.isMinistryBooking ? "select_ministry" : "frequency";
    case "select_ministry":
      return "frequency";
    case "frequency":
      return answers.frequency === "repeated" ? "recurring_when" : "when";
    case "when":
      return "rooms";
    case "recurring_when":
      return "rooms";
    case "recurring_conflicts":
      return "create_series";
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
    case "recurring_when":
      return "frequency";
    case "recurring_conflicts":
      return "recurring_when";
  }
};

const ministryIdForQuery = (answers: StartBookingAnswers): string | undefined => {
  if (answers.isMinistryBooking && answers.ministryId) {
    return answers.ministryId;
  }
  return undefined;
};

export const buildRoomsSearchQuery = (answers: StartBookingAnswers): RoomsSearchQuery | null => {
  if (answers.frequency === "repeated") {
    if (!isRecurringSharedTimeValid(answers.recurringWhen)) {
      return null;
    }
    const query: RoomsSearchQuery = {
      frequency: "repeated",
      start: answers.recurringWhen.startTime as string,
      end: answers.recurringWhen.endTime as string,
    };
    if (answers.recurringWhen.firstOccurrenceDate) {
      query.date = answers.recurringWhen.firstOccurrenceDate;
    }
    if (answers.recurringWhen.lastOccurrenceDate) {
      query.lastDate = answers.recurringWhen.lastOccurrenceDate;
    }
    if (isWeekdayValue(answers.recurringWhen.weekday)) {
      query.weekday = answers.recurringWhen.weekday;
    }
    const ministryId = ministryIdForQuery(answers);
    if (ministryId) {
      query.ministryId = ministryId;
    }
    return query;
  }

  if (!answers.when.date) {
    return null;
  }
  if (hasHalfFilledTime(answers.when)) {
    return null;
  }

  const query: RoomsSearchQuery = {
    date: answers.when.date,
  };

  if (answers.when.start && answers.when.end) {
    query.start = answers.when.start;
    query.end = answers.when.end;
  }

  const ministryId = ministryIdForQuery(answers);
  if (ministryId) {
    query.ministryId = ministryId;
  }

  return query;
};

const parseTimeOfDay = (value: string | null): string | undefined => {
  if (!value || !moment(value, TIME_FORMAT, true).isValid()) {
    return undefined;
  }
  return value;
};

const parseWeekdayParam = (value: string | null): number | undefined => {
  if (value == null || value === "") {
    return undefined;
  }
  const weekday = Number.parseInt(value, 10);
  if (!isWeekdayValue(weekday)) {
    return undefined;
  }
  return weekday;
};

const parseCalendarDate = (value: string | null): string | undefined => {
  if (!value || !moment(value, DATE_FORMAT, true).isValid()) {
    return undefined;
  }
  return value;
};

export const isRepeatedRoomsSearch = (query: RoomsSearchQuery | null | undefined): boolean => {
  return query?.frequency === "repeated";
};

export const parseRoomsSearchQuery = (params: URLSearchParams): RoomsSearchQuery | null => {
  const start = parseTimeOfDay(params.get("start"));
  const end = parseTimeOfDay(params.get("end"));
  const ministryId = params.get("ministryId") || undefined;
  const frequency = params.get("frequency") === "repeated" ? "repeated" : undefined;

  if (frequency === "repeated") {
    if (!start || !end || !isWhenEndAfterStart({ date: null, start, end })) {
      return null;
    }
    const query: RoomsSearchQuery = { frequency, start, end };
    const date = parseCalendarDate(params.get("date"));
    if (date) {
      query.date = date;
    }
    const lastDate = parseCalendarDate(params.get("lastDate"));
    if (lastDate) {
      query.lastDate = lastDate;
    }
    const weekday = parseWeekdayParam(params.get("weekday"));
    if (weekday != null) {
      query.weekday = weekday;
    }
    if (ministryId) {
      query.ministryId = ministryId;
    }
    return query;
  }

  const date = parseCalendarDate(params.get("date"));
  if (!date) {
    return null;
  }

  const query: RoomsSearchQuery = { date };
  if (start && end && isWhenEndAfterStart({ date, start, end })) {
    query.start = start;
    query.end = end;
  }
  if (ministryId) {
    query.ministryId = ministryId;
  }
  return query;
};

export const toRoomsSearchParams = (query: RoomsSearchQuery): URLSearchParams => {
  const params = new URLSearchParams();
  if (query.frequency === "repeated") {
    params.set("frequency", "repeated");
  }
  if (query.date) {
    params.set("date", query.date);
  }
  if (query.start) {
    params.set("start", query.start);
  }
  if (query.end) {
    params.set("end", query.end);
  }
  if (query.lastDate) {
    params.set("lastDate", query.lastDate);
  }
  if (query.weekday != null) {
    params.set("weekday", String(query.weekday));
  }
  if (query.ministryId) {
    params.set("ministryId", query.ministryId);
  }
  return params;
};

export interface BookingDetailsQuery extends RoomsSearchQuery {
  date: string;
  start: string;
  end: string;
  roomIds: string[];
  /** Legacy URL param; ignored for new Timetable navigation. */
  space?: RoomsSpace;
  /** Legacy room shortcut; ignored for new Timetable navigation. */
  room?: RoomShortcutCode;
}

const MAX_BOOKING_DETAIL_ROOMS = 3;

const parseRoomIdsParam = (params: URLSearchParams): string[] => {
  const raw = params.get("rooms");
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .slice(0, MAX_BOOKING_DETAIL_ROOMS);
};

const parseLegacySpace = (params: URLSearchParams): RoomsSpace | undefined => {
  const space = params.get("space");
  if (space === "multiple") {
    return "multiple";
  }
  if (space === "single") {
    return "single";
  }
  return undefined;
};

const parseLegacyRoomShortcut = (params: URLSearchParams): RoomShortcutCode | undefined => {
  const roomParam = params.get("room");
  if (roomParam === "gym" || roomParam === "sanctuary-hall") {
    return roomParam;
  }
  return undefined;
};

export const parseBookingDetailsQuery = (params: URLSearchParams): BookingDetailsQuery | null => {
  const search = parseRoomsSearchQuery(params);
  if (!search?.date || !search.start || !search.end || search.frequency === "repeated") {
    return null;
  }
  const roomIds = parseRoomIdsParam(params);
  if (roomIds.length === 0) {
    return null;
  }
  const legacy: Pick<BookingDetailsQuery, "space" | "room"> = {};
  const space = parseLegacySpace(params);
  if (space) {
    legacy.space = space;
  }
  const room = parseLegacyRoomShortcut(params);
  if (room) {
    legacy.room = room;
  }
  return {
    ...search,
    date: search.date,
    start: search.start,
    end: search.end,
    roomIds,
    ...legacy,
  };
};

export const toBookingDetailsSearchParams = (query: BookingDetailsQuery): URLSearchParams => {
  const params = toRoomsSearchParams(query);
  params.set("rooms", query.roomIds.join(","));
  if (query.space) {
    params.set("space", query.space);
  }
  if (query.room) {
    params.set("room", query.room);
  }
  return params;
};

export const recurringWhenFromRoomsQuery = (query: RoomsSearchQuery, roomIds: string[] = []): RecurringWhenValue => {
  return {
    weekday: isWeekdayValue(query.weekday) ? query.weekday : (weekdayForDate(query.date ?? "") ?? null),
    firstOccurrenceDate: query.date ?? null,
    lastOccurrenceDate: query.lastDate ?? null,
    startTime: query.start ?? null,
    endTime: query.end ?? null,
    roomIds,
  };
};
