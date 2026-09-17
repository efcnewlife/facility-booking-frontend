import type { RecurringBookingSeriesDetail } from "@/api/services/facilityService";
import { formatQuotedAmount } from "@/utils/paymentSummary";
import { pendingPaymentResultFromSeries } from "@/utils/recurringSeriesReview";
import type { RoomDay } from "@/utils/timetableRules";
import { Alert, Button } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useTranslation } from "react-i18next";

interface RecurringSeriesPendingPaymentProps {
  series: RecurringBookingSeriesDetail;
  rooms: RoomDay[];
  onBackToHome: () => void;
}

const RecurringSeriesPendingPayment = ({ series, rooms, onBackToHome }: RecurringSeriesPendingPaymentProps) => {
  const { t, i18n } = useTranslation("booking");
  const locale = i18n.language;
  const result = pendingPaymentResultFromSeries(series);
  const holdLabel = result.paymentHoldExpiresAt
    ? moment(result.paymentHoldExpiresAt).locale(locale).format("LLL")
    : "—";
  const roomNames = result.roomIds.map((id) => rooms.find((room) => room.id === id)?.name ?? id).join(", ");
  const startClock = result.localStartTime.slice(0, 5);
  const endClock = result.localEndTime.slice(0, 5);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-10">
      <h1 className="text-center text-4xl font-semibold text-on-surface">{t("startBooking.recurringResult.title")}</h1>
      <div className="mt-8 w-full space-y-4">
        <Alert
          message={t("startBooking.recurringResult.pendingPaymentMessage", { deadline: holdLabel })}
          size="lg"
          title={t("startBooking.recurringResult.pendingPaymentTitle")}
          variant="info"
          width="full"
        />
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-outline p-4">
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.total")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {formatQuotedAmount(result.quotedAmount, result.currency, locale)}
          </dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.holdDeadline")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">{holdLabel}</dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.initialOccurrence")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {moment(result.firstOccurrenceDate).locale(locale).format("LL")} {startClock}–{endClock}
          </dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.occurrenceCount")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">
            {t("startBooking.recurringWhen.occurrenceCount", { count: result.occurrenceCount })}
          </dd>
          <dt className="text-sm text-on-surface-variant">{t("startBooking.recurringResult.rooms")}</dt>
          <dd className="text-right text-sm font-semibold text-on-surface">{roomNames}</dd>
        </dl>
      </div>
      <Button className="mt-8" onClick={onBackToHome} size="md" variant="primary">
        {t("startBooking.recurringResult.backToHome")}
      </Button>
    </section>
  );
};

export default RecurringSeriesPendingPayment;
