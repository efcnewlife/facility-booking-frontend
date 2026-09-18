import { describe, expect, it } from "vitest";
import { buildLoginPathWithNext, isAllowlistedPostLoginPath, resolvePostLoginNext } from "./resolvePostLoginNext";

const MINISTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const BOOKING_ID = "6f9619ff-8b86-d011-b42d-00cf4fc964ff";

describe("isAllowlistedPostLoginPath", () => {
  it("allows ministry approval detail paths", () => {
    expect(isAllowlistedPostLoginPath(`/my-ministry/approvals/${MINISTRY_ID}`)).toBe(true);
  });

  it("rejects the approvals index without a ministry id", () => {
    expect(isAllowlistedPostLoginPath("/my-ministry/approvals")).toBe(false);
    expect(isAllowlistedPostLoginPath("/my-ministry/approvals/")).toBe(false);
  });

  it("rejects nested paths under approvals", () => {
    expect(isAllowlistedPostLoginPath(`/my-ministry/approvals/${MINISTRY_ID}/edit`)).toBe(false);
  });

  it("rejects non-uuid ministry ids", () => {
    expect(isAllowlistedPostLoginPath("/my-ministry/approvals/not-a-uuid")).toBe(false);
  });

  it("rejects unrelated member paths", () => {
    expect(isAllowlistedPostLoginPath("/my-ministry")).toBe(false);
    expect(isAllowlistedPostLoginPath("/")).toBe(false);
    expect(isAllowlistedPostLoginPath("/contact")).toBe(false);
  });

  it("allows a My Bookings Booking/Occurrence detail path (override-email deep link)", () => {
    expect(isAllowlistedPostLoginPath(`/my-bookings/${BOOKING_ID}`)).toBe(true);
  });

  it("rejects the My Bookings list and Series detail without a plain booking id", () => {
    expect(isAllowlistedPostLoginPath("/my-bookings")).toBe(false);
    expect(isAllowlistedPostLoginPath("/my-bookings/")).toBe(false);
    expect(isAllowlistedPostLoginPath(`/my-bookings/series/${BOOKING_ID}`)).toBe(false);
  });

  it("rejects a non-uuid booking id", () => {
    expect(isAllowlistedPostLoginPath("/my-bookings/not-a-uuid")).toBe(false);
  });
});

describe("resolvePostLoginNext", () => {
  it("returns the allowlisted path when next is valid", () => {
    const path = `/my-ministry/approvals/${MINISTRY_ID}`;
    expect(resolvePostLoginNext(path)).toBe(path);
    expect(resolvePostLoginNext(encodeURIComponent(path))).toBe(path);
  });

  it("returns home when next is missing or empty", () => {
    expect(resolvePostLoginNext(null)).toBe("/");
    expect(resolvePostLoginNext(undefined)).toBe("/");
    expect(resolvePostLoginNext("")).toBe("/");
  });

  it("rejects open redirects", () => {
    expect(resolvePostLoginNext("https://evil.example/phish")).toBe("/");
    expect(resolvePostLoginNext("//evil.example/phish")).toBe("/");
    expect(resolvePostLoginNext("/\\evil.example/phish")).toBe("/");
    expect(resolvePostLoginNext("javascript:alert(1)")).toBe("/");
  });

  it("rejects paths outside the allowlist", () => {
    expect(resolvePostLoginNext("/my-bookings")).toBe("/");
    expect(resolvePostLoginNext("/login")).toBe("/");
  });

  it("preserves an allowlisted search string", () => {
    const path = `/my-ministry/approvals/${MINISTRY_ID}?tab=pending`;
    expect(resolvePostLoginNext(path)).toBe(path);
  });

  it("normalizes trailing slashes on the pathname", () => {
    expect(resolvePostLoginNext(`/my-ministry/approvals/${MINISTRY_ID}/`)).toBe(
      `/my-ministry/approvals/${MINISTRY_ID}`
    );
  });
});

describe("buildLoginPathWithNext", () => {
  it("encodes the return path in the next query param", () => {
    const returnPath = `/my-ministry/approvals/${MINISTRY_ID}?tab=pending`;
    expect(buildLoginPathWithNext(returnPath)).toBe(`/login?next=${encodeURIComponent(returnPath)}`);
  });
});
