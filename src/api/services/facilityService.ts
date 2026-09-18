import { API_ENDPOINTS, HTTP_STATUS } from "@/api/config";
import type { ApiError } from "@/types/api";
import type { MyBookingsBrowsePage, MyBookingsSection } from "@/types/myBookings";
import {
  mapAvailabilityToRoomDays,
  maxBookingLinesFromPayload,
  type ApiRoomAvailabilityList,
} from "@/utils/availabilityMapper";
import { mapBrowsePage, type ApiMemberBookingBrowsePage, type RecurringCancellationScope } from "@/utils/myBookings";
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

export interface CreateRecurringBookingSeriesRoomInput {
  facilityId: string;
  sequence?: number;
}

export interface CreateRecurringBookingSeriesPayload {
  ministryId?: string | null;
  firstOccurrenceDate: string;
  lastOccurrenceDate: string;
  localStartTime: string;
  localEndTime: string;
  isMissionAligned?: boolean;
  rooms: CreateRecurringBookingSeriesRoomInput[];
  excludedDates?: string[];
}

export interface RecurringBookingWindowStatus {
  isOpen: boolean;
  nextOpeningDate: string | null;
}

export type PreviewRecurringBookingSeriesPayload = Omit<CreateRecurringBookingSeriesPayload, "excludedDates">;

export type RecurringConflictKind = "occupancy" | "ministry" | "blackout" | "weekly_quota";

interface ApiRecurringBookingConflict {
  occurrenceDate?: string;
  occurrence_date?: string;
  kind?: string;
  facilityIds?: string[];
  facility_ids?: string[];
  isOverridable?: boolean;
  is_overridable?: boolean;
  ministryId?: string | null;
  ministry_id?: string | null;
  ministryStewardDisplayName?: string | null;
  ministry_steward_display_name?: string | null;
  ministryStewardEmail?: string | null;
  ministry_steward_email?: string | null;
}

interface ApiRecurringBookingPreview {
  conflicts?: ApiRecurringBookingConflict[];
}

export interface RecurringBookingConflict {
  occurrenceDate: string;
  kind: RecurringConflictKind;
  facilityIds: string[];
  isOverridable: boolean;
  ministryId: string | null;
  ministryStewardDisplayName: string | null;
  ministryStewardEmail: string | null;
}

const mapRecurringBookingConflict = (data: ApiRecurringBookingConflict): RecurringBookingConflict => ({
  occurrenceDate: String(data.occurrenceDate ?? data.occurrence_date ?? ""),
  kind: data.kind as RecurringConflictKind,
  facilityIds: (data.facilityIds ?? data.facility_ids ?? []).map(String),
  isOverridable: Boolean(data.isOverridable ?? data.is_overridable),
  ministryId: data.ministryId ?? data.ministry_id ?? null,
  ministryStewardDisplayName: data.ministryStewardDisplayName ?? data.ministry_steward_display_name ?? null,
  ministryStewardEmail: data.ministryStewardEmail ?? data.ministry_steward_email ?? null,
});

interface ApiRecurringBookingOccurrence {
  id: string;
  startAt?: string;
  start_at?: string;
  endAt?: string;
  end_at?: string;
  status?: string;
  quotedAmount?: string | number | null;
  quoted_amount?: string | number | null;
  currency?: string | null;
  facilityIds?: string[];
  facility_ids?: string[];
}

interface ApiRecurringBookingSeriesDetail {
  id: string;
  ministryId?: string | null;
  ministry_id?: string | null;
  firstOccurrenceDate?: string;
  first_occurrence_date?: string;
  lastOccurrenceDate?: string;
  last_occurrence_date?: string;
  localStartTime?: string;
  local_start_time?: string;
  localEndTime?: string;
  local_end_time?: string;
  status?: string;
  paymentHoldExpiresAt?: string | null;
  payment_hold_expires_at?: string | null;
  quotedAmount?: string | number | null;
  quoted_amount?: string | number | null;
  currency?: string | null;
  occurrenceCount?: number;
  occurrence_count?: number;
  isPriority?: boolean;
  is_priority?: boolean;
  occurrences?: ApiRecurringBookingOccurrence[];
}

export interface RecurringBookingSeriesOccurrence {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  quotedAmount: string | number | null;
  currency: string | null;
  facilityIds: string[];
}

export interface RecurringBookingSeriesDetail {
  id: string;
  ministryId: string | null;
  firstOccurrenceDate: string;
  lastOccurrenceDate: string;
  localStartTime: string;
  localEndTime: string;
  status: string;
  paymentHoldExpiresAt: string | null;
  quotedAmount: string | number | null;
  currency: string | null;
  occurrenceCount: number;
  isPriority: boolean;
  occurrences: RecurringBookingSeriesOccurrence[];
}

export class BookingSeriesNotFoundError extends Error {
  constructor() {
    super("Recurring Booking Series not found");
    this.name = "BookingSeriesNotFoundError";
  }
}

export interface CancelRecurringBookingSeriesPayload {
  scope: RecurringCancellationScope;
  occurrenceId?: string | null;
  cancelReason?: string | null;
}

const optionalIsoString = (value: string | null | undefined): string | null => {
  if (value == null || value === "") {
    return null;
  }
  return String(value);
};

