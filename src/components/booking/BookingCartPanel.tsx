import {
  canReviewCart,
  repeatedCartLineTime,
  type BookingLine,
  type RoomDay,
  type TimeRange,
} from "@/utils/timetableRules";
import { formatQuotedAmount } from "@/utils/paymentSummary";
import { Button, cn, Spinner } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdPhoto } from "react-icons/md";

interface BookingCartPanelProps {
  lines: BookingLine[];
  rooms: RoomDay[];
  mode?: "one_time" | "repeated";
  sharedTime?: TimeRange | null;
  onReview: () => void;
  onRemove: (sequence: number) => void;
  onEdit?: (sequence: number) => void;
  formatClock: (clock: string) => string;
  reviewDisabled?: boolean;
  isChecking?: boolean;
  statusMessage?: string | null;
  statusError?: string | null;
}

const BookingCartPanel = ({
  lines,
  rooms,
  mode = "one_time",
  sharedTime = null,
  onReview,
  onRemove,
  onEdit,
  formatClock,
  reviewDisabled = false,
  isChecking = false,
  statusMessage,
  statusError,
}: BookingCartPanelProps) => {
  const { t, i18n } = useTranslation("booking");
  const isRepeated = mode === "repeated";
  const canReview = isRepeated
    ? !reviewDisabled
    : canReviewCart({ lines, pinned: null, whenSeed: null, sharedTime: null });

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
      {isChecking ? (
        <div aria-busy="true" className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Spinner size="sm" />
          <span>{t("startBooking.recurringReview.checking")}</span>
        </div>
      ) : null}
      {statusError ? (
        <p className="m-0 text-sm text-error" role="status">
          {statusError}
        </p>
      ) : null}
      {statusMessage ? <p className="m-0 text-sm text-on-surface-variant">{statusMessage}</p> : null}

      {lines.length === 0 ? (
        <p className="m-0 text-sm text-on-surface-variant">
          {isRepeated ? t("timetable.cart.emptyRepeated") : t("timetable.cart.empty")}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {lines.map((line) => {
            const room = roomForLine(line.facilityId);
            const photoUrl = room?.photoUrls[0];
            const displayTime = isRepeated
              ? repeatedCartLineTime({ lines, pinned: null, whenSeed: null, sharedTime }, line)
              : line;
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
                      {formatClock(displayTime.start)} – {formatClock(displayTime.end)}
                    </p>
                    {isRepeated ? null : (
                      <p className="m-0 mt-1 text-xs font-semibold text-booking-primary">
                        {formatQuotedAmount(line.lineSubtotal, line.currency, i18n.language)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {isRepeated || !onEdit ? null : (
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
                  )}
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
