import MyApplicationsTab from "@/pages/my-ministry/MyApplicationsTab";
import PendingApprovalsTab from "@/pages/my-ministry/PendingApprovalsTab";
import { applyMyMinistryTabToSearchParams, resolveMyMinistryTab } from "@/utils/myMinistryTab";
import { Tabs } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

const MyMinistryPage = () => {
  const { t } = useTranslation("booking");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveMyMinistryTab(searchParams.get("tab"));

  const handleTabChange = (value: string) => {
    setSearchParams(applyMyMinistryTabToSearchParams(searchParams, resolveMyMinistryTab(value)), {
      replace: true,
    });
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
