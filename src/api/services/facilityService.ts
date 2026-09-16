import { API_ENDPOINTS, HTTP_STATUS } from "@/api/config";
import type { ApiError } from "@/types/api";
import {
  mapAvailabilityToRoomDays,
  maxBookingLinesFromPayload,
  type ApiRoomAvailabilityList,
} from "@/utils/availabilityMapper";
import type { RoomDay } from "@/utils/timetableRules";
import { httpClient } from "./httpClient";

interface CreateBookingPayload {
  startAt: string;
  endAt: string;
  isMissionAligned?: boolean;
  ministryId?: string | null;
  rooms: Array<{
    facilityId: string;
    startAt?: string;
    endAt?: string;
    sequence?: number;
  }>;
  remark?: string;
  bookingDraftId?: string | null;
}

export interface PreviewQuoteLinePayload {
  facilityId: string;
  startAt: string;
  endAt: string;
}

export interface PreviewQuotePayload {
  ministryId?: string | null;
  isMissionAligned?: boolean;
  lines: PreviewQuoteLinePayload[];
}

interface ApiPreviewQuoteRoomLine {
  facilityId?: string;
  facility_id?: string;
  lineSubtotal?: string | number | null;
  line_subtotal?: string | number | null;
  currency?: string | null;
}

interface ApiPreviewQuote {
  subtotalAmount?: string | number | null;
  subtotal_amount?: string | number | null;
  discountAmount?: string | number | null;
  discount_amount?: string | number | null;
  surchargeAmount?: string | number | null;
  surcharge_amount?: string | number | null;
  quotedAmount?: string | number | null;
  quoted_amount?: string | number | null;
  currency?: string | null;
  roomLines?: ApiPreviewQuoteRoomLine[];
  room_lines?: ApiPreviewQuoteRoomLine[];
}

export interface MemberPreviewQuoteRoomLine {
  facilityId: string;
  lineSubtotal: string | number | null;
  currency: string | null;
}

export interface MemberPreviewQuote {
  subtotalAmount: string | number | null;
  discountAmount: string | number | null;
  surchargeAmount: string | number | null;
  quotedAmount: string | number | null;
  currency: string | null;
  roomLines: MemberPreviewQuoteRoomLine[];
}

interface ApiBookingDetail {
  id?: string;
  status?: string;
  quotedAmount?: string | number | null;
  quoted_amount?: string | number | null;
  currency?: string | null;
}

export interface MemberBookingDetail {
  id: string;
  quotedAmount: string | number | null;
  currency: string | null;
}

export class BookingNotFoundError extends Error {
  constructor() {
    super("Booking not found");
    this.name = "BookingNotFoundError";
  }
}

export interface BookingDraftLineInput {
  facilityId: string;
  startAt: string;
  endAt: string;
  sequence: number;
}

export interface CreateBookingDraftPayload {
  ministryId?: string | null;
  lines: BookingDraftLineInput[];
}

/** PATCH replaces a Draft's header and lines wholesale, so the request body shape matches create. */
export type UpdateBookingDraftPayload = CreateBookingDraftPayload;

interface ApiBookingDraftLine {
  facilityId?: string;
  facility_id?: string;
  startAt?: string;
  start_at?: string;
  endAt?: string;
  end_at?: string;
  sequence?: number;
}

interface ApiBookingDraftDetail {
  id?: string;
  date?: string;
  ministryId?: string | null;
  ministry_id?: string | null;
  lines?: ApiBookingDraftLine[];
}

export interface BookingDraftDetailLine {
  facilityId: string;
  startAt: string;
  endAt: string;
  sequence: number;
}

export interface BookingDraftDetail {
  id: string;
  date: string;
  ministryId: string | null;
  lines: BookingDraftDetailLine[];
}

export class BookingDraftNotFoundError extends Error {
  constructor() {
    super("Booking draft not found");
    this.name = "BookingDraftNotFoundError";
  }
}

const isApiError = (err: unknown): err is ApiError => {
  return typeof err === "object" && err !== null && "code" in err;
};

const mapBookingDraftDetail = (data: ApiBookingDraftDetail, fallbackId: string): BookingDraftDetail => {
  const rawLines = data.lines ?? [];
  return {
    id: data.id ? String(data.id) : fallbackId,
    date: String(data.date ?? ""),
    ministryId: data.ministryId ?? data.ministry_id ?? null,
    lines: rawLines.map((line) => ({
      facilityId: String(line.facilityId ?? line.facility_id ?? ""),
      startAt: String(line.startAt ?? line.start_at ?? ""),
      endAt: String(line.endAt ?? line.end_at ?? ""),
      sequence: Number(line.sequence ?? 0),
    })),
  };
};

