import { createBrowserRouter, Navigate } from "react-router";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/layout/AppLayout";
import ContactPage from "@/pages/contact/ContactPage";
import HomePage from "@/pages/home/HomePage";
import LoginPage from "@/pages/login/LoginPage";
import MyBookingsPage from "@/pages/my-bookings/MyBookingsPage";
import MyProfilePage from "@/pages/my-profile/MyProfilePage";
import RoomFilterPage from "@/pages/rooms/RoomFilterPage";
import StartBookingPage from "@/pages/start-booking/StartBookingPage";

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
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
        ],
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "*",
    element: <Navigate replace to="/" />,
  },
]);
