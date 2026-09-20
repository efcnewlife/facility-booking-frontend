import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    Spinner: ({ text }: { text?: string }) => React.createElement("div", null, text ?? "Loading"),
    cn: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" "),
  };
});

import "@/i18n";
import ministryService from "@/api/services/ministryService";
import BookingDetailsPage from "@/pages/booking-details/BookingDetailsPage";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import RoomFilterPage from "@/pages/rooms/RoomFilterPage";
import { saveTimetableCart } from "@/utils/timetableCartStorage";

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

const draftDetail = (overrides: Partial<{ ministryId: string | null; title: string }> = {}) => ({
  id: DRAFT_ID,
  date: "2026-09-01",
  title: overrides.title ?? "Choir practice",
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

// Empty cells so the grid has no bookable interval, avoiding the timetable's scroll-into-view effect
// (which calls window.matchMedia, unavailable in this jsdom test environment) — irrelevant here since
// this suite never interacts with the grid, only the cart built from lines seeded via localStorage.
const timetableAvailability = () => ({
  rooms: [{ id: "gym-id", code: "gym", name: "Gym", capacity: 200, photoUrls: [], templates: [], cells: [] }],
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

  it("shows the selected Ministry's name in the summary, and only when a Ministry is selected", async () => {
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
  });

  it("shows no Ministry row for a non-Ministry proposal", async () => {
    renderTimetableFlow("/rooms?date=2026-09-01");

    await waitFor(() => expect(mockFacility.previewQuote).toHaveBeenCalled());
    expect(screen.queryByText(/^Ministry:/)).toBeNull();
  });
});
