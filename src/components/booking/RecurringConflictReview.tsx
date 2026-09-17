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

interface ConflictPresentation {
  badgeColor: ConflictBadgeColor;
  badgeKey: string;
  bodyKey: string;
}

const CONFLICT_PRESENTATION: Record<Exclude<RecurringBookingConflict["kind"], "occupancy">, ConflictPresentation> = {
  ministry: {
    badgeColor: "error",
    badgeKey: "startBooking.recurringConflicts.kindMinistry",
    bodyKey: "startBooking.recurringConflicts.kindMinistryBody",
  },
  blackout: {
    badgeColor: "dark",
    badgeKey: "startBooking.recurringConflicts.kindBlackout",
    bodyKey: "startBooking.recurringConflicts.kindBlackoutBody",
  },
  weekly_quota: {
    badgeColor: "warning",
    badgeKey: "startBooking.recurringConflicts.kindWeeklyQuota",
    bodyKey: "startBooking.recurringConflicts.kindWeeklyQuotaBody",
  },
};

const OCCUPANCY_PRESENTATION: Record<"overridable" | "blocked", ConflictPresentation> = {
  overridable: {
    badgeColor: "success",
    badgeKey: "startBooking.recurringConflicts.kindOccupancyOverridable",
    bodyKey: "startBooking.recurringConflicts.kindOccupancyOverridableBody",
  },
  blocked: {
    badgeColor: "warning",
    badgeKey: "startBooking.recurringConflicts.kindOccupancyBlocked",
    bodyKey: "startBooking.recurringConflicts.kindOccupancyBlockedBody",
  },
};

const roomNames = (facilityIds: string[], rooms: RoomDay[]): string =>
  facilityIds.map((id) => rooms.find((room) => room.id === id)?.name ?? id).join(", ");

const presentationForConflict = (conflict: RecurringBookingConflict): ConflictPresentation => {
  if (conflict.kind === "occupancy") {
    return OCCUPANCY_PRESENTATION[conflict.isOverridable ? "overridable" : "blocked"];
  }
  return CONFLICT_PRESENTATION[conflict.kind];
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
                {group.conflicts.map((conflict, index) => {
                  const presentation = presentationForConflict(conflict);
                  return (
                    <li className="flex flex-col gap-1" key={`${group.occurrenceDate}-${conflict.kind}-${index}`}>
                      <div className="flex items-center gap-2">
                        <Badge color={presentation.badgeColor} size="sm">
                          {t(presentation.badgeKey)}
                        </Badge>
                        {conflict.facilityIds.length > 0 ? (
                          <span className="text-sm text-on-surface-variant">
                            {roomNames(conflict.facilityIds, rooms)}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-on-surface-variant">{t(presentation.bodyKey)}</p>
                      {conflict.kind === "ministry" &&
                      (conflict.ministryStewardDisplayName || conflict.ministryStewardEmail) ? (
                        <p className="text-sm text-on-surface">
                          {t("startBooking.recurringConflicts.stewardLabel")}{" "}
                          {[conflict.ministryStewardDisplayName, conflict.ministryStewardEmail]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
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
