import type { ProfileDetails } from "@/types/profile";
import { format_profile_date } from "@/utils/bookingFormat";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface PersonalInfoCardProps {
  profile: ProfileDetails;
  className?: string;
}

const PersonalInfoCard = ({ profile, className }: PersonalInfoCardProps) => {
  const { t } = useTranslation("booking");

  const handleEdit = () => {
    console.info("edit_personal_info");
  };

  return (
    <section className={cn("flex min-h-[330px] flex-col rounded-[20px] bg-surface p-9 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-outline-variant pb-5">
        <h2 className="text-xl font-bold text-booking-primary">{t("profile.personalInformation")}</h2>
        <button
          className="h-9 rounded-[21px] border border-primary bg-surface px-4 text-base font-bold text-primary transition-colors hover:bg-brand-50"
          onClick={handleEdit}
          type="button"
        >
          {t("profile.edit")}
        </button>
      </div>

      <div className="mt-5 grid flex-1 grid-cols-2 gap-x-8 gap-y-6">
        <div>
          <p className="text-xs font-medium text-booking-text">{t("profile.firstName")}</p>
          <p className="mt-2 text-base font-medium text-booking-primary">{profile.firstName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-booking-text">{t("profile.lastName")}</p>
          <p className="mt-2 text-base font-medium text-booking-primary">{profile.lastName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-booking-text">{t("profile.dateOfBirth")}</p>
          <p className="mt-2 text-base font-medium text-booking-primary">{format_profile_date(profile.dateOfBirth)}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-booking-text">{t("profile.phoneNumber")}</p>
          <p className="mt-2 text-base font-medium text-booking-primary">{profile.phoneNumber}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-medium text-booking-text">{t("profile.emailAddress")}</p>
          <p className="mt-2 text-base font-medium text-booking-primary">{profile.email}</p>
        </div>
      </div>
    </section>
  );
};

export default PersonalInfoCard;
