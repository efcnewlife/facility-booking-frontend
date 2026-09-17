import { Button, DatePicker, cn, type DatePickerValue } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

interface RecurringScheduleCardProps {
  weekday: number | null;
  startsOn: DatePickerValue;
  endsOn: DatePickerValue;
  occurrenceCount: number;
  lastOccurrenceError?: string;
  minDate: string;
  maxDate?: string;
  onWeekdayChange: (weekday: number) => void;
  onStartsOnChange: (value: DatePickerValue) => void;
  onEndsOnChange: (value: DatePickerValue) => void;
}

const RecurringScheduleCard = ({
  weekday,
  startsOn,
  endsOn,
  occurrenceCount,
  lastOccurrenceError,
  minDate,
  maxDate,
  onWeekdayChange,
  onStartsOnChange,
  onEndsOnChange,
}: RecurringScheduleCardProps) => {
  const { t } = useTranslation("booking");

  return (
    <section
      aria-label={t("startBooking.recurringSchedule.title")}
      className="w-full rounded-[10px] border border-outline bg-surface px-4 py-4"
    >
      <h2 className="m-0 text-lg font-semibold text-on-surface">{t("startBooking.recurringSchedule.title")}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{t("startBooking.recurringSchedule.cadenceEveryWeek")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-on-surface">{t("startBooking.recurringSchedule.weekday")}</span>
        {WEEKDAYS.map((day) => (
          <Button
            aria-pressed={weekday === day}
            key={day}
            onClick={() => onWeekdayChange(day)}
            size="xs"
            variant={weekday === day ? "primary" : "outline"}
          >
            {t(`startBooking.recurringSchedule.weekdays.${day}`)}
          </Button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DatePicker
          clearable={false}
          id="repeated-starts-on"
          label={t("startBooking.recurringSchedule.startsOn")}
          maxDate={maxDate}
          minDate={minDate}
          onChange={onStartsOnChange}
          placeholder={t("startBooking.when.datePlaceholder")}
          required
          value={startsOn}
        />
        <DatePicker
          clearable={false}
          error={lastOccurrenceError}
          id="repeated-ends-on"
          label={t("startBooking.recurringSchedule.endsOn")}
          maxDate={maxDate}
          minDate={minDate}
          onChange={onEndsOnChange}
          placeholder={t("startBooking.when.datePlaceholder")}
          required
          value={endsOn}
        />
      </div>
      {occurrenceCount > 0 ? (
        <p className={cn("mt-3 text-sm text-on-surface-variant")}>
          {t("startBooking.recurringWhen.occurrenceCount", { count: occurrenceCount })}
        </p>
      ) : null}
    </section>
  );
};

export default RecurringScheduleCard;
