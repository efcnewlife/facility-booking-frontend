import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface SupportFooterProps {
  className?: string;
}

const SupportFooter = ({ className }: SupportFooterProps) => {
  const { t } = useTranslation("booking");

  return (
    <footer
      className={cn(
        "mt-auto bg-surface py-6 shadow-[0px_-2px_3px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      <p className="text-center text-lg font-bold text-primary">
        <span>{t("support.prefix")}</span>
        <a className="underline decoration-solid underline-offset-2" href="mailto:support@example.com">
          {t("support.link")}
        </a>
      </p>
    </footer>
  );
};

export default SupportFooter;
