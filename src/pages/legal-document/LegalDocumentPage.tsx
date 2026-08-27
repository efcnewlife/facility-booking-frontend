import { legalDocumentService } from "@/api/services/legalDocumentService";
import type { LegalDocumentKind } from "@/types/legalDocument";
import type { LegalDocumentViewState } from "@/utils/legalDocumentViewModel";
import { isSafeMarkdownLink } from "@/utils/safeMarkdownLink";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

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
        <article className="mt-8 text-on-surface">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h2 className="mt-8 text-xl font-bold first:mt-0">{children}</h2>,
              h2: ({ children }) => <h3 className="mt-6 text-lg font-semibold">{children}</h3>,
              h3: ({ children }) => <h4 className="mt-4 text-base font-semibold">{children}</h4>,
              p: ({ children }) => <p className="mt-3 text-base leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 pl-6">{children}</ul>,
              ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 pl-6">{children}</ol>,
              li: ({ children }) => <li className="text-base leading-relaxed">{children}</li>,
              a: ({ children, href }) =>
                isSafeMarkdownLink(href) ? (
                  <a
                    className="font-medium text-booking-secondary underline"
                    href={href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {children}
                  </a>
                ) : (
                  <span className="font-medium text-booking-secondary">{children}</span>
                ),
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {viewState.body}
          </ReactMarkdown>
        </article>
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
