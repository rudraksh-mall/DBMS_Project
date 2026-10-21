import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  MapPin,
  Clock,
  ThumbsUp,
  Loader2,
  Edit2,
  Trash2,
  Globe,
  User,
  ChevronDown,
  Eye,
  Target,
  Flame,
  List,
  CheckCircle2,
  TriangleAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { Header } from "./Header";
import { Button } from "./Button";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { useAppStore } from "../store/useAppStore";
import { complaintService } from "../services/complaint.service";

import toast from "react-hot-toast";

const CATEGORY_COLORS = {
  garbage: "#059669",
  road: "#2563eb",
  drainage: "#7c3aed",
  lighting: "#d97706",
  water: "#0284c7",
  traffic: "#dc2626",
  infrastructure: "#64748b",
  obstruction: "#ea580c",
  other: "#6b7280",
};

const CATEGORY_LABELS = {
  garbage: "Garbage",
  road: "Road",
  drainage: "Drainage",
  lighting: "Lighting",
  water: "Water",
  traffic: "Traffic",
  infrastructure: "Infrastructure",
  obstruction: "Obstruction",
  other: "Other",
};

const SCOPE_OPTIONS = [
  { id: "nearby", label: "Nearby", icon: Target },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "all", label: "All Reports", icon: List },
];

function formatDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

