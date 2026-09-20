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

import "@/i18n";
import MinistryProfilePage from "./MinistryProfilePage";
import { MinistryProfileNotFoundError } from "@/api/services/ministryService";
import NotFoundPage from "@/pages/not-found/NotFoundPage";

const ACTIVE_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const REJECTED_ID = "4fa85f64-5717-4562-b3fc-2c963f66afa6";

const mockMinistryService = vi.hoisted(() => ({
  getProfile: vi.fn(),
}));

vi.mock("@/api/services/ministryService", () => ({
  default: mockMinistryService,
  MinistryProfileNotFoundError: class MinistryProfileNotFoundError extends Error {
    constructor() {
      super("Ministry profile not found");
      this.name = "MinistryProfileNotFoundError";
    }
  },
}));

vi.mock("@efcnewlife/newlife-ui", async () => {
  const React = await import("react");
  return {
    Alert: ({ message, title }: { message?: string; title?: string }) =>
      React.createElement("div", { role: "alert" }, title, message),
    Badge: ({ children }: { children?: React.ReactNode }) => React.createElement("span", null, children),
    Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) =>
      React.createElement("button", { onClick, type: "button" }, children),
    Spinner: () => React.createElement("div", null, "Loading"),
  };
});

const activeProfile = () => ({
  id: ACTIVE_ID,
  name: "Youth Ministry",
  purpose: "Serve local youth",
  status: "active",
  hasPriorityBooking: true,
  submittedAt: "2026-01-01T00:00:00.000Z",
  approvedAt: "2026-01-05T00:00:00.000Z",
  rejectedAt: null,
  rejectionReason: null,
  targetAudiences: [{ id: "ta-1", code: "youth", name: "Youth" }],
  stewards: [{ memberRole: "primary", displayName: "Jane Doe", email: "jane@example.com" }],
  ownerPosition: { name: "Youth Pastor", incumbentDisplayName: "John Smith", incumbentEmail: "john@example.com" },
});

const rejectedVacantProfile = () => ({
  id: REJECTED_ID,
  name: "Outreach",
  purpose: null,
  status: "rejected",
  hasPriorityBooking: false,
  submittedAt: "2026-01-01T00:00:00.000Z",
  approvedAt: null,
  rejectedAt: "2026-01-03T00:00:00.000Z",
  rejectionReason: "Missing a secondary steward",
  targetAudiences: [],
  stewards: [],
  ownerPosition: null,
});

const renderAt = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<div>My applications</div>} path="/my-ministry" />
        <Route element={<MinistryProfilePage />} path="/my-ministry/:ministryId" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </MemoryRouter>
  );
};

describe("MinistryProfilePage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders lifecycle, Target Audiences, Priority Booking, Stewards, and Owner Position for an Active Profile", async () => {
    mockMinistryService.getProfile.mockResolvedValue(activeProfile());

    renderAt(`/my-ministry/${ACTIVE_ID}`);

    expect(await screen.findByRole("heading", { name: "Youth Ministry" })).toBeInTheDocument();
    expect(screen.getByText("Youth")).toBeInTheDocument();
    expect(screen.getByText("Serve local youth")).toBeInTheDocument();
    expect(document.body.textContent).toContain("Jane Doe");
    expect(document.body.textContent).toContain("John Smith");
    expect(document.body.textContent).toContain("john@example.com");

    expect(screen.getByRole("link", { name: "Start booking" })).toHaveAttribute(
      "href",
      `/start-booking?step=select_ministry&ministry=1&ministryId=${ACTIVE_ID}&source=my-ministry`
    );
  });

  it("shows the vacancy state and rejection reason, and hides Start booking, for a Rejected Profile", async () => {
    mockMinistryService.getProfile.mockResolvedValue(rejectedVacantProfile());

    renderAt(`/my-ministry/${REJECTED_ID}`);

    expect(await screen.findByRole("heading", { name: "Outreach" })).toBeInTheDocument();
    expect(screen.getByText("Missing a secondary steward")).toBeInTheDocument();
    expect(screen.getByText(/vacant/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start booking" })).not.toBeInTheDocument();
  });

  it("preserves the My applications return context on the back link", async () => {
    mockMinistryService.getProfile.mockResolvedValue(activeProfile());

    renderAt(`/my-ministry/${ACTIVE_ID}`);

    expect(await screen.findByRole("link", { name: /Back to My applications/i })).toHaveAttribute(
      "href",
      "/my-ministry"
    );
  });

  it("renders the member-facing Not Found view for a malformed Profile id", async () => {
    renderAt("/my-ministry/not-a-uuid");

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(mockMinistryService.getProfile).not.toHaveBeenCalled();
  });

  it("renders the member-facing Not Found view for a missing or unauthorized Profile", async () => {
    mockMinistryService.getProfile.mockRejectedValue(new MinistryProfileNotFoundError());

    renderAt(`/my-ministry/${ACTIVE_ID}`);

    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
