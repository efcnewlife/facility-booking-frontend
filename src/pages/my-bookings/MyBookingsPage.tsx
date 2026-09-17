import facilityService from "@/api/services/facilityService";
import PastBookingCard from "@/components/booking/PastBookingCard";
import RecurringSeriesCard from "@/components/booking/RecurringSeriesCard";
import UpcomingBookingCard from "@/components/booking/UpcomingBookingCard";
import BookingHero from "@/components/booking/BookingHero";
import type { MemberBookingListItem, UserBooking } from "@/types/myBookings";
import { format_booking_date } from "@/utils/bookingFormat";
import {
  BOOKING_STATUS,
  groupMyBookings,
  isCancellableOccurrence,
  resolveSeriesDisplayStatus,
  type MyBookingsEntry,
  type RecurringSeriesHoldState,
} from "@/utils/myBookings";
import { Alert, Button, Modal, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

const toUserBooking = (item: MemberBookingListItem): UserBooking => {
  const start = moment(item.startAt);
  const end = moment(item.endAt);
  return {
    id: item.id,
    roomName: item.facilityName || "—",
    date: start.format("YYYY-MM-DD"),
    startTime: start.format("HH:mm"),
    endTime: end.format("HH:mm"),
  };
};

type SeriesHoldMap = Record<string, RecurringSeriesHoldState>;

const fallbackSeriesStatus = (entry: Extract<MyBookingsEntry, { kind: "series" }>): string => {
  if (entry.occurrences.every((occurrence) => occurrence.status === "cancelled")) {
    return "cancelled";
  }
  if (entry.occurrences.some((occurrence) => occurrence.status === "pending_payment")) {
    return "pending_payment";
  }
  if (entry.occurrences.some((occurrence) => occurrence.status === "confirmed")) {
    return "confirmed";
  }
  return entry.occurrences[0]?.status ?? "cancelled";
};

const MyBookingsPage = () => {
  const { t } = useTranslation("booking");
  const navigate = useNavigate();
  const [items, setItems] = useState<MemberBookingListItem[]>([]);
  const [seriesHolds, setSeriesHolds] = useState<SeriesHoldMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [cancelBooking, setCancelBooking] = useState<UserBooking | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await facilityService.listMyBookings();
      setItems(list);
      setNow(new Date());
      const seriesIds = Array.from(
        new Set(
          list
            .filter((item) => Boolean(item.seriesId) && item.status === BOOKING_STATUS.PENDING_PAYMENT)
            .map((item) => item.seriesId as string)
        )
      );
      const holds = await Promise.all(
        seriesIds.map(async (seriesId) => {
          try {
            const detail = await facilityService.getBookingSeries(seriesId);
            return [seriesId, { status: detail.status, paymentHoldExpiresAt: detail.paymentHoldExpiresAt }] as const;
          } catch {
            return [seriesId, null] as const;
          }
        })
      );
      const nextHolds: SeriesHoldMap = {};
      for (const [seriesId, hold] of holds) {
        if (hold) {
          nextHolds[seriesId] = hold;
        }
      }
      setSeriesHolds(nextHolds);
    } catch {
      setItems([]);
      setError(t("myBookings.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
        void loadBookings();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadBookings]);

  const grouped = useMemo(() => groupMyBookings(items, now), [items, now]);

  const seriesDisplayStatus = (entry: Extract<MyBookingsEntry, { kind: "series" }>): string => {
    const hold = seriesHolds[entry.seriesId];
    if (hold) {
      return resolveSeriesDisplayStatus(hold, now);
    }
    return fallbackSeriesStatus(entry);
  };

  const handleCancelOneTime = async () => {
    if (!cancelBooking) {
      return;
    }
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await facilityService.cancelMyBooking(cancelBooking.id);
      setCancelBooking(null);
      await loadBookings();
    } catch {
      setCancelError(t("myBookings.errors.cancel"));
    } finally {
      setCancelSubmitting(false);
    }
  };

  const renderEntry = (entry: MyBookingsEntry, section: "upcoming" | "past") => {
    if (entry.kind === "one_time") {
      const booking = toUserBooking(entry.booking);
      const canCancel = isCancellableOccurrence(entry.booking, now);
      if (section === "past") {
        return <PastBookingCard booking={booking} key={entry.booking.id} />;
      }
      return (
        <UpcomingBookingCard
          booking={booking}
          key={entry.booking.id}
          onCancel={canCancel ? () => setCancelBooking(booking) : undefined}
        />
      );
    }

    const canCancel =
      section === "upcoming" && entry.occurrences.some((occurrence) => isCancellableOccurrence(occurrence, now));
    return (
      <RecurringSeriesCard
        displayStatus={seriesDisplayStatus(entry)}
        entry={entry}
        key={entry.seriesId}
        onCancel={canCancel ? (seriesId) => navigate(`/my-bookings/series/${seriesId}?cancel=1`) : undefined}
        onView={(seriesId) => navigate(`/my-bookings/series/${seriesId}`)}
      />
    );
  };

  return (
    <>
      <BookingHero titleKey="nav.myBookings" />

      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        {loading ? <Spinner showText size="sm" text={t("myBookings.loading")} /> : null}
        {error ? (
          <div className="mb-6 space-y-3">
            <Alert message={error} title={t("startBooking.errors.title")} variant="error" width="full" />
            <Button onClick={() => void loadBookings()} size="sm" variant="outline">
              {t("myBookings.retry")}
            </Button>
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-on-surface">{t("myBookings.upcomingTitle")}</h2>
          {!loading && grouped.upcoming.length === 0 ? (
            <p className="text-sm font-medium text-booking-text">{t("myBookings.noUpcoming")}</p>
          ) : (
            <div className="space-y-4">{grouped.upcoming.map((entry) => renderEntry(entry, "upcoming"))}</div>
          )}
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold text-on-surface">{t("myBookings.pastTitle")}</h2>
          {!loading && grouped.past.length === 0 ? (
            <p className="text-sm font-medium text-booking-text">{t("myBookings.noPast")}</p>
          ) : (
            <div className="space-y-4">{grouped.past.map((entry) => renderEntry(entry, "past"))}</div>
          )}
        </section>
      </main>

      <Modal
        className="mx-4 w-full max-w-md p-6"
        footer={
          <>
            <Button
              onClick={() => {
                setCancelBooking(null);
                setCancelError(null);
              }}
              size="sm"
              variant="outline"
            >
              {t("myBookings.cancelOneTime.close")}
            </Button>
            <Button disabled={cancelSubmitting} onClick={() => void handleCancelOneTime()} size="sm" variant="primary">
              {t("myBookings.cancelOneTime.confirm")}
            </Button>
          </>
        }
        isOpen={Boolean(cancelBooking)}
        onClose={() => {
          setCancelBooking(null);
          setCancelError(null);
        }}
        title={t("myBookings.cancelOneTime.title")}
      >
        <p className="m-0 text-sm text-on-surface-variant">{t("myBookings.cancelOneTime.body")}</p>
        {cancelBooking ? (
          <p className="mt-3 text-sm font-semibold text-on-surface">
            {cancelBooking.roomName} · {format_booking_date(cancelBooking.date)}
          </p>
        ) : null}
        {cancelError ? (
          <p className="mt-3 text-sm font-medium text-error" role="alert">
            {cancelError}
          </p>
        ) : null}
      </Modal>
    </>
  );
};

export default MyBookingsPage;
