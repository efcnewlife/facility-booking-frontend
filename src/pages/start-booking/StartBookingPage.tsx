import facilityService, {
  type RecurringBookingConflict,
  type RecurringBookingSeriesDetail,
} from "@/api/services/facilityService";
import ministryService from "@/api/services/ministryService";
import ChoicePill from "@/components/booking/ChoicePill";
import RecurringConflictReview from "@/components/booking/RecurringConflictReview";
import StartBookingProgress from "@/components/booking/StartBookingProgress";
import { useAuth } from "@/context/AuthContext";
import CreateMinistryModal from "@/pages/start-booking/CreateMinistryModal";
import type { MinistryItem } from "@/types/ministry";
import { canCreateRecurringSeriesWithExclusions } from "@/utils/recurringBookingConflicts";
import { resolveRecurringBookingSeriesErrorMessage } from "@/utils/recurringBookingErrors";
import {
  buildCreateRecurringBookingSeriesPayload,
  buildPreviewRecurringBookingSeriesPayload,
} from "@/utils/recurringBookingSeries";
import { clearStartBookingState } from "@/utils/startBookingEntry";
import {
  buildRoomsSearchQuery,
  canAdvance,
  isSameWeekday,
  isWhenEndAfterStart,
  isStartBookingStep,
  nextStep,
  previousStep,
  toRoomsSearchParams,
  occurrencePeriodForDate,
  weeklyOccurrenceDates,
  type BookingFrequency,
  type RecurringWhenValue,
  type StartBookingAnswers,
  type StartBookingStep,
} from "@/utils/startBookingFlow";
import { MAX_BOOKING_LINES, type RoomDay } from "@/utils/timetableRules";
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Select,
  Spinner,
  TimePicker,
  type DatePickerValue,
  type TimePickerValue,
} from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdArrowBack } from "react-icons/md";
import { useNavigate, useSearchParams } from "react-router";

const STEP_QUERY_KEY = "step";
const MINISTRY_QUERY_KEY = "ministry";

const ministryChoiceFromParam = (value: string | null): boolean | null => {
  if (value === "1") {
    return true;
  }
  if (value === "0") {
    return false;
  }
  return null;
};

const isActiveMinistry = (item: MinistryItem): boolean => {
  return item.status === "active" && item.isActive !== false;
};

