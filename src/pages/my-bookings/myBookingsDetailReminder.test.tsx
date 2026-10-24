import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
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
});

const mockFacility = vi.hoisted(() => ({
  getMyBooking: vi.fn(),
  getBookingSeries: vi.fn(),
}));

vi.mock("@/api/services/facilityService", () => ({
  default: mockFacility,
  BookingNotFoundError: class BookingNotFoundError extends Error {},
  BookingSeriesNotFoundError: class BookingSeriesNotFoundError extends Error {},
}));

vi.mock("@efcnewlife/newlife-ui", async () => {
  const React = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) => React.createElement("div", null, children);
  return {
    Alert: ({ message, title }: { message?: string; title?: string }) =>
      React.createElement("div", { role: "alert" }, React.createElement("strong", null, title), message),
    Badge: ({ children }: { children?: React.ReactNode }) => React.createElement("span", null, children),
    Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) =>
      React.createElement("button", { onClick, type: "button" }, children),
    Input: Passthrough,
    Modal: ({ isOpen, children }: { isOpen: boolean; children?: React.ReactNode }) =>
      isOpen ? React.createElement("div", { role: "dialog" }, children) : null,
    Radio: Passthrough,
    Spinner: () => React.createElement("div", null, "Loading"),
    TextArea: Passthrough,
    cn: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" "),
  };
});

import { change_app_language } from "@/i18n";
import BookingDetailPage from "@/pages/my-bookings/BookingDetailPage";
import RecurringSeriesDetailPage from "@/pages/my-bookings/RecurringSeriesDetailPage";

const BOOKING_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const SERIES_ID = "4fa85f64-5717-4562-b3fc-2c963f66afa6";
const BOOKING_REMINDER = /Priority Ministry bookings take precedence\. Your entire booking may be overridden/;
const SERIES_REMINDER = /that occurrence's entire booking may be overridden; your other occurrences stay booked/;

const actions = () => ({
  canEditTitle: false,
  canCancel: false,
  canViewPaymentInstructions: false,
  canBookAgain: false,
  bookAgainDate: null,
});

const booking = (overrides: Record<string, unknown> = {}) => ({
  id: BOOKING_ID,
  title: "Choir practice",
  status: "confirmed",
  bookingType: "one_time",
  seriesId: null,
  startAt: "2099-09-01T10:00:00-07:00",
  endAt: "2099-09-01T11:00:00-07:00",
  ministryId: null,
  ministryName: null,
  remark: null,
  bookerDisplayName: "Jane Doe",
  bookerEmail: "jane@example.com",
  quotedAmount: "75.00",
  subtotalAmount: "75.00",
  discountPercent: "0",
  discountAmount: "0.00",
  surchargeAmount: "0.00",
  currency: "CAD",
  paymentHoldExpiresAt: null,
  isBooker: true,
  isViewOnly: false,
  rooms: [],
  timeline: [],
  actions: actions(),
  ...overrides,
});

const series = (overrides: Record<string, unknown> = {}) => ({
  id: SERIES_ID,
  title: "Weekly choir",
  ministryId: null,
  ministryName: null,
  remark: null,
  bookerDisplayName: "Jane Doe",
  bookerEmail: "jane@example.com",
  firstOccurrenceDate: "2099-01-01",
  lastOccurrenceDate: "2099-02-05",
  localStartTime: "09:00:00",
  localEndTime: "10:30:00",
  status: "confirmed",
  paymentHoldExpiresAt: null,
  quotedAmount: "150.00",
  currency: "CAD",
  occurrenceCount: 1,
  isPriority: false,
  isBooker: true,
  isViewOnly: false,
  timeline: [],
  actions: actions(),
  occurrences: [booking({ bookingType: "recurring", seriesId: SERIES_ID })],
  ...overrides,
});

const renderRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RecurringSeriesDetailPage />} path="/my-bookings/series/:seriesId" />
        <Route element={<BookingDetailPage />} path="/my-bookings/:bookingId" />
      </Routes>
    </MemoryRouter>
  );

const reminderBelowTitle = async (title: string) => {
  const heading = await screen.findByRole("heading", { name: title });
  return heading.parentElement?.nextElementSibling;
};

afterEach(async () => {
  cleanup();
  vi.clearAllMocks();
  await change_app_language("en");
});

