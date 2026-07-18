import { Outlet } from "react-router";
import SupportFooter from "./SupportFooter";
import TopNavBar from "./TopNavBar";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-surface-container">
      <TopNavBar />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <SupportFooter />
    </div>
  );
};

export default AppLayout;
