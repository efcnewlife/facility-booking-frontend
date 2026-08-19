import { cn } from "@efcnewlife/newlife-ui";
import { Outlet, useLocation } from "react-router";
import SupportFooter from "./SupportFooter";
import TopNavBar from "./TopNavBar";

const AppLayout = () => {
  const { pathname } = useLocation();
  const lockViewport = pathname === "/rooms";

  return (
    <div className={cn("flex flex-col bg-surface-container", lockViewport ? "h-dvh overflow-hidden" : "min-h-screen")}>
      <TopNavBar />
      <div className={cn("flex flex-1 flex-col", lockViewport && "min-h-0 overflow-hidden")}>
        <Outlet />
      </div>
      <SupportFooter />
    </div>
  );
};

export default AppLayout;
