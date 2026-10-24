import { Modal } from "@efcnewlife/newlife-ui";
import { useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useDialogFocus } from "./useDialogFocus";

interface OverrideConfirmDialogProps {
  isOpen: boolean;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /** The reviewed impact presentation, e.g. OverrideImpactList. */
  children: ReactNode;
}

/** Final acknowledgement: only Confirm and notify submits the reviewed Override. */
const OverrideConfirmDialog = ({ isOpen, confirming, onCancel, onConfirm, children }: OverrideConfirmDialogProps) => {
  const { t } = useTranslation("booking");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const handleCancel = () => {
    if (!confirming) {
      onCancel();
    }
  };
  useDialogFocus(isOpen, cancelRef, handleCancel);

  return (
    <Modal
      className="mx-4 w-full max-w-lg p-6"
      footer={
        <>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-outline bg-white px-4 text-sm font-semibold text-booking-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={confirming}
            onClick={handleCancel}
            ref={cancelRef}
            type="button"
          >
            {t("override.final.cancel")}
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-error px-4 text-sm font-semibold text-on-error disabled:cursor-not-allowed disabled:opacity-50"
            disabled={confirming}
            onClick={onConfirm}
            type="button"
          >
            {t("override.final.confirm")}
          </button>
        </>
      }
      isOpen={isOpen}
      onClose={handleCancel}
      title={t("override.final.title")}
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 text-sm text-on-surface">{t("override.final.body")}</p>
        {children}
      </div>
    </Modal>
  );
};

export default OverrideConfirmDialog;
