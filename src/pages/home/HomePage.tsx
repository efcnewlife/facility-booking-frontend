import { Button } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

const HomePage = () => {
  const { t } = useTranslation("booking");
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-on-surface">{t("home.welcomeTitle")}</h1>
      <p className="mt-3 text-on-surface-variant">{t("home.welcomeBody")}</p>
      <Button className="mt-8" onClick={() => navigate("/start-booking")} variant="primary">
        {t("home.startBooking")}
      </Button>
    </main>
  );
};

export default HomePage;
