import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  Element.prototype.scrollTo = () => {};
  class BookingDraftNotFoundError extends Error {
    constructor() {
      super("Booking draft not found");
      this.name = "BookingDraftNotFoundError";
    }
  }

  return {
    BookingDraftNotFoundError,
    mockFacility: {
      createBookingDraft: vi.fn(),
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
import RoomFilterPage from "@/pages/rooms/RoomFilterPage";
import { loadTimetableCart, saveTimetableCart } from "@/utils/timetableCartStorage";

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

const noOverrideReview = () => ({
  isConfirmable: true,
  conflicts: [],
  overrideImpacts: [],
  overrideReviewToken: null,
});

const draftDetail = (overrides: Partial<{ ministryId: string | null; title: string }> = {}) => ({
  id: DRAFT_ID,
  date: "2026-09-01",
  title: overrides.title ?? "Choir practice",
  ministryId: overrides.ministryId !== undefined ? overrides.ministryId : "ministry-1",
  lines: [{ facilityId: "gym-id", startAt: "2026-09-01T10:00:00.000", endAt: "2026-09-01T11:00:00.000", sequence: 1 }],
  ...noOverrideReview(),
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

const renderTimetableFlow = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RoomFilterPage />} path="/rooms" />
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

const PRIORITY_REMINDER = /Priority Ministry bookings take precedence\. Your entire booking may be overridden/;

describe("One-time Booking Details Personal priority Reminder", () => {
  beforeEach(() => {
    mockFacility.getAvailability.mockResolvedValue(availability());
    mockFacility.previewQuote.mockResolvedValue({
      subtotalAmount: "100.00",
      discountAmount: "0.00",
      surchargeAmount: "0.00",
      quotedAmount: "100.00",
      currency: "CAD",
      roomLines: [],
    });
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    await change_app_language("en");
  });

  it("shows the Reminder directly below the title for a Personal Draft", async () => {
    mockFacility.getBookingDraft.mockResolvedValue(draftDetail({ ministryId: null }));
    renderFlow(`/booking-details/one-time/${DRAFT_ID}`);

    const heading = await screen.findByRole("heading", { name: "Booking Details" });
    expect(heading.nextElementSibling).toHaveTextContent("Reminder");
    expect(heading.nextElementSibling).toHaveTextContent(PRIORITY_REMINDER);
    expect(heading.nextElementSibling).toHaveTextContent("You will be notified by email and will need to book again.");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("omits the Reminder for a Ministry Draft", async () => {
    mockFacility.getBookingDraft.mockResolvedValue(draftDetail({ ministryId: "ministry-1" }));
    renderFlow(`/booking-details/one-time/${DRAFT_ID}`);

    await screen.findByRole("heading", { name: "Booking Details" });
    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    expect(screen.queryByText(PRIORITY_REMINDER)).toBeNull();
  });

  it.each([
    ["zh-TW", "預訂詳情", "優先事工的預訂享有優先權"],
    ["zh-CN", "预订详情", "优先事工的预订享有优先权"],
  ])("shows the %s Reminder copy", async (locale, title, reminder) => {
    await change_app_language(locale);
    mockFacility.getBookingDraft.mockResolvedValue(draftDetail({ ministryId: null }));
    renderFlow(`/booking-details/one-time/${DRAFT_ID}`);

    const heading = await screen.findByRole("heading", { name: title });
    expect(heading.nextElementSibling).toHaveTextContent(reminder);
  });
});

const timetableAvailability = (overrides: { cellsAvailable?: boolean } = {}) => ({
  rooms: [
    {
      id: "gym-id",
      code: "gym",
      name: "Gym",
      capacity: 200,
      photoUrls: [],
      templates: overrides.cellsAvailable === false ? [] : [{ start: "10:00", end: "11:00", slotDurationMinutes: 60 }],
      cells:
        overrides.cellsAvailable === false
          ? [{ start: "10:00", end: "11:00", state: "unavailable" as const }]
          : [{ start: "10:00", end: "11:00", state: "available" as const }],
    },
  ],
  maxBookingLines: 3,
});

describe("One-time Timetable cart to Booking Details", () => {
  let draft: {
    id: string;
    date: string;
    title: string;
    ministryId: string | null;
    lines: Array<Record<string, unknown>>;
  };

  beforeEach(() => {
    window.localStorage.clear();
    saveTimetableCart(window.localStorage, {
      date: "2026-09-01",
      ministryId: undefined,
      lines: [{ sequence: 1, facilityId: "gym-id", start: "10:00", end: "11:00" }],
    });
    draft = {
      id: DRAFT_ID,
      date: "2026-09-01",
      title: "",
      ministryId: null,
      lines: [
        { facilityId: "gym-id", startAt: "2026-09-01T10:00:00.000", endAt: "2026-09-01T11:00:00.000", sequence: 1 },
      ],
      ...noOverrideReview(),
    };
    mockFacility.createBookingDraft.mockImplementation(async (payload) => {
      draft = { ...draft, title: payload.title, ministryId: payload.ministryId ?? null, lines: payload.lines };
      return { id: DRAFT_ID };
    });
    mockFacility.updateBookingDraft.mockImplementation(async (_id: string, payload) => {
      draft = { ...draft, title: payload.title, ministryId: payload.ministryId ?? null, lines: payload.lines };
      return structuredClone(draft);
    });
    mockFacility.getBookingDraft.mockImplementation(async () => structuredClone(draft));
    mockFacility.getAvailability.mockResolvedValue(timetableAvailability());
    mockFacility.previewQuote.mockResolvedValue({
      subtotalAmount: "75.00",
      discountAmount: "0.00",
      surchargeAmount: "0.00",
      quotedAmount: "75.00",
      currency: "CAD",
      roomLines: [{ facilityId: "gym-id", lineSubtotal: "75.00", currency: "CAD" }],
    });
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("gates Review & Confirm on a valid Title and a ready aggregate quote, then creates the Booking Draft", async () => {
    const user = userEvent.setup();
    renderTimetableFlow("/rooms?date=2026-09-01");

    expect(await screen.findByRole("button", { name: "Review & Confirm" })).toBeDisabled();

    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText(/75\.00/).length).toBeGreaterThan(0));
    expect(screen.getByText("1 room")).toBeTruthy();
    expect(screen.getByText("Estimated Total")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review & Confirm" })).toBeDisabled();

    await user.type(screen.getByLabelText("Booking title"), "Choir practice");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());

    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingDraft).toHaveBeenCalledTimes(1);
    expect(mockFacility.createBookingDraft).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Choir practice", ministryId: null })
    );
    expect(screen.getByText("Choir practice")).toBeTruthy();
  });

  it("updates the same Booking Draft on a later Review & Confirm instead of creating another", async () => {
    const user = userEvent.setup();
    renderTimetableFlow("/rooms?date=2026-09-01");

    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Booking title"), "Choir practice");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));
    await screen.findByRole("heading", { name: "Booking Details" });

    await user.click(screen.getByRole("button", { name: "Back to Timetable" }));

    expect(await screen.findByRole("form", { name: "Search details" })).toBeTruthy();
    expect(await screen.findByLabelText("Booking title")).toHaveValue("Choir practice");

    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled(), {
      timeout: 2000,
    });

    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingDraft).toHaveBeenCalledTimes(1);
    expect(mockFacility.updateBookingDraft).toHaveBeenCalledWith(
      DRAFT_ID,
      expect.objectContaining({ title: "Choir practice" })
    );
  });

  it("shows Personal booking in the Cart and keeps Ministry off the Search Bar", async () => {
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    renderTimetableFlow("/rooms?date=2026-09-01");

    expect(await screen.findByText("Personal booking")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Switch to a ministry booking" })).toBeTruthy();
    expect(screen.queryByLabelText("Ministry")).toBeNull();
  });

  it("applies a Ministry from the Cart chooser, refreshes quote, and sends it on the Draft", async () => {
    const user = userEvent.setup();
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    window.localStorage.clear();
    saveTimetableCart(window.localStorage, {
      date: "2026-09-01",
      ministryId: undefined,
      title: "Choir practice",
      lines: [{ sequence: 1, facilityId: "gym-id", start: "10:00", end: "11:00" }],
    });
    renderTimetableFlow("/rooms?date=2026-09-01");

    expect(await screen.findByLabelText("Booking title")).toHaveValue("Choir practice");
    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    mockFacility.previewQuote.mockClear();
    mockFacility.getAvailability.mockClear();

    await user.click(screen.getByRole("button", { name: "Switch to a ministry booking" }));
    await user.click(screen.getByRole("button", { name: "Youth Ministry" }));

    await waitFor(() => {
      expect(mockFacility.getAvailability).toHaveBeenCalledWith("2026-09-01", "ministry-1");
    });
    await waitFor(() => {
      expect(mockFacility.previewQuote).toHaveBeenCalledWith(expect.objectContaining({ ministryId: "ministry-1" }));
    });
    expect(await screen.findByText("Ministry: Youth Ministry")).toBeTruthy();
    expect(screen.getByLabelText("Booking title")).toHaveValue("Choir practice");
    expect(screen.getAllByText("Gym").length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingDraft).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Choir practice", ministryId: "ministry-1" })
    );
  });

  it("updates the same Booking Draft after changing association on return from Booking Details", async () => {
    const user = userEvent.setup();
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    renderTimetableFlow("/rooms?date=2026-09-01");

    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Booking title"), "Choir practice");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));
    await screen.findByRole("heading", { name: "Booking Details" });
    expect(await screen.findByText(PRIORITY_REMINDER)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Back to Timetable" }));
    expect(await screen.findByText("Personal booking")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Switch to a ministry booking" }));
    await user.click(screen.getByRole("button", { name: "Youth Ministry" }));

    expect(await screen.findByText("Ministry: Youth Ministry")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled(), {
      timeout: 2000,
    });
    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingDraft).toHaveBeenCalledTimes(1);
    expect(mockFacility.updateBookingDraft).toHaveBeenCalledWith(
      DRAFT_ID,
      expect.objectContaining({ title: "Choir practice", ministryId: "ministry-1" })
    );
    await waitFor(() => expect(screen.queryByText(PRIORITY_REMINDER)).toBeNull());
  });

  it("switches back to Personal from the Cart and creates a non-Ministry Draft", async () => {
    const user = userEvent.setup();
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    window.localStorage.clear();
    saveTimetableCart(window.localStorage, {
      date: "2026-09-01",
      ministryId: "ministry-1",
      title: "Choir practice",
      lines: [{ sequence: 1, facilityId: "gym-id", start: "10:00", end: "11:00" }],
    });

    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    expect(await screen.findByText("Ministry: Youth Ministry")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Switch to a personal booking" }));

    expect(await screen.findByText("Personal booking")).toBeTruthy();
    await waitFor(() => {
      expect(mockFacility.previewQuote).toHaveBeenCalledWith(expect.objectContaining({ ministryId: null }));
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));

    expect(await screen.findByRole("heading", { name: "Booking Details" })).toBeTruthy();
    expect(mockFacility.createBookingDraft).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Choir practice", ministryId: null })
    );
  });

  it("keeps an invalid retained room visible and blocks Review after a Ministry change", async () => {
    const user = userEvent.setup();
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    mockFacility.getAvailability.mockImplementation(async (_date: string, ministryId?: string) => {
      return timetableAvailability({ cellsAvailable: ministryId !== "ministry-1" });
    });

    renderTimetableFlow("/rooms?date=2026-09-01");
    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    await user.type(screen.getByLabelText("Booking title"), "Choir practice");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());

    await user.click(screen.getByRole("button", { name: "Switch to a ministry booking" }));
    await user.click(screen.getByRole("button", { name: "Youth Ministry" }));

    expect(await screen.findByText("This selection is no longer available. Edit or remove it.")).toBeTruthy();
    expect(screen.getAllByText("Gym").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Review & Confirm" })).toBeDisabled();
  });

  it("overwrites the One-time Cart snapshot when the association changes", async () => {
    const user = userEvent.setup();
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    window.localStorage.clear();
    saveTimetableCart(window.localStorage, {
      date: "2026-09-01",
      ministryId: undefined,
      title: "Choir practice",
      lines: [{ sequence: 1, facilityId: "gym-id", start: "10:00", end: "11:00" }],
    });

    renderTimetableFlow("/rooms?date=2026-09-01");
    expect(await screen.findByLabelText("Booking title")).toHaveValue("Choir practice");

    await user.click(screen.getByRole("button", { name: "Switch to a ministry booking" }));
    await user.click(screen.getByRole("button", { name: "Youth Ministry" }));

    await waitFor(() => {
      expect(loadTimetableCart(window.localStorage, "2026-09-01", "ministry-1")).toEqual(
        expect.objectContaining({
          ministryId: "ministry-1",
          title: "Choir practice",
          lines: [{ sequence: 1, facilityId: "gym-id", start: "10:00", end: "11:00" }],
        })
      );
    });
    expect(loadTimetableCart(window.localStorage, "2026-09-01", undefined)).toBeNull();
  });

  it("shows the selected Ministry's name and Cart actions when a Ministry is selected", async () => {
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    window.localStorage.clear();
    saveTimetableCart(window.localStorage, {
      date: "2026-09-01",
      ministryId: "ministry-1",
      lines: [{ sequence: 1, facilityId: "gym-id", start: "10:00", end: "11:00" }],
    });

    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    expect(await screen.findByText("Ministry: Youth Ministry")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Change ministry" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Switch to a personal booking" })).toBeTruthy();
    expect(screen.queryByLabelText("Ministry")).toBeNull();
  });

  it("hides switch-to-Ministry when the member has no bookable Active Ministry", async () => {
    vi.mocked(ministryService.listMine).mockResolvedValue({ items: [] });
    renderTimetableFlow("/rooms?date=2026-09-01");

    expect(await screen.findByText("Personal booking")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Switch to a ministry booking" })).toBeNull();
  });
});

const openCells = (start: string, end: string, state: "available" | "unavailable" | "override" | "closed") => {
  const [startHour, startMinute] = start.split(":").map((part) => Number.parseInt(part, 10));
  const [endHour, endMinute] = end.split(":").map((part) => Number.parseInt(part, 10));
  const cells = [];
  let cursor = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  while (cursor < endMinutes) {
    const next = cursor + 30;
    const clock = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };
    cells.push({ start: clock(cursor), end: clock(next), state });
    cursor = next;
  }
  return cells;
};

