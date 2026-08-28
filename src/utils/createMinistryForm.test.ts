import { describe, expect, it } from "vitest";
import {
  applyTargetAudienceSelection,
  canSelectSecondarySteward,
  isTargetAudienceSelectionValid,
  shouldSearchSecondaryStewards,
  TARGET_AUDIENCE_ALL_AGES_CODE,
  validateCreateMinistryForm,
  type MinistryCatalogItem,
} from "./createMinistryForm";

const catalog: MinistryCatalogItem[] = [
  { id: "aud-adults", code: "adults", name: "Adults" },
  { id: "aud-all", code: TARGET_AUDIENCE_ALL_AGES_CODE, name: "All Ages" },
  { id: "aud-youth", code: "youths", name: "Youths" },
];

const baseValues = {
  ministryName: "Youth Group",
  ministryTypeId: "type-1",
  ownerPositionId: "pos-1",
  purpose: "Weekly fellowship",
  localeId: "locale-1",
  targetAudienceIds: [] as string[],
  secondaryStewardIds: ["user-2"],
};

describe("isTargetAudienceSelectionValid", () => {
  it("allows empty selection", () => {
    expect(isTargetAudienceSelectionValid([], catalog)).toBe(true);
  });

  it("allows all_ages alone", () => {
    expect(isTargetAudienceSelectionValid(["aud-all"], catalog)).toBe(true);
  });

  it("rejects all_ages combined with other audiences", () => {
    expect(isTargetAudienceSelectionValid(["aud-all", "aud-adults"], catalog)).toBe(false);
  });
});

describe("applyTargetAudienceSelection", () => {
  it("selecting all_ages replaces other selections", () => {
    expect(applyTargetAudienceSelection(["aud-adults"], "aud-all", catalog, true)).toEqual(["aud-all"]);
  });

  it("selecting another audience removes all_ages", () => {
    expect(applyTargetAudienceSelection(["aud-all"], "aud-adults", catalog, true)).toEqual(["aud-adults"]);
  });

  it("deselecting removes the audience", () => {
    expect(applyTargetAudienceSelection(["aud-adults", "aud-youth"], "aud-adults", catalog, false)).toEqual([
      "aud-youth",
    ]);
  });
});

describe("canSelectSecondarySteward", () => {
  it("blocks selecting the current user", () => {
    expect(canSelectSecondarySteward("user-1", "user-1")).toBe(false);
  });

  it("allows another user", () => {
    expect(canSelectSecondarySteward("user-2", "user-1")).toBe(true);
  });
});

describe("shouldSearchSecondaryStewards", () => {
  it("requires at least three characters", () => {
    expect(shouldSearchSecondaryStewards("ab")).toBe(false);
    expect(shouldSearchSecondaryStewards("abc")).toBe(true);
  });
});

describe("validateCreateMinistryForm", () => {
  it("returns null for a complete valid form", () => {
    expect(validateCreateMinistryForm(baseValues, catalog, "user-1")).toBeNull();
  });

  it("requires ministry type", () => {
    expect(validateCreateMinistryForm({ ...baseValues, ministryTypeId: "" }, catalog, "user-1")).toBe(
      "createMinistryValidation"
    );
  });

  it("requires at least one secondary steward", () => {
    expect(validateCreateMinistryForm({ ...baseValues, secondaryStewardIds: [] }, catalog, "user-1")).toBe(
      "secondaryStewardRequired"
    );
  });

  it("rejects self as secondary steward", () => {
    expect(validateCreateMinistryForm({ ...baseValues, secondaryStewardIds: ["user-1"] }, catalog, "user-1")).toBe(
      "secondaryStewardSelf"
    );
  });

  it("rejects all_ages combined with other audiences", () => {
    expect(
      validateCreateMinistryForm({ ...baseValues, targetAudienceIds: ["aud-all", "aud-adults"] }, catalog, "user-1")
    ).toBe("targetAudienceAllAgesExclusive");
  });
});
