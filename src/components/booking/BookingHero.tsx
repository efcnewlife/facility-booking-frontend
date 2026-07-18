import { cn } from "@efcnewlife/newlife-ui";
import { useTranslation } from "react-i18next";

interface BookingHeroProps {
  titleKey?: string;
  className?: string;
}

const BookingHero = ({ titleKey = "findSpace.title", className }: BookingHeroProps) => {
  const { t } = useTranslation("booking");

  return (
    <section className={cn("relative h-[140px] w-full overflow-hidden", className)}>
      <img
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        src="/images/booking/gradient-bg.png"
      />
      <div className="relative flex h-full items-center justify-center px-4">
        <h1 className="text-center text-3xl font-bold text-on-surface">{t(titleKey)}</h1>
      </div>
    </section>
  );
};

export default BookingHero;
