import { useTranslation } from "react-i18next";

interface PaymentInstructionsPanelProps {
  totalLabel: string;
  holdDeadlineLabel?: string | null;
}

const PaymentInstructionsPanel = ({ totalLabel, holdDeadlineLabel }: PaymentInstructionsPanelProps) => {
  const { t } = useTranslation("booking");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 text-lg font-semibold text-booking-primary">{t("payment.instructionsTitle")}</h2>
      <p className="m-0 text-base leading-6 text-booking-text">
        {t("payment.instructions", { email: t("payment.email") })}
      </p>
      <dl className="m-0">
        <div className="flex justify-between gap-4 border-t border-gray-300 py-4">
          <dt className="m-0 font-bold">{t("payment.emailLabel")}</dt>
          <dd className="m-0">{t("payment.email")}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-gray-300 py-4">
          <dt className="m-0 font-bold">{t("payment.total")}</dt>
          <dd className="m-0">{totalLabel}</dd>
        </div>
        {holdDeadlineLabel ? (
          <div className="flex justify-between gap-4 border-t border-gray-300 py-4">
            <dt className="m-0 font-bold">{t("payment.holdDeadline")}</dt>
            <dd className="m-0">{holdDeadlineLabel}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
};

export default PaymentInstructionsPanel;
