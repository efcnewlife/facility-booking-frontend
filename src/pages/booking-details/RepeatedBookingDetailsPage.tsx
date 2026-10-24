import facilityService, {
  BookingSeriesDraftNotConfirmableError,
  BookingSeriesDraftNotFoundError,
  type RecurringSeriesDraftDetail,
} from "@/api/services/facilityService";
import OverrideConfirmDialog from "@/components/booking/OverrideConfirmDialog";
import OverrideImpactList from "@/components/booking/OverrideImpactList";
import RepeatedConflictDialog from "@/components/booking/RepeatedConflictDialog";
import RepeatedConflictList from "@/components/booking/RepeatedConflictList";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { discountLabelKey } from "@/utils/discountEligibility";
import { finalConfirmationRejection } from "@/utils/overrideReviewErrors";
import { mapPaymentSummary, type PaymentSummaryLabels } from "@/utils/paymentSummary";
import { groupRecurringConflictsByDate, toggleExcludedDate } from "@/utils/recurringBookingConflicts";
import {
  canConfirmSeriesDraft,
  clockFromLocalTime,
  seriesDraftNeedsTimetableRevision,
  seriesDraftToUpdatePayload,
  toRepeatedTimetableSearchParams,
} from "@/utils/recurringSeriesDraft";
import type { RoomDay } from "@/utils/timetableRules";
import { Alert, Button, cn, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack, MdPhoto } from "react-icons/md";
import { useNavigate } from "react-router";

interface RepeatedBookingDetailsPageProps {
  draftId: string;
}

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

