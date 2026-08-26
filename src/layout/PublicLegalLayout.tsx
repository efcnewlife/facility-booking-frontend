import AuthLocaleSelect from "@/components/auth/AuthLocaleSelect";
import { Outlet } from "react-router";

const PublicLegalLayout = () => {
  return (
    <div className="min-h-screen bg-surface-container">
      <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
        <AuthLocaleSelect />
      </div>
      <Outlet />
    </div>
  );
};

export default PublicLegalLayout;
