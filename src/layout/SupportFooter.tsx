import { SUPPORT_PATH } from "@/utils/visitAccess";
import LegalDocumentLinks from "@/components/legal/LegalDocumentLinks";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

interface SupportFooterProps {
  className?: string;
}

const SupportFooter = ({ className }: SupportFooterProps) => {
  const { t } = useTranslation("booking");
  const year = new Date().getFullYear();

  return (
    <footer className={cn("mt-auto shrink-0 bg-surface py-4 shadow-[0px_-2px_3px_rgba(0,0,0,0.1)]", className)}>
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-12">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <img
            alt={t("footer.churchLogoAlt")}
            className="h-[50px] w-[85px] object-contain"
            src="/images/logo/church-logo.png"
          />
          <p className="text-center text-xs font-medium text-booking-text">{t("footer.copyright", { year })}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <p className="text-center text-base text-booking-primary">{t("footer.specialRequest")}</p>
          <Link className="text-sm font-semibold text-booking-secondary" to={SUPPORT_PATH}>
            {t("footer.contactSupport")}
          </Link>
        </div>
        <LegalDocumentLinks
          className="w-full sm:w-auto"
          linkClassName="text-sm font-semibold text-booking-secondary underline-offset-2 hover:underline"
        />
      </div>
    </footer>
  );
};

export default SupportFooter;
