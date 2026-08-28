import type { Room } from "@/types/booking";
import { format_capacity_range } from "@/utils/bookingMock";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdAddBox, MdCheckBox, MdZoomIn } from "react-icons/md";

interface RoomGridCardProps {
  room: Room;
  variant: "by_room" | "multi_room";
  isSelected?: boolean;
  onSeeAvailability?: (room: Room) => void;
  onToggleSelect?: (room: Room) => void;
  onOpenGallery?: (room: Room) => void;
}

const RoomGridCard = ({
  room,
  variant,
  isSelected = false,
  onSeeAvailability,
  onToggleSelect,
  onOpenGallery,
}: RoomGridCardProps) => {
  const { t } = useTranslation("booking");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[16px] bg-surface shadow-sm">
      <div className="relative mx-3 mt-3">
        <div className="aspect-[460/270] w-full rounded-sm bg-booking-grey" />
        <button
          aria-label={t("gallery.zoom")}
          className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-white/90 text-on-surface-variant shadow-sm transition-colors hover:text-primary"
          onClick={() => onOpenGallery?.(room)}
          type="button"
        >
          <MdZoomIn className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 items-end justify-between gap-3 px-4 pb-4 pt-3">
        <div>
          <h3 className="text-lg font-bold text-on-surface">{room.name}</h3>
          <p className="mt-0.5 text-sm font-medium text-on-surface-variant">
            {t("room.capacity", { range: format_capacity_range(room) })}
          </p>
        </div>

        {variant === "by_room" ? (
          <button
            className="btn-booking-secondary h-9 min-w-[130px] shrink-0 rounded-[24px] px-3 text-sm font-bold"
            onClick={() => onSeeAvailability?.(room)}
            type="button"
          >
            {t("room.seeAvailability")}
          </button>
        ) : (
          <button
            aria-pressed={isSelected}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center transition-colors",
              isSelected ? "text-primary" : "text-on-surface-variant hover:text-primary"
            )}
            onClick={() => onToggleSelect?.(room)}
            type="button"
          >
            {isSelected ? <MdCheckBox className="size-9" /> : <MdAddBox className="size-9" />}
          </button>
        )}
      </div>
    </article>
  );
};

export default RoomGridCard;
