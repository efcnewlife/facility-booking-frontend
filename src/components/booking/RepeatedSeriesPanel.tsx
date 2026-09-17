import { canOpenReview, type RecurringSeriesReviewSnapshot } from "@/utils/recurringSeriesReview";
import { Button, Spinner } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface RepeatedSeriesPanelProps {
  reviewState: RecurringSeriesReviewSnapshot;
  onReview: () => void;
}

const RepeatedSeriesPanel = ({ reviewState, onReview }: RepeatedSeriesPanelProps) => {
  const { t } = useTranslation("booking");
  const canReview = canOpenReview(reviewState);
  const isChecking = reviewState.previewStatus === "scheduled" || reviewState.previewStatus === "loading";

  return (
    <aside
      aria-label={t("startBooking.recurringReview.title")}
      className="flex w-[280px] shrink-0 flex-col gap-3 rounded-[10px] bg-surface px-4 py-4 xl:w-[300px]"
    >
      <Button className="w-full" disabled={!canReview} onClick={onReview} size="sm" variant="primary">
        {t("startBooking.recurringReview.open")}
      </Button>
      <p className="m-0 text-sm text-on-surface-variant">{t("startBooking.recurringReview.previewDoesNotReserve")}</p>
      {isChecking ? (
        <div aria-busy="true" className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Spinner size="sm" />
          <span>{t("startBooking.recurringReview.checking")}</span>
        </div>
      ) : null}
      {reviewState.previewError ? (
        <p className="m-0 text-sm text-error" role="status">
          {reviewState.previewError}
        </p>
      ) : null}
      {!isChecking && !canReview && !reviewState.previewError ? (
        <p className="m-0 text-sm text-on-surface-variant">{t("startBooking.recurringReview.needCompleteProposal")}</p>
      ) : null}
    </aside>
  );
};

export default RepeatedSeriesPanel;
