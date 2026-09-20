import type { PreviewQuoteLinePayload } from "@/api/services/facilityService";
import facilityService from "@/api/services/facilityService";

import { combineDateAndClock } from "./bookingDateTime";
import { setCartLineQuote, type BookingLine, type TimetableCartState } from "./timetableRules";

export { combineDateAndClock } from "./bookingDateTime";

export const previewQuoteLinePayload = (
  date: string,
  line: Pick<BookingLine, "facilityId" | "start" | "end">
): PreviewQuoteLinePayload => ({
  facilityId: line.facilityId,
  startAt: combineDateAndClock(date, line.start),
  endAt: combineDateAndClock(date, line.end),
});

export interface CartAggregateQuote {
  quotedAmount: string | number | null;
  currency: string | null;
  lineQuotes: Array<{ lineSubtotal: string | number | null; currency: string | null }>;
}

/**
 * Requests one server-authoritative quote for every confirmed Booking line at once, so the
 * aggregate Estimated Total is never derived by summing per-line subtotals client-side.
 */
export const fetchCartAggregateQuote = async (
  date: string,
  lines: Array<Pick<BookingLine, "facilityId" | "start" | "end">>,
  ministryId?: string | null
): Promise<CartAggregateQuote> => {
  const quote = await facilityService.previewQuote({
    ministryId: ministryId || null,
    lines: lines.map((line) => previewQuoteLinePayload(date, line)),
  });
  return {
    quotedAmount: quote.quotedAmount,
    currency: quote.currency,
    lineQuotes: lines.map((_, index) => ({
      lineSubtotal: quote.roomLines[index]?.lineSubtotal ?? null,
      currency: quote.roomLines[index]?.currency ?? quote.currency,
    })),
  };
};

/** `sequences` must be in the same order as the lines passed to `fetchCartAggregateQuote`. */
export const applyCartAggregateQuote = (
  state: TimetableCartState,
  sequences: number[],
  quote: CartAggregateQuote
): TimetableCartState => {
  return sequences.reduce((next, sequence, index) => {
    const lineQuote = quote.lineQuotes[index];
    if (!lineQuote) {
      return next;
    }
    return setCartLineQuote(next, sequence, lineQuote.lineSubtotal, lineQuote.currency);
  }, state);
};
