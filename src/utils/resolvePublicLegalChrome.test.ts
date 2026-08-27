import { describe, expect, it } from "vitest";
import { resolvePublicLegalChrome } from "./resolvePublicLegalChrome";

describe("resolvePublicLegalChrome", () => {
  it("returns guest_header while auth is loading", () => {
    expect(
      resolvePublicLegalChrome({
        isLoading: true,
        isAuthenticated: false,
      })
    ).toBe("guest_header");
  });

  it("returns guest_header while auth is loading even if authenticated is true", () => {
    expect(
      resolvePublicLegalChrome({
        isLoading: true,
        isAuthenticated: true,
      })
    ).toBe("guest_header");
  });

  it("returns top_nav_bar when authenticated and not loading", () => {
    expect(
      resolvePublicLegalChrome({
        isLoading: false,
        isAuthenticated: true,
      })
    ).toBe("top_nav_bar");
  });

  it("returns guest_header when unauthenticated and not loading", () => {
    expect(
      resolvePublicLegalChrome({
        isLoading: false,
        isAuthenticated: false,
      })
    ).toBe("guest_header");
  });
});
