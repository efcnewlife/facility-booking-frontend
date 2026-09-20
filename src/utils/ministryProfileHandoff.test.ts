import { describe, expect, it } from "vitest";
import {
  clearMinistryProfileHandoffParams,
  readMinistryProfileHandoffMinistryId,
  startBookingMinistryProfileHandoffPath,
} from "./ministryProfileHandoff";

describe("startBookingMinistryProfileHandoffPath", () => {
  it("builds the Start booking select-ministry URL with the handoff marker", () => {
    expect(startBookingMinistryProfileHandoffPath("ministry-1")).toBe(
      "/start-booking?step=select_ministry&ministry=1&ministryId=ministry-1&source=my-ministry"
    );
  });
});

describe("readMinistryProfileHandoffMinistryId", () => {
  it("reads the ministry id when the source marker is present", () => {
    const params = new URLSearchParams("step=select_ministry&ministryId=ministry-1&source=my-ministry");
    expect(readMinistryProfileHandoffMinistryId(params)).toBe("ministry-1");
  });

  it("is null without the source marker, even with a ministryId present", () => {
    const params = new URLSearchParams("step=select_ministry&ministryId=ministry-1");
    expect(readMinistryProfileHandoffMinistryId(params)).toBe(null);
  });

  it("is null for an unrelated source value", () => {
    const params = new URLSearchParams("step=select_ministry&ministryId=ministry-1&source=elsewhere");
    expect(readMinistryProfileHandoffMinistryId(params)).toBe(null);
  });
});

describe("clearMinistryProfileHandoffParams", () => {
  it("removes only the handoff params, keeping the rest untouched", () => {
    const params = new URLSearchParams("step=select_ministry&ministry=1&ministryId=ministry-1&source=my-ministry");
    const next = clearMinistryProfileHandoffParams(params);
    expect(next.toString()).toBe("step=select_ministry&ministry=1");
  });
});
