import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface EmptyResultsPanelProps {
  className?: string;
}

const EmptyResultsPanel = ({ className }: EmptyResultsPanelProps) => {
  const { t } = useTranslation("booking");

  return (
    <div
      className={cn(
        "flex min-h-[200px] w-full items-center justify-center rounded-[16px] bg-booking-grey px-5 py-8",
        className
      )}
    >
      <p className="text-center text-lg font-bold text-on-surface">{t("empty.noAvailableRooms")}</p>
    </div>
  );
};

export default EmptyResultsPanel;
