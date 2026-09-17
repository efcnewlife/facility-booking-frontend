import facilityService, {
  BookingSeriesNotFoundError,
  type RecurringBookingSeriesDetail,
} from "@/api/services/facilityService";
import RecurringSeriesCancelModal from "@/components/booking/RecurringSeriesCancelModal";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { formatQuotedAmount } from "@/utils/paymentPage";
import { format_booking_date, format_booking_time_range } from "@/utils/bookingFormat";
import { resolveRecurringBookingSeriesErrorMessage } from "@/utils/recurringBookingErrors";
import {
  getBookingStatusBadgeColor,
  isCancellableOccurrence,
  parseSeriesId,
  resolveOccurrenceDisplayStatus,
  resolveSeriesDisplayStatus,
  SERIES_DISPLAY_STATUS,
  type RecurringCancellationScope,
} from "@/utils/myBookings";
import { Alert, Badge, Button, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router";

const CANCEL_QUERY_KEY = "cancel";

const occurrenceClock = (value: string): string => moment(value).format("HH:mm");

const RecurringSeriesDetailPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const { seriesId: seriesIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesId = useMemo(() => parseSeriesId(seriesIdParam), [seriesIdParam]);
  const [series, setSeries] = useState<RecurringBookingSeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [cancelOpen, setCancelOpen] = useState(searchParams.get(CANCEL_QUERY_KEY) === "1");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccessCount, setCancelSuccessCount] = useState<number | null>(null);
  const [cancelSuccessStarts, setCancelSuccessStarts] = useState<string[]>([]);

  const loadSeries = useCallback(async () => {
    if (!seriesId) {
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const detail = await facilityService.getBookingSeries(seriesId);
      setSeries(detail);
      setNow(new Date());
    } catch (err) {
      if (err instanceof BookingSeriesNotFoundError) {
        setNotFound(true);
        return;
      }
      setSeries(null);
      setError(resolveRecurringBookingSeriesErrorMessage(err, "booking:myBookings.detail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNow(new Date());
        void loadSeries();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadSeries]);

  const closeCancel = () => {
    setCancelOpen(false);
    setCancelError(null);
    setCancelSuccessCount(null);
    setCancelSuccessStarts([]);
    if (searchParams.get(CANCEL_QUERY_KEY) === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete(CANCEL_QUERY_KEY);
      setSearchParams(next, { replace: true });
    }
  };

  const handleCancel = async (scope: RecurringCancellationScope, occurrenceId: string | null) => {
    if (!seriesId) {
      return;
    }
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      const updated = await facilityService.cancelBookingSeries(seriesId, { scope, occurrenceId });
      const previous = series;
      const cancelled = previous
        ? previous.occurrences.filter((occurrence) => {
            const next = updated.occurrences.find((item) => item.id === occurrence.id);
            return next != null && occurrence.status !== "cancelled" && next.status === "cancelled";
          })
        : updated.occurrences.filter((occurrence) => occurrence.status === "cancelled");
      setSeries(updated);
      setNow(new Date());
      setCancelSuccessCount(cancelled.length);
      setCancelSuccessStarts(cancelled.map((occurrence) => occurrence.startAt));
    } catch (err) {
      setCancelError(resolveRecurringBookingSeriesErrorMessage(err, "booking:myBookings.errors.cancel"));
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (!seriesId || notFound) {
    return <NotFoundPage />;
  }

  const displayStatus = series ? resolveSeriesDisplayStatus(series, now) : SERIES_DISPLAY_STATUS.PENDING_PAYMENT;
  const canCancel = Boolean(series?.occurrences.some((occurrence) => isCancellableOccurrence(occurrence, now)));
  const holdLabel = series?.paymentHoldExpiresAt ? moment(series.paymentHoldExpiresAt).format("LLL") : "—";

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
      <Button onClick={() => navigate("/my-bookings")} size="sm" variant="outline">
        {t("myBookings.detail.back")}
      </Button>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-3xl font-bold text-on-surface">{t("myBookings.detail.title")}</h1>
        {series ? (
          <Badge color={getBookingStatusBadgeColor(displayStatus)}>
            {t(`myBookings.status.${displayStatus}`, { defaultValue: displayStatus })}
          </Badge>
        ) : null}
      </div>

      {loading ? <Spinner className="mt-8" showText size="sm" text={t("myBookings.loading")} /> : null}
      {error ? (
        <p className="mt-6 text-sm font-medium text-error" role="alert">
          {error}
        </p>
      ) : null}

      {series && !loading ? (
        <section className="mt-8 space-y-6">
          {displayStatus === SERIES_DISPLAY_STATUS.EXPIRED ? (
            <Alert
              message={t("myBookings.detail.holdExpired")}
              title={t(`myBookings.status.${SERIES_DISPLAY_STATUS.EXPIRED}`)}
              variant="error"
              width="full"
            />
          ) : null}
          {displayStatus === SERIES_DISPLAY_STATUS.PENDING_PAYMENT ? (
            <Alert
              message={t("myBookings.detail.pendingPayment", { deadline: holdLabel })}
              title={t(`myBookings.status.${SERIES_DISPLAY_STATUS.PENDING_PAYMENT}`)}
              variant="info"
              width="full"
            />
          ) : null}

          <dl className="grid grid-cols-1 gap-4 rounded-[20px] bg-surface p-6 shadow-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("myBookings.fields.range")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {format_booking_date(series.firstOccurrenceDate)} – {format_booking_date(series.lastOccurrenceDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("myBookings.fields.time")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {format_booking_time_range(series.localStartTime.slice(0, 5), series.localEndTime.slice(0, 5))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("myBookings.fields.total")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {formatQuotedAmount(series.quotedAmount, series.currency, i18nInstance.language)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("myBookings.fields.holdDeadline")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">{holdLabel}</dd>
            </div>
          </dl>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-2xl font-bold text-on-surface">{t("myBookings.detail.occurrencesTitle")}</h2>
              {canCancel ? (
                <Button onClick={() => setCancelOpen(true)} size="sm" variant="outline">
                  {t("myBookings.cancel")}
                </Button>
              ) : null}
            </div>
            <ul className="mt-4 space-y-3">
              {series.occurrences.map((occurrence) => {
                const occurrenceStatus = resolveOccurrenceDisplayStatus(occurrence, series, now);
                return (
                  <li className="rounded-[16px] bg-surface p-5 shadow-sm" key={occurrence.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="m-0 text-lg font-bold text-on-surface">
                          {format_booking_date(moment(occurrence.startAt).format("YYYY-MM-DD"))}
                        </p>
                        <p className="mt-1 text-sm text-booking-text">
                          {format_booking_time_range(
                            occurrenceClock(occurrence.startAt),
                            occurrenceClock(occurrence.endAt)
                          )}
                        </p>
                      </div>
                      <Badge color={getBookingStatusBadgeColor(occurrenceStatus)} size="sm">
                        {t(`myBookings.status.${occurrenceStatus}`, { defaultValue: occurrenceStatus })}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {series ? (
        <RecurringSeriesCancelModal
          error={cancelError}
          isOpen={cancelOpen}
          now={now}
          occurrences={series.occurrences}
          onClose={closeCancel}
          onConfirm={(scope, occurrenceId) => {
            void handleCancel(scope, occurrenceId);
          }}
          submitting={cancelSubmitting}
          successCount={cancelSuccessCount}
          successStarts={cancelSuccessStarts}
        />
      ) : null}
    </main>
  );
};

export default RecurringSeriesDetailPage;
