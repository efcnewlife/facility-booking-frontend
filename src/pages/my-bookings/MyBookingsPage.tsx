import PastBookingCard from "@/components/booking/PastBookingCard";
import UpcomingBookingCard from "@/components/booking/UpcomingBookingCard";
import BookingHero from "@/components/booking/BookingHero";
import { MOCK_PAST_BOOKINGS, MOCK_UPCOMING_BOOKINGS } from "@/data/mockBookings";
import type { UserBooking } from "@/types/myBookings";
import { useTranslation } from "react-i18next";

const MyBookingsPage = () => {
  const { t } = useTranslation("booking");

  const handleChange = (booking: UserBooking) => {
    console.info("change_booking", booking.id);
  };

  const handleCancel = (booking: UserBooking) => {
    console.info("cancel_booking", booking.id);
  };

  const handleSeeAll = () => {
    console.info("see_all_past_bookings");
  };

  return (
    <>
      <BookingHero titleKey="nav.myBookings" />

      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-on-surface">{t("myBookings.upcomingTitle")}</h2>
          {MOCK_UPCOMING_BOOKINGS.length === 0 ? (
            <p className="text-sm font-medium text-booking-text">{t("myBookings.noUpcoming")}</p>
          ) : (
            <div className="space-y-4">
              {MOCK_UPCOMING_BOOKINGS.map((booking) => (
                <UpcomingBookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={handleCancel}
                  onChange={handleChange}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-2xl font-bold text-on-surface">{t("myBookings.pastTitle")}</h2>
          <div className="space-y-4">
            {MOCK_PAST_BOOKINGS.map((booking) => (
              <PastBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
          <button
            className="text-base font-bold text-primary hover:underline"
            onClick={handleSeeAll}
            type="button"
          >
            {t("myBookings.seeAll")}
          </button>
        </section>
      </main>
    </>
  );
};

export default MyBookingsPage;
