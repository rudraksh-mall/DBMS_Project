import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Map,
  BarChart3,
  Clock,
  CheckCircle,
  Activity,
  BarChart as BarChartIcon,
} from "lucide-react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { Card } from "./Card";
import { Header } from "./Header";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { fetchAuthorityAnalytics } from "../services/analytics.service";

export function Analytics() {
  const onNavigate = useAppStore((state) => state.navigate);
  const onLogout = useAuthStore((state) => state.logout);
  const currentAddress = useAppStore((state) => state.currentAddress);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAuthorityAnalytics()
      .then((data) => setAnalytics(data))
      .catch(console.error);
  }, []);

  if (!analytics) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 transition-colors">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent"></div>
          Analyzing data patterns...
        </div>
      </div>
    );
  }

  /* ================== DATA PROCESSING ================== */

  const categoryData = Object.entries(analytics.categoryMap || {}).map(
    ([name, count]) => ({ name: name.toUpperCase(), count })
  );

  const priorityData = [
    { name: "High", value: analytics.priority?.high || 0, color: "#ef4444" },
    {
      name: "Medium",
      value: analytics.priority?.medium || 0,
      color: "#f59e0b",
    },
    { name: "Low", value: analytics.priority?.low || 0, color: "#22c55e" },
  ];

  // FIXED: Using underscore to match standardized backend
  const totalIssues = Object.values(analytics.status || {}).reduce(
    (a, b) => a + b,
    0
  );

  const resolutionRate =
    totalIssues > 0
      ? (((analytics.status?.resolved || 0) / totalIssues) * 100).toFixed(1)
      : 0;

  const activeIssuesCount =
    (analytics.status?.submitted || 0) +
    (analytics.status?.acknowledged || 0) +
    (analytics.status?.in_progress || 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Header
        userRole="authority"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <div className="flex">
        {/* SIDEBAR - Fixed for light/dark mode visibility */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-h-[calc(100vh-73px)] shrink-0">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => onNavigate("authority-dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all font-bold"
            >
              <LayoutDashboard size={20} /> Dashboard
            </button>
            <button
              onClick={() => onNavigate("complaint-management")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all font-bold"
            >
              <FileText size={20} /> Complaints
            </button>
            <button
              onClick={() => onNavigate("map-view")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all font-bold"
            >
              <Map size={20} /> Map View
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 rounded-xl border border-cyan-200 dark:border-cyan-500/20 font-black">
              <BarChart3 size={20} /> Analytics
            </button>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                Analytics & Reports
              </h1>
              <p className="text-slate-500 font-medium">
                Monitoring resolution efficiency and issue density in {currentAddress}
              </p>
            </div>

            {/* KEY METRICS GRID */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              {[
                {
                  label: "Avg. Resolution",
                  value: `${analytics.avgResolutionTime || 0} Days`,
                  icon: Clock,
                  color: "text-blue-500",
                },
                {
                  label: "Resolution Rate",
                  value: `${resolutionRate}%`,
                  icon: CheckCircle,
                  color: "text-green-500",
                },
                {
                  label: "Active Issues",
                  value: activeIssuesCount,
                  icon: Activity,
                  color: "text-orange-500",
                },
                {
                  label: "Total Resolved",
                  value: analytics.status?.resolved || 0,
                  icon: BarChartIcon,
                  color: "text-purple-500",
                },
              ].map((metric, i) => (
                <Card
                  key={i}
                  className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">
                      {metric.label}
                    </span>
                    <metric.icon size={16} className={metric.color} />
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {metric.value}
                  </div>
                </Card>
              ))}
            </div>

            {/* CHARTS ROW 1 */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <Card className="p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
                  Issues by Category
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      strokeOpacity={0.1}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
                  Priority Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                    >
                      {priorityData.map((e, i) => (
                        <Cell key={i} fill={e.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* STATUS BREAKDOWN GRID */}
            <Card className="p-8 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] mb-8">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                Status Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[
                  {
                    label: "Submitted",
                    val: analytics.status?.submitted,
                    color: "bg-slate-400",
                  },
                  {
                    label: "Acknowledged",
                    val: analytics.status?.acknowledged,
                    color: "bg-blue-500",
                  },
                  {
                    label: "In Progress",
                    val: analytics.status?.in_progress, // FIXED: underscore sync
                    color: "bg-orange-500",
                  },
                  {
                    label: "Resolved",
                    val: analytics.status?.resolved,
                    color: "bg-green-500",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${item.color}`}
                      />
                      {item.label}
                    </div>
                    <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                      {item.val || 0}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* RESOLUTION TREND */}
            <Card className="p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6">
                Resolution Trend (Weekly)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trend || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    strokeOpacity={0.1}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                  <Legend iconType="plainline" />
                  <Line
                    type="monotone"
                    dataKey="reported"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}