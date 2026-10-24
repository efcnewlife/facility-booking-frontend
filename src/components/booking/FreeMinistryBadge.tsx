import { Badge } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

/** Marks a server-confirmed free Ministry booking; never derive it from a Ministry id alone. */
const FreeMinistryBadge = () => {
  const { t } = useTranslation("booking");
  return (
    <Badge color="success" size="sm">
      {t("freeMinistry.badge")}
    </Badge>
  );
};

export default FreeMinistryBadge;