const gymRoom = () => ({
  id: "gym-id",
  code: "gym",
  name: "Gym",
  capacity: 200,
  photoUrls: ["https://cdn.example/gym.jpg"],
  templates: [{ start: "09:00", end: "17:00", slotDurationMinutes: 60 }],
  cells: openCells("10:00", "11:00", "available"),
  events: [],
});

const hallRoom = () => ({
  id: "hall-id",
  code: "hall",
  name: "Hall",
  capacity: 40,
  photoUrls: [],
  templates: [{ start: "09:00", end: "12:00", slotDurationMinutes: 60 }],
  cells: [...openCells("10:00", "11:00", "unavailable"), ...openCells("11:00", "12:00", "unavailable")],
  events: [
    {
      start: "10:00",
      end: "11:00",
      occupancyKind: "ministry" as const,
      isOverridable: false,
      ministryName: "Choir",
      contactDisplayName: "Ada Steward",
      contactEmail: "ada@efcnewlife.org",
    },
    {
      start: "11:00",
      end: "12:00",
      occupancyKind: "rental" as const,
      isOverridable: false,
      ministryName: null,
      contactDisplayName: "Ben Booker",
      contactEmail: "ben@example.com",
    },
  ],
});

const overrideRoom = () => ({
  id: "chapel-id",
  code: "chapel",
  name: "Chapel",
  capacity: 20,
  photoUrls: [],
  templates: [{ start: "09:00", end: "12:00", slotDurationMinutes: 60 }],
  cells: openCells("10:00", "11:00", "override"),
  events: [
    {
      start: "10:00",
      end: "11:00",
      occupancyKind: "rental" as const,
      isOverridable: true,
      ministryName: null,
      contactDisplayName: "Cara Renter",
      contactEmail: "cara@example.com",
    },
  ],
});

