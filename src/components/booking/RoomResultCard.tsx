import AvailabilitySlots from "@/components/booking/AvailabilitySlots";
import type { RoomAvailability } from "@/types/booking";
import { format_capacity_range } from "@/utils/bookingMock";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdZoomIn } from "react-icons/md";

interface RoomResultCardProps {
  room: RoomAvailability;
  onSelectTime?: (room: RoomAvailability) => void;
  onOpenGallery?: (room: RoomAvailability) => void;
  className?: string;
}

const RoomResultCard = ({ room, onSelectTime, onOpenGallery, className }: RoomResultCardProps) => {
  const { t } = useTranslation("booking");

  return (
    <article className={cn("rounded-[16px] bg-surface p-3 shadow-sm sm:p-4", className)}>
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
              <h3 className="text-lg font-bold text-on-surface">{room.name}</h3>
              <p className="mt-0.5 text-sm font-medium text-on-surface-variant">
                {t("room.capacity", { range: format_capacity_range(room) })}
              </p>
            </div>
            <AvailabilitySlots availability={room.availability} />
          </div>

          <button
            className="h-9 min-w-[130px] shrink-0 self-start rounded-[24px] bg-cta px-3 text-sm font-bold text-on-cta transition-colors hover:bg-cta-hover hover:text-on-cta-hover lg:self-end"
            onClick={() => onSelectTime?.(room)}
            type="button"
          >
            {t("room.selectTime")}
          </button>
        </div>
      </div>
    </article>
  );
};

export default RoomResultCard;
