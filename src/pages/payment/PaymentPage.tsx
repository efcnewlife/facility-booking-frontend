import facilityService, { BookingNotFoundError } from "@/api/services/facilityService";
import PaymentInstructionsPanel from "@/components/booking/PaymentInstructionsPanel";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { formatQuotedAmount, parsePaymentBookingId } from "@/utils/paymentPage";
import { Button, Spinner } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";

const PaymentPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const { bookingId: bookingIdParam } = useParams();
  const bookingId = useMemo(() => parsePaymentBookingId(bookingIdParam), [bookingIdParam]);

  const [totalLabel, setTotalLabel] = useState(formatQuotedAmount(null, "CAD", i18nInstance.language));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const detail = await facilityService.getMyBooking(bookingId);
      setTotalLabel(formatQuotedAmount(detail.quotedAmount, detail.currency, i18nInstance.language));
    } catch (err) {
      if (err instanceof BookingNotFoundError) {
        setNotFound(true);
        return;
      }
      setError(t("payment.loadError"));
      setTotalLabel(formatQuotedAmount(null, "CAD", i18nInstance.language));
    } finally {
      setLoading(false);
    }
  }, [bookingId, i18nInstance.language, t]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  if (!bookingId || notFound) {
    return <NotFoundPage />;
  }

  return (
    <main className="flex flex-1 justify-center bg-surface-container px-4 py-10">
      <section className="flex w-full max-w-[640px] flex-col gap-8 rounded-[20px] bg-surface px-6 py-10 sm:px-12">
        <div>
          <h1 className="m-0 mb-2 text-[26px] font-semibold leading-none text-booking-primary">{t("payment.title")}</h1>
        </div>
        {error ? (
          <p className="m-0 text-sm font-medium text-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? <Spinner showText size="sm" text={t("startBooking.loading")} /> : null}
        <PaymentInstructionsPanel totalLabel={totalLabel} />
        <Button onClick={() => navigate("/")} variant="primary">
          {t("payment.backHome")}
        </Button>
      </section>
    </main>
  );
};

export default PaymentPage;
