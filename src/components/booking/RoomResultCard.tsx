import AvailabilitySlots from "@/components/booking/AvailabilitySlots";
import type { RoomAvailability, TimeSlot } from "@/types/booking";
import { format_capacity_range } from "@/utils/bookingMock";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdZoomIn } from "react-icons/md";

interface RoomResultCardProps {
  room: RoomAvailability;
  onSelectTime?: (room: RoomAvailability) => void;
  onSelectSlot?: (room: RoomAvailability, slot: TimeSlot, period: "am" | "pm") => void;
  onOpenGallery?: (room: RoomAvailability) => void;
  isSelected?: boolean;
  selectedLabel?: string;
  className?: string;
}

const RoomResultCard = ({
  room,
  onSelectTime,
  onSelectSlot,
  onOpenGallery,
  isSelected = false,
  selectedLabel,
  className,
}: RoomResultCardProps) => {
  const { t } = useTranslation("booking");

  return (
    <article
      className={cn(
        "rounded-[16px] bg-surface p-3 shadow-sm transition-shadow sm:p-4",
        isSelected && "ring-2 ring-primary shadow-md",
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="relative shrink-0 lg:w-[300px]">
          <div className="aspect-[380/225] w-full rounded-sm bg-booking-grey lg:h-[178px]" />
          <button
            aria-label={t("gallery.zoom")}
            className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-on-surface-variant shadow-sm transition-colors hover:text-primary"
            onClick={() => onOpenGallery?.(room)}
            type="button"
          >
            <MdZoomIn className="size-5" />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-on-surface">{room.name}</h3>
                {isSelected && selectedLabel ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {selectedLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm font-medium text-on-surface-variant">
                {t("room.capacity", { range: format_capacity_range(room) })}
              </p>
            </div>
            <AvailabilitySlots
              availability={room.availability}
              onSelectSlot={onSelectSlot ? (slot, period) => onSelectSlot(room, slot, period) : undefined}
            />
          </div>

          {!onSelectSlot ? (
            <button
              className="btn-booking-secondary h-9 min-w-[130px] shrink-0 self-start rounded-[24px] px-3 text-sm font-bold lg:self-end"
              onClick={() => onSelectTime?.(room)}
              type="button"
            >
              {t("room.selectTime")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export default RoomResultCard;
