import type { DayAvailability } from "@/types/booking";

/** Mock availability keyed by room id for the demo date 2026-03-05. */
export const MOCK_AVAILABILITY_BY_ROOM: Record<string, DayAvailability> = {
  sanctuary: {
    am: [
      { start: "8:00", end: "10:00" },
      { start: "11:00", end: "12:00" },
    ],
    pm: [
      { start: "2:00", end: "3:00" },
      { start: "5:00", end: "8:00" },
      { start: "10:00", end: "11:55" },
    ],
  },
  gym: {
    am: [
      { start: "8:00", end: "10:00" },
      { start: "11:30", end: "12:00" },
    ],
    pm: [
      { start: "4:00", end: "4:30" },
      { start: "10:00", end: "11:55" },
    ],
  },
  "meeting-xxx": {
    am: [],
    pm: [],
  },
  "meeting-yyy": {
    am: [{ start: "8:00", end: "11:00" }],
    pm: [
      { start: "2:00", end: "3:30" },
      { start: "7:30", end: "11:55" },
    ],
  },
  "meeting-zzz": {
    am: [{ start: "9:00", end: "12:00" }],
    pm: [{ start: "1:00", end: "5:00" }],
  },
  "meeting-aaa": {
    am: [{ start: "8:00", end: "9:30" }],
    pm: [{ start: "6:00", end: "9:00" }],
  },
};

/** ISO date string (YYYY-MM-DD) that returns full mock results. */
export const MOCK_RESULTS_DATE = "2026-03-05";
