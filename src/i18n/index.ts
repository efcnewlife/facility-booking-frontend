import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enAuth from "./locales/en/auth.json";
import enBooking from "./locales/en/booking.json";
import enCommon from "./locales/en/common.json";
import enErrors from "./locales/en/errors.json";
import enLanguage from "./locales/en/language.json";
import zhCnAuth from "./locales/zh-CN/auth.json";
import zhCnBooking from "./locales/zh-CN/booking.json";
import zhCnCommon from "./locales/zh-CN/common.json";
import zhCnErrors from "./locales/zh-CN/errors.json";
import zhCnLanguage from "./locales/zh-CN/language.json";
import zhTwAuth from "./locales/zh-TW/auth.json";
import zhTwBooking from "./locales/zh-TW/booking.json";
import zhTwCommon from "./locales/zh-TW/common.json";
import zhTwErrors from "./locales/zh-TW/errors.json";
import zhTwLanguage from "./locales/zh-TW/language.json";
import { sync_moment_locale } from "./moment_locale_sync";

/** BCP 47 language tags used as i18next resource keys and persisted locale. */
export type AppLocale = "en" | "zh-TW" | "zh-CN";

export const LOCALE_STORAGE_KEY = "app_locale";

export const normalize_locale_code = (value: string | null): AppLocale | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim().replace(/_/g, "-").toLowerCase();
  if (normalized === "en") {
    return "en";
  }
  if (normalized === "zh-tw") {
    return "zh-TW";
  }
  if (normalized === "zh-cn") {
    return "zh-CN";
  }
  if (normalized.startsWith("zh-tw") || normalized === "zh-hant-tw" || normalized === "zh-hk") {
    return "zh-TW";
  }
  if (
    normalized === "zh-sg" ||
    normalized.startsWith("zh-cn") ||
    normalized === "zh-hans-cn" ||
    (normalized.startsWith("zh-hans") && normalized.includes("cn"))
  ) {
    return "zh-CN";
  }
  if (normalized === "zh" || normalized.startsWith("zh-hans")) {
    return "zh-CN";
  }
  return null;
};

/** Switch i18next to the AppLocale resource key. */
export const change_app_language = async (locale_code: string): Promise<boolean> => {
  const app_locale = normalize_locale_code(locale_code);
  if (!app_locale) {
    return false;
  }
  if (i18n.language !== app_locale) {
    await i18n.changeLanguage(app_locale);
  }
  return true;
};

const browser_default_locale = (): AppLocale => {
  const lang = navigator.language.replace(/_/g, "-").toLowerCase();
  if (lang.startsWith("zh-cn")) {
    return "zh-CN";
  }
  if (lang.startsWith("zh-tw")) {
    return "zh-TW";
  }
  if (lang.startsWith("zh")) {
    return "zh-TW";
  }
  return "en";
};

const getInitialLanguage = (): AppLocale => {
  const stored = normalize_locale_code(localStorage.getItem(LOCALE_STORAGE_KEY));
  if (stored) {
    return stored;
  }
  return browser_default_locale();
};

const initial_lng = getInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      errors: enErrors,
      language: enLanguage,
      booking: enBooking,
    },
    "zh-TW": {
      common: zhTwCommon,
      auth: zhTwAuth,
      errors: zhTwErrors,
      language: zhTwLanguage,
      booking: zhTwBooking,
    },
    "zh-CN": {
      common: zhCnCommon,
      auth: zhCnAuth,
      errors: zhCnErrors,
      language: zhCnLanguage,
      booking: zhCnBooking,
    },
  },
  defaultNS: "common",
  ns: ["common", "auth", "errors", "language", "booking"],
  lng: initial_lng,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

sync_moment_locale(i18n.language);

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  sync_moment_locale(lng);
});

export default i18n;
