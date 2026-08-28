import MyApplicationsTab from "@/pages/my-ministry/MyApplicationsTab";
import PendingApprovalsTab from "@/pages/my-ministry/PendingApprovalsTab";
import { Tabs } from "@efcnewlife/newlife-ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

type MyMinistryTab = "applications" | "approvals";

const isMyMinistryTab = (value: string | null): value is MyMinistryTab => {
  return value === "applications" || value === "approvals";
};

const MyMinistryPage = () => {
  const { t } = useTranslation("booking");
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<MyMinistryTab>(isMyMinistryTab(tabParam) ? tabParam : "applications");

  useEffect(() => {
    if (isMyMinistryTab(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [activeTab, tabParam]);

  const handleTabChange = (value: string) => {
    const nextTab = value as MyMinistryTab;
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === "applications") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
      <h1 className="text-center text-2xl font-bold text-on-surface">{t("myMinistry.pageTitle")}</h1>

      <div className="mt-8">
        <Tabs
          aria-label={t("myMinistry.tabs.ariaLabel")}
          onChange={handleTabChange}
          tabs={[
            { value: "applications", label: t("myMinistry.tabs.applications") },
            { value: "approvals", label: t("myMinistry.tabs.approvals") },
          ]}
          value={activeTab}
        />

        <div className="mt-6" role="tabpanel">
          {activeTab === "applications" ? <MyApplicationsTab /> : <PendingApprovalsTab />}
        </div>
      </div>
    </main>
  );
};

export default MyMinistryPage;
