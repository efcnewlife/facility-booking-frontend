import facilityService from "@/api/services/facilityService";
import BookingHero from "@/components/booking/BookingHero";
import MyBookingsCard from "@/components/booking/MyBookingsCard";
import { MY_BOOKINGS_SECTION, type MemberBookingListItem, type MyBookingsSection } from "@/types/myBookings";
import { format_booking_date } from "@/utils/bookingFormat";
import {
  applyBrowsePage,
  browseCardKey,
  hasMoreBrowsePages,
  INITIAL_MY_BOOKINGS_SECTION_STATE,
  MY_BOOKINGS_SECTIONS,
  type MyBookingsSectionState,
} from "@/utils/myBookings";
import { Alert, Button, Modal, Spinner } from "@efcnewlife/newlife-ui";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import { useNavigate } from "react-router";

const PAGE_SIZE = 20;

type SectionStateMap = Record<MyBookingsSection, MyBookingsSectionState>;
type ExpandedMap = Record<MyBookingsSection, boolean>;

const initialSectionStates = (): SectionStateMap =>
  Object.fromEntries(
    MY_BOOKINGS_SECTIONS.map((entry) => [entry.section, INITIAL_MY_BOOKINGS_SECTION_STATE])
  ) as SectionStateMap;

const initialExpanded = (): ExpandedMap =>
  Object.fromEntries(MY_BOOKINGS_SECTIONS.map((entry) => [entry.section, entry.defaultExpanded])) as ExpandedMap;

const MyBookingsPage = () => {
  const { t } = useTranslation("booking");
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [sections, setSections] = useState<SectionStateMap>(initialSectionStates);
  const [expanded, setExpanded] = useState<ExpandedMap>(initialExpanded);
  const [cancelBooking, setCancelBooking] = useState<MemberBookingListItem | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadSection = useCallback(
    async (section: MyBookingsSection, page: number) => {
      setSections((prev) => ({ ...prev, [section]: { ...prev[section], status: "loading", error: null } }));
      try {
        const result = await facilityService.browseMyBookings(section, page, PAGE_SIZE);
        setSections((prev) => ({ ...prev, [section]: applyBrowsePage(prev[section], result) }));
      } catch {
        setSections((prev) => ({
          ...prev,
          [section]: { ...prev[section], status: "error", error: t("myBookings.loadError") },
        }));
      }
    },
    [t]
  );

  const reloadAllSections = useCallback(() => {
    setNow(new Date());
    for (const entry of MY_BOOKINGS_SECTIONS) {
      void loadSection(entry.section, 0);
    }
  }, [loadSection]);

  useEffect(() => {
    reloadAllSections();
    // Load every section once on mount; reloadAllSections is stable across the section list it closes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        reloadAllSections();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadAllSections]);

  const toggleSection = (section: MyBookingsSection) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleConfirmCancelOneTime = async () => {
    if (!cancelBooking) {
      return;
    }
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      await facilityService.cancelMyBooking(cancelBooking.id);
      setCancelBooking(null);
      reloadAllSections();
    } catch {
      setCancelError(t("myBookings.errors.cancel"));
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <>
      <BookingHero titleKey="nav.myBookings" />

      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <div className="space-y-10">
          {MY_BOOKINGS_SECTIONS.map((entry) => {
            const state = sections[entry.section];
            const isExpanded = expanded[entry.section];
            const isInitialLoad = state.status === "loading" && state.items.length === 0;
            const showEmpty = state.status === "loaded" && state.items.length === 0;

            return (
              <section key={entry.section}>
                <button
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between gap-3 border-b border-booking-light-grey pb-3 text-left"
                  onClick={() => toggleSection(entry.section)}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <h2 className="m-0 text-2xl font-bold text-on-surface">{t(entry.titleKey)}</h2>
                    {state.status === "loaded" ? (
                      <span className="text-sm font-medium text-booking-text">{state.total}</span>
                    ) : null}
                  </span>
                  {isExpanded ? (
                    <MdExpandLess aria-hidden className="text-on-surface" size={28} />
                  ) : (
                    <MdExpandMore aria-hidden className="text-on-surface" size={28} />
                  )}
                </button>

                {isExpanded ? (
                  <div className="mt-4 space-y-4">
                    {isInitialLoad ? <Spinner showText size="sm" text={t("myBookings.loading")} /> : null}

                    {state.status === "error" ? (
                      <div className="space-y-3">
                        <Alert
                          message={state.error ?? t("myBookings.loadError")}
                          title={t("startBooking.errors.title")}
                          variant="error"
                          width="full"
                        />
                        <Button onClick={() => void loadSection(entry.section, 0)} size="sm" variant="outline">
                          {t("myBookings.retry")}
                        </Button>
                      </div>
                    ) : null}

                    {showEmpty ? <p className="text-sm font-medium text-booking-text">{t(entry.emptyKey)}</p> : null}

                    {state.items.map((card) => (
                      <MyBookingsCard
                        card={card}
                        key={browseCardKey(card)}
                        now={now}
                        onCancelOneTime={
                          entry.section === MY_BOOKINGS_SECTION.UPCOMING
                            ? (booking) => setCancelBooking(booking)
                            : undefined
                        }
                        onCancelSeries={
                          entry.section === MY_BOOKINGS_SECTION.UPCOMING
                            ? (seriesId) => navigate(`/my-bookings/series/${seriesId}?cancel=1`)
                            : undefined
                        }
                        onViewSeries={(seriesId) => navigate(`/my-bookings/series/${seriesId}`)}
                        section={entry.section}
                      />
                    ))}

                    {!isInitialLoad && hasMoreBrowsePages(state) ? (
                      <Button
                        disabled={state.status === "loading"}
                        onClick={() => void loadSection(entry.section, state.page + 1)}
                        size="sm"
                        variant="outline"
                      >
                        {state.status === "loading" ? t("myBookings.loading") : t("myBookings.loadMore")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </main>

      <Modal
        className="mx-4 w-full max-w-md p-6"
        footer={
          <>
            <Button
              onClick={() => {
                setCancelBooking(null);
                setCancelError(null);
              }}
              size="sm"
              variant="outline"
            >
              {t("myBookings.cancelOneTime.close")}
            </Button>
            <Button
              disabled={cancelSubmitting}
              onClick={() => void handleConfirmCancelOneTime()}
              size="sm"
              variant="primary"
            >
              {t("myBookings.cancelOneTime.confirm")}
            </Button>
          </>
        }
        isOpen={Boolean(cancelBooking)}
        onClose={() => {
          setCancelBooking(null);
          setCancelError(null);
        }}
        title={t("myBookings.cancelOneTime.title")}
      >
        <p className="m-0 text-sm text-on-surface-variant">{t("myBookings.cancelOneTime.body")}</p>
        {cancelBooking ? (
          <p className="mt-3 text-sm font-semibold text-on-surface">
            {cancelBooking.title || t("myBookings.untitled")} ·{" "}
            {format_booking_date(cancelBooking.startAt.slice(0, 10))}
          </p>
        ) : null}
        {cancelError ? (
          <p className="mt-3 text-sm font-medium text-error" role="alert">
            {cancelError}
          </p>
        ) : null}
      </Modal>
    </>
  );
};

export default MyBookingsPage;
