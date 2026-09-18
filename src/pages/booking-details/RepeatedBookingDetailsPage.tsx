import facilityService, {
  BookingSeriesDraftNotConfirmableError,
  BookingSeriesDraftNotFoundError,
  type RecurringSeriesDraftDetail,
} from "@/api/services/facilityService";
import ministryService from "@/api/services/ministryService";
import RecurringConflictReview from "@/components/booking/RecurringConflictReview";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import type { MinistryItem } from "@/types/ministry";
import { bookingTitleFieldFeedback, validateBookingTitle } from "@/utils/bookingTitle";
import { mapPaymentSummary, type PaymentSummaryLabels } from "@/utils/paymentSummary";
import { toggleExcludedDate } from "@/utils/recurringBookingConflicts";
import {
  canConfirmSeriesDraft,
  clockFromLocalTime,
  seriesDraftNeedsTimetableRevision,
  seriesDraftToUpdatePayload,
  toRepeatedTimetableSearchParams,
} from "@/utils/recurringSeriesDraft";
import type { RoomDay } from "@/utils/timetableRules";
import { Alert, Button, cn, Input, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useState } from "react";
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

const isActiveMinistry = (item: MinistryItem): boolean => {
  return item.status === "active" && item.isActive !== false;
};

const RepeatedBookingDetailsPage = ({ draftId }: RepeatedBookingDetailsPageProps) => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();

  const [draft, setDraft] = useState<RecurringSeriesDraftDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [rooms, setRooms] = useState<RoomDay[]>([]);
  const [bookableMinistries, setBookableMinistries] = useState<MinistryItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummaryLabels>(() =>
    mapPaymentSummary(null, i18nInstance.language)
  );
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);

  const applyDraft = useCallback(
    (next: RecurringSeriesDraftDetail) => {
      setDraft(next);
      setTitle(next.title ?? "");
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

  const loadDraftDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setPaymentSummary(mapPaymentSummary(null, i18nInstance.language));
    try {
      const detail = await facilityService.getBookingSeriesDraft(draftId);
      applyDraft(detail);
    } catch (err) {
      if (err instanceof BookingSeriesDraftNotFoundError) {
        setNotFound(true);
      } else {
        setError(messageFromUnknown(err, t("timetable.loadError")));
        setDraft(null);
      }
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
    let cancelled = false;
    const loadMinistries = async () => {
      try {
        const result = await ministryService.listMine(true);
        if (!cancelled) {
          setBookableMinistries((result.items || []).filter(isActiveMinistry));
        }
      } catch {
        if (!cancelled) {
          setBookableMinistries([]);
        }
      }
    };
    void loadMinistries();
    return () => {
      cancelled = true;
    };
  }, []);

  const titleError = validateBookingTitle(title);
  const titleFeedback = bookingTitleFieldFeedback(title, titleTouched, t);
  const needsRevision = draft ? seriesDraftNeedsTimetableRevision(draft) : false;
  const confirmable = draft ? canConfirmSeriesDraft({ ...draft, title }) : false;
  const canConfirm = Boolean(
    draft && confirmable && !needsRevision && !loading && !confirming && !updating && !titleError
  );

  const goToTimetable = () => {
    if (!draft) {
      navigate("/rooms");
      return;
    }
    navigate({
      pathname: "/rooms",
      search: toRepeatedTimetableSearchParams(draft).toString(),
    });
  };

  const persistDraft = async (overrides: { title?: string | null; excludedDates?: string[] }): Promise<boolean> => {
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

  const handleTitleBlur = () => {
    setTitleTouched(true);
    if (!draft || titleError) {
      return;
    }
    if (title.trim() === (draft.title ?? "").trim()) {
      return;
    }
    void persistDraft({ title });
  };

  const handleToggleExcludedDate = (occurrenceDate: string) => {
    if (!draft || needsRevision) {
      return;
    }
    const excludedDates = toggleExcludedDate(draft.conflicts, draft.excludedDates, occurrenceDate);
    void persistDraft({ excludedDates });
  };

  const handleConfirm = async () => {
    if (!canConfirm || !draft) {
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      if (title.trim() !== (draft.title ?? "").trim()) {
        const saved = await persistDraft({ title });
        if (!saved) {
          return;
        }
      }
      const created = await facilityService.confirmBookingSeriesDraft(draftId);
      navigate(`/payment/repeated/${created.id}`);
    } catch (err) {
      if (err instanceof BookingSeriesDraftNotFoundError) {
        setNotFound(true);
      } else if (err instanceof BookingSeriesDraftNotConfirmableError) {
        await loadDraftDetail();
        setError(t("bookingDetails.stale"));
      } else {
        setError(messageFromUnknown(err, t("timetable.createError")));
      }
    } finally {
      setConfirming(false);
    }
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
  const isPriorityMinistry = Boolean(
    draft.ministryId && bookableMinistries.find((ministry) => ministry.id === draft.ministryId)?.hasPriorityBooking
  );
  const orderedRooms = [...draft.rooms].sort((left, right) => left.sequence - right.sequence);

  const roomForId = (facilityId: string): RoomDay | undefined => {
    return rooms.find((room) => room.id === facilityId);
  };

  return (
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
          <div onBlur={handleTitleBlur}>
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
              wrapperClassName="mb-6 mt-6"
            />
          </div>
          <dl>
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
          {draft.conflicts.length > 0 ? (
            <div className="mt-6">
              <RecurringConflictReview
                conflicts={draft.conflicts}
                disabled={updating || confirming || needsRevision}
                excludedDates={draft.excludedDates}
                isPriorityMinistry={isPriorityMinistry}
                onToggleExcludeDate={handleToggleExcludedDate}
                rooms={rooms}
                totalOccurrenceCount={draft.occurrenceCount}
              />
            </div>
          ) : null}
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
            {holdDeadlineLabel ? (
              <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
                <span>{t("bookingDetails.holdDeadline")}</span>
                <span>{holdDeadlineLabel}</span>
              </div>
            ) : null}
            <Button className="mt-1" disabled={!canConfirm} onClick={() => void handleConfirm()}>
              {t("bookingDetails.confirm")}
            </Button>
          </div>
        </aside>
      </section>
    </main>
  );
};

export default RepeatedBookingDetailsPage;
