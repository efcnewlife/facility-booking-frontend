import { createBrowserRouter, Navigate } from "react-router";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/layout/AppLayout";
import ContactPage from "@/pages/contact/ContactPage";
import FindSpacePage from "@/pages/find-space/FindSpacePage";
import LoginPage from "@/pages/login/LoginPage";
import MyBookingsPage from "@/pages/my-bookings/MyBookingsPage";
import MyProfilePage from "@/pages/my-profile/MyProfilePage";

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/",
            element: <FindSpacePage />,
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
