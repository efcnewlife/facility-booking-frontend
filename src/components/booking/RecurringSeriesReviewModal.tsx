import { formatQuotedAmount } from "@/utils/paymentSummary";
import type { ConflictFreeReviewSummary } from "@/utils/recurringSeriesReview";
import { Alert, Button, Modal } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useTranslation } from "react-i18next";

interface RecurringSeriesReviewModalProps {
  summary: ConflictFreeReviewSummary;
  createError: string | null;
  confirming: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

const formatClock = (clock: string, locale: string): string => {
  return moment(clock, "HH:mm").locale(locale).format("h:mm a");
};

const RecurringSeriesReviewModal = ({
  summary,
  createError,
  confirming,
  onBack,
  onConfirm,
}: RecurringSeriesReviewModalProps) => {
  const { t, i18n } = useTranslation("booking");
  const locale = i18n.language;

  return (
    <Modal
      className="mx-4 w-full max-w-lg p-6"
      footer={
        <>
          <Button disabled={confirming} onClick={onBack} size="sm" variant="outline">
            {t("startBooking.recurringReview.back")}
          </Button>
          <Button disabled={confirming} onClick={onConfirm} size="sm" variant="primary">
            {t("startBooking.recurringReview.confirm")}
          </Button>
        </>
      }
      isOpen
      onClose={onBack}
      title={t("startBooking.recurringReview.title")}
    >
      <div className="flex flex-col gap-4">
        <Alert
          message={t("startBooking.recurringReview.previewDoesNotReserve")}
          size="sm"
          title={t("startBooking.recurringReview.previewTitle")}
          variant="info"
          width="full"
        />
        {createError ? (
          <Alert message={createError} size="sm" title={t("startBooking.errors.title")} variant="error" width="full" />
        ) : null}
        <dl className="grid grid-cols-2 gap-3">
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.rooms")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">{summary.roomNames.join(", ")}</dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringReview.sharedTime")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {formatClock(summary.startTime, locale)} – {formatClock(summary.endTime, locale)}
          </dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringWhen.firstOccurrence")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {moment(summary.firstOccurrenceDate).locale(locale).format("LL")}
          </dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringWhen.lastOccurrence")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {moment(summary.lastOccurrenceDate).locale(locale).format("LL")}
          </dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.occurrenceCount")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {t("startBooking.recurringWhen.occurrenceCount", { count: summary.weeklyOccurrenceCount })}
          </dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.total")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {formatQuotedAmount(summary.quotedAmount, summary.currency, locale)}
          </dd>
        </dl>
      </div>
    </Modal>
  );
};

export default RecurringSeriesReviewModal;
