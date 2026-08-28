import ministryService from "@/api/services/ministryService";
import i18n from "@/i18n";
import type { AssignablePosition, LocaleItem, MinistryCatalogItem, OrgUserSearchItem } from "@/types/ministry";
import {
  applyTargetAudienceSelection,
  canSelectSecondarySteward,
  shouldSearchSecondaryStewards,
  validateCreateMinistryForm,
  type CreateMinistryValidationKey,
} from "@/utils/createMinistryForm";
import { resolveMinistryApplicationErrorMessage } from "@/utils/ministryApplicationErrors";
import { Alert, Button, ComboBox, Input, ModalForm, type ModalFormHandle, Select } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface CreateMinistryModalProps {
  isOpen: boolean;
  userId?: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const resolveLocaleId = (locales: LocaleItem[]): string => {
  const lang = (i18n.language || "en").toLowerCase();
  const match =
    locales.find((item) => {
      const code = `${item.languageCode || ""}${item.regionCode ? `-${item.regionCode}` : ""}`.toLowerCase();
      return code === lang || code.startsWith(lang.split("-")[0]);
    }) ||
    locales.find((item) => item.isDefault) ||
    locales[0];
  return match?.id || "";
};

const formatUserLabel = (item: OrgUserSearchItem): string => {
  const name = item.displayName?.trim();
  const email = item.email?.trim();
  if (name && email) {
    return `${name} (${email})`;
  }
  return name || email || item.id;
};

const CreateMinistryModal = ({ isOpen, userId, onClose, onSubmitted }: CreateMinistryModalProps) => {
  const { t } = useTranslation("booking");
  const modalRef = useRef<ModalFormHandle>(null);
  const [phase, setPhase] = useState<"form" | "confirmation">("form");
  const [positions, setPositions] = useState<AssignablePosition[]>([]);
  const [locales, setLocales] = useState<LocaleItem[]>([]);
  const [ministryTypes, setMinistryTypes] = useState<MinistryCatalogItem[]>([]);
  const [targetAudiences, setTargetAudiences] = useState<MinistryCatalogItem[]>([]);
  const [ministryName, setMinistryName] = useState("");
  const [ministryTypeId, setMinistryTypeId] = useState("");
  const [ownerPositionId, setOwnerPositionId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [targetAudienceIds, setTargetAudienceIds] = useState<string[]>([]);
  const [secondaryStewardIds, setSecondaryStewardIds] = useState<string[]>([]);
  const [stewardUsersById, setStewardUsersById] = useState<Record<string, OrgUserSearchItem>>({});
  const [stewardSearchQuery, setStewardSearchQuery] = useState("");
  const [stewardSearchLoading, setStewardSearchLoading] = useState(false);
  const [stewardSearchResults, setStewardSearchResults] = useState<OrgUserSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLocaleId = useMemo(() => resolveLocaleId(locales), [locales]);

  const resetForm = useCallback(() => {
    setPhase("form");
    setMinistryName("");
    setMinistryTypeId("");
    setOwnerPositionId("");
    setPurpose("");
    setTargetAudienceIds([]);
    setSecondaryStewardIds([]);
    setStewardUsersById({});
    setStewardSearchQuery("");
    setStewardSearchResults([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    resetForm();
    const loadForm = async () => {
      setLoading(true);
      try {
        const [positionResult, localeResult, ministryTypeResult, targetAudienceResult] = await Promise.all([
          ministryService.listAssignablePositions(),
          ministryService.listLocales(),
          ministryService.listMinistryTypes(),
          ministryService.listTargetAudiences(),
        ]);
        setPositions(positionResult.items || []);
        setLocales(localeResult.items || []);
        setMinistryTypes(ministryTypeResult.items || []);
        setTargetAudiences(targetAudienceResult.items || []);
      } catch (err) {
        setError(resolveMinistryApplicationErrorMessage(err, "startBooking.errors.loadCreateForm"));
      } finally {
        setLoading(false);
      }
    };
    void loadForm();
  }, [isOpen, resetForm]);

  useEffect(() => {
    if (!shouldSearchSecondaryStewards(stewardSearchQuery)) {
      setStewardSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        setStewardSearchLoading(true);
        try {
          const result = await ministryService.searchUsers(stewardSearchQuery.trim());
          const filtered = (result.items || []).filter((item) => canSelectSecondarySteward(item.id, userId));
          setStewardSearchResults(filtered);
          setStewardUsersById((current) => {
            const next = { ...current };
            filtered.forEach((item) => {
              next[item.id] = item;
            });
            return next;
          });
        } catch {
          setStewardSearchResults([]);
        } finally {
          setStewardSearchLoading(false);
        }
      })();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [stewardSearchQuery, userId]);

  const stewardComboBoxOptions = useMemo(() => {
    const merged = new Map<string, OrgUserSearchItem>();
    secondaryStewardIds.forEach((id) => {
      const existing = stewardUsersById[id];
      if (existing) {
        merged.set(id, existing);
      }
    });
    stewardSearchResults.forEach((item) => {
      merged.set(item.id, item);
    });
    return Array.from(merged.values()).map((item) => ({
      value: item.id,
      label: formatUserLabel(item),
    }));
  }, [secondaryStewardIds, stewardSearchResults, stewardUsersById]);

  const handleClose = () => {
    if (phase === "confirmation") {
      onSubmitted();
    }
    onClose();
  };

  const validationMessage = (key: CreateMinistryValidationKey): string => t(`startBooking.errors.${key}`);

  const handleSubmit = async () => {
    if (phase === "confirmation") {
      return;
    }

    const validationKey = validateCreateMinistryForm(
      {
        ministryName,
        ministryTypeId,
        ownerPositionId,
        purpose,
        localeId: defaultLocaleId,
        targetAudienceIds,
        secondaryStewardIds,
      },
      targetAudiences,
      userId
    );
    if (validationKey) {
      setError(validationMessage(validationKey));
      return;
    }

    if (!userId) {
      setError(validationMessage("createMinistryValidation"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await ministryService.createApplication({
        ownerPositionId,
        ministryTypeId,
        targetAudienceIds,
        hasPriorityBooking: true,
        translations: [
          {
            localeId: defaultLocaleId,
            name: ministryName.trim(),
            description: purpose.trim(),
          },
        ],
        members: [
          {
            userId,
            memberRole: "primary",
          },
          ...secondaryStewardIds.map((stewardUserId) => ({
            userId: stewardUserId,
            memberRole: "secondary" as const,
          })),
        ],
      });
      setPhase("confirmation");
    } catch (err) {
      setError(resolveMinistryApplicationErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalForm
      className="max-w-2xl w-full mx-4 p-6"
      footer={
        phase === "confirmation" ? (
          <Button onClick={handleClose} size="sm" variant="primary">
            {t("startBooking.createMinistry.close")}
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} size="sm" variant="outline">
              {t("startBooking.back")}
            </Button>
            <Button disabled={loading} onClick={() => modalRef.current?.submit()} size="sm" variant="primary">
              {t("startBooking.createMinistry.submit")}
            </Button>
          </>
        )
      }
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={async (event) => {
        event.preventDefault();
        await handleSubmit();
      }}
      ref={modalRef}
      title={
        phase === "confirmation"
          ? t("startBooking.createMinistry.submittedTitle")
          : t("startBooking.createMinistry.title")
      }
    >
      {phase === "confirmation" ? (
        <div className="space-y-2 text-on-surface">
          <p>{t("startBooking.createMinistry.submittedBodyHours")}</p>
          <p>{t("startBooking.createMinistry.submittedBodyReturn")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error ? <Alert message={error} title={t("startBooking.errors.title")} variant="error" width="full" /> : null}
          <Input
            id="create-ministry-name"
            label={t("startBooking.createMinistry.name")}
            onChange={(event) => setMinistryName(event.target.value)}
            placeholder={t("startBooking.createMinistry.namePlaceholder")}
            required
            value={ministryName}
          />
          <Select
            id="create-ministry-type"
            label={t("startBooking.createMinistry.ministryType")}
            labels={{
              noOptions: t("startBooking.createMinistry.ministryTypeEmpty"),
              searchOptions: t("startBooking.createMinistry.ministryTypeSearch"),
            }}
            onChange={(value) => {
              setMinistryTypeId(typeof value === "string" ? value : "");
            }}
            options={ministryTypes.map((item) => ({
              value: item.id,
              label: item.name || item.code,
            }))}
            placeholder={t("startBooking.createMinistry.ministryTypePlaceholder")}
            required
            searchable
            value={ministryTypeId || null}
          />
          <ComboBox<string>
            filterFunction={() => true}
            id="create-ministry-target-audiences"
            label={t("startBooking.createMinistry.targetAudiences")}
            hint={t("startBooking.createMinistry.targetAudiencesHint")}
            multiple
            onChange={(value) => {
              const nextIds = value ?? [];
              const added = nextIds.find((id) => !targetAudienceIds.includes(id));
              const removed = targetAudienceIds.find((id) => !nextIds.includes(id));
              if (added) {
                setTargetAudienceIds(applyTargetAudienceSelection(targetAudienceIds, added, targetAudiences, true));
                return;
              }
              if (removed) {
                setTargetAudienceIds(applyTargetAudienceSelection(targetAudienceIds, removed, targetAudiences, false));
                return;
              }
              setTargetAudienceIds(nextIds);
            }}
            options={targetAudiences.map((item) => ({
              value: item.id,
              label: item.name || item.code,
            }))}
            placeholder={t("startBooking.createMinistry.targetAudiencesPlaceholder")}
            value={targetAudienceIds}
          />
          <Select
            id="create-ministry-owner"
            label={t("startBooking.createMinistry.ownerPosition")}
            labels={{
              noOptions: t("startBooking.createMinistry.ownerEmpty"),
              searchOptions: t("startBooking.createMinistry.ownerSearch"),
            }}
            onChange={(value) => {
              setOwnerPositionId(typeof value === "string" ? value : "");
            }}
            options={positions.map((position) => {
              const name = position.name || position.code || position.id;
              const officeKey = position.office?.toLowerCase();
              const officeLabel = officeKey
                ? t(`startBooking.createMinistry.office.${officeKey}`, {
                    defaultValue: position.office || "",
                  })
                : "";
              return {
                value: position.id,
                label: officeLabel ? `${name} (${officeLabel})` : name,
              };
            })}
            placeholder={t("startBooking.createMinistry.ownerPositionPlaceholder")}
            required
            searchable
            value={ownerPositionId || null}
          />
          <ComboBox<string>
            filterFunction={() => true}
            hint={t("startBooking.createMinistry.secondaryStewardsSearchHint")}
            id="create-ministry-secondary-stewards"
            label={t("startBooking.createMinistry.secondaryStewards")}
            loading={stewardSearchLoading}
            multiple
            onChange={(value) => {
              const nextIds = (value ?? []).filter((id) => canSelectSecondarySteward(id, userId));
              setSecondaryStewardIds(nextIds);
            }}
            onQueryChange={setStewardSearchQuery}
            options={stewardComboBoxOptions}
            placeholder={t("startBooking.createMinistry.secondaryStewardsPlaceholder")}
            required
            value={secondaryStewardIds}
          />
          <Input
            id="create-ministry-purpose"
            label={t("startBooking.createMinistry.purpose")}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder={t("startBooking.createMinistry.purposePlaceholder")}
            required
            value={purpose}
          />
          <Alert
            message={t("startBooking.createMinistry.approvalMessage")}
            title={t("startBooking.createMinistry.approvalTitle")}
            variant="warning"
            width="full"
          />
        </div>
      )}
    </ModalForm>
  );
};

export default CreateMinistryModal;
