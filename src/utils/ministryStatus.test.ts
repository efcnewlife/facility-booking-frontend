import { describe, expect, it } from "vitest";
import {
  getMinistryStatusBadgeColor,
  isActiveMinistryStatus,
  isRejectedMinistryStatus,
  MINISTRY_STATUS,
} from "./ministryStatus";

describe("ministryStatus", () => {
  it("defines lifecycle status constants", () => {
    expect(MINISTRY_STATUS.PENDING_APPROVAL).toBe("pending_approval");
    expect(MINISTRY_STATUS.REJECTED).toBe("rejected");
    expect(MINISTRY_STATUS.ACTIVE).toBe("active");
  });

  it("detects active ministries", () => {
    expect(isActiveMinistryStatus(MINISTRY_STATUS.ACTIVE, true)).toBe(true);
    expect(isActiveMinistryStatus(MINISTRY_STATUS.ACTIVE, false)).toBe(false);
    expect(isActiveMinistryStatus(MINISTRY_STATUS.PENDING_APPROVAL, true)).toBe(false);
  });

  it("detects rejected ministries", () => {
    expect(isRejectedMinistryStatus(MINISTRY_STATUS.REJECTED)).toBe(true);
    expect(isRejectedMinistryStatus(MINISTRY_STATUS.ACTIVE)).toBe(false);
  });

  it("maps status to badge colors", () => {
    expect(getMinistryStatusBadgeColor(MINISTRY_STATUS.PENDING_APPROVAL)).toBe("warning");
    expect(getMinistryStatusBadgeColor(MINISTRY_STATUS.REJECTED)).toBe("error");
    expect(getMinistryStatusBadgeColor(MINISTRY_STATUS.ACTIVE)).toBe("success");
    expect(getMinistryStatusBadgeColor("unknown")).toBe("light");
  });
});
