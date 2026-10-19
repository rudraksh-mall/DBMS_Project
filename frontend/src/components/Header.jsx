import { Moon, Sun, ChevronDown, LogOut, LayoutDashboard, Map as MapIcon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";

export function Header() {
  const userRole = useAuthStore((state) => state.userRole);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);
  const onNavigate = useAppStore((state) => state.navigate);

  const dashboardRoute = {
    admin: "admin-dashboard",
    authority: "authority-dashboard",
    citizen: "citizen-dashboard",
  }[userRole] || "citizen-dashboard";

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("civicfix-app-storage");
    localStorage.removeItem("civicfix-auth-storage");
    localStorage.removeItem("civicfix-gps-location");
    logout();
    onNavigate("landing");
  };

  if (!isAuthenticated && !userRole) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border-default bg-bg-primary/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
        <button onClick={() => onNavigate(dashboardRoute)} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform">
            <span className="text-white text-sm font-black">CF</span>
          </div>
          <span className="text-text-primary font-bold text-base tracking-tight">CivicFix <span className="gradient-text">AI</span></span>
        </button>

        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-1 mr-1">
            <button onClick={() => onNavigate(dashboardRoute)}
              className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5">
              Dashboard
            </button>
            <button onClick={() => onNavigate("map-view")}
              className="px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5">
              Map View
            </button>
          </nav>

          <div className="h-5 w-px bg-border-default mx-1" />

          <button onClick={toggleDarkMode}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all"
            aria-label="Toggle dark mode">
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div className="relative group">
            <button className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg bg-bg-card border border-border-default hover:border-border-hover transition-all">
              <div className="w-7 h-7 gradient-primary rounded-md flex items-center justify-center text-white font-bold text-xs">
                {user?.name?.charAt(0) || userRole?.charAt(0) || "U"}
              </div>
              <ChevronDown size={14} className="text-text-muted group-hover:text-text-secondary transition-colors" />
            </button>

            <div className="absolute right-0 top-full mt-2 w-56 card-base shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 transition-all z-50 overflow-hidden p-1">
              <div className="px-3 py-3 border-b border-border-default mb-1">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Signed in as</p>
                <p className="text-sm font-semibold text-text-primary truncate">{user?.email || "Civic User"}</p>
                <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded status-acknowledged text-[9px]">{userRole} Account</span>
              </div>
              <button onClick={() => onNavigate(dashboardRoute)}
                className="w-full flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg text-xs font-semibold transition-all">
                <LayoutDashboard size={14} /> Dashboard
              </button>
              <button onClick={() => onNavigate("map-view")}
                className="w-full flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg text-xs font-semibold transition-all">
                <MapIcon size={14} /> Live Map
              </button>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-danger hover:bg-danger/10 rounded-lg text-xs font-semibold transition-all">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}