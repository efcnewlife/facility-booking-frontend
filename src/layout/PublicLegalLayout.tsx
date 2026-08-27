import { useAuth } from "@/context/AuthContext";
import { MinistryMembershipProvider } from "@/context/MinistryMembershipContext";
import { resolvePublicLegalChrome } from "@/utils/resolvePublicLegalChrome";
import { Outlet } from "react-router";
import PublicLegalHeader from "./PublicLegalHeader";
import TopNavBar from "./TopNavBar";

const PublicLegalLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const chrome = resolvePublicLegalChrome({ isLoading, isAuthenticated });

  return (
    <div className="min-h-screen bg-surface-container">
      {chrome === "top_nav_bar" ? (
        <MinistryMembershipProvider>
          <TopNavBar />
        </MinistryMembershipProvider>
      ) : (
        <PublicLegalHeader />
      )}
      <Outlet />
    </div>
  );
};

export default PublicLegalLayout;
