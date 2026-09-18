import facilityService, { BookingNotFoundError, BookingSeriesNotFoundError } from "@/api/services/facilityService";
import PaymentInstructionsPanel from "@/components/booking/PaymentInstructionsPanel";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { formatQuotedAmount, parsePaymentRoute } from "@/utils/paymentPage";
import { Button, Spinner } from "@efcnewlife/newlife-ui";
import moment from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";

const PaymentPage = () => {
  const { t, i18n: i18nInstance } = useTranslation("booking");
  const navigate = useNavigate();
  const location = useLocation();
  const route = useMemo(() => parsePaymentRoute(location.pathname), [location.pathname]);

  const [totalLabel, setTotalLabel] = useState(formatQuotedAmount(null, "CAD", i18nInstance.language));
  const [holdDeadlineLabel, setHoldDeadlineLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadPayment = useCallback(async () => {
    if (!route) {
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      if (route.kind === "one-time") {
        const detail = await facilityService.getMyBooking(route.bookingId);
        setTotalLabel(formatQuotedAmount(detail.quotedAmount, detail.currency, i18nInstance.language));
        setHoldDeadlineLabel(null);
      } else {
        const detail = await facilityService.getBookingSeries(route.seriesId);
        setTotalLabel(formatQuotedAmount(detail.quotedAmount, detail.currency, i18nInstance.language));
        setHoldDeadlineLabel(
          detail.paymentHoldExpiresAt
            ? moment(detail.paymentHoldExpiresAt).locale(i18nInstance.language).format("LLL")
            : null
        );
      }
    } catch (err) {
      if (err instanceof BookingNotFoundError || err instanceof BookingSeriesNotFoundError) {
        setNotFound(true);
        return;
      }
      setError(t("payment.loadError"));
      setTotalLabel(formatQuotedAmount(null, "CAD", i18nInstance.language));
      setHoldDeadlineLabel(null);
    } finally {
      setLoading(false);
    }
  }, [route, i18nInstance.language, t]);

  useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  if (!route || notFound) {
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
        <PaymentInstructionsPanel holdDeadlineLabel={holdDeadlineLabel} totalLabel={totalLabel} />
        <Button onClick={() => navigate("/")} variant="primary">
          {t("payment.backHome")}
        </Button>
      </section>
    </main>
  );
};

export default PaymentPage;
