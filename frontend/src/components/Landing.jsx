import { useState } from "react";
import {
  MapPin,
  Shield,
  Users,
  BarChart3,
  Clock,
  Camera,
  Navigation,
  CheckCircle,
  Brain,
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  Layers,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useAuthStore } from "../store/useAuthStore";

const NAV_LINKS = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "authorities", label: "Authorities" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "AI Verification",
    desc: "Automatically detects invalid or duplicate reports using image analysis",
  },
  {
    icon: MapPin,
    title: "Location Mapping",
    desc: "Ward-level routing ensures issues reach the right authorities",
  },
  {
    icon: Users,
    title: "Community Support",
    desc: "Upvote important issues to surface what matters most",
  },
  {
    icon: Clock,
    title: "Live Tracking",
    desc: "Track resolution progress from submission to completion",
  },
  {
    icon: Layers,
    title: "Authority Dashboard",
    desc: "Manage, assign, and resolve complaints efficiently",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Monitor civic performance with actionable insights",
  },
];

const SHOWCASE_TABS = [
  { id: "citizen", label: "Citizen Experience", active: true },
  { id: "authority", label: "Authority Dashboard", active: false },
  { id: "map", label: "Community Map", active: false },
];

const STEPS = [
  {
    icon: Camera,
    title: "Upload Photo",
    desc: "Snap a picture of the issue and add a short description",
  },
  {
    icon: Navigation,
    title: "Verify Location",
    desc: "Pin the exact location on the map for accurate routing",
  },
  {
    icon: CheckCircle,
    title: "Track Resolution",
    desc: "Follow progress as authorities acknowledge and resolve",
  },
];

