import { createBrowserRouter } from "react-router";
import WelcomePage from "./pages/WelcomePage";
import DetectionPage from "./pages/DetectionPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminVerificationPage from "./pages/AdminVerificationPage";
import AdminRegistrationPage from "./pages/AdminRegistrationPage";
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import AddFacePage from "./pages/admin/AddFacePage";
import AttendancePage from "./pages/admin/AttendancePage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: WelcomePage,
  },
  {
    path: "/detection",
    Component: DetectionPage,
  },
  {
    path: "/about",
    Component: AboutPage,
  },
  {
    path: "/contact",
    Component: ContactPage,
  },
  {
    path: "/admin/login",
    Component: AdminLoginPage,
  },
  {
    path: "/admin/register/verify",
    Component: AdminVerificationPage,
  },
  {
    path: "/admin/register",
    Component: AdminRegistrationPage,
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "add-face", Component: AddFacePage },
      { path: "attendance", Component: AttendancePage },
      { path: "analytics", Component: AnalyticsPage },
    ],
  },
]);