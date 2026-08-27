const SAFE_MARKDOWN_LINK_PATTERN = /^(https?:|mailto:)/i;

export const isSafeMarkdownLink = (href: string | undefined): href is string => {
  if (!href) {
    return false;
  }
  return SAFE_MARKDOWN_LINK_PATTERN.test(href.trim());
};
