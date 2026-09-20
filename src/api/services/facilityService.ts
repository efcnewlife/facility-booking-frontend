import { API_ENDPOINTS, HTTP_STATUS } from "@/api/config";
import type { ApiError } from "@/types/api";
import type { MyBookingsBrowsePage, MyBookingsSection } from "@/types/myBookings";
import {
  mapAvailabilityToRoomDays,
  maxBookingLinesFromPayload,
  type ApiRoomAvailabilityList,
} from "@/utils/availabilityMapper";
import {
  mapMemberBookingDetail,
  mapMemberBookingActions,
  type ApiMemberBookingActions,
  type ApiMemberBookingDetail,
  type ApiMemberBookingTimelineEvent,
  type MemberBookingDetail,
} from "@/utils/bookingDetail";
import { mapBrowsePage, type ApiMemberBookingBrowsePage, type RecurringCancellationScope } from "@/utils/myBookings";
import type { DiscountEligibilityBookingType } from "@/utils/discountEligibility";
import type { RoomDay } from "@/utils/timetableRules";
import { httpClient } from "./httpClient";

export type { MemberBookingDetail } from "@/utils/bookingDetail";

interface CreateBookingPayload {
  title: string;
  startAt: string;
  endAt: string;
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
  lines: PreviewQuoteLinePayload[];
}

export interface DiscountEligibilityPayload {
  bookingType: DiscountEligibilityBookingType;
  ministryId?: string | null;
}

export interface DiscountEligibility {
  discountCode: string | null;
  discountPercent: string | number | null;
}

interface ApiDiscountEligibility {
  discountCode?: string | null;
  discount_code?: string | null;
  discountPercent?: string | number | null;
  discount_percent?: string | number | null;
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
  title: string;
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
  title?: string | null;
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
  title: string;
  ministryId: string | null;
  lines: BookingDraftDetailLine[];
}

export class BookingDraftNotFoundError extends Error {
  constructor() {
    super("Booking draft not found");
    this.name = "BookingDraftNotFoundError";
  }
}

export class BookingSeriesDraftNotFoundError extends Error {
  constructor() {
    super("Recurring Series Draft not found");
    this.name = "BookingSeriesDraftNotFoundError";
  }
}

export class BookingSeriesDraftNotConfirmableError extends Error {
  constructor() {
    super("Recurring Series Draft is not confirmable");
    this.name = "BookingSeriesDraftNotConfirmableError";
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
    title: String(data.title ?? ""),
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
  title: string;
  ministryId?: string | null;
  firstOccurrenceDate: string;
  lastOccurrenceDate: string;
  localStartTime: string;
  localEndTime: string;
  rooms: CreateRecurringBookingSeriesRoomInput[];
  excludedDates?: string[];
}

export interface RecurringBookingWindowStatus {
  isOpen: boolean;
  nextOpeningDate: string | null;
}

export type PreviewRecurringBookingSeriesPayload = Omit<CreateRecurringBookingSeriesPayload, "excludedDates" | "title">;

export interface CreateRecurringSeriesDraftPayload {
  title?: string | null;
  ministryId?: string | null;
  firstOccurrenceDate: string;
  lastOccurrenceDate: string;
  localStartTime: string;
  localEndTime: string;
  rooms: CreateRecurringBookingSeriesRoomInput[];
  excludedDates?: string[];
}

export type UpdateRecurringSeriesDraftPayload = CreateRecurringSeriesDraftPayload;

export interface RecurringSeriesDraftRoom {
  facilityId: string;
  sequence: number;
}

export interface RecurringSeriesDraftDetail {
  id: string;
  title: string | null;
  ministryId: string | null;
  firstOccurrenceDate: string;
  lastOccurrenceDate: string;
  localStartTime: string;
  localEndTime: string;
  isMissionAligned: boolean;
  remark: string | null;
  surchargeCodes: string[];
  excludedDates: string[];
  rooms: RecurringSeriesDraftRoom[];
  conflicts: RecurringBookingConflict[];
  isConfirmable: boolean;
  invalidityCode: string | null;
  invalidityDetail: string | null;
  quotedAmount: string | number | null;
  subtotalAmount: string | number | null;
  discountPercent: string | number | null;
  discountAmount: string | number | null;
  surchargeAmount: string | number | null;
  currency: string | null;
  occurrenceCount: number;
  pendingPaymentHoldHours: number;
  paymentHoldExpiresAt: string | null;
}

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
  quotedAmount?: string | number | null;
  quoted_amount?: string | number | null;
  currency?: string | null;
}

