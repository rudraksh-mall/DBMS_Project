import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  LayersControl,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import {
  Filter,
  X,
  MapPin,
  Loader2,
  Target,
  Map as MapIcon,
  ChevronRight,
  Check,
  PlusCircle,
  ThumbsUp,
  Eye,
  Flame,
  List,
  Activity,
  ChevronUp,
  ChevronDown,
  TriangleAlert,
  Search,
  ArrowUpDown,
  Clock,
  TrendingUp,
  SeparatorHorizontal,
  CalendarDays,
  Share2,
} from "lucide-react";

import { Header } from "./Header";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Button } from "./Button";
import toast from "react-hot-toast";

import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";
import { complaintService } from "../services/complaint.service";

import "leaflet/dist/leaflet.css";

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

const STATUS_COLORS = {
  submitted: "#ef4444",
  acknowledged: "#f97316",
  in_progress: "#3b82f6",
  resolved: "#22c55e",
};

function categoryIconSvg(category) {
  const fill = "%23fff";
  let path;
  switch (category) {
    case "garbage":
      path =
        "M5 5h14l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 5zm3 0V3a1 1 0 011-1h2v2h2V2a1 1 0 011 1v2m-4 4v6m4-6v6";
      break;
    case "road":
      path =
        "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z";
      break;
    case "drainage":
      path =
        "M21 14v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 011-1h16a1 1 0 011 1zM5 14v2h14v-2H5zm7-9a5 5 0 014.9 4h-9.8A5 5 0 0112 5z";
      break;
    case "lighting":
      path =
        "M12 2a1 1 0 011 1v3a1 1 0 01-2 0V3a1 1 0 011-1zm0 16a1 1 0 011 1v3a1 1 0 01-2 0v-3a1 1 0 011-1zM4.93 4.93a1 1 0 011.41 0l2.12 2.12a1 1 0 01-1.41 1.41L4.93 6.34a1 1 0 010-1.41zm12.73 14.14a1 1 0 01-1.41 0l-2.12-2.12a1 1 0 011.41-1.41l2.12 2.12a1 1 0 010 1.41zM2 12a1 1 0 011-1h3a1 1 0 010 2H3a1 1 0 01-1-1zm16 0a1 1 0 011-1h3a1 1 0 010 2h-3a1 1 0 01-1-1zM6.46 17.66a1 1 0 01-1.41 0l-2.12-2.12a1 1 0 011.41-1.41l2.12 2.12a1 1 0 010 1.41zM19.07 6.34a1 1 0 010 1.41l-2.12 2.12a1 1 0 01-1.41-1.41l2.12-2.12a1 1 0 011.41 0z";
      break;
    case "water":
      path =
        "M12 2C8.13 6.88 6 11.09 6 14.5 6 17.87 8.69 21 12 21s6-3.13 6-6.5c0-3.41-2.13-7.62-6-12.5zm0 17c-2.21 0-4-1.79-4-3.5 0-1.72 1.08-4.62 4-8.38 2.92 3.76 4 6.66 4 8.38 0 1.71-1.79 3.5-4 3.5z";
      break;
    case "traffic":
      path =
        "M20 10h-3V8.86A2.99 2.99 0 0019 6V4h1a1 1 0 000-2H4a1 1 0 000 2h1v2a2.99 2.99 0 002 2.86V10H4a1 1 0 000 2h3v2.14A2.99 2.99 0 005 17v3H4a1 1 0 000 2h16a1 1 0 000-2h-1v-3a2.99 2.99 0 00-2-2.86V12h3a1 1 0 000-2zM8 4h8v2H8V4zm0 6h8v2H8v-2zm8 10H8v-3a1 1 0 011-1h6a1 1 0 011 1v3z";
      break;
    case "infrastructure":
      path =
        "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z";
      break;
    case "obstruction":
      path =
        "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z";
      break;
    default:
      path =
        "M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm1-13h-2v6h2V7zm0 8h-2v2h2v-2z";
  }
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="${fill}" stroke="${fill}" stroke-width="0.5"><path d="${path}"/></svg>`;
}

function createCustomIcon(category, status, isVoted = false) {
  const bgColor = CATEGORY_COLORS[category] || "#6b7280";
  const borderColor = isVoted ? "#3b82f6" : "#ffffff";
  const svg = categoryIconSvg(category);
  const size = isVoted ? 32 : 28;
  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="
      width: ${size}px; height: ${size}px;
      background: ${bgColor};
      border: 3px solid ${borderColor};
      border-radius: 50%;
      box-shadow: 0 2px 12px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
      cursor: pointer;
    ">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const STATUS_PRIORITY = {
  submitted: 0,
  acknowledged: 1,
  in_progress: 2,
  resolved: 3,
};

const SORT_OPTIONS = [
  { id: "nearby", label: "Nearby", icon: Target },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "newest", label: "Newest", icon: Clock },
  { id: "most-supported", label: "Most Supported", icon: ThumbsUp },
];

const RADIUS_OPTIONS = [1, 5, 10, 25, 50];

const STATUS_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "acknowledged", label: "Verified" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

function NominatimSearch({ onSelect, mapRef }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`,
          { headers: { "User-Agent": "CivicFix-AI-Project/1.0" } },
        );
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    mapRef?.flyTo([lat, lng], 15);
    onSelect({ lat, lng, label: item.display_name });
    setQuery(item.display_name.split(",")[0]);
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 shadow-lg">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search locality, ward, landmark, city..."
          className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
        />
        {loading && (
          <Loader2 size={14} className="animate-spin text-slate-400" />
        )}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[1002] max-h-64 overflow-y-auto">
          {suggestions.map((item, i) => (
            <button
              key={i}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center gap-2"
            >
              <MapPin size={12} className="text-blue-500 shrink-0" />
              <span className="line-clamp-1">{item.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusTimeline({ status, createdAt, resolvedAt }) {
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);
  return (
    <div className="space-y-0">
      {STATUS_STEPS.map((step, i) => {
        const isDone = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 ${isDone ? "bg-blue-600 border-blue-600" : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600"} ${isCurrent ? "ring-2 ring-blue-300" : ""}`}
              />
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`w-0.5 h-6 ${isDone && i < currentIdx ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
                />
              )}
            </div>
            <div className="pb-4">
              <p
                className={`text-xs font-bold ${isDone ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}
              >
                {step.label}
              </p>
              {isCurrent && createdAt && (
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {status === "resolved" && resolvedAt
                    ? new Date(resolvedAt).toLocaleDateString()
                    : new Date(createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function formatDate(dateString) {
  if (!dateString) return "Date N/A";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

export function MapView() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [detailIssue, setDetailIssue] = useState(null);
  const [newIssueLocation, setNewIssueLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [sortBy, setSortBy] = useState("nearby");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(5);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);
  const [searchLocation, setSearchLocation] = useState(null);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [supportingId, setSupportingId] = useState(null);

  const navigate = useAppStore((state) => state.navigate);
  const setCurrentAddress = useAppStore((state) => state.setCurrentAddress);
  const setSelectedLocation = useAppStore((state) => state.setSelectedLocation);
  const clearLocationContext = useAppStore(
    (state) => state.clearLocationContext,
  );
  const selectedLocation = useAppStore((state) => state.selectedLocation);
  const gpsLocation = useAppStore((state) => state.gpsLocation);
  const gpsAvailable = useAppStore((state) => state.gpsAvailable);
  const gpsAccuracy = useAppStore((state) => state.gpsAccuracy);
  const gpsError = useAppStore((state) => state.gpsError);
  const currentCity = useAppStore((state) => state.currentCity);
  const onViewIssue = useAppStore((state) => state.viewIssue);
  const currentAddress = useAppStore((state) => state.currentAddress);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const categories = [
    "GARBAGE",
    "ROAD",
    "LIGHTING",
    "DRAINAGE",
    "WATER",
    "TRAFFIC",
    "INFRASTRUCTURE",
    "OBSTRUCTION",
    "OTHER",
  ];
  const statuses = ["submitted", "acknowledged", "in_progress", "resolved"];

  const defaultCenter = useMemo(
    () =>
      selectedLocation
        ? [selectedLocation.lat, selectedLocation.lng]
        : gpsLocation
          ? [gpsLocation.lat, gpsLocation.lng]
          : [25.4358, 81.8463],
    [selectedLocation, gpsLocation],
  );

  const fetchLiveIssues = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      const center =
        gpsLocation || (searchLocation?.lat ? searchLocation : null);
      if (center && sortBy === "nearby") {
        params.lat = center.lat;
        params.lng = center.lng;
        params.scope = "nearby";
        params.radius = selectedRadius;
      } else if (sortBy === "trending") {
        params.scope = "trending";
      }
      const res = await complaintService.getAllComplaints(params);
      if (res.success) setIssues(res.data);
    } catch (err) {
      console.error("Map fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [gpsLocation, searchLocation, sortBy, selectedRadius]);

  useEffect(() => {
    fetchLiveIssues();
  }, [fetchLiveIssues]);

  useEffect(() => {
    if (selectedLocation && mapInstance) {
      mapInstance.setView([selectedLocation.lat, selectedLocation.lng], 14);
    } else if (gpsLocation && mapInstance && !selectedLocation) {
      mapInstance.setView([gpsLocation.lat, gpsLocation.lng], 13);
    }
  }, [mapInstance, selectedLocation, gpsLocation]);

  const handleLocationSelect = useCallback(
    async (lat, lng) => {
      setNewIssueLocation({ lat, lng });
      clearLocationContext();
      setIsGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          { headers: { "User-Agent": "CivicFix-AI-Project/1.0" } },
        );
        if (!res.ok) throw new Error("API Limit Reached");
        const data = await res.json();
        const locationName =
          data.address.suburb ||
          data.address.neighbourhood ||
          data.address.city ||
          data.address.town ||
          "Location Selected";
        setCurrentAddress(locationName);
        setSelectedLocation({ lat, lng });
      } catch {
        console.warn("Geocoding failed, falling back to coordinates");
        setCurrentAddress(`Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      } finally {
        setIsGeocoding(false);
      }
    },
    [setCurrentAddress, setSelectedLocation, clearLocationContext],
  );

  const handleLocateUser = () => {
    if (gpsAvailable && gpsLocation) {
      setIsGeocoding(true);
      const { lat, lng } = gpsLocation;
      if (mapInstance) mapInstance.flyTo([lat, lng], 15);
      handleLocationSelect(lat, lng);
    } else if ("geolocation" in navigator) {
      setIsGeocoding(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapInstance) mapInstance.flyTo([latitude, longitude], 15);
          handleLocationSelect(latitude, longitude);
        },
        () => setIsGeocoding(false),
      );
    }
  };

  const handleSupport = async (e, issueId) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("login");
      return;
    }
    setSupportingId(issueId);
    try {
      const issue = issues.find((i) => i._id === issueId);
      if (issue?.hasUpvoted) {
        await complaintService.removeUpvote(issueId);
      } else {
        await complaintService.upvoteComplaint(issueId);
      }
      await fetchLiveIssues();
    } catch (err) {
      console.error("Support action failed", err);
    } finally {
      setSupportingId(null);
    }
  };

  // --- Filter ---
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (
        filterCategory &&
        issue.aiCategory?.toUpperCase() !== filterCategory.toUpperCase()
      )
        return false;
      if (filterStatus && issue.status !== filterStatus) return false;
      return true;
    });
  }, [issues, filterCategory, filterStatus]);

  // --- Sort ---
  const sortedIssues = useMemo(() => {
    let sorted = [...filteredIssues];
    const center = gpsLocation ||
      searchLocation ||
      selectedLocation || { lat: defaultCenter[0], lng: defaultCenter[1] };
    switch (sortBy) {
      case "nearby":
        sorted.sort((a, b) => {
          const dA = Math.hypot(
            a.location.lat - center.lat,
            a.location.lng - center.lng,
          );
          const dB = Math.hypot(
            b.location.lat - center.lat,
            b.location.lng - center.lng,
          );
          return dA - dB;
        });
        break;
      case "trending": {
        const now = Date.now();
        sorted.sort((a, b) => {
          const scoreA =
            (b.upvoteCount || 0) +
            Math.max(
              0,
              10 -
                Math.floor((now - new Date(b.createdAt).getTime()) / 86400000),
            );
          const scoreB =
            (a.upvoteCount || 0) +
            Math.max(
              0,
              10 -
                Math.floor((now - new Date(a.createdAt).getTime()) / 86400000),
            );
          return scoreB - scoreA;
        });
        break;
      }
      case "newest":
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "most-supported":
        sorted.sort((a, b) => (b.upvoteCount || 0) - (a.upvoteCount || 0));
        break;
    }
    return sorted;
  }, [
    filteredIssues,
    sortBy,
    gpsLocation,
    searchLocation,
    selectedLocation,
    defaultCenter,
  ]);

  // --- Statistics ---
  const stats = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((i) => i.status === "resolved").length;
    const active = total - resolved;
    const resolvedThisMonth = issues.filter((i) => {
      if (i.status !== "resolved" || !i.resolvedAt) return false;
      const d = new Date(i.resolvedAt);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }).length;
    const categories = issues.reduce((acc, i) => {
      const cat = i.aiCategory || "other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    const topCat = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    const totalSupport = issues.reduce(
      (sum, i) => sum + (i.upvoteCount || 0),
      0,
    );
    const avgSupport =
      issues.length > 0 ? (totalSupport / issues.length).toFixed(1) : "0";
    return {
      total,
      resolved,
      active,
      resolvedThisMonth,
      topCategory: topCat ? CATEGORY_LABELS[topCat[0]] || topCat[0] : "—",
      avgSupport,
    };
  }, [issues]);

  const hasActiveFilters = filterCategory || filterStatus;

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden transition-colors">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* MAP */}
        <div className="flex-1 relative z-0">
          {loading && (
            <div className="absolute inset-0 z-[2000] bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
          )}

          <MapContainer
            center={defaultCenter}
            zoom={13}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            ref={setMapInstance}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Street View">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite View">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Esri"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            <MapClickHandler onLocationSelect={handleLocationSelect} />

            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={60}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {sortedIssues.map((issue) => (
                <Marker
                  key={issue._id}
                  position={[issue.location.lat, issue.location.lng]}
                  icon={createCustomIcon(
                    issue.aiCategory,
                    issue.status,
                    issue.hasUpvoted,
                  )}
                >
                  <Popup
                    minWidth={280}
                    maxWidth={320}
                    className="rounded-2xl overflow-hidden"
                  >
                    <div style={{ fontFamily: "system-ui, sans-serif" }}>
                      {issue.imageUrl && (
                        <img
                          src={issue.imageUrl}
                          alt="Issue"
                          style={{
                            width: "100%",
                            height: "140px",
                            objectFit: "cover",
                            borderRadius: "12px 12px 0 0",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                      <div style={{ padding: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.1em",
                              color:
                                CATEGORY_COLORS[issue.aiCategory] || "#6b7280",
                            }}
                          >
                            {CATEGORY_LABELS[issue.aiCategory] ||
                              issue.aiCategory}
                          </span>
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background:
                                issue.status === "resolved"
                                  ? "#dcfce7"
                                  : issue.status === "in_progress"
                                    ? "#dbeafe"
                                    : issue.status === "acknowledged"
                                      ? "#fef3c7"
                                      : "#fee2e2",
                              color:
                                issue.status === "resolved"
                                  ? "#16a34a"
                                  : issue.status === "in_progress"
                                    ? "#2563eb"
                                    : issue.status === "acknowledged"
                                      ? "#d97706"
                                      : "#dc2626",
                            }}
                          >
                            {issue.status?.replace("_", " ")}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: "12px",
                            color: "#374151",
                            marginBottom: "8px",
                            lineHeight: "1.4",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          "{issue.description}"
                        </p>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            fontSize: "10px",
                            color: "#6b7280",
                            marginBottom: "8px",
                          }}
                        >
                          {issue.wardId?.name && (
                            <span style={{ fontWeight: 600 }}>
                              Ward: {issue.wardId.name}
                            </span>
                          )}
                          <span>{formatDate(issue.createdAt)}</span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#6b7280",
                            marginBottom: "10px",
                          }}
                        >
                          <span>{issue.upvoteCount || 0}</span>
                          <span>
                            support{issue.upvoteCount !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => onViewIssue(issue)}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              background: "#2563eb",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            View Details
                          </button>
                          {isAuthenticated && (
                            <button
                              onClick={(e) => handleSupport(e, issue._id)}
                              disabled={supportingId === issue._id}
                              style={{
                                padding: "8px 12px",
                                background: issue.hasUpvoted
                                  ? "#e0e7ff"
                                  : "#f3f4f6",
                                color: issue.hasUpvoted ? "#4f46e5" : "#374151",
                                border: `1px solid ${issue.hasUpvoted ? "#4f46e5" : "#e5e7eb"}`,
                                borderRadius: "8px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {supportingId === issue._id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : issue.hasUpvoted ? (
                                "Supported"
                              ) : (
                                "Support"
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>

            {newIssueLocation && (
              <Marker
                position={[newIssueLocation.lat, newIssueLocation.lng]}
                icon={(() => {
                  const size = 32;
                  return new L.DivIcon({
                    className: "custom-marker",
                    html: `<div style="
                      width: ${size}px; height: ${size}px;
                      background: #3b82f6;
                      border: 3px solid white;
                      border-radius: 50%;
                      box-shadow: 0 2px 12px rgba(59,130,246,0.6);
                      display: flex; align-items: center; justify-content: center;
                      animation: pulse 1.5s infinite;
                    "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
                    iconSize: [size, size],
                    iconAnchor: [size / 2, size / 2],
                  });
                })()}
              />
            )}
          </MapContainer>

          {/* SEARCH BAR */}
          <div className="absolute top-4 left-4 right-4 lg:right-auto z-[1001] flex flex-col gap-2">
            <NominatimSearch
              onSelect={(loc) => {
                setSearchLocation({ lat: loc.lat, lng: loc.lng });
                setCurrentAddress(loc.label.split(",")[0]);
              }}
              mapRef={mapInstance}
            />
            <div className="flex gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowRadiusMenu(!showRadiusMenu)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-lg font-bold text-xs h-10 px-3 rounded-xl flex items-center gap-1.5 hover:border-blue-400 transition-all"
                >
                  <Target size={12} className="text-blue-500" />
                  {selectedRadius} km
                  <ChevronDown size={10} />
                </button>
                {showRadiusMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowRadiusMenu(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                      {RADIUS_OPTIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setSelectedRadius(r);
                            setShowRadiusMenu(false);
                          }}
                          className={`w-full px-4 py-2.5 text-xs font-bold text-left transition-colors ${
                            selectedRadius === r
                              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          {r} km
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={handleLocateUser}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-lg font-bold text-xs h-10 px-3 rounded-xl hover:border-blue-400"
              >
                {isGeocoding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Target size={12} className="text-blue-500" />
                )}
              </Button>

              <div className="relative">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`shadow-lg font-bold text-xs h-10 px-3 rounded-xl border-2 ${
                    hasActiveFilters
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <Filter
                    size={12}
                    className={hasActiveFilters ? "" : "text-blue-500"}
                  />
                </Button>

                {showFilters && (
                  <Card className="absolute top-12 left-0 w-56 p-2 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-2xl z-[1002] rounded-2xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase p-2.5 tracking-widest border-b border-slate-50 dark:border-slate-800 mb-1">
                      Category
                    </div>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() =>
                          setFilterCategory(filterCategory === cat ? "" : cat)
                        }
                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-between mb-0.5 ${
                          filterCategory === cat
                            ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {CATEGORY_LABELS[cat.toLowerCase()] || cat}
                        {filterCategory === cat && (
                          <Check size={14} className="text-blue-600" />
                        )}
                      </button>
                    ))}
                    <div className="text-[9px] font-black text-slate-400 uppercase p-2.5 tracking-widest border-t border-slate-50 dark:border-slate-800 mt-1 mb-1">
                      Status
                    </div>
                    {statuses.map((st) => (
                      <button
                        key={st}
                        onClick={() =>
                          setFilterStatus(filterStatus === st ? "" : st)
                        }
                        className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-between mb-0.5 capitalize ${
                          filterStatus === st
                            ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {st.replace("_", " ")}
                        {filterStatus === st && (
                          <Check size={14} className="text-blue-600" />
                        )}
                      </button>
                    ))}
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* STATISTICS OVERLAY */}
          <div className="absolute top-36 left-4 z-[1001] hidden lg:block">
            <Card className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl min-w-[180px]">
              <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <Activity size={14} className="text-blue-500" />
                Live Stats
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                    <TriangleAlert size={12} className="text-red-400" /> Active
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {stats.active}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                    <CheckCircleIcon size={12} className="text-green-400" />{" "}
                    Resolved
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {stats.resolvedThisMonth}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                    <Flame size={12} className="text-purple-400" /> Top Category
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {stats.topCategory}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
                    <ThumbsUp size={12} className="text-blue-400" /> Avg Support
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {stats.avgSupport}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* FLOATING REPORT BUTTON */}
          {newIssueLocation && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1001] animate-in slide-in-from-bottom-4 duration-300">
              <Button
                onClick={() => navigate("report-issue")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl shadow-2xl font-black uppercase tracking-tighter flex items-center gap-3 ring-4 ring-white dark:ring-slate-900"
              >
                <PlusCircle size={20} />
                Report at this location
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewIssueLocation(null);
                  }}
                  className="ml-2 p-1 hover:bg-blue-500 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </Button>
            </div>
          )}
        </div>

        {/* DESKTOP SIDEBAR */}
        <div
          className={`hidden lg:flex bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex-col z-10 shadow-2xl h-full overflow-hidden transition-all duration-300 ${detailIssue ? "w-[480px]" : "w-96"}`}
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black tracking-tighter uppercase text-lg">
                <MapIcon size={18} className="text-blue-500" /> Community Feed
              </div>
              {detailIssue && (
                <button
                  onClick={() => setDetailIssue(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                {sortedIssues.length} report
                {sortedIssues.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                {sortBy === "nearby" && (
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">
                    within {selectedRadius} km
                  </span>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    <ArrowUpDown size={10} />
                    {SORT_OPTIONS.find((s) => s.id === sortBy)?.label || "Sort"}
                  </button>
                  {showSortMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSortMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                        {SORT_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => {
                                setSortBy(opt.id);
                                setShowSortMenu(false);
                              }}
                              className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                                sortBy === opt.id
                                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              <Icon size={12} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              <MapPin size={10} />
              {searchLocation
                ? `Viewing: ${currentAddress || "Searched area"}`
                : currentAddress && currentAddress !== "Select a location"
                  ? `Viewing around ${currentAddress}`
                  : currentCity
                    ? `Viewing around ${currentCity}`
                    : "Viewing all areas"}
            </div>
            {gpsError && (
              <div className="mt-1.5 flex items-start gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <TriangleAlert size={11} className="mt-0.5 shrink-0" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          {detailIssue ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* Detail Drawer */}
              <div className="p-0">
                {detailIssue.imageUrl && (
                  <div className="relative w-full h-52 overflow-hidden">
                    <img
                      src={detailIssue.imageUrl}
                      alt="Issue"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 px-2.5 py-1 rounded-full">
                        {CATEGORY_LABELS[detailIssue.aiCategory] ||
                          detailIssue.aiCategory}
                      </span>
                      <Badge
                        status={detailIssue.status}
                        className="text-[9px]"
                        invert
                      />
                    </div>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold italic leading-relaxed mb-2">
                        "{detailIssue.description}"
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {detailIssue.wardId?.name || "Unknown Ward"}
                        </span>
                        <span>•</span>
                        <span>{formatDate(detailIssue.createdAt)}</span>
                        {detailIssue.resolvedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Resolved {formatDate(detailIssue.resolvedAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailIssue(null);
                      }}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 ml-2"
                    >
                      <X size={14} className="text-slate-400" />
                    </button>
                  </div>

                  {/* Status Timeline */}
                  <div className="mb-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      Progress
                    </p>
                    <StatusTimeline
                      status={detailIssue.status}
                      createdAt={detailIssue.createdAt}
                      resolvedAt={detailIssue.resolvedAt}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mb-5">
                    <button
                      onClick={(e) => handleSupport(e, detailIssue._id)}
                      disabled={supportingId === detailIssue._id}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${
                        detailIssue.hasUpvoted
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-2 border-blue-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-2 border-transparent hover:border-blue-300"
                      }`}
                    >
                      {supportingId === detailIssue._id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : detailIssue.hasUpvoted ? (
                        <ThumbsUp size={14} />
                      ) : (
                        <ThumbsUp size={14} />
                      )}
                      {detailIssue.hasUpvoted ? "Supported" : "Support"} (
                      {detailIssue.upvoteCount || 0})
                    </button>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/issue/${detailIssue._id}`;
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(url);
                        } else {
                          const ta = document.createElement("textarea");
                          ta.value = url;
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                        }
                        toast.success("Link copied to clipboard");
                      }}
                      className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-xl transition-colors"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => onViewIssue(detailIssue)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                  >
                    View Full Details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30 dark:bg-transparent">
              {sortedIssues.length === 0 ? (
                <div className="text-center py-20 text-slate-400 font-medium italic">
                  {hasActiveFilters
                    ? "No reports match the selected filters."
                    : "No reports found."}
                </div>
              ) : (
                sortedIssues.map((issue) => (
                  <Card
                    key={issue._id}
                    id={`feed-card-${issue._id}`}
                    onClick={() => {
                      setSelectedIssue(issue);
                      setDetailIssue(issue);
                      mapInstance?.flyTo(
                        [issue.location.lat, issue.location.lng],
                        16,
                      );
                      setBottomSheetOpen(false);
                    }}
                    className={`p-0 overflow-hidden border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500 transition-all ${
                      selectedIssue?._id === issue._id
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                  >
                    <div className="flex">
                      {issue.imageUrl && (
                        <div className="w-24 h-24 shrink-0">
                          <img
                            src={issue.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 p-3 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-[9px] font-black uppercase tracking-widest"
                            style={{
                              color:
                                CATEGORY_COLORS[issue.aiCategory] || "#6b7280",
                            }}
                          >
                            {CATEGORY_LABELS[issue.aiCategory] ||
                              issue.aiCategory}
                          </span>
                          <Badge status={issue.status} className="text-[8px]" />
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2 line-clamp-1 italic font-medium">
                          "{issue.description}"
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold">
                            <span className="flex items-center gap-1">
                              <ThumbsUp size={10} /> {issue.upvoteCount || 0}
                            </span>
                            <span>{formatDate(issue.createdAt)}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewIssue(issue);
                            }}
                            className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 text-slate-500 dark:text-white rounded-lg transition-colors"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* MOBILE BOTTOM SHEET */}
        <div
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out ${
            bottomSheetOpen ? "h-2/3" : "h-auto max-h-[88px]"
          }`}
        >
          {/* Handle */}
          <div
            className="flex items-center justify-center py-3 cursor-pointer"
            onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
          </div>

          {/* Sort tabs (always visible in bottom sheet) */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-4">
            {SORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setSortBy(opt.id);
                    setBottomSheetOpen(true);
                  }}
                  className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-all ${
                    sortBy === opt.id
                      ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600"
                      : "text-slate-400"
                  }`}
                >
                  <Icon size={11} />
                  {opt.label}
                </button>
              );
            })}
            <button
              onClick={() => setBottomSheetOpen(!bottomSheetOpen)}
              className="px-3 text-slate-400"
            >
              {bottomSheetOpen ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronUp size={16} />
              )}
            </button>
          </div>

          {/* Sheet content (scrollable) */}
          <div
            className={`overflow-y-auto px-4 pb-6 ${
              bottomSheetOpen ? "flex-1" : "hidden"
            }`}
            style={{
              maxHeight: bottomSheetOpen ? "calc(66.67vh - 100px)" : "0",
            }}
          >
            <div className="space-y-3 pt-3">
              {sortedIssues.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm font-medium italic">
                  No reports found.
                </div>
              ) : (
                sortedIssues.map((issue) => (
                  <Card
                    key={issue._id}
                    onClick={() => {
                      setSelectedIssue(issue);
                      mapInstance?.flyTo(
                        [issue.location.lat, issue.location.lng],
                        16,
                      );
                    }}
                    className="p-3 border-slate-200 dark:border-slate-700 cursor-pointer hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {issue.imageUrl && (
                        <img
                          src={issue.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[8px] font-black uppercase tracking-widest"
                            style={{
                              color:
                                CATEGORY_COLORS[issue.aiCategory] || "#6b7280",
                            }}
                          >
                            {CATEGORY_LABELS[issue.aiCategory] ||
                              issue.aiCategory}
                          </span>
                          <Badge status={issue.status} className="text-[7px]" />
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1">
                          {issue.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[8px] text-slate-400 font-bold">
                          <span className="flex items-center gap-1">
                            <ThumbsUp size={9} /> {issue.upvoteCount || 0}
                          </span>
                          <span>{formatDate(issue.createdAt)}</span>
                          {issue.wardId?.name && (
                            <span>{issue.wardId.name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewIssue(issue);
                        }}
                        className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0"
                      >
                        <ChevronRight size={12} className="text-slate-400" />
                      </button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Collapsed indicator when sheet is closed */}
          {!bottomSheetOpen && (
            <div className="px-4 pb-3 overflow-hidden">
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                <MapPin size={12} className="text-blue-500" />
                {sortedIssues.length} report
                {sortedIssues.length !== 1 ? "s" : ""} •{" "}
                {sortBy === "trending"
                  ? "Trending"
                  : sortBy === "newest"
                    ? "Newest"
                    : sortBy === "most-supported"
                      ? "Most Supported"
                      : "Nearby"}
                {gpsAccuracy != null && (
                  <span className="ml-auto text-[8px] text-slate-400">
                    {gpsAccuracy < 50
                      ? "High"
                      : gpsAccuracy < 200
                        ? "Medium"
                        : "Low"}{" "}
                    accuracy
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircleIcon({ size, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
