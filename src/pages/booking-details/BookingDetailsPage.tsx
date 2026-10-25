import facilityService, { BookingDraftNotFoundError, type OverrideReview } from "@/api/services/facilityService";
import BookingConflictList from "@/components/booking/BookingConflictList";
import ConfirmBookingTime from "@/components/booking/ConfirmBookingTime";
import OverrideConfirmDialog from "@/components/booking/OverrideConfirmDialog";
import PaymentSummaryCard from "@/components/booking/PaymentSummaryCard";
import OverrideImpactList from "@/components/booking/OverrideImpactList";
import OverrideSelectionDialog from "@/components/booking/OverrideSelectionDialog";
import PersonalPriorityReminder from "@/components/booking/PersonalPriorityReminder";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { clockFromDateTime } from "@/utils/bookingDateTime";
import { validateBookingTitle } from "@/utils/bookingTitle";
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
import { discountLabelKey } from "@/utils/discountEligibility";
import { bookingConfirmationTarget } from "@/utils/freeMinistryBooking";
import { finalConfirmationRejection } from "@/utils/overrideReviewErrors";
import { mapPaymentSummary, type PaymentSummaryLabels } from "@/utils/paymentSummary";
import { toRoomsSearchParams } from "@/utils/startBookingFlow";
import { saveTimetableCart } from "@/utils/timetableCartStorage";
import {
  intervalIncludesOverride,
  MAX_BOOKING_LINES,
  type BookingInterval,
  type RoomDay,
} from "@/utils/timetableRules";
import { Button, cn, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack, MdPhoto } from "react-icons/md";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { parseBookingDetailsRoute } from "@/utils/bookingDetailsPath";
import RepeatedBookingDetailsPage from "@/pages/booking-details/RepeatedBookingDetailsPage";

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

const reviewFromDraft = ({
  isConfirmable,
  conflicts,
  overrideImpacts,
  overrideReviewToken,
}: OverrideReview): OverrideReview => ({ isConfirmable, conflicts, overrideImpacts, overrideReviewToken });

const BookingDetailsPage = () => {
  const location = useLocation();
  const route = parseBookingDetailsRoute(location.pathname);

  if (route?.kind === "repeated") {
    return <RepeatedBookingDetailsPage draftId={route.draftId} />;
  }

  return <OneTimeBookingDetailsPage />;
};

const OneTimeBookingDetailsPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const { draftId } = useParams();

  const [draft, setDraft] = useState<BookingCartDraft | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rooms, setRooms] = useState<RoomDay[]>([]);
  const [maxBookingLines, setMaxBookingLines] = useState(MAX_BOOKING_LINES);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryLabels>(() =>
    mapPaymentSummary(null, i18nInstance.language)
  );
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => Boolean(draftId));
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSequence, setEditingSequence] = useState<number | undefined>(undefined);
  const [confirmStart, setConfirmStart] = useState("");
  const [confirmEnd, setConfirmEnd] = useState("");
  const [review, setReview] = useState<OverrideReview | null>(null);
  const [isFreeMinistry, setIsFreeMinistry] = useState(false);
  const [finalOverrideOpen, setFinalOverrideOpen] = useState(false);
  const [pendingOverrideEdit, setPendingOverrideEdit] = useState<{
    sequence: number;
    facilityId: string;
    interval: BookingInterval;
  } | null>(null);

  const loadDraftDetail = useCallback(async (): Promise<boolean> => {
    if (!draftId) {
      return false;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    setPaymentSummary(mapPaymentSummary(null, i18nInstance.language));
    try {
      const detail = await facilityService.getBookingDraft(draftId);
      setDraft(bookingDraftDetailToCartDraft(detail));
      setReview(reviewFromDraft(detail));
      setIsFreeMinistry(detail.isFreeMinistry);
      return true;
    } catch (err) {
      if (err instanceof BookingDraftNotFoundError) {
        setNotFound(true);
      } else {
        setError(messageFromUnknown(err, t("timetable.loadError")));
        setDraft(null);
      }
      setLoading(false);
      return false;
    }
  }, [draftId, i18nInstance.language, t]);

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

  useEffect(() => {
    if (!draft) {
      return;
    }
    let cancelled = false;
    facilityService
      .getDiscountEligibility({ bookingType: "one_time", ministryId: draft.ministryId || null })
      .then((result) => {
        if (!cancelled) {
          setDiscountCode(result.discountCode);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDiscountCode(null);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.ministryId]);

  // A Ministry Draft's availability marks eligible Override time; the Draft evaluation decides confirmability.
  const allowOverride = Boolean(draft?.ministryId);

  const linesAvailable = useMemo(() => {
    if (!draft || rooms.length === 0) {
      return false;
    }
    return allLinesCoverAvailability(rooms, draft, allowOverride);
  }, [allowOverride, draft, rooms]);

  const overrideImpacts = review?.overrideImpacts ?? [];
  const reviewConfirmable = Boolean(
    review?.isConfirmable && (overrideImpacts.length === 0 || review.overrideReviewToken)
  );

  const canConfirm = useMemo(() => {
    if (!draft || loading || confirming || updating || validateBookingTitle(draft.title ?? "")) {
      return false;
    }
    return linesAvailable && reviewConfirmable;
  }, [confirming, draft, linesAvailable, loading, reviewConfirmable, updating]);

  if (!draftId) {
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
    navigate(
      {
        pathname: "/rooms",
        search: toRoomsSearchParams({ date: target.date, ministryId: target.ministryId }).toString(),
      },
      { state: { draftId } }
    );
  };

  const applyDraftUpdate = async (nextDraft: BookingCartDraft) => {
    setUpdating(true);
    setError(null);
    try {
      const updated = await facilityService.updateBookingDraft(draftId, buildCreateBookingDraftPayload(nextDraft));
      setDraft(bookingDraftDetailToCartDraft(updated));
      setReview(reviewFromDraft(updated));
      setIsFreeMinistry(updated.isFreeMinistry);
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

  const applyLineEdit = (sequence: number, facilityId: string, interval: BookingInterval) => {
    const nextDraft = replaceLineInDraft(draft, sequence, {
      facilityId,
      start: interval.start,
      end: interval.end,
    });
    void applyDraftUpdate(nextDraft);
  };

  const handleConfirmEdit = (interval: BookingInterval) => {
    const line = draft.lines.find((item) => item.sequence === editingSequence);
    const room = line ? roomForLine(line.facilityId) : undefined;
    if (!line || editingSequence == null) {
      return;
    }
    handleCancelEdit();
    if (allowOverride && room && intervalIncludesOverride(room, interval)) {
      setPendingOverrideEdit({ sequence: line.sequence, facilityId: line.facilityId, interval });
      return;
    }
    applyLineEdit(line.sequence, line.facilityId, interval);
  };

  const handleAcceptOverrideEdit = () => {
    if (!pendingOverrideEdit) {
      return;
    }
    setPendingOverrideEdit(null);
    applyLineEdit(pendingOverrideEdit.sequence, pendingOverrideEdit.facilityId, pendingOverrideEdit.interval);
  };

  const submitBooking = async (overrideReviewToken: string | null) => {
    setConfirming(true);
    setError(null);
    try {
      const created = await facilityService.createBooking(
        buildCreateBookingPayload(draft, draft.title ?? "", draftId, overrideReviewToken)
      );
      const target = bookingConfirmationTarget("one-time", created.id, isFreeMinistry);
      navigate(target.path, { state: target.state });
    } catch (err) {
      const rejection = finalConfirmationRejection(err);
      if (!rejection) {
        setError(messageFromUnknown(err, t("timetable.createError")));
        return;
      }
      // A stale review or new occupant needs a fresh evaluation and a renewed acknowledgement, never a retry.
      setFinalOverrideOpen(false);
      if (await loadDraftDetail()) {
        setError(t(rejection === "review" ? "override.errors.reviewChanged" : "override.errors.conflict"));
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleConfirm = () => {
    if (!canConfirm || !draft) {
      return;
    }
    if (overrideImpacts.length > 0) {
      setFinalOverrideOpen(true);
      return;
    }
    void submitBooking(null);
  };

  const handleConfirmOverride = () => {
    if (confirming || !review?.overrideReviewToken) {
      return;
    }
    void submitBooking(review.overrideReviewToken);
  };

  const formattedDate = moment(draft.date).locale(i18nInstance.language).format("dddd, MMMM D, YYYY");
  const linesUncovered = !loading && !linesAvailable;
  const showAddRoom = canAddRoomToDraft(draft, maxBookingLines);

  const roomForLine = (facilityId: string): RoomDay | undefined => {
    return rooms.find((room) => room.id === facilityId);
  };

  const roomName = (facilityId: string): string | null => roomForLine(facilityId)?.name ?? null;

  const formatTimeRange = (startAt: string, endAt: string): string =>
    `${formatClock(clockFromDateTime(draft.date, startAt), i18nInstance.language)} – ${formatClock(
      clockFromDateTime(draft.date, endAt),
      i18nInstance.language
    )}`;

  const impactList = (
    <OverrideImpactList formatTimeRange={formatTimeRange} impacts={overrideImpacts} roomName={roomName} />
  );

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
            <PersonalPriorityReminder className="mb-6" ministryId={draft.ministryId} scope="booking" />
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
            <dl>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 py-4">
                <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingTitle.label")}</dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">{draft.title}</dd>
              </div>
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
            {review && review.conflicts.length > 0 ? (
              <div className="mt-4">
                <BookingConflictList
                  conflicts={review.conflicts}
                  formatTimeRange={formatTimeRange}
                  roomName={roomName}
                />
              </div>
            ) : null}
            {overrideImpacts.length > 0 ? <div className="mt-4">{impactList}</div> : null}
          </div>
          <PaymentSummaryCard discountLabel={t(discountLabelKey(discountCode))} summary={paymentSummary}>
            <Button className="mt-1" disabled={!canConfirm} onClick={handleConfirm}>
              {t("bookingDetails.confirm")}
            </Button>
          </PaymentSummaryCard>
        </section>
      </main>
      <OverrideConfirmDialog
        confirming={confirming}
        isOpen={finalOverrideOpen}
        onCancel={() => setFinalOverrideOpen(false)}
        onConfirm={handleConfirmOverride}
      >
        {impactList}
      </OverrideConfirmDialog>
      <OverrideSelectionDialog
        formatClock={(clock) => formatClock(clock, i18nInstance.language)}
        onAccept={handleAcceptOverrideEdit}
        onCancel={() => setPendingOverrideEdit(null)}
        target={
          pendingOverrideEdit
            ? {
                roomName: roomName(pendingOverrideEdit.facilityId) ?? pendingOverrideEdit.facilityId,
                date: draft.date,
                start: pendingOverrideEdit.interval.start,
                end: pendingOverrideEdit.interval.end,
              }
            : null
        }
      />
      {editingRoom ? (
        <ConfirmBookingTime
          allowOverride={allowOverride}
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
