import { Landing } from "./components/Landing";
import { Login } from "./components/Login";
import { CitizenDashboard } from "./components/CitizenDashboard";
import { ReportIssue } from "./components/ReportIssue";
import { MapView } from "./components/MapView";
import { IssueDetail } from "./components/IssueDetail";
import { AuthorityDashboard } from "./components/AuthorityDashboard";
import { ComplaintManagement } from "./components/ComplaintManagement";
import { AdminDashboard } from "./components/AdminDashboard";
import { Analytics } from "./components/Analytics";
import { useAppStore } from "./store/useAppStore";
import { useAuthStore } from "./store/useAuthStore";
import { useGeolocation } from "./hooks/useGeolocation";
import VerifyOtp from "./components/VerifyOtp";

import { Toaster } from "react-hot-toast";

export default function App() {
  const currentScreen = useAppStore((state) => state.currentScreen);
  const navigate = useAppStore((state) => state.navigate);
  const selectedIssue = useAppStore((state) => state.selectedIssue);
  const viewIssue = useAppStore((state) => state.viewIssue);

  const userRole = useAuthStore((state) => state.userRole);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  useGeolocation();

  const handleLogin = (role, userData) => {
    login(role, userData);
    if (role === "admin") navigate("admin-dashboard");
    else if (role === "authority") navigate("authority-dashboard");
    else navigate("citizen-dashboard");
  };

  const handleLogout = async () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    localStorage.removeItem("civicfix-app-storage");
    localStorage.removeItem("civicfix-auth-storage");
    localStorage.removeItem("civicfix-gps-location");

    await logout();
    navigate("landing");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {currentScreen === "landing" && <Landing onNavigate={navigate} />}
      {currentScreen === "verify-otp" && <VerifyOtp />}
      {(currentScreen === "login" || currentScreen === "signup") && (
        <Login
          isSignup={currentScreen === "signup"}
          onLogin={handleLogin}
          onNavigate={navigate}
        />
      )}

      {currentScreen === "citizen-dashboard" && (
        <CitizenDashboard
          onNavigate={navigate}
          onLogout={handleLogout}
          onViewIssue={viewIssue}
        />
      )}
      {currentScreen === "report-issue" && <ReportIssue />}

      {currentScreen === "map-view" && <MapView />}
      {currentScreen === "issue-detail" && selectedIssue && (
        <IssueDetail
          issue={selectedIssue}
          onNavigate={navigate}
          userRole={userRole}
        />
      )}

      {currentScreen === "authority-dashboard" && (
        <AuthorityDashboard
          onNavigate={navigate}
          onLogout={handleLogout}
          onViewIssue={viewIssue}
        />
      )}
      {currentScreen === "complaint-management" && (
        <ComplaintManagement
          onNavigate={navigate}
          onViewIssue={viewIssue}
          onLogout={handleLogout}
        />
      )}
      {currentScreen === "analytics" && (
        <Analytics
          onNavigate={navigate}
          onLogout={handleLogout}
        />
      )}

      {currentScreen === "admin-dashboard" && (
        <AdminDashboard
          onNavigate={navigate}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}