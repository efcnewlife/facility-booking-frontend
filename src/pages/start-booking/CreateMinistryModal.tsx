import ministryService from "@/api/services/ministryService";
import type { AssignablePosition, LocaleItem } from "@/types/ministry";
import { Alert, Button, Input, Modal, Select } from "@efcnewlife/newlife-ui";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

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

const CreateMinistryModal = ({ isOpen, userId, onClose, onSubmitted }: CreateMinistryModalProps) => {
  const { t } = useTranslation("booking");
  const [phase, setPhase] = useState<"form" | "confirmation">("form");
  const [positions, setPositions] = useState<AssignablePosition[]>([]);
  const [locales, setLocales] = useState<LocaleItem[]>([]);
  const [ministryName, setMinistryName] = useState("");
  const [ownerPositionId, setOwnerPositionId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLocaleId = useMemo(() => resolveLocaleId(locales), [locales]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setPhase("form");
    setMinistryName("");
    setPurpose("");
    setError(null);
    const loadForm = async () => {
      setLoading(true);
      try {
        const [positionResult, localeResult] = await Promise.all([
          ministryService.listAssignablePositions(),
          ministryService.listLocales(),
        ]);
        setPositions(positionResult.items || []);
        setLocales(localeResult.items || []);
        if (positionResult.items?.[0]?.id) {
          setOwnerPositionId(positionResult.items[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("startBooking.errors.loadCreateForm"));
      } finally {
        setLoading(false);
      }
    };
    void loadForm();
  }, [isOpen, t]);

  const handleClose = () => {
    if (phase === "confirmation") {
      onSubmitted();
    }
    onClose();
  };

  const handleSubmit = async () => {
    if (!ministryName.trim() || !ownerPositionId || !defaultLocaleId) {
      setError(t("startBooking.errors.createMinistryValidation"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const description = purpose.trim();
      await ministryService.createApplication({
        ownerPositionId,
        hasPriorityBooking: true,
        translations: [
          {
            localeId: defaultLocaleId,
            name: ministryName.trim(),
            ...(description ? { description } : {}),
          },
        ],
        members: userId
          ? [
              {
                userId,
                memberRole: "primary",
              },
            ]
          : [],
      });
      setPhase("confirmation");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("startBooking.errors.createMinistry"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      footer={
        phase === "confirmation" ? (
          <Button onClick={handleClose} size="sm" variant="primary">
            {t("startBooking.createMinistry.close")}
          </Button>
        ) : (
          <div className="flex flex-wrap justify-end gap-3">
            <Button onClick={handleClose} size="sm" variant="outline">
              {t("startBooking.back")}
            </Button>
            <Button disabled={loading} onClick={() => void handleSubmit()} size="sm" variant="primary">
              {t("startBooking.createMinistry.submit")}
            </Button>
          </div>
        )
      }
      isOpen={isOpen}
      onClose={handleClose}
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
          {error ? (
            <Alert message={error} title={t("startBooking.errors.title")} variant="error" width="full" />
          ) : null}
          <Input
            id="create-ministry-name"
            label={t("startBooking.createMinistry.name")}
            onChange={(event) => setMinistryName(event.target.value)}
            required
            value={ministryName}
          />
          <Select
            id="create-ministry-owner"
            label={t("startBooking.createMinistry.ownerPosition")}
            onChange={(value) => {
              if (typeof value === "string") {
                setOwnerPositionId(value);
              }
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
            required
            value={ownerPositionId}
          />
          <Input
            id="create-ministry-purpose"
            label={t("startBooking.createMinistry.purpose")}
            onChange={(event) => setPurpose(event.target.value)}
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
    </Modal>
  );
};

export default CreateMinistryModal;