export interface RecurringBookingSeriesPreview {
  conflicts: RecurringBookingConflict[];
  quotedAmount: string | number | null;
  currency: string | null;
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

interface ApiRecurringSeriesDraftRoom {
  facilityId?: string;
  facility_id?: string;
  sequence?: number;
}

interface ApiRecurringSeriesDraftDetail {
  id?: string;
  title?: string | null;
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
  isMissionAligned?: boolean;
  is_mission_aligned?: boolean;
  remark?: string | null;
  surchargeCodes?: string[];
  surcharge_codes?: string[];
  excludedDates?: string[];
  excluded_dates?: string[];
  rooms?: ApiRecurringSeriesDraftRoom[];
  conflicts?: ApiRecurringBookingConflict[];
  isConfirmable?: boolean;
  is_confirmable?: boolean;
  invalidityCode?: string | null;
  invalidity_code?: string | null;
  invalidityDetail?: string | null;
  invalidity_detail?: string | null;
  quotedAmount?: string | number | null;
  quoted_amount?: string | number | null;
  subtotalAmount?: string | number | null;
  subtotal_amount?: string | number | null;
  discountPercent?: string | number | null;
  discount_percent?: string | number | null;
  discountAmount?: string | number | null;
  discount_amount?: string | number | null;
  surchargeAmount?: string | number | null;
  surcharge_amount?: string | number | null;
  currency?: string | null;
  occurrenceCount?: number;
  occurrence_count?: number;
  pendingPaymentHoldHours?: number;
  pending_payment_hold_hours?: number;
  paymentHoldExpiresAt?: string | null;
  payment_hold_expires_at?: string | null;
}

const calendarDateString = (value: string | Date | null | undefined): string => {
  if (value == null || value === "") {
    return "";
  }
  return String(value).slice(0, 10);
};

const mapRecurringSeriesDraftDetail = (
  data: ApiRecurringSeriesDraftDetail,
  fallbackId: string
): RecurringSeriesDraftDetail => ({
  id: data.id ? String(data.id) : fallbackId,
  title: data.title ?? null,
  ministryId: data.ministryId ?? data.ministry_id ?? null,
  firstOccurrenceDate: calendarDateString(data.firstOccurrenceDate ?? data.first_occurrence_date),
  lastOccurrenceDate: calendarDateString(data.lastOccurrenceDate ?? data.last_occurrence_date),
  localStartTime: String(data.localStartTime ?? data.local_start_time ?? ""),
  localEndTime: String(data.localEndTime ?? data.local_end_time ?? ""),
  isMissionAligned: Boolean(data.isMissionAligned ?? data.is_mission_aligned),
  remark: data.remark ?? null,
  surchargeCodes: (data.surchargeCodes ?? data.surcharge_codes ?? []).map(String),
  excludedDates: (data.excludedDates ?? data.excluded_dates ?? []).map(calendarDateString),
  rooms: (data.rooms ?? []).map((room, index) => ({
    facilityId: String(room.facilityId ?? room.facility_id ?? ""),
    sequence: Number(room.sequence ?? index),
  })),
  conflicts: (data.conflicts ?? []).map(mapRecurringBookingConflict),
  isConfirmable: Boolean(data.isConfirmable ?? data.is_confirmable),
  invalidityCode: data.invalidityCode ?? data.invalidity_code ?? null,
  invalidityDetail: data.invalidityDetail ?? data.invalidity_detail ?? null,
  quotedAmount: data.quotedAmount ?? data.quoted_amount ?? null,
  subtotalAmount: data.subtotalAmount ?? data.subtotal_amount ?? null,
  discountPercent: data.discountPercent ?? data.discount_percent ?? null,
  discountAmount: data.discountAmount ?? data.discount_amount ?? null,
  surchargeAmount: data.surchargeAmount ?? data.surcharge_amount ?? null,
  currency: data.currency ?? null,
  occurrenceCount: Number(data.occurrenceCount ?? data.occurrence_count ?? 0),
  pendingPaymentHoldHours: Number(data.pendingPaymentHoldHours ?? data.pending_payment_hold_hours ?? 0),
  paymentHoldExpiresAt: data.paymentHoldExpiresAt ?? data.payment_hold_expires_at ?? null,
});

interface ApiRecurringBookingSeriesDetail {
  id: string;
  title?: string;
  ministryId?: string | null;
  ministry_id?: string | null;
  ministryName?: string | null;
  ministry_name?: string | null;
  remark?: string | null;
  bookerDisplayName?: string | null;
  booker_display_name?: string | null;
  bookerEmail?: string | null;
  booker_email?: string | null;
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
  isBooker?: boolean;
  is_booker?: boolean;
  isViewOnly?: boolean;
  is_view_only?: boolean;
  timeline?: ApiMemberBookingTimelineEvent[];
  actions?: ApiMemberBookingActions;
  occurrences?: ApiMemberBookingDetail[];
}

export interface RecurringBookingSeriesDetail {
  id: string;
  title: string;
  ministryId: string | null;
  ministryName: string | null;
  remark: string | null;
  bookerDisplayName: string | null;
  bookerEmail: string | null;
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
  isBooker: boolean;
  isViewOnly: boolean;
  timeline: MemberBookingDetail["timeline"];
  actions: MemberBookingDetail["actions"];
  occurrences: MemberBookingDetail[];
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
  cancelReason: string;
}

const optionalIsoString = (value: string | null | undefined): string | null => {
  if (value == null || value === "") {
    return null;
  }
  return String(value);
};

const mapRecurringBookingSeriesDetail = (data: ApiRecurringBookingSeriesDetail): RecurringBookingSeriesDetail => ({
  id: String(data.id),
  title: String(data.title ?? ""),
  ministryId: data.ministryId ?? data.ministry_id ?? null,
  ministryName: data.ministryName ?? data.ministry_name ?? null,
  remark: data.remark ?? null,
  bookerDisplayName: data.bookerDisplayName ?? data.booker_display_name ?? null,
  bookerEmail: data.bookerEmail ?? data.booker_email ?? null,
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
  isBooker: Boolean(data.isBooker ?? data.is_booker),
  isViewOnly: Boolean(data.isViewOnly ?? data.is_view_only ?? true),
  timeline: (data.timeline ?? []).map((event: ApiMemberBookingTimelineEvent) => ({
    kind: String(event.kind ?? ""),
    occurredAt: String(event.occurredAt ?? event.occurred_at ?? ""),
    reason: event.reason ?? null,
  })),
  actions: mapMemberBookingActions(data.actions),
  occurrences: (data.occurrences ?? []).map(mapMemberBookingDetail),
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

  async getDiscountEligibility(payload: DiscountEligibilityPayload): Promise<DiscountEligibility> {
    const response = await httpClient.post<ApiDiscountEligibility>(
      API_ENDPOINTS.FACILITY.DISCOUNT_ELIGIBILITY,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to load discount eligibility");
    }
    const data = response.data;
    return {
      discountCode: data.discountCode ?? data.discount_code ?? null,
      discountPercent: data.discountPercent ?? data.discount_percent ?? null,
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

  async previewBookingSeries(payload: PreviewRecurringBookingSeriesPayload): Promise<RecurringBookingSeriesPreview> {
    const response = await httpClient.post<ApiRecurringBookingPreview>(
      API_ENDPOINTS.FACILITY.BOOKING_SERIES_PREVIEW,
      payload
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to preview recurring booking series");
    }
    return {
      conflicts: (response.data.conflicts ?? []).map(mapRecurringBookingConflict),
      quotedAmount: response.data.quotedAmount ?? response.data.quoted_amount ?? null,
      currency: response.data.currency ?? null,
    };
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
      const response = await httpClient.get<ApiMemberBookingDetail>(API_ENDPOINTS.FACILITY.booking(bookingId));
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load booking");
      }
      return mapMemberBookingDetail(response.data);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to load booking");
    }
  }

  async updateMyBookingTitle(bookingId: string, title: string): Promise<MemberBookingDetail> {
    try {
      const response = await httpClient.patch<ApiMemberBookingDetail>(API_ENDPOINTS.FACILITY.bookingTitle(bookingId), {
        title,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to update booking title");
      }
      return mapMemberBookingDetail(response.data);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to update booking title");
    }
  }

  async deleteAllMyBookingDrafts(): Promise<void> {
    const response = await httpClient.delete(API_ENDPOINTS.FACILITY.BOOKING_DRAFTS);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete booking drafts");
    }
  }

  async createBookingSeriesDraft(payload: CreateRecurringSeriesDraftPayload): Promise<{ id: string }> {
    const response = await httpClient.post<{ id: string }>(API_ENDPOINTS.FACILITY.BOOKING_SERIES_DRAFTS, payload);
    if (!response.success || !response.data?.id) {
      throw new Error(response.message || "Failed to create recurring series draft");
    }
    return { id: String(response.data.id) };
  }

  async getBookingSeriesDraft(seriesDraftId: string): Promise<RecurringSeriesDraftDetail> {
    try {
      const response = await httpClient.get<ApiRecurringSeriesDraftDetail>(
        API_ENDPOINTS.FACILITY.bookingSeriesDraft(seriesDraftId)
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load recurring series draft");
      }
      return mapRecurringSeriesDraftDetail(response.data, seriesDraftId);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingSeriesDraftNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to load recurring series draft");
    }
  }

  async updateBookingSeriesDraft(
    seriesDraftId: string,
    payload: UpdateRecurringSeriesDraftPayload
  ): Promise<RecurringSeriesDraftDetail> {
    try {
      const response = await httpClient.patch<ApiRecurringSeriesDraftDetail>(
        API_ENDPOINTS.FACILITY.bookingSeriesDraft(seriesDraftId),
        payload
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to update recurring series draft");
      }
      return mapRecurringSeriesDraftDetail(response.data, seriesDraftId);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingSeriesDraftNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to update recurring series draft");
    }
  }

  async confirmBookingSeriesDraft(seriesDraftId: string): Promise<RecurringBookingSeriesDetail> {
    try {
      const response = await httpClient.post<ApiRecurringBookingSeriesDetail>(
        API_ENDPOINTS.FACILITY.confirmBookingSeriesDraft(seriesDraftId)
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to confirm recurring series draft");
      }
      return mapRecurringBookingSeriesDetail(response.data);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingSeriesDraftNotFoundError();
      }
      if (
        isApiError(err) &&
        (err.code === HTTP_STATUS.CONFLICT ||
          err.details?.error_code === "FACILITY_BOOKING_SERIES_DRAFT_NOT_CONFIRMABLE")
      ) {
        throw new BookingSeriesDraftNotConfirmableError();
      }
      throw err instanceof Error ? err : new Error("Failed to confirm recurring series draft");
    }
  }

  async deleteAllMyBookingSeriesDrafts(): Promise<void> {
    const response = await httpClient.delete(API_ENDPOINTS.FACILITY.BOOKING_SERIES_DRAFTS);
    if (!response.success) {
      throw new Error(response.message || "Failed to delete recurring series drafts");
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

  async updateBookingSeriesTitle(seriesId: string, title: string): Promise<RecurringBookingSeriesDetail> {
    try {
      const response = await httpClient.patch<ApiRecurringBookingSeriesDetail>(
        API_ENDPOINTS.FACILITY.bookingSeriesTitle(seriesId),
        { title }
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to update recurring booking series title");
      }
      return mapRecurringBookingSeriesDetail(response.data);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingSeriesNotFoundError();
      }
      throw err instanceof Error ? err : new Error("Failed to update recurring booking series title");
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

  async cancelMyBooking(bookingId: string, cancelReason: string): Promise<void> {
    const response = await httpClient.post(API_ENDPOINTS.FACILITY.cancelBooking(bookingId), {
      scope: "single",
      cancelReason,
    });
    if (!response.success) {
      throw new Error(response.message || "Failed to cancel booking");
    }
  }
}

export const facilityService = new FacilityService();
export default facilityService;
