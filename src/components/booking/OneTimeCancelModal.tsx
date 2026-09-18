import { format_booking_date } from "@/utils/bookingFormat";
import { cancellationReasonFieldFeedback, validateCancellationReason } from "@/utils/cancellationReason";
import { Modal, Button, TextArea } from "@efcnewlife/newlife-ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface OneTimeCancelModalBooking {
  title: string;
  startAt: string;
}

interface OneTimeCancelModalProps {
  isOpen: boolean;
  booking: OneTimeCancelModalBooking | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (cancelReason: string) => void;
}

const OneTimeCancelModal = ({ isOpen, booking, submitting, error, onClose, onConfirm }: OneTimeCancelModalProps) => {
  const { t } = useTranslation("booking");
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setReason("");
    setReasonTouched(false);
  }, [isOpen]);

  const reasonError = validateCancellationReason(reason);
  const reasonFeedback = cancellationReasonFieldFeedback(reason, reasonTouched, t);

  return (
    <Modal
      className="mx-4 w-full max-w-md p-6"
      footer={
        <>
          <Button onClick={onClose} size="sm" variant="outline">
            {t("myBookings.cancelOneTime.close")}
          </Button>
          <Button
            disabled={submitting || Boolean(reasonError)}
            onClick={() => {
              setReasonTouched(true);
              if (reasonError) {
                return;
              }
              onConfirm(reason.trim());
            }}
            size="sm"
            variant="primary"
          >
            {t("myBookings.cancelOneTime.confirm")}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={t("myBookings.cancelOneTime.title")}
    >
      <p className="m-0 text-sm text-on-surface-variant">{t("myBookings.cancelOneTime.body")}</p>
      {booking ? (
        <p className="mt-3 text-sm font-semibold text-on-surface">
          {booking.title || t("myBookings.untitled")} · {format_booking_date(booking.startAt.slice(0, 10))}
        </p>
      ) : null}
      <div className="mt-4">
        <TextArea
          error={reasonFeedback.error}
          id="one-time-cancel-reason"
          label={t("myBookings.cancelOneTime.reason")}
          onChange={(value) => {
            setReasonTouched(true);
            setReason(value);
          }}
          required
          value={reason}
        />
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
};

export default OneTimeCancelModal;
