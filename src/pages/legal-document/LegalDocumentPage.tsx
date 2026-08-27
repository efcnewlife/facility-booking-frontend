import { legalDocumentService } from "@/api/services/legalDocumentService";
import type { LegalDocumentKind } from "@/types/legalDocument";
import { format_profile_date } from "@/utils/bookingFormat";
import type { LegalDocumentViewState } from "@/utils/legalDocumentViewModel";
import { MarkdownPreview } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface LegalDocumentPageProps {
  kind: LegalDocumentKind;
}

const titleKeyByKind: Record<
  LegalDocumentKind,
  "legalDocument.termsOfService.title" | "legalDocument.privacyPolicy.title"
> = {
  terms_of_service: "legalDocument.termsOfService.title",
  privacy_policy: "legalDocument.privacyPolicy.title",
};

const LegalDocumentPage = ({ kind }: LegalDocumentPageProps) => {
  const { t, i18n } = useTranslation("booking");
  const [viewState, setViewState] = useState<LegalDocumentViewState | null>(null);

  const loadDocument = useCallback(async () => {
    setViewState(null);
    const nextState = await legalDocumentService.getPublic(kind);
    setViewState(nextState);
  }, [kind]);

  useEffect(() => {
    void loadDocument();
  }, [loadDocument, i18n.language]);

  const title = t(titleKeyByKind[kind]);

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-center text-2xl font-bold text-on-surface">{title}</h1>

      {viewState === null && (
        <p className="mt-8 text-center text-base text-on-surface-variant">{t("legalDocument.loading")}</p>
      )}

      {viewState?.status === "content" && (
        <>
          <p className="mt-3 text-center text-sm text-on-surface-variant">
            {t("legalDocument.effectiveDate", { date: format_profile_date(viewState.effectiveDate) })}
          </p>
          <article className="mt-8 text-on-surface">
            <MarkdownPreview value={viewState.body} profile="legal" />
          </article>
        </>
      )}

      {viewState?.status === "empty" && (
        <div className="mt-8 text-center">
          <p className="text-base font-medium text-on-surface">{t("legalDocument.empty.title")}</p>
          <p className="mt-2 text-base text-on-surface-variant">{t("legalDocument.empty.body")}</p>
        </div>
      )}

      {viewState?.status === "not_found" && (
        <div className="mt-8 text-center">
          <p className="text-base font-medium text-on-surface">{t("legalDocument.notFound.title")}</p>
          <p className="mt-2 text-base text-on-surface-variant">{t("legalDocument.notFound.body")}</p>
        </div>
      )}

      {viewState?.status === "error" && (
        <div className="mt-8 text-center">
          <p className="text-base font-medium text-on-surface">{t("legalDocument.error.title")}</p>
          <p className="mt-2 text-base text-on-surface-variant">{t("legalDocument.error.body")}</p>
        </div>
      )}
    </main>
  );
};

export default LegalDocumentPage;
