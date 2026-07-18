import type { User } from "@/types/auth";
import { getDisplayName } from "@/data/mockProfile";
import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";
import { MdAccountCircle, MdPhotoCamera } from "react-icons/md";

interface ProfileHeroProps {
  user: User | null;
  className?: string;
}

const ProfileHero = ({ user, className }: ProfileHeroProps) => {
  const { t } = useTranslation("booking");
  const displayName = getDisplayName(user);

  const handleUpdatePhoto = () => {
    console.info("update_profile_photo");
  };

  return (
    <section className={cn("relative", className)}>
      <div className="relative h-[265px] w-full overflow-hidden">
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          src="/images/booking/gradient-bg.png"
        />
      </div>

      <div className="relative mx-auto max-w-[1030px] px-4 sm:px-6 lg:px-0">
        <div className="-mt-24 flex flex-col items-center pb-8 text-center sm:-mt-28">
          <div className="relative">
            <div className="flex size-[160px] items-center justify-center overflow-hidden rounded-full bg-booking-grey shadow-[0_4px_12px_rgba(0,0,0,0.12)] sm:size-[200px]">
              {user?.avatar ? (
                <img alt="" className="size-full object-cover" src={user.avatar} />
              ) : (
                <MdAccountCircle className="size-24 text-booking-text sm:size-32" />
              )}
            </div>
            <button
              aria-label={t("profile.updatePhoto")}
              className="absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full border-2 border-surface bg-surface text-booking-text shadow-sm transition-colors hover:text-primary"
              onClick={handleUpdatePhoto}
              type="button"
            >
              <MdPhotoCamera className="size-5" />
            </button>
          </div>

          <h1 className="mt-6 text-4xl font-bold text-booking-primary sm:text-[50px] sm:leading-none">{displayName}</h1>

          <p className="mt-3 flex items-center gap-3 text-lg font-medium text-booking-text sm:text-xl">
            <span>{t("profile.churchMember")}</span>
            <span aria-hidden className="h-5 w-0.5 bg-booking-primary" />
            <span>{t("profile.userType")}</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ProfileHero;
