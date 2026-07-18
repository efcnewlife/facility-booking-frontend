import type { PaymentRecord } from "@/types/profile";
import { format_currency } from "@/utils/bookingFormat";
import { cn } from "@efcnewlife/newlife-ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MdChevronRight } from "react-icons/md";

interface PaymentHistoryCardProps {
  payments: PaymentRecord[];
  className?: string;
}

interface PaymentYearGroup {
  year: number;
  payments: PaymentRecord[];
}

const groupPaymentsByYear = (payments: PaymentRecord[]): PaymentYearGroup[] => {
  const groups: PaymentYearGroup[] = [];

  payments.forEach((payment) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.year === payment.year) {
      lastGroup.payments.push(payment);
      return;
    }

    groups.push({ year: payment.year, payments: [payment] });
  });

  return groups;
};

const PaymentHistoryCard = ({ payments, className }: PaymentHistoryCardProps) => {
  const { t } = useTranslation("booking");

  const paymentYearGroups = useMemo(() => groupPaymentsByYear(payments), [payments]);

  const handleOpenPayment = (payment: PaymentRecord) => {
    console.info("open_payment", payment.id);
  };

  return (
    <section className={cn("rounded-[20px] bg-surface p-9 shadow-sm", className)}>
      <div className="border-b border-outline-variant pb-5">
        <h2 className="text-xl font-bold text-booking-primary">{t("profile.paymentHistory")}</h2>
      </div>

      <div>
        {paymentYearGroups.map((group, groupIndex) => (
          <div
            key={group.year}
            className={cn("flex gap-5 pt-5", groupIndex > 0 && "mt-5 border-t border-outline-variant")}
          >
            <div className="w-[82px] shrink-0 pt-5 text-xl font-bold text-booking-text">{group.year}</div>

            <div className="min-w-0 flex-1 divide-y divide-outline-variant">
              {group.payments.map((payment) => (
                <button
                  key={payment.id}
                  className="flex w-full items-center gap-5 py-5 text-left transition-colors hover:bg-surface-variant/40"
                  onClick={() => handleOpenPayment(payment)}
                  type="button"
                >
                  <div className="h-[98px] w-[168px] shrink-0 rounded-sm bg-booking-text" />

                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-booking-green">{payment.paidLabel}</p>
                    <p className="mt-1 text-base font-medium text-booking-text">{payment.description}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-base font-bold text-booking-primary">{format_currency(payment.amount)}</span>
                    <MdChevronRight className="size-12 text-booking-text" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PaymentHistoryCard;
