import { bookingTitleFieldFeedback } from "@/utils/bookingTitle";
import { repeatedCartLineTime, type BookingLine, type RoomDay, type TimeRange } from "@/utils/timetableRules";
import { formatQuotedAmount } from "@/utils/paymentSummary";
import { Button, cn, Input, Spinner } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdPhoto } from "react-icons/md";

export interface EstimatedTotal {
  quotedAmount: string | number;
  currency: string;
}

interface BookingCartPanelProps {
  lines: BookingLine[];
  rooms: RoomDay[];
  mode?: "one_time" | "repeated";
  sharedTime?: TimeRange | null;
  title: string;
  onTitleChange: (title: string) => void;
  titleTouched: boolean;
  onTitleTouch: () => void;
  ministryName?: string | null;
  occurrenceCount?: number;
  estimatedTotal: EstimatedTotal | null;
  isPriceLoading?: boolean;
  priceUnavailable?: boolean;
  onReview: () => void;
  onRemove: (sequence: number) => void;
  onEdit?: (sequence: number) => void;
  formatClock: (clock: string) => string;
  reviewDisabled: boolean;
  isChecking?: boolean;
  statusMessage?: string | null;
  statusError?: string | null;
}

const BookingCartPanel = ({
  lines,
  rooms,
  mode = "one_time",
  sharedTime = null,
  title,
  onTitleChange,
  titleTouched,
  onTitleTouch,
  ministryName,
  occurrenceCount,
  estimatedTotal,
  isPriceLoading = false,
  priceUnavailable = false,
  onReview,
  onRemove,
  onEdit,
  formatClock,
  reviewDisabled,
  isChecking = false,
  statusMessage,
  statusError,
}: BookingCartPanelProps) => {
  const { t, i18n } = useTranslation("booking");
  const isRepeated = mode === "repeated";
  const titleFeedback = bookingTitleFieldFeedback(title, titleTouched, t);

  const roomForLine = (facilityId: string): RoomDay | undefined => {
    return rooms.find((room) => room.id === facilityId);
  };

  return (
    <aside
      aria-label={t("timetable.cart.title")}
      className="flex h-full min-h-0 w-[280px] shrink-0 flex-col overflow-hidden rounded-[10px] bg-surface xl:w-[300px]"
    >
      <div className="flex shrink-0 flex-col gap-2 px-4 pt-4">
        <div onBlur={onTitleTouch}>
          <Input
            error={titleFeedback.error}
            hint={titleFeedback.hint}
            id="timetable-cart-title"
            label={t("bookingTitle.label")}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={t("bookingTitle.placeholder")}
            required
            value={title}
          />
        </div>
        <p className="m-0 text-sm font-medium text-booking-primary">
          {t("timetable.cart.roomCount", { count: lines.length })}
        </p>
        {ministryName ? (
          <p className="m-0 text-sm font-medium text-booking-primary">
            {t("timetable.cart.ministry", { name: ministryName })}
          </p>
        ) : null}
        {isRepeated && sharedTime ? (
          <p className="m-0 text-sm font-medium text-booking-primary">
            {formatClock(sharedTime.start)} – {formatClock(sharedTime.end)}
          </p>
        ) : null}
        {isRepeated && occurrenceCount != null && occurrenceCount > 0 ? (
          <p className="m-0 text-sm font-medium text-booking-primary">
            {t("startBooking.recurringWhen.occurrenceCount", { count: occurrenceCount })}
          </p>
        ) : null}
        <div className="flex items-center justify-between border-t border-outline-variant pt-2 text-sm font-semibold text-booking-primary">
          <span>{t("timetable.cart.estimatedTotal")}</span>
          {isPriceLoading ? (
            <Spinner size="sm" />
          ) : estimatedTotal ? (
            <span>{formatQuotedAmount(estimatedTotal.quotedAmount, estimatedTotal.currency, i18n.language)}</span>
          ) : (
            <span className="text-on-surface-variant">
              {priceUnavailable ? t("timetable.cart.priceUnavailable") : "—"}
            </span>
          )}
        </div>
      </div>

      {isChecking ? (
        <div aria-busy="true" className="flex shrink-0 items-center gap-2 px-4 pt-2 text-sm text-on-surface-variant">
          <Spinner size="sm" />
          <span>{t("startBooking.recurringReview.checking")}</span>
        </div>
      ) : null}
      {statusError ? (
        <p className="m-0 shrink-0 px-4 pt-2 text-sm text-error" role="status">
          {statusError}
        </p>
      ) : null}
      {statusMessage ? <p className="m-0 shrink-0 px-4 pt-2 text-sm text-on-surface-variant">{statusMessage}</p> : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-4">
        {lines.length === 0 ? (
          <p className="m-0 text-sm text-on-surface-variant">
            {isRepeated ? t("timetable.cart.emptyRepeated") : t("timetable.cart.empty")}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0 pb-3">
            {lines.map((line) => {
              const room = roomForLine(line.facilityId);
              const photoUrl = room?.photoUrls[0];
              const displayTime = isRepeated
                ? repeatedCartLineTime({ lines, pinned: null, whenSeed: null, sharedTime, title: "" }, line)
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
      </div>

      <div className="shrink-0 border-t border-outline-variant p-4">
        <Button className="w-full" disabled={reviewDisabled} onClick={onReview} size="sm" variant="primary">
          {t("timetable.reviewAndConfirm")}
        </Button>
      </div>
    </aside>
  );
};

export default BookingCartPanel;
