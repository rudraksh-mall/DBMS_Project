import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Map,
  BarChart3,
  ThumbsUp,
} from "lucide-react";

import { Card } from "./Card";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Header } from "./Header"; // ✅ Ensure Header is imported

import { complaintService } from "../services/complaint.service";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";

export function ComplaintManagement() {
  const onNavigate = useAppStore((state) => state.navigate);
  const onViewIssue = useAppStore((state) => state.viewIssue);
  const onLogout = useAuthStore((state) => state.logout); // ✅ Needed for Header

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [sortBy, setSortBy] = useState("priority");

  // ✅ Fetch from backend
  useEffect(() => {
    complaintService
      .getWardComplaints()
      .then((res) => {
        setComplaints(res.data);
      })
      .catch((err) => {
        console.error("Failed to load complaints", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (date) =>
    new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));

  // ✅ Filtering logic with light-mode support
  let filteredIssues = complaints.filter((issue) => {
    if (
      searchQuery &&
      !issue.aiCategory?.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;

    if (filterCategory && issue.aiCategory !== filterCategory) return false;
    if (filterStatus && issue.status !== filterStatus) return false;
    if (filterPriority && issue.aiSeverity !== filterPriority) return false;

    return true;
  });

  // ✅ Sorting logic
  filteredIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === "upvotes") {
      return (b.upvoteCount || 0) - (a.upvoteCount || 0);
    }
    return b.priorityScore - a.priorityScore;
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 transition-colors">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          Accessing ward reports...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* FIXED: Header added for consistent visibility across tabs */}
      <Header
        userRole="authority"
        onLogout={onLogout}
        onNavigate={onNavigate}
      />

      <div className="flex">
        {/* SIDEBAR - Fixed for light mode visibility */}
        <aside className="w-64 min-h-[calc(100vh-73px)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => onNavigate("authority-dashboard")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <LayoutDashboard size={20} /> Dashboard
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600/10 text-blue-600 dark:text-blue-500 rounded-lg font-medium border border-blue-200 dark:border-blue-500/20">
              <FileText size={20} /> Complaints
            </button>
            <button
              onClick={() => onNavigate("map-view")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <Map size={20} /> Map View
            </button>
            <button
              onClick={() => onNavigate("analytics")}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
            >
              <BarChart3 size={20} /> Analytics
            </button>
          </nav>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Ward Management
            </h1>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Showing {filteredIssues.length} of {complaints.length} active
              issues
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by category..."
              className="flex-1 min-w-[180px] px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {[
                "garbage",
                "road",
                "drainage",
                "lighting",
                "water",
                "traffic",
                "infrastructure",
                "obstruction",
                "other",
              ].map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="priority">Sort: Priority</option>
              <option value="date">Sort: Newest</option>
              <option value="upvotes">Sort: Most Upvoted</option>
            </select>
          </div>

          {/* TABLE SECTION - FIXED FOR LIGHT MODE */}
          <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl rounded-2xl">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4 text-left">Issue</th>
                  <th className="px-6 py-4 text-left">Category</th>
                  <th className="px-6 py-4 text-left">Ward</th>
                  <th className="px-6 py-4 text-left">Location</th>
                  <th className="px-6 py-4 text-left">Priority</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Upvotes</th>
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue._id}
                    onClick={() => onViewIssue(issue)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={issue.imageUrl || "/placeholder-issue.jpg"}
                          alt={issue.aiCategory}
                          className="w-12 h-12 object-cover rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shadow-sm"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 uppercase text-[10px] tracking-widest">
                            {issue.aiCategory}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 italic truncate max-w-[180px]">
                            "{issue.description}"
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge>{issue.aiCategory}</Badge>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {issue.wardId?.name || "—"}
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {issue.city || "Prayagraj"}
                    </td>

                    <td className="px-6 py-4">
                      <Badge priority={issue.aiSeverity} />
                    </td>

                    <td className="px-6 py-4">
                      <Badge status={issue.status} />
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-cyan-400 font-black">
                        <ThumbsUp
                          size={14}
                          className="fill-blue-100 dark:fill-none"
                        />
                        {issue.upvoteCount || 0}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(issue.createdAt)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-600/10 dark:hover:text-blue-400 rounded-lg transition-all"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredIssues.length === 0 && (
              <div className="py-20 text-center text-slate-400 font-medium italic">
                No ward issues found matching your filters.
              </div>
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}