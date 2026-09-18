import facilityService from "@/api/services/facilityService";
import ministryService from "@/api/services/ministryService";
import ChoicePill from "@/components/booking/ChoicePill";
import StartBookingProgress from "@/components/booking/StartBookingProgress";
import { useAuth } from "@/context/AuthContext";
import CreateMinistryModal from "@/pages/start-booking/CreateMinistryModal";
import type { MinistryItem } from "@/types/ministry";
import { clearStartBookingState } from "@/utils/startBookingEntry";
import {
  applyFirstOccurrenceDate,
  applyWeekday,
  buildRoomsSearchQuery,
  canAdvance,
  frequencyAfterAvailabilityRefresh,
  isRepeatedFrequencySelectable,
  isWhenEndAfterStart,
  isStartBookingStep,
  nextStep,
  previousStep,
  repeatedWindowForAdvance,
  repeatedWindowNoticeKind,
  toRoomsSearchParams,
  type BookingFrequency,
  type RecurringWhenValue,
  type StartBookingAnswers,
  type StartBookingStep,
} from "@/utils/startBookingFlow";
import {
  Alert,
  Button,
  DatePicker,
  Select,
  TimePicker,
  type DatePickerValue,
  type TimePickerValue,
} from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useState } from "react";
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
  const { t, i18n } = useTranslation("booking");
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
  const [recurringDateValue, setRecurringDateValue] = useState<DatePickerValue>(null);
  const [recurringWeekday, setRecurringWeekday] = useState<number | null>(null);
  const [recurringStartValue, setRecurringStartValue] = useState<TimePickerValue>(null);
  const [recurringEndValue, setRecurringEndValue] = useState<TimePickerValue>(null);
  const [repeatedWindowOpen, setRepeatedWindowOpen] = useState<boolean | null>(null);
  const [repeatedWindowNextOpening, setRepeatedWindowNextOpening] = useState<string | null>(null);
  const now = new Date();
  const minDate = moment(now).format("YYYY-MM-DD");
  const maxDate = moment(now).add(1, "year").format("YYYY-MM-DD");

  const when = {
    date: dateValue?.format("YYYY-MM-DD") ?? null,
    start: startValue?.format("HH:mm") ?? null,
    end: endValue?.format("HH:mm") ?? null,
  };

  const recurringWhen: RecurringWhenValue = {
    weekday: recurringWeekday,
    firstOccurrenceDate: recurringDateValue?.format("YYYY-MM-DD") ?? null,
    lastOccurrenceDate: null,
    startTime: recurringStartValue?.format("HH:mm") ?? null,
    endTime: recurringEndValue?.format("HH:mm") ?? null,
    roomIds: [],
  };

  const answers: StartBookingAnswers = {
    isMinistryBooking,
    ministryId,
    frequency,
    when,
    recurringWhen,
  };
  const windowForAdvance = repeatedWindowForAdvance(step, frequency, repeatedWindowOpen);
  const canGoForward = canAdvance(step, answers, now, windowForAdvance);
  const repeatedSelectable = isRepeatedFrequencySelectable(repeatedWindowOpen);
  const endTimeError = isWhenEndAfterStart(when) ? undefined : t("startBooking.when.endAfterStart");
  const recurringTimeIncomplete = Boolean(recurringWhen.startTime) !== Boolean(recurringWhen.endTime);
  const recurringEndTimeError = recurringTimeIncomplete
    ? t("startBooking.errors.halfFilledTime")
    : isWhenEndAfterStart({
          date: null,
          start: recurringWhen.startTime,
          end: recurringWhen.endTime,
        })
      ? undefined
      : t("startBooking.when.endAfterStart");

  const repeatedWindowNextOpeningLabel = repeatedWindowNextOpening
    ? moment(repeatedWindowNextOpening).locale(i18n.language).format("LL")
    : null;
  const frequencyWindowNotice = repeatedWindowNoticeKind(repeatedWindowOpen, repeatedWindowNextOpening);
  const frequencyWindowMessage =
    frequencyWindowNotice === "closed_with_date" && repeatedWindowNextOpeningLabel
      ? t("startBooking.frequency.windowClosedWithDate", { date: repeatedWindowNextOpeningLabel })
      : frequencyWindowNotice === "closed"
        ? t("startBooking.frequency.windowClosed")
        : t("startBooking.frequency.windowMessage");
  const repeatedWindowMessage =
    step === "recurring_when" && repeatedWindowOpen === false
      ? repeatedWindowNextOpeningLabel
        ? t("startBooking.errors.recurringAvailabilityWindowWithDate", {
            date: repeatedWindowNextOpeningLabel,
          })
        : t("startBooking.errors.recurringAvailabilityWindow")
      : null;
  const bannerError = error ?? repeatedWindowMessage;

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
    void clearStartBookingState(
      window.localStorage,
      () => facilityService.deleteAllMyBookingDrafts(),
      () => facilityService.deleteAllMyBookingSeriesDrafts()
    );
  }, []);

  useEffect(() => {
    if (step !== "frequency" && step !== "recurring_when") {
      return;
    }
    const firstOccurrenceDate = step === "recurring_when" ? recurringWhen.firstOccurrenceDate : null;
    let cancelled = false;
    setRepeatedWindowOpen(null);
    const loadWindow = async () => {
      try {
        const status = await facilityService.getRecurringBookingWindowStatus(firstOccurrenceDate);
        if (!cancelled) {
          setRepeatedWindowOpen(status.isOpen);
          setRepeatedWindowNextOpening(status.nextOpeningDate);
        }
      } catch (err) {
        if (!cancelled) {
          setRepeatedWindowOpen(false);
          setRepeatedWindowNextOpening(null);
          setError(err instanceof Error ? err.message : t("startBooking.errors.recurringAvailabilityWindow"));
        }
      }
    };
    void loadWindow();
    return () => {
      cancelled = true;
    };
  }, [recurringWhen.firstOccurrenceDate, step, t]);

  useEffect(() => {
    if (step !== "frequency") {
      return;
    }
    setFrequency((current) => frequencyAfterAvailabilityRefresh(current, repeatedWindowOpen));
  }, [repeatedWindowOpen, step]);

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
    const next = nextStep(step, answers, now, windowForAdvance);
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
    if (next && next !== "create_series") {
      goToStep(next);
    }
  };

  const continueLabel =
    step === "when" || step === "recurring_when" ? t("startBooking.search") : t("startBooking.continue");

  const handleRecurringDateChange = (value: DatePickerValue) => {
    setRecurringDateValue(value);
    const next = applyFirstOccurrenceDate(recurringWhen, value?.format("YYYY-MM-DD") ?? null);
    setRecurringWeekday(next.weekday);
  };

  const handleRecurringWeekdayChange = (weekday: number) => {
    const next = applyWeekday(recurringWhen, weekday);
    setRecurringWeekday(next.weekday);
    if (!next.firstOccurrenceDate) {
      setRecurringDateValue(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col items-center px-6 py-8 sm:px-8">
      <StartBookingProgress step={step} />

      {bannerError ? (
        <div className="mt-6 w-full">
          <Alert message={bannerError} title={t("startBooking.errors.title")} variant="error" width="full" />
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
              disabled={!repeatedSelectable}
              hint={t("startBooking.frequency.repeatedHint")}
              id="frequency-repeated"
              label={t("startBooking.frequency.repeated")}
              name="frequency"
              onChange={() => setFrequency("repeated")}
              value="repeated"
            />
          </div>
          <Alert
            className="mt-10"
            message={frequencyWindowMessage}
            messageLines={6}
            size="lg"
            title={t("startBooking.frequency.windowTitle")}
            variant="warning"
            width="full"
          />
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

      {step === "recurring_when" ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">
            {t("startBooking.recurringWhen.sharedTimeTitle")}
          </h1>
          <p className="mt-3 text-center text-lg text-on-surface">{t("startBooking.recurringWhen.sharedTimeBody")}</p>
          <div className="mt-8 w-full space-y-4">
            <DatePicker
              id="recurring-when-first-occurrence"
              label={t("startBooking.recurringWhen.firstOccurrence")}
              maxDate={maxDate}
              minDate={minDate}
              onChange={handleRecurringDateChange}
              placeholder={t("startBooking.when.datePlaceholder")}
              required
              value={recurringDateValue}
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-on-surface">{t("startBooking.recurringSchedule.weekday")}</span>
              {([0, 1, 2, 3, 4, 5, 6] as const).map((day) => (
                <Button
                  aria-pressed={recurringWeekday === day}
                  key={day}
                  onClick={() => handleRecurringWeekdayChange(day)}
                  size="xs"
                  variant={recurringWeekday === day ? "primary" : "outline"}
                >
                  {t(`startBooking.recurringSchedule.weekdays.${day}`)}
                </Button>
              ))}
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
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
          </div>
        </section>
      ) : null}

      <div className="mt-10 grid w-full grid-cols-3 items-center gap-3">
        <div className="justify-self-start">
          <Button onClick={handleBack} size="md" startIcon={<MdArrowBack className="size-4" />} variant="outline">
            {t("startBooking.back")}
          </Button>
        </div>
        <div className="justify-self-center">
          {step === "select_ministry" ? (
            <Button onClick={() => setIsCreateOpen(true)} size="md" variant="primary">
              {t("startBooking.selectMinistry.createNew")}
            </Button>
          ) : null}
        </div>
        <div className="justify-self-end">
          <Button disabled={!canGoForward} onClick={handleContinue} size="md" variant="primary">
            {continueLabel}
          </Button>
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
