import { bookingTitleFieldFeedback, validateBookingTitle } from "@/utils/bookingTitle";
import { Button, Input, Modal } from "@efcnewlife/newlife-ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface EditTitleModalProps {
  isOpen: boolean;
  initialTitle: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (title: string) => void;
}

const EditTitleModal = ({ isOpen, initialTitle, submitting, error, onClose, onConfirm }: EditTitleModalProps) => {
  const { t } = useTranslation("booking");
  const [title, setTitle] = useState(initialTitle);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setTitle(initialTitle);
    setTouched(false);
  }, [initialTitle, isOpen]);

  const titleError = validateBookingTitle(title);
  const titleFeedback = bookingTitleFieldFeedback(title, touched, t);

  return (
    <Modal
      className="mx-4 w-full max-w-md p-6"
      footer={
        <>
          <Button onClick={onClose} size="sm" variant="outline">
            {t("bookingDetail.editTitle.close")}
          </Button>
          <Button
            disabled={submitting || Boolean(titleError)}
            onClick={() => {
              setTouched(true);
              if (titleError) {
                return;
              }
              onConfirm(title.trim());
            }}
            size="sm"
            variant="primary"
          >
            {t("bookingDetail.editTitle.confirm")}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={t("bookingDetail.editTitle.title")}
    >
      <Input
        error={titleFeedback.error}
        hint={titleFeedback.hint}
        id="booking-detail-title"
        label={t("bookingTitle.label")}
        onChange={(event) => {
          setTouched(true);
          setTitle(event.target.value);
        }}
        placeholder={t("bookingTitle.placeholder")}
        required
        value={title}
      />
      {error ? (
        <p className="mt-3 text-sm font-medium text-error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
};

export default EditTitleModal;