class FacilityService {
  async getAvailability(
    date: string,
    ministryId?: string | null
  ): Promise<{ rooms: RoomDay[]; maxBookingLines: number }> {
    const params: Record<string, unknown> = { date };
    if (ministryId) {
      params.ministryId = ministryId;
    }
    const response = await httpClient.get<ApiRoomAvailabilityList>(API_ENDPOINTS.FACILITY.AVAILABILITY, params);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load availability");
    }
    return {
      rooms: mapAvailabilityToRoomDays(response.data),
      maxBookingLines: maxBookingLinesFromPayload(response.data),
    };
  }

  async previewQuote(payload: PreviewQuotePayload): Promise<MemberPreviewQuote> {
    const response = await httpClient.post<ApiPreviewQuote>(API_ENDPOINTS.FACILITY.PREVIEW_QUOTE, payload);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load preview quote");
    }
    const data = response.data;
    const rawRoomLines = data.roomLines ?? data.room_lines ?? [];
    return {
      subtotalAmount: data.subtotalAmount ?? data.subtotal_amount ?? null,
      discountAmount: data.discountAmount ?? data.discount_amount ?? null,
      surchargeAmount: data.surchargeAmount ?? data.surcharge_amount ?? null,
      quotedAmount: data.quotedAmount ?? data.quoted_amount ?? null,
      currency: data.currency ?? null,
      roomLines: rawRoomLines.map((line) => ({
        facilityId: String(line.facilityId ?? line.facility_id ?? ""),
        lineSubtotal: line.lineSubtotal ?? line.line_subtotal ?? null,
        currency: line.currency ?? data.currency ?? null,
      })),
    };
  }

  async createBooking(payload: CreateBookingPayload): Promise<{ id: string }> {
    const response = await httpClient.post<{ id: string }>(API_ENDPOINTS.FACILITY.BOOKINGS, payload);
    if (!response.success || !response.data?.id) {
      throw new Error(response.message || "Failed to create booking");
    }
    return { id: String(response.data.id) };
  }

  async createBookingDraft(payload: CreateBookingDraftPayload): Promise<{ id: string }> {
    const response = await httpClient.post<{ id: string }>(API_ENDPOINTS.FACILITY.BOOKING_DRAFTS, payload);
    if (!response.success || !response.data?.id) {
      throw new Error(response.message || "Failed to create booking draft");
    }
    return { id: String(response.data.id) };
  }

  async getBookingDraft(bookingDraftId: string): Promise<BookingDraftDetail> {
    try {
      const response = await httpClient.get<ApiBookingDraftDetail>(API_ENDPOINTS.FACILITY.bookingDraft(bookingDraftId));
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load booking draft");
      }
      return mapBookingDraftDetail(response.data, bookingDraftId);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingDraftNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to load booking draft");
    }
  }

  async updateBookingDraft(bookingDraftId: string, payload: UpdateBookingDraftPayload): Promise<BookingDraftDetail> {
    try {
      const response = await httpClient.patch<ApiBookingDraftDetail>(
        API_ENDPOINTS.FACILITY.bookingDraft(bookingDraftId),
        payload
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to update booking draft");
      }
      return mapBookingDraftDetail(response.data, bookingDraftId);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingDraftNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to update booking draft");
    }
  }

  async getMyBooking(bookingId: string): Promise<MemberBookingDetail> {
    try {
      const response = await httpClient.get<ApiBookingDetail>(API_ENDPOINTS.FACILITY.booking(bookingId));
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load booking");
      }
      const quotedAmount = response.data.quotedAmount ?? response.data.quoted_amount ?? null;
      return {
        id: response.data.id || bookingId,
        quotedAmount,
        currency: response.data.currency ?? null,
      };
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to load booking");
    }
  }

  async deleteAllMyBookingDrafts(): Promise<void> {
    const response = await httpClient.delete(API_ENDPOINTS.FACILITY.BOOKING_DRAFTS);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete booking drafts");
    }
  }

  async listMyBookings(): Promise<unknown> {
    const response = await httpClient.get(API_ENDPOINTS.FACILITY.MY_BOOKINGS);
    if (!response.success) {
      throw new Error(response.message || "Failed to load bookings");
    }
    return response.data;
  }
}

export const facilityService = new FacilityService();
export default facilityService;