function ProductScreenshot({ tab, isVisible }) {
  if (tab === "citizen") {
    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="ml-4 px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-[10px] text-slate-500 font-medium">
            app.civicfix.ai/report
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Report a New Issue
              </p>
              <p className="text-[11px] text-slate-400">
                Take a photo or upload an image
              </p>
            </div>
          </div>
          <div className="h-36 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
            <div className="text-center">
              <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">
                Tap to capture or upload
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded" />
            <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-700 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                Submit Report
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tab === "authority") {
    return (
      <div
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      >
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <div className="ml-4 px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-[10px] text-slate-500 font-medium">
            app.civicfix.ai/authority
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Pending Issues
            </h3>
            <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
              View All <ArrowUpRight size={12} />
            </span>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Road damage reported near{" "}
                    {["MG Road", "Civil Lines", "Gandhi Nagar"][i - 1]}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {["2h ago", "5h ago", "1d ago"][i - 1]}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    i === 1
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : i === 2
                        ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}
                >
                  {["Critical", "Medium", "Low"][i - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-4 px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-[10px] text-slate-500 font-medium">
          app.civicfix.ai/map
        </div>
      </div>
      <div className="p-0">
        <div className="h-52 bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-700 dark:to-slate-800 relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20px 20px, rgba(59,130,246,0.08) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
          {[
            { top: "30%", left: "25%", color: "bg-red-400" },
            { top: "45%", left: "55%", color: "bg-yellow-400" },
            { top: "60%", left: "35%", color: "bg-green-400" },
            { top: "35%", left: "70%", color: "bg-blue-400" },
            { top: "55%", left: "15%", color: "bg-purple-400" },
          ].map((pin, i) => (
            <div
              key={i}
              className={`absolute w-3 h-3 ${pin.color} rounded-full border-2 border-white shadow-lg`}
              style={{
                top: pin.top,
                left: pin.left,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
          <div className="absolute bottom-3 left-3 right-3 flex gap-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/70" />
            <div className="flex-1 h-1.5 rounded-full bg-white/40" />
            <div className="flex-1 h-1.5 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  const navigate = useAppStore((state) => state.navigate);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useAuthStore((state) => state.userRole);
  const [activeTab, setActiveTab] = useState("citizen");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleProtectedNavigate = (screen) => {
    if (!isAuthenticated) {
      navigate("login");
    } else {
      navigate(screen);
    }
  };

  const heroImg = (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-4 px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-md text-[10px] text-slate-500 font-medium">
          app.civicfix.ai
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-700">
        <div className="p-4 bg-white dark:bg-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MapPin className="w-3 h-3 text-blue-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Recent Issues
            </span>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div
                className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded"
                style={{ width: `${[70, 50, 40][i - 1]}%` }}
              />
            </div>
          ))}
        </div>
        <div className="p-4 bg-white dark:bg-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-green-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Resolved
            </span>
          </div>
          <div className="text-3xl font-black text-green-600 dark:text-green-400">
            68%
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div className="h-full w-[68%] bg-green-500 rounded-full" />
          </div>
        </div>
      </div>
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium">
          1,247 active issues across 50 wards
        </span>
        <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
          Live{" "}
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="text-white text-sm font-black">CF</span>
            </div>
            <span className="text-base font-bold tracking-tight">
              CivicFix <span className="text-blue-600">AI</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("login")}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate("signup")}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                >
                  Get Started
                </button>
              </>
            ) : (
              <button
                onClick={() =>
                  navigate(
                    userRole === "authority"
                      ? "authority-dashboard"
                      : "citizen-dashboard",
                  )
                }
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
              >
                Dashboard
              </button>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="block w-full text-left py-2 text-sm text-slate-600 dark:text-slate-400 font-medium"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={() => navigate("login")}
                className="block w-full text-center py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("signup")}
                className="block w-full text-center py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-full mb-6">
                <Brain className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Powered by AI
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-5">
                Report Civic Issues.
                <br />
                <span className="text-blue-600">Track Progress.</span>
                <br />
                Improve Your City.
              </h1>
              <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mb-6">
                CivicFix helps citizens report local infrastructure problems
                while enabling authorities to prioritize and resolve them
                faster.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                {[
                  "AI-powered verification",
                  "Community prioritization",
                  "Real-time tracking",
                ].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium"
                  >
                    <CheckCircle size={12} className="text-blue-500" /> {item}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleProtectedNavigate("report-issue")}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
                >
                  Report an Issue <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => handleProtectedNavigate("map-view")}
                  className="px-6 py-3 border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2"
                >
                  Explore Community <MapPin size={14} />
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl" />
              {heroImg}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              How It Works
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Three simple steps to report and track civic issues in your
              neighborhood
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6"
                >
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-10 -right-3 text-slate-300 dark:text-slate-600">
                      <ArrowRight size={16} />
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">
                    Step {i + 1}
                  </div>
                  <h3 className="text-base font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              Everything you need
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Built for citizens and authorities to work together efficiently
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                    <Icon className="w-4.5 h-4.5 text-blue-600" size={18} />
                  </div>
                  <h3 className="text-sm font-bold mb-1">{feat.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              See it in action
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Real interfaces designed for every user in the civic ecosystem
            </p>
          </div>
          <div className="flex justify-center gap-1 mb-10 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 max-w-md mx-auto">
            {SHOWCASE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="max-w-2xl mx-auto">
            <ProductScreenshot tab={activeTab} isVisible={true} />
          </div>
        </div>
      </section>

      {/* AUTHORITIES SECTION */}
      <section id="authorities" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-full mb-5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  For Municipal Authorities
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
                Manage Civic Issues Efficiently
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Monitor complaints, assign tasks, track progress, and coordinate
                issue resolution across wards through a centralized dashboard.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Ward-level complaint management",
                  "AI-powered prioritization",
                  "Department coordination",
                  "Real-time citizen updates",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <CheckCircle
                      size={16}
                      className="text-blue-500 shrink-0 mt-0.5"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("login")}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all inline-flex items-center gap-2"
              >
                Authority Portal <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                  MC
                </div>
                <div>
                  <p className="text-sm font-bold">Municipal Corporation</p>
                  <p className="text-xs text-slate-400">
                    Central Control Dashboard
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  {
                    label: "Pending",
                    count: "47",
                    bg: "bg-amber-50 dark:bg-amber-900/10",
                    border: "border-amber-200/50 dark:border-amber-700/30",
                    text: "text-amber-600 dark:text-amber-400",
                  },
                  {
                    label: "In Progress",
                    count: "23",
                    bg: "bg-blue-50 dark:bg-blue-900/10",
                    border: "border-blue-200/50 dark:border-blue-700/30",
                    text: "text-blue-600 dark:text-blue-400",
                  },
                  {
                    label: "Resolved",
                    count: "18",
                    bg: "bg-green-50 dark:bg-green-900/10",
                    border: "border-green-200/50 dark:border-green-700/30",
                    text: "text-green-600 dark:text-green-400",
                  },
                  {
                    label: "High Priority",
                    count: "8",
                    bg: "bg-red-50 dark:bg-red-900/10",
                    border: "border-red-200/50 dark:border-red-700/30",
                    text: "text-red-600 dark:text-red-400",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`${item.bg} rounded-lg p-3 border ${item.border}`}
                  >
                    <p
                      className={`text-[10px] ${item.text} font-bold uppercase tracking-wider`}
                    >
                      {item.label}
                    </p>
                    <p className={`text-xl font-black ${item.text}`}>
                      {item.count}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Recent Complaints
                </p>
                {[
                  {
                    location: "MG Road, Ward 3",
                    status: "Critical",
                    time: "2h ago",
                    priority: "high",
                  },
                  {
                    location: "Civil Lines, Ward 7",
                    status: "Medium",
                    time: "5h ago",
                    priority: "medium",
                  },
                  {
                    location: "Gandhi Nagar, Ward 2",
                    status: "Low",
                    time: "1d ago",
                    priority: "low",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.priority === "high"
                          ? "bg-red-500"
                          : item.priority === "medium"
                            ? "bg-yellow-500"
                            : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-slate-900 dark:text-white truncate">
                        {item.location}
                      </p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                        item.status === "Critical"
                          ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          : item.status === "Medium"
                            ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Help Build Better Cities
          </h2>
          <p className="text-blue-100 text-base mb-6">
            Join citizens and authorities creating more responsive communities.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => handleProtectedNavigate("report-issue")}
              className="px-6 py-3 bg-white hover:bg-blue-50 text-blue-600 text-sm font-bold rounded-xl transition-all shadow-xl inline-flex items-center gap-2"
            >
              Report an Issue <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate("login")}
              className="px-6 py-3 border border-white/30 hover:bg-white/10 text-white text-sm font-semibold rounded-xl transition-all inline-flex items-center gap-2"
            >
              Authority Portal
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-[10px] font-black">CF</span>
                </div>
                <span className="text-sm font-bold">
                  CivicFix <span className="text-blue-600">AI</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Making cities better through community-powered civic issue
                reporting.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "Community", "Reporting"],
              },
              { title: "Company", links: ["About"] },
              { title: "Legal", links: ["Privacy", "Terms"] },
              { title: "Municipal Authorities", links: ["Authority Login"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                  {col.title}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <button
                        onClick={() => navigate("login")}
                        className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-slate-400">
              &copy; 2026 CivicFix. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}