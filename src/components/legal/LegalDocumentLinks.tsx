import { LEGAL_DOCUMENT_PATHS } from "@/types/legalDocument";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

interface LegalDocumentLinksProps {
  className?: string;
  linkClassName?: string;
}

const LegalDocumentLinks = ({ className, linkClassName }: LegalDocumentLinksProps) => {
  const { t } = useTranslation("booking");

  return (
    <nav
      aria-label={t("legalDocument.linksAria")}
      className={cn("flex flex-wrap items-center justify-center gap-x-4 gap-y-1", className)}
    >
      <Link className={linkClassName} to={LEGAL_DOCUMENT_PATHS.terms_of_service}>
        {t("legalDocument.termsOfService.link")}
      </Link>
      <Link className={linkClassName} to={LEGAL_DOCUMENT_PATHS.privacy_policy}>
        {t("legalDocument.privacyPolicy.link")}
      </Link>
    </nav>
  );
};

export default LegalDocumentLinks;
