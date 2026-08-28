import ministryService from "@/api/services/ministryService";
import i18n from "@/i18n";
import type {
  AssignablePosition,
  LocaleItem,
  MinistryCatalogItem,
  MinistryDetail,
  OrgUserSearchItem,
} from "@/types/ministry";
import {
  applyTargetAudienceSelection,
  canSelectSecondarySteward,
  shouldSearchSecondaryStewards,
  validateCreateMinistryForm,
  type CreateMinistryValidationKey,
} from "@/utils/createMinistryForm";
import { resolveMinistryApplicationErrorMessage } from "@/utils/ministryApplicationErrors";
import { Alert, Button, ComboBox, Input, ModalForm, Select, type ModalFormHandle } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ResubmitMinistryModalProps {
  ministryId: string | null;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  onResubmitted: () => void;
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

const resolveTranslationForLocale = (
  translations: MinistryDetail["translations"],
  localeId: string
): { name: string; description: string } => {
  const match = translations.find((item) => item.localeId === localeId) || translations[0];
  return {
    name: match?.name?.trim() || "",
    description: match?.description?.trim() || "",
  };
};

const ResubmitMinistryModal = ({ ministryId, userId, isOpen, onClose, onResubmitted }: ResubmitMinistryModalProps) => {
  const { t } = useTranslation("booking");
  const modalRef = useRef<ModalFormHandle>(null);
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
  const [hasPriorityBooking, setHasPriorityBooking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLocaleId = useMemo(() => resolveLocaleId(locales), [locales]);

  const resetForm = useCallback(() => {
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

  const applyDetailToForm = useCallback((detail: MinistryDetail, localeId: string) => {
    const translation = resolveTranslationForLocale(detail.translations, localeId);
    setMinistryName(translation.name);
    setPurpose(translation.description);
    setMinistryTypeId(detail.ministryTypeId || detail.ministryType?.id || "");
    setOwnerPositionId(detail.ownerPositionId || "");
    setTargetAudienceIds((detail.targetAudiences || []).map((item) => item.id));
    setHasPriorityBooking(detail.hasPriorityBooking ?? true);

    const secondaryIds = (detail.members || [])
      .filter((member) => member.memberRole === "secondary")
      .map((member) => member.userId);
    setSecondaryStewardIds(secondaryIds);

    const stewardsById: Record<string, OrgUserSearchItem> = {};
    (detail.members || []).forEach((member) => {
      if (member.memberRole === "secondary") {
        stewardsById[member.userId] = {
          id: member.userId,
          email: member.email,
          displayName: member.displayName,
        };
      }
    });
    setStewardUsersById(stewardsById);
  }, []);

  useEffect(() => {
    if (!isOpen || !ministryId) {
      return;
    }

    resetForm();
    const loadForm = async () => {
      setLoading(true);
      try {
        const [detail, positionResult, localeResult, ministryTypeResult, targetAudienceResult] = await Promise.all([
          ministryService.getApplicationDetail(ministryId),
          ministryService.listAssignablePositions(),
          ministryService.listLocales(),
          ministryService.listMinistryTypes(),
          ministryService.listTargetAudiences(),
        ]);
        setPositions(positionResult.items || []);
        setLocales(localeResult.items || []);
        setMinistryTypes(ministryTypeResult.items || []);
        setTargetAudiences(targetAudienceResult.items || []);
        const localeId = resolveLocaleId(localeResult.items || []);
        applyDetailToForm(detail, localeId);
      } catch (err) {
        setError(resolveMinistryApplicationErrorMessage(err, "myMinistry.applications.errors.loadResubmit"));
      } finally {
        setLoading(false);
      }
    };
    void loadForm();
  }, [applyDetailToForm, isOpen, ministryId, resetForm]);

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

  const ownerPositionLabel = useMemo(() => {
    const position = positions.find((item) => item.id === ownerPositionId);
    if (!position) {
      return ownerPositionId;
    }
    const name = position.name || position.code || position.id;
    const officeKey = position.office?.toLowerCase();
    const officeLabel = officeKey
      ? t(`startBooking.createMinistry.office.${officeKey}`, {
          defaultValue: position.office || "",
        })
      : "";
    return officeLabel ? `${name} (${officeLabel})` : name;
  }, [ownerPositionId, positions, t]);

  const validationMessage = (key: CreateMinistryValidationKey): string => t(`startBooking.errors.${key}`);

  const handleSubmit = async () => {
    if (!ministryId) {
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
      await ministryService.updateRejectedApplication(ministryId, {
        ministryTypeId,
        targetAudienceIds,
        hasPriorityBooking,
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
      await ministryService.resubmitApplication(ministryId);
      onResubmitted();
      onClose();
    } catch (err) {
      setError(resolveMinistryApplicationErrorMessage(err, "myMinistry.applications.errors.resubmit"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalForm
      className="max-w-2xl w-full mx-4 p-6"
      footer={
        <>
          <Button onClick={onClose} size="sm" variant="outline">
            {t("startBooking.back")}
          </Button>
          <Button disabled={loading} onClick={() => modalRef.current?.submit()} size="sm" variant="primary">
            {t("myMinistry.applications.resubmit.submit")}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={async (event) => {
        event.preventDefault();
        await handleSubmit();
      }}
      ref={modalRef}
      title={t("myMinistry.applications.resubmit.title")}
    >
      <div className="space-y-4">
        {error ? <Alert message={error} title={t("startBooking.errors.title")} variant="error" width="full" /> : null}
        <Input
          disabled
          id="resubmit-ministry-owner"
          label={t("startBooking.createMinistry.ownerPosition")}
          value={ownerPositionLabel}
        />
        <Input
          id="resubmit-ministry-name"
          label={t("startBooking.createMinistry.name")}
          onChange={(event) => setMinistryName(event.target.value)}
          placeholder={t("startBooking.createMinistry.namePlaceholder")}
          required
          value={ministryName}
        />
        <Select
          id="resubmit-ministry-type"
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
          id="resubmit-ministry-target-audiences"
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
        <ComboBox<string>
          filterFunction={() => true}
          hint={t("startBooking.createMinistry.secondaryStewardsSearchHint")}
          id="resubmit-ministry-secondary-stewards"
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
          id="resubmit-ministry-purpose"
          label={t("startBooking.createMinistry.purpose")}
          onChange={(event) => setPurpose(event.target.value)}
          placeholder={t("startBooking.createMinistry.purposePlaceholder")}
          required
          value={purpose}
        />
      </div>
    </ModalForm>
  );
};

export default ResubmitMinistryModal;
