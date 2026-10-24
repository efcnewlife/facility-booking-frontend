import { Modal } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDialogFocus } from "./useDialogFocus";

export interface OverrideSelectionTarget {
  roomName: string;
  date: string;
  start: string;
  end: string;
}

interface OverrideSelectionDialogProps {
  target: OverrideSelectionTarget | null;
  formatClock: (clock: string) => string;
  onCancel: () => void;
  onAccept: () => void;
}

/**
 * Early acknowledgement before an Override interval enters the Cart. It never cancels,
 * reserves, or notifies anything: acceptance only admits the proposal to the Cart.
 */
const OverrideSelectionDialog = ({ target, formatClock, onCancel, onAccept }: OverrideSelectionDialogProps) => {
  const { t, i18n } = useTranslation("booking");
  const cancelRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(target != null, cancelRef, onCancel);

  return (
    <Modal
      className="mx-4 w-full max-w-md p-6"
      footer={
        <>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-outline bg-white px-4 text-sm font-semibold text-booking-primary"
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            {t("override.selection.cancel")}
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-error px-4 text-sm font-semibold text-on-error"
            onClick={onAccept}
            type="button"
          >
            {t("override.selection.accept")}
          </button>
        </>
      }
      isOpen={target != null}
      onClose={onCancel}
      title={t("override.selection.title")}
    >
      {target ? (
        <div className="flex flex-col gap-4 text-sm text-on-surface">
          <p className="m-0">{t("override.selection.body")}</p>
          <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
            <dt className="font-semibold">{t("override.room")}</dt>
            <dd className="m-0">{target.roomName}</dd>
            <dt className="font-semibold">{t("override.date")}</dt>
            <dd className="m-0">{moment(target.date).locale(i18n.language).format("dddd, MMMM D, YYYY")}</dd>
            <dt className="font-semibold">{t("override.time")}</dt>
            <dd className="m-0">
              {formatClock(target.start)} – {formatClock(target.end)}
            </dd>
          </dl>
          <p className="m-0 text-on-surface-variant">{t("override.selection.reviewLater")}</p>
        </div>
      ) : null}
    </Modal>
  );
};

export default OverrideSelectionDialog;
