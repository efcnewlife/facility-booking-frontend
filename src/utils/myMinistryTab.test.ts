import { describe, expect, it } from "vitest";
import { applyMyMinistryTabToSearchParams, resolveMyMinistryTab } from "./myMinistryTab";

describe("resolveMyMinistryTab", () => {
  it("resolves omitted tab to applications", () => {
    expect(resolveMyMinistryTab(null)).toBe("applications");
  });

  it("resolves tab=approvals to approvals", () => {
    expect(resolveMyMinistryTab("approvals")).toBe("approvals");
  });

  it("resolves tab=applications to applications", () => {
    expect(resolveMyMinistryTab("applications")).toBe("applications");
  });

  it("falls back to applications for unknown tab values", () => {
    expect(resolveMyMinistryTab("pending")).toBe("applications");
    expect(resolveMyMinistryTab("")).toBe("applications");
  });
});

describe("applyMyMinistryTabToSearchParams", () => {
  it("clears tab when selecting applications so URL does not keep approvals", () => {
    const current = new URLSearchParams("tab=approvals");
    const next = applyMyMinistryTabToSearchParams(current, "applications");

    expect(next.get("tab")).toBeNull();
    expect(resolveMyMinistryTab(next.get("tab"))).toBe("applications");
  });

  it("sets tab=approvals when selecting approvals", () => {
    const current = new URLSearchParams();
    const next = applyMyMinistryTabToSearchParams(current, "approvals");

    expect(next.get("tab")).toBe("approvals");
    expect(resolveMyMinistryTab(next.get("tab"))).toBe("approvals");
  });

  it("preserves unrelated search params when switching tabs", () => {
    const current = new URLSearchParams("foo=1&tab=approvals");
    const next = applyMyMinistryTabToSearchParams(current, "applications");

    expect(next.get("foo")).toBe("1");
    expect(next.get("tab")).toBeNull();
  });
});
