import { Button } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

const NotFoundPage = () => {
  const { t } = useTranslation("booking");
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-container px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-on-surface">{t("notFound.title")}</h1>
      <p className="mt-3 text-on-surface-variant">{t("notFound.body")}</p>
      <Button className="mt-8" onClick={() => navigate("/")} variant="primary">
        {t("notFound.backHome")}
      </Button>
    </main>
  );
};

export default NotFoundPage;
