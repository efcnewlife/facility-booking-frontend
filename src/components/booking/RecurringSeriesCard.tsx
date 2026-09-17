import type { MemberBookingListItem } from "@/types/myBookings";
import { format_booking_date, format_booking_time_range } from "@/utils/bookingFormat";
import {
  BOOKING_STATUS,
  getBookingStatusBadgeColor,
  SERIES_DISPLAY_STATUS,
  uniqueFacilityNames,
  type MyBookingsSeriesEntry,
} from "@/utils/myBookings";
import { Badge, Button, cn } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useTranslation } from "react-i18next";

interface RecurringSeriesCardProps {
  entry: MyBookingsSeriesEntry;
  displayStatus: string;
  onView: (seriesId: string) => void;
  onCancel?: (seriesId: string) => void;
  className?: string;
}

const occurrenceClock = (value: string): string => moment(value).format("HH:mm");

const RecurringSeriesCard = ({ entry, displayStatus, onView, onCancel, className }: RecurringSeriesCardProps) => {
  const { t } = useTranslation("booking");
  const first = entry.occurrences[0];
  const last = entry.occurrences[entry.occurrences.length - 1];
  const rooms = uniqueFacilityNames(entry.occurrences);
  const statusLabel = t(`myBookings.status.${displayStatus}`, { defaultValue: displayStatus });

  return (
    <article className={cn("rounded-[20px] bg-booking-primary p-8 shadow-sm", className)}>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="m-0 text-xl font-bold text-white">{t("myBookings.seriesTitle")}</h3>
            <Badge color={getBookingStatusBadgeColor(displayStatus)} size="sm">
              {statusLabel}
            </Badge>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-booking-grey">{t("myBookings.fields.room")}</p>
              <p className="mt-1 text-xl font-bold text-white">{rooms || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-booking-grey">{t("myBookings.fields.range")}</p>
              <p className="mt-1 text-xl font-bold text-white">
                {first ? format_booking_date(moment(first.startAt).format("YYYY-MM-DD")) : "—"}
                {last && last.id !== first?.id
                  ? ` – ${format_booking_date(moment(last.startAt).format("YYYY-MM-DD"))}`
                  : ""}
              </p>
            </div>
            {first ? (
              <div>
                <p className="text-xs font-medium text-booking-grey">{t("myBookings.fields.time")}</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {format_booking_time_range(occurrenceClock(first.startAt), occurrenceClock(first.endAt))}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-medium text-booking-grey">{t("myBookings.fields.status")}</p>
              <p className="mt-1 text-xl font-bold text-white">
                {t("myBookings.occurrenceCount", { count: entry.occurrences.length })}
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {entry.occurrences.map((occurrence: MemberBookingListItem) => {
              const occurrenceStatus =
                displayStatus === SERIES_DISPLAY_STATUS.EXPIRED && occurrence.status === BOOKING_STATUS.PENDING_PAYMENT
                  ? SERIES_DISPLAY_STATUS.EXPIRED
                  : occurrence.status;
              return (
                <li className="text-sm font-medium text-booking-grey" key={occurrence.id}>
                  {format_booking_date(moment(occurrence.startAt).format("YYYY-MM-DD"))}
                  {" · "}
                  {t(`myBookings.status.${occurrenceStatus}`, { defaultValue: occurrenceStatus })}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col gap-3 self-start">
          <Button onClick={() => onView(entry.seriesId)} size="sm" variant="outline">
            {t("myBookings.viewSeries")}
          </Button>
          {onCancel ? (
            <button
              className="self-start text-base font-bold text-white underline underline-offset-2"
              onClick={() => onCancel(entry.seriesId)}
              type="button"
            >
              {t("myBookings.cancel")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default RecurringSeriesCard;