describe("One-time Timetable states and contacts", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [{ id: "ministry-1", name: "Youth Ministry", status: "active", isActive: true }],
    });
    mockFacility.previewQuote.mockResolvedValue({
      subtotalAmount: "75.00",
      discountAmount: "0.00",
      surchargeAmount: "0.00",
      quotedAmount: "75.00",
      currency: "CAD",
      roomLines: [],
    });
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
    await change_app_language("en");
  });

  it("drops Available rooms / All rooms and keeps capacity filtering plus the full-day grid", async () => {
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [gymRoom(), hallRoom()],
      maxBookingLines: 3,
    });

    renderTimetableFlow("/rooms?date=2026-09-01&start=10:00&end=11:00");

    expect(await screen.findByText("Gym")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Available rooms" })).toBeNull();
    expect(screen.queryByRole("button", { name: "All rooms" })).toBeNull();
    expect(screen.queryByText("Filter by view:")).toBeNull();
    expect(screen.getByText("Filter by capacity:")).toBeTruthy();
    expect(screen.getByText("12:00 am")).toBeTruthy();
    expect(screen.getByText("11:00 pm")).toBeTruthy();
  });

  it("keeps a Personal time seed from hiding only bookable rooms, and keeps Ministry occupied rooms", async () => {
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [gymRoom(), hallRoom()],
      maxBookingLines: 3,
    });

    const personal = renderTimetableFlow("/rooms?date=2026-09-01&start=10:00&end=11:00");
    expect(await screen.findByText("Gym")).toBeTruthy();
    expect(screen.queryByText("Hall")).toBeNull();
    personal.unmount();

    renderTimetableFlow("/rooms?date=2026-09-01&start=10:00&end=11:00&ministryId=ministry-1");
    expect(await screen.findByText("Hall")).toBeTruthy();
    expect(screen.getByText("Gym")).toBeTruthy();
  });

  it("shows authorized contacts for distinct Ministry and Rental blocks and closes without cart admission", async () => {
    const user = userEvent.setup();
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [hallRoom(), overrideRoom()],
      maxBookingLines: 3,
    });

    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    expect(await screen.findByText("Conflict")).toBeTruthy();
    expect(screen.getByText("Unavailable")).toBeTruthy();
    expect(screen.getByText("Override")).toBeTruthy();
    expect(screen.queryByText("Choir")).toBeNull();
    expect(screen.queryByText("Ada Steward")).toBeNull();
    expect(screen.queryByText("Cara Renter")).toBeNull();

    const choirContact = await screen.findByRole("button", { name: /View contact for Hall, 10:00 am/ });
    const rentalContact = await screen.findByRole("button", { name: /View contact for Hall, 11:00 am/ });
    expect(screen.queryByRole("button", { name: /View contact for Chapel/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "ADD" })).toBeNull();

    await user.click(choirContact);
    const dialog = await screen.findByRole("dialog", { name: "Conflict" });
    expect(within(dialog).getByText("Hall")).toBeTruthy();
    expect(within(dialog).getByText(/10:00 am/)).toBeTruthy();
    expect(within(dialog).getByText("Choir")).toBeTruthy();
    expect(within(dialog).getByText("Ada Steward")).toBeTruthy();
    expect(within(dialog).getByText("ada@efcnewlife.org")).toBeTruthy();
    expect(within(dialog).queryByText("Ben Booker")).toBeNull();
    expect(within(dialog).queryByText(/phone/i)).toBeNull();
    expect(within(dialog).queryByText(/title/i)).toBeNull();
    expect(within(dialog).queryByText(/skip the date/i)).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "ADD" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: /^Close$/ })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(choirContact).toHaveFocus();

    await user.click(rentalContact);
    const rentalDialog = await screen.findByRole("dialog", { name: "Conflict" });
    expect(within(rentalDialog).getByText("Ben Booker")).toBeTruthy();
    expect(within(rentalDialog).getByText("ben@example.com")).toBeTruthy();
    expect(within(rentalDialog).queryByText("Choir")).toBeNull();
    await user.click(within(rentalDialog).getByRole("button", { name: /^Close$/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Confirm Booking Time" })).toBeNull();
  });

  it("never offers contact or an occupant kind for a Personal occupied block", async () => {
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [
        {
          ...hallRoom(),
          events: [],
          cells: openCells("10:00", "12:00", "unavailable"),
        },
        gymRoom(),
      ],
      maxBookingLines: 3,
    });

    renderTimetableFlow("/rooms?date=2026-09-01");

    expect(await screen.findByText("Unavailable")).toBeTruthy();
    expect(screen.queryByText("Conflict")).toBeNull();
    expect(screen.queryByRole("button", { name: /View contact/ })).toBeNull();
    expect(screen.queryByText("Choir")).toBeNull();
    expect(screen.queryByText("Ada Steward")).toBeNull();
  });

  it("renders a Personal override cell as generic Unavailable", async () => {
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [overrideRoom(), gymRoom()],
      maxBookingLines: 3,
    });

    renderTimetableFlow("/rooms?date=2026-09-01");

    expect(await screen.findByText("Unavailable")).toBeTruthy();
    expect(screen.queryByText("Override")).toBeNull();
    expect(screen.queryByRole("button", { name: /View contact/ })).toBeNull();
  });

  it("hides Rental contact on a Priority Ministry proposal and keeps Ministry contact", async () => {
    vi.mocked(ministryService.listMine).mockResolvedValue({
      items: [
        {
          id: "ministry-1",
          name: "Youth Ministry",
          status: "active",
          isActive: true,
          hasPriorityBooking: true,
        },
      ],
    });
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [hallRoom(), overrideRoom()],
      maxBookingLines: 3,
    });

    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    expect(await screen.findByRole("button", { name: /View contact for Hall, 10:00 am/ })).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /View contact for Hall, 11:00 am/ })).toBeNull();
    });
    expect(screen.getByText("Override")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /View contact for Chapel/ })).toBeNull();
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });

  it("does not paint reservation content on Closed time that an event overlaps", async () => {
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [
        {
          id: "studio-id",
          code: "studio",
          name: "Studio",
          capacity: 10,
          photoUrls: [],
          templates: [{ start: "09:00", end: "12:00", slotDurationMinutes: 60 }],
          cells: [...openCells("09:00", "10:00", "closed"), ...openCells("10:00", "11:00", "unavailable")],
          events: [
            {
              start: "09:00",
              end: "11:00",
              occupancyKind: "ministry" as const,
              isOverridable: false,
              ministryName: "Choir",
              contactDisplayName: "Ada Steward",
              contactEmail: "ada@efcnewlife.org",
            },
          ],
        },
      ],
      maxBookingLines: 3,
    });

    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    expect(await screen.findByRole("button", { name: /View contact for Studio, 10:00 am/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /View contact for Studio, 9:00 am/ })).toBeNull();
  });

  it("clears privileged contacts and blocks Review until the new availability resolves", async () => {
    const user = userEvent.setup();
    saveTimetableCart(window.localStorage, {
      date: "2026-09-01",
      ministryId: "ministry-1",
      title: "Choir practice",
      lines: [{ sequence: 1, facilityId: "gym-id", start: "10:00", end: "11:00" }],
    });
    let releasePersonal: (value: { rooms: unknown[]; maxBookingLines: number }) => void = () => {};
    mockFacility.getAvailability.mockImplementation(async (_date: string, ministryId?: string) => {
      if (ministryId) {
        return { rooms: [gymRoom(), hallRoom()], maxBookingLines: 3 };
      }
      return new Promise((resolve) => {
        releasePersonal = resolve;
      });
    });

    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");
    expect(await screen.findByText("Conflict")).toBeTruthy();
    await user.type(screen.getByLabelText("Booking title"), "Choir practice");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());

    await user.click(screen.getByRole("button", { name: "Switch to a personal booking" }));

    expect(screen.queryByText("Conflict")).toBeNull();
    expect(screen.queryByRole("button", { name: /View contact/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Review & Confirm" })).toBeDisabled();
    expect(screen.getAllByText("Gym").length).toBeGreaterThan(0);

    releasePersonal({
      rooms: [
        { ...gymRoom(), cells: openCells("10:00", "11:00", "unavailable") },
        { ...hallRoom(), events: [], cells: openCells("10:00", "12:00", "unavailable") },
      ],
      maxBookingLines: 3,
    });

    await waitFor(() =>
      expect(mockFacility.previewQuote).toHaveBeenCalledWith(expect.objectContaining({ ministryId: null }))
    );
    expect(screen.getByRole("button", { name: "Review & Confirm" })).toBeDisabled();
    expect(screen.getAllByText("Gym").length).toBeGreaterThan(0);
    expect(screen.queryByText("Conflict")).toBeNull();
    expect(screen.queryByRole("button", { name: /View contact/ })).toBeNull();
  });

  it("uses the same contact copy in English, Traditional Chinese, and Simplified Chinese", async () => {
    const user = userEvent.setup();
    mockFacility.getAvailability.mockResolvedValue({
      rooms: [hallRoom()],
      maxBookingLines: 3,
    });
    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    expect(await screen.findByText("Conflict")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /View contact for Hall/ })).toHaveLength(2);
    });
    const englishContacts = screen.getAllByRole("button", { name: /View contact for Hall/ });
    await user.click(englishContacts[0]);
    expect(await screen.findByRole("dialog", { name: "Conflict" })).toBeTruthy();
    await user.keyboard("{Escape}");

    await change_app_language("zh-TW");
    expect(await screen.findByText("衝突")).toBeTruthy();
    const traditionalContacts = screen.getAllByRole("button", { name: /查看聯絡人/ });
    expect(traditionalContacts).toHaveLength(2);
    await user.click(traditionalContacts[0]);
    expect(await screen.findByRole("dialog", { name: "衝突" })).toBeTruthy();
    await user.keyboard("{Escape}");

    await change_app_language("zh-CN");
    expect(await screen.findByText("冲突")).toBeTruthy();
    const simplifiedContacts = screen.getAllByRole("button", { name: /查看联系人/ });
    expect(simplifiedContacts).toHaveLength(2);
    await user.click(simplifiedContacts[0]);
    expect(await screen.findByRole("dialog", { name: "冲突" })).toBeTruthy();
  });
});

