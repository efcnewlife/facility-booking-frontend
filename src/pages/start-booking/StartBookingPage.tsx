import ministryService from "@/api/services/ministryService";
import ChoicePill from "@/components/booking/ChoicePill";
import StartBookingProgress from "@/components/booking/StartBookingProgress";
import { useAuth } from "@/context/AuthContext";
import CreateMinistryModal from "@/pages/start-booking/CreateMinistryModal";
import type { MinistryItem } from "@/types/ministry";
import {
  buildRoomsSearchQuery,
  canAdvance,
  isStartBookingStep,
  isWhenEndAfterStart,
  nextStep,
  previousStep,
  toRoomsSearchParams,
  type BookingFrequency,
  type SpaceNeededChoice,
  type StartBookingAnswers,
  type StartBookingStep,
} from "@/utils/startBookingFlow";
import { Alert, Button, DatePicker, Select, TimePicker, type DatePickerValue, type TimePickerValue } from "@efcnewlife/newlife-ui";
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
  const [space, setSpace] = useState<SpaceNeededChoice | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const minDate = moment(now).format("YYYY-MM-DD");
  const maxDate = moment(now).add(1, "year").format("YYYY-MM-DD");

  const when = {
    date: dateValue?.format("YYYY-MM-DD") ?? null,
    start: startValue?.format("HH:mm") ?? null,
    end: endValue?.format("HH:mm") ?? null,
  };

  const answers: StartBookingAnswers = {
    isMinistryBooking,
    ministryId,
    frequency,
    when,
    space,
  };
  const canGoForward = canAdvance(step, answers, now);
  const endTimeError = isWhenEndAfterStart(when) ? undefined : t("startBooking.when.endAfterStart");

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
    [isMinistryBooking, setSearchParams],
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

  const handleMinistryChoice = (value: string) => {
    const isMinistry = value === "yes";
    if (!isMinistry) {
      setMinistryId(null);
    }
    const next = nextStep("ministry_choice", { ...answers, isMinistryBooking: isMinistry }, now);
    if (next && next !== "rooms") {
      goToStep(next, isMinistry);
    }
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
        { state: query },
      );
      return;
    }
    if (next) {
      goToStep(next);
    }
  };

  const continueLabel = step === "space_needed" ? t("startBooking.search") : t("startBooking.continue");

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
          <h1 className="text-center text-4xl font-semibold text-on-surface">{t("startBooking.ministryChoice.title")}</h1>
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
          <h1 className="text-center text-4xl font-semibold text-on-surface">{t("startBooking.selectMinistry.title")}</h1>
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
          {frequency === "repeated" ? (
            <Alert
              className="mt-6"
              message={t("startBooking.frequency.repeatedUnavailableMessage")}
              size="lg"
              title={t("startBooking.frequency.repeatedUnavailableTitle")}
              variant="info"
              width="full"
            />
          ) : null}
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
                required
                value={startValue}
              />
              <TimePicker
                ampm
                id="start-booking-end"
                error={endTimeError}
                label={t("startBooking.when.end")}
                onChange={(value) => setEndValue(value)}
                placeholder={t("startBooking.when.endPlaceholder")}
                required
                value={endValue}
              />
            </div>
          </div>
        </section>
      ) : null}

      {step === "space_needed" ? (
        <section className="mt-10 flex w-full flex-col items-center">
          <h1 className="text-center text-4xl font-semibold text-on-surface">{t("startBooking.spaceNeeded.title")}</h1>
          <div className="mt-8 grid w-full grid-cols-2 gap-4">
            <ChoicePill
              checked={space === "single"}
              id="space-single"
              label={t("startBooking.spaceNeeded.single")}
              name="space"
              onChange={() => setSpace("single")}
              value="single"
              wide
            />
            <ChoicePill
              checked={space === "multiple"}
              id="space-multiple"
              label={t("startBooking.spaceNeeded.multiple")}
              name="space"
              onChange={() => setSpace("multiple")}
              value="multiple"
              wide
            />
            <ChoicePill
              checked={space === "gym"}
              id="space-gym"
              label={t("startBooking.spaceNeeded.gym")}
              name="space"
              onChange={() => setSpace("gym")}
              value="gym"
              wide
            />
            <ChoicePill
              checked={space === "sanctuary"}
              id="space-sanctuary"
              label={t("startBooking.spaceNeeded.sanctuary")}
              name="space"
              onChange={() => setSpace("sanctuary")}
              value="sanctuary"
              wide
            />
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
