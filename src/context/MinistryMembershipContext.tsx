import { ministryService } from "@/api/services/ministryService";
import { isMinistryMemberFromList } from "@/utils/visitAccess";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface MinistryMembershipContextType {
  isMinistryMember: boolean;
  canAccessMyMinistry: boolean;
  isLoading: boolean;
}

const MinistryMembershipContext = createContext<MinistryMembershipContextType | undefined>(undefined);

interface MinistryMembershipProviderProps {
  children: ReactNode;
}

export const MinistryMembershipProvider = ({ children }: MinistryMembershipProviderProps) => {
  const [isMinistryMember, setIsMinistryMember] = useState(false);
  const [canAccessMyMinistry, setCanAccessMyMinistry] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadMembership = async () => {
      try {
        const [mineResult, pendingResult] = await Promise.all([
          ministryService.listMine(true),
          ministryService.listPendingApprovalsForMe().catch(() => ({ items: [] })),
        ]);
        if (!cancelled) {
          const hasMinistries = isMinistryMemberFromList(mineResult.items || []);
          const hasPendingApprovals = (pendingResult.items || []).length > 0;
          setIsMinistryMember(hasMinistries);
          setCanAccessMyMinistry(hasMinistries || hasPendingApprovals);
        }
      } catch {
        if (!cancelled) {
          setIsMinistryMember(false);
          setCanAccessMyMinistry(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMembership();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MinistryMembershipContext.Provider value={{ isMinistryMember, canAccessMyMinistry, isLoading }}>
      {children}
    </MinistryMembershipContext.Provider>
  );
};

export const useMinistryMembership = (): MinistryMembershipContextType => {
  const context = useContext(MinistryMembershipContext);
  if (!context) {
    throw new Error("useMinistryMembership must be used within MinistryMembershipProvider");
  }
  return context;
};
