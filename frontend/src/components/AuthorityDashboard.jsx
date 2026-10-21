import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Map,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { Header } from "./Header";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Button } from "./Button";

import { fetchAuthorityDashboard } from "../services/ward.service";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";

export function AuthorityDashboard() {
  const onNavigate = useAppStore((state) => state.navigate);
  const onViewIssue = useAppStore((state) => state.viewIssue); // Updated to match your store
  const onLogout = useAuthStore((state) => state.logout);

  const [stats, setStats] = useState({
    total: 0,
    highPriority: 0,
    inProgress: 0,
    resolvedToday: 0,
  });

  const [recentIssues, setRecentIssues] = useState([]);
  const [highPriorityList, setHighPriorityList] = useState([]); // ✅ State for actual high priority array
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAuthorityDashboard()
      .then((res) => {
        if (cancelled) return;
        // Stats from backend
        setStats(res.data.stats);
        // Combined list for recent activity
        setRecentIssues(res.data.recent);
        // Explicit high priority array from updated controller
        setHighPriorityList(res.data.highPriorityIssues || []);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatDate = (dateString) => {
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateString));
  };

  if (loading)
    return <div className="p-8 text-slate-400">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Header
        userRole="authority"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => onNavigate("authority-dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-900 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-900/20 rounded-xl"
            >
              <LayoutDashboard className="w-5 h-5" /> Dashboard
            </button>
            <button
              onClick={() => onNavigate("complaint-management")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <FileText className="w-5 h-5" /> Complaints
            </button>
            <button
              onClick={() => onNavigate("map-view")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <Map className="w-5 h-5" /> Map View
            </button>
            <button
              onClick={() => onNavigate("analytics")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <BarChart3 className="w-5 h-5" /> Analytics
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                Ward Officer Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Monitor and manage civic issues in your ward
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card className="p-6 border-blue-200/50 dark:border-cyan-900/50 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-600 dark:text-slate-400">
                    Total Complaints
                  </div>
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-3xl font-bold dark:text-cyan-400">
                  {stats.total}
                </div>
                <div className="text-xs text-slate-500 italic mt-1">
                  {stats.total} pending in system
                </div>
              </Card>

              <Card className="p-6 border-red-200/50 dark:border-red-900/50 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-600 dark:text-slate-400">
                    High Priority
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-3xl font-bold text-red-500">
                  {stats.highPriority}
                </div>
                <div className="text-xs text-slate-500 italic mt-1">
                  Requires attention
                </div>
              </Card>

              <Card className="p-6 border-orange-200/50 dark:border-orange-900/50 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-600 dark:text-slate-400">
                    In Progress
                  </div>
                  <LayoutDashboard className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-3xl font-bold text-orange-500">
                  {stats.inProgress}
                </div>
                <div className="text-xs text-slate-500 italic mt-1">
                  Being worked on
                </div>
              </Card>

              <Card className="p-6 border-green-200/50 dark:border-green-900/50 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-slate-600 dark:text-slate-400">
                    Resolved Today
                  </div>
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px]">
                    ✓
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-500">
                  {stats.resolvedToday}
                </div>
                <div className="text-xs text-slate-500 italic mt-1">
                  Great progress
                </div>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* High Priority Issues Card - FIXED: No longer empty */}
              <Card className="p-6 bg-white dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold dark:text-white">
                    High Priority Issues
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate("complaint-management")}
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {highPriorityList.length > 0 ? (
                    highPriorityList.slice(0, 5).map((issue) => (
                      <div
                        key={issue._id}
                        className="p-4 border dark:border-slate-800 rounded-xl hover:bg-slate-800/50 cursor-pointer"
                        onClick={() => onViewIssue(issue)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-bold dark:text-white uppercase text-xs tracking-tighter">
                              {issue.aiCategory}
                            </div>
                            <div className="text-slate-500 text-[10px]">
                              {issue.wardId?.name || issue.location?.address || "Prayagraj"}
                            </div>
                          </div>
                          <Badge status={issue.status} />
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge priority={issue.aiSeverity} />
                          <span className="text-slate-500 text-[10px]">
                            {formatDate(issue.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-500 text-sm italic">
                      No urgent issues pending.
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent Activity Card - FIXED: Unique timestamps */}
              <Card className="p-6 bg-white dark:bg-slate-900 dark:border-slate-800">
                <h2 className="text-xl font-bold dark:text-white mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {recentIssues.slice(0, 5).map((issue) => (
                    <div key={issue._id} className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          issue.status === "resolved"
                            ? "bg-green-500"
                            : issue.status === "in_progress"
                            ? "bg-orange-500"
                            : "bg-blue-500"
                        }`}
                      />
                      <div className="flex-1">
                        <div className="text-sm dark:text-white">
                          New submission:{" "}
                          <span className="uppercase text-[10px] font-bold text-blue-400">
                            {issue.aiCategory}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {issue.status === "resolved"
                            ? "Marked as resolved"
                            : issue.status === "in_progress"
                            ? "Work in progress"
                            : "Submitted"}{" "}
                          • {issue.wardId?.name || issue.city || "Prayagraj"}
                          {" • "}{formatDate(issue.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-6 mt-6 bg-white dark:bg-slate-900 dark:border-slate-800">
              <h2 className="text-xl font-bold dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => onNavigate("complaint-management")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View All Complaints
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("map-view")}
                >
                  Open Map View
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("analytics")}
                >
                  View Analytics
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}