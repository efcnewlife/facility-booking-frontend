import { describe, expect, it } from "vitest";
import { canOpenImagePreview, nextPreviewIndex, previousPreviewIndex } from "./imagePreview";

describe("canOpenImagePreview", () => {
  it("does not open when there are no photos", () => {
    expect(canOpenImagePreview([])).toBe(false);
  });

  it("opens when the room has at least one photo", () => {
    expect(canOpenImagePreview(["https://cdn.example/a.jpg"])).toBe(true);
  });
});

describe("preview index", () => {
  it("stays on the only photo when prev or next is requested", () => {
    expect(previousPreviewIndex(0, 1)).toBe(0);
    expect(nextPreviewIndex(0, 1)).toBe(0);
  });

  it("cycles through multiple photos", () => {
    expect(nextPreviewIndex(0, 3)).toBe(1);
    expect(nextPreviewIndex(2, 3)).toBe(0);
    expect(previousPreviewIndex(0, 3)).toBe(2);
    expect(previousPreviewIndex(1, 3)).toBe(0);
  });
});
