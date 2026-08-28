import MyApplicationsTab from "@/pages/my-ministry/MyApplicationsTab";
import { Tabs } from "@efcnewlife/newlife-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type MyMinistryTab = "applications" | "approvals";

const MyMinistryPage = () => {
  const { t } = useTranslation("booking");
  const [activeTab, setActiveTab] = useState<MyMinistryTab>("applications");

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
      <h1 className="text-center text-2xl font-bold text-on-surface">{t("myMinistry.pageTitle")}</h1>

      <div className="mt-8">
        <Tabs
          aria-label={t("myMinistry.tabs.ariaLabel")}
          onChange={(value) => setActiveTab(value as MyMinistryTab)}
          tabs={[
            { value: "applications", label: t("myMinistry.tabs.applications") },
            { value: "approvals", label: t("myMinistry.tabs.approvals") },
          ]}
          value={activeTab}
        />

        <div className="mt-6" role="tabpanel">
          {activeTab === "applications" ? (
            <MyApplicationsTab />
          ) : (
            <p className="text-sm font-medium text-on-surface-variant">{t("myMinistry.approvals.comingSoon")}</p>
          )}
        </div>
      </div>
    </main>
  );
};

export default MyMinistryPage;