function timeAgo(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const d = new Date(dateString);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function CitizenDashboard() {
  const [activeTab, setActiveTab] = useState("my-reports");
  const [myReports, setMyReports] = useState([]);
  const [communityIssues, setCommunityIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [scope, setScope] = useState("nearby");
  const [showScopeMenu, setShowScopeMenu] = useState(false);
  const [supportingId, setSupportingId] = useState(null);

  const onNavigate = useAppStore((state) => state.navigate);
  const onViewIssue = useAppStore((state) => state.viewIssue);
  const setEditingIssue = useAppStore((state) => state.setEditingIssue);
  const gpsLocation = useAppStore((state) => state.gpsLocation);

  const fetchMyReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await complaintService.getMyComplaints();
      if (res.success) setMyReports(res.data);
    } catch (err) {
      console.error("Failed to fetch my reports", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCommunity = useCallback(async () => {
    try {
      setCommunityLoading(true);
      const params = { scope };

      if (scope === "nearby" && gpsLocation) {
        params.lat = gpsLocation.lat;
        params.lng = gpsLocation.lng;
      }

      const res = await complaintService.getCommunityComplaints(params);
      if (res.success) setCommunityIssues(res.data);
    } catch (err) {
      console.error("Failed to fetch community issues", err);
    } finally {
      setCommunityLoading(false);
    }
  }, [scope, gpsLocation]);

  // --- Fetch my reports ---
  useEffect(() => {
    if (activeTab === "my-reports") {
      fetchMyReports();
    }
  }, [activeTab, fetchMyReports]);

  // --- Fetch community issues when scope changes ---
  useEffect(() => {
    if (activeTab === "community") {
      fetchCommunity();
    }
  }, [activeTab, fetchCommunity]);

  // --- My Reports actions ---
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this report?")) {
      try {
        await complaintService.deleteComplaint(id);
        toast.success("Report deleted successfully");
        setMyReports((prev) => prev.filter((item) => item._id !== id));
      } catch (err) {
        toast.error(
          err.response?.data?.message || "Unable to delete this report",
        );
      }
    }
  };

  const handleEdit = (e, issue) => {
    e.stopPropagation();
    setEditingIssue(issue);
    onNavigate("report-issue");
  };

  // --- Community actions ---
  const handleSupport = async (e, issue) => {
    e.stopPropagation();
    if (!issue._id) return;
    setSupportingId(issue._id);
    try {
      if (issue.hasUpvoted) {
        await complaintService.removeUpvote(issue._id);
      } else {
        await complaintService.upvoteComplaint(issue._id);
      }
      setCommunityIssues((prev) =>
        prev.map((c) =>
          c._id === issue._id
            ? {
                ...c,
                upvoteCount: c.hasUpvoted
                  ? (c.upvoteCount || 1) - 1
                  : (c.upvoteCount || 0) + 1,
                hasUpvoted: !c.hasUpvoted,
              }
            : c,
        ),
      );
    } catch (err) {
      console.error("Support action failed", err);
    } finally {
      setSupportingId(null);
    }
  };

  // --- My Reports derived stats ---
  const myStats = useMemo(() => {
    const total = myReports.length;
    const active = myReports.filter((i) =>
      ["submitted", "acknowledged", "in_progress"].includes(i.status),
    ).length;
    const resolved = myReports.filter((i) => i.status === "resolved").length;
    const support = myReports.reduce((sum, i) => sum + (i.upvoteCount || 0), 0);
    return { total, active, resolved, support };
  }, [myReports]);

  // --- Community derived metrics ---
  const communityMetrics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeNearby = communityIssues.filter((i) =>
      ["submitted", "acknowledged", "in_progress"].includes(i.status),
    ).length;

    const resolvedThisWeek = communityIssues.filter(
      (i) =>
        i.status === "resolved" &&
        i.resolvedAt &&
        new Date(i.resolvedAt) >= weekAgo,
    ).length;

    const categories = communityIssues
      .filter((i) => i.aiCategory)
      .reduce((acc, i) => {
        acc[i.aiCategory] = (acc[i.aiCategory] || 0) + 1;
        return acc;
      }, {});
    const topCategory = Object.entries(categories).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const totalUpvotes = communityIssues.reduce(
      (sum, i) => sum + (i.upvoteCount || 0),
      0,
    );
    const communityParticipation =
      communityIssues.length > 0
        ? Math.round((totalUpvotes / communityIssues.length) * 10) / 10
        : 0;

    return {
      activeNearby,
      resolvedThisWeek,
      topCategory,
      communityParticipation,
    };
  }, [communityIssues]);

  const activeScope =
    SCOPE_OPTIONS.find((s) => s.id === scope) || SCOPE_OPTIONS[0];
  const ScopeIcon = activeScope.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* HEADER WITH TABS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeTab === "my-reports" ? "My Reports" : "Community"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab === "my-reports"
                ? "Track complaints you have submitted"
                : "Discover issues reported by everyone"}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-white dark:bg-slate-900 p-1 rounded-xl flex border border-slate-200 dark:border-slate-800 shadow-sm flex-1 sm:flex-initial">
              <button
                onClick={() => setActiveTab("my-reports")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === "my-reports"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <User size={16} /> My Reports
              </button>
              <button
                onClick={() => setActiveTab("community")}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === "community"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Globe size={16} /> Community
              </button>
            </div>

            <Button
              onClick={() => onNavigate("report-issue")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 shrink-0"
            >
              <Plus className="mr-1.5" size={18} /> Report
            </Button>
          </div>
        </div>

        {/* ==================== MY REPORTS TAB ==================== */}
        {activeTab === "my-reports" && (
          <>
            {/* Personal stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                {
                  label: "Total Reports",
                  val: myStats.total,
                  color: "text-slate-700 dark:text-slate-200",
                  icon: null,
                },
                {
                  label: "Active",
                  val: myStats.active,
                  color: "text-orange-600 dark:text-orange-400",
                  icon: TriangleAlert,
                },
                {
                  label: "Resolved",
                  val: myStats.resolved,
                  color: "text-green-600 dark:text-green-400",
                  icon: CheckCircle2,
                },
                {
                  label: "Support Received",
                  val: myStats.support,
                  color: "text-blue-600 dark:text-blue-400",
                  icon: ThumbsUp,
                },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={i}
                    className="p-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm"
                  >
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      {Icon && <Icon size={12} className="opacity-50" />}
                      {stat.label}
                    </p>
                    <p className={`text-3xl font-black ${stat.color}`}>
                      {stat.val}
                    </p>
                  </Card>
                );
              })}
            </div>

            {/* My Reports cards */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : myReports.length === 0 ? (
              <Card className="p-16 text-center bg-white dark:bg-slate-900/20 border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="max-w-sm mx-auto">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2">
                    You haven't reported any civic issues yet.
                  </p>
                  <p className="text-sm text-slate-400 mb-6">
                    Start by reporting an issue you've noticed in your area.
                  </p>
                  <Button
                    onClick={() => onNavigate("report-issue")}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl"
                  >
                    <Plus className="mr-2" size={18} /> Report New Issue
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myReports.map((issue) => (
                  <Card
                    key={issue._id}
                    className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:border-blue-400 dark:hover:border-slate-600 transition-all shadow-sm"
                    onClick={() => onViewIssue(issue)}
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-44 shrink-0">
                        <img
                          src={
                            issue.imageUrl || "https://via.placeholder.com/300"
                          }
                          className="w-full aspect-video sm:aspect-square object-cover"
                          alt="Issue"
                        />
                      </div>
                      <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3
                                className="text-sm font-black uppercase tracking-tighter"
                                style={{
                                  color:
                                    CATEGORY_COLORS[issue.aiCategory] ||
                                    "#6b7280",
                                }}
                              >
                                {CATEGORY_LABELS[issue.aiCategory] ||
                                  issue.aiCategory}
                              </h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[10px] text-slate-500 font-bold">
                                <span className="flex items-center gap-1">
                                  <MapPin size={10} />
                                  {issue.wardId?.name ||
                                    `${issue.location?.lat?.toFixed(3)}, ${issue.location?.lng?.toFixed(3)}`}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />{" "}
                                  {formatDate(issue.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ThumbsUp size={10} />{" "}
                                  {issue.upvoteCount || 0}
                                </span>
                              </div>
                            </div>
                            <Badge status={issue.status} className="shrink-0" />
                          </div>
                          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 italic line-clamp-2">
                            "{issue.description || "No description provided."}"
                          </p>
                        </div>

                        {issue.status === "submitted" && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={(e) => handleEdit(e, issue)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, issue._id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-[11px] font-bold transition-colors"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ==================== COMMUNITY TAB ==================== */}
        {activeTab === "community" && (
          <>
            {/* Community metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: "Active Issues Nearby",
                  val: communityMetrics.activeNearby,
                  color: "text-orange-600 dark:text-orange-400",
                  icon: TriangleAlert,
                },
                {
                  label: "Resolved This Week",
                  val: communityMetrics.resolvedThisWeek,
                  color: "text-green-600 dark:text-green-400",
                  icon: CheckCircle2,
                },
                {
                  label: "Top Category",
                  val: communityMetrics.topCategory
                    ? CATEGORY_LABELS[communityMetrics.topCategory[0]] ||
                      communityMetrics.topCategory[0]
                    : "\u2014",
                  color: "text-purple-600 dark:text-purple-400",
                  icon: TrendingUp,
                  small: true,
                },
                {
                  label: "Community Participation",
                  val: `${communityMetrics.communityParticipation}`,
                  color: "text-blue-600 dark:text-blue-400",
                  icon: Users,
                  suffix: " avg upvotes",
                },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={i}
                    className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm"
                  >
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Icon size={11} className="opacity-50" />
                      {stat.label}
                    </p>
                    <p
                      className={`text-xl sm:text-2xl font-black ${stat.color} ${stat.small ? "text-sm sm:text-base truncate" : ""}`}
                    >
                      {stat.val}
                      {stat.suffix || ""}
                    </p>
                  </Card>
                );
              })}
            </div>

            {/* Scope switcher */}
            <div className="relative mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowScopeMenu(!showScopeMenu)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm hover:border-blue-400 transition-colors"
                  >
                    <ScopeIcon size={16} className="text-blue-500" />
                    <span>{activeScope.label}</span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>

                  {showScopeMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowScopeMenu(false)}
                      />
                      <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                        {SCOPE_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setScope(opt.id);
                                setShowScopeMenu(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors ${
                                scope === opt.id
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              <Icon size={16} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Scope context labels */}
                {scope === "nearby" && gpsLocation && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                    <MapPin size={12} />
                    Showing issues within 5 km
                  </div>
                )}
                {scope === "nearby" && !gpsLocation && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                    <MapPin size={12} />
                    Location access unavailable. Showing all reports instead.
                  </div>
                )}
                {scope === "trending" && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                    <Flame size={12} />
                    Most supported issues
                  </div>
                )}
                {scope === "all" && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    <List size={12} />
                    All community reports
                  </div>
                )}
              </div>
            </div>

            {/* Compact feed cards */}
            {communityLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : communityIssues.length === 0 ? (
              <Card className="p-12 text-center bg-white dark:bg-slate-900/20 border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-400 font-medium">
                  {scope === "nearby"
                    ? "No civic issues found within 5 km"
                    : "No issues found in this scope."}
                </p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {communityIssues.map((issue) => {
                  const catColor =
                    CATEGORY_COLORS[issue.aiCategory] || "#6b7280";
                  const distText =
                    scope === "nearby" && issue._distance != null
                      ? `${issue._distance.toFixed(1)} km`
                      : null;

                  return (
                    <Card
                      key={issue._id}
                      className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer hover:border-blue-400 dark:hover:border-slate-600 transition-all shadow-sm"
                      onClick={() => onViewIssue(issue)}
                    >
                      <div className="flex items-start gap-3 p-3">
                        {/* Image thumbnail */}
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={
                              issue.imageUrl ||
                              "https://via.placeholder.com/300"
                            }
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span
                              className="text-[9px] font-black uppercase tracking-widest"
                              style={{ color: catColor }}
                            >
                              {CATEGORY_LABELS[issue.aiCategory] ||
                                issue.aiCategory}
                            </span>
                            <Badge
                              status={issue.status}
                              className="text-[7px]"
                            />
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 leading-relaxed mb-1">
                            {issue.description}
                          </p>

                          <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold flex-wrap">
                            {issue.wardId?.name && (
                              <span className="flex items-center gap-1">
                                <MapPin size={9} /> {issue.wardId.name}
                              </span>
                            )}
                            {distText && (
                              <span className="flex items-center gap-1">
                                <Target size={9} /> {distText}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <ThumbsUp size={9} /> {issue.upvoteCount || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={9} /> {timeAgo(issue.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={(e) => handleSupport(e, issue)}
                            disabled={supportingId === issue._id}
                            className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                              issue.hasUpvoted
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            {supportingId === issue._id ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <ThumbsUp
                                size={10}
                                fill={
                                  issue.hasUpvoted ? "currentColor" : "none"
                                }
                              />
                            )}
                            {issue.hasUpvoted ? "Supported" : "Support"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewIssue(issue);
                            }}
                            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 transition-all"
                          >
                            <Eye size={10} /> Details
                          </button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Floating Report button (mobile) */}
            <div className="fixed bottom-6 right-6 z-30 sm:hidden">
              <button
                onClick={() => onNavigate("report-issue")}
                className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-600/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              >
                <Plus size={28} />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
