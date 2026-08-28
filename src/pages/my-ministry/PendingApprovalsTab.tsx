import ministryService from "@/api/services/ministryService";
import type { MinistryItem } from "@/types/ministry";
import { ministryApprovalDetailPath } from "@/utils/ministryApprovalPath";
import { Alert, Button, Spinner } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

const PendingApprovalsTab = () => {
  const { t } = useTranslation("booking");
  const [approvals, setApprovals] = useState<MinistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ministryService.listPendingApprovalsForMe();
      setApprovals(result.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("myMinistry.approvals.errors.loadList"));
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert message={error} title={t("myMinistry.approvals.errors.title")} variant="error" width="full" />;
  }

  if (approvals.length === 0) {
    return <p className="text-sm font-medium text-on-surface-variant">{t("myMinistry.approvals.empty")}</p>;
  }

  return (
    <ul className="space-y-4">
      {approvals.map((approval) => {
        const ministryTypeLabel = approval.ministryType?.name || approval.ministryType?.code;

        return (
          <li key={approval.id} className="rounded-xl border border-outline-variant bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h3 className="text-lg font-semibold text-on-surface">
                  {approval.name?.trim() || t("myMinistry.applications.unnamed")}
                </h3>
                {ministryTypeLabel ? (
                  <p className="text-sm text-on-surface-variant">
                    {t("myMinistry.applications.ministryType", { type: ministryTypeLabel })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <Link to={ministryApprovalDetailPath(approval.id)}>
                <Button size="sm" variant="primary">
                  {t("myMinistry.approvals.review")}
                </Button>
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default PendingApprovalsTab;
