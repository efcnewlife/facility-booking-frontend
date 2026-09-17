import { describe, expect, it } from "vitest";
import type { RecurringBookingConflict } from "@/api/services/facilityService";
import {
  blockingOccurrenceDates,
  canCreateRecurringSeriesWithExclusions,
  groupRecurringConflictsByDate,
  isBlackoutConflict,
  isOverridableOccupancyConflict,
  isProtectedMinistryConflict,
} from "./recurringBookingConflicts";

const conflict = (overrides: Partial<RecurringBookingConflict> = {}): RecurringBookingConflict => ({
  occurrenceDate: "2026-08-20",
  kind: "occupancy",
  facilityIds: ["room-1"],
  isOverridable: false,
  ministryId: null,
  ministryStewardDisplayName: null,
  ministryStewardEmail: null,
  ...overrides,
});

describe("groupRecurringConflictsByDate", () => {
  it("groups conflicts by occurrence date in ascending order", () => {
    const groups = groupRecurringConflictsByDate([
      conflict({ occurrenceDate: "2026-09-03" }),
      conflict({ occurrenceDate: "2026-08-20" }),
    ]);
    expect(groups.map((group) => group.occurrenceDate)).toEqual(["2026-08-20", "2026-09-03"]);
  });

  it("flags a date as blocking when any conflict on it is not overridable", () => {
    const groups = groupRecurringConflictsByDate([
      conflict({ occurrenceDate: "2026-08-20", kind: "occupancy", isOverridable: true }),
      conflict({ occurrenceDate: "2026-08-20", kind: "blackout", isOverridable: false }),
    ]);
    expect(groups[0].isBlocking).toBe(true);
  });

  it("does not flag a date as blocking when every conflict on it is overridable", () => {
    const groups = groupRecurringConflictsByDate([
      conflict({ occurrenceDate: "2026-08-20", kind: "occupancy", isOverridable: true, facilityIds: ["room-1"] }),
      conflict({ occurrenceDate: "2026-08-20", kind: "occupancy", isOverridable: true, facilityIds: ["room-2"] }),
    ]);
    expect(groups[0].isBlocking).toBe(false);
  });
});

describe("blockingOccurrenceDates", () => {
  it("excludes fully overridable dates", () => {
    const dates = blockingOccurrenceDates([
      conflict({ occurrenceDate: "2026-08-20", kind: "occupancy", isOverridable: true }),
      conflict({ occurrenceDate: "2026-08-27", kind: "occupancy", isOverridable: false }),
    ]);
    expect(dates).toEqual(["2026-08-27"]);
  });
});

describe("canCreateRecurringSeriesWithExclusions", () => {
  it("allows creation when a Priority Ministry override covers every conflict on the date", () => {
    const conflicts = [conflict({ occurrenceDate: "2026-08-20", kind: "occupancy", isOverridable: true })];
    expect(canCreateRecurringSeriesWithExclusions(conflicts, [])).toBe(true);
  });

  it("blocks creation until a non-overridable conflict's date is excluded", () => {
    const conflicts = [conflict({ occurrenceDate: "2026-08-20", kind: "blackout", isOverridable: false })];
    expect(canCreateRecurringSeriesWithExclusions(conflicts, [])).toBe(false);
    expect(canCreateRecurringSeriesWithExclusions(conflicts, ["2026-08-20"])).toBe(true);
  });

  it("still requires exclusion when only one of several conflicts on a date is overridable", () => {
    const conflicts = [
      conflict({ occurrenceDate: "2026-08-20", kind: "occupancy", isOverridable: true, facilityIds: ["room-1"] }),
      conflict({
        occurrenceDate: "2026-08-20",
        kind: "ministry",
        isOverridable: false,
        facilityIds: ["room-2"],
        ministryStewardDisplayName: "Jane Doe",
      }),
    ];
    expect(canCreateRecurringSeriesWithExclusions(conflicts, [])).toBe(false);
    expect(canCreateRecurringSeriesWithExclusions(conflicts, ["2026-08-20"])).toBe(true);
  });
});

describe("isProtectedMinistryConflict", () => {
  it("identifies ministry-kind conflicts and exposes the primary steward contact", () => {
    const ministryConflict = conflict({
      kind: "ministry",
      ministryId: "ministry-1",
      ministryStewardDisplayName: "Jane Doe",
      ministryStewardEmail: "jane@example.org",
    });
    expect(isProtectedMinistryConflict(ministryConflict)).toBe(true);
    expect(isProtectedMinistryConflict(conflict({ kind: "occupancy" }))).toBe(false);
  });
});

describe("isBlackoutConflict", () => {
  it("identifies blackout-kind conflicts, which are never overridable", () => {
    expect(isBlackoutConflict(conflict({ kind: "blackout", isOverridable: false }))).toBe(true);
    expect(isBlackoutConflict(conflict({ kind: "occupancy" }))).toBe(false);
  });
});

describe("isOverridableOccupancyConflict", () => {
  it("identifies only overridable occupancy conflicts as eligible for Priority Ministry override", () => {
    expect(isOverridableOccupancyConflict(conflict({ kind: "occupancy", isOverridable: true }))).toBe(true);
    expect(isOverridableOccupancyConflict(conflict({ kind: "occupancy", isOverridable: false }))).toBe(false);
    expect(isOverridableOccupancyConflict(conflict({ kind: "ministry", isOverridable: false }))).toBe(false);
  });
});
