import moment from "moment";

/**
 * Keeps Moment.js locale aligned with i18next BCP 47 codes.
 */
export const sync_moment_locale = (lng: string): void => {
  const normalized = lng.replace(/_/g, "-").toLowerCase();
  if (normalized.startsWith("zh-cn") || (normalized.startsWith("zh-hans") && normalized.endsWith("cn"))) {
    moment.locale("zh-cn");
    return;
  }
  if (normalized.startsWith("zh")) {
    moment.locale("zh-tw");
    return;
  }
  moment.locale("en");
};
