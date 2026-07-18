export interface PaymentRecord {
  id: string;
  year: number;
  paidLabel: string;
  description: string;
  amount: number;
}

export interface ProfileDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  loginUsername: string;
  roleLabel: string;
  userTypeLabel: string;
}
