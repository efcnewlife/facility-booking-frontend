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

export const fetchCartLineQuote = async (
  date: string,
  line: Pick<BookingLine, "facilityId" | "start" | "end">,
  ministryId?: string | null
): Promise<{ lineSubtotal: string | number | null; currency: string | null }> => {
  const quote = await facilityService.previewQuote({
    ministryId: ministryId || null,
    isMissionAligned: Boolean(ministryId),
    lines: [previewQuoteLinePayload(date, line)],
  });
  const roomLine = quote.roomLines[0];
  return {
    lineSubtotal: roomLine?.lineSubtotal ?? null,
    currency: roomLine?.currency ?? quote.currency,
  };
};

export const applyCartLineQuote = (
  state: TimetableCartState,
  sequence: number,
  quote: { lineSubtotal: string | number | null; currency: string | null }
): TimetableCartState => {
  return setCartLineQuote(state, sequence, quote.lineSubtotal, quote.currency);
};
