import ministryService from "@/api/services/ministryService";
import ResubmitMinistryModal from "@/pages/my-ministry/ResubmitMinistryModal";
import { useAuth } from "@/context/AuthContext";
import type { MinistryItem } from "@/types/ministry";
import {
  getMinistryStatusBadgeColor,
  isActiveMinistryStatus,
  isRejectedMinistryStatus,
  MINISTRY_STATUS,
} from "@/utils/ministryStatus";
import { Alert, Badge, Button, Spinner } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

const START_BOOKING_PATH = "/start-booking?step=select_ministry&ministry=1";

const statusLabelKey = (status: string): string => {
  switch (status) {
    case MINISTRY_STATUS.PENDING_APPROVAL:
      return "myMinistry.applications.status.pendingApproval";
    case MINISTRY_STATUS.REJECTED:
      return "myMinistry.applications.status.rejected";
    case MINISTRY_STATUS.ACTIVE:
      return "myMinistry.applications.status.active";
    default:
      return "myMinistry.applications.status.unknown";
  }
};

const enrichRejectedApplications = async (items: MinistryItem[]): Promise<MinistryItem[]> => {
  const rejectedIds = items.filter((item) => isRejectedMinistryStatus(item.status)).map((item) => item.id);
  if (rejectedIds.length === 0) {
    return items;
  }

  const details = await Promise.all(
    rejectedIds.map(async (id) => {
      try {
        return await ministryService.getApplicationDetail(id);
      } catch {
        return null;
      }
    })
  );

  const rejectionReasonById = new Map<string, string | null | undefined>();
  details.forEach((detail) => {
    if (detail) {
      rejectionReasonById.set(detail.id, detail.rejectionReason);
    }
  });

  return items.map((item) =>
    rejectionReasonById.has(item.id)
      ? {
          ...item,
          rejectionReason: rejectionReasonById.get(item.id) ?? null,
        }
      : item
  );
};

const MyApplicationsTab = () => {
  const { t } = useTranslation("booking");
  const { user } = useAuth();
  const [applications, setApplications] = useState<MinistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resubmitMinistryId, setResubmitMinistryId] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ministryService.listMine(true);
      const items = await enrichRejectedApplications(result.items || []);
      setApplications(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("myMinistry.applications.errors.loadList"));
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert message={error} title={t("myMinistry.applications.errors.title")} variant="error" width="full" />;
  }

  if (applications.length === 0) {
    return <p className="text-sm font-medium text-on-surface-variant">{t("myMinistry.applications.empty")}</p>;
  }

  return (
    <>
      <ul className="space-y-4">
        {applications.map((application) => {
          const statusColor = getMinistryStatusBadgeColor(application.status);
          const ministryTypeLabel = application.ministryType?.name || application.ministryType?.code;

          return (
            <li key={application.id} className="rounded-xl border border-outline-variant bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-lg font-semibold text-on-surface">
                    {application.name?.trim() || t("myMinistry.applications.unnamed")}
                  </h3>
                  {ministryTypeLabel ? (
                    <p className="text-sm text-on-surface-variant">
                      {t("myMinistry.applications.ministryType", { type: ministryTypeLabel })}
                    </p>
                  ) : null}
                </div>
                <Badge color={statusColor} variant="light">
                  {t(statusLabelKey(application.status))}
                </Badge>
              </div>

              {isRejectedMinistryStatus(application.status) && application.rejectionReason ? (
                <div className="mt-3 rounded-lg bg-error-container/40 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-error">
                    {t("myMinistry.applications.rejectionReason")}
                  </p>
                  <p className="mt-1 text-sm text-on-surface">{application.rejectionReason}</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                {isRejectedMinistryStatus(application.status) ? (
                  <Button onClick={() => setResubmitMinistryId(application.id)} size="sm" variant="primary">
                    {t("myMinistry.applications.resubmit.action")}
                  </Button>
                ) : null}
                {isActiveMinistryStatus(application.status, application.isActive) ? (
                  <Link to={START_BOOKING_PATH}>
                    <Button size="sm" variant="outline">
                      {t("myMinistry.applications.startBooking")}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <ResubmitMinistryModal
        isOpen={Boolean(resubmitMinistryId)}
        ministryId={resubmitMinistryId}
        onClose={() => setResubmitMinistryId(null)}
        onResubmitted={() => {
          void loadApplications();
        }}
        userId={user?.id}
      />
    </>
  );
};

export default MyApplicationsTab;