const StartBookingPage = () => {
  const { t } = useTranslation("booking");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const step: StartBookingStep = isStartBookingStep(searchParams.get(STEP_QUERY_KEY))
    ? (searchParams.get(STEP_QUERY_KEY) as StartBookingStep)
    : "ministry_choice";
  const isMinistryBooking = ministryChoiceFromParam(searchParams.get(MINISTRY_QUERY_KEY));

  const [ministries, setMinistries] = useState<MinistryItem[]>([]);
  const [ministryId, setMinistryId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<BookingFrequency | null>(null);
  const [dateValue, setDateValue] = useState<DatePickerValue>(null);
  const [startValue, setStartValue] = useState<TimePickerValue>(null);
  const [endValue, setEndValue] = useState<TimePickerValue>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recurringFirstDate, setRecurringFirstDate] = useState<DatePickerValue>(null);
  const [recurringLastDate, setRecurringLastDate] = useState<DatePickerValue>(null);
  const [recurringStartValue, setRecurringStartValue] = useState<TimePickerValue>(null);
  const [recurringEndValue, setRecurringEndValue] = useState<TimePickerValue>(null);
  const [recurringRoomIds, setRecurringRoomIds] = useState<string[]>([]);
  const [recurringRooms, setRecurringRooms] = useState<RoomDay[]>([]);
  const [recurringRoomsLoading, setRecurringRoomsLoading] = useState(false);
  const [maxRecurringRooms, setMaxRecurringRooms] = useState(MAX_BOOKING_LINES);
  const [submittingSeries, setSubmittingSeries] = useState(false);
  const [seriesResult, setSeriesResult] = useState<RecurringBookingSeriesDetail | null>(null);
  const [previewingConflicts, setPreviewingConflicts] = useState(false);
  const [recurringConflicts, setRecurringConflicts] = useState<RecurringBookingConflict[]>([]);
  const [excludedDates, setExcludedDates] = useState<string[]>([]);
  const now = new Date();
  const minDate = moment(now).format("YYYY-MM-DD");
  const maxDate = moment(now).add(1, "year").format("YYYY-MM-DD");

  const when = {
    date: dateValue?.format("YYYY-MM-DD") ?? null,
    start: startValue?.format("HH:mm") ?? null,
    end: endValue?.format("HH:mm") ?? null,
  };

  const recurringFirstOccurrenceDate = recurringFirstDate?.format("YYYY-MM-DD") ?? null;
  const recurringLastOccurrenceDate = recurringLastDate?.format("YYYY-MM-DD") ?? null;
  const recurringWhen: RecurringWhenValue = {
    firstOccurrenceDate: recurringFirstOccurrenceDate,
    lastOccurrenceDate: recurringLastOccurrenceDate,
    startTime: recurringStartValue?.format("HH:mm") ?? null,
    endTime: recurringEndValue?.format("HH:mm") ?? null,
    roomIds: recurringRoomIds,
  };

  const answers: StartBookingAnswers = {
    isMinistryBooking,
    ministryId,
    frequency,
    when,
    recurringWhen,
  };
  const isPriorityMinistry = Boolean(
    isMinistryBooking && ministries.find((ministry) => ministry.id === ministryId)?.hasPriorityBooking
  );
  const canGoForward =
    step === "recurring_conflicts"
      ? canCreateRecurringSeriesWithExclusions(recurringConflicts, excludedDates)
      : canAdvance(step, answers, now);
  const endTimeError = isWhenEndAfterStart(when) ? undefined : t("startBooking.when.endAfterStart");

  const recurringWeekdayMismatch =
    Boolean(recurringFirstOccurrenceDate) &&
    Boolean(recurringLastOccurrenceDate) &&
    !isSameWeekday(recurringFirstOccurrenceDate as string, recurringLastOccurrenceDate as string);
  const recurringUsePeriodMismatch =
    !recurringWeekdayMismatch &&
    Boolean(recurringFirstOccurrenceDate) &&
    Boolean(recurringLastOccurrenceDate) &&
    occurrencePeriodForDate(recurringFirstOccurrenceDate as string) !==
      occurrencePeriodForDate(recurringLastOccurrenceDate as string);
  const recurringLastOccurrenceError = recurringWeekdayMismatch
    ? t("startBooking.recurringWhen.weekdayMismatch")
    : recurringUsePeriodMismatch
      ? t("startBooking.recurringWhen.usePeriodMismatch")
      : undefined;
  const recurringEndTimeError = isWhenEndAfterStart({
    date: null,
    start: recurringWhen.startTime,
    end: recurringWhen.endTime,
  })
    ? undefined
    : t("startBooking.when.endAfterStart");
  const recurringOccurrenceDates = useMemo(() => {
    if (recurringWeekdayMismatch || recurringUsePeriodMismatch) {
      return [];
    }
    if (!recurringFirstOccurrenceDate || !recurringLastOccurrenceDate) {
      return [];
    }
    return weeklyOccurrenceDates(recurringFirstOccurrenceDate, recurringLastOccurrenceDate);
  }, [recurringFirstOccurrenceDate, recurringLastOccurrenceDate, recurringUsePeriodMismatch, recurringWeekdayMismatch]);

  const goToStep = useCallback(
    (next: StartBookingStep, ministryChoice: boolean | null = isMinistryBooking) => {
      const params: Record<string, string> = { [STEP_QUERY_KEY]: next };
      if (ministryChoice === true) {
        params[MINISTRY_QUERY_KEY] = "1";
      } else if (ministryChoice === false) {
        params[MINISTRY_QUERY_KEY] = "0";
      }
      setSearchParams(params, { replace: true });
      setError(null);
    },
    [isMinistryBooking, setSearchParams]
  );

  const loadMinistries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ministryService.listMine(true);
      const active = (result.items || []).filter(isActiveMinistry);
      setMinistries(active);
      setMinistryId((current) => (current && active.some((item) => item.id === current) ? current : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("startBooking.errors.loadMinistries"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (step === "select_ministry") {
      void loadMinistries();
    }
  }, [loadMinistries, step]);

  useEffect(() => {
    void clearStartBookingState(window.localStorage, () => facilityService.deleteAllMyBookingDrafts());
  }, []);

  useEffect(() => {
    if (step !== "recurring_when" || !recurringFirstOccurrenceDate) {
      return;
    }
    let cancelled = false;
    setRecurringRoomsLoading(true);
    facilityService
      .getAvailability(recurringFirstOccurrenceDate, isMinistryBooking ? ministryId : null)
      .then(({ rooms: items, maxBookingLines: cap }) => {
        if (cancelled) {
          return;
        }
        setRecurringRooms(items);
        setMaxRecurringRooms(cap);
        setRecurringRoomIds((current) => current.filter((id) => items.some((room) => room.id === id)));
      })
      .catch(() => {
        if (!cancelled) {
          setRecurringRooms([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRecurringRoomsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [step, recurringFirstOccurrenceDate, isMinistryBooking, ministryId]);

  const toggleRecurringRoom = (roomId: string) => {
    setRecurringRoomIds((current) => {
      if (current.includes(roomId)) {
        return current.filter((id) => id !== roomId);
      }
      if (current.length >= maxRecurringRooms) {
        return current;
      }
      return [...current, roomId];
    });
  };

  const handleCreateSeries = async (datesToExclude: string[] = excludedDates) => {
    const payload = buildCreateRecurringBookingSeriesPayload(answers, now, datesToExclude);
    if (!payload) {
      return;
    }
    setSubmittingSeries(true);
    setError(null);
    try {
      const result = await facilityService.createBookingSeries(payload);
      setSeriesResult(result);
    } catch (err) {
      setError(resolveRecurringBookingSeriesErrorMessage(err));
    } finally {
      setSubmittingSeries(false);
    }
  };

  const handlePreviewSeries = async () => {
    const payload = buildPreviewRecurringBookingSeriesPayload(answers, now);
    if (!payload) {
      return;
    }
    setPreviewingConflicts(true);
    setError(null);
    try {
      const conflicts = await facilityService.previewBookingSeries(payload);
      if (conflicts.length === 0) {
        setRecurringConflicts([]);
        setExcludedDates([]);
        await handleCreateSeries([]);
        return;
      }
      setRecurringConflicts(conflicts);
      setExcludedDates([]);
      goToStep("recurring_conflicts");
    } catch (err) {
      setError(resolveRecurringBookingSeriesErrorMessage(err));
    } finally {
      setPreviewingConflicts(false);
    }
  };

  const toggleExcludedDate = (occurrenceDate: string) => {
    setExcludedDates((current) =>
      current.includes(occurrenceDate)
        ? current.filter((date) => date !== occurrenceDate)
        : [...current, occurrenceDate]
    );
  };

  const handleMinistryChoice = (value: string) => {
    const isMinistry = value === "yes";
    if (!isMinistry) {
      setMinistryId(null);
    }
    setSearchParams(
      {
        [STEP_QUERY_KEY]: "ministry_choice",
        [MINISTRY_QUERY_KEY]: isMinistry ? "1" : "0",
      },
      { replace: true }
    );
  };

  const handleBack = () => {
    const previous = previousStep(step, answers);
    if (previous === "home") {
      navigate("/");
      return;
    }
    goToStep(previous);
  };

  const handleContinue = () => {
    const next = nextStep(step, answers, now);
    if (next === "rooms") {
      const query = buildRoomsSearchQuery(answers);
      if (!query) {
        return;
      }
      navigate(
        {
          pathname: "/rooms",
          search: `?${toRoomsSearchParams(query).toString()}`,
        },
        { state: query }
      );
      return;
    }
    if (next === "recurring_conflicts") {
      void handlePreviewSeries();
      return;
    }
    if (next === "create_series") {
      void handleCreateSeries();
      return;
    }
    if (next) {
      goToStep(next);
    }
  };

  const continueLabel =
    step === "when"
      ? t("startBooking.search")
      : step === "recurring_when"
        ? t("startBooking.recurringWhen.create")
        : step === "recurring_conflicts"
          ? t("startBooking.recurringConflicts.create")
          : t("startBooking.continue");

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center px-6 py-8 sm:px-8">
      <StartBookingProgress step={step} />

      {error ? (
        <div className="mt-6 w-full">
          <Alert message={error} title={t("startBooking.errors.title")} variant="error" width="full" />
        </div>
      ) : null}

      {step === "ministry_choice" ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">
            {t("startBooking.ministryChoice.title")}
          </h1>
          <div className="mt-8 flex flex-col items-center">
            <ChoicePill
              checked={isMinistryBooking === true}
              hint={t("startBooking.ministryChoice.yesHint")}
              id="ministry-yes"
              label={t("startBooking.ministryChoice.yes")}
              name="ministry"
              onChange={handleMinistryChoice}
              value="yes"
            />
            <ChoicePill
              checked={isMinistryBooking === false}
              hint={t("startBooking.ministryChoice.noHint")}
              id="ministry-no"
              label={t("startBooking.ministryChoice.no")}
              name="ministry"
              onChange={handleMinistryChoice}
              value="no"
            />
          </div>
          <Alert
            className="mt-10"
            message={t("startBooking.ministryChoice.priorityMessage")}
            messageLines={6}
            size="lg"
            title={t("startBooking.ministryChoice.priorityTitle")}
            variant="warning"
            width="full"
          />
        </section>
      ) : null}

      {step === "select_ministry" ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">
            {t("startBooking.selectMinistry.title")}
          </h1>
          <p className="mt-3 text-center text-lg text-on-surface">{t("startBooking.selectMinistry.body")}</p>
          <p className="text-center text-lg text-on-surface">{t("startBooking.selectMinistry.sponsor")}</p>
          <div className="mt-8 w-full">
            <Select
              id="start-booking-ministry"
              labels={{ noOptions: t("startBooking.selectMinistry.empty") }}
              onChange={(value) => {
                if (typeof value === "string") {
                  setMinistryId(value);
                } else {
                  setMinistryId(null);
                }
              }}
              options={ministries.map((ministry) => ({
                value: ministry.id,
                label: ministry.name || ministry.id,
              }))}
              placeholder={t("startBooking.selectMinistry.placeholder")}
              size="lg"
              value={ministryId}
            />
          </div>
          {loading ? <p className="mt-3 text-base text-on-surface-variant">{t("startBooking.loading")}</p> : null}
        </section>
      ) : null}

      {step === "frequency" ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">{t("startBooking.frequency.title")}</h1>
          <div className="mt-8 flex flex-col items-center">
            <ChoicePill
              checked={frequency === "one_time"}
              hint={t("startBooking.frequency.oneTimeHint")}
              id="frequency-one-time"
              label={t("startBooking.frequency.oneTime")}
              name="frequency"
              onChange={() => setFrequency("one_time")}
              value="one_time"
            />
            <ChoicePill
              checked={frequency === "repeated"}
              hint={t("startBooking.frequency.repeatedHint")}
              id="frequency-repeated"
              label={t("startBooking.frequency.repeated")}
              name="frequency"
              onChange={() => setFrequency("repeated")}
              value="repeated"
            />
          </div>
        </section>
      ) : null}

      {step === "when" ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">{t("startBooking.when.title")}</h1>
          <div className="mt-8 w-full space-y-4">
            <DatePicker
              id="start-booking-date"
              label={t("startBooking.when.date")}
              maxDate={maxDate}
              minDate={minDate}
              onChange={(value) => setDateValue(value)}
              placeholder={t("startBooking.when.datePlaceholder")}
              required
              value={dateValue}
            />
            <div className="grid grid-cols-2 gap-3">
              <TimePicker
                ampm
                id="start-booking-start"
                label={t("startBooking.when.start")}
                onChange={(value) => setStartValue(value)}
                placeholder={t("startBooking.when.startPlaceholder")}
                value={startValue}
              />
              <TimePicker
                ampm
                id="start-booking-end"
                error={endTimeError}
                label={t("startBooking.when.end")}
                onChange={(value) => setEndValue(value)}
                placeholder={t("startBooking.when.endPlaceholder")}
                value={endValue}
              />
            </div>
          </div>
        </section>
      ) : null}

      {step === "recurring_when" && seriesResult ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">
            {t("startBooking.recurringResult.title")}
          </h1>
          <div className="mt-8 w-full space-y-4">
            <Alert
              message={t("startBooking.recurringResult.pendingPaymentMessage", {
                deadline: moment(seriesResult.paymentHoldExpiresAt).format("LLL"),
              })}
              size="lg"
              title={t("startBooking.recurringResult.pendingPaymentTitle")}
              variant="info"
              width="full"
            />
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-outline p-4">
              <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.total")}</dt>
              <dd className="text-right text-sm font-semibold text-on-surface">
                {seriesResult.quotedAmount} {seriesResult.currency}
              </dd>
              <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.holdDeadline")}</dt>
              <dd className="text-right text-sm font-semibold text-on-surface">
                {moment(seriesResult.paymentHoldExpiresAt).format("LLL")}
              </dd>
              <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.initialOccurrence")}</dt>
              <dd className="text-right text-sm font-semibold text-on-surface">
                {moment(seriesResult.firstOccurrenceDate).format("LL")} {seriesResult.localStartTime.slice(0, 5)}–
                {seriesResult.localEndTime.slice(0, 5)}
              </dd>
              <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.occurrenceCount")}</dt>
              <dd className="text-right text-sm font-semibold text-on-surface">
                {t("startBooking.recurringWhen.occurrenceCount", { count: seriesResult.occurrenceCount })}
              </dd>
              <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.rooms")}</dt>
              <dd className="text-right text-sm font-semibold text-on-surface">
                {(seriesResult.occurrences[0]?.facilityIds ?? [])
                  .map((facilityId) => recurringRooms.find((room) => room.id === facilityId)?.name || facilityId)
                  .join(", ")}
              </dd>
            </dl>
          </div>
          <Button className="mt-8" onClick={() => navigate("/")} size="md" variant="primary">
            {t("startBooking.recurringResult.backToHome")}
          </Button>
        </section>
      ) : null}

      {step === "recurring_when" && !seriesResult ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">
            {t("startBooking.recurringWhen.title")}
          </h1>
          <div className="mt-8 w-full space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                id="recurring-when-first"
                label={t("startBooking.recurringWhen.firstOccurrence")}
                minDate={minDate}
                onChange={(value) => setRecurringFirstDate(value)}
                placeholder={t("startBooking.when.datePlaceholder")}
                required
                value={recurringFirstDate}
              />
              <DatePicker
                disabled={!recurringFirstOccurrenceDate}
                error={recurringLastOccurrenceError}
                id="recurring-when-last"
                label={t("startBooking.recurringWhen.lastOccurrence")}
                minDate={recurringFirstOccurrenceDate ?? minDate}
                onChange={(value) => setRecurringLastDate(value)}
                placeholder={t("startBooking.when.datePlaceholder")}
                required
                value={recurringLastDate}
              />
            </div>
            {recurringOccurrenceDates.length > 0 ? (
              <p className="text-sm text-on-surface-variant">
                {t("startBooking.recurringWhen.occurrenceCount", { count: recurringOccurrenceDates.length })}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <TimePicker
                ampm
                id="recurring-when-start"
                label={t("startBooking.recurringWhen.start")}
                onChange={(value) => setRecurringStartValue(value)}
                placeholder={t("startBooking.when.startPlaceholder")}
                value={recurringStartValue}
              />
              <TimePicker
                ampm
                error={recurringEndTimeError}
                id="recurring-when-end"
                label={t("startBooking.recurringWhen.end")}
                onChange={(value) => setRecurringEndValue(value)}
                placeholder={t("startBooking.when.endPlaceholder")}
                value={recurringEndValue}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-on-surface">
                {t("startBooking.recurringWhen.rooms", { max: maxRecurringRooms })}
              </p>
              {!recurringFirstOccurrenceDate ? (
                <p className="text-sm text-on-surface-variant">{t("startBooking.recurringWhen.roomsNeedDate")}</p>
              ) : recurringRoomsLoading ? (
                <Spinner showText size="sm" text={t("startBooking.recurringWhen.roomsLoading")} />
              ) : recurringRooms.length === 0 ? (
                <p className="text-sm text-on-surface-variant">{t("startBooking.recurringWhen.roomsEmpty")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {recurringRooms.map((room) => (
                    <Checkbox
                      checked={recurringRoomIds.includes(room.id)}
                      disabled={!recurringRoomIds.includes(room.id) && recurringRoomIds.length >= maxRecurringRooms}
                      id={`recurring-room-${room.id}`}
                      key={room.id}
                      label={`${room.name} (${room.capacity})`}
                      onChange={() => toggleRecurringRoom(room.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {step === "recurring_conflicts" ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">
            {t("startBooking.recurringConflicts.title")}
          </h1>
          <div className="mt-8 w-full">
            <RecurringConflictReview
              conflicts={recurringConflicts}
              excludedDates={excludedDates}
              isPriorityMinistry={isPriorityMinistry}
              onToggleExcludeDate={toggleExcludedDate}
              rooms={recurringRooms}
              totalOccurrenceCount={recurringOccurrenceDates.length}
            />
          </div>
        </section>
      ) : null}

      <div className="mt-10 grid w-full grid-cols-3 items-center gap-3">
        <div className="justify-self-start">
          {step === "recurring_when" && seriesResult ? null : (
            <Button onClick={handleBack} size="md" startIcon={<MdArrowBack className="size-4" />} variant="outline">
              {t("startBooking.back")}
            </Button>
          )}
        </div>
        <div className="justify-self-center">
          {step === "select_ministry" ? (
            <Button onClick={() => setIsCreateOpen(true)} size="md" variant="primary">
              {t("startBooking.selectMinistry.createNew")}
            </Button>
          ) : null}
        </div>
        <div className="justify-self-end">
          {step === "recurring_when" && seriesResult ? null : (
            <Button
              disabled={!canGoForward || submittingSeries || previewingConflicts}
              onClick={handleContinue}
              size="md"
              variant="primary"
            >
              {submittingSeries
                ? t("startBooking.loading")
                : previewingConflicts
                  ? t("startBooking.recurringConflicts.loading")
                  : continueLabel}
            </Button>
          )}
        </div>
      </div>

      <CreateMinistryModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmitted={() => {
          void loadMinistries();
        }}
        userId={user?.id}
      />
    </main>
  );
};

export default StartBookingPage;
