import { describe, expect, it } from "vitest";
import {
  bookingTitleFieldFeedback,
  BOOKING_TITLE_ERROR_KEYS,
  BOOKING_TITLE_MAX_LENGTH,
  BOOKING_TITLE_MIN_LENGTH,
  isValidBookingTitle,
  normalizeBookingTitle,
  validateBookingTitle,
} from "./bookingTitle";

const identityTranslate = (key: string): string => key;

describe("validateBookingTitle", () => {
  it("accepts a normal plain-text title", () => {
    expect(validateBookingTitle("Choir practice")).toBeNull();
  });

  it("rejects an empty title", () => {
    expect(validateBookingTitle("")).toBe("required");
  });

  it("rejects a whitespace-only title (trimmed length is zero)", () => {
    expect(validateBookingTitle("   ")).toBe("required");
  });

  it(`accepts a title at exactly the ${BOOKING_TITLE_MAX_LENGTH}-character maximum`, () => {
    expect(validateBookingTitle("a".repeat(BOOKING_TITLE_MAX_LENGTH))).toBeNull();
  });

  it(`rejects a title over the ${BOOKING_TITLE_MAX_LENGTH}-character maximum`, () => {
    expect(validateBookingTitle("a".repeat(BOOKING_TITLE_MAX_LENGTH + 1))).toBe("tooLong");
  });

  it("trims surrounding whitespace before checking length", () => {
    expect(validateBookingTitle(`  ${"a".repeat(BOOKING_TITLE_MAX_LENGTH)}  `)).toBeNull();
    expect(validateBookingTitle(`  ${"a".repeat(BOOKING_TITLE_MAX_LENGTH + 1)}  `)).toBe("tooLong");
  });

  it(`accepts a title at the ${BOOKING_TITLE_MIN_LENGTH}-character minimum`, () => {
    expect(validateBookingTitle("A")).toBeNull();
  });

  it("rejects a title containing an HTML tag", () => {
    expect(validateBookingTitle("<b>Choir</b>")).toBe("invalidCharacters");
    expect(validateBookingTitle("Choir <script>")).toBe("invalidCharacters");
  });
});

describe("isValidBookingTitle", () => {
  it("mirrors validateBookingTitle as a boolean", () => {
    expect(isValidBookingTitle("Choir practice")).toBe(true);
    expect(isValidBookingTitle("")).toBe(false);
    expect(isValidBookingTitle("<b>Choir</b>")).toBe(false);
  });
});

describe("normalizeBookingTitle", () => {
  it("trims a valid title", () => {
    expect(normalizeBookingTitle("  Choir practice  ")).toBe("Choir practice");
  });
});

describe("BOOKING_TITLE_ERROR_KEYS", () => {
  it("has an i18n key for every validation error", () => {
    expect(BOOKING_TITLE_ERROR_KEYS.required).toBe("bookingTitle.errors.required");
    expect(BOOKING_TITLE_ERROR_KEYS.tooLong).toBe("bookingTitle.errors.tooLong");
    expect(BOOKING_TITLE_ERROR_KEYS.invalidCharacters).toBe("bookingTitle.errors.invalidCharacters");
  });
});

describe("bookingTitleFieldFeedback", () => {
  it("shows the hint, not an error, before the field is touched even when the title is invalid", () => {
    expect(bookingTitleFieldFeedback("", false, identityTranslate)).toEqual({
      error: undefined,
      hint: "bookingTitle.hint",
    });
  });

  it("shows the hint once touched when the title is valid", () => {
    expect(bookingTitleFieldFeedback("Choir practice", true, identityTranslate)).toEqual({
      error: undefined,
      hint: "bookingTitle.hint",
    });
  });

  it("shows the localized error, not the hint, once touched with an invalid title", () => {
    expect(bookingTitleFieldFeedback("", true, identityTranslate)).toEqual({
      error: "bookingTitle.errors.required",
      hint: undefined,
    });
    expect(bookingTitleFieldFeedback("a".repeat(31), true, identityTranslate)).toEqual({
      error: "bookingTitle.errors.tooLong",
      hint: undefined,
    });
  });
});
