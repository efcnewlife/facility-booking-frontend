import { Alert } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

// Alert clamps its message; policy copy must stay whole even at phone width.
const UNCLAMPED_MESSAGE_LINES = 20;

interface PersonalPriorityReminderProps {
  ministryId?: string | null;
  scope: "booking" | "series";
  className?: string;
}

/** Policy information for Personal Bookings only; it never stands in for the actual lifecycle outcome. */
const PersonalPriorityReminder = ({ ministryId, scope, className }: PersonalPriorityReminderProps) => {
  const { t } = useTranslation("booking");

  if (ministryId) {
    return null;
  }

  return (
    <Alert
      className={className}
      message={t(`priorityReminder.${scope}`)}
      messageLines={UNCLAMPED_MESSAGE_LINES}
      size="sm"
      title={t("priorityReminder.title")}
      variant="warning"
      width="full"
    />
  );
};

export default PersonalPriorityReminder;
