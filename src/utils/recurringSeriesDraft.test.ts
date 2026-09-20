import type { RecurringBookingConflict, RecurringSeriesDraftDetail } from "@/api/services/facilityService";
import { describe, expect, it } from "vitest";
import {
  canConfirmSeriesDraft,
  clockFromLocalTime,
  repeatedCartFromDraft,
  seriesDraftNeedsTimetableRevision,
  toRepeatedTimetableSearchParams,
} from "./recurringSeriesDraft";

const conflict = (overrides: Partial<RecurringBookingConflict> = {}): RecurringBookingConflict => ({
  occurrenceDate: "2026-08-27",
  kind: "occupancy",
  facilityIds: ["room-1"],
  isOverridable: true,
  ministryId: null,
  ministryStewardDisplayName: null,
  ministryStewardEmail: null,
  ...overrides,
});

const confirmableDraft = (overrides: Partial<RecurringSeriesDraftDetail> = {}): RecurringSeriesDraftDetail => ({
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  title: "Weekly choir",
  ministryId: null,
  firstOccurrenceDate: "2026-08-20",
  lastOccurrenceDate: "2026-09-24",
  localStartTime: "09:00:00",
  localEndTime: "10:30:00",
  isMissionAligned: false,
  remark: null,
  surchargeCodes: [],
  excludedDates: ["2026-08-27"],
  rooms: [
    { facilityId: "room-1", sequence: 0 },
    { facilityId: "room-2", sequence: 1 },
  ],
  conflicts: [conflict()],
  isConfirmable: true,
  invalidityCode: null,
  invalidityDetail: null,
  quotedAmount: "150.00",
  subtotalAmount: "150.00",
  discountPercent: "0",
  discountAmount: "0.00",
  surchargeAmount: "0.00",
  currency: "CAD",
  occurrenceCount: 5,
  pendingPaymentHoldHours: 48,
  paymentHoldExpiresAt: "2026-08-22T16:00:00.000Z",
  ...overrides,
});

describe("clockFromLocalTime", () => {
  it("shows the shared HH:mm window from a Series local time", () => {
    expect(clockFromLocalTime("09:00:00")).toBe("09:00");
    expect(clockFromLocalTime("10:30")).toBe("10:30");
  });
});

describe("canConfirmSeriesDraft", () => {
  it("allows Confirm only for a confirmable Draft with a valid Title", () => {
    expect(canConfirmSeriesDraft(confirmableDraft())).toBe(true);
    expect(canConfirmSeriesDraft(confirmableDraft({ title: "" }))).toBe(false);
    expect(canConfirmSeriesDraft(confirmableDraft({ title: "  " }))).toBe(false);
  });

  it("blocks Confirm when live revalidation says the preview is stale", () => {
    expect(
      canConfirmSeriesDraft(
        confirmableDraft({
          isConfirmable: false,
          invalidityCode: "FACILITY_BOOKING_SCHEDULING_CONFLICT",
        })
      )
    ).toBe(false);
  });
});

describe("seriesDraftNeedsTimetableRevision", () => {
  it("sends the member back to Timetable when the Draft is no longer confirmable", () => {
    expect(seriesDraftNeedsTimetableRevision(confirmableDraft())).toBe(false);
    expect(seriesDraftNeedsTimetableRevision(confirmableDraft({ isConfirmable: false }))).toBe(true);
  });

  it("does not treat a missing Title as a stale timetable proposal", () => {
    expect(
      seriesDraftNeedsTimetableRevision(
        confirmableDraft({
          title: null,
          conflicts: [],
          excludedDates: [],
          isConfirmable: false,
          invalidityCode: "FACILITY_BOOKING_TITLE_INVALID",
        })
      )
    ).toBe(false);
  });

  it("keeps the member on Booking Details while permitted exclusions still need resolving", () => {
    expect(
      seriesDraftNeedsTimetableRevision(
        confirmableDraft({
          isConfirmable: false,
          excludedDates: [],
          conflicts: [conflict({ isOverridable: false, kind: "blackout" })],
        })
      )
    ).toBe(false);
  });
});

describe("toRepeatedTimetableSearchParams", () => {
  it("preserves the weekly proposal so Back can restore Timetable rooms and shared time", () => {
    const params = toRepeatedTimetableSearchParams(confirmableDraft({ ministryId: "m-1" }));
    expect(params.get("frequency")).toBe("repeated");
    expect(params.get("date")).toBe("2026-08-20");
    expect(params.get("lastDate")).toBe("2026-09-24");
    expect(params.get("weekday")).toBe("4");
    expect(params.get("start")).toBe("09:00");
    expect(params.get("end")).toBe("10:30");
    expect(params.get("ministryId")).toBe("m-1");
    expect(params.get("rooms")).toBe("room-1,room-2");
  });
});

describe("repeatedCartFromDraft", () => {
  it("rebuilds the shared-time Repeated cart from the Draft rooms", () => {
    expect(repeatedCartFromDraft(confirmableDraft())).toEqual({
      lines: [
        { sequence: 1, facilityId: "room-1", start: "09:00", end: "10:30" },
        { sequence: 2, facilityId: "room-2", start: "09:00", end: "10:30" },
      ],
      pinned: null,
      whenSeed: { start: "09:00", end: "10:30" },
      sharedTime: { start: "09:00", end: "10:30" },
      title: "",
    });
  });
});
