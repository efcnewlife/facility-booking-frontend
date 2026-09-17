import type { RecurringBookingConflict } from "@/api/services/facilityService";

export interface RecurringConflictDateGroup {
  occurrenceDate: string;
  conflicts: RecurringBookingConflict[];
  /** At least one conflict on this date cannot be overridden: it must be excluded or the member must revise rooms/time. */
  isBlocking: boolean;
  /** Every conflict on this date is an overridable Rental occupancy, eligible for Priority Ministry override. */
  isFullyOverridable: boolean;
}

export const groupRecurringConflictsByDate = (conflicts: RecurringBookingConflict[]): RecurringConflictDateGroup[] => {
  const byDate = new Map<string, RecurringBookingConflict[]>();
  for (const conflict of conflicts) {
    const list = byDate.get(conflict.occurrenceDate) ?? [];
    list.push(conflict);
    byDate.set(conflict.occurrenceDate, list);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([occurrenceDate, dateConflicts]) => ({
      occurrenceDate,
      conflicts: dateConflicts,
      isBlocking: dateConflicts.some((conflict) => !conflict.isOverridable),
      isFullyOverridable: dateConflicts.every((conflict) => conflict.isOverridable),
    }));
};

export const blockingOccurrenceDates = (conflicts: RecurringBookingConflict[]): string[] => {
  return groupRecurringConflictsByDate(conflicts)
    .filter((group) => group.isBlocking)
    .map((group) => group.occurrenceDate);
};

/** True once every occurrence date that still blocks creation has been explicitly excluded. */
export const canCreateRecurringSeriesWithExclusions = (
  conflicts: RecurringBookingConflict[],
  excludedDates: string[]
): boolean => {
  const excluded = new Set(excludedDates);
  return blockingOccurrenceDates(conflicts).every((date) => excluded.has(date));
};

export const isProtectedMinistryConflict = (conflict: RecurringBookingConflict): boolean =>
  conflict.kind === "ministry";

export const isBlackoutConflict = (conflict: RecurringBookingConflict): boolean => conflict.kind === "blackout";

export const isOverridableOccupancyConflict = (conflict: RecurringBookingConflict): boolean =>
  conflict.kind === "occupancy" && conflict.isOverridable;
