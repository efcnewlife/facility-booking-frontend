import i18n from "@/i18n";
import { cn } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdChevronLeft, MdChevronRight, MdKeyboardArrowDown } from "react-icons/md";

interface BookingDatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const WEEKDAY_LABELS = ["Mon", "Tues", "Wed", "Thur", "Fri", "Sat", "Sun"];

const BookingDatePicker = ({
  value,
  onChange,
  isOpen: controlledOpen,
  onOpenChange,
  className,
}: BookingDatePickerProps) => {
  const { t } = useTranslation("booking");
  const [internalOpen, setInternalOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => moment(value ?? new Date()));
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledOpen ?? internalOpen;

  const setOpen = (open: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(open);
    }
    onOpenChange?.(open);
  };

  useEffect(() => {
    if (value) {
      setViewMonth(moment(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const formattedValue = useMemo(() => {
    if (!value) {
      return "";
    }

    return moment(value).locale(i18n.language).format("ddd, MMM D, YYYY");
  }, [value, i18n.language]);

  const calendarDays = useMemo(() => {
    const startOfMonth = viewMonth.clone().startOf("month");
    const startOffset = (startOfMonth.day() + 6) % 7;
    const gridStart = startOfMonth.clone().subtract(startOffset, "days");
    const days: moment.Moment[] = [];

    for (let index = 0; index < 42; index += 1) {
      days.push(gridStart.clone().add(index, "days"));
    }

    return days;
  }, [viewMonth]);

  const handleSelectDay = (day: moment.Moment) => {
    onChange(day.toDate());
    setOpen(false);
  };

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      <button
        className="flex h-11 w-full min-w-[240px] max-w-[260px] items-center justify-between rounded-[12px] border border-primary bg-surface px-3 text-left sm:min-w-[260px]"
        onClick={() => setOpen(!isOpen)}
        type="button"
      >
        <span className="truncate text-lg font-bold text-on-surface">
          {formattedValue || t("sections.selectDate")}
        </span>
        <MdKeyboardArrowDown
          className={cn("size-5 shrink-0 text-primary transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute left-1/2 z-30 mt-2 w-[min(340px,calc(100vw-2rem))] -translate-x-1/2 rounded-[16px] border border-primary bg-surface p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <button
              aria-label="Previous month"
              className="flex size-8 items-center justify-center text-on-surface hover:text-primary"
              onClick={() => setViewMonth((month) => month.clone().subtract(1, "month"))}
              type="button"
            >
              <MdChevronLeft className="size-6" />
            </button>
            <span className="text-sm font-bold text-on-surface">{viewMonth.format("MMMM YYYY")}</span>
            <button
              aria-label="Next month"
              className="flex size-8 items-center justify-center text-on-surface hover:text-primary"
              onClick={() => setViewMonth((month) => month.clone().add(1, "month"))}
              type="button"
            >
              <MdChevronRight className="size-6" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-2">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-center text-xs font-medium text-on-surface-variant">
                {label}
              </div>
            ))}

            {calendarDays.map((day) => {
              const isCurrentMonth = day.month() === viewMonth.month();
              const isSelected = value ? day.isSame(moment(value), "day") : false;

              return (
                <button
                  key={day.format("YYYY-MM-DD")}
                  className={cn(
                    "mx-auto flex size-6 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    !isCurrentMonth && "opacity-40",
                    isSelected
                      ? "bg-booking-selected-day text-on-surface"
                      : "border border-primary/40 text-on-surface hover:border-primary hover:bg-brand-50",
                  )}
                  onClick={() => handleSelectDay(day)}
                  type="button"
                >
                  {day.date()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDatePicker;
