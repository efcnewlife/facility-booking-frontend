import { describe, expect, it, vi } from "vitest";

const { mockHttpClient } = vi.hoisted(() => ({
  mockHttpClient: { get: vi.fn() },
}));

vi.mock("./httpClient", () => ({
  httpClient: mockHttpClient,
  default: mockHttpClient,
}));

import { facilityService } from "./facilityService";

const DRAFT_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const apiDraftResponse = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  data: {
    id: DRAFT_ID,
    occurrence_count: 5,
    payment_hold_expires_at: "2026-08-22T16:00:00.000Z",
    ...overrides,
  },
});

describe("facilityService.getBookingSeriesDraft pending payment hold mapping", () => {
  it("reads the calendar-day hold count from the camelCase response field", async () => {
    mockHttpClient.get.mockResolvedValueOnce(apiDraftResponse({ pendingPaymentHoldDays: 3 }));

    const draft = await facilityService.getBookingSeriesDraft(DRAFT_ID);

    expect(draft.pendingPaymentHoldDays).toBe(3);
    expect(draft.paymentHoldExpiresAt).toBe("2026-08-22T16:00:00.000Z");
  });

  it("falls back to the snake_case response field", async () => {
    mockHttpClient.get.mockResolvedValueOnce(apiDraftResponse({ pending_payment_hold_days: 3 }));

    const draft = await facilityService.getBookingSeriesDraft(DRAFT_ID);

    expect(draft.pendingPaymentHoldDays).toBe(3);
  });

  it("no longer reads the retired hold-hours response field", async () => {
    mockHttpClient.get.mockResolvedValueOnce(
      apiDraftResponse({ pendingPaymentHoldHours: 48, pending_payment_hold_hours: 48 })
    );

    const draft = await facilityService.getBookingSeriesDraft(DRAFT_ID);

    expect(draft.pendingPaymentHoldDays).toBe(0);
    expect((draft as unknown as Record<string, unknown>).pendingPaymentHoldHours).toBeUndefined();
  });
});
