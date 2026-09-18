import facilityService, {
  BookingSeriesNotFoundError,
  type RecurringBookingSeriesDetail,
} from "@/api/services/facilityService";
import EditTitleModal from "@/components/booking/EditTitleModal";
import PaymentInstructionsPanel from "@/components/booking/PaymentInstructionsPanel";
import RecurringSeriesCancelModal from "@/components/booking/RecurringSeriesCancelModal";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { canShowPaymentInstructions } from "@/utils/bookingDetail";
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
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [editTitleSubmitting, setEditTitleSubmitting] = useState(false);
  const [editTitleError, setEditTitleError] = useState<string | null>(null);

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

  const handleCancel = async (scope: RecurringCancellationScope, occurrenceId: string | null, cancelReason: string) => {
    if (!seriesId) {
      return;
    }
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      const updated = await facilityService.cancelBookingSeries(seriesId, { scope, occurrenceId, cancelReason });
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

  const handleConfirmEditTitle = async (title: string) => {
    if (!seriesId) {
      return;
    }
    setEditTitleSubmitting(true);
    setEditTitleError(null);
    try {
      const updated = await facilityService.updateBookingSeriesTitle(seriesId, title);
      setSeries(updated);
      setEditTitleOpen(false);
    } catch (err) {
      setEditTitleError(resolveRecurringBookingSeriesErrorMessage(err, "bookingDetail.editTitle.error"));
    } finally {
      setEditTitleSubmitting(false);
    }
  };

  if (!seriesId || notFound) {
    return <NotFoundPage />;
  }

  const displayStatus = series ? resolveSeriesDisplayStatus(series, now) : SERIES_DISPLAY_STATUS.PENDING_PAYMENT;
  const canCancel = Boolean(series?.occurrences.some((occurrence) => isCancellableOccurrence(occurrence, now)));
  const holdLabel = series?.paymentHoldExpiresAt ? moment(series.paymentHoldExpiresAt).format("LLL") : "—";
  const showPaymentInstructions = series != null && canShowPaymentInstructions(series, now);

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
      <Button onClick={() => navigate("/my-bookings")} size="sm" variant="outline">
        {t("myBookings.detail.back")}
      </Button>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-3xl font-bold text-on-surface">{series?.title || t("myBookings.detail.title")}</h1>
        {series ? (
          <Badge color={getBookingStatusBadgeColor(displayStatus)}>
            {t(`myBookings.status.${displayStatus}`, { defaultValue: displayStatus })}
          </Badge>
        ) : null}
        {series?.isViewOnly ? (
          <Badge color="info" size="sm">
            {t("myBookings.viewOnlyBadge")}
          </Badge>
        ) : null}
        {series?.actions.canEditTitle ? (
          <Button onClick={() => setEditTitleOpen(true)} size="sm" variant="outline">
            {t("bookingDetail.editTitle.action")}
          </Button>
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
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("bookingDetail.booker")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {series.bookerDisplayName || "—"}
                {series.bookerEmail ? (
                  <span className="ml-2 text-sm font-normal text-booking-text">{series.bookerEmail}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("bookingDetail.ministry")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {series.ministryName || t("bookingDetail.nonMinistry")}
              </dd>
            </div>
            {series.remark ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-booking-text">{t("myBookings.fields.note")}</dt>
                <dd className="mt-1 text-base text-on-surface">{series.remark}</dd>
              </div>
            ) : null}
          </dl>

          {showPaymentInstructions ? (
            <div className="rounded-[20px] bg-surface p-6 shadow-sm">
              <PaymentInstructionsPanel
                totalLabel={formatQuotedAmount(series.quotedAmount, series.currency, i18nInstance.language)}
              />
            </div>
          ) : null}

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
                      <div className="flex items-center gap-3">
                        <Badge color={getBookingStatusBadgeColor(occurrenceStatus)} size="sm">
                          {t(`myBookings.status.${occurrenceStatus}`, { defaultValue: occurrenceStatus })}
                        </Badge>
                        <Button onClick={() => navigate(`/my-bookings/${occurrence.id}`)} size="xs" variant="outline">
                          {t("myBookings.viewDetail")}
                        </Button>
                      </div>
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
          onConfirm={(scope, occurrenceId, cancelReason) => {
            void handleCancel(scope, occurrenceId, cancelReason);
          }}
          submitting={cancelSubmitting}
          successCount={cancelSuccessCount}
          successStarts={cancelSuccessStarts}
        />
      ) : null}

      {series ? (
        <EditTitleModal
          error={editTitleError}
          initialTitle={series.title}
          isOpen={editTitleOpen}
          onClose={() => {
            setEditTitleOpen(false);
            setEditTitleError(null);
          }}
          onConfirm={(title) => void handleConfirmEditTitle(title)}
          submitting={editTitleSubmitting}
        />
      ) : null}
    </main>
  );
};

export default RecurringSeriesDetailPage;
