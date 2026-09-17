import BookingCartPanel from "@/components/booking/BookingCartPanel";
import { canOpenReview, type RecurringSeriesReviewSnapshot } from "@/utils/recurringSeriesReview";
import type { BookingLine, RoomDay, TimeRange } from "@/utils/timetableRules";
import { useTranslation } from "react-i18next";

interface RepeatedSeriesPanelProps {
  reviewState: RecurringSeriesReviewSnapshot;
  lines: BookingLine[];
  rooms: RoomDay[];
  sharedTime: TimeRange | null;
  onReview: () => void;
  onRemove: (sequence: number) => void;
  formatClock: (clock: string) => string;
}

const RepeatedSeriesPanel = ({
  reviewState,
  lines,
  rooms,
  sharedTime,
  onReview,
  onRemove,
  formatClock,
}: RepeatedSeriesPanelProps) => {
  const { t } = useTranslation("booking");
  const canReview = canOpenReview(reviewState);
  const isChecking = reviewState.previewStatus === "scheduled" || reviewState.previewStatus === "loading";
  const statusMessage =
    !isChecking && !canReview && !reviewState.previewError
      ? t("startBooking.recurringReview.needCompleteProposal")
      : t("startBooking.recurringReview.previewDoesNotReserve");

  return (
    <BookingCartPanel
      formatClock={formatClock}
      isChecking={isChecking}
      lines={lines}
      mode="repeated"
      onRemove={onRemove}
      onReview={onReview}
      reviewDisabled={!canReview}
      rooms={rooms}
      sharedTime={sharedTime}
      statusError={reviewState.previewError}
      statusMessage={statusMessage}
    />
  );
};

export default RepeatedSeriesPanel;