const RepeatedBookingDetailsPage = ({ draftId }: RepeatedBookingDetailsPageProps) => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();

  const [draft, setDraft] = useState<RecurringSeriesDraftDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rooms, setRooms] = useState<RoomDay[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryLabels>(() =>
    mapPaymentSummary(null, i18nInstance.language)
  );
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openConflictDate, setOpenConflictDate] = useState<string | null>(null);
  const [finalOverrideOpen, setFinalOverrideOpen] = useState(false);

  const applyDraft = useCallback(
    (next: RecurringSeriesDraftDetail) => {
      setDraft(next);
      setPaymentSummary(
        mapPaymentSummary(
          {
            subtotalAmount: next.subtotalAmount,
            discountAmount: next.discountAmount,
            surchargeAmount: next.surchargeAmount,
            quotedAmount: next.quotedAmount,
            currency: next.currency,
          },
          i18nInstance.language
        )
      );
    },
    [i18nInstance.language]
  );

  const loadDraftDetail = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setPaymentSummary(mapPaymentSummary(null, i18nInstance.language));
    try {
      const detail = await facilityService.getBookingSeriesDraft(draftId);
      applyDraft(detail);
      return true;
    } catch (err) {
      if (err instanceof BookingSeriesDraftNotFoundError) {
        setNotFound(true);
      } else {
        setError(messageFromUnknown(err, t("timetable.loadError")));
        setDraft(null);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [applyDraft, draftId, i18nInstance.language, t]);

  useEffect(() => {
    void loadDraftDetail();
  }, [loadDraftDetail]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    let cancelled = false;
    const loadRooms = async () => {
      try {
        const { rooms: items } = await facilityService.getAvailability(draft.firstOccurrenceDate, draft.ministryId);
        if (!cancelled) {
          setRooms(items);
        }
      } catch {
        if (!cancelled) {
          setRooms([]);
        }
      }
    };
    void loadRooms();
    return () => {
      cancelled = true;
    };
  }, [draft]);

  useEffect(() => {
    if (!draft) {
      return;
    }
    let cancelled = false;
    facilityService
      .getDiscountEligibility({ bookingType: "recurring", ministryId: draft.ministryId || null })
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

  const needsRevision = draft ? seriesDraftNeedsTimetableRevision(draft) : false;
  const confirmable = draft ? canConfirmSeriesDraft(draft) : false;
  const overrideImpacts = draft?.overrideImpacts ?? [];
  const reviewReady = overrideImpacts.length === 0 || Boolean(draft?.overrideReviewToken);
  const canConfirm = Boolean(
    draft && confirmable && reviewReady && !needsRevision && !loading && !confirming && !updating
  );
  const conflictGroups = useMemo(() => groupRecurringConflictsByDate(draft?.conflicts ?? []), [draft?.conflicts]);
  const openConflictGroup = conflictGroups.find((group) => group.occurrenceDate === openConflictDate) ?? null;

  const goToTimetable = () => {
    if (!draft) {
      navigate("/rooms");
      return;
    }
    navigate(
      {
        pathname: "/rooms",
        search: toRepeatedTimetableSearchParams(draft).toString(),
      },
      { state: { seriesDraftId: draftId, title: draft.title ?? undefined } }
    );
  };

  const persistDraft = async (overrides: { excludedDates?: string[] }): Promise<boolean> => {
    if (!draft) {
      return false;
    }
    setUpdating(true);
    setError(null);
    try {
      const updated = await facilityService.updateBookingSeriesDraft(
        draftId,
        seriesDraftToUpdatePayload(draft, overrides)
      );
      applyDraft(updated);
      return true;
    } catch (err) {
      if (err instanceof BookingSeriesDraftNotFoundError) {
        setNotFound(true);
      } else {
        setError(messageFromUnknown(err, t("bookingDetails.updateError")));
      }
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Skip the date excludes the whole occurrence on this same Draft; the update refreshes quote, conflicts, impacts and token.
  const handleToggleSkip = async () => {
    if (!draft || !openConflictDate || updating) {
      return;
    }
    const excludedDates = toggleExcludedDate(draft.conflicts, draft.excludedDates, openConflictDate);
    if (await persistDraft({ excludedDates })) {
      setOpenConflictDate(null);
    }
  };

  const submitConfirmation = async (overrideReviewToken: string | null) => {
    setConfirming(true);
    setError(null);
    try {
      const created = await facilityService.confirmBookingSeriesDraft(draftId, overrideReviewToken);
      navigate(`/payment/repeated/${created.id}`);
    } catch (err) {
      if (err instanceof BookingSeriesDraftNotFoundError) {
        setNotFound(true);
        return;
      }
      const rejection =
        err instanceof BookingSeriesDraftNotConfirmableError ? "conflict" : finalConfirmationRejection(err);
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
    void submitConfirmation(null);
  };

  const handleConfirmOverride = () => {
    if (confirming || !draft?.overrideReviewToken) {
      return;
    }
    void submitConfirmation(draft.overrideReviewToken);
  };

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

  const startClock = clockFromLocalTime(draft.localStartTime);
  const endClock = clockFromLocalTime(draft.localEndTime);
  const remainingOccurrenceCount = Math.max(0, draft.occurrenceCount);
  const holdDeadlineLabel = draft.paymentHoldExpiresAt
    ? moment(draft.paymentHoldExpiresAt).locale(i18nInstance.language).format("LLL")
    : null;
  const orderedRooms = [...draft.rooms].sort((left, right) => left.sequence - right.sequence);

  const roomForId = (facilityId: string): RoomDay | undefined => {
    return rooms.find((room) => room.id === facilityId);
  };

  const roomLabel = (facilityId: string): string => roomForId(facilityId)?.name ?? facilityId;
  const formatOccurrenceDate = (occurrenceDate: string): string =>
    moment(occurrenceDate, "YYYY-MM-DD").locale(i18nInstance.language).format("LL");
  const sharedTimeRange = `${formatClock(startClock, i18nInstance.language)} – ${formatClock(endClock, i18nInstance.language)}`;
  // Impacts span several occurrences, so each interval keeps its date in the facility's own offset.
  const formatImpactRange = (startAt: string, endAt: string): string => {
    const start = moment.parseZone(startAt).locale(i18nInstance.language);
    const end = moment.parseZone(endAt).locale(i18nInstance.language);
    return `${start.format("ddd, MMM D, YYYY")} · ${start.format("h:mm a")} – ${end.format("h:mm a")}`;
  };

  const impactList = (
    <OverrideImpactList
      formatTimeRange={formatImpactRange}
      impacts={overrideImpacts}
      roomName={(facilityId) => roomForId(facilityId)?.name ?? null}
    />
  );

  return (
    <>
      <main className="flex flex-1 justify-center bg-surface-container px-4 py-10">
        <section className="flex w-full max-w-[1200px] flex-col gap-12 rounded-[20px] bg-surface px-6 py-10 sm:flex-row sm:justify-between sm:px-12 sm:pb-12">
          <div className="min-w-0 max-w-[625px] flex-1">
            <Button
              className="mb-4"
              onClick={goToTimetable}
              size="sm"
              startIcon={<MdArrowBack className="size-4" />}
              variant="outline"
            >
              {t("bookingDetails.backToTimetable")}
            </Button>
            <h1 className="m-0 mb-6 text-[26px] font-semibold leading-none text-booking-primary">
              {t("bookingDetails.title")}
            </h1>
            <Alert
              message={t("startBooking.recurringReview.previewDoesNotReserve")}
              size="sm"
              title={t("startBooking.recurringReview.previewTitle")}
              variant="info"
              width="full"
            />
            {error ? (
              <p className="mb-4 mt-4 text-sm font-medium text-error" role="alert">
                {error}
              </p>
            ) : null}
            {needsRevision ? (
              <p className="mb-4 mt-4 text-sm font-medium text-error" role="status">
                {t("bookingDetails.stale")}
              </p>
            ) : null}
            {loading ? <Spinner className="mb-4 mt-4" showText size="sm" text={t("startBooking.loading")} /> : null}
            <dl>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 py-4">
                <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingTitle.label")}</dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">{draft.title}</dd>
              </div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
                <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingDetails.repetition")}</dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">{t("bookingDetails.repeated")}</dd>
              </div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
                <dt className="m-0 text-base font-bold leading-[1.125]">
                  {t("startBooking.recurringReview.sharedTime")}
                </dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">
                  {formatClock(startClock, i18nInstance.language)} – {formatClock(endClock, i18nInstance.language)}
                </dd>
              </div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
                <dt className="m-0 text-base font-bold leading-[1.125]">
                  {t("startBooking.recurringWhen.firstOccurrence")}
                </dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">
                  {moment(draft.firstOccurrenceDate).locale(i18nInstance.language).format("dddd, MMMM D, YYYY")}
                </dd>
              </div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
                <dt className="m-0 text-base font-bold leading-[1.125]">
                  {t("startBooking.recurringWhen.lastOccurrence")}
                </dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">
                  {moment(draft.lastOccurrenceDate).locale(i18nInstance.language).format("dddd, MMMM D, YYYY")}
                </dd>
              </div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
                <dt className="m-0 text-base font-bold leading-[1.125]">
                  {t("startBooking.recurringResult.occurrenceCount")}
                </dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">
                  {t("startBooking.recurringWhen.occurrenceCount", { count: remainingOccurrenceCount })}
                </dd>
              </div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)] items-start gap-4 border-t border-gray-300 py-4">
                <dt className="m-0 text-base font-bold leading-[1.125]">{t("bookingDetails.space")}</dt>
                <dd className="m-0 text-xl font-normal leading-[26px]">
                  <div className="flex flex-col gap-4">
                    {orderedRooms.map((roomLine, index) => {
                      const room = roomForId(roomLine.facilityId);
                      const photoUrl = room?.photoUrls[0];
                      return (
                        <div
                          className={cn("flex flex-col gap-3", index > 0 && "border-t border-gray-300 pt-4")}
                          key={`${roomLine.facilityId}-${roomLine.sequence}`}
                        >
                          <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
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
                                {room?.name || roomLine.facilityId}
                              </p>
                              <p className="m-0 mt-1 text-sm font-normal text-on-surface-variant">
                                {formatClock(startClock, i18nInstance.language)} –{" "}
                                {formatClock(endClock, i18nInstance.language)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </dd>
              </div>
            </dl>
            {conflictGroups.length > 0 ? (
              <div className="mt-6">
                <RepeatedConflictList
                  excludedDates={draft.excludedDates}
                  formatDate={formatOccurrenceDate}
                  groups={conflictGroups}
                  onView={setOpenConflictDate}
                  roomName={roomLabel}
                />
              </div>
            ) : null}
            {overrideImpacts.length > 0 ? <div className="mt-6">{impactList}</div> : null}
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
                <span>{t(discountLabelKey(discountCode))}</span>
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
              {holdDeadlineLabel ? (
                <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
                  <span>{t("bookingDetails.holdDeadline")}</span>
                  <span>{holdDeadlineLabel}</span>
                </div>
              ) : null}
              <Button className="mt-1" disabled={!canConfirm} onClick={handleConfirm}>
                {t("bookingDetails.confirm")}
              </Button>
            </div>
          </aside>
        </section>
      </main>
      <RepeatedConflictDialog
        formatDate={formatOccurrenceDate}
        group={openConflictGroup}
        isExcluded={openConflictGroup ? draft.excludedDates.includes(openConflictGroup.occurrenceDate) : false}
        onClose={() => setOpenConflictDate(null)}
        onToggleSkip={() => void handleToggleSkip()}
        roomName={roomLabel}
        timeRange={sharedTimeRange}
        updating={updating}
      />
      <OverrideConfirmDialog
        confirming={confirming}
        isOpen={finalOverrideOpen}
        onCancel={() => setFinalOverrideOpen(false)}
        onConfirm={handleConfirmOverride}
      >
        {impactList}
      </OverrideConfirmDialog>
    </>
  );
};

export default RepeatedBookingDetailsPage;
