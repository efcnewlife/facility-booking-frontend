import BookingCartPanel from "@/components/booking/BookingCartPanel";
import { canReviewAndConfirm, type RecurringSeriesReviewSnapshot } from "@/utils/recurringSeriesReview";
import type { BookingLine, RoomDay, TimeRange } from "@/utils/timetableRules";
import { useTranslation } from "react-i18next";

interface CartMinistryOption {
  id: string;
  name: string;
}

interface RepeatedSeriesPanelProps {
  reviewState: RecurringSeriesReviewSnapshot;
  lines: BookingLine[];
  rooms: RoomDay[];
  sharedTime: TimeRange | null;
  occurrenceCount: number;
  ministryId?: string | null;
  ministryName?: string | null;
  bookableMinistries?: CartMinistryOption[];
  onMinistryAssociationChange?: (ministryId: string | null) => void;
  titleTouched: boolean;
  onTitleChange: (title: string) => void;
  onTitleTouch: () => void;
  onReview: () => void;
  onRemove: (sequence: number) => void;
  formatClock: (clock: string) => string;
}

const RepeatedSeriesPanel = ({
  reviewState,
  lines,
  rooms,
  sharedTime,
  occurrenceCount,
  ministryId,
  ministryName,
  bookableMinistries,
  onMinistryAssociationChange,
  titleTouched,
  onTitleChange,
  onTitleTouch,
  onReview,
  onRemove,
  formatClock,
}: RepeatedSeriesPanelProps) => {
  const { t } = useTranslation("booking");
  const canReview = canReviewAndConfirm(reviewState);
  const isChecking = reviewState.previewStatus === "scheduled" || reviewState.previewStatus === "loading";
  const priceUnavailable = reviewState.previewStatus === "error";
  const statusMessage =
    !isChecking && !canReview && !reviewState.previewError
      ? t("startBooking.recurringReview.needCompleteProposal")
      : t("startBooking.recurringReview.previewDoesNotReserve");

  return (
    <BookingCartPanel
      bookableMinistries={bookableMinistries}
      estimatedTotal={
        reviewState.previewStatus === "ready" && reviewState.quotedAmount != null && reviewState.currency
          ? { quotedAmount: reviewState.quotedAmount, currency: reviewState.currency }
          : null
      }
      formatClock={formatClock}
      isChecking={isChecking}
      isPriceLoading={isChecking}
      lines={lines}
      ministryId={ministryId}
      ministryName={ministryName}
      mode="repeated"
      occurrenceCount={occurrenceCount}
      onMinistryAssociationChange={onMinistryAssociationChange}
      onRemove={onRemove}
      onReview={onReview}
      onTitleChange={onTitleChange}
      onTitleTouch={onTitleTouch}
      priceUnavailable={priceUnavailable}
      reviewDisabled={!canReview}
      rooms={rooms}
      sharedTime={sharedTime}
      statusError={reviewState.previewError}
      statusMessage={statusMessage}
      title={reviewState.title}
      titleTouched={titleTouched}
    />
  );
};

export default RepeatedSeriesPanel;
