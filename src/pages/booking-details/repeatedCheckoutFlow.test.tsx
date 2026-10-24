import type { RecurringSeriesDraftDetail } from "@/api/services/facilityService";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DRAFT_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const SERIES_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const { mockFacility, BookingSeriesDraftNotFoundError, BookingSeriesDraftNotConfirmableError } = vi.hoisted(() => {
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

  class BookingSeriesDraftNotConfirmableError extends Error {
    constructor() {
      super("Booking series draft is not confirmable");
      this.name = "BookingSeriesDraftNotConfirmableError";
    }
  }

  return {
    BookingSeriesDraftNotFoundError,
    BookingSeriesDraftNotConfirmableError,
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
  BookingSeriesDraftNotConfirmableError,
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
    Modal: ({
      isOpen,
      title,
      children,
      footer,
      onClose,
    }: {
      isOpen: boolean;
      title?: string;
      children?: React.ReactNode;
      footer?: React.ReactNode;
      onClose?: () => void;
    }) =>
      isOpen
        ? React.createElement(
            "div",
            { role: "dialog", "aria-label": title },
            title ? React.createElement("h2", null, title) : null,
            children,
            footer,
            onClose ? React.createElement("button", { onClick: onClose, type: "button" }, "Close dialog") : null
          )
        : null,
    Spinner: ({ text }: { text?: string }) => React.createElement("div", null, text ?? "Loading"),
    TimePicker: ({ id, label, value }: LabeledProps & { value?: { format: (pattern: string) => string } | null }) =>
      React.createElement(
        "div",
        null,
        React.createElement("label", { htmlFor: id }, label),
        React.createElement("input", { id, readOnly: true, value: value ? value.format("HH:mm") : "" })
      ),
    cn: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" "),
  };
});

