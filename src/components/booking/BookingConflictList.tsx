import type { BookingConflict } from "@/api/services/facilityService";
import { useId } from "react";
import { useTranslation } from "react-i18next";

const CONFLICT_KINDS = ["ministry", "occupancy", "blackout", "opening_hours"];

interface BookingConflictListProps {
  conflicts: BookingConflict[];
  roomName: (facilityId: string) => string | null;
  formatTimeRange: (startAt: string, endAt: string) => string;
}

/** Blocking conflicts with only the contact the server authorized for this proposal. */
const BookingConflictList = ({ conflicts, roomName, formatTimeRange }: BookingConflictListProps) => {
  const { t } = useTranslation("booking");
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-[10px] border border-warning-700 bg-warning-100 p-4 text-sm text-booking-primary"
    >
      <h2 className="m-0 text-base font-bold" id={headingId}>
        {t("override.conflicts.title")}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {conflicts.map((conflict, index) => (
          <li
            className="flex flex-col gap-1"
            key={`${conflict.facilityId}-${conflict.startAt}-${conflict.kind}-${index}`}
          >
            <p className="m-0 font-semibold">
              {t(`override.conflicts.${CONFLICT_KINDS.includes(conflict.kind) ? conflict.kind : "occupancy"}`)}
            </p>
            <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
              <dt className="font-semibold">{t("override.room")}</dt>
              <dd className="m-0">{roomName(conflict.facilityId) ?? t("override.impacts.unknownRoom")}</dd>
              <dt className="font-semibold">{t("override.time")}</dt>
              <dd className="m-0">{formatTimeRange(conflict.startAt, conflict.endAt)}</dd>
              {conflict.ministryName ? (
                <>
                  <dt className="font-semibold">{t("timetable.contact.ministry")}</dt>
                  <dd className="m-0">{conflict.ministryName}</dd>
                </>
              ) : null}
              {conflict.contactDisplayName ? (
                <>
                  <dt className="font-semibold">{t("timetable.contact.name")}</dt>
                  <dd className="m-0">{conflict.contactDisplayName}</dd>
                </>
              ) : null}
              {conflict.contactEmail ? (
                <>
                  <dt className="font-semibold">{t("timetable.contact.email")}</dt>
                  <dd className="m-0">
                    <a className="text-booking-secondary underline" href={`mailto:${conflict.contactEmail}`}>
                      {conflict.contactEmail}
                    </a>
                  </dd>
                </>
              ) : null}
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default BookingConflictList;
