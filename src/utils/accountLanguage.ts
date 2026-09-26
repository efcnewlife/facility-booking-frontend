import { authService } from "@/api/services/authService";
import { ministryService } from "@/api/services/ministryService";
import { change_app_language, normalize_locale_code, type AppLocale } from "@/i18n";
import type { LocaleItem } from "@/types/ministry";

const localeItemCode = (locale: LocaleItem): string => {
  return [locale.languageCode, locale.scriptCode, locale.regionCode].filter(Boolean).join("-");
};

const activeLocaleItems = (items: LocaleItem[]): LocaleItem[] => {
  return items.filter((item) => item.isActive !== false);
};

const resolveLocaleIdForAppLanguage = (items: LocaleItem[], appLocale: AppLocale): string | undefined => {
  const matched = activeLocaleItems(items).find((item) => normalize_locale_code(localeItemCode(item)) === appLocale);
  return matched?.id;
};

const appLocaleForLocaleId = (items: LocaleItem[], localeId: string): AppLocale | null => {
  const matched = activeLocaleItems(items).find((item) => item.id === localeId);
  if (!matched) {
    return null;
  }
  return normalize_locale_code(localeItemCode(matched));
};

let accountLanguageRevision = 0;

export const applyAccountLanguagePreference = async (preferredLocaleId: string | null | undefined): Promise<void> => {
  if (!preferredLocaleId) {
    return;
  }
  const revision = accountLanguageRevision;
  try {
    const locales = await ministryService.listLocales();
    if (revision !== accountLanguageRevision) {
      return;
    }
    const appLocale = appLocaleForLocaleId(locales.items, preferredLocaleId);
    if (!appLocale) {
      return;
    }
    await change_app_language(appLocale);
  } catch {
    // Leave the current language when the locale catalog cannot be loaded.
  }
};

export const persistAccountLanguagePreference = async (
  localeCode: string,
  storedLocaleId?: string | null
): Promise<string | null> => {
  const revision = ++accountLanguageRevision;
  const switched = await change_app_language(localeCode);
  if (!switched || !authService.getToken()) {
    return null;
  }
  const appLocale = normalize_locale_code(localeCode);
  if (!appLocale) {
    return null;
  }
  const locales = await ministryService.listLocales();
  if (revision !== accountLanguageRevision) {
    return null;
  }
  const localeId = resolveLocaleIdForAppLanguage(locales.items, appLocale);
  if (!localeId) {
    return null;
  }
  if (storedLocaleId && localeId === storedLocaleId) {
    return localeId;
  }
  await authService.updatePreferredLanguage(localeId);
  if (revision !== accountLanguageRevision) {
    return null;
  }
  return localeId;
};
