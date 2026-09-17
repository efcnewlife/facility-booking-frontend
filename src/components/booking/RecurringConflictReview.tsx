import type { RecurringBookingConflict } from "@/api/services/facilityService";
import { groupRecurringConflictsByDate } from "@/utils/recurringBookingConflicts";
import type { RoomDay } from "@/utils/timetableRules";
import { Alert, Badge, Checkbox } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useTranslation } from "react-i18next";

interface RecurringConflictReviewProps {
  conflicts: RecurringBookingConflict[];
  excludedDates: string[];
  isPriorityMinistry: boolean;
  onToggleExcludeDate: (occurrenceDate: string) => void;
  rooms: RoomDay[];
  totalOccurrenceCount: number;
}

type ConflictBadgeColor = "success" | "warning" | "error" | "dark";

const roomNames = (facilityIds: string[], rooms: RoomDay[]): string =>
  facilityIds.map((id) => rooms.find((room) => room.id === id)?.name ?? id).join(", ");

const badgeColorForConflict = (conflict: RecurringBookingConflict): ConflictBadgeColor => {
  if (conflict.kind === "ministry") {
    return "error";
  }
  if (conflict.kind === "blackout") {
    return "dark";
  }
  if (conflict.kind === "weekly_quota") {
    return "warning";
  }
  return conflict.isOverridable ? "success" : "warning";
};

const badgeLabelKeyForConflict = (conflict: RecurringBookingConflict): string => {
  if (conflict.kind === "ministry") {
    return "startBooking.recurringConflicts.kindMinistry";
  }
  if (conflict.kind === "blackout") {
    return "startBooking.recurringConflicts.kindBlackout";
  }
  if (conflict.kind === "weekly_quota") {
    return "startBooking.recurringConflicts.kindWeeklyQuota";
  }
  return conflict.isOverridable
    ? "startBooking.recurringConflicts.kindOccupancyOverridable"
    : "startBooking.recurringConflicts.kindOccupancyBlocked";
};

const bodyKeyForConflict = (conflict: RecurringBookingConflict): string => {
  if (conflict.kind === "ministry") {
    return "startBooking.recurringConflicts.kindMinistryBody";
  }
  if (conflict.kind === "blackout") {
    return "startBooking.recurringConflicts.kindBlackoutBody";
  }
  if (conflict.kind === "weekly_quota") {
    return "startBooking.recurringConflicts.kindWeeklyQuotaBody";
  }
  return conflict.isOverridable
    ? "startBooking.recurringConflicts.kindOccupancyOverridableBody"
    : "startBooking.recurringConflicts.kindOccupancyBlockedBody";
};

const RecurringConflictReview = ({
  conflicts,
  excludedDates,
  isPriorityMinistry,
  onToggleExcludeDate,
  rooms,
  totalOccurrenceCount,
}: RecurringConflictReviewProps) => {
  const { t } = useTranslation("booking");
  const groups = groupRecurringConflictsByDate(conflicts);
  const excluded = new Set(excludedDates);
  const remaining = totalOccurrenceCount - excludedDates.length;

  return (
    <div className="w-full space-y-4">
      <Alert
        message={
          isPriorityMinistry
            ? t("startBooking.recurringConflicts.priorityIntro")
            : t("startBooking.recurringConflicts.rentalIntro")
        }
        size="lg"
        title={
          isPriorityMinistry
            ? t("startBooking.recurringConflicts.priorityTitle")
            : t("startBooking.recurringConflicts.rentalTitle")
        }
        variant={isPriorityMinistry ? "info" : "warning"}
        width="full"
      />
      <p className="text-sm text-on-surface-variant">
        {t("startBooking.recurringConflicts.occurrenceSummary", { remaining, total: totalOccurrenceCount })}
      </p>
      <div className="space-y-3">
        {groups.map((group) => {
          const isExcluded = excluded.has(group.occurrenceDate);
          return (
            <div className="rounded-lg border border-outline p-4" key={group.occurrenceDate}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-on-surface">{moment(group.occurrenceDate).format("LL")}</p>
                <Checkbox
                  checked={isExcluded}
                  id={`exclude-${group.occurrenceDate}`}
                  label={t("startBooking.recurringConflicts.exclude")}
                  onChange={() => onToggleExcludeDate(group.occurrenceDate)}
                />
              </div>
              <ul className="mt-3 space-y-2">
                {group.conflicts.map((conflict, index) => (
                  <li className="flex flex-col gap-1" key={`${group.occurrenceDate}-${conflict.kind}-${index}`}>
                    <div className="flex items-center gap-2">
                      <Badge color={badgeColorForConflict(conflict)} size="sm">
                        {t(badgeLabelKeyForConflict(conflict))}
                      </Badge>
                      {conflict.facilityIds.length > 0 ? (
                        <span className="text-sm text-on-surface-variant">
                          {roomNames(conflict.facilityIds, rooms)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-on-surface-variant">{t(bodyKeyForConflict(conflict))}</p>
                    {conflict.kind === "ministry" &&
                    (conflict.ministryStewardDisplayName || conflict.ministryStewardEmail) ? (
                      <p className="text-sm text-on-surface">
                        {t("startBooking.recurringConflicts.steward")}:{" "}
                        {[conflict.ministryStewardDisplayName, conflict.ministryStewardEmail]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {group.isBlocking && !isExcluded ? (
                <p className="mt-3 text-sm font-medium text-error" role="status">
                  {t("startBooking.recurringConflicts.mustResolve")}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecurringConflictReview;
