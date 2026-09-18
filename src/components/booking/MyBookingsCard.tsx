import ImagePreview from "@/components/booking/ImagePreview";
import {
  MY_BOOKINGS_CARD_KIND,
  MY_BOOKINGS_SECTION,
  type MemberBookingListItem,
  type MyBookingsBrowseCard,
  type MyBookingsSection,
} from "@/types/myBookings";
import { format_booking_date, format_booking_time_range } from "@/utils/bookingFormat";
import { canOpenImagePreview } from "@/utils/imagePreview";
import {
  browseCardPrimaryFacilityName,
  canCancelOneTimeCard,
  canCancelSeriesCard,
  displayStatusForBrowseItem,
  getBookingStatusBadgeColor,
} from "@/utils/myBookings";
import { Badge, Button, cn } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MdPhoto, MdZoomIn } from "react-icons/md";

interface MyBookingsCardProps {
  card: MyBookingsBrowseCard;
  section: MyBookingsSection;
  now: Date;
  onViewSeries: (seriesId: string) => void;
  onCancelOneTime?: (booking: MemberBookingListItem) => void;
  onCancelSeries?: (seriesId: string) => void;
  className?: string;
}

const occurrenceClock = (value: string): string => moment(value).format("HH:mm");

const MyBookingsCard = ({
  card,
  section,
  now,
  onViewSeries,
  onCancelOneTime,
  onCancelSeries,
  className,
}: MyBookingsCardProps) => {
  const { t } = useTranslation("booking");
  const [previewOpen, setPreviewOpen] = useState(false);
  const highlighted = section === MY_BOOKINGS_SECTION.UPCOMING;
  const roomName = browseCardPrimaryFacilityName(card);
  const labelClass = cn("text-xs font-medium", highlighted ? "text-booking-grey" : "text-booking-text");
  const valueClass = cn("mt-1 text-lg font-bold", highlighted ? "text-white" : "text-on-surface");

  const canCancelOneTime = Boolean(onCancelOneTime) && canCancelOneTimeCard(card, now);
  const canCancelSeries = Boolean(onCancelSeries) && canCancelSeriesCard(card, now);

  return (
    <article
      className={cn("rounded-[20px] p-8 shadow-sm", highlighted ? "bg-booking-primary" : "bg-surface", className)}
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-3 lg:w-[207px]">
          <div className="relative h-[121px] w-full overflow-hidden rounded-sm bg-booking-grey">
            {canOpenImagePreview(card.photoUrls) ? (
              <button
                aria-label={t("imagePreview.zoom")}
                className="relative h-full w-full p-0"
                onClick={() => setPreviewOpen(true)}
                type="button"
              >
                <img alt="" className="size-full object-cover" src={card.photoUrls[0]} />
                <span className="pointer-events-none absolute top-2 right-2 flex size-8 items-center justify-center text-white">
                  <MdZoomIn size={20} />
                </span>
              </button>
            ) : (
              <div
                aria-hidden
                className={cn(
                  "flex size-full items-center justify-center",
                  highlighted ? "text-white/40" : "text-booking-primary/40"
                )}
              >
                <MdPhoto size={40} />
              </div>
            )}
          </div>
          {card.isViewOnly ? (
            <Badge color="info" size="sm">
              {t("myBookings.viewOnlyBadge")}
            </Badge>
          ) : null}
        </div>

        {card.kind === MY_BOOKINGS_CARD_KIND.ONE_TIME && card.booking ? (
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className={cn("m-0 text-xl font-bold", highlighted ? "text-white" : "text-on-surface")}>
                {card.booking.title || t("myBookings.untitled")}
              </h3>
              <Badge
                color={getBookingStatusBadgeColor(displayStatusForBrowseItem(card.booking.status, section))}
                size="sm"
              >
                {t(`myBookings.status.${displayStatusForBrowseItem(card.booking.status, section)}`, {
                  defaultValue: card.booking.status,
                })}
              </Badge>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className={labelClass}>{t("myBookings.fields.room")}</p>
                <p className={valueClass}>{roomName || "—"}</p>
              </div>
              <div>
                <p className={labelClass}>{t("myBookings.fields.date")}</p>
                <p className={valueClass}>{format_booking_date(moment(card.booking.startAt).format("YYYY-MM-DD"))}</p>
                <p className={cn(labelClass, "mt-3")}>{t("myBookings.fields.time")}</p>
                <p className={valueClass}>
                  {format_booking_time_range(
                    occurrenceClock(card.booking.startAt),
                    occurrenceClock(card.booking.endAt)
                  )}
                </p>
              </div>
            </div>

            {canCancelOneTime ? (
              <button
                className={cn(
                  "mt-6 text-base font-bold underline underline-offset-2",
                  highlighted ? "text-white" : "text-on-surface"
                )}
                onClick={() => onCancelOneTime?.(card.booking as MemberBookingListItem)}
                type="button"
              >
                {t("myBookings.cancel")}
              </button>
            ) : null}
          </div>
        ) : null}

        {card.kind === MY_BOOKINGS_CARD_KIND.SERIES ? (
          <div className="min-w-0 flex-1 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className={cn("m-0 text-xl font-bold", highlighted ? "text-white" : "text-on-surface")}>
                {card.seriesTitle || t("myBookings.seriesTitle")}
              </h3>
              <p className={cn("text-sm font-medium", highlighted ? "text-booking-grey" : "text-booking-text")}>
                {t("myBookings.occurrenceCount", { count: card.occurrences.length })}
              </p>
            </div>

            <div>
              <p className={labelClass}>{t("myBookings.fields.room")}</p>
              <p className={valueClass}>{roomName || "—"}</p>
            </div>

            <ul className="space-y-2">
              {card.occurrences.map((occurrence) => {
                const occurrenceStatus = displayStatusForBrowseItem(occurrence.status, section);
                return (
                  <li
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 text-sm font-medium",
                      highlighted ? "text-booking-grey" : "text-booking-text"
                    )}
                    key={occurrence.id}
                  >
                    <span>
                      {format_booking_date(moment(occurrence.startAt).format("YYYY-MM-DD"))}
                      {" · "}
                      {format_booking_time_range(
                        occurrenceClock(occurrence.startAt),
                        occurrenceClock(occurrence.endAt)
                      )}
                    </span>
                    <Badge color={getBookingStatusBadgeColor(occurrenceStatus)} size="sm">
                      {t(`myBookings.status.${occurrenceStatus}`, { defaultValue: occurrenceStatus })}
                    </Badge>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => card.seriesId && onViewSeries(card.seriesId)} size="sm" variant="outline">
                {t("myBookings.viewSeries")}
              </Button>
              {canCancelSeries ? (
                <button
                  className={cn(
                    "text-base font-bold underline underline-offset-2",
                    highlighted ? "text-white" : "text-on-surface"
                  )}
                  onClick={() => card.seriesId && onCancelSeries?.(card.seriesId)}
                  type="button"
                >
                  {t("myBookings.cancel")}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {previewOpen ? <ImagePreview onClose={() => setPreviewOpen(false)} photoUrls={card.photoUrls} /> : null}
    </article>
  );
};

export default MyBookingsCard;
