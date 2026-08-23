export interface PreviewQuoteMoney {
  subtotalAmount?: string | number | null;
  discountAmount?: string | number | null;
  surchargeAmount?: string | number | null;
  quotedAmount?: string | number | null;
  currency?: string | null;
}

export interface PaymentSummaryLabels {
  rate: string;
  ministryDiscount: string;
  surcharge: string;
  subtotal: string;
  tax: string;
  total: string;
}

const EM_DASH = "—";

const formatQuotedAmount = (
  quotedAmount: string | number | null | undefined,
  currency: string | null | undefined,
  locale: string
): string => {
  if (quotedAmount == null || quotedAmount === "") {
    return EM_DASH;
  }
  const amount = typeof quotedAmount === "number" ? quotedAmount : Number(quotedAmount);
  if (!Number.isFinite(amount)) {
    return EM_DASH;
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "CAD",
  }).format(amount);
};

const formatDiscountAmount = (
  discountAmount: string | number | null | undefined,
  currency: string | null | undefined,
  locale: string
): string => {
  const formatted = formatQuotedAmount(discountAmount, currency, locale);
  if (formatted === EM_DASH) {
    return EM_DASH;
  }
  const amount = typeof discountAmount === "number" ? discountAmount : Number(discountAmount);
  if (Number.isFinite(amount) && amount > 0) {
    return `-${formatted}`;
  }
  return formatted;
};

export const mapPaymentSummary = (quote: PreviewQuoteMoney | null, locale: string): PaymentSummaryLabels => {
  if (!quote) {
    return {
      rate: EM_DASH,
      ministryDiscount: EM_DASH,
      surcharge: EM_DASH,
      subtotal: EM_DASH,
      tax: EM_DASH,
      total: EM_DASH,
    };
  }
  const currency = quote.currency;
  return {
    rate: formatQuotedAmount(quote.subtotalAmount, currency, locale),
    ministryDiscount: formatDiscountAmount(quote.discountAmount, currency, locale),
    surcharge: formatQuotedAmount(quote.surchargeAmount, currency, locale),
    subtotal: EM_DASH,
    tax: EM_DASH,
    total: formatQuotedAmount(quote.quotedAmount, currency, locale),
  };
};
