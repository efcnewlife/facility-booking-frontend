import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

const ProtectedRoute = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container">
        <p className="text-sm font-medium text-on-surface-variant">{t("common:loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/login" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
