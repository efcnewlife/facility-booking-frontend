import ministryService from "@/api/services/ministryService";
import { useAuth } from "@/context/AuthContext";
import type { MinistryDetail } from "@/types/ministry";
import { format_profile_date } from "@/utils/bookingFormat";
import { resolveMinistryApplicationErrorMessage } from "@/utils/ministryApplicationErrors";
import { MINISTRY_STATUS } from "@/utils/ministryStatus";
import { myMinistryApprovalsTabPath } from "@/utils/ministryApprovalPath";
import { Alert, Button, Modal, Spinner, TextArea } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";

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

const MinistryApprovalDetailPage = () => {
  const { t } = useTranslation("booking");
  const navigate = useNavigate();
  const { ministryId } = useParams<{ ministryId: string }>();
  const { user } = useAuth();
  const [detail, setDetail] = useState<MinistryDetail | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!ministryId) {
      setError(t("myMinistry.approvals.errors.invalidRoute"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [detailResult, pendingResult] = await Promise.all([
        ministryService.getApplicationDetail(ministryId),
        ministryService.listPendingApprovalsForMe(),
      ]);
      setDetail(detailResult);
      setCanDecide((pendingResult.items || []).some((item) => item.id === ministryId));
    } catch (err) {
      setDetail(null);
      setCanDecide(false);
      setError(resolveMinistryApplicationErrorMessage(err, "myMinistry.approvals.errors.loadDetail"));
    } finally {
      setLoading(false);
    }
  }, [ministryId, t]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const isSelfApprove = useMemo(() => {
    if (!detail?.submittedById || !user?.id) {
      return false;
    }
    return detail.submittedById === user.id;
  }, [detail?.submittedById, user?.id]);

  const showDecisionActions = canDecide && detail?.status === MINISTRY_STATUS.PENDING_APPROVAL && !loading && !error;

  const ministryTypeLabel = detail?.ministryType?.name || detail?.ministryType?.code;
  const targetAudienceLabels = (detail?.targetAudiences || [])
    .map((item) => item.name || item.code)
    .filter(Boolean)
    .join(", ");
  const primaryTranslation = detail?.translations?.[0];

  const handleApprove = async () => {
    if (!ministryId) {
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await ministryService.approveApplication(ministryId, {
        comment: approveComment.trim() || undefined,
      });
      navigate(myMinistryApprovalsTabPath());
    } catch (err) {
      setActionError(resolveMinistryApplicationErrorMessage(err, "myMinistry.approvals.errors.approve"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!ministryId) {
      return;
    }

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectReasonError(t("myMinistry.approvals.reject.reasonRequired"));
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await ministryService.rejectApplication(ministryId, {
        rejectionReason: trimmedReason,
        comment: rejectComment.trim() || undefined,
      });
      navigate(myMinistryApprovalsTabPath());
    } catch (err) {
      setActionError(resolveMinistryApplicationErrorMessage(err, "myMinistry.approvals.errors.reject"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-[960px] flex-1 justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Spinner size="lg" />
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <Alert
          message={error || t("myMinistry.approvals.errors.loadDetail")}
          title={t("myMinistry.approvals.errors.title")}
          variant="error"
          width="full"
        />
        <div className="mt-4">
          <Link to={myMinistryApprovalsTabPath()}>
            <Button size="sm" variant="outline">
              {t("myMinistry.approvals.detail.backToQueue")}
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link className="text-sm font-semibold text-booking-primary hover:underline" to={myMinistryApprovalsTabPath()}>
          {t("myMinistry.approvals.detail.backToQueue")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-on-surface">
        {detail.name?.trim() || primaryTranslation?.name?.trim() || t("myMinistry.applications.unnamed")}
      </h1>

      {isSelfApprove && showDecisionActions ? (
        <div className="mt-4 rounded-lg bg-warning-container/50 px-4 py-3">
          <p className="text-sm text-on-surface">{t("myMinistry.approvals.detail.selfApproveNotice")}</p>
        </div>
      ) : null}

      <section className="mt-6 space-y-4 rounded-xl border border-outline-variant bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-on-surface">{t("myMinistry.approvals.detail.summaryTitle")}</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {ministryTypeLabel ? (
            <>
              <dt className="text-on-surface-variant">{t("myMinistry.approvals.detail.ministryType")}</dt>
              <dd className="text-on-surface">{ministryTypeLabel}</dd>
            </>
          ) : null}
          {targetAudienceLabels ? (
            <>
              <dt className="text-on-surface-variant">{t("myMinistry.approvals.detail.targetAudiences")}</dt>
              <dd className="text-on-surface">{targetAudienceLabels}</dd>
            </>
          ) : null}
          <dt className="text-on-surface-variant">{t("myMinistry.approvals.detail.priorityBooking")}</dt>
          <dd className="text-on-surface">
            {detail.hasPriorityBooking
              ? t("myMinistry.approvals.detail.priorityBookingYes")
              : t("myMinistry.approvals.detail.priorityBookingNo")}
          </dd>
          {detail.submittedAt ? (
            <>
              <dt className="text-on-surface-variant">{t("myMinistry.approvals.detail.submittedAt")}</dt>
              <dd className="text-on-surface">{format_profile_date(detail.submittedAt)}</dd>
            </>
          ) : null}
        </dl>
        {primaryTranslation?.description ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t("myMinistry.approvals.detail.purpose")}
            </p>
            <p className="mt-1 text-sm text-on-surface">{primaryTranslation.description}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-6 space-y-3 rounded-xl border border-outline-variant bg-surface p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-on-surface">{t("myMinistry.approvals.detail.stewardsTitle")}</h2>
        {(detail.members || []).length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t("myMinistry.approvals.detail.noStewards")}</p>
        ) : (
          <ul className="space-y-2">
            {(detail.members || []).map((member) => (
              <li key={member.userId} className="rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface">
                <span className="font-semibold">{t(memberRoleLabelKey(member.memberRole))}:</span>{" "}
                {member.displayName || member.email || member.userId}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showDecisionActions ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setApproveOpen(true)} size="sm" variant="primary">
            {t("myMinistry.approvals.detail.approve")}
          </Button>
          <Button onClick={() => setRejectOpen(true)} size="sm" variant="outline">
            {t("myMinistry.approvals.detail.reject")}
          </Button>
        </div>
      ) : null}

      <Modal
        className="mx-4 max-w-lg p-6"
        isOpen={approveOpen}
        onClose={() => {
          if (!submitting) {
            setApproveOpen(false);
            setActionError(null);
          }
        }}
        title={t("myMinistry.approvals.approve.title")}
      >
        <TextArea
          id="ministry-approval-comment"
          label={t("myMinistry.approvals.approve.comment")}
          onChange={setApproveComment}
          value={approveComment}
        />
        {actionError ? <p className="mt-3 text-sm text-error">{actionError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={submitting} onClick={() => setApproveOpen(false)} size="sm" variant="outline">
            {t("common:cancel", { ns: "common" })}
          </Button>
          <Button disabled={submitting} onClick={() => void handleApprove()} size="sm" variant="primary">
            {t("myMinistry.approvals.detail.approve")}
          </Button>
        </div>
      </Modal>

      <Modal
        className="mx-4 max-w-lg p-6"
        isOpen={rejectOpen}
        onClose={() => {
          if (!submitting) {
            setRejectOpen(false);
            setActionError(null);
            setRejectReasonError(null);
          }
        }}
        title={t("myMinistry.approvals.reject.title")}
      >
        <TextArea
          error={rejectReasonError || undefined}
          id="ministry-rejection-reason"
          label={t("myMinistry.approvals.reject.reason")}
          onChange={(value) => {
            setRejectReason(value);
            if (rejectReasonError && value.trim()) {
              setRejectReasonError(null);
            }
          }}
          required
          value={rejectReason}
        />
        <div className="mt-4">
          <TextArea
            id="ministry-rejection-comment"
            label={t("myMinistry.approvals.reject.comment")}
            onChange={setRejectComment}
            value={rejectComment}
          />
        </div>
        {actionError ? <p className="mt-3 text-sm text-error">{actionError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button disabled={submitting} onClick={() => setRejectOpen(false)} size="sm" variant="outline">
            {t("common:cancel", { ns: "common" })}
          </Button>
          <Button disabled={submitting} onClick={() => void handleReject()} size="sm" variant="primary">
            {t("myMinistry.approvals.detail.reject")}
          </Button>
        </div>
      </Modal>
    </main>
  );
};

export default MinistryApprovalDetailPage;
