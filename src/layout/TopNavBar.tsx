import AppLocaleSelect from "@/components/auth/AppLocaleSelect";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@efcnewlife/newlife-ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { MdAccountCircle } from "react-icons/md";

const NAV_ITEMS = [
  { path: "/", labelKey: "nav.bookNow", end: true },
  { path: "/my-bookings", labelKey: "nav.myBookings", end: false },
  { path: "/contact", labelKey: "nav.contact", end: false },
] as const;

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
      "min-w-[88px] text-center text-sm leading-none transition-colors",
      isActive ? "font-bold text-primary" : "font-medium text-slate-900 hover:text-primary",
    );

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-40 bg-surface">
      <div className="mx-auto flex h-16 max-w-[1366px] items-center justify-between px-4 sm:px-6 lg:px-12">
        <Link className="flex min-w-0 items-center gap-3" to="/">
          <img
            alt="EFC New Life"
            className="h-8 w-auto max-w-[200px] shrink-0 object-contain object-left"
            src="/images/logo/dark-gray.png"
          />
          <span className="truncate text-sm font-bold text-on-surface sm:text-base">{t("appTitle")}</span>
        </Link>

        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                className={navLinkClass(isNavActive(pathname, item.path, item.end))}
                to={item.path}
              >
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
