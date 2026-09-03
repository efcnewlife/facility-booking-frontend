import { canReviewCart, type BookingLine, type RoomDay } from "@/utils/timetableRules";
import { Button, cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdPhoto } from "react-icons/md";

interface BookingCartPanelProps {
  lines: BookingLine[];
  rooms: RoomDay[];
  onReview: () => void;
  onRemove: (sequence: number) => void;
  onEdit: (sequence: number) => void;
  formatClock: (clock: string) => string;
}

const BookingCartPanel = ({ lines, rooms, onReview, onRemove, onEdit, formatClock }: BookingCartPanelProps) => {
  const { t } = useTranslation("booking");
  const canReview = canReviewCart({ lines, pinned: null, whenSeed: null });

  const roomForLine = (facilityId: string): RoomDay | undefined => {
    return rooms.find((room) => room.id === facilityId);
  };

  return (
    <aside
      aria-label={t("timetable.cart.title")}
      className="flex w-[280px] shrink-0 flex-col gap-3 rounded-[10px] bg-surface px-4 py-4 xl:w-[300px]"
    >
      <Button className="w-full" disabled={!canReview} onClick={onReview} size="sm" variant="primary">
        {lines.length > 0 ? t("timetable.reviewBookingCount", { count: lines.length }) : t("timetable.reviewBooking")}
      </Button>

      {lines.length === 0 ? (
        <p className="m-0 text-sm text-on-surface-variant">{t("timetable.cart.empty")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {lines.map((line) => {
            const room = roomForLine(line.facilityId);
            const photoUrl = room?.photoUrls[0];
            return (
              <li
                className="flex flex-col gap-2 rounded-lg border border-outline-variant bg-surface-container p-3"
                key={line.sequence}
              >
                <div className="flex gap-3">
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded bg-booking-grey">
                    {photoUrl ? (
                      <img alt="" className="size-full object-cover" src={photoUrl} />
                    ) : (
                      <div aria-hidden className="flex size-full items-center justify-center text-booking-primary/40">
                        <MdPhoto size={24} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm font-bold text-booking-primary">
                      {room?.name ?? line.facilityId}
                    </p>
                    <p className="m-0 mt-1 text-xs font-medium text-on-surface-variant">
                      {formatClock(line.start)} – {formatClock(line.end)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className={cn(
                      "flex-1 rounded-md border border-outline px-2 py-1.5 text-xs font-semibold text-booking-primary",
                      "hover:bg-surface-container"
                    )}
                    onClick={() => onEdit(line.sequence)}
                    type="button"
                  >
                    {t("bookingDetails.edit")}
                  </button>
                  <button
                    className={cn(
                      "flex-1 rounded-md border border-outline px-2 py-1.5 text-xs font-semibold text-booking-primary",
                      "hover:bg-surface-container"
                    )}
                    onClick={() => onRemove(line.sequence)}
                    type="button"
                  >
                    {t("bookingDetails.remove")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};

export default BookingCartPanel;
