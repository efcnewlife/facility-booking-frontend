import type { RecurringConflictDateGroup } from "@/utils/recurringBookingConflicts";
import { Badge } from "@efcnewlife/newlife-ui";
import { useId } from "react";
import { useTranslation } from "react-i18next";

interface RepeatedConflictListProps {
  groups: RecurringConflictDateGroup[];
  excludedDates: string[];
  roomName: (facilityId: string) => string;
  formatDate: (occurrenceDate: string) => string;
  onView: (occurrenceDate: string) => void;
}

/** Later-date conflicts of a Series Draft; each date opens its Conflict popup, where it can be skipped. */
const RepeatedConflictList = ({ groups, excludedDates, roomName, formatDate, onView }: RepeatedConflictListProps) => {
  const { t } = useTranslation("booking");
  const headingId = useId();
  const excluded = new Set(excludedDates);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 text-sm text-booking-primary">
      <h2 className="m-0 text-base font-bold" id={headingId}>
        {t("repeatedConflicts.title")}
      </h2>
      <p className="m-0 text-on-surface-variant">{t("repeatedConflicts.description")}</p>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {groups.map((group) => {
          const isExcluded = excluded.has(group.occurrenceDate);
          const dateLabel = formatDate(group.occurrenceDate);
          const facilityIds = [...new Set(group.conflicts.flatMap((conflict) => conflict.facilityIds))];
          return (
            <li className="flex flex-col gap-2 rounded-[10px] border border-outline p-4" key={group.occurrenceDate}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="m-0 font-semibold">{dateLabel}</p>
                  {facilityIds.length > 0 ? (
                    <p className="m-0 text-on-surface-variant">{facilityIds.map(roomName).join(", ")}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {isExcluded ? (
                    <Badge color="dark" size="sm">
                      {t("repeatedConflicts.skipped")}
                    </Badge>
                  ) : group.isBlocking ? null : (
                    <Badge color="error" size="sm">
                      {t("timetable.override")}
                    </Badge>
                  )}
                  <button
                    aria-label={t("repeatedConflicts.viewConflictFor", { date: dateLabel })}
                    className="inline-flex h-8 items-center justify-center rounded-md border border-outline bg-white px-3 text-sm font-semibold text-booking-primary"
                    onClick={() => onView(group.occurrenceDate)}
                    type="button"
                  >
                    {t("repeatedConflicts.viewConflict")}
                  </button>
                </div>
              </div>
              {group.isBlocking && !isExcluded ? (
                <p className="m-0 font-medium text-error" role="status">
                  {t("repeatedConflicts.mustResolve")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default RepeatedConflictList;
