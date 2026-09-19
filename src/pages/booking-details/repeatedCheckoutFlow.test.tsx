import type { CreateRecurringSeriesDraftPayload, RecurringSeriesDraftDetail } from "@/api/services/facilityService";
import { repeatedBookingDetailsPath } from "@/utils/bookingDetailsPath";
import { buildCreateRecurringSeriesDraftPayload } from "@/utils/recurringBookingSeries";
import type { StartBookingAnswers } from "@/utils/startBookingFlow";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
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
  return {
    Alert: ({ message, title }: { message?: string; title?: string }) =>
      React.createElement("div", null, title ? React.createElement("strong", null, title) : null, message),
    Button: ({ children, className, disabled, onClick, type = "button" }: ButtonProps) =>
      React.createElement("button", { className, disabled, onClick, type }, children),
    Input: ({ error, hint, id, label, onBlur, onChange, placeholder, required, value, wrapperClassName }: InputProps) =>
      React.createElement(
        "div",
        { className: wrapperClassName },
        React.createElement("label", { htmlFor: id }, label),
        React.createElement("input", { id, onBlur, onChange, placeholder, required, value }),
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
import PaymentPage from "@/pages/payment/PaymentPage";

const answers: StartBookingAnswers = {
  isMinistryBooking: false,
  ministryId: null,
  frequency: "repeated",
  when: { date: null, start: null, end: null },
  recurringWhen: {
    weekday: 4,
    firstOccurrenceDate: "2026-08-20",
    lastOccurrenceDate: "2026-09-24",
    startTime: "09:00",
    endTime: "10:30",
    roomIds: ["gym-id", "room-2"],
  },
};

const confirmableDraft = (overrides: Partial<RecurringSeriesDraftDetail> = {}): RecurringSeriesDraftDetail => ({
  id: DRAFT_ID,
  title: null,
  ministryId: null,
  firstOccurrenceDate: "2026-08-20",
  lastOccurrenceDate: "2026-09-24",
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

const PreviewReadyTimetable = () => {
  const navigate = useNavigate();
  return (
    <main>
      <h1>Timetable</h1>
      <button
        onClick={() => {
          void (async () => {
            const payload = buildCreateRecurringSeriesDraftPayload(answers, new Date("2026-08-13T12:00:00"));
            if (!payload) {
              return;
            }
            const created = await mockFacility.createBookingSeriesDraft(payload);
            navigate(repeatedBookingDetailsPath(created.id));
          })();
        }}
        type="button"
      >
        Review Booking
      </button>
    </main>
  );
};

const renderFlow = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<PreviewReadyTimetable />} path="/rooms" />
        <Route element={<BookingDetailsPage />} path="/booking-details/repeated/:draftId" />
        <Route element={<PaymentPage />} path="/payment/repeated/:seriesId" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </MemoryRouter>
  );
};

describe("Repeated Review-to-Payment", () => {
  let draft: RecurringSeriesDraftDetail;

  beforeEach(() => {
    draft = confirmableDraft();
    mockFacility.createBookingSeriesDraft.mockResolvedValue({ id: DRAFT_ID });
    mockFacility.getBookingSeriesDraft.mockImplementation(async () => structuredClone(draft));
    mockFacility.updateBookingSeriesDraft.mockImplementation(
      async (_id: string, payload: CreateRecurringSeriesDraftPayload) => {
        draft = {
          ...draft,
          title: payload.title ?? draft.title,
          excludedDates: payload.excludedDates ?? draft.excludedDates,
        };
        return structuredClone(draft);
      }
    );
    mockFacility.confirmBookingSeriesDraft.mockResolvedValue(createdSeries());
    mockFacility.getBookingSeries.mockResolvedValue(createdSeries());
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [
        {
          id: "gym-id",
          code: "gym",
          name: "Gym",
          capacity: 200,
          photoUrls: [],
          templates: [],
          cells: [],
        },
        {
          id: "room-2",
          code: "room-2",
          name: "Room 2",
          capacity: 20,
          photoUrls: [],
          templates: [],
          cells: [],
        },
      ],
      maxBookingLines: 3,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates a Recurring Series Draft from Review Booking and confirms it to Repeated Payment", async () => {
    const user = userEvent.setup();
    renderFlow("/rooms");

    await user.click(screen.getByRole("button", { name: "Review Booking" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingSeriesDraft).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Repeated booking")).toBeTruthy();
    expect(await screen.findByText("Gym")).toBeTruthy();
    expect(
      screen.getByText("This preview does not reserve any rooms. The series is created only after you confirm.")
    ).toBeTruthy();
    expect(screen.getAllByText(/150\.00/).length).toBeGreaterThan(0);

    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText("Booking title"), "Weekly choir");
    await user.tab();

    await waitFor(() => {
      expect(mockFacility.updateBookingSeriesDraft).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Confirm" })).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByRole("heading", { name: "Payment" })).toBeTruthy();
    expect(mockFacility.confirmBookingSeriesDraft).toHaveBeenCalledWith(DRAFT_ID);
    expect(await screen.findByText(/150\.00/)).toBeTruthy();
    expect(screen.getByText("Hold deadline")).toBeTruthy();
    expect(mockFacility.getBookingSeries).toHaveBeenCalledWith(SERIES_ID);
  });

  it("keeps the Title after a Booking Details refresh", async () => {
    const user = userEvent.setup();
    renderFlow(`/booking-details/repeated/${DRAFT_ID}`);

    expect(await screen.findByLabelText("Booking title")).toHaveValue("");
    await user.type(screen.getByLabelText("Booking title"), "Weekly choir");
    await user.tab();
    await waitFor(() => {
      expect(mockFacility.updateBookingSeriesDraft).toHaveBeenCalled();
    });

    cleanup();
    renderFlow(`/booking-details/repeated/${DRAFT_ID}`);
    expect(await screen.findByDisplayValue("Weekly choir")).toBeTruthy();
    expect(mockFacility.getBookingSeriesDraft).toHaveBeenCalled();
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
    expect(await screen.findByRole("heading", { name: "Timetable" })).toBeTruthy();
  });

  it("shows the server's effective Recurring Discount label instead of a hardcoded Ministry label", async () => {
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
