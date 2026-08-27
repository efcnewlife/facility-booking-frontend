import AuthLocaleSelect from "@/components/auth/AuthLocaleSelect";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

const PublicLegalHeader = () => {
  const { t } = useTranslation("booking");

  return (
    <header className="sticky top-0 z-40 shrink-0 bg-surface">
      <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-12">
        <Link className="flex min-w-0 shrink-0 items-center" to="/login">
          <img
            alt={t("nav.logoAlt")}
            className="h-[39px] w-auto max-w-[min(180px,40vw)] object-contain object-left"
            src="/images/logo/booking-app-logo.png"
          />
        </Link>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-4 sm:gap-6">
          <AuthLocaleSelect />
          <Link
            className="whitespace-nowrap text-sm font-semibold leading-none text-booking-secondary transition-colors hover:text-booking-primary"
            to="/login"
          >
            {t("nav.signIn")}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default PublicLegalHeader;
