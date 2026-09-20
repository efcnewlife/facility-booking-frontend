import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
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
import MyApplicationsTab from "./MyApplicationsTab";

const mockMinistryService = vi.hoisted(() => ({
  listMine: vi.fn(),
  getApplicationDetail: vi.fn(),
}));

vi.mock("@/api/services/ministryService", () => ({
  default: mockMinistryService,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@efcnewlife/newlife-ui", async () => {
  const React = await import("react");
  return {
    Alert: ({ message, title }: { message?: string; title?: string }) =>
      React.createElement("div", { role: "alert" }, title, message),
    Badge: ({ children }: { children?: React.ReactNode }) => React.createElement("span", null, children),
    Button: ({
      children,
      onClick,
      disabled,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => React.createElement("button", { onClick, disabled, type: "button" }, children),
    Spinner: ({ text }: { text?: string }) => React.createElement("div", null, text ?? "Loading"),
    ModalForm: ({ isOpen, children }: { isOpen?: boolean; children?: React.ReactNode }) =>
      isOpen ? React.createElement("div", { role: "dialog" }, children) : null,
    ComboBox: () => null,
    Input: () => null,
  };
});

const ProfileRouteStub = () => {
  const { ministryId } = useParams<{ ministryId: string }>();
  return <div data-testid="profile-stub">Profile for {ministryId}</div>;
};

const renderTab = () => {
  return render(
    <MemoryRouter initialEntries={["/my-ministry"]}>
      <Routes>
        <Route element={<MyApplicationsTab />} path="/my-ministry" />
        <Route element={<ProfileRouteStub />} path="/my-ministry/:ministryId" />
      </Routes>
    </MemoryRouter>
  );
};

const ministries = () => ({
  items: [
    { id: "ministry-active", name: "Youth Ministry", status: "active", isActive: true },
    { id: "ministry-pending", name: "Choir", status: "pending_approval", isActive: false },
    {
      id: "ministry-rejected",
      name: "Outreach",
      status: "rejected",
      isActive: false,
      rejectionReason: "Missing steward",
    },
  ],
});

describe("MyApplicationsTab entry into Ministry Profile", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("links the Ministry name and exposes View details for every lifecycle state", async () => {
    mockMinistryService.listMine.mockResolvedValue(ministries());
    mockMinistryService.getApplicationDetail.mockResolvedValue({
      id: "ministry-rejected",
      rejectionReason: "Missing steward",
    });

    renderTab();

    expect(await screen.findByRole("link", { name: "Youth Ministry" })).toHaveAttribute(
      "href",
      "/my-ministry/ministry-active"
    );
    expect(screen.getByRole("link", { name: "Choir" })).toHaveAttribute("href", "/my-ministry/ministry-pending");
    expect(screen.getByRole("link", { name: "Outreach" })).toHaveAttribute("href", "/my-ministry/ministry-rejected");

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    items.forEach((item) => {
      expect(within(item).getByRole("link", { name: "View details" })).toBeInTheDocument();
    });
  });

  it("sends Start booking through the same Ministry Profile handoff as the Profile page", async () => {
    mockMinistryService.listMine.mockResolvedValue(ministries());
    mockMinistryService.getApplicationDetail.mockResolvedValue({
      id: "ministry-rejected",
      rejectionReason: "Missing steward",
    });

    renderTab();

    const activeItem = (await screen.findByRole("link", { name: "Youth Ministry" })).closest("li");
    expect(activeItem).not.toBeNull();
    expect(within(activeItem as HTMLElement).getByRole("link", { name: "Start booking" })).toHaveAttribute(
      "href",
      "/start-booking?step=select_ministry&ministry=1&ministryId=ministry-active&source=my-ministry"
    );

    const pendingItem = (await screen.findByRole("link", { name: "Choir" })).closest("li");
    expect(pendingItem).not.toBeNull();
    expect(within(pendingItem as HTMLElement).queryByRole("link", { name: "Start booking" })).not.toBeInTheDocument();
  });

  it("navigates to the Ministry Profile route when View details is clicked", async () => {
    mockMinistryService.listMine.mockResolvedValue(ministries());
    mockMinistryService.getApplicationDetail.mockResolvedValue({
      id: "ministry-rejected",
      rejectionReason: "Missing steward",
    });

    renderTab();

    const activeItem = (await screen.findByRole("link", { name: "Youth Ministry" })).closest("li");
    expect(activeItem).not.toBeNull();
    const viewDetailsLink = within(activeItem as HTMLElement).getByRole("link", { name: "View details" });

    await userEvent.click(viewDetailsLink);

    expect(await screen.findByTestId("profile-stub")).toHaveTextContent("Profile for ministry-active");
  });
});
