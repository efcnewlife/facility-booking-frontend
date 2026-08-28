import { useAuth } from "@/context/AuthContext";
import { MinistryMembershipProvider, useMinistryMembership } from "@/context/MinistryMembershipContext";
import NotFoundPage from "@/pages/not-found/NotFoundPage";
import { MY_MINISTRY_PATH, visitAccess } from "@/utils/visitAccess";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import AppLayout from "./AppLayout";

const LoadingScreen = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container">
      <p className="text-sm font-medium text-on-surface-variant">{t("common:loading")}</p>
    </div>
  );
};

const AuthenticatedChrome = () => {
  const { isAuthenticated } = useAuth();
  const { canAccessMyMinistry, isLoading } = useMinistryMembership();
  const { pathname } = useLocation();

  const isMyMinistryPath = pathname === MY_MINISTRY_PATH || pathname === `${MY_MINISTRY_PATH}/`;
  if (isMyMinistryPath && isLoading) {
    return <LoadingScreen />;
  }

  const access = visitAccess({
    isAuthenticated,
    canAccessMyMinistry,
    pathname,
  });

  if (access === "not-found") {
    return <NotFoundPage />;
  }

  return <AppLayout />;
};

const AuthenticatedLayout = () => {
  return (
    <MinistryMembershipProvider>
      <AuthenticatedChrome />
    </MinistryMembershipProvider>
  );
};

export default AuthenticatedLayout;
