import type { UserBooking } from "@/types/myBookings";
import { format_booking_date, format_booking_time_range } from "@/utils/bookingFormat";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdEditDocument } from "react-icons/md";

interface UpcomingBookingCardProps {
  booking: UserBooking;
  onChange?: (booking: UserBooking) => void;
  onCancel?: (booking: UserBooking) => void;
  className?: string;
}

const UpcomingBookingCard = ({ booking, onChange, onCancel, className }: UpcomingBookingCardProps) => {
  const { t } = useTranslation("booking");

  return (
    <article className={cn("rounded-[20px] bg-booking-primary p-8 shadow-sm", className)}>
      <div className="flex gap-8">
        <div className="flex w-[207px] shrink-0 flex-col self-stretch">
          <div className="h-[121px] w-full rounded-sm bg-booking-grey" />
          <button
            className="mt-auto self-start pt-6 text-base font-bold text-white underline underline-offset-2"
            onClick={() => onCancel?.(booking)}
            type="button"
          >
            {t("myBookings.cancel")}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-6">
            <div className="flex min-w-0 flex-1 gap-10 lg:gap-16">
              <div className="w-[140px] shrink-0">
                <p className="text-xs font-medium text-booking-grey">{t("myBookings.fields.room")}</p>
                <p className="mt-1 text-xl font-bold text-white">{booking.roomName}</p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-booking-grey">{t("myBookings.fields.date")}</p>
                <p className="mt-1 text-xl font-bold text-white">{format_booking_date(booking.date)}</p>

                <p className="mt-5 text-xs font-medium text-booking-grey">{t("myBookings.fields.time")}</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {format_booking_time_range(booking.startTime, booking.endTime)}
                </p>
              </div>
            </div>

            <button
              className="h-9 shrink-0 rounded-[21px] border border-primary bg-surface px-4 text-base font-bold text-primary transition-colors hover:bg-brand-50"
              onClick={() => onChange?.(booking)}
              type="button"
            >
              {t("myBookings.change")}
            </button>
          </div>

          {booking.note && (
            <div className="mt-6">
              <p className="text-xs font-medium text-booking-grey">{t("myBookings.fields.note")}</p>
              <div className="relative mt-1">
                <div className="flex min-h-[45px] items-center rounded-sm bg-booking-light-grey px-4 py-2 pr-12 text-base font-medium text-booking-text">
                  {booking.note}
                </div>
                <MdEditDocument
                  aria-hidden
                  className="absolute right-3 top-1/2 size-6 -translate-y-1/2 text-booking-text"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default UpcomingBookingCard;
