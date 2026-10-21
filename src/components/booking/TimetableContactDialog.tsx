import { Modal } from "@efcnewlife/newlife-ui";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface TimetableContactTarget {
  roomName: string;
  start: string;
  end: string;
  presentation: "ministry" | "rentalContact";
  ministryName: string | null;
  displayName: string | null;
  email: string | null;
}

interface TimetableContactDialogProps {
  target: TimetableContactTarget | null;
  formatClock: (clock: string) => string;
  onClose: () => void;
}

const TimetableContactDialog = ({ target, formatClock, onClose }: TimetableContactDialogProps) => {
  const { t } = useTranslation("booking");
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!target) {
      return;
    }
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [target]);

  return (
    <Modal
      className="mx-4 w-full max-w-md p-6"
      footer={
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-outline bg-white px-4 text-sm font-semibold text-booking-primary"
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          {t("timetable.contact.close")}
        </button>
      }
      isOpen={target != null}
      onClose={onClose}
      title={t("timetable.contact.title")}
    >
      {target ? (
        <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm text-on-surface">
          <dt className="font-semibold">{t("timetable.contact.room")}</dt>
          <dd className="m-0">{target.roomName}</dd>
          <dt className="font-semibold">{t("timetable.contact.time")}</dt>
          <dd className="m-0">
            {formatClock(target.start)} – {formatClock(target.end)}
          </dd>
          {target.presentation === "ministry" && target.ministryName ? (
            <>
              <dt className="font-semibold">{t("timetable.contact.ministry")}</dt>
              <dd className="m-0">{target.ministryName}</dd>
            </>
          ) : null}
          {target.displayName ? (
            <>
              <dt className="font-semibold">{t("timetable.contact.name")}</dt>
              <dd className="m-0">{target.displayName}</dd>
            </>
          ) : null}
          {target.email ? (
            <>
              <dt className="font-semibold">{t("timetable.contact.email")}</dt>
              <dd className="m-0">
                <a className="text-booking-secondary underline" href={`mailto:${target.email}`}>
                  {target.email}
                </a>
              </dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </Modal>
  );
};

export default TimetableContactDialog;
