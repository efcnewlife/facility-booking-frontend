import facilityService, { BookingDraftNotFoundError } from "@/api/services/facilityService";
import ConfirmBookingTime from "@/components/booking/ConfirmBookingTime";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { bookingTitleFieldFeedback, validateBookingTitle } from "@/utils/bookingTitle";
import type { BookingCartDraft } from "@/utils/bookingCartDraft";
import {
  allLinesCoverAvailability,
  bookingDraftDetailToCartDraft,
  buildCreateBookingDraftPayload,
  buildCreateBookingPayload,
  buildPreviewQuotePayload,
  canAddRoomToDraft,
  removeLineFromDraft,
  replaceLineInDraft,
} from "@/utils/bookingDetailsDraft";
import { mapPaymentSummary, type PaymentSummaryLabels } from "@/utils/paymentSummary";
import { toRoomsSearchParams } from "@/utils/startBookingFlow";
import { saveTimetableCart } from "@/utils/timetableCartStorage";
import { MAX_BOOKING_LINES, type BookingInterval, type RoomDay } from "@/utils/timetableRules";
import { Button, cn, Input, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack, MdPhoto } from "react-icons/md";
import { Navigate, useNavigate, useSearchParams } from "react-router";

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

const BookingDetailsPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutId = searchParams.get("checkoutId");

  const [draft, setDraft] = useState<BookingCartDraft | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rooms, setRooms] = useState<RoomDay[]>([]);
  const [maxBookingLines, setMaxBookingLines] = useState(MAX_BOOKING_LINES);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryLabels>(() =>
    mapPaymentSummary(null, i18nInstance.language)
  );
  const [loading, setLoading] = useState(() => Boolean(checkoutId));
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSequence, setEditingSequence] = useState<number | undefined>(undefined);
  const [confirmStart, setConfirmStart] = useState("");
  const [confirmEnd, setConfirmEnd] = useState("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  const loadDraftDetail = useCallback(async () => {
    if (!checkoutId) {
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    setPaymentSummary(mapPaymentSummary(null, i18nInstance.language));
    try {
      const detail = await facilityService.getBookingDraft(checkoutId);
      setDraft(bookingDraftDetailToCartDraft(detail));
    } catch (err) {
      if (err instanceof BookingDraftNotFoundError) {
        setNotFound(true);
      } else {
        setError(messageFromUnknown(err, t("timetable.loadError")));
        setDraft(null);
      }
      setLoading(false);
    }
  }, [checkoutId, i18nInstance.language, t]);

  useEffect(() => {
    void loadDraftDetail();
  }, [loadDraftDetail]);

  const loadPriceAndAvailability = useCallback(async () => {
    if (!draft) {
      return;
    }
    setLoading(true);
    try {
      const { rooms: items, maxBookingLines: cap } = await facilityService.getAvailability(
        draft.date,
        draft.ministryId
      );
      setRooms(items);
      setMaxBookingLines(cap);
    } catch (err) {
      setError(messageFromUnknown(err, t("timetable.loadError")));
      setRooms([]);
    }
    try {
      const quote = await facilityService.previewQuote(buildPreviewQuotePayload(draft));
      setPaymentSummary(mapPaymentSummary(quote, i18nInstance.language));
    } catch {
      setPaymentSummary(mapPaymentSummary(null, i18nInstance.language));
    } finally {
      setLoading(false);
    }
  }, [draft, i18nInstance.language, t]);

  useEffect(() => {
    void loadPriceAndAvailability();
  }, [loadPriceAndAvailability]);

  const linesAvailable = useMemo(() => {
    if (!draft || rooms.length === 0) {
      return false;
    }
    return allLinesCoverAvailability(rooms, draft);
  }, [draft, rooms]);

  const titleError = validateBookingTitle(title);
  const titleFeedback = bookingTitleFieldFeedback(title, titleTouched, t);

  const canConfirm = useMemo(() => {
    if (!draft || loading || confirming || updating || titleError) {
      return false;
    }
    return linesAvailable;
  }, [confirming, draft, linesAvailable, loading, titleError, updating]);

  if (!checkoutId) {
    return <Navigate replace to="/" />;
  }

  if (notFound) {
    return <NotFoundPage />;
  }

  if (!draft) {
    return (
      <main className="flex flex-1 items-center justify-center bg-surface-container px-4 py-10">
        {error ? (
          <p className="m-0 text-sm font-medium text-error" role="alert">
            {error}
          </p>
        ) : (
          <Spinner showText size="sm" text={t("startBooking.loading")} />
        )}
      </main>
    );
  }

  const goToTimetable = (nextDraft: BookingCartDraft | null) => {
    saveTimetableCart(window.localStorage, nextDraft);
    const target = nextDraft ?? draft;
    navigate({
      pathname: "/rooms",
      search: toRoomsSearchParams({ date: target.date, ministryId: target.ministryId }).toString(),
    });
  };

  const applyDraftUpdate = async (nextDraft: BookingCartDraft) => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await facilityService.updateBookingDraft(checkoutId, buildCreateBookingDraftPayload(nextDraft));
      setDraft(bookingDraftDetailToCartDraft(updated));
    } catch (err) {
      if (err instanceof BookingDraftNotFoundError) {
        setNotFound(true);
      } else {
        setError(messageFromUnknown(err, t("bookingDetails.updateError")));
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = (sequence: number) => {
    const nextDraft = removeLineFromDraft(draft, sequence);
    if (!nextDraft) {
      goToTimetable(null);
      return;
    }
    void applyDraftUpdate(nextDraft);
  };

  const handleOpenEdit = (sequence: number) => {
    const line = draft.lines.find((item) => item.sequence === sequence);
    if (!line || !roomForLine(line.facilityId)) {
      return;
    }
    setEditingSequence(sequence);
    setConfirmStart(line.start);
    setConfirmEnd(line.end);
  };

  const handleCancelEdit = () => {
    setEditingSequence(undefined);
    setConfirmStart("");
    setConfirmEnd("");
  };

  const handleConfirmEdit = (interval: BookingInterval) => {
    const line = draft.lines.find((item) => item.sequence === editingSequence);
    if (!line || editingSequence == null) {
      return;
    }
    const nextDraft = replaceLineInDraft(draft, editingSequence, {
      facilityId: line.facilityId,
      start: interval.start,
      end: interval.end,
    });
    handleCancelEdit();
    void applyDraftUpdate(nextDraft);
  };

  const handleConfirm = async () => {
    if (!canConfirm || !draft) {
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const created = await facilityService.createBooking(buildCreateBookingPayload(draft, title, checkoutId));
      navigate(`/payment/${created.id}`);
    } catch (err) {
      setError(messageFromUnknown(err, t("timetable.createError")));
    } finally {
      setConfirming(false);
    }
  };

  const formattedDate = moment(draft.date).locale(i18nInstance.language).format("dddd, MMMM D, YYYY");
  const linesUncovered = !loading && !linesAvailable;
  const showAddRoom = canAddRoomToDraft(draft, maxBookingLines);

  const roomForLine = (facilityId: string): RoomDay | undefined => {
    return rooms.find((room) => room.id === facilityId);
  };

  const editingLine =
    editingSequence != null ? draft.lines.find((item) => item.sequence === editingSequence) : undefined;
  const editingRoom = editingLine ? roomForLine(editingLine.facilityId) : undefined;

  return (
    <>
      <main className="flex flex-1 justify-center bg-surface-container px-4 py-10">
        <section className="flex w-full max-w-[1200px] flex-col gap-12 rounded-[20px] bg-surface px-6 py-10 sm:flex-row sm:justify-between sm:px-12 sm:pb-12">
          <div className="min-w-0 max-w-[625px] flex-1">
            <Button
              className="mb-4"
              onClick={() => goToTimetable(draft)}
              size="sm"
              startIcon={<MdArrowBack className="size-4" />}
              variant="outline"
            >
              {t("bookingDetails.backToTimetable")}
            </Button>
            <h1 className="m-0 mb-6 text-[26px] font-semibold leading-none text-booking-primary">
              {t("bookingDetails.title")}
            </h1>
            {error ? (
              <p className="mb-4 text-sm font-medium text-error" role="alert">
                {error}
              </p>
            ) : null}
            {linesUncovered ? (
              <p className="mb-4 text-sm font-medium text-error" role="status">
                {t("bookingDetails.unavailable")}
              </p>
            ) : null}
            {loading ? <Spinner className="mb-4" showText size="sm" text={t("startBooking.loading")} /> : null}
            <Input
              error={titleFeedback.error}
              hint={titleFeedback.hint}
              id="booking-title"
              label={t("bookingTitle.label")}
              onChange={(event) => {
                setTitleTouched(true);
                setTitle(event.target.value);
              }}
              placeholder={t("bookingTitle.placeholder")}
              required
              value={title}
              wrapperClassName="mb-6"
            />
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
                <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingDetails.space")}</dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">
                  <div className="flex flex-col gap-4">
                    {draft.lines.map((line, index) => {
                      const room = roomForLine(line.facilityId);
                      const photoUrl = room?.photoUrls[0];
                      return (
                        <div
                          className={cn("flex flex-col gap-3", index > 0 && "border-t border-gray-300 pt-4")}
                          key={line.sequence}
                        >
                          <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded bg-booking-grey">
                              {photoUrl ? (
                                <img alt="" className="size-full object-cover" src={photoUrl} />
                              ) : (
                                <div
                                  aria-hidden
                                  className="flex size-full items-center justify-center text-booking-primary/40"
                                >
                                  <MdPhoto size={24} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="m-0 text-base font-bold text-booking-primary">
                                {room?.name || line.facilityId}
                              </p>
                              <p className="m-0 mt-1 text-sm font-normal text-on-surface-variant">
                                {formatClock(line.start, i18nInstance.language)} –{" "}
                                {formatClock(line.end, i18nInstance.language)}
                              </p>
                            </div>
                            <span className="flex flex-col gap-2">
                              <Button
                                disabled={updating || !room}
                                onClick={() => handleOpenEdit(line.sequence)}
                                size="xs"
                                variant="outline"
                              >
                                {t("bookingDetails.edit")}
                              </Button>
                              <Button
                                disabled={updating}
                                onClick={() => handleRemove(line.sequence)}
                                size="xs"
                                variant="outline"
                              >
                                {t("bookingDetails.remove")}
                              </Button>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {showAddRoom ? (
                      <Button className="mt-2 w-fit" onClick={() => goToTimetable(draft)} size="sm" variant="outline">
                        {t("bookingDetails.addRoom")}
                      </Button>
                    ) : null}
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
      {editingRoom ? (
        <ConfirmBookingTime
          date={draft.date}
          end={confirmEnd}
          onCancel={handleCancelEdit}
          onConfirm={handleConfirmEdit}
          onEndChange={setConfirmEnd}
          onStartChange={setConfirmStart}
          room={editingRoom}
          start={confirmStart}
        />
      ) : null}
    </>
  );
};

export default BookingDetailsPage;
