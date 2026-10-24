import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFacility } = vi.hoisted(() => {
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
  return {
    mockFacility: {
      getAvailability: vi.fn(),
      getRecurringBookingWindowStatus: vi.fn(),
      previewBookingSeries: vi.fn(),
    },
  };
});

vi.mock("@/api/services/facilityService", () => ({
  default: mockFacility,
  facilityService: mockFacility,
}));

vi.mock("@/api/services/ministryService", () => ({
  default: {
    listMine: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

import { change_app_language } from "@/i18n";
import RoomFilterPage from "@/pages/rooms/RoomFilterPage";

// 10:00 in America/Toronto on 2026-10-24.
const NOW = new Date("2026-10-24T14:00:00Z");

const LocationProbe = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{location.pathname}</output>
      <button onClick={() => navigate(-1)} type="button">
        History back
      </button>
      <button onClick={() => navigate("/my-bookings")} type="button">
        Leave page
      </button>
    </>
  );
};

const renderRooms = (entry: string) => {
  render(
    <MemoryRouter initialEntries={["/previous", entry]} initialIndex={1}>
      <Routes>
        <Route element={<RoomFilterPage />} path="/rooms" />
        <Route element={<p>Book Now page</p>} path="/start-booking" />
        <Route element={<p>My Bookings page</p>} path="/my-bookings" />
        <Route element={<p>Previous page</p>} path="/previous" />
      </Routes>
      <LocationProbe />
    </MemoryRouter>
  );
};

const currentPath = () => screen.getByTestId("location").textContent;

const advanceSeconds = (seconds: number) => {
  for (let i = 0; i < seconds; i += 1) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

describe("Rooms timetable invalid date", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ now: NOW });
    await change_app_language("en");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it.each([
    ["yesterday", "/rooms?date=2026-10-23&ministryId=m-1"],
    ["today + 1 year + 1 day", "/rooms?date=2027-10-25"],
    ["malformed", "/rooms?date=abc"],
    ["missing", "/rooms"],
    ["repeated with invalid date", "/rooms?frequency=repeated&date=2026-10-23&weekday=5"],
    ["repeated with invalid lastDate", "/rooms?frequency=repeated&date=2026-10-30&weekday=5&lastDate=2026-10-23"],
    [
      "repeated proposal with a past date",
      "/rooms?frequency=repeated&date=2026-10-23&weekday=5&lastDate=2026-12-18&start=09:00&end=10:00&rooms=gym-id",
    ],
  ])("shows the notice and replaces history with Book Now after 5 seconds (%s)", (_label, entry) => {
    renderRooms(entry);

    expect(screen.getByText("Selected date is not valid")).toBeInTheDocument();
    expect(screen.getByText(/Returning to Book Now in 5 seconds/)).toBeInTheDocument();
    expect(mockFacility.getAvailability).not.toHaveBeenCalled();
    expect(mockFacility.getRecurringBookingWindowStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole("form", { name: "Search details" })).not.toBeInTheDocument();

    advanceSeconds(4);
    expect(screen.getByText(/Returning to Book Now in 1 second/)).toBeInTheDocument();
    expect(currentPath()).toBe("/rooms");

    advanceSeconds(1);
    expect(currentPath()).toBe("/start-booking");
    expect(screen.getByText("Book Now page")).toBeInTheDocument();
    expect(mockFacility.getAvailability).not.toHaveBeenCalled();
    expect(mockFacility.previewBookingSeries).not.toHaveBeenCalled();

    // The invalid URL was replaced, so Back skips it.
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(currentPath()).toBe("/previous");
  });

  it("does not navigate after the user leaves during the countdown", () => {
    renderRooms("/rooms?date=2026-10-23");

    advanceSeconds(2);
    fireEvent.click(screen.getByRole("button", { name: "Leave page" }));
    advanceSeconds(10);

    expect(currentPath()).toBe("/my-bookings");
  });
});
