import AppLocaleSelect from "@/components/auth/AppLocaleSelect";
import { useAuth } from "@/context/AuthContext";
import { useMinistryMembership } from "@/context/MinistryMembershipContext";
import { MY_MINISTRY_PATH, SUPPORT_PATH } from "@/utils/visitAccess";
import { cn } from "@efcnewlife/newlife-ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdAccountCircle } from "react-icons/md";
import { Link, useLocation } from "react-router";

interface NavItem {
  path: string;
  labelKey: string;
  end: boolean;
  ministryOnly: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/start-booking", labelKey: "nav.bookNow", end: true, ministryOnly: false },
  { path: "/my-bookings", labelKey: "nav.myBookings", end: false, ministryOnly: false },
  { path: MY_MINISTRY_PATH, labelKey: "nav.myMinistry", end: false, ministryOnly: true },
  { path: SUPPORT_PATH, labelKey: "nav.support", end: false, ministryOnly: false },
];

const isNavActive = (pathname: string, path: string, end: boolean) => {
  if (end) {
    return pathname === path;
  }

  return pathname === path || pathname.startsWith(`${path}/`);
};

const TopNavBar = () => {
  const { t } = useTranslation("booking");
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { isMinistryMember } = useMinistryMembership();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinkClass = (isActive: boolean) =>
    cn(
      "whitespace-nowrap text-sm font-semibold leading-none transition-colors",
      isActive ? "text-booking-primary underline decoration-solid underline-offset-4" : "text-booking-secondary"
    );

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.ministryOnly || isMinistryMember);

  return (
    <header className="sticky top-0 z-40 bg-surface">
      <div className="mx-auto flex min-h-16 max-w-[1366px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-12">
        <Link className="flex min-w-0 shrink-0 items-center" to="/">
          <img
            alt={t("nav.logoAlt")}
            className="h-[39px] w-auto max-w-[min(180px,40vw)] object-contain object-left"
            src="/images/logo/booking-app-logo.png"
          />
        </Link>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-4 sm:gap-6">
          <nav
            aria-label={t("nav.primary")}
            className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-x-[30px]"
          >
            {visibleNavItems.map((item) => (
              <Link key={item.path} className={navLinkClass(isNavActive(pathname, item.path, item.end))} to={item.path}>
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="relative" ref={menuRef}>
            <button
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className="flex size-9 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen((open) => !open)}
              type="button"
            >
              <MdAccountCircle className="size-9" />
            </button>
            {isMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-[260px] overflow-hidden rounded-xl border border-outline-variant bg-surface p-3 shadow-lg"
                role="menu"
              >
                <Link
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant"
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                  to="/my-profile"
                >
                  {t("profile.myProfile")}
                </Link>

                <div className="mt-2 border-t border-outline-variant pt-3">
                  <AppLocaleSelect id="nav-locale-select" showLabel />
                </div>

                <button
                  className="mt-3 flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-on-surface transition-colors hover:bg-surface-variant"
                  onClick={handleSignOut}
                  role="menuitem"
                  type="button"
                >
                  {t("profile.signOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
