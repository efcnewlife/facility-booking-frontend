import type { RecurringBookingConflict } from "@/api/services/facilityService";
import RecurringConflictReview from "@/components/booking/RecurringConflictReview";
import { bookingTitleFieldFeedback } from "@/utils/bookingTitle";
import { formatQuotedAmount } from "@/utils/paymentSummary";
import type { ConflictFreeReviewSummary } from "@/utils/recurringSeriesReview";
import type { RoomDay } from "@/utils/timetableRules";
import { Alert, Button, cn, Input, Modal } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface RecurringSeriesReviewModalProps {
  summary: ConflictFreeReviewSummary;
  conflicts: RecurringBookingConflict[];
  excludedDates: string[];
  isPriorityMinistry: boolean;
  rooms: RoomDay[];
  title: string;
  createError: string | null;
  confirming: boolean;
  confirmDisabled: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onTitleChange: (title: string) => void;
  onToggleExcludeDate: (occurrenceDate: string) => void;
}

const formatClock = (clock: string, locale: string): string => {
  return moment(clock, "HH:mm").locale(locale).format("h:mm a");
};

const RecurringSeriesReviewModal = ({
  summary,
  conflicts,
  excludedDates,
  isPriorityMinistry,
  rooms,
  title,
  createError,
  confirming,
  confirmDisabled,
  onBack,
  onConfirm,
  onTitleChange,
  onToggleExcludeDate,
}: RecurringSeriesReviewModalProps) => {
  const { t, i18n } = useTranslation("booking");
  const locale = i18n.language;
  const hasConflicts = conflicts.length > 0;
  const remainingOccurrenceCount = summary.weeklyOccurrenceCount - excludedDates.length;
  const [titleTouched, setTitleTouched] = useState(false);
  const titleFeedback = bookingTitleFieldFeedback(title, titleTouched, t);

  return (
    <Modal
      childrenClassName="p-2"
      className={cn("mx-4 w-full p-6", hasConflicts ? "max-w-2xl" : "max-w-lg")}
      footer={
        <>
          <Button disabled={confirming} onClick={onBack} size="sm" variant="outline">
            {hasConflicts ? t("startBooking.recurringReview.revise") : t("startBooking.recurringReview.back")}
          </Button>
          <Button disabled={confirming || confirmDisabled} onClick={onConfirm} size="sm" variant="primary">
            {t("startBooking.recurringReview.confirm")}
          </Button>
        </>
      }
      isOpen
      onClose={onBack}
      title={hasConflicts ? t("startBooking.recurringConflicts.title") : t("startBooking.recurringReview.title")}
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
        <Input
          error={titleFeedback.error}
          hint={titleFeedback.hint}
          id="recurring-series-title"
          label={t("bookingTitle.label")}
          onChange={(event) => {
            setTitleTouched(true);
            onTitleChange(event.target.value);
          }}
          placeholder={t("bookingTitle.placeholder")}
          required
          value={title}
        />
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
            {t("startBooking.recurringWhen.occurrenceCount", { count: remainingOccurrenceCount })}
          </dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.total")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {formatQuotedAmount(summary.quotedAmount, summary.currency, locale)}
          </dd>
        </dl>
        {hasConflicts ? (
          <RecurringConflictReview
            conflicts={conflicts}
            disabled={confirming}
            excludedDates={excludedDates}
            isPriorityMinistry={isPriorityMinistry}
            onToggleExcludeDate={onToggleExcludeDate}
            rooms={rooms}
            totalOccurrenceCount={summary.weeklyOccurrenceCount}
          />
        ) : null}
      </div>
    </Modal>
  );
};

export default RecurringSeriesReviewModal;
