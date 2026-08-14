import { Button } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

const HomePage = () => {
  const { t } = useTranslation("booking");
  const navigate = useNavigate();

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div aria-hidden="true" className="absolute inset-0">
        <img alt="" className="size-full object-cover" src="/images/home/hero.jpg" />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center">
        <h1 className="text-3xl font-bold text-white">{t("home.welcomeTitle")}</h1>
        <p className="mt-3 text-white/90">{t("home.welcomeBody")}</p>
        <Button className="mt-8" onClick={() => navigate("/start-booking")} variant="primary">
          {t("home.startBooking")}
        </Button>
      </div>
    </main>
  );
};

export default HomePage;
