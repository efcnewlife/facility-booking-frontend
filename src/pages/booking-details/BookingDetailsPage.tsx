import facilityService from "@/api/services/facilityService";
import { combineDateAndClock } from "@/utils/bookingDateTime";
import { mapPaymentSummary, type PaymentSummaryLabels } from "@/utils/paymentSummary";
import {
  parseBookingDetailsQuery,
  parseRoomsSearchQuery,
  toBookingDetailsSearchParams,
  toRoomsSearchParams,
  type BookingDetailsQuery,
} from "@/utils/startBookingFlow";
import { isRoomAvailable, type RoomDay } from "@/utils/timetableRules";
import { Button, cn, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useSearchParams } from "react-router";

const combineDateAndTime = combineDateAndClock;

const formatClock = (clock: string, locale: string): string => {
  if (clock === "24:00") {
    return moment("00:00", "HH:mm").locale(locale).format("h:mm a");
  }
  return moment(clock, "HH:mm").locale(locale).format("h:mm a");
};

const messageFromUnknown = (err: unknown, fallback: string): string => {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message) {
      return message;
    }
  }
  return fallback;
};

const bookingIntervalIso = (query: BookingDetailsQuery): { startAt: string; endAt: string } => ({
  startAt: combineDateAndTime(query.date, query.start),
  endAt: combineDateAndTime(query.date, query.end),
});

const selectedRoomsCoverInterval = (rooms: RoomDay[], query: BookingDetailsQuery): boolean => {
  const interval = { start: query.start, end: query.end };
  return query.roomIds.every((roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    return room != null && isRoomAvailable(room, interval);
  });
};

const BookingDetailsPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseBookingDetailsQuery(searchParams), [searchParams]);
  const roomsSearch = useMemo(() => parseRoomsSearchQuery(searchParams), [searchParams]);

  const [rooms, setRooms] = useState<RoomDay[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryLabels>(() =>
    mapPaymentSummary(null, i18nInstance.language)
  );
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDraft = useCallback(async () => {
    if (!query) {
      return;
    }
    setLoading(true);
    setError(null);
    setPaymentSummary(mapPaymentSummary(null, i18nInstance.language));
    try {
      const items = await facilityService.getAvailability(query.date, query.ministryId);
      setRooms(items);
    } catch (err) {
      setError(messageFromUnknown(err, t("timetable.loadError")));
      setRooms([]);
    }
    try {
      const { startAt, endAt } = bookingIntervalIso(query);
      const quote = await facilityService.previewQuote({
        ministryId: query.ministryId || null,
        isMissionAligned: Boolean(query.ministryId),
        lines: query.roomIds.map((facilityId) => ({
          facilityId,
          startAt,
          endAt,
        })),
      });
      setPaymentSummary(mapPaymentSummary(quote, i18nInstance.language));
    } catch {
      setPaymentSummary(mapPaymentSummary(null, i18nInstance.language));
    } finally {
      setLoading(false);
    }
  }, [i18nInstance.language, query, t]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  const canConfirm = useMemo(() => {
    if (!query || loading || confirming) {
      return false;
    }
    return selectedRoomsCoverInterval(rooms, query);
  }, [confirming, loading, query, rooms]);

  if (!query) {
    if (!roomsSearch?.date) {
      return <Navigate replace to="/" />;
    }
    return <Navigate replace to={{ pathname: "/rooms", search: toRoomsSearchParams(roomsSearch).toString() }} />;
  }

  const goToTimetable = (next: BookingDetailsQuery | null) => {
    if (!next || next.roomIds.length === 0) {
      navigate({ pathname: "/rooms", search: toRoomsSearchParams(query).toString() });
      return;
    }
    navigate({ pathname: "/rooms", search: toBookingDetailsSearchParams(next).toString() });
  };

  const handleRemove = (roomId: string) => {
    const roomIds = query.roomIds.filter((id) => id !== roomId);
    if (roomIds.length === 0) {
      goToTimetable(null);
      return;
    }
    setSearchParams(toBookingDetailsSearchParams({ ...query, roomIds }), { replace: true });
  };

  const handleConfirm = async () => {
    if (!canConfirm || !query) {
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const { startAt, endAt } = bookingIntervalIso(query);
      const created = await facilityService.createBooking({
        startAt,
        endAt,
        ministryId: query.ministryId || null,
        isMissionAligned: Boolean(query.ministryId),
        rooms: query.roomIds.map((facilityId, index) => ({
          facilityId,
          startAt,
          endAt,
          sequence: index,
        })),
      });
      navigate(`/payment/${created.id}`);
    } catch (err) {
      setError(messageFromUnknown(err, t("timetable.createError")));
    } finally {
      setConfirming(false);
    }
  };

  const formattedDate = moment(query.date).locale(i18nInstance.language).format("dddd, MMMM D, YYYY");
  const formattedInterval = `${formatClock(query.start, i18nInstance.language)} – ${formatClock(query.end, i18nInstance.language)}`;
  const intervalUncovered = !loading && !selectedRoomsCoverInterval(rooms, query);

  return (
    <main className="flex flex-1 justify-center bg-surface-container px-4 py-10">
      <section className="flex w-full max-w-[1200px] flex-col gap-12 rounded-[20px] bg-surface px-6 py-10 sm:flex-row sm:justify-between sm:px-12 sm:pb-12">
        <div className="min-w-0 max-w-[625px] flex-1">
          <h1 className="m-0 mb-6 text-[26px] font-semibold leading-none text-booking-primary">
            {t("bookingDetails.title")}
          </h1>
          {error ? (
            <p className="mb-4 text-sm font-medium text-error" role="alert">
              {error}
            </p>
          ) : null}
          {intervalUncovered ? (
            <p className="mb-4 text-sm font-medium text-error" role="status">
              {t("bookingDetails.unavailable")}
            </p>
          ) : null}
          {loading ? <Spinner className="mb-4" showText size="sm" text={t("startBooking.loading")} /> : null}
          <dl>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
              <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingDetails.date")}</dt>
              <dd className="m-0 text-xl font-normal leading-[26px]">{formattedDate}</dd>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
              <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingDetails.repetition")}</dt>
              <dd className="m-0 text-xl font-normal leading-[26px]">{t("bookingDetails.oneTime")}</dd>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
              <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingDetails.time")}</dt>
              <dd className="m-0 text-xl font-normal leading-[26px]">{formattedInterval}</dd>
            </div>
            <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
              <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingDetails.space")}</dt>
              <dd className="m-0 text-xl font-normal leading-[26px]">
                <div className="flex flex-col gap-4">
                  {query.roomIds.map((roomId, index) => {
                    const room = rooms.find((item) => item.id === roomId);
                    return (
                      <div
                        className={cn(
                          "grid w-full grid-cols-[1fr_auto] items-center gap-4",
                          index > 0 && "border-t border-gray-300 pt-4"
                        )}
                        key={roomId}
                      >
                        <span>{room?.name || roomId}</span>
                        <span className="flex flex-col gap-2">
                          <Button onClick={() => goToTimetable(query)} size="xs" variant="outline">
                            {t("bookingDetails.edit")}
                          </Button>
                          <Button onClick={() => handleRemove(roomId)} size="xs" variant="outline">
                            {t("bookingDetails.remove")}
                          </Button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </dd>
            </div>
          </dl>
        </div>
        <aside className="flex w-full shrink-0 flex-col items-center gap-4 sm:w-[300px]">
          <h2 className="m-0 text-center text-[26px] font-semibold leading-none text-booking-primary">
            {t("bookingDetails.paymentSummary")}
          </h2>
          <div className="flex w-full flex-col items-center gap-[15px] rounded-[10px] border border-booking-grey bg-booking-bg px-[25px] py-10">
            <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
              <span>{t("bookingDetails.rate")}</span>
              <span>{paymentSummary.rate}</span>
            </div>
            <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
              <span>{t("bookingDetails.ministryDiscount")}</span>
              <span>{paymentSummary.ministryDiscount}</span>
            </div>
            <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
              <span>{t("bookingDetails.surcharge")}</span>
              <span>{paymentSummary.surcharge}</span>
            </div>
            <hr className="m-0 w-[260px] border-0 border-t border-gray-300" />
            <div className="flex w-[233px] justify-between text-base font-bold leading-5 text-booking-primary">
              <span>{t("bookingDetails.subtotal")}</span>
              <span>{paymentSummary.subtotal}</span>
            </div>
            <hr className="m-0 w-[260px] border-0 border-t border-gray-300" />
            <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
              <span>{t("bookingDetails.tax")}</span>
              <span>{paymentSummary.tax}</span>
            </div>
            <hr className="m-0 w-[260px] border-0 border-t border-gray-300" />
            <div className="flex w-[233px] justify-between text-base font-bold leading-5 text-booking-primary">
              <span>{t("bookingDetails.total")}</span>
              <span>{paymentSummary.total}</span>
            </div>
            <Button className="mt-1" disabled={!canConfirm} onClick={() => void handleConfirm()}>
              {t("bookingDetails.confirm")}
            </Button>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default BookingDetailsPage;