const mapRecurringBookingSeriesDetail = (data: ApiRecurringBookingSeriesDetail): RecurringBookingSeriesDetail => ({
  id: String(data.id),
  ministryId: data.ministryId ?? data.ministry_id ?? null,
  firstOccurrenceDate: String(data.firstOccurrenceDate ?? data.first_occurrence_date ?? ""),
  lastOccurrenceDate: String(data.lastOccurrenceDate ?? data.last_occurrence_date ?? ""),
  localStartTime: String(data.localStartTime ?? data.local_start_time ?? ""),
  localEndTime: String(data.localEndTime ?? data.local_end_time ?? ""),
  status: String(data.status ?? ""),
  paymentHoldExpiresAt: optionalIsoString(data.paymentHoldExpiresAt ?? data.payment_hold_expires_at),
  quotedAmount: data.quotedAmount ?? data.quoted_amount ?? null,
  currency: data.currency ?? null,
  occurrenceCount: Number(data.occurrenceCount ?? data.occurrence_count ?? 0),
  isPriority: Boolean(data.isPriority ?? data.is_priority),
  occurrences: (data.occurrences ?? []).map((occurrence) => ({
    id: String(occurrence.id),
    startAt: String(occurrence.startAt ?? occurrence.start_at ?? ""),
    endAt: String(occurrence.endAt ?? occurrence.end_at ?? ""),
    status: String(occurrence.status ?? ""),
    quotedAmount: occurrence.quotedAmount ?? occurrence.quoted_amount ?? null,
    currency: occurrence.currency ?? null,
    facilityIds: (occurrence.facilityIds ?? occurrence.facility_ids ?? []).map(String),
  })),
});

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

  async getRecurringBookingWindowStatus(firstOccurrenceDate?: string | null): Promise<RecurringBookingWindowStatus> {
    const params: Record<string, unknown> = {};
    if (firstOccurrenceDate) {
      params.firstOccurrenceDate = firstOccurrenceDate;
    }
    const response = await httpClient.get<{
      isOpen?: boolean;
      is_open?: boolean;
      nextOpeningDate?: string | null;
      next_opening_date?: string | null;
    }>(API_ENDPOINTS.FACILITY.BOOKING_SERIES_AVAILABILITY_WINDOW, params);
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load repeated booking window");
    }
    const nextOpening = response.data.nextOpeningDate ?? response.data.next_opening_date ?? null;
    return {
      isOpen: Boolean(response.data.isOpen ?? response.data.is_open),
      nextOpeningDate: nextOpening ? String(nextOpening) : null,
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

  async previewBookingSeries(payload: PreviewRecurringBookingSeriesPayload): Promise<RecurringBookingConflict[]> {
    const response = await httpClient.post<ApiRecurringBookingPreview>(
      API_ENDPOINTS.FACILITY.BOOKING_SERIES_PREVIEW,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to preview recurring booking series");
    }
    return (response.data.conflicts ?? []).map(mapRecurringBookingConflict);
  }

  async createBookingSeries(payload: CreateRecurringBookingSeriesPayload): Promise<RecurringBookingSeriesDetail> {
    const response = await httpClient.post<ApiRecurringBookingSeriesDetail>(
      API_ENDPOINTS.FACILITY.BOOKING_SERIES,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to create recurring booking series");
    }
    return mapRecurringBookingSeriesDetail(response.data);
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

  async browseMyBookings(section: MyBookingsSection, page: number, pageSize: number): Promise<MyBookingsBrowsePage> {
    const response = await httpClient.get<ApiMemberBookingBrowsePage>(API_ENDPOINTS.FACILITY.MY_BOOKINGS, {
      section,
      page,
      pageSize,
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load bookings");
    }
    return mapBrowsePage(response.data);
  }

  async getBookingSeries(seriesId: string): Promise<RecurringBookingSeriesDetail> {
    try {
      const response = await httpClient.get<ApiRecurringBookingSeriesDetail>(
        API_ENDPOINTS.FACILITY.bookingSeries(seriesId)
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load recurring booking series");
      }
      return mapRecurringBookingSeriesDetail(response.data);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingSeriesNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to load recurring booking series");
    }
  }

  async cancelBookingSeries(
    seriesId: string,
    payload: CancelRecurringBookingSeriesPayload
  ): Promise<RecurringBookingSeriesDetail> {
    try {
      const response = await httpClient.post<ApiRecurringBookingSeriesDetail>(
        API_ENDPOINTS.FACILITY.cancelBookingSeries(seriesId),
        payload
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to cancel recurring booking series");
      }
      return mapRecurringBookingSeriesDetail(response.data);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingSeriesNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to cancel recurring booking series");
    }
  }

  async cancelMyBooking(bookingId: string, cancelReason?: string | null): Promise<void> {
    const response = await httpClient.post(API_ENDPOINTS.FACILITY.cancelBooking(bookingId), {
      scope: "single",
      cancelReason: cancelReason ?? null,
    });
    if (!response.success) {
      throw new Error(response.message || "Failed to cancel booking");
    }
  }
}

export const facilityService = new FacilityService();
export default facilityService;
