import { describe, expect, it } from "vitest";
import { isMinistryMemberFromList, visitAccess } from "./visitAccess";

describe("visitAccess", () => {
  it("allows an unauthenticated visitor to reach login", () => {
    expect(
      visitAccess({
        isAuthenticated: false,
        isMinistryMember: false,
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
          isMinistryMember: false,
          pathname,
        })
      ).toBe("login");
    }
  );

  it("shows Not Found for an authenticated member on an unknown path", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        isMinistryMember: false,
        pathname: "/mystery",
      })
    ).toBe("not-found");
  });

  it("shows Not Found when an authenticated member who is not a Ministry member opens My Ministry", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        isMinistryMember: false,
        pathname: "/my-ministry",
      })
    ).toBe("not-found");
  });

  it("allows a Ministry member to open My Ministry", () => {
    expect(
      visitAccess({
        isAuthenticated: true,
        isMinistryMember: true,
        pathname: "/my-ministry",
      })
    ).toBe("allow");
  });

  it.each(["/", "/start-booking", "/contact", "/my-bookings", "/rooms", "/booking-details", "/my-profile"])(
    "allows an authenticated member to open %s",
    (pathname) => {
      expect(
        visitAccess({
          isAuthenticated: true,
          isMinistryMember: false,
          pathname,
        })
      ).toBe("allow");
    }
  );
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
