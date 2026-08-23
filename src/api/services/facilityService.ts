import { API_ENDPOINTS, HTTP_STATUS } from "@/api/config";
import type { ApiError } from "@/types/api";
import { mapAvailabilityToRoomDays, type ApiRoomAvailabilityList } from "@/utils/availabilityMapper";
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
}

interface PreviewQuotePayload {
  startAt: string;
  endAt: string;
  ministryId?: string | null;
  isMissionAligned?: boolean;
  rooms: Array<{ facilityId: string }>;
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
}

export interface MemberPreviewQuote {
  subtotalAmount: string | number | null;
  discountAmount: string | number | null;
  surchargeAmount: string | number | null;
  quotedAmount: string | number | null;
  currency: string | null;
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

const isApiError = (err: unknown): err is ApiError => {
  return typeof err === "object" && err !== null && "code" in err;
};

class FacilityService {
  async getAvailability(date: string, ministryId?: string | null): Promise<RoomDay[]> {
    const params: Record<string, unknown> = { date };
    if (ministryId) {
      params.ministryId = ministryId;
    }
    const response = await httpClient.get<ApiRoomAvailabilityList>(API_ENDPOINTS.FACILITY.AVAILABILITY, params);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load availability");
    }
    return mapAvailabilityToRoomDays(response.data);
  }

  async previewQuote(payload: PreviewQuotePayload): Promise<MemberPreviewQuote> {
    const response = await httpClient.post<ApiPreviewQuote>(API_ENDPOINTS.FACILITY.PREVIEW_QUOTE, payload);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load preview quote");
    }
    const data = response.data;
    return {
      subtotalAmount: data.subtotalAmount ?? data.subtotal_amount ?? null,
      discountAmount: data.discountAmount ?? data.discount_amount ?? null,
      surchargeAmount: data.surchargeAmount ?? data.surcharge_amount ?? null,
      quotedAmount: data.quotedAmount ?? data.quoted_amount ?? null,
      currency: data.currency ?? null,
    };
  }

  async createBooking(payload: CreateBookingPayload): Promise<{ id: string }> {
    const response = await httpClient.post<{ id: string }>(API_ENDPOINTS.FACILITY.BOOKINGS, payload);
    if (!response.success || !response.data?.id) {
      throw new Error(response.message || "Failed to create booking");
    }
    return { id: String(response.data.id) };
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
