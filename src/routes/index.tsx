import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AuthenticatedLayout from "@/layout/AuthenticatedLayout";
import BookingDetailsPage from "@/pages/booking-details/BookingDetailsPage";
import ContactPage from "@/pages/contact/ContactPage";
import HomePage from "@/pages/home/HomePage";
import LoginPage from "@/pages/login/LoginPage";
import MyBookingsPage from "@/pages/my-bookings/MyBookingsPage";
import MyMinistryPage from "@/pages/my-ministry/MyMinistryPage";
import MyProfilePage from "@/pages/my-profile/MyProfilePage";
import PaymentPage from "@/pages/payment/PaymentPage";
import RoomFilterPage from "@/pages/rooms/RoomFilterPage";
import StartBookingPage from "@/pages/start-booking/StartBookingPage";
import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AuthenticatedLayout />,
        children: [
          {
            path: "/",
            element: <HomePage />,
          },
          {
            path: "/start-booking",
            element: <StartBookingPage />,
          },
          {
            path: "/rooms",
            element: <RoomFilterPage />,
          },
          {
            path: "/booking-details",
            element: <BookingDetailsPage />,
          },
          {
            path: "/payment/:bookingId",
            element: <PaymentPage />,
          },
          {
            path: "/my-bookings",
            element: <MyBookingsPage />,
          },
          {
            path: "/my-profile",
            element: <MyProfilePage />,
          },
          {
            path: "/contact",
            element: <ContactPage />,
          },
          {
            path: "/my-ministry",
            element: <MyMinistryPage />,
          },
          {
            path: "*",
            element: null,
          },
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
