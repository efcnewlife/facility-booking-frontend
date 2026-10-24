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
import { finalConfirmationRejection } from "@/utils/overrideReviewErrors";
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
  overrideReviewToken?: string | null;
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
  isFreeMinistry: boolean;
}

interface ApiFreeMinistryFlag {
  isFreeMinistry?: boolean;
  is_free_ministry?: boolean;
}

interface ApiDiscountEligibility extends ApiFreeMinistryFlag {
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

interface ApiPreviewQuote extends ApiFreeMinistryFlag {
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
  /** Server-decided free Ministry booking: every charge is zero and no payment applies. */
  isFreeMinistry: boolean;
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

interface ApiDraftInterval {
  facilityId?: string;
  facility_id?: string;
  startAt?: string;
  start_at?: string;
  endAt?: string;
  end_at?: string;
}

interface ApiBookingConflict extends ApiDraftInterval {
  kind?: string;
  ministryName?: string | null;
  ministry_name?: string | null;
  contactDisplayName?: string | null;
  contact_display_name?: string | null;
  contactEmail?: string | null;
  contact_email?: string | null;
}

interface ApiOverrideImpact {
  bookingId?: string;
  booking_id?: string;
  isSeriesOccurrence?: boolean;
  is_series_occurrence?: boolean;
  startAt?: string;
  start_at?: string;
  endAt?: string;
  end_at?: string;
  releasedIntervals?: ApiDraftInterval[];
  released_intervals?: ApiDraftInterval[];
}

interface ApiBookingDraftDetail extends ApiFreeMinistryFlag {
  id?: string;
  date?: string;
  title?: string | null;
  ministryId?: string | null;
  ministry_id?: string | null;
  lines?: ApiBookingDraftLine[];
  isConfirmable?: boolean;
  is_confirmable?: boolean;
  conflicts?: ApiBookingConflict[];
  overrideImpacts?: ApiOverrideImpact[];
  override_impacts?: ApiOverrideImpact[];
  overrideReviewToken?: string | null;
  override_review_token?: string | null;
}

export interface DraftRoomInterval {
  facilityId: string;
  startAt: string;
  endAt: string;
}

/** Blocking occupancy on a Draft; Ministry name and contact are present only for an authorized Ministry proposal. */
export interface BookingConflict extends DraftRoomInterval {
  kind: string;
  ministryName: string | null;
  contactDisplayName: string | null;
  contactEmail: string | null;
}

/** Whole Booking (or one Series occurrence) a Priority Ministry confirmation would displace. */
export interface OverrideImpact {
  bookingId: string;
  isSeriesOccurrence: boolean;
  startAt: string;
  endAt: string;
  releasedIntervals: DraftRoomInterval[];
}

/** Server evaluation of the reviewed proposal; final confirmation sends the token whenever impacts exist. */
export interface OverrideReview {
  isConfirmable: boolean;
  conflicts: BookingConflict[];
  overrideImpacts: OverrideImpact[];
  overrideReviewToken: string | null;
}

export interface BookingDraftDetailLine {
  facilityId: string;
  startAt: string;
  endAt: string;
  sequence: number;
}

export interface BookingDraftDetail extends OverrideReview {
  id: string;
  date: string;
  title: string;
  ministryId: string | null;
  isFreeMinistry: boolean;
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

const isFreeMinistryFlag = (data: ApiFreeMinistryFlag): boolean =>
  Boolean(data.isFreeMinistry ?? data.is_free_ministry);

const isApiError = (err: unknown): err is ApiError => {
  return typeof err === "object" && err !== null && "code" in err;
};

const mapDraftInterval = (interval: ApiDraftInterval): DraftRoomInterval => ({
  facilityId: String(interval.facilityId ?? interval.facility_id ?? ""),
  startAt: String(interval.startAt ?? interval.start_at ?? ""),
  endAt: String(interval.endAt ?? interval.end_at ?? ""),
});

const mapOverrideImpact = (impact: ApiOverrideImpact): OverrideImpact => ({
  bookingId: String(impact.bookingId ?? impact.booking_id ?? ""),
  isSeriesOccurrence: Boolean(impact.isSeriesOccurrence ?? impact.is_series_occurrence),
  startAt: String(impact.startAt ?? impact.start_at ?? ""),
  endAt: String(impact.endAt ?? impact.end_at ?? ""),
  releasedIntervals: (impact.releasedIntervals ?? impact.released_intervals ?? []).map(mapDraftInterval),
});

export const mapOverrideReview = (data: ApiBookingDraftDetail): OverrideReview => ({
  isConfirmable: (data.isConfirmable ?? data.is_confirmable) !== false,
  conflicts: (data.conflicts ?? []).map((conflict) => ({
    ...mapDraftInterval(conflict),
    kind: String(conflict.kind ?? ""),
    ministryName: conflict.ministryName ?? conflict.ministry_name ?? null,
    contactDisplayName: conflict.contactDisplayName ?? conflict.contact_display_name ?? null,
    contactEmail: conflict.contactEmail ?? conflict.contact_email ?? null,
  })),
  overrideImpacts: (data.overrideImpacts ?? data.override_impacts ?? []).map(mapOverrideImpact),
  overrideReviewToken: data.overrideReviewToken ?? data.override_review_token ?? null,
});

const mapBookingDraftDetail = (data: ApiBookingDraftDetail, fallbackId: string): BookingDraftDetail => {
  const rawLines = data.lines ?? [];
  return {
    ...mapOverrideReview(data),
    id: data.id ? String(data.id) : fallbackId,
    date: String(data.date ?? ""),
    title: String(data.title ?? ""),
    ministryId: data.ministryId ?? data.ministry_id ?? null,
    isFreeMinistry: isFreeMinistryFlag(data),
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
  /** Whole target Bookings (one occurrence each for a Series target) a Priority Ministry confirmation would displace. */
  overrideImpacts: OverrideImpact[];
  overrideReviewToken: string | null;
  isConfirmable: boolean;
  invalidityCode: string | null;
  invalidityDetail: string | null;
  quotedAmount: string | number | null;
  subtotalAmount: string | number | null;
  discountPercent: string | number | null;
  discountAmount: string | number | null;
  surchargeAmount: string | number | null;
  currency: string | null;
  isFreeMinistry: boolean;
  occurrenceCount: number;
  /** Null when no payment hold applies (free Ministry Series). */
  pendingPaymentHoldDays: number | null;
  paymentHoldExpiresAt: string | null;
}

export type RecurringConflictKind = "occupancy" | "ministry" | "blackout" | "opening_hours" | "weekly_quota";

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
  bookerDisplayName?: string | null;
  booker_display_name?: string | null;
  bookerEmail?: string | null;
  booker_email?: string | null;
}

interface ApiRecurringBookingPreview extends ApiFreeMinistryFlag {
  conflicts?: ApiRecurringBookingConflict[];
  quotedAmount?: string | number | null;
  quoted_amount?: string | number | null;
  currency?: string | null;
}

export interface RecurringBookingSeriesPreview {
  conflicts: RecurringBookingConflict[];
  quotedAmount: string | number | null;
  currency: string | null;
  isFreeMinistry: boolean;
}

export interface RecurringBookingConflict {
  occurrenceDate: string;
  kind: RecurringConflictKind;
  facilityIds: string[];
  isOverridable: boolean;
  ministryId: string | null;
  ministryStewardDisplayName: string | null;
  ministryStewardEmail: string | null;
  /** Rental Booker contact, present only for a Non-priority Ministry proposal. */
  bookerDisplayName: string | null;
  bookerEmail: string | null;
}

const mapRecurringBookingConflict = (data: ApiRecurringBookingConflict): RecurringBookingConflict => ({
  occurrenceDate: String(data.occurrenceDate ?? data.occurrence_date ?? ""),
  kind: data.kind as RecurringConflictKind,
  facilityIds: (data.facilityIds ?? data.facility_ids ?? []).map(String),
  isOverridable: Boolean(data.isOverridable ?? data.is_overridable),
  ministryId: data.ministryId ?? data.ministry_id ?? null,
  ministryStewardDisplayName: data.ministryStewardDisplayName ?? data.ministry_steward_display_name ?? null,
  ministryStewardEmail: data.ministryStewardEmail ?? data.ministry_steward_email ?? null,
  bookerDisplayName: data.bookerDisplayName ?? data.booker_display_name ?? null,
  bookerEmail: data.bookerEmail ?? data.booker_email ?? null,
});

interface ApiRecurringSeriesDraftRoom {
  facilityId?: string;
  facility_id?: string;
  sequence?: number;
}

interface ApiRecurringSeriesDraftDetail extends ApiFreeMinistryFlag {
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
  overrideImpacts?: ApiOverrideImpact[];
  override_impacts?: ApiOverrideImpact[];
  overrideReviewToken?: string | null;
  override_review_token?: string | null;
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
  pendingPaymentHoldDays?: number | null;
  pending_payment_hold_days?: number | null;
  paymentHoldExpiresAt?: string | null;
  payment_hold_expires_at?: string | null;
}

const calendarDateString = (value: string | Date | null | undefined): string => {
  if (value == null || value === "") {
    return "";
  }
  return String(value).slice(0, 10);
};

const optionalNumber = (value: number | null | undefined): number | null => (value == null ? null : Number(value));

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
  overrideImpacts: (data.overrideImpacts ?? data.override_impacts ?? []).map(mapOverrideImpact),
  overrideReviewToken: data.overrideReviewToken ?? data.override_review_token ?? null,
  isConfirmable: Boolean(data.isConfirmable ?? data.is_confirmable),
  invalidityCode: data.invalidityCode ?? data.invalidity_code ?? null,
  invalidityDetail: data.invalidityDetail ?? data.invalidity_detail ?? null,
  quotedAmount: data.quotedAmount ?? data.quoted_amount ?? null,
  subtotalAmount: data.subtotalAmount ?? data.subtotal_amount ?? null,
  discountPercent: data.discountPercent ?? data.discount_percent ?? null,
  discountAmount: data.discountAmount ?? data.discount_amount ?? null,
  surchargeAmount: data.surchargeAmount ?? data.surcharge_amount ?? null,
  currency: data.currency ?? null,
  isFreeMinistry: isFreeMinistryFlag(data),
  occurrenceCount: Number(data.occurrenceCount ?? data.occurrence_count ?? 0),
  pendingPaymentHoldDays: optionalNumber(data.pendingPaymentHoldDays ?? data.pending_payment_hold_days),
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
      isFreeMinistry: isFreeMinistryFlag(data),
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
      isFreeMinistry: isFreeMinistryFlag(data),
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
      isFreeMinistry: isFreeMinistryFlag(response.data),
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

  /** Send the reviewed `overrideReviewToken` whenever the Draft has an Override impact; omit it otherwise. */
  async confirmBookingSeriesDraft(
    seriesDraftId: string,
    overrideReviewToken: string | null = null
  ): Promise<RecurringBookingSeriesDetail> {
    try {
      const response = await httpClient.post<ApiRecurringBookingSeriesDetail>(
        API_ENDPOINTS.FACILITY.confirmBookingSeriesDraft(seriesDraftId),
        overrideReviewToken ? { overrideReviewToken } : undefined
      );
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to confirm recurring series draft");
      }
      return mapRecurringBookingSeriesDetail(response.data);
    } catch (err) {
      if (isApiError(err) && err.code === HTTP_STATUS.NOT_FOUND) {
        throw new BookingSeriesDraftNotFoundError();
      }
      // Review and scheduling-conflict rejections need their own refresh path on Booking Details.
      if (finalConfirmationRejection(err)) {
        throw err;
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
