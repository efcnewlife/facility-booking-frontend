const BOOKING_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const parseBookingDetailId = (value: string | undefined): string | null => {
  if (!value || !BOOKING_UUID.test(value)) {
    return null;
  }
  return value;
};

export interface MemberBookingDetailRoom {
  id: string;
  facilityId: string;
  facilityName: string | null;
  sequence: number;
  startAt: string;
  endAt: string;
  billedHours: string | number | null;
  rentalRateName: string | null;
  billingUnit: string | null;
  unitAmount: string | number | null;
  currency: string | null;
  lineSubtotal: string | number | null;
  photoUrls: string[];
}

export interface MemberBookingTimelineEvent {
  kind: string;
  occurredAt: string;
  reason: string | null;
}

export interface MemberBookingActions {
  canEditTitle: boolean;
  canCancel: boolean;
  canViewPaymentInstructions: boolean;
  canBookAgain: boolean;
  bookAgainDate: string | null;
}

export interface MemberBookingDetail {
  id: string;
  title: string;
  status: string;
  bookingType: string;
  seriesId: string | null;
  startAt: string;
  endAt: string;
  ministryId: string | null;
  ministryName: string | null;
  remark: string | null;
  bookerDisplayName: string | null;
  bookerEmail: string | null;
  quotedAmount: string | number | null;
  subtotalAmount: string | number | null;
  discountPercent: string | number | null;
  discountAmount: string | number | null;
  surchargeAmount: string | number | null;
  currency: string | null;
  paymentHoldExpiresAt: string | null;
  isBooker: boolean;
  isViewOnly: boolean;
  rooms: MemberBookingDetailRoom[];
  timeline: MemberBookingTimelineEvent[];
  actions: MemberBookingActions;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- raw API payloads may still be snake_case. */

export const mapMemberBookingActions = (data: any): MemberBookingActions => ({
  canEditTitle: Boolean(data?.canEditTitle ?? data?.can_edit_title),
  canCancel: Boolean(data?.canCancel ?? data?.can_cancel),
  canViewPaymentInstructions: Boolean(data?.canViewPaymentInstructions ?? data?.can_view_payment_instructions),
  canBookAgain: Boolean(data?.canBookAgain ?? data?.can_book_again),
  bookAgainDate: (data?.bookAgainDate ?? data?.book_again_date) || null,
});

const mapMemberBookingDetailRoom = (data: any): MemberBookingDetailRoom => ({
  id: String(data?.id ?? ""),
  facilityId: String(data?.facilityId ?? data?.facility_id ?? ""),
  facilityName: data?.facilityName ?? data?.facility_name ?? null,
  sequence: Number(data?.sequence ?? 0),
  startAt: String(data?.startAt ?? data?.start_at ?? ""),
  endAt: String(data?.endAt ?? data?.end_at ?? ""),
  billedHours: data?.billedHours ?? data?.billed_hours ?? null,
  rentalRateName: data?.rentalRateName ?? data?.rental_rate_name ?? null,
  billingUnit: data?.billingUnit ?? data?.billing_unit ?? null,
  unitAmount: data?.unitAmount ?? data?.unit_amount ?? null,
  currency: data?.currency ?? null,
  lineSubtotal: data?.lineSubtotal ?? data?.line_subtotal ?? null,
  photoUrls: data?.photoUrls ?? data?.photo_urls ?? [],
});

const mapMemberBookingTimelineEvent = (data: any): MemberBookingTimelineEvent => ({
  kind: String(data?.kind ?? ""),
  occurredAt: String(data?.occurredAt ?? data?.occurred_at ?? ""),
  reason: data?.reason ?? null,
});

export const mapMemberBookingDetail = (data: any): MemberBookingDetail => ({
  id: String(data?.id ?? ""),
  title: String(data?.title ?? ""),
  status: String(data?.status ?? ""),
  bookingType: String(data?.bookingType ?? data?.booking_type ?? ""),
  seriesId: data?.seriesId ?? data?.series_id ?? null,
  startAt: String(data?.startAt ?? data?.start_at ?? ""),
  endAt: String(data?.endAt ?? data?.end_at ?? ""),
  ministryId: data?.ministryId ?? data?.ministry_id ?? null,
  ministryName: data?.ministryName ?? data?.ministry_name ?? null,
  remark: data?.remark ?? null,
  bookerDisplayName: data?.bookerDisplayName ?? data?.booker_display_name ?? null,
  bookerEmail: data?.bookerEmail ?? data?.booker_email ?? null,
  quotedAmount: data?.quotedAmount ?? data?.quoted_amount ?? null,
  subtotalAmount: data?.subtotalAmount ?? data?.subtotal_amount ?? null,
  discountPercent: data?.discountPercent ?? data?.discount_percent ?? null,
  discountAmount: data?.discountAmount ?? data?.discount_amount ?? null,
  surchargeAmount: data?.surchargeAmount ?? data?.surcharge_amount ?? null,
  currency: data?.currency ?? null,
  paymentHoldExpiresAt: (data?.paymentHoldExpiresAt ?? data?.payment_hold_expires_at) || null,
  isBooker: Boolean(data?.isBooker ?? data?.is_booker),
  isViewOnly: Boolean(data?.isViewOnly ?? data?.is_view_only ?? true),
  rooms: (data?.rooms ?? []).map(mapMemberBookingDetailRoom),
  timeline: (data?.timeline ?? []).map(mapMemberBookingTimelineEvent),
  actions: mapMemberBookingActions(data?.actions),
});

/* eslint-enable @typescript-eslint/no-explicit-any */

interface PendingPaymentRecord {
  status: string;
  paymentHoldExpiresAt: string | null;
  actions: { canViewPaymentInstructions: boolean };
}

/** Only an unexpired Pending-payment record the server marks Booker-visible shows payment instructions. */
export const canShowPaymentInstructions = (record: PendingPaymentRecord, now: Date): boolean => {
  if (!record.actions.canViewPaymentInstructions || record.status !== "pending_payment") {
    return false;
  }
  if (!record.paymentHoldExpiresAt) {
    return true;
  }
  return new Date(record.paymentHoldExpiresAt) > now;
};

/** "Book again" opens Timetable seeded with only the facility-local date (ADR: no ministry/time seed). */
export const bookAgainRoomsSearchParams = (bookAgainDate: string): URLSearchParams => {
  const params = new URLSearchParams();
  params.set("date", bookAgainDate);
  return params;
};

const TIMELINE_EVENT_KINDS = new Set(["created", "cancelled", "overridden", "payment_expired"]);

export const timelineEventLabelKey = (kind: string): string => {
  if (TIMELINE_EVENT_KINDS.has(kind)) {
    return `bookingDetail.timeline.${kind}`;
  }
  return "bookingDetail.timeline.unknown";
};
