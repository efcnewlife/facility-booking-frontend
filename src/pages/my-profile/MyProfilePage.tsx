import { useAuth } from "@/context/AuthContext";
import PersonalInfoCard from "@/components/profile/PersonalInfoCard";
import PaymentHistoryCard from "@/components/profile/PaymentHistoryCard";
import ProfileHero from "@/components/profile/ProfileHero";
import { buildProfileDetails, MOCK_PAYMENT_HISTORY } from "@/data/mockProfile";

const MyProfilePage = () => {
  const { user } = useAuth();
  const profileDetails = buildProfileDetails(user);

  return (
    <>
      <ProfileHero user={user} />

      <main className="mx-auto w-full max-w-[1030px] flex-1 px-4 pb-10 sm:px-6 lg:px-0">
        <PersonalInfoCard profile={profileDetails} />

        <div className="mt-[30px]">
          <PaymentHistoryCard payments={MOCK_PAYMENT_HISTORY} />
        </div>
      </main>
    </>
  );
};

export default MyProfilePage;
