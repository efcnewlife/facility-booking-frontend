import ChoicePill from "@/components/booking/ChoicePill";
import type { MemberBookingDetail } from "@/api/services/facilityService";
import { format_booking_date } from "@/utils/bookingFormat";
import { cancellationReasonFieldFeedback, validateCancellationReason } from "@/utils/cancellationReason";
import {
  affectedOccurrencesForScope,
  APPROVED_CANCELLATION_SCOPES,
  isCancellableOccurrence,
  RECURRING_CANCELLATION_SCOPE,
  type RecurringCancellationScope,
} from "@/utils/myBookings";
import { Alert, Button, Modal, Radio, TextArea } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface RecurringSeriesCancelModalProps {
  isOpen: boolean;
  occurrences: MemberBookingDetail[];
  submitting: boolean;
  error: string | null;
  successCount: number | null;
  successStarts: string[];
  now?: Date;
  onClose: () => void;
  onConfirm: (scope: RecurringCancellationScope, occurrenceId: string | null, cancelReason: string) => void;
}

const SCOPE_LABEL_KEY: Record<RecurringCancellationScope, string> = {
  [RECURRING_CANCELLATION_SCOPE.OCCURRENCE]: "myBookings.cancelSeries.scopeOccurrence",
  [RECURRING_CANCELLATION_SCOPE.THIS_AND_FUTURE]: "myBookings.cancelSeries.scopeThisAndFuture",
  [RECURRING_CANCELLATION_SCOPE.ENTIRE_SERIES]: "myBookings.cancelSeries.scopeEntireSeries",
};

const RecurringSeriesCancelModal = ({
  isOpen,
  occurrences,
  submitting,
  error,
  successCount,
  successStarts,
  now = new Date(),
  onClose,
  onConfirm,
}: RecurringSeriesCancelModalProps) => {
  const { t } = useTranslation("booking");
  const cancellable = useMemo(
    () => occurrences.filter((occurrence) => isCancellableOccurrence(occurrence, now)),
    [now, occurrences]
  );
  const [scope, setScope] = useState<RecurringCancellationScope>(RECURRING_CANCELLATION_SCOPE.OCCURRENCE);
  const [occurrenceId, setOccurrenceId] = useState<string | null>(cancellable[0]?.id ?? null);
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setScope(RECURRING_CANCELLATION_SCOPE.OCCURRENCE);
    setOccurrenceId(cancellable[0]?.id ?? null);
    setReason("");
    setReasonTouched(false);
  }, [cancellable, isOpen]);

  const needsOccurrence =
    scope === RECURRING_CANCELLATION_SCOPE.OCCURRENCE || scope === RECURRING_CANCELLATION_SCOPE.THIS_AND_FUTURE;
  const affected = affectedOccurrencesForScope(occurrences, scope, needsOccurrence ? occurrenceId : null, now);
  const reasonError = validateCancellationReason(reason);
  const reasonFeedback = cancellationReasonFieldFeedback(reason, reasonTouched, t);

  return (
    <Modal
      className="mx-4 w-full max-w-lg p-6"
      footer={
        successCount == null ? (
          <>
            <Button onClick={onClose} size="sm" variant="outline">
              {t("myBookings.cancelSeries.close")}
            </Button>
            <Button
              disabled={
                submitting || affected.length === 0 || (needsOccurrence && !occurrenceId) || Boolean(reasonError)
              }
              onClick={() => {
                setReasonTouched(true);
                if (reasonError) {
                  return;
                }
                onConfirm(scope, needsOccurrence ? occurrenceId : null, reason.trim());
              }}
              size="sm"
              variant="primary"
            >
              {t("myBookings.cancelSeries.confirm")}
            </Button>
          </>
        ) : (
          <Button onClick={onClose} size="sm" variant="primary">
            {t("myBookings.cancelSeries.close")}
          </Button>
        )
      }
      isOpen={isOpen}
      onClose={onClose}
      title={t("myBookings.cancelSeries.title")}
    >
      <div className="flex flex-col gap-4">
        {successCount != null ? (
          <>
            <Alert
              message={t("myBookings.cancelSeries.successBody", { count: successCount })}
              title={t("myBookings.cancelSeries.successTitle")}
              variant="success"
              width="full"
            />
            {successStarts.length > 0 ? (
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
                {successStarts.map((startAt) => (
                  <li key={startAt}>{format_booking_date(moment(startAt).format("YYYY-MM-DD"))}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <>
            <p className="m-0 text-sm text-on-surface-variant">{t("myBookings.cancelSeries.intro")}</p>
            <div className="flex flex-col gap-2">
              {APPROVED_CANCELLATION_SCOPES.map((value) => (
                <ChoicePill
                  checked={scope === value}
                  id={`cancel-scope-${value}`}
                  key={value}
                  label={t(SCOPE_LABEL_KEY[value])}
                  name="recurring-cancel-scope"
                  onChange={(next) => setScope(next as RecurringCancellationScope)}
                  value={value}
                  wide
                />
              ))}
            </div>
            {needsOccurrence ? (
              <fieldset className="m-0 space-y-2 border-0 p-0">
                <legend className="text-sm font-semibold text-on-surface">
                  {t("myBookings.cancelSeries.chooseOccurrence")}
                </legend>
                {cancellable.length === 0 ? (
                  <p className="m-0 text-sm text-on-surface-variant">{t("myBookings.detail.noCancellable")}</p>
                ) : (
                  cancellable.map((occurrence) => (
                    <Radio
                      checked={occurrenceId === occurrence.id}
                      id={`cancel-occurrence-${occurrence.id}`}
                      key={occurrence.id}
                      label={format_booking_date(moment(occurrence.startAt).format("YYYY-MM-DD"))}
                      name="recurring-cancel-occurrence"
                      onChange={(value) => setOccurrenceId(value)}
                      value={occurrence.id}
                    />
                  ))
                )}
              </fieldset>
            ) : null}
            {affected.length > 0 ? (
              <div>
                <p className="m-0 text-sm font-semibold text-on-surface">
                  {t("myBookings.cancelSeries.affectedTitle", { count: affected.length })}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-on-surface-variant">
                  {affected.map((occurrence) => (
                    <li key={occurrence.id}>{format_booking_date(moment(occurrence.startAt).format("YYYY-MM-DD"))}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="m-0 text-sm text-on-surface-variant">{t("myBookings.cancelSeries.noneAffected")}</p>
            )}
            <TextArea
              error={reasonFeedback.error}
              id="recurring-cancel-reason"
              label={t("myBookings.cancelSeries.reason")}
              onChange={(value) => {
                setReasonTouched(true);
                setReason(value);
              }}
              required
              value={reason}
            />
            {error ? (
              <p className="m-0 text-sm font-medium text-error" role="alert">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
};

export default RecurringSeriesCancelModal;
