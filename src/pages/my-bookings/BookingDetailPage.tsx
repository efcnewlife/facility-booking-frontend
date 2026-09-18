import facilityService, { BookingNotFoundError, type MemberBookingDetail } from "@/api/services/facilityService";
import BookingRoomLines from "@/components/booking/BookingRoomLines";
import BookingTimelineList from "@/components/booking/BookingTimelineList";
import EditTitleModal from "@/components/booking/EditTitleModal";
import OneTimeCancelModal from "@/components/booking/OneTimeCancelModal";
import PaymentInstructionsPanel from "@/components/booking/PaymentInstructionsPanel";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { bookAgainRoomsSearchParams, canShowPaymentInstructions, parseBookingDetailId } from "@/utils/bookingDetail";
import { format_booking_date, format_booking_time_range } from "@/utils/bookingFormat";
import { formatQuotedAmount } from "@/utils/paymentPage";
import { resolveRecurringBookingSeriesErrorMessage } from "@/utils/recurringBookingErrors";
import { getBookingStatusBadgeColor, resolveSeriesDisplayStatus } from "@/utils/myBookings";
import { Alert, Badge, Button, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

const occurrenceClock = (value: string): string => moment(value).format("HH:mm");

const BookingDetailPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const { bookingId: bookingIdParam } = useParams();
  const bookingId = parseBookingDetailId(bookingIdParam);

  const [detail, setDetail] = useState<MemberBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [editTitleSubmitting, setEditTitleSubmitting] = useState(false);
  const [editTitleError, setEditTitleError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!bookingId) {
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const result = await facilityService.getMyBooking(bookingId);
      setDetail(result);
      setNow(new Date());
    } catch (err) {
      if (err instanceof BookingNotFoundError) {
        setNotFound(true);
        return;
      }
      setDetail(null);
      setError(resolveRecurringBookingSeriesErrorMessage(err, "myBookings.detail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const handleConfirmEditTitle = async (title: string) => {
    if (!bookingId) {
      return;
    }
    setEditTitleSubmitting(true);
    setEditTitleError(null);
    try {
      const updated = await facilityService.updateMyBookingTitle(bookingId, title);
      setDetail(updated);
      setEditTitleOpen(false);
    } catch (err) {
      setEditTitleError(resolveRecurringBookingSeriesErrorMessage(err, "bookingDetail.editTitle.error"));
    } finally {
      setEditTitleSubmitting(false);
    }
  };

  const handleConfirmCancel = async (cancelReason: string) => {
    if (!bookingId) {
      return;
    }
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await facilityService.cancelMyBooking(bookingId, cancelReason);
      setCancelOpen(false);
      await loadDetail();
    } catch (err) {
      setCancelError(resolveRecurringBookingSeriesErrorMessage(err, "myBookings.errors.cancel"));
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (!bookingId || notFound) {
    return <NotFoundPage />;
  }

  if (!detail) {
    return (
      <main className="flex flex-1 items-center justify-center bg-surface-container px-4 py-10">
        {error ? (
          <p className="m-0 text-sm font-medium text-error" role="alert">
            {error}
          </p>
        ) : (
          <Spinner showText size="sm" text={t("myBookings.loading")} />
        )}
      </main>
    );
  }

  const displayStatus = resolveSeriesDisplayStatus(detail, now);
  const showPaymentInstructions = canShowPaymentInstructions(detail, now);
  const bookAgainDate = detail.actions.bookAgainDate;

  return (
    <>
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <Button onClick={() => navigate("/my-bookings")} size="sm" variant="outline">
          {t("myBookings.detail.back")}
        </Button>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-3xl font-bold text-on-surface">{detail.title || t("myBookings.untitled")}</h1>
          <Badge color={getBookingStatusBadgeColor(displayStatus)}>
            {t(`myBookings.status.${displayStatus}`, { defaultValue: displayStatus })}
          </Badge>
          {detail.isViewOnly ? (
            <Badge color="info" size="sm">
              {t("myBookings.viewOnlyBadge")}
            </Badge>
          ) : null}
          {detail.actions.canEditTitle ? (
            <Button onClick={() => setEditTitleOpen(true)} size="sm" variant="outline">
              {t("bookingDetail.editTitle.action")}
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 text-sm font-medium text-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <Spinner className="mt-8" showText size="sm" text={t("myBookings.loading")} /> : null}

        <section className="mt-8 space-y-6">
          {displayStatus === "expired" ? (
            <Alert
              message={t("myBookings.detail.holdExpired")}
              title={t("myBookings.status.expired")}
              variant="error"
              width="full"
            />
          ) : null}
          {displayStatus === "pending_payment" ? (
            <Alert
              message={t("myBookings.detail.pendingPayment", {
                deadline: detail.paymentHoldExpiresAt ? moment(detail.paymentHoldExpiresAt).format("LLL") : "—",
              })}
              title={t("myBookings.status.pending_payment")}
              variant="info"
              width="full"
            />
          ) : null}

          <dl className="grid grid-cols-1 gap-4 rounded-[20px] bg-surface p-6 shadow-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("myBookings.fields.date")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {format_booking_date(moment(detail.startAt).format("YYYY-MM-DD"))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("myBookings.fields.time")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {format_booking_time_range(occurrenceClock(detail.startAt), occurrenceClock(detail.endAt))}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("bookingDetail.booker")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {detail.bookerDisplayName || "—"}
                {detail.bookerEmail ? (
                  <span className="ml-2 text-sm font-normal text-booking-text">{detail.bookerEmail}</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-booking-text">{t("bookingDetail.ministry")}</dt>
              <dd className="mt-1 text-lg font-bold text-on-surface">
                {detail.ministryName || t("bookingDetail.nonMinistry")}
              </dd>
            </div>
            {detail.remark ? (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-booking-text">{t("myBookings.fields.note")}</dt>
                <dd className="mt-1 text-base text-on-surface">{detail.remark}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex flex-col gap-6 rounded-[20px] bg-surface p-6 shadow-sm sm:flex-row sm:justify-between">
            <div className="min-w-0 flex-1">
              <BookingRoomLines
                fallbackCurrency={detail.currency}
                locale={i18nInstance.language}
                rooms={detail.rooms}
              />
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-2 sm:w-[260px]">
              <h2 className="m-0 text-xl font-bold text-on-surface">{t("bookingDetail.priceSummary.title")}</h2>
              <div className="flex justify-between text-sm text-on-surface">
                <span>{t("bookingDetail.priceSummary.subtotal")}</span>
                <span>{formatQuotedAmount(detail.subtotalAmount, detail.currency, i18nInstance.language)}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface">
                <span>{t("bookingDetail.priceSummary.discount")}</span>
                <span>
                  {detail.discountAmount != null
                    ? `-${formatQuotedAmount(detail.discountAmount, detail.currency, i18nInstance.language)}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm text-on-surface">
                <span>{t("bookingDetail.priceSummary.surcharge")}</span>
                <span>{formatQuotedAmount(detail.surchargeAmount, detail.currency, i18nInstance.language)}</span>
              </div>
              <hr className="m-0 border-t border-gray-300" />
              <div className="flex justify-between text-base font-bold text-on-surface">
                <span>{t("bookingDetail.priceSummary.total")}</span>
                <span>{formatQuotedAmount(detail.quotedAmount, detail.currency, i18nInstance.language)}</span>
              </div>
            </aside>
          </div>

          {showPaymentInstructions ? (
            <div className="rounded-[20px] bg-surface p-6 shadow-sm">
              <PaymentInstructionsPanel
                totalLabel={formatQuotedAmount(detail.quotedAmount, detail.currency, i18nInstance.language)}
              />
            </div>
          ) : null}

          <BookingTimelineList events={detail.timeline} locale={i18nInstance.language} />

          <div className="flex flex-wrap gap-3">
            {detail.actions.canCancel ? (
              <Button onClick={() => setCancelOpen(true)} size="sm" variant="outline">
                {t("myBookings.cancel")}
              </Button>
            ) : null}
            {detail.actions.canBookAgain && bookAgainDate ? (
              <Button
                onClick={() =>
                  navigate({ pathname: "/rooms", search: bookAgainRoomsSearchParams(bookAgainDate).toString() })
                }
                size="sm"
                variant="primary"
              >
                {t("bookingDetail.bookAgain")}
              </Button>
            ) : null}
          </div>
        </section>
      </main>

      <EditTitleModal
        error={editTitleError}
        initialTitle={detail.title}
        isOpen={editTitleOpen}
        onClose={() => {
          setEditTitleOpen(false);
          setEditTitleError(null);
        }}
        onConfirm={(title) => void handleConfirmEditTitle(title)}
        submitting={editTitleSubmitting}
      />

      <OneTimeCancelModal
        booking={{ title: detail.title, startAt: detail.startAt }}
        error={cancelError}
        isOpen={cancelOpen}
        onClose={() => {
          setCancelOpen(false);
          setCancelError(null);
        }}
        onConfirm={(cancelReason) => void handleConfirmCancel(cancelReason)}
        submitting={cancelSubmitting}
      />
    </>
  );
};

export default BookingDetailPage;
