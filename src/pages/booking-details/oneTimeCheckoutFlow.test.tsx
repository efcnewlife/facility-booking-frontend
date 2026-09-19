import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DRAFT_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const { mockFacility, BookingDraftNotFoundError } = vi.hoisted(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    },
  });
  class BookingDraftNotFoundError extends Error {
    constructor() {
      super("Booking draft not found");
      this.name = "BookingDraftNotFoundError";
    }
  }

  return {
    BookingDraftNotFoundError,
    mockFacility: {
      getBookingDraft: vi.fn(),
      updateBookingDraft: vi.fn(),
      createBooking: vi.fn(),
      getAvailability: vi.fn(),
      previewQuote: vi.fn(),
      getDiscountEligibility: vi.fn(),
    },
  };
});

vi.mock("@/api/services/facilityService", () => ({
  default: mockFacility,
  facilityService: mockFacility,
  BookingDraftNotFoundError,
  BookingSeriesDraftNotFoundError: class BookingSeriesDraftNotFoundError extends Error {
    constructor() {
      super("Booking series draft not found");
      this.name = "BookingSeriesDraftNotFoundError";
    }
  },
  BookingSeriesDraftNotConfirmableError: class BookingSeriesDraftNotConfirmableError extends Error {
    constructor() {
      super("Booking series draft is not confirmable");
      this.name = "BookingSeriesDraftNotConfirmableError";
    }
  },
  BookingNotFoundError: class BookingNotFoundError extends Error {
    constructor() {
      super("Booking not found");
      this.name = "BookingNotFoundError";
    }
  },
  BookingSeriesNotFoundError: class BookingSeriesNotFoundError extends Error {
    constructor() {
      super("Booking series not found");
      this.name = "BookingSeriesNotFoundError";
    }
  },
}));

vi.mock("@efcnewlife/newlife-ui", async () => {
  const React = await import("react");
  type ButtonProps = {
    children?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit";
  };
  type InputProps = {
    error?: string;
    hint?: string;
    id?: string;
    label?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    value?: string;
    wrapperClassName?: string;
  };
  return {
    Button: ({ children, className, disabled, onClick, type = "button" }: ButtonProps) =>
      React.createElement("button", { className, disabled, onClick, type }, children),
    Input: ({ error, hint, id, label, onChange, placeholder, required, value, wrapperClassName }: InputProps) =>
      React.createElement(
        "div",
        { className: wrapperClassName },
        React.createElement("label", { htmlFor: id }, label),
        React.createElement("input", { id, onChange, placeholder, required, value }),
        hint ? React.createElement("p", null, hint) : null,
        error ? React.createElement("p", null, error) : null
      ),
    Spinner: ({ text }: { text?: string }) => React.createElement("div", null, text ?? "Loading"),
    cn: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" "),
  };
});

import "@/i18n";
import BookingDetailsPage from "@/pages/booking-details/BookingDetailsPage";
import NotFoundPage from "@/pages/not-found/NotFoundPage";

const availability = () => ({
  rooms: [
    {
      id: "gym-id",
      code: "gym",
      name: "Gym",
      capacity: 200,
      photoUrls: [],
      templates: [{ start: "09:00", end: "17:00", slotDurationMinutes: 60 }],
      cells: [{ start: "10:00", end: "11:00", state: "available" as const }],
    },
  ],
  maxBookingLines: 3,
});

const draftDetail = (overrides: Partial<{ ministryId: string | null }> = {}) => ({
  id: DRAFT_ID,
  date: "2026-09-01",
  ministryId: overrides.ministryId ?? "ministry-1",
  lines: [{ facilityId: "gym-id", startAt: "2026-09-01T10:00:00.000", endAt: "2026-09-01T11:00:00.000", sequence: 1 }],
});

const renderFlow = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<BookingDetailsPage />} path="/booking-details/one-time/:draftId" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </MemoryRouter>
  );
};

describe("One-time Booking Details discount eligibility", () => {
  beforeEach(() => {
    mockFacility.getBookingDraft.mockResolvedValue(draftDetail());
    mockFacility.getAvailability.mockResolvedValue(availability());
    mockFacility.previewQuote.mockResolvedValue({
      subtotalAmount: "100.00",
      discountAmount: "30.00",
      surchargeAmount: "0.00",
      quotedAmount: "70.00",
      currency: "CAD",
      roomLines: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("calls the generic Booking Discount Eligibility contract and shows the server's Ministry Discount label", async () => {
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: "mission_aligned", discountPercent: 30 });
    renderFlow(`/booking-details/one-time/${DRAFT_ID}`);

    await waitFor(() => {
      expect(mockFacility.getDiscountEligibility).toHaveBeenCalledWith({
        bookingType: "one_time",
        ministryId: "ministry-1",
      });
    });
    expect(await screen.findByText("Ministry discount")).toBeTruthy();
    expect(mockFacility.previewQuote).toHaveBeenCalled();
    const previewPayload = mockFacility.previewQuote.mock.calls[0][0];
    expect(previewPayload).not.toHaveProperty("isMissionAligned");
  });

  it("shows a generic Discount label when the server reports no eligible discount", async () => {
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
    renderFlow(`/booking-details/one-time/${DRAFT_ID}`);

    expect(await screen.findByText("Discount")).toBeTruthy();
  });
});
