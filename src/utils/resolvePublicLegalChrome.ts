export type PublicLegalChrome = "guest_header" | "top_nav_bar";

interface ResolvePublicLegalChromeInput {
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Choose Public legal page top chrome.
 * Auth loading always wins with guest_header, even if a stale authenticated flag is true.
 */
export const resolvePublicLegalChrome = ({
  isLoading,
  isAuthenticated,
}: ResolvePublicLegalChromeInput): PublicLegalChrome => {
  if (isLoading) {
    return "guest_header";
  }

  if (isAuthenticated) {
    return "top_nav_bar";
  }

  return "guest_header";
};
