import type { MemberBookingTimelineEvent } from "@/utils/bookingDetail";
import { timelineEventLabelKey } from "@/utils/bookingDetail";
import moment from "moment";
import { useTranslation } from "react-i18next";

interface BookingTimelineListProps {
  events: MemberBookingTimelineEvent[];
  locale: string;
}

const BookingTimelineList = ({ events, locale }: BookingTimelineListProps) => {
  const { t } = useTranslation("booking");

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[20px] bg-surface p-6 shadow-sm">
      <h2 className="m-0 text-xl font-bold text-on-surface">{t("bookingDetail.timelineTitle")}</h2>
      <ul className="mt-4 space-y-3">
        {events.map((event, index) => (
          <li className="flex flex-wrap items-center justify-between gap-2 text-sm" key={`${event.kind}-${index}`}>
            <span className="font-medium text-on-surface">{t(timelineEventLabelKey(event.kind))}</span>
            <span className="text-booking-text">{moment(event.occurredAt).locale(locale).format("LLL")}</span>
            {event.reason ? <span className="w-full text-booking-text">{event.reason}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BookingTimelineList;
