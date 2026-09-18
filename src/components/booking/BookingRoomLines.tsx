import type { MemberBookingDetailRoom } from "@/utils/bookingDetail";
import { format_booking_time_range } from "@/utils/bookingFormat";
import { formatQuotedAmount } from "@/utils/paymentPage";
import { cn } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useTranslation } from "react-i18next";
import { MdPhoto } from "react-icons/md";

interface BookingRoomLinesProps {
  rooms: MemberBookingDetailRoom[];
  fallbackCurrency: string | null;
  locale: string;
}

const clock = (value: string): string => moment(value).format("HH:mm");

const BILLING_UNIT_KEYS = new Set(["hourly", "daily_flat", "per_slot", "flat_per_booking"]);

const BookingRoomLines = ({ rooms, fallbackCurrency, locale }: BookingRoomLinesProps) => {
  const { t } = useTranslation("booking");

  return (
    <div className="space-y-4">
      <h2 className="m-0 text-xl font-bold text-on-surface">{t("bookingDetail.roomsTitle")}</h2>
      {rooms.map((room) => (
        <div className={cn("grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4")} key={room.id}>
          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded bg-booking-grey">
            {room.photoUrls[0] ? (
              <img alt="" className="size-full object-cover" src={room.photoUrls[0]} />
            ) : (
              <div aria-hidden className="flex size-full items-center justify-center text-booking-primary/40">
                <MdPhoto size={24} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="m-0 text-base font-bold text-booking-primary">{room.facilityName || room.facilityId}</p>
            <p className="m-0 mt-1 text-sm font-normal text-on-surface-variant">
              {format_booking_time_range(clock(room.startAt), clock(room.endAt))}
            </p>
            {room.rentalRateName ? (
              <p className="m-0 mt-1 text-sm text-on-surface-variant">
                {room.rentalRateName}
                {room.unitAmount != null ? (
                  <>
                    {" · "}
                    {formatQuotedAmount(room.unitAmount, room.currency ?? fallbackCurrency, locale)}
                    {room.billingUnit && BILLING_UNIT_KEYS.has(room.billingUnit)
                      ? ` ${t(`bookingDetail.billingUnit.${room.billingUnit}`)}`
                      : ""}
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <span className="text-sm font-bold text-booking-primary">
            {formatQuotedAmount(room.lineSubtotal, room.currency ?? fallbackCurrency, locale)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BookingRoomLines;
