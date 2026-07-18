import type { UserBooking } from "@/types/myBookings";
import { format_booking_date, format_booking_time_range } from "@/utils/bookingFormat";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface PastBookingCardProps {
  booking: UserBooking;
  className?: string;
}

const PastBookingCard = ({ booking, className }: PastBookingCardProps) => {
  const { t } = useTranslation("booking");

  return (
    <article className={cn("rounded-[20px] bg-surface p-8 shadow-sm", className)}>
      <div className="flex items-center gap-8">
        <div className="h-[121px] w-[207px] shrink-0 rounded-sm bg-booking-text" />

        <div className="flex min-w-0 flex-1 gap-10 lg:gap-16">
          <div className="w-[140px] shrink-0">
            <p className="text-xs font-medium text-booking-text">{t("myBookings.fields.room")}</p>
            <p className="mt-1 text-xl font-bold text-on-surface">{booking.roomName}</p>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-booking-text">{t("myBookings.fields.date")}</p>
            <p className="mt-1 text-xl font-bold text-on-surface">{format_booking_date(booking.date)}</p>

            <p className="mt-5 text-xs font-medium text-booking-text">{t("myBookings.fields.time")}</p>
            <p className="mt-1 text-xl font-bold text-on-surface">
              {format_booking_time_range(booking.startTime, booking.endTime)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PastBookingCard;
