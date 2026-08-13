import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import type { StartBookingStep } from "@/utils/startBookingFlow";

const SEGMENTS: Array<{ step: StartBookingStep; labelKey: string }> = [
  { step: "ministry_choice", labelKey: "startBooking.progress.startBooking" },
  { step: "select_ministry", labelKey: "startBooking.progress.ministryName" },
  { step: "frequency", labelKey: "startBooking.progress.howOften" },
  { step: "when", labelKey: "startBooking.progress.dateTime" },
  { step: "space_needed", labelKey: "startBooking.progress.spaceNeeded" },
];

interface StartBookingProgressProps {
  step: StartBookingStep;
}

const StartBookingProgress = ({ step }: StartBookingProgressProps) => {
  const { t } = useTranslation("booking");
  const currentIndex = SEGMENTS.findIndex((segment) => segment.step === step);

  return (
    <div
      aria-label={t("startBooking.progress.label", { current: currentIndex + 1, total: SEGMENTS.length })}
      className="flex h-5 items-end gap-1.5"
    >
      {SEGMENTS.map((segment, index) => {
        const isCurrent = index === currentIndex;
        const isReached = index <= currentIndex;
        return (
          <div className="flex h-5 w-[100px] flex-col justify-end gap-0.5" key={segment.step}>
            {isCurrent ? (
              <span className="h-[11px] text-[9px] font-medium leading-none text-booking-secondary">
                {t(segment.labelKey)}
              </span>
            ) : (
              <span className="h-[11px]" />
            )}
            <div
              className={cn(
                "h-1.5 w-full rounded-[5px]",
                isReached ? "bg-booking-secondary" : "bg-booking-grey",
              )}
            />
          </div>
        );
      })}
    </div>
  );
};

export default StartBookingProgress;
