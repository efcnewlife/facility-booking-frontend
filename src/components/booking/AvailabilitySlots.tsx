import type { DayAvailability } from "@/types/booking";
import { format_time_slot } from "@/utils/bookingMock";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface AvailabilitySlotsProps {
  availability: DayAvailability;
  className?: string;
}

const AvailabilitySlots = ({ availability, className }: AvailabilitySlotsProps) => {
  const { t } = useTranslation("booking");

  const renderRow = (label: string, slots: DayAvailability["am"]) => {
    if (slots.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-7 shrink-0 text-sm font-medium text-on-surface">{label}</span>
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <span
              key={`${slot.start}-${slot.end}`}
              className="inline-flex h-7 min-w-[96px] items-center justify-center rounded-[5px] border border-booking-green px-2 text-sm font-medium text-booking-green"
            >
              {format_time_slot(slot)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-on-surface">{t("room.availability")}</p>
      {renderRow(t("room.am"), availability.am)}
      {renderRow(t("room.pm"), availability.pm)}
    </div>
  );
};

export default AvailabilitySlots;