import ministryService from "@/api/services/ministryService";
import { change_app_language } from "@/i18n";
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
  overrideImpacts: [],
  overrideReviewToken: null,
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
  pendingPaymentHoldDays: 3,
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
      draft = {
        ...draft,
        title: payload.title ?? null,
        ministryId: payload.ministryId ?? null,
        excludedDates: payload.excludedDates ?? [],
      };
      return { id: DRAFT_ID };
    });
    mockFacility.getBookingSeriesDraft.mockImplementation(async () => structuredClone(draft));
    mockFacility.updateBookingSeriesDraft.mockImplementation(async (_id: string, payload) => {
      draft = {
        ...draft,
        title: payload.title ?? draft.title,
        ministryId: payload.ministryId !== undefined ? payload.ministryId : draft.ministryId,
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
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenCalledWith(DRAFT_ID, null);
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

  it("applies a Ministry from the Cart and updates the same Series Draft on return", async () => {
    const user = userEvent.setup();
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    renderFlow(repeatedTimetableUrl());

    expect(await screen.findByText("Personal booking")).toBeTruthy();
    expect(screen.queryByLabelText("Ministry")).toBeNull();

    await waitFor(() => expect(mockFacility.previewBookingSeries).toHaveBeenCalled(), { timeout: 2000 });
    mockFacility.previewBookingSeries.mockClear();

    await user.click(screen.getByRole("button", { name: "Switch to a ministry booking" }));
    await user.click(screen.getByRole("button", { name: "Youth Ministry" }));

    await waitFor(() => {
      expect(mockFacility.getAvailability).toHaveBeenCalledWith("2099-01-01", "ministry-1");
    });
    await waitFor(
      () => {
        expect(mockFacility.previewBookingSeries).toHaveBeenCalledWith(
          expect.objectContaining({ ministryId: "ministry-1" })
        );
      },
      { timeout: 2000 }
    );
    expect(await screen.findByText("Ministry: Youth Ministry")).toBeTruthy();
    expect(screen.getAllByText("Gym").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Room 2").length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Booking title"), "Weekly choir");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled(), {
      timeout: 2000,
    });
    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingSeriesDraft).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Weekly choir", ministryId: "ministry-1" })
    );

    await user.click(screen.getByRole("button", { name: "Back to Timetable" }));
    expect(await screen.findByText("Ministry: Youth Ministry")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Change ministry" }));
    // Only one ministry — chooser still opens; applying same ministry is fine. Switch to personal then back
    // isn't needed; change ministry with one option re-applies it.
    await user.click(screen.getByRole("button", { name: "Youth Ministry" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled(), {
      timeout: 2000,
    });
    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingSeriesDraft).toHaveBeenCalledTimes(1);
    expect(mockFacility.updateBookingSeriesDraft).toHaveBeenCalledWith(
      DRAFT_ID,
      expect.objectContaining({ ministryId: "ministry-1" })
    );
  });

  it("keeps a protected First occurrence contact-only and out of the Cart", async () => {
    const user = userEvent.setup();
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [
        {
          id: "hall-id",
          code: "hall",
          name: "Hall",
          capacity: 40,
          photoUrls: [],
          templates: sharedWindowTemplates(),
          cells: sharedWindowCells().map((cell) => ({ ...cell, state: "unavailable" as const })),
          events: [
            {
              start: "09:00",
              end: "10:30",
              occupancyKind: "ministry" as const,
              isOverridable: false,
              ministryName: "Choir",
              contactDisplayName: "Ada Steward",
              contactEmail: "ada@efcnewlife.org",
            },
          ],
        },
        {
          id: "chapel-id",
          code: "chapel",
          name: "Chapel",
          capacity: 20,
          photoUrls: [],
          templates: sharedWindowTemplates(),
          cells: sharedWindowCells().map((cell) => ({ ...cell, state: "override" as const })),
          events: [
            {
              start: "09:00",
              end: "10:30",
              occupancyKind: "rental" as const,
              isOverridable: true,
              ministryName: null,
              contactDisplayName: "Cara Renter",
              contactEmail: "cara@example.com",
            },
          ],
        },
      ],
      maxBookingLines: 3,
    });

    const params = new URLSearchParams({
      frequency: "repeated",
      date: "2099-01-01",
      lastDate: "2099-02-05",
      weekday: "4",
      start: "09:00",
      end: "10:30",
      ministryId: "ministry-1",
    });
    renderFlow(`/rooms?${params.toString()}`);

    expect(await screen.findByText("Hall")).toBeTruthy();
    expect(screen.getByText("Chapel")).toBeTruthy();
    expect(screen.getByText("Conflict")).toBeTruthy();
    expect(screen.getByText("Override")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Available rooms" })).toBeNull();

    const contact = screen.getByRole("button", { name: /View contact for Hall/ });
    expect(screen.queryByRole("button", { name: /View contact for Chapel/ })).toBeNull();
    await user.click(contact);
    const dialog = await screen.findByRole("dialog", { name: "Conflict" });
    expect(within(dialog).getByText("Ada Steward")).toBeTruthy();
    expect(within(dialog).queryByText(/skip the date/i)).toBeNull();
    await user.click(within(dialog).getByRole("button", { name: /^Close$/ }));
    expect(screen.queryByRole("heading", { name: "Confirm Booking Time" })).toBeNull();
    expect(screen.queryByRole("button", { name: "ADD" })).toBeNull();
  });
});

const priorityMinistry = () => ({
  id: "ministry-1",
  name: "Youth Ministry",
  status: "active",
  isActive: true,
  hasPriorityBooking: true,
});

const chapelOverrideRoom = () => ({
  id: "chapel-id",
  code: "chapel",
  name: "Chapel",
  capacity: 20,
  photoUrls: [],
  templates: sharedWindowTemplates(),
  cells: sharedWindowCells().map((cell) => ({ ...cell, state: "override" as const })),
  events: [
    {
      start: "09:00",
      end: "10:30",
      occupancyKind: "rental" as const,
      isOverridable: true,
      ministryName: null,
      contactDisplayName: null,
      contactEmail: null,
    },
  ],
});

const repeatedSearch = (overrides: Record<string, string> = {}) => {
  const params = new URLSearchParams({
    frequency: "repeated",
    date: "2099-01-01",
    lastDate: "2099-02-05",
    weekday: "4",
    start: "09:00",
    end: "10:30",
    ...overrides,
  });
  return `/rooms?${params.toString()}`;
};

const expectNoSeriesMutation = () => {
  expect(mockFacility.createBookingSeriesDraft).not.toHaveBeenCalled();
  expect(mockFacility.updateBookingSeriesDraft).not.toHaveBeenCalled();
  expect(mockFacility.confirmBookingSeriesDraft).not.toHaveBeenCalled();
};

