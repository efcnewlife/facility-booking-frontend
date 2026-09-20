import ministryService, { MinistryProfileNotFoundError } from "@/api/services/ministryService";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import type { MinistryProfile } from "@/types/ministry";
import { format_profile_date } from "@/utils/bookingFormat";
import { ministryProfilePath, parseMinistryProfileId } from "@/utils/ministryProfilePath";
import { startBookingMinistryProfileHandoffPath } from "@/utils/ministryProfileHandoff";
import { getMinistryStatusBadgeColor, isActiveMinistryStatus, isRejectedMinistryStatus } from "@/utils/ministryStatus";
import { Alert, Badge, Button, Spinner } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

const statusLabelKey = (status: string): string => {
  switch (status) {
    case "pending_approval":
      return "myMinistry.applications.status.pendingApproval";
    case "rejected":
      return "myMinistry.applications.status.rejected";
    case "active":
      return "myMinistry.applications.status.active";
    default:
      return "myMinistry.applications.status.unknown";
  }
};

const memberRoleLabelKey = (role: string): string => {
  switch (role) {
    case "primary":
      return "myMinistry.approvals.detail.memberRoles.primary";
    case "secondary":
      return "myMinistry.approvals.detail.memberRoles.secondary";
    default:
      return "myMinistry.approvals.detail.memberRoles.unknown";
  }
};

const MinistryProfilePage = () => {
  const { t } = useTranslation("booking");
  const { ministryId: ministryIdParam } = useParams<{ ministryId: string }>();
  const ministryId = ministryIdParam ? parseMinistryProfileId(ministryProfilePath(ministryIdParam)) : null;
  const [profile, setProfile] = useState<MinistryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!ministryId) {
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const result = await ministryService.getProfile(ministryId);
      setProfile(result);
    } catch (err) {
      if (err instanceof MinistryProfileNotFoundError) {
        setNotFound(true);
        return;
      }
      setProfile(null);
      setError(err instanceof Error ? err.message : t("myMinistry.profile.errors.loadDetail"));
    } finally {
      setLoading(false);
    }
  }, [ministryId, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (!ministryId || notFound) {
    return <NotFoundPage />;
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-[960px] flex-1 justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Spinner size="lg" />
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <Alert
          message={error || t("myMinistry.profile.errors.loadDetail")}
          title={t("myMinistry.profile.errors.title")}
          variant="error"
          width="full"
        />
        <div className="mt-4">
          <Link to="/my-ministry">
            <Button size="sm" variant="outline">
              {t("myMinistry.profile.back")}
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const targetAudienceLabels = profile.targetAudiences
    .map((item) => item.name || item.code)
    .filter(Boolean)
    .join(", ");
  const isActive = isActiveMinistryStatus(profile.status);
  const isRejected = isRejectedMinistryStatus(profile.status);

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link className="text-sm font-semibold text-booking-primary hover:underline" to="/my-ministry">
          {t("myMinistry.profile.back")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-2xl font-bold text-on-surface">
          {profile.name?.trim() || t("myMinistry.profile.unnamed")}
        </h1>
        <Badge color={getMinistryStatusBadgeColor(profile.status)} variant="light">
          {t(statusLabelKey(profile.status))}
        </Badge>
      </div>

      {isRejected && profile.rejectionReason ? (
        <div className="mt-4 rounded-lg bg-error-container/40 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-error">
            {t("myMinistry.profile.rejectionReason")}
          </p>
          <p className="mt-1 text-sm text-on-surface">{profile.rejectionReason}</p>
        </div>
      ) : null}

      <section className="mt-6 space-y-4 rounded-xl border border-outline-variant bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-on-surface">{t("myMinistry.profile.summaryTitle")}</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {targetAudienceLabels ? (
            <>
              <dt className="text-on-surface-variant">{t("myMinistry.profile.targetAudiences")}</dt>
              <dd className="text-on-surface">{targetAudienceLabels}</dd>
            </>
          ) : null}
          <dt className="text-on-surface-variant">{t("myMinistry.profile.priorityBooking")}</dt>
          <dd className="text-on-surface">
            {profile.hasPriorityBooking
              ? t("myMinistry.profile.priorityBookingYes")
              : t("myMinistry.profile.priorityBookingNo")}
          </dd>
          {profile.submittedAt ? (
            <>
              <dt className="text-on-surface-variant">{t("myMinistry.profile.submittedAt")}</dt>
              <dd className="text-on-surface">{format_profile_date(profile.submittedAt)}</dd>
            </>
          ) : null}
          {profile.approvedAt ? (
            <>
              <dt className="text-on-surface-variant">{t("myMinistry.profile.approvedAt")}</dt>
              <dd className="text-on-surface">{format_profile_date(profile.approvedAt)}</dd>
            </>
          ) : null}
          {profile.rejectedAt ? (
            <>
              <dt className="text-on-surface-variant">{t("myMinistry.profile.rejectedAt")}</dt>
              <dd className="text-on-surface">{format_profile_date(profile.rejectedAt)}</dd>
            </>
          ) : null}
        </dl>
        {profile.purpose ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t("myMinistry.profile.purpose")}
            </p>
            <p className="mt-1 text-sm text-on-surface">{profile.purpose}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-6 space-y-3 rounded-xl border border-outline-variant bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-on-surface">{t("myMinistry.profile.stewardsTitle")}</h2>
        {profile.stewards.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t("myMinistry.profile.noStewards")}</p>
        ) : (
          <ul className="space-y-2">
            {profile.stewards.map((steward, index) => (
              <li
                className="rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface"
                key={`${steward.memberRole}-${steward.email ?? index}`}
              >
                <span className="font-semibold">{t(memberRoleLabelKey(steward.memberRole))}:</span>{" "}
                {steward.displayName || steward.email || t("myMinistry.profile.unnamedSteward")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 space-y-2 rounded-xl border border-outline-variant bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-on-surface">{t("myMinistry.profile.ownerPositionTitle")}</h2>
        {profile.ownerPosition ? (
          <div className="text-sm text-on-surface">
            <p className="font-semibold">{profile.ownerPosition.name || t("myMinistry.profile.unnamed")}</p>
            {profile.ownerPosition.incumbentDisplayName || profile.ownerPosition.incumbentEmail ? (
              <p className="mt-1 text-on-surface-variant">
                {profile.ownerPosition.incumbentDisplayName}
                {profile.ownerPosition.incumbentDisplayName && profile.ownerPosition.incumbentEmail ? " · " : null}
                {profile.ownerPosition.incumbentEmail}
              </p>
            ) : (
              <p className="mt-1 text-on-surface-variant">{t("myMinistry.profile.ownerPositionVacant")}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">{t("myMinistry.profile.ownerPositionVacant")}</p>
        )}
      </section>

      {isActive ? (
        <div className="mt-6">
          <Link to={startBookingMinistryProfileHandoffPath(profile.id)}>
            <Button size="sm" variant="primary">
              {t("myMinistry.profile.startBooking")}
            </Button>
          </Link>
        </div>
      ) : null}
    </main>
  );
};

export default MinistryProfilePage;
