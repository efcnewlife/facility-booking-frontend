import type { BookingMode } from "@/types/booking";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface BookingModeTabsProps {
  activeMode: BookingMode;
  onModeChange: (mode: BookingMode) => void;
}

const TAB_MODES: BookingMode[] = ["by_date", "by_room", "multi_rooms"];

const BookingModeTabs = ({ activeMode, onModeChange }: BookingModeTabsProps) => {
  const { t } = useTranslation("booking");

  const tabLabel = (mode: BookingMode): string => {
    switch (mode) {
      case "by_date":
        return t("tabs.byDate");
      case "by_room":
        return t("tabs.byRoom");
      case "multi_rooms":
        return t("tabs.multiRooms");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
      {TAB_MODES.map((mode) => {
        const isActive = activeMode === mode;

        return (
          <button
            key={mode}
            className={cn(
              "h-10 min-w-[140px] rounded-[80px] px-4 text-sm transition-colors sm:min-w-[160px]",
              isActive
                ? "bg-gray-dark font-medium text-white"
                : "border border-gray-dark bg-surface font-bold text-gray-dark hover:bg-surface-variant"
            )}
            onClick={() => onModeChange(mode)}
            type="button"
          >
            {tabLabel(mode)}
          </button>
        );
      })}
    </div>
  );
};

export default BookingModeTabs;