describe("Repeated First occurrence Override selection", () => {
  beforeEach(() => {
    vi.mocked(ministryService.listMine).mockResolvedValue({ items: [priorityMinistry()] });
    mockFacility.getAvailability.mockResolvedValue({ rooms: [chapelOverrideRoom()], maxBookingLines: 3 });
    mockFacility.getRecurringBookingWindowStatus.mockResolvedValue({ isOpen: true, nextOpeningDate: null });
    mockFacility.previewBookingSeries.mockResolvedValue({ conflicts: [], quotedAmount: "150.00", currency: "CAD" });
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const proposeChapelOverride = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(await screen.findByRole("button", { name: "Select Chapel, 9:00 am" }));
    await user.click(await screen.findByRole("button", { name: "ADD" }));
    const timeDialog = await screen.findByRole("dialog", { name: "Confirm Booking Time" });
    await user.click(within(timeDialog).getByRole("button", { name: "Confirm" }));
    return screen.findByRole("dialog", { name: "Replace an existing booking?" });
  };

  it("asks for the early acknowledgement before the First occurrence enters the Cart, and cancel changes nothing", async () => {
    const user = userEvent.setup();
    renderFlow(repeatedSearch({ ministryId: "ministry-1" }));

    const popup = await proposeChapelOverride(user);
    expect(within(popup).getByText("Chapel")).toBeTruthy();
    expect(within(popup).getByText("Thursday, January 1, 2099")).toBeTruthy();
    expect(within(popup).getByText(/9:00 am – 10:30 am/)).toBeTruthy();
    expect(within(popup).queryByText(/notif/i)).toBeNull();
    expect(within(popup).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(within(popup).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("1 room")).toBeNull();
    expectNoSeriesMutation();
  });

  it("adds the accepted Override room under the shared time without creating or notifying anything", async () => {
    const user = userEvent.setup();
    renderFlow(repeatedSearch({ ministryId: "ministry-1" }));

    const popup = await proposeChapelOverride(user);
    await user.click(within(popup).getByRole("button", { name: "Add to cart" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("1 room")).toBeTruthy();
    await waitFor(
      () =>
        expect(mockFacility.previewBookingSeries).toHaveBeenCalledWith(
          expect.objectContaining({
            ministryId: "ministry-1",
            rooms: [expect.objectContaining({ facilityId: "chapel-id" })],
          })
        ),
      { timeout: 2000 }
    );
    expectNoSeriesMutation();
  });

  it("keeps Override time unselectable on a Personal First occurrence", async () => {
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [
        {
          ...chapelOverrideRoom(),
          templates: [{ start: "09:00", end: "12:00", slotDurationMinutes: 90 }],
          cells: [
            ...chapelOverrideRoom().cells,
            { start: "10:30", end: "11:00", state: "available" as const },
            { start: "11:00", end: "11:30", state: "available" as const },
            { start: "11:30", end: "12:00", state: "available" as const },
          ],
          events: [],
        },
      ],
      maxBookingLines: 3,
    });
    // No time seed: a Personal seed would hide rooms that cannot cover it.
    renderFlow(repeatedSearch({ start: "", end: "" }));

    expect(await screen.findByRole("button", { name: "Select Chapel, 10:30 am" })).not.toBeDisabled();

    expect(await screen.findByRole("button", { name: "Select Chapel, 9:00 am" })).toBeDisabled();
  });

  it("keeps a retained Override room visible but blocks Review once the Cart switches to Personal", async () => {
    const user = userEvent.setup();
    mockFacility.getAvailability.mockImplementation(async (_date: string, ministryId?: string) => ({
      rooms: [
        ministryId
          ? chapelOverrideRoom()
          : {
              ...chapelOverrideRoom(),
              cells: sharedWindowCells().map((cell) => ({ ...cell, state: "unavailable" as const })),
              events: [],
            },
      ],
      maxBookingLines: 3,
    }));
    renderFlow(repeatedSearch({ ministryId: "ministry-1", rooms: "chapel-id" }));

    await user.type(await screen.findByLabelText("Booking title"), "Weekly choir");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled(), {
      timeout: 2000,
    });

    await user.click(screen.getByRole("button", { name: "Switch to a personal booking" }));

    expect(await screen.findByText("This selection is no longer available. Edit or remove it.")).toBeTruthy();
    expect(screen.getAllByText("Chapel").length).toBeGreaterThan(0);
    await waitFor(
      () =>
        expect(mockFacility.previewBookingSeries).toHaveBeenCalledWith(expect.objectContaining({ ministryId: null })),
      { timeout: 2000 }
    );
    expect(screen.getByRole("button", { name: "Review & Confirm" })).toBeDisabled();
  });
});

const seriesReviewError = (errorCode: string) => ({
  code: 409,
  message: "Conflict",
  details: { error_code: errorCode },
});

const laterConflict = (overrides: Partial<RecurringSeriesDraftDetail["conflicts"][number]> = {}) => ({
  occurrenceDate: "2099-01-15",
  kind: "occupancy" as const,
  facilityIds: ["gym-id"],
  isOverridable: false,
  ministryId: null,
  ministryStewardDisplayName: null,
  ministryStewardEmail: null,
  bookerDisplayName: null,
  bookerEmail: null,
  ...overrides,
});

const ministryConflictsDraft = () =>
  confirmableDraft({
    title: "Weekly choir",
    ministryId: "ministry-1",
    isConfirmable: false,
    invalidityCode: "FACILITY_BOOKING_SCHEDULING_CONFLICT",
    conflicts: [
      laterConflict({
        kind: "ministry",
        ministryId: "ministry-2",
        ministryStewardDisplayName: "Ada Steward",
        ministryStewardEmail: "ada@efcnewlife.org",
      }),
      laterConflict({
        occurrenceDate: "2099-01-22",
        facilityIds: ["room-2"],
        bookerDisplayName: "Ben Booker",
        bookerEmail: "ben@example.com",
      }),
    ],
  });

const seriesImpact = (overrides: Record<string, unknown> = {}) => ({
  bookingId: "rental-1",
  isSeriesOccurrence: true,
  startAt: "2099-01-08T09:00:00-05:00",
  endAt: "2099-01-08T12:00:00-05:00",
  releasedIntervals: [
    { facilityId: "gym-id", startAt: "2099-01-08T09:00:00-05:00", endAt: "2099-01-08T10:30:00-05:00" },
    { facilityId: "lobby-id", startAt: "2099-01-08T11:00:00-05:00", endAt: "2099-01-08T12:00:00-05:00" },
  ],
  ...overrides,
});

const reviewedOverrideSeriesDraft = (overrides: Partial<RecurringSeriesDraftDetail> = {}) =>
  confirmableDraft({
    title: "Weekly choir",
    ministryId: "ministry-1",
    conflicts: [laterConflict({ occurrenceDate: "2099-01-08", isOverridable: true })],
    overrideImpacts: [seriesImpact()],
    overrideReviewToken: "series-review-1",
    ...overrides,
  });

describe("Repeated Booking Details conflicts and reviewed Override confirmation", () => {
  let draft: RecurringSeriesDraftDetail;
  const detailsUrl = `/booking-details/repeated/${DRAFT_ID}`;
  const confirmButton = () => screen.getByRole("button", { name: "Confirm" });

  beforeEach(() => {
    vi.mocked(ministryService.listMine).mockResolvedValue({ items: [priorityMinistry()] });
    draft = ministryConflictsDraft();
    mockFacility.getBookingSeriesDraft.mockImplementation(async () => structuredClone(draft));
    mockFacility.updateBookingSeriesDraft.mockImplementation(async (_id: string, payload) => {
      const excluded = new Set<string>(payload.excludedDates ?? []);
      const blocking = draft.conflicts.filter((item) => !item.isOverridable).map((item) => item.occurrenceDate);
      draft = {
        ...draft,
        excludedDates: payload.excludedDates ?? [],
        isConfirmable: blocking.every((date) => excluded.has(date)),
      };
      return structuredClone(draft);
    });
    mockFacility.getAvailability.mockResolvedValue(availabilityResponse());
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
    mockFacility.getBookingSeries.mockResolvedValue(createdSeries());
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    await change_app_language("en");
  });

  it("lists later conflicts and opens the selected Conflict popup with only the authorized contact", async () => {
    const user = userEvent.setup();
    renderFlow(detailsUrl);

    const list = await screen.findByRole("region", { name: "Conflicting dates" });
    expect(within(list).getByText("January 15, 2099")).toBeTruthy();
    expect(within(list).getByText("January 22, 2099")).toBeTruthy();
    expect(confirmButton()).toBeDisabled();

    const viewJan15 = within(list).getByRole("button", { name: "View conflict for January 15, 2099" });
    await user.click(viewJan15);
    const popup = await screen.findByRole("dialog", { name: "Conflict" });
    expect(within(popup).getByText("January 15, 2099")).toBeTruthy();
    expect(await within(popup).findByText("Gym")).toBeTruthy();
    expect(within(popup).getByText("Ministry booking")).toBeTruthy();
    expect(within(popup).getByText("Ada Steward")).toBeTruthy();
    expect(within(popup).getByRole("link", { name: "ada@efcnewlife.org" })).toBeTruthy();
    expect(within(popup).queryByText("Ben Booker")).toBeNull();
    expect(within(popup).getByRole("button", { name: "Close" })).toHaveFocus();

    await user.click(within(popup).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(viewJan15).toHaveFocus();

    await user.click(within(list).getByRole("button", { name: "View conflict for January 22, 2099" }));
    const rentalPopup = await screen.findByRole("dialog", { name: "Conflict" });
    expect(within(rentalPopup).getByText("Room 2")).toBeTruthy();
    expect(within(rentalPopup).getByText("Unavailable")).toBeTruthy();
    expect(within(rentalPopup).getByText("Ben Booker")).toBeTruthy();
    expect(within(rentalPopup).queryByText("Ada Steward")).toBeNull();
    expect(mockFacility.updateBookingSeriesDraft).not.toHaveBeenCalled();
  });

  it("persists Skip the date on the same Series Draft and enables Confirm only once every blocking date is skipped", async () => {
    const user = userEvent.setup();
    mockFacility.confirmBookingSeriesDraft.mockResolvedValue(createdSeries());
    renderFlow(detailsUrl);

    const list = await screen.findByRole("region", { name: "Conflicting dates" });
    await user.click(within(list).getByRole("button", { name: "View conflict for January 15, 2099" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Conflict" })).getByRole("button", {
        name: "Skip the date",
      })
    );

    await waitFor(() =>
      expect(mockFacility.updateBookingSeriesDraft).toHaveBeenLastCalledWith(
        DRAFT_ID,
        expect.objectContaining({ excludedDates: ["2099-01-15"], ministryId: "ministry-1", title: "Weekly choir" })
      )
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await within(list).findByText("Skipped")).toBeTruthy();
    expect(confirmButton()).toBeDisabled();

    await user.click(within(list).getByRole("button", { name: "View conflict for January 22, 2099" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Conflict" })).getByRole("button", {
        name: "Skip the date",
      })
    );
    await waitFor(() =>
      expect(mockFacility.updateBookingSeriesDraft).toHaveBeenLastCalledWith(
        DRAFT_ID,
        expect.objectContaining({ excludedDates: ["2099-01-15", "2099-01-22"] })
      )
    );
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());

    await user.click(confirmButton());
    expect(await screen.findByRole("heading", { name: "Payment" })).toBeTruthy();
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenCalledWith(DRAFT_ID, null);
    expect(mockFacility.createBookingSeriesDraft).not.toHaveBeenCalled();
  });

  it("can include a skipped date again from its Conflict popup", async () => {
    const user = userEvent.setup();
    draft = { ...ministryConflictsDraft(), excludedDates: ["2099-01-15"] };
    renderFlow(detailsUrl);

    const list = await screen.findByRole("region", { name: "Conflicting dates" });
    await user.click(within(list).getByRole("button", { name: "View conflict for January 15, 2099" }));
    await user.click(
      within(await screen.findByRole("dialog", { name: "Conflict" })).getByRole("button", {
        name: "Include the date",
      })
    );

    await waitFor(() =>
      expect(mockFacility.updateBookingSeriesDraft).toHaveBeenLastCalledWith(
        DRAFT_ID,
        expect.objectContaining({ excludedDates: [] })
      )
    );
  });

  it("names Closed, opening-hours, and weekly-limit conflicts and keeps Include the date usable after a skip", async () => {
    const user = userEvent.setup();
    draft = confirmableDraft({
      title: "Weekly choir",
      isConfirmable: false,
      invalidityCode: "FACILITY_RECURRING_MIN_OCCURRENCES",
      excludedDates: ["2099-01-15"],
      conflicts: [
        laterConflict({ kind: "blackout" }),
        laterConflict({ kind: "opening_hours", facilityIds: ["room-2"] }),
        laterConflict({ occurrenceDate: "2099-01-22", kind: "weekly_quota", facilityIds: [] }),
      ],
    });
    renderFlow(detailsUrl);

    const list = await screen.findByRole("region", { name: "Conflicting dates" });
    await user.click(within(list).getByRole("button", { name: "View conflict for January 15, 2099" }));
    const popup = await screen.findByRole("dialog", { name: "Conflict" });
    expect(within(popup).getByText("Closed")).toBeTruthy();
    expect(within(popup).getByText("Outside opening hours")).toBeTruthy();
    await user.click(within(popup).getByRole("button", { name: "Include the date" }));
    await waitFor(() =>
      expect(mockFacility.updateBookingSeriesDraft).toHaveBeenLastCalledWith(
        DRAFT_ID,
        expect.objectContaining({ excludedDates: [] })
      )
    );

    await user.click(within(list).getByRole("button", { name: "View conflict for January 22, 2099" }));
    expect(
      within(await screen.findByRole("dialog", { name: "Conflict" })).getByText("Weekly limit reached")
    ).toBeTruthy();
  });

  it("shows a Personal later conflict as generic occupancy with no Ministry or contact", async () => {
    const user = userEvent.setup();
    vi.mocked(ministryService.listMine).mockResolvedValue({ items: [] });
    draft = confirmableDraft({
      title: "Weekly choir",
      isConfirmable: false,
      conflicts: [laterConflict()],
    });
    renderFlow(detailsUrl);

    const list = await screen.findByRole("region", { name: "Conflicting dates" });
    await user.click(within(list).getByRole("button", { name: "View conflict for January 15, 2099" }));
    const popup = await screen.findByRole("dialog", { name: "Conflict" });
    expect(within(popup).getByText("Unavailable")).toBeTruthy();
    expect(within(popup).queryByText("Ministry booking")).toBeNull();
    expect(within(popup).queryByRole("link")).toBeNull();
    expect(within(popup).queryByText(/steward/i)).toBeNull();
    expect(within(popup).getByRole("button", { name: "Skip the date" })).toBeTruthy();
  });

  it("lists every room interval of each displaced occurrence and submits the token only from Confirm and notify", async () => {
    const user = userEvent.setup();
    draft = reviewedOverrideSeriesDraft();
    mockFacility.confirmBookingSeriesDraft.mockResolvedValue(createdSeries());
    renderFlow(detailsUrl);

    const impacts = await screen.findByRole("region", { name: "Bookings this will replace" });
    expect(within(impacts).getByText("Existing repeated booking 1 (this occurrence only)")).toBeTruthy();
    expect(await within(impacts).findByText("Lobby")).toBeTruthy();
    expect(within(impacts).getByText(/Jan 8, 2099 · 11:00 am – 12:00 pm/)).toBeTruthy();
    expect(within(impacts).getByText(/Jan 8, 2099 · 9:00 am – 10:30 am/)).toBeTruthy();

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    await user.click(confirmButton());
    const finalPopup = await screen.findByRole("dialog", { name: "Confirm and notify" });
    expect(within(finalPopup).getByText("Lobby")).toBeTruthy();
    expect(within(finalPopup).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(within(finalPopup).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockFacility.confirmBookingSeriesDraft).not.toHaveBeenCalled();

    await user.click(confirmButton());
    await user.click(
      within(await screen.findByRole("dialog", { name: "Confirm and notify" })).getByRole("button", {
        name: "Confirm and notify",
      })
    );
    expect(await screen.findByRole("heading", { name: "Payment" })).toBeTruthy();
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenCalledTimes(1);
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenCalledWith(DRAFT_ID, "series-review-1");
  });

  it("refreshes impacts after a stale review and requires a renewed final acknowledgement", async () => {
    const user = userEvent.setup();
    draft = reviewedOverrideSeriesDraft();
    mockFacility.confirmBookingSeriesDraft
      .mockImplementationOnce(async () => {
        draft = reviewedOverrideSeriesDraft({
          overrideImpacts: [
            seriesImpact(),
            seriesImpact({
              bookingId: "rental-2",
              isSeriesOccurrence: false,
              startAt: "2099-01-29T09:00:00-05:00",
              endAt: "2099-01-29T10:30:00-05:00",
              releasedIntervals: [
                { facilityId: "room-2", startAt: "2099-01-29T09:00:00-05:00", endAt: "2099-01-29T10:30:00-05:00" },
              ],
            }),
          ],
          overrideReviewToken: "series-review-2",
        });
        throw seriesReviewError("FACILITY_BOOKING_OVERRIDE_REVIEW_STALE");
      })
      .mockResolvedValueOnce(createdSeries());
    renderFlow(detailsUrl);

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    await user.click(confirmButton());
    await user.click(
      within(await screen.findByRole("dialog", { name: "Confirm and notify" })).getByRole("button", {
        name: "Confirm and notify",
      })
    );

    expect(
      await screen.findByText("The bookings this will replace have changed. Review the updated list and confirm again.")
    ).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Confirm and notify" })).toBeNull();
    const impacts = await screen.findByRole("region", { name: "Bookings this will replace" });
    expect(within(impacts).getByText("Existing booking 2")).toBeTruthy();
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    await user.click(confirmButton());
    await user.click(
      within(await screen.findByRole("dialog", { name: "Confirm and notify" })).getByRole("button", {
        name: "Confirm and notify",
      })
    );
    expect(await screen.findByRole("heading", { name: "Payment" })).toBeTruthy();
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenLastCalledWith(DRAFT_ID, "series-review-2");
  });

  it("blocks confirmation and offers the established exclusion when a new Ministry booking appears at submission", async () => {
    const user = userEvent.setup();
    draft = reviewedOverrideSeriesDraft();
    mockFacility.confirmBookingSeriesDraft.mockImplementationOnce(async () => {
      draft = reviewedOverrideSeriesDraft({
        isConfirmable: false,
        overrideImpacts: [],
        overrideReviewToken: null,
        conflicts: [
          laterConflict({ occurrenceDate: "2099-01-08", isOverridable: true }),
          laterConflict({
            occurrenceDate: "2099-01-29",
            kind: "ministry",
            ministryId: "ministry-2",
            ministryStewardDisplayName: "Ada Steward",
            ministryStewardEmail: "ada@efcnewlife.org",
          }),
        ],
      });
      throw new BookingSeriesDraftNotConfirmableError();
    });
    renderFlow(detailsUrl);

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    await user.click(confirmButton());
    await user.click(
      within(await screen.findByRole("dialog", { name: "Confirm and notify" })).getByRole("button", {
        name: "Confirm and notify",
      })
    );

    expect(
      await screen.findByText(
        "This time now conflicts with another booking. Review the conflicts and change your request."
      )
    ).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Confirm and notify" })).toBeNull();
    expect(confirmButton()).toBeDisabled();
    const list = screen.getByRole("region", { name: "Conflicting dates" });
    await user.click(within(list).getByRole("button", { name: "View conflict for January 29, 2099" }));
    const popup = await screen.findByRole("dialog", { name: "Conflict" });
    expect(within(popup).getByText("Ada Steward")).toBeTruthy();
    expect(within(popup).getByRole("button", { name: "Skip the date" })).toBeTruthy();
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "Payment" })).toBeNull();
  });

  it("uses the Conflict review copy in Traditional and Simplified Chinese", async () => {
    const user = userEvent.setup();
    renderFlow(detailsUrl);
    await screen.findByRole("region", { name: "Conflicting dates" });

    await change_app_language("zh-TW");
    const twList = await screen.findByRole("region", { name: "衝突日期" });
    await user.click(within(twList).getAllByRole("button", { name: /查看衝突/ })[0]);
    const twPopup = await screen.findByRole("dialog", { name: "衝突" });
    expect(within(twPopup).getByRole("button", { name: "略過此日期" })).toBeTruthy();
    await user.keyboard("{Escape}");

    await change_app_language("zh-CN");
    const cnList = await screen.findByRole("region", { name: "冲突日期" });
    await user.click(within(cnList).getAllByRole("button", { name: /查看冲突/ })[0]);
    const cnPopup = await screen.findByRole("dialog", { name: "冲突" });
    expect(within(cnPopup).getByRole("button", { name: "跳过此日期" })).toBeTruthy();
    expect(mockFacility.updateBookingSeriesDraft).not.toHaveBeenCalled();
  });
});
