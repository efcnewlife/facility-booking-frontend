import { change_app_language, normalize_locale_code, type AppLocale } from "@/i18n";
import { APP_LOCALE_OPTIONS } from "@/utils/localeOptions";
import { cn, Select, type SelectOptionType } from "@efcnewlife/newlife-ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const APP_LOCALE_LABEL_KEYS: Record<AppLocale, "english" | "traditionalChinese" | "simplifiedChinese"> = {
  en: "english",
  "zh-TW": "traditionalChinese",
  "zh-CN": "simplifiedChinese",
};

interface AppLocaleSelectProps {
  id: string;
  className?: string;
  showLabel?: boolean;
}

const AppLocaleSelect = ({ id, className, showLabel = false }: AppLocaleSelectProps) => {
  const { i18n, t } = useTranslation();
  const { t: tLanguage } = useTranslation("language");

  const options: SelectOptionType[] = useMemo(
    () =>
      APP_LOCALE_OPTIONS.map((appLocale) => ({
        value: appLocale,
        label: tLanguage(APP_LOCALE_LABEL_KEYS[appLocale]),
      })),
    [tLanguage],
  );

  const selectedLocale = normalize_locale_code(i18n.language) ?? "en";

  return (
    <div className={cn("w-full", className)}>
      <Select
        id={id}
        size="sm"
        aria-label={tLanguage("label")}
        label={showLabel ? tLanguage("label") : undefined}
        labels={{
          selectPlaceholder: t("common:selectPlaceholder"),
          clearSelection: t("common:clearSelection"),
          toggleOptions: t("common:toggleOptions"),
          searchOptions: t("common:searchOptions"),
          noOptions: t("common:noOptions"),
        }}
        options={options}
        value={selectedLocale}
        onChange={async (value) => {
          if (typeof value === "string") {
            await change_app_language(value);
          }
        }}
      />
    </div>
  );
};

export default AppLocaleSelect;
