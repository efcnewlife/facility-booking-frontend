import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ACTIVE_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const UNAVAILABLE_ID = "4fa85f64-5717-4562-b3fc-2c963f66afa6";
const INACTIVE_ID = "5fa85f64-5717-4562-b3fc-2c963f66afa6";

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
  deleteAllMyBookingDrafts: vi.fn().mockResolvedValue(undefined),
  deleteAllMyBookingSeriesDrafts: vi.fn().mockResolvedValue(undefined),
  getRecurringBookingWindowStatus: vi.fn().mockResolvedValue({ isOpen: true, nextOpeningDate: null }),
}));

const mockMinistryService = vi.hoisted(() => ({
  listMine: vi.fn(),
}));

vi.mock("@/api/services/facilityService", () => ({
  default: mockFacility,
  facilityService: mockFacility,
}));

vi.mock("@/api/services/ministryService", () => ({
  default: mockMinistryService,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "member-1" } }),
}));

// StartBookingPage always renders CreateMinistryModal (closed), which calls
// useMinistryMembership unconditionally — this mock stands in for its provider.
vi.mock("@/context/MinistryMembershipContext", () => ({
  useMinistryMembership: () => ({
    isMinistryMember: true,
    canAccessMyMinistry: true,
    isLoading: false,
    refreshMembership: vi.fn(),
  }),
}));

vi.mock("@efcnewlife/newlife-ui", async () => {
  const React = await import("react");
  type SelectOption = { value: string; label: string };
  return {
    Alert: ({ message, title }: { message?: string; title?: string }) =>
      React.createElement("div", { role: "alert" }, title, message),
    Button: ({
      children,
      disabled,
      onClick,
      startIcon,
    }: {
      children?: React.ReactNode;
      disabled?: boolean;
      onClick?: () => void;
      startIcon?: React.ReactNode;
    }) => {
      void startIcon;
      return React.createElement("button", { disabled, onClick, type: "button" }, children);
    },
    ComboBox: () => null,
    DatePicker: () => null,
    Input: () => null,
    ModalForm: ({ children, isOpen, title }: { children?: React.ReactNode; isOpen?: boolean; title?: string }) =>
      isOpen ? React.createElement("div", { role: "dialog", "aria-label": title }, children) : null,
    Radio: ({
      checked,
      id,
      label,
      onChange,
      value,
    }: {
      checked?: boolean;
      id?: string;
      label?: string;
      onChange?: (value: string) => void;
      value?: string;
    }) =>
      React.createElement("label", { htmlFor: id }, [
        React.createElement("input", {
          checked,
          id,
          key: "input",
          onChange: () => onChange?.(value ?? ""),
          type: "radio",
        }),
        label,
      ]),
    Select: ({
      id,
      label,
      onChange,
      options,
      placeholder,
      value,
    }: {
      id?: string;
      label?: string;
      onChange?: (value: string | null) => void;
      options?: SelectOption[];
      placeholder?: string;
      value?: string | null;
    }) =>
      React.createElement(
        "select",
        {
          "aria-label": label ?? placeholder,
          id,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange?.(event.target.value || null),
          value: value ?? "",
        },
        [
          React.createElement("option", { key: "placeholder", value: "" }, placeholder ?? ""),
          ...(options ?? []).map((option) =>
            React.createElement("option", { key: option.value, value: option.value }, option.label)
          ),
        ]
      ),
    TextArea: () => null,
    TimePicker: () => null,
    cn: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" "),
  };
});

import "@/i18n";
import StartBookingPage from "@/pages/start-booking/StartBookingPage";

const activeMinistries = () => ({
  items: [
    { id: ACTIVE_ID, name: "Youth Ministry", status: "active", isActive: true },
    { id: INACTIVE_ID, name: "Retired Ministry", status: "active", isActive: false },
  ],
});

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderAt = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationDisplay />
      <Routes>
        <Route element={<StartBookingPage />} path="/start-booking" />
      </Routes>
    </MemoryRouter>
  );
};

describe("Ministry Profile booking handoff on Start booking", () => {
  beforeEach(() => {
    mockMinistryService.listMine.mockResolvedValue(activeMinistries());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("preselects the Ministry and shows the automatic-selection banner for a valid handoff", async () => {
    renderAt(`/start-booking?step=select_ministry&ministry=1&ministryId=${ACTIVE_ID}&source=my-ministry`);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Ministry selected/i);
    expect(await screen.findByRole("combobox")).toHaveValue(ACTIVE_ID);
    expect(screen.getByTestId("location")).toHaveTextContent(
      `/start-booking?step=select_ministry&ministry=1&ministryId=${ACTIVE_ID}&source=my-ministry`
    );
  });

  it("removes the Ministry id and source, and shows no banner, for an absent handoff id", async () => {
    renderAt(`/start-booking?step=select_ministry&ministry=1&ministryId=${UNAVAILABLE_ID}&source=my-ministry`);

    await screen.findByRole("combobox");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByTestId("location")).toHaveTextContent("/start-booking?step=select_ministry&ministry=1");
  });

  it("removes the Ministry id and source, and shows no banner, for an inactive handoff Ministry", async () => {
    renderAt(`/start-booking?step=select_ministry&ministry=1&ministryId=${INACTIVE_ID}&source=my-ministry`);

    await screen.findByRole("combobox");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.getByTestId("location")).toHaveTextContent("/start-booking?step=select_ministry&ministry=1");
  });

  it("shows no handoff banner for ordinary Start booking without the source marker", async () => {
    renderAt("/start-booking?step=select_ministry&ministry=1");

    await screen.findByRole("combobox");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("ignores a stray ministryId that arrives without the source marker", async () => {
    renderAt(`/start-booking?step=select_ministry&ministry=1&ministryId=${ACTIVE_ID}`);

    await screen.findByRole("combobox");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });
});
