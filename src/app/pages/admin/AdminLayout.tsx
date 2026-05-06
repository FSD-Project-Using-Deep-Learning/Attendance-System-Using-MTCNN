import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  BarChart3,
  LogOut,
  Scan,
  Menu,
  X
} from "lucide-react";
import SessionExpiredModal from "../../components/SessionExpiredModal";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading } = useAuth();
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/admin/login");
    }
  }, [user, loading, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/detection");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/add-face", label: "Add Face", icon: UserPlus },
    { path: "/admin/attendance", label: "Attendance", icon: ClipboardList },
    { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 fixed top-0 left-0 right-0 z-30 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-[#F8FAFC] rounded-xl transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-[#64748B]" /> : <Menu className="w-5 h-5 text-[#64748B]" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center shadow-lg shadow-[#6366F1]/30">
                <Scan className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl text-[#0F172A] font-bold">Admin Dashboard</h1>
                <p className="text-xs text-[#64748B]">Logged in as: {user.username}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-[#64748B] hover:bg-[#F8FAFC] rounded-xl transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-[#E2E8F0] transition-transform duration-300 z-20 shadow-lg ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <nav className="p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                      active
                        ? "bg-gradient-to-r from-[#6366F1]/10 to-[#818CF8]/10 text-[#6366F1] shadow-sm"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="pt-16 lg:pl-64 min-h-screen">
        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {showSessionExpired && (
        <SessionExpiredModal onRedirect={() => navigate("/detection")} />
      )}
    </div>
  );
}