const priorityMinistry = () => ({
  id: "ministry-1",
  name: "Youth Ministry",
  status: "active",
  isActive: true,
  hasPriorityBooking: true,
});

const expectNoMutation = () => {
  expect(mockFacility.createBooking).not.toHaveBeenCalled();
  expect(mockFacility.createBookingDraft).not.toHaveBeenCalled();
  expect(mockFacility.updateBookingDraft).not.toHaveBeenCalled();
};

const proposeChapelOverride = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole("button", { name: "Select Chapel, 10:00 am" }));
  await user.click(await screen.findByRole("button", { name: "ADD" }));
  const timeDialog = await screen.findByRole("dialog", { name: "Confirm Booking Time" });
  await user.click(within(timeDialog).getByRole("button", { name: "Confirm" }));
  return screen.findByRole("dialog", { name: "Replace an existing booking?" });
};

describe("One-time Priority Override selection", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(ministryService.listMine).mockResolvedValue({ items: [priorityMinistry()] });
    mockFacility.getAvailability.mockResolvedValue({ rooms: [overrideRoom(), gymRoom()], maxBookingLines: 3 });
    mockFacility.previewQuote.mockResolvedValue({
      subtotalAmount: "75.00",
      discountAmount: "0.00",
      surchargeAmount: "0.00",
      quotedAmount: "75.00",
      currency: "CAD",
      roomLines: [],
    });
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
    await change_app_language("en");
  });

  it("acknowledges the actual Override interval before Cart admission and leaves the Cart unchanged on cancel", async () => {
    const user = userEvent.setup();
    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    const popup = await proposeChapelOverride(user);
    expect(within(popup).getByText("Chapel")).toBeTruthy();
    expect(within(popup).getByText(/10:00 am – 11:00 am/)).toBeTruthy();
    expect(within(popup).queryByText(/notif/i)).toBeNull();
    expect(within(popup).getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.click(within(popup).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("1 room")).toBeNull();
    expect(loadTimetableCart(window.localStorage, "2026-09-01", "ministry-1")).toBeNull();
    expectNoMutation();
  });

  it("adds the Override proposal to the Cart only after acceptance, without any create or notify request", async () => {
    const user = userEvent.setup();
    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    const popup = await proposeChapelOverride(user);
    await user.click(within(popup).getByRole("button", { name: "Add to cart" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("1 room")).toBeTruthy();
    expect(loadTimetableCart(window.localStorage, "2026-09-01", "ministry-1")?.lines).toEqual([
      { sequence: 1, facilityId: "chapel-id", start: "10:00", end: "11:00" },
    ]);
    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    expectNoMutation();
  });

  it("adds an Available interval without the Override popup", async () => {
    const user = userEvent.setup();
    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    await user.click(await screen.findByRole("button", { name: "Select Gym, 10:00 am" }));
    await user.click(await screen.findByRole("button", { name: "ADD" }));
    const timeDialog = await screen.findByRole("dialog", { name: "Confirm Booking Time" });
    await user.click(within(timeDialog).getByRole("button", { name: "Confirm" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByText("1 room")).toBeTruthy();
  });

  it("keeps Override unselectable for a Personal proposal", async () => {
    renderTimetableFlow("/rooms?date=2026-09-01");

    expect(await screen.findByText("Gym")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Select Chapel, 10:00 am" })).toBeDisabled();
  });

  it("keeps an accepted Override line valid so Review & Confirm can create the Draft", async () => {
    const user = userEvent.setup();
    mockFacility.createBookingDraft.mockResolvedValue({ id: DRAFT_ID });
    mockFacility.getBookingDraft.mockImplementation(() => new Promise(() => {}));
    renderTimetableFlow("/rooms?date=2026-09-01&ministryId=ministry-1");

    const popup = await proposeChapelOverride(user);
    await user.click(within(popup).getByRole("button", { name: "Add to cart" }));
    await user.type(screen.getByLabelText("Booking title"), "Youth night");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review & Confirm" })).not.toBeDisabled());
    expect(screen.queryByText("This selection is no longer available. Edit or remove it.")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Review & Confirm" }));
    await waitFor(() =>
      expect(mockFacility.createBookingDraft).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Youth night", ministryId: "ministry-1" })
      )
    );
    expect(mockFacility.createBooking).not.toHaveBeenCalled();
  });
});

const reviewedOverrideDraft = (overrides: Record<string, unknown> = {}) => ({
  id: DRAFT_ID,
  date: "2026-09-01",
  title: "Youth night",
  ministryId: "ministry-1",
  lines: [
    { facilityId: "chapel-id", startAt: "2026-09-01T10:00:00.000", endAt: "2026-09-01T11:00:00.000", sequence: 1 },
  ],
  isConfirmable: true,
  conflicts: [],
  overrideImpacts: [
    {
      bookingId: "rental-1",
      isSeriesOccurrence: false,
      startAt: "2026-09-01T10:00:00.000",
      endAt: "2026-09-01T14:00:00.000",
      releasedIntervals: [
        { facilityId: "chapel-id", startAt: "2026-09-01T10:00:00.000", endAt: "2026-09-01T11:00:00.000" },
        { facilityId: "gym-id", startAt: "2026-09-01T13:00:00.000", endAt: "2026-09-01T14:00:00.000" },
      ],
    },
  ],
  overrideReviewToken: "review-token-1",
  ...overrides,
});

const secondRentalImpact = () => ({
  bookingId: "rental-2",
  isSeriesOccurrence: true,
  startAt: "2026-09-01T10:30:00.000",
  endAt: "2026-09-01T11:00:00.000",
  releasedIntervals: [
    { facilityId: "chapel-id", startAt: "2026-09-01T10:30:00.000", endAt: "2026-09-01T11:00:00.000" },
  ],
});

const reviewError = (errorCode: string) => ({
  code: 409,
  message: "Conflict",
  details: { error_code: errorCode },
});

const renderDetailsWithPayment = () => {
  return render(
    <MemoryRouter initialEntries={[`/booking-details/one-time/${DRAFT_ID}`]}>
      <Routes>
        <Route element={<BookingDetailsPage />} path="/booking-details/one-time/:draftId" />
        <Route element={<p>Payment page</p>} path="/payment/one-time/:bookingId" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </MemoryRouter>
  );
};

describe("One-time Booking Details Override review and final confirmation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockFacility.getAvailability.mockResolvedValue({ rooms: [overrideRoom(), gymRoom()], maxBookingLines: 3 });
    mockFacility.previewQuote.mockResolvedValue({
      subtotalAmount: "75.00",
      discountAmount: "0.00",
      surchargeAmount: "0.00",
      quotedAmount: "75.00",
      currency: "CAD",
      roomLines: [],
    });
    mockFacility.getDiscountEligibility.mockResolvedValue({ discountCode: null, discountPercent: 0 });
  });

  afterEach(async () => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
    await change_app_language("en");
  });

  const confirmButton = () => screen.getByRole("button", { name: "Confirm" });

  it("lists every room interval each target Booking would release, including non-intersecting rooms", async () => {
    mockFacility.getBookingDraft.mockResolvedValue(reviewedOverrideDraft());
    renderDetailsWithPayment();

    const impacts = await screen.findByRole("region", { name: "Bookings this will replace" });
    expect(within(impacts).getByText("Existing booking 1")).toBeTruthy();
    expect(await within(impacts).findByText("Chapel")).toBeTruthy();
    expect(within(impacts).getByText("10:00 am – 11:00 am")).toBeTruthy();
    expect(within(impacts).getByText("Gym")).toBeTruthy();
    expect(within(impacts).getByText("1:00 pm – 2:00 pm")).toBeTruthy();
    expect(within(impacts).queryByText(/Cara Renter/)).toBeNull();
    expect(
      screen.queryByText(
        "One or more booking lines are no longer available. Return to the Timetable to change the draft."
      )
    ).toBeNull();
  });

  it("opens the final Override popup and submits the reviewed token only from Confirm and notify", async () => {
    const user = userEvent.setup();
    mockFacility.getBookingDraft.mockResolvedValue(reviewedOverrideDraft());
    let releaseCreate: (value: { id: string }) => void = () => {};
    mockFacility.createBooking.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseCreate = resolve;
        })
    );
    renderDetailsWithPayment();

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    await user.click(confirmButton());

    const finalPopup = await screen.findByRole("dialog", { name: "Confirm and notify" });
    expect(within(finalPopup).getByText("Existing booking 1")).toBeTruthy();
    expect(within(finalPopup).getByText("Gym")).toBeTruthy();
    expect(within(finalPopup).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(mockFacility.createBooking).not.toHaveBeenCalled();

    await user.click(within(finalPopup).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(confirmButton()).toHaveFocus();
    expect(mockFacility.createBooking).not.toHaveBeenCalled();

    await user.click(confirmButton());
    const reopened = await screen.findByRole("dialog", { name: "Confirm and notify" });
    const submit = within(reopened).getByRole("button", { name: "Confirm and notify" });
    await user.click(submit);
    expect(submit).toBeDisabled();
    await user.click(submit);

    expect(mockFacility.createBooking).toHaveBeenCalledTimes(1);
    expect(mockFacility.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        ministryId: "ministry-1",
        bookingDraftId: DRAFT_ID,
        overrideReviewToken: "review-token-1",
      })
    );
    releaseCreate({ id: "booking-1" });
    expect(await screen.findByText("Payment page")).toBeTruthy();
  });

  it("keeps the normal final confirmation without impacts and sends no review token", async () => {
    const user = userEvent.setup();
    mockFacility.getBookingDraft.mockResolvedValue(
      reviewedOverrideDraft({
        lines: [
          { facilityId: "gym-id", startAt: "2026-09-01T10:00:00.000", endAt: "2026-09-01T11:00:00.000", sequence: 1 },
        ],
        overrideImpacts: [],
        overrideReviewToken: null,
      })
    );
    mockFacility.createBooking.mockResolvedValue({ id: "booking-1" });
    renderDetailsWithPayment();

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    expect(screen.queryByRole("region", { name: "Bookings this will replace" })).toBeNull();
    await user.click(confirmButton());

    expect(await screen.findByText("Payment page")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Confirm and notify" })).toBeNull();
    expect(mockFacility.createBooking.mock.calls[0][0].overrideReviewToken ?? null).toBeNull();
  });

  it("refreshes the impact after a stale review and requires a renewed final acknowledgement", async () => {
    const user = userEvent.setup();
    mockFacility.getBookingDraft.mockResolvedValueOnce(reviewedOverrideDraft()).mockResolvedValue(
      reviewedOverrideDraft({
        overrideImpacts: [...reviewedOverrideDraft().overrideImpacts, secondRentalImpact()],
        overrideReviewToken: "review-token-2",
      })
    );
    mockFacility.createBooking
      .mockRejectedValueOnce(reviewError("FACILITY_BOOKING_OVERRIDE_REVIEW_STALE"))
      .mockResolvedValueOnce({ id: "booking-1" });
    renderDetailsWithPayment();

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
    expect(within(impacts).getByText("Existing repeated booking 2 (this occurrence only)")).toBeTruthy();
    expect(mockFacility.createBooking).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(confirmButton()).not.toBeDisabled());
    await user.click(confirmButton());
    await user.click(
      within(await screen.findByRole("dialog", { name: "Confirm and notify" })).getByRole("button", {
        name: "Confirm and notify",
      })
    );
    expect(await screen.findByText("Payment page")).toBeTruthy();
    expect(mockFacility.createBooking).toHaveBeenLastCalledWith(
      expect.objectContaining({ overrideReviewToken: "review-token-2" })
    );
  });

  it("refreshes the Draft when review is required instead of retrying the create", async () => {
    const user = userEvent.setup();
    mockFacility.getBookingDraft.mockResolvedValue(reviewedOverrideDraft());
    mockFacility.createBooking.mockRejectedValue(reviewError("FACILITY_BOOKING_OVERRIDE_REVIEW_REQUIRED"));
    renderDetailsWithPayment();

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
    await waitFor(() => expect(mockFacility.getBookingDraft).toHaveBeenCalledTimes(2));
    expect(mockFacility.createBooking).toHaveBeenCalledTimes(1);
  });

  it("blocks confirmation and shows the authorized contact when a new Ministry booking now holds the time", async () => {
    const user = userEvent.setup();
    mockFacility.getBookingDraft.mockResolvedValueOnce(reviewedOverrideDraft()).mockResolvedValue(
      reviewedOverrideDraft({
        isConfirmable: false,
        overrideImpacts: [],
        overrideReviewToken: null,
        conflicts: [
          {
            facilityId: "chapel-id",
            startAt: "2026-09-01T10:00:00.000",
            endAt: "2026-09-01T11:00:00.000",
            kind: "ministry",
            ministryName: "Choir",
            contactDisplayName: "Ada Steward",
            contactEmail: "ada@efcnewlife.org",
          },
        ],
      })
    );
    mockFacility.createBooking.mockRejectedValue(reviewError("FACILITY_BOOKING_SCHEDULING_CONFLICT"));
    renderDetailsWithPayment();

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
    const conflicts = await screen.findByRole("region", { name: "Conflicts blocking this booking" });
    expect(within(conflicts).getByText("Ministry booking")).toBeTruthy();
    expect(within(conflicts).getByText("Choir")).toBeTruthy();
    expect(within(conflicts).getByText("Ada Steward")).toBeTruthy();
    expect(within(conflicts).getByRole("link", { name: "ada@efcnewlife.org" })).toBeTruthy();
    expect(confirmButton()).toBeDisabled();
    expect(mockFacility.createBooking).toHaveBeenCalledTimes(1);
  });

  it("disables final confirmation when the Draft is no longer confirmable after a privilege change", async () => {
    mockFacility.getBookingDraft.mockResolvedValue(
      reviewedOverrideDraft({
        isConfirmable: false,
        overrideImpacts: [],
        overrideReviewToken: null,
        conflicts: [
          {
            facilityId: "chapel-id",
            startAt: "2026-09-01T10:00:00.000",
            endAt: "2026-09-01T11:00:00.000",
            kind: "occupancy",
            ministryName: null,
            contactDisplayName: null,
            contactEmail: null,
          },
        ],
      })
    );
    renderDetailsWithPayment();

    const conflicts = await screen.findByRole("region", { name: "Conflicts blocking this booking" });
    expect(within(conflicts).getByText("Unavailable")).toBeTruthy();
    expect(within(conflicts).queryByRole("link")).toBeNull();
    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    expect(confirmButton()).toBeDisabled();
  });

  it("uses the final Override copy in Traditional and Simplified Chinese", async () => {
    const user = userEvent.setup();
    mockFacility.getBookingDraft.mockResolvedValue(reviewedOverrideDraft());
    renderDetailsWithPayment();
    await waitFor(() => expect(confirmButton()).not.toBeDisabled());

    await change_app_language("zh-TW");
    expect(await screen.findByRole("region", { name: "將被取代的預訂" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "確認" }));
    expect(await screen.findByRole("dialog", { name: "確認並通知" })).toBeTruthy();
    await user.keyboard("{Escape}");

    await change_app_language("zh-CN");
    expect(await screen.findByRole("region", { name: "将被取代的预订" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "确认" }));
    expect(await screen.findByRole("dialog", { name: "确认并通知" })).toBeTruthy();
    expect(mockFacility.createBooking).not.toHaveBeenCalled();
  });
});
