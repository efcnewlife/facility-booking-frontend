import { describe, expect, it } from "vitest";
import {
  isMinistryApprovalDetailPath,
  ministryApprovalDetailPath,
  myMinistryApprovalsTabPath,
  parseMinistryApprovalDetailId,
} from "./ministryApprovalPath";

const MINISTRY_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("ministryApprovalPath", () => {
  it("builds detail and tab paths", () => {
    expect(ministryApprovalDetailPath(MINISTRY_ID)).toBe(`/my-ministry/approvals/${MINISTRY_ID}`);
    expect(myMinistryApprovalsTabPath()).toBe("/my-ministry?tab=approvals");
  });

  it("parses a valid approval detail pathname", () => {
    expect(parseMinistryApprovalDetailId(`/my-ministry/approvals/${MINISTRY_ID}`)).toBe(MINISTRY_ID);
    expect(parseMinistryApprovalDetailId(`/my-ministry/approvals/${MINISTRY_ID}/`)).toBe(MINISTRY_ID);
    expect(isMinistryApprovalDetailPath(`/my-ministry/approvals/${MINISTRY_ID}`)).toBe(true);
  });

  it("rejects invalid approval detail pathnames", () => {
    expect(parseMinistryApprovalDetailId("/my-ministry/approvals")).toBeNull();
    expect(parseMinistryApprovalDetailId("/my-ministry/approvals/not-a-uuid")).toBeNull();
    expect(parseMinistryApprovalDetailId(`/my-ministry/approvals/${MINISTRY_ID}/edit`)).toBeNull();
    expect(isMinistryApprovalDetailPath("/my-ministry")).toBe(false);
  });
});
