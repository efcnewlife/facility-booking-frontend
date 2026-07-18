import type { User } from "@/types/auth";
import type { PaymentRecord, ProfileDetails } from "@/types/profile";

export const MOCK_PAYMENT_HISTORY: PaymentRecord[] = [
  {
    id: "payment-1",
    year: 2026,
    paidLabel: "Paid February 26",
    description: "Sanctuary • March 5",
    amount: 169.5,
  },
  {
    id: "payment-2",
    year: 2026,
    paidLabel: "Paid December 20",
    description: "Gym • January 10",
    amount: 249.5,
  },
  {
    id: "payment-3",
    year: 2025,
    paidLabel: "Paid November 7",
    description: "Meeting Room XXX • November 14",
    amount: 169.5,
  },
];

export const buildProfileDetails = (user: User | null): ProfileDetails => {
  return {
    firstName: user?.firstName || "Jacky",
    lastName: user?.lastName || "Change",
    dateOfBirth: "1994-01-17",
    phoneNumber: "(519) 591-5908",
    email: user?.email || "jacky.chang@efcnewlife.org",
    loginUsername: user?.email || "jacky.chang@efcnewlife.org",
    roleLabel: "Church Member",
    userTypeLabel: "User",
  };
};

export const getDisplayName = (user: User | null): string => {
  if (user?.preferredName) {
    return user.preferredName;
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  return user?.email || "Jay Hsia";
};
