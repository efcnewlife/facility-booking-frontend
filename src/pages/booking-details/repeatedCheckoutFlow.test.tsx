import type { RecurringSeriesDraftDetail } from "@/api/services/facilityService";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DRAFT_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const SERIES_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const { mockFacility, BookingSeriesDraftNotFoundError } = vi.hoisted(() => {
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
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  // jsdom does not implement Element.scrollTo; the Timetable grid scrolls to the pinned time on mount.
  Element.prototype.scrollTo = () => {};
  class BookingSeriesDraftNotFoundError extends Error {
    constructor() {
      super("Booking series draft not found");
      this.name = "BookingSeriesDraftNotFoundError";
    }
  }

  return {
    BookingSeriesDraftNotFoundError,
    mockFacility: {
      createBookingSeriesDraft: vi.fn(),
      getBookingSeriesDraft: vi.fn(),
      updateBookingSeriesDraft: vi.fn(),
      confirmBookingSeriesDraft: vi.fn(),
      getAvailability: vi.fn(),
      getRecurringBookingWindowStatus: vi.fn(),
      previewBookingSeries: vi.fn(),
      getBookingSeries: vi.fn(),
      getDiscountEligibility: vi.fn(),
    },
  };
});

vi.mock("@/api/services/facilityService", () => ({
  default: mockFacility,
  facilityService: mockFacility,
  BookingSeriesDraftNotFoundError,
  BookingSeriesDraftNotConfirmableError: class BookingSeriesDraftNotConfirmableError extends Error {
    constructor() {
      super("Booking series draft is not confirmable");
      this.name = "BookingSeriesDraftNotConfirmableError";
    }
  },
  BookingDraftNotFoundError: class BookingDraftNotFoundError extends Error {
    constructor() {
      super("Booking draft not found");
      this.name = "BookingDraftNotFoundError";
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

vi.mock("@/api/services/ministryService", () => ({
  default: {
    listMine: vi.fn().mockResolvedValue({ items: [] }),
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
    "aria-pressed"?: boolean;
    "aria-label"?: string;
    startIcon?: React.ReactNode;
    variant?: string;
    size?: string;
  };
  type InputProps = {
    error?: string;
    hint?: string;
    id?: string;
    label?: string;
    onBlur?: () => void;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    value?: string;
    wrapperClassName?: string;
  };
  type LabeledProps = { id?: string; label?: string; children?: React.ReactNode };
  return {
    Alert: ({ message, title }: { message?: string; title?: string }) =>
      React.createElement("div", null, title ? React.createElement("strong", null, title) : null, message),
    Badge: ({ children }: { children?: React.ReactNode }) => React.createElement("span", null, children),
    Button: ({
      children,
      className,
      disabled,
      onClick,
      type = "button",
      startIcon,
      variant,
      size,
      ...rest
    }: ButtonProps) => {
      void startIcon;
      void variant;
      void size;
      return React.createElement("button", { className, disabled, onClick, type, ...rest }, children);
    },
    DatePicker: ({ id, label }: LabeledProps) =>
      React.createElement("div", null, label ? React.createElement("label", { htmlFor: id }, label) : null),
    FormField: ({ id, label, children }: LabeledProps) =>
      React.createElement("div", null, label ? React.createElement("label", { htmlFor: id }, label) : null, children),
    Input: ({ error, hint, id, label, onBlur, onChange, placeholder, required, value, wrapperClassName }: InputProps) =>
      React.createElement(
        "div",
        { className: wrapperClassName },
        React.createElement("label", { htmlFor: id }, label),
        React.createElement("input", { id, onBlur, onChange, placeholder, required, value }),
        hint ? React.createElement("p", null, hint) : null,
        error ? React.createElement("p", null, error) : null
      ),
    Select: ({ id, label }: LabeledProps) =>
      React.createElement("div", null, label ? React.createElement("label", { htmlFor: id }, label) : null),
    Spinner: ({ text }: { text?: string }) => React.createElement("div", null, text ?? "Loading"),
    cn: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" "),
  };
});

import "@/i18n";
import BookingDetailsPage from "@/pages/booking-details/BookingDetailsPage";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import PaymentPage from "@/pages/payment/PaymentPage";
import RoomFilterPage from "@/pages/rooms/RoomFilterPage";

// Far in the future so the run stays valid for years, since the live preview controller validates
// the proposal against the real current date rather than an injectable clock.
const repeatedTimetableUrl = () => {
  const params = new URLSearchParams({
    frequency: "repeated",
    date: "2099-01-01",
    lastDate: "2099-02-05",
    weekday: "4",
    start: "09:00",
    end: "10:30",
    rooms: "gym-id,room-2",
  });
  return `/rooms?${params.toString()}`;
};

const confirmableDraft = (overrides: Partial<RecurringSeriesDraftDetail> = {}): RecurringSeriesDraftDetail => ({
  id: DRAFT_ID,
  title: null,
  ministryId: null,
  firstOccurrenceDate: "2099-01-01",
  lastOccurrenceDate: "2099-02-05",
  localStartTime: "09:00:00",
  localEndTime: "10:30:00",
  isMissionAligned: false,
  remark: null,
  surchargeCodes: [],
  excludedDates: [],
  rooms: [
    { facilityId: "gym-id", sequence: 0 },
    { facilityId: "room-2", sequence: 1 },
  ],
  conflicts: [],
  isConfirmable: true,
  invalidityCode: null,
  invalidityDetail: null,
  quotedAmount: "150.00",
  subtotalAmount: "150.00",
  discountPercent: "0",
  discountAmount: "0.00",
  surchargeAmount: "0.00",
  currency: "CAD",
  occurrenceCount: 6,
  pendingPaymentHoldHours: 48,
  paymentHoldExpiresAt: "2026-08-22T16:00:00.000Z",
  ...overrides,
});

const createdSeries = () => ({
  id: SERIES_ID,
  title: "Weekly choir",
  ministryId: null,
  ministryName: null,
  remark: null,
  bookerDisplayName: null,
  bookerEmail: null,
  firstOccurrenceDate: "2026-08-20",
  lastOccurrenceDate: "2026-09-24",
  localStartTime: "09:00:00",
  localEndTime: "10:30:00",
  status: "pending_payment",
  paymentHoldExpiresAt: "2026-08-22T16:00:00.000Z",
  quotedAmount: "150.00",
  currency: "CAD",
  occurrenceCount: 6,
  isPriority: false,
  isBooker: true,
  isViewOnly: false,
  timeline: [],
  actions: {
    canEditTitle: false,
    canCancel: false,
    canViewPaymentInstructions: true,
    canBookAgain: false,
    bookAgainDate: null,
  },
  occurrences: [],
});

// Half-hour cells covering the shared 09:00-10:30 window (matching repeatedTimetableUrl's start/end
// and confirmableDraft's localStartTime/localEndTime), so a room can be evaluated as eligible for
// the When seed highlight without needing a full 48-cell day.
const sharedWindowCells = () => [
  { start: "09:00", end: "09:30", state: "available" as const },
  { start: "09:30", end: "10:00", state: "available" as const },
  { start: "10:00", end: "10:30", state: "available" as const },
];
const sharedWindowTemplates = () => [{ start: "09:00", end: "10:30", slotDurationMinutes: 90 }];

const availabilityResponse = () => ({
  rooms: [
    {
      id: "gym-id",
      code: "gym",
      name: "Gym",
      capacity: 200,
      photoUrls: [],
      templates: sharedWindowTemplates(),
      cells: sharedWindowCells(),
    },
    {
      id: "room-2",
      code: "room-2",
      name: "Room 2",
      capacity: 20,
      photoUrls: [],
      templates: sharedWindowTemplates(),
      cells: sharedWindowCells(),
    },
    {
      id: "lobby-id",
      code: "lobby",
      name: "Lobby",
      capacity: 30,
      photoUrls: [],
      templates: sharedWindowTemplates(),
      cells: sharedWindowCells(),
    },
  ],
  maxBookingLines: 3,
});

const renderFlow = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RoomFilterPage />} path="/rooms" />
        <Route element={<BookingDetailsPage />} path="/booking-details/repeated/:draftId" />
        <Route element={<PaymentPage />} path="/payment/repeated/:seriesId" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </MemoryRouter>
  );
};

describe("Repeated Timetable cart to Booking Details", () => {
  let draft: RecurringSeriesDraftDetail;

  beforeEach(() => {
    draft = confirmableDraft();
    mockFacility.createBookingSeriesDraft.mockImplementation(async (payload) => {
      draft = { ...draft, title: payload.title ?? null, excludedDates: payload.excludedDates ?? [] };
      return { id: DRAFT_ID };
    });
    mockFacility.getBookingSeriesDraft.mockImplementation(async () => structuredClone(draft));
    mockFacility.updateBookingSeriesDraft.mockImplementation(async (_id: string, payload) => {
      draft = {
        ...draft,
        title: payload.title ?? draft.title,
        excludedDates: payload.excludedDates ?? draft.excludedDates,
      };
      return structuredClone(draft);
    });
    mockFacility.confirmBookingSeriesDraft.mockResolvedValue(createdSeries());
    mockFacility.getBookingSeries.mockResolvedValue(createdSeries());
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
    mockFacility.getRecurringBookingWindowStatus.mockResolvedValue({ isOpen: true, nextOpeningDate: null });
    mockFacility.previewBookingSeries.mockResolvedValue({ conflicts: [], quotedAmount: "150.00", currency: "CAD" });
    mockFacility.getAvailability.mockResolvedValue(availabilityResponse());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("gates Review & Confirm on a valid Title and a ready price preview, then creates the Series Draft", async () => {
    const user = userEvent.setup();
    renderFlow(repeatedTimetableUrl());

    expect(await screen.findByRole("button", { name: "Review & Confirm" })).toBeDisabled();

    await waitFor(
      () => {
        expect(mockFacility.previewBookingSeries).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
    await waitFor(() => {
      expect(screen.getByText(/150\.00/)).toBeTruthy();
    });
    expect(screen.getByText("2 rooms")).toBeTruthy();
    expect(screen.getByText("Estimated Total")).toBeTruthy();
    expect(screen.getByText("6 weekly occurrences")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review & Confirm" })).toBeDisabled();

    await user.type(screen.getByLabelText("Booking title"), "Weekly choir");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingSeriesDraft).toHaveBeenCalledTimes(1);
    expect(mockFacility.createBookingSeriesDraft).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Weekly choir" })
    );
    expect(screen.getByText("Weekly choir")).toBeTruthy();
  });

  it("updates the same Series Draft on a later Review & Confirm instead of creating another", async () => {
    const user = userEvent.setup();
    renderFlow(repeatedTimetableUrl());

    await waitFor(() => expect(mockFacility.previewBookingSeries).toHaveBeenCalled(), { timeout: 2000 });
    await user.type(screen.getByLabelText("Booking title"), "Weekly choir");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));
    await screen.findByRole("heading", { name: "Booking Details" });

    await user.click(screen.getByRole("button", { name: "Back to Timetable" }));

    expect(await screen.findByRole("form", { name: "Search details" })).toBeTruthy();
    expect(await screen.findByLabelText("Booking title")).toHaveValue("Weekly choir");

    // Regression: returning to Timetable must show only the cart's own rooms, not a When seed
    // highlight on every other room eligible for the same shared time (Lobby here).
    await waitFor(() => expect(screen.getAllByText("Available").length).toBe(2), { timeout: 2000 });

    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled(), {
      timeout: 2000,
    });

    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingSeriesDraft).toHaveBeenCalledTimes(1);
    expect(mockFacility.updateBookingSeriesDraft).toHaveBeenCalledWith(
      DRAFT_ID,
      expect.objectContaining({ title: "Weekly choir" })
    );
  });

  it("confirms an existing Series Draft to Repeated Payment", async () => {
    draft = confirmableDraft({ title: "Weekly choir" });
    const user = userEvent.setup();
    renderFlow(`/booking-details/repeated/${DRAFT_ID}`);

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(screen.getByText("Weekly choir")).toBeTruthy();
    expect(await screen.findByText("Gym")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByRole("heading", { name: "Payment" })).toBeTruthy();
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenCalledWith(DRAFT_ID);
    expect(await screen.findByText(/150\.00/)).toBeTruthy();
    expect(screen.getByText("Hold deadline")).toBeTruthy();
    expect(mockFacility.getBookingSeries).toHaveBeenCalledWith(SERIES_ID);
  });

  it("does not show the stale proposal warning for a conflict-free Draft that only needs a Title", async () => {
    draft = confirmableDraft({
      title: null,
      isConfirmable: false,
      invalidityCode: "FACILITY_BOOKING_TITLE_INVALID",
    });
    renderFlow(`/booking-details/repeated/${DRAFT_ID}`);

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(
      screen.queryByText(
        "This Repeated proposal is no longer valid. Return to the Timetable to revise it and preview again."
      )
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("disables Confirm for a stale Draft and sends the member back to Timetable", async () => {
    const user = userEvent.setup();
    draft = confirmableDraft({
      title: "Weekly choir",
      isConfirmable: false,
      invalidityCode: "FACILITY_BOOKING_SCHEDULING_CONFLICT",
    });
    renderFlow(`/booking-details/repeated/${DRAFT_ID}`);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "This Repeated proposal is no longer valid. Return to the Timetable to revise it and preview again."
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Back to Timetable" }));
    expect(await screen.findByRole("form", { name: "Search details" })).toBeTruthy();
  });

  it("shows the server's effective Recurring Discount label instead of a hardcoded Ministry label", async () => {
    draft = confirmableDraft({ title: "Weekly choir" });
    mockFacility.getDiscountEligibility.mockResolvedValue({
      discountCode: "recurring_weekly_monthly",
      discountPercent: 20,
    });
    renderFlow(`/booking-details/repeated/${DRAFT_ID}`);

    await waitFor(() => {
      expect(mockFacility.getDiscountEligibility).toHaveBeenCalledWith({
        bookingType: "recurring",
        ministryId: null,
      });
    });
    expect(await screen.findByText("Recurring discount")).toBeTruthy();
  });

  it("shows Not Found for a missing Recurring Series Draft", async () => {
    mockFacility.getBookingSeriesDraft.mockRejectedValue(new BookingSeriesDraftNotFoundError());
    renderFlow(`/booking-details/repeated/${DRAFT_ID}`);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeTruthy();
  });
});
