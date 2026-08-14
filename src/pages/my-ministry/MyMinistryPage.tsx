import { useTranslation } from "react-i18next";

const MyMinistryPage = () => {
  const { t } = useTranslation("booking");

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
      <h1 className="text-center text-2xl font-bold text-on-surface">{t("myMinistry.pageTitle")}</h1>
    </main>
  );
};

export default MyMinistryPage;
