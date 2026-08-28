import { describe, expect, it } from "vitest";
import { isMinistryMemberFromList, visitAccess } from "./visitAccess";

describe("visitAccess", () => {
  it("allows an unauthenticated visitor to reach login", () => {
    expect(
      visitAccess({
        isAuthenticated: false,
        canAccessMyMinistry: false,
        pathname: "/login",
      })
    ).toBe("allow");
  });

  it.each(["/", "/start-booking", "/contact", "/my-ministry", "/mystery"])(
    "sends an unauthenticated visitor from %s to login",
    (pathname) => {
      expect(
        visitAccess({
          isAuthenticated: false,
          canAccessMyMinistry: false,
          pathname,
        })
      ).toBe("login");
    }
  );

  it("shows Not Found for an authenticated member on an unknown path", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        canAccessMyMinistry: false,
        pathname: "/mystery",
      })
    ).toBe("not-found");
  });

  it("shows Not Found when an authenticated member without My Ministry access opens My Ministry", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        canAccessMyMinistry: false,
        pathname: "/my-ministry",
      })
    ).toBe("not-found");
  });

  it("allows a member with My Ministry access to open My Ministry", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        canAccessMyMinistry: true,
        pathname: "/my-ministry",
      })
    ).toBe("allow");
  });

  it("allows an authenticated member to open a ministry approval detail path", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        canAccessMyMinistry: false,
        pathname: "/my-ministry/approvals/3fa85f64-5717-4562-b3fc-2c963f66afa6",
      })
    ).toBe("allow");
  });

  it("shows Not Found for an invalid ministry approval detail path", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        canAccessMyMinistry: false,
        pathname: "/my-ministry/approvals/not-a-uuid",
      })
    ).toBe("not-found");
  });

  it.each([
    "/",
    "/start-booking",
    "/contact",
    "/my-bookings",
    "/rooms",
    "/booking-details",
    "/my-profile",
    "/payment/3fa85f64-5717-4562-b3fc-2c963f66afa6",
  ])("allows an authenticated member to open %s", (pathname) => {
    expect(
      visitAccess({
        isAuthenticated: true,
        canAccessMyMinistry: false,
        pathname,
      })
    ).toBe("allow");
  });

  it("shows Not Found for Payment without a booking UUID", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        canAccessMyMinistry: false,
        pathname: "/payment",
      })
    ).toBe("not-found");
    expect(
      visitAccess({
        isAuthenticated: true,
        canAccessMyMinistry: false,
        pathname: "/payment/not-a-uuid",
      })
    ).toBe("not-found");
  });
});

describe("isMinistryMemberFromList", () => {
  it("is false when listMine returns no records", () => {
    expect(isMinistryMemberFromList([])).toBe(false);
  });

  it("is true when listMine returns any record, including pending or rejected", () => {
    expect(isMinistryMemberFromList([{ id: "m-1", status: "pending_approval" }])).toBe(true);
    expect(isMinistryMemberFromList([{ id: "m-2", status: "rejected" }])).toBe(true);
    expect(isMinistryMemberFromList([{ id: "m-3", status: "active" }])).toBe(true);
  });
});
