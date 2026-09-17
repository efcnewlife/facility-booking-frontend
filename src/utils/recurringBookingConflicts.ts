import type { RecurringBookingConflict } from "@/api/services/facilityService";

export interface RecurringConflictDateGroup {
  occurrenceDate: string;
  conflicts: RecurringBookingConflict[];
  /** At least one conflict on this date cannot be overridden: it must be excluded or the member must revise rooms/time. */
  isBlocking: boolean;
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
    }));
};

export const blockingOccurrenceDates = (conflicts: RecurringBookingConflict[]): string[] => {
  return groupRecurringConflictsByDate(conflicts)
    .filter((group) => group.isBlocking)
    .map((group) => group.occurrenceDate);
};

export const permittedExclusionDates = (conflicts: RecurringBookingConflict[]): string[] => {
  return groupRecurringConflictsByDate(conflicts).map((group) => group.occurrenceDate);
};

const permittedExclusionDateSet = (conflicts: RecurringBookingConflict[]): Set<string> => {
  return new Set(permittedExclusionDates(conflicts));
};

export const sanitizeExcludedDates = (conflicts: RecurringBookingConflict[], excludedDates: string[]): string[] => {
  const permitted = permittedExclusionDateSet(conflicts);
  return excludedDates.filter((date) => permitted.has(date));
};

export const toggleExcludedDate = (
  conflicts: RecurringBookingConflict[],
  excludedDates: string[],
  occurrenceDate: string
): string[] => {
  const permitted = permittedExclusionDateSet(conflicts);
  if (!permitted.has(occurrenceDate)) {
    return sanitizeExcludedDates(conflicts, excludedDates);
  }
  const next = new Set(sanitizeExcludedDates(conflicts, excludedDates));
  if (next.has(occurrenceDate)) {
    next.delete(occurrenceDate);
  } else {
    next.add(occurrenceDate);
  }
  return Array.from(next).sort();
};

/** True once every blocking date is excluded and no free or unreported date is used to shorten the Series. */
export const canCreateRecurringSeriesWithExclusions = (
  conflicts: RecurringBookingConflict[],
  excludedDates: string[]
): boolean => {
  const permitted = permittedExclusionDateSet(conflicts);
  if (excludedDates.some((date) => !permitted.has(date))) {
    return false;
  }
  const excluded = new Set(excludedDates);
  return blockingOccurrenceDates(conflicts).every((date) => excluded.has(date));
};

export const isProtectedMinistryConflict = (conflict: RecurringBookingConflict): boolean =>
  conflict.kind === "ministry";

export const isBlackoutConflict = (conflict: RecurringBookingConflict): boolean => conflict.kind === "blackout";

export const isOverridableOccupancyConflict = (conflict: RecurringBookingConflict): boolean =>
  conflict.kind === "occupancy" && conflict.isOverridable;

export type RecurringConflictPresentationKey =
  "occupancy_overridable" | "occupancy_blocked" | "ministry" | "blackout" | "weekly_quota";

export const conflictPresentationKey = (conflict: RecurringBookingConflict): RecurringConflictPresentationKey => {
  if (conflict.kind === "occupancy") {
    return conflict.isOverridable ? "occupancy_overridable" : "occupancy_blocked";
  }
  return conflict.kind;
};
