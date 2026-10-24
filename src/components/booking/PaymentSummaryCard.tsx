import FreeMinistryBadge from "@/components/booking/FreeMinistryBadge";
import type { PaymentSummaryLabels } from "@/utils/paymentSummary";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface PaymentSummaryCardProps {
  summary: PaymentSummaryLabels;
  discountLabel: string;
  holdDeadlineLabel?: string | null;
  children?: ReactNode;
}

const PaymentSummaryCard = ({
  summary,
  discountLabel,
  holdDeadlineLabel = null,
  children,
}: PaymentSummaryCardProps) => {
  const { t } = useTranslation("booking");

  return (
    <aside className="flex w-full shrink-0 flex-col items-center gap-4 sm:w-[300px]">
      <h2 className="m-0 text-center text-[26px] font-semibold leading-none text-booking-primary">
        {t("bookingDetails.paymentSummary")}
      </h2>
      <div className="flex w-full flex-col items-center gap-[15px] rounded-[10px] border border-booking-grey bg-booking-bg px-[25px] py-10">
        {summary.isFreeMinistry ? (
          <div className="flex w-[233px] flex-col items-start gap-2 text-booking-primary">
            <FreeMinistryBadge />
            <p className="m-0 text-sm leading-5">{t("freeMinistry.summary")}</p>
          </div>
        ) : null}
        <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
          <span>{t("bookingDetails.rate")}</span>
          <span>{summary.rate}</span>
        </div>
        {summary.isFreeMinistry ? null : (
          <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
            <span>{discountLabel}</span>
            <span>{summary.ministryDiscount}</span>
          </div>
        )}
        <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
          <span>{t("bookingDetails.surcharge")}</span>
          <span>{summary.surcharge}</span>
        </div>
        <hr className="m-0 w-[260px] border-0 border-t border-gray-300" />
        <div className="flex w-[233px] justify-between text-base font-bold leading-5 text-booking-primary">
          <span>{t("bookingDetails.subtotal")}</span>
          <span>{summary.subtotal}</span>
        </div>
        <hr className="m-0 w-[260px] border-0 border-t border-gray-300" />
        <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
          <span>{t("bookingDetails.tax")}</span>
          <span>{summary.tax}</span>
        </div>
        <hr className="m-0 w-[260px] border-0 border-t border-gray-300" />
        <div className="flex w-[233px] justify-between text-base font-bold leading-5 text-booking-primary">
          <span>{t("bookingDetails.total")}</span>
          <span>{summary.total}</span>
        </div>
        {holdDeadlineLabel && !summary.isFreeMinistry ? (
          <div className="flex w-[233px] justify-between text-base leading-5 text-booking-primary">
            <span>{t("bookingDetails.holdDeadline")}</span>
            <span>{holdDeadlineLabel}</span>
          </div>
        ) : null}
        {children}
      </div>
    </aside>
  );
};

export default PaymentSummaryCard;
