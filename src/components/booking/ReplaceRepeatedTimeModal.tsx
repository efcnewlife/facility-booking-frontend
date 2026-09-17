import { Button, Modal } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface ReplaceRepeatedTimeModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ReplaceRepeatedTimeModal = ({ isOpen, onCancel, onConfirm }: ReplaceRepeatedTimeModalProps) => {
  const { t } = useTranslation("booking");

  return (
    <Modal
      className="mx-4 w-full max-w-md p-6"
      footer={
        <>
          <Button onClick={onCancel} size="sm" variant="outline">
            {t("replaceRepeatedTime.cancel")}
          </Button>
          <Button onClick={onConfirm} size="sm" variant="primary">
            {t("replaceRepeatedTime.confirm")}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onCancel}
      title={t("replaceRepeatedTime.title")}
    >
      <p className="m-0 text-base text-on-surface">{t("replaceRepeatedTime.body")}</p>
    </Modal>
  );
};

export default ReplaceRepeatedTimeModal;
