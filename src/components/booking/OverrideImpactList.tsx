import type { OverrideImpact } from "@/api/services/facilityService";
import { useId } from "react";
import { useTranslation } from "react-i18next";

interface OverrideImpactListProps {
  impacts: OverrideImpact[];
  roomName: (facilityId: string) => string | null;
  formatTimeRange: (startAt: string, endAt: string) => string;
}

/** Every room interval each target Booking releases, not just the intervals the proposal overlaps. */
const OverrideImpactList = ({ impacts, roomName, formatTimeRange }: OverrideImpactListProps) => {
  const { t } = useTranslation("booking");
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-[10px] border border-error bg-error-container/40 p-4 text-sm text-on-surface"
    >
      <h2 className="m-0 text-base font-bold text-booking-primary" id={headingId}>
        {t("override.impacts.title")}
      </h2>
      <p className="m-0 text-on-surface-variant">{t("override.impacts.description")}</p>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {impacts.map((impact, index) => (
          <li className="flex flex-col gap-1" key={impact.bookingId}>
            <p className="m-0 font-semibold">
              {t(impact.isSeriesOccurrence ? "override.impacts.seriesOccurrence" : "override.impacts.booking", {
                index: index + 1,
              })}
            </p>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {impact.releasedIntervals.map((interval) => (
                <li
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-4"
                  key={`${interval.facilityId}-${interval.startAt}-${interval.endAt}`}
                >
                  <span>{roomName(interval.facilityId) ?? t("override.impacts.unknownRoom")}</span>
                  <span>{formatTimeRange(interval.startAt, interval.endAt)}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default OverrideImpactList;