describe("My Bookings Booking detail priority Reminder", () => {
  it("shows the Reminder below the title of a Personal Booking", async () => {
    mockFacility.getMyBooking.mockResolvedValue(booking());
    renderRoute(`/my-bookings/${BOOKING_ID}`);

    const reminder = await reminderBelowTitle("Choir practice");
    expect(reminder).toHaveTextContent("Reminder");
    expect(reminder).toHaveTextContent(BOOKING_REMINDER);
    expect(reminder).toHaveTextContent("You will be notified by email and will need to book again.");
  });

  it("omits the Reminder for a Ministry Booking", async () => {
    mockFacility.getMyBooking.mockResolvedValue(booking({ ministryId: "ministry-1", ministryName: "Youth Ministry" }));
    renderRoute(`/my-bookings/${BOOKING_ID}`);

    expect(await screen.findByText("Youth Ministry")).toBeTruthy();
    expect(screen.queryByText(BOOKING_REMINDER)).toBeNull();
  });

  it("keeps the overridden outcome alongside the Reminder", async () => {
    mockFacility.getMyBooking.mockResolvedValue(
      booking({
        status: "overridden",
        timeline: [{ kind: "overridden", occurredAt: "2099-08-01T10:00:00Z", reason: null }],
      })
    );
    renderRoute(`/my-bookings/${BOOKING_ID}`);

    expect(await reminderBelowTitle("Choir practice")).toHaveTextContent(BOOKING_REMINDER);
    expect(screen.getByText("Overridden")).toBeTruthy();
    expect(screen.getByText("Booking overridden by a ministry booking")).toBeTruthy();
  });

  it("keeps the Pending-payment outcome alongside the Reminder", async () => {
    mockFacility.getMyBooking.mockResolvedValue(
      booking({ status: "pending_payment", paymentHoldExpiresAt: "2099-08-01T10:00:00Z" })
    );
    renderRoute(`/my-bookings/${BOOKING_ID}`);

    expect(await reminderBelowTitle("Choir practice")).toHaveTextContent(BOOKING_REMINDER);
    expect(screen.getByText(/Pay in full before/)).toBeTruthy();
  });

  it("keeps the cancelled outcome alongside the Reminder", async () => {
    mockFacility.getMyBooking.mockResolvedValue(
      booking({
        status: "cancelled",
        timeline: [{ kind: "cancelled", occurredAt: "2099-08-01T10:00:00Z", reason: null }],
      })
    );
    renderRoute(`/my-bookings/${BOOKING_ID}`);

    expect(await reminderBelowTitle("Choir practice")).toHaveTextContent(BOOKING_REMINDER);
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(screen.getByText("Booking cancelled")).toBeTruthy();
  });

  it.each([
    ["zh-TW", "優先事工的預訂享有優先權"],
    ["zh-CN", "优先事工的预订享有优先权"],
  ])("shows the %s Reminder copy", async (locale, reminder) => {
    await change_app_language(locale);
    mockFacility.getMyBooking.mockResolvedValue(booking());
    renderRoute(`/my-bookings/${BOOKING_ID}`);

    expect(await reminderBelowTitle("Choir practice")).toHaveTextContent(reminder);
  });
});

describe("My Bookings Series detail priority Reminder", () => {
  it("shows the Series Reminder below the title of a Personal Series", async () => {
    mockFacility.getBookingSeries.mockResolvedValue(series());
    renderRoute(`/my-bookings/series/${SERIES_ID}`);

    const reminder = await reminderBelowTitle("Weekly choir");
    expect(reminder).toHaveTextContent("Reminder");
    expect(reminder).toHaveTextContent(SERIES_REMINDER);
  });

  it("omits the Reminder for a Ministry Series", async () => {
    mockFacility.getBookingSeries.mockResolvedValue(
      series({ ministryId: "ministry-1", ministryName: "Youth Ministry" })
    );
    renderRoute(`/my-bookings/series/${SERIES_ID}`);

    expect(await screen.findByText("Youth Ministry")).toBeTruthy();
    expect(screen.queryByText(SERIES_REMINDER)).toBeNull();
  });

  it("keeps the expired hold outcome alongside the Reminder", async () => {
    mockFacility.getBookingSeries.mockResolvedValue(
      series({ status: "pending_payment", paymentHoldExpiresAt: "2000-01-01T00:00:00Z" })
    );
    renderRoute(`/my-bookings/series/${SERIES_ID}`);

    expect(await reminderBelowTitle("Weekly choir")).toHaveTextContent(SERIES_REMINDER);
    expect(screen.getAllByText("Payment hold expired").length).toBeGreaterThan(0);
    expect(screen.getByText(/This unpaid hold has expired/)).toBeTruthy();
  });
});
