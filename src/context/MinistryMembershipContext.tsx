import { ministryService } from "@/api/services/ministryService";
import { isMinistryMemberFromList } from "@/utils/visitAccess";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

interface MinistryMembershipContextType {
  isMinistryMember: boolean;
  canAccessMyMinistry: boolean;
  isLoading: boolean;
  refreshMembership: () => Promise<void>;
}

const MinistryMembershipContext = createContext<MinistryMembershipContextType | undefined>(undefined);

interface MinistryMembershipProviderProps {
  children: ReactNode;
}

export const MinistryMembershipProvider = ({ children }: MinistryMembershipProviderProps) => {
  const [isMinistryMember, setIsMinistryMember] = useState(false);
  const [canAccessMyMinistry, setCanAccessMyMinistry] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadMembership = useCallback(async (isCancelled?: () => boolean): Promise<void> => {
    const cancelled = () => isCancelled?.() ?? false;

    try {
      const [mineResult, pendingResult] = await Promise.all([
        ministryService.listMine(true),
        ministryService.listPendingApprovalsForMe().catch(() => ({ items: [] })),
      ]);
      if (cancelled()) {
        return;
      }
      const hasMinistries = isMinistryMemberFromList(mineResult.items || []);
      const hasPendingApprovals = (pendingResult.items || []).length > 0;
      setIsMinistryMember(hasMinistries);
      setCanAccessMyMinistry(hasMinistries || hasPendingApprovals);
    } catch {
      if (!cancelled()) {
        setIsMinistryMember(false);
        setCanAccessMyMinistry(false);
      }
    }
  }, []);

  const refreshMembership = useCallback(async (): Promise<void> => {
    await loadMembership();
  }, [loadMembership]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await loadMembership(() => cancelled);
      if (!cancelled) {
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadMembership]);

  return (
    <MinistryMembershipContext.Provider value={{ isMinistryMember, canAccessMyMinistry, isLoading, refreshMembership }}>
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
