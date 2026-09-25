import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  });
});

import i18n, { change_app_language } from "@/i18n";
import TopNavBar from "./TopNavBar";

vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock("@/context/MinistryMembershipContext", () => ({
  useMinistryMembership: () => ({ canAccessMyMinistry: true }),
}));

beforeEach(async () => {
  await change_app_language("en");
});
afterEach(cleanup);

it("changes language from the avatar menu using the real Select", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <TopNavBar />
    </MemoryRouter>
  );
  await user.click(screen.getByRole("button", { expanded: false }));
  await user.click(screen.getByRole("combobox"));
  await user.click(screen.getByRole("option", { name: /Traditional/ }));
  expect(screen.getByRole("menu")).toBeVisible();
  expect(screen.getByRole("link", { name: "立即預訂" })).toBeVisible();
  expect(i18n.language).toBe("zh-TW");
  expect(localStorage.getItem("app_locale")).toBe("zh-TW");
});

it("switches between all supported languages without closing the avatar menu", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <TopNavBar />
    </MemoryRouter>
  );
  await user.click(screen.getByRole("button", { expanded: false }));
  for (const locale of ["zh-CN", "zh-TW", "en"] as const) {
    await user.click(screen.getByRole("combobox"));
    const label = { en: "english", "zh-TW": "traditionalChinese", "zh-CN": "simplifiedChinese" }[locale];
    await user.click(screen.getByRole("option", { name: i18n.t(`language:${label}`) }));
    expect(i18n.language).toBe(locale);
    expect(localStorage.getItem("app_locale")).toBe(locale);
    expect(screen.getByRole("menu")).toBeVisible();
  }
});

it("still closes the avatar menu on an outside press and profile navigation", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <TopNavBar />
    </MemoryRouter>
  );
  await user.click(screen.getByRole("button", { expanded: false }));
  await user.click(document.body);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { expanded: false }));
  await user.click(screen.getByRole("menuitem", { name: "My Profile" }));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
