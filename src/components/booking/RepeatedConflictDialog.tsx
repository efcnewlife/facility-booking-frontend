import type { RecurringBookingConflict } from "@/api/services/facilityService";
import { conflictPresentationKey, type RecurringConflictDateGroup } from "@/utils/recurringBookingConflicts";
import { Modal } from "@efcnewlife/newlife-ui";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDialogFocus } from "./useDialogFocus";

interface RepeatedConflictDialogProps {
  group: RecurringConflictDateGroup | null;
  isExcluded: boolean;
  updating: boolean;
  roomName: (facilityId: string) => string;
  formatDate: (occurrenceDate: string) => string;
  timeRange: string;
  onToggleSkip: () => void;
  onClose: () => void;
}

const KIND_LABEL_KEYS = {
  occupancy_overridable: "timetable.override",
  occupancy_blocked: "override.conflicts.occupancy",
  ministry: "override.conflicts.ministry",
  blackout: "override.conflicts.blackout",
  opening_hours: "override.conflicts.opening_hours",
  weekly_quota: "override.conflicts.weekly_quota",
} as const;

/** The server redacts Personal conflicts, so a contact is shown only when this proposal is authorized to see it. */
const conflictContact = (conflict: RecurringBookingConflict): { name: string | null; email: string | null } => {
  if (conflict.kind === "ministry") {
    return { name: conflict.ministryStewardDisplayName, email: conflict.ministryStewardEmail };
  }
  return { name: conflict.bookerDisplayName, email: conflict.bookerEmail };
};

/** One later occurrence's conflicts and authorized contacts; Skip the date excludes that whole occurrence. */
const RepeatedConflictDialog = ({
  group,
  isExcluded,
  updating,
  roomName,
  formatDate,
  timeRange,
  onToggleSkip,
  onClose,
}: RepeatedConflictDialogProps) => {
  const { t } = useTranslation("booking");
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(group != null, closeRef, onClose);

  return (
    <Modal
      className="mx-4 w-full max-w-md p-6"
      footer={
        <>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md border border-outline bg-white px-4 text-sm font-semibold text-booking-primary"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            {t("timetable.contact.close")}
          </button>
          <button
            className="inline-flex h-9 items-center justify-center rounded-md bg-booking-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={updating}
            onClick={onToggleSkip}
            type="button"
          >
            {t(isExcluded ? "repeatedConflicts.include" : "repeatedConflicts.skip")}
          </button>
        </>
      }
      isOpen={group != null}
      onClose={onClose}
      title={t("timetable.contact.title")}
    >
      {group ? (
        <div className="flex flex-col gap-4 text-sm text-on-surface">
          <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2">
            <dt className="font-semibold">{t("override.date")}</dt>
            <dd className="m-0">{formatDate(group.occurrenceDate)}</dd>
            <dt className="font-semibold">{t("override.time")}</dt>
            <dd className="m-0">{timeRange}</dd>
          </dl>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {group.conflicts.map((conflict, index) => {
              const contact = conflictContact(conflict);
              return (
                <li
                  className="flex flex-col gap-1 rounded-md border border-outline-variant p-3"
                  key={`${conflict.kind}-${conflict.facilityIds.join(",")}-${index}`}
                >
                  <p className="m-0 font-semibold">{t(KIND_LABEL_KEYS[conflictPresentationKey(conflict)])}</p>
                  <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
                    {conflict.facilityIds.length > 0 ? (
                      <>
                        <dt className="font-semibold">{t("override.room")}</dt>
                        <dd className="m-0">{conflict.facilityIds.map(roomName).join(", ")}</dd>
                      </>
                    ) : null}
                    {contact.name ? (
                      <>
                        <dt className="font-semibold">{t("timetable.contact.name")}</dt>
                        <dd className="m-0">{contact.name}</dd>
                      </>
                    ) : null}
                    {contact.email ? (
                      <>
                        <dt className="font-semibold">{t("timetable.contact.email")}</dt>
                        <dd className="m-0">
                          <a className="text-booking-secondary underline" href={`mailto:${contact.email}`}>
                            {contact.email}
                          </a>
                        </dd>
                      </>
                    ) : null}
                  </dl>
                </li>
              );
            })}
          </ul>
          <p className="m-0 text-on-surface-variant">{t("repeatedConflicts.skipHint")}</p>
        </div>
      ) : null}
    </Modal>
  );
};

export default RepeatedConflictDialog;
