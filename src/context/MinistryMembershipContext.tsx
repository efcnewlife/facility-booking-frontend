import { ministryService } from "@/api/services/ministryService";
import { isMinistryMemberFromList } from "@/utils/visitAccess";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface MinistryMembershipContextType {
  isMinistryMember: boolean;
  isLoading: boolean;
}

const MinistryMembershipContext = createContext<MinistryMembershipContextType | undefined>(undefined);

interface MinistryMembershipProviderProps {
  children: ReactNode;
}

export const MinistryMembershipProvider = ({ children }: MinistryMembershipProviderProps) => {
  const [isMinistryMember, setIsMinistryMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadMembership = async () => {
      try {
        const result = await ministryService.listMine(true);
        if (!cancelled) {
          setIsMinistryMember(isMinistryMemberFromList(result.items || []));
        }
      } catch {
        if (!cancelled) {
          setIsMinistryMember(false);
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
    <MinistryMembershipContext.Provider value={{ isMinistryMember, isLoading }}>
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
