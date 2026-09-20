import { describe, expect, it } from "vitest";
import { isMinistryProfilePath, ministryProfilePath, parseMinistryProfileId } from "./ministryProfilePath";

describe("parseMinistryProfileId", () => {
  it("reads a Ministry id from the typed Profile route", () => {
    expect(parseMinistryProfileId("/my-ministry/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    );
  });

  it("rejects a missing, malformed, or trailing-segment path", () => {
    expect(parseMinistryProfileId("/my-ministry/not-a-uuid")).toBe(null);
    expect(parseMinistryProfileId("/my-ministry/")).toBe(null);
    expect(parseMinistryProfileId("/my-ministry/3fa85f64-5717-4562-b3fc-2c963f66afa6/extra")).toBe(null);
  });

  it("does not treat the approval detail route as a Profile route", () => {
    expect(parseMinistryProfileId("/my-ministry/approvals/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(null);
  });

  it("does not treat the My Ministry list route as a Profile route", () => {
    expect(parseMinistryProfileId("/my-ministry")).toBe(null);
  });
});

describe("isMinistryProfilePath", () => {
  it("is true only for a valid typed Ministry Profile path", () => {
    expect(isMinistryProfilePath("/my-ministry/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(true);
    expect(isMinistryProfilePath("/my-ministry/approvals/3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(false);
  });
});

describe("ministryProfilePath", () => {
  it("builds the typed Ministry Profile route", () => {
    expect(ministryProfilePath("3fa85f64-5717-4562-b3fc-2c963f66afa6")).toBe(
      "/my-ministry/3fa85f64-5717-4562-b3fc-2c963f66afa6"
    );
  });
});
