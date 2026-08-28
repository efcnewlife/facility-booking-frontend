import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { buildLoginPathWithNext } from "@/utils/resolvePostLoginNext";
import { useTranslation } from "react-i18next";

const ProtectedRoute = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container">
        <p className="text-sm font-medium text-on-surface-variant">{t("common:loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnPath = `${location.pathname}${location.search}`;
    return <Navigate replace to={buildLoginPathWithNext(returnPath)} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
