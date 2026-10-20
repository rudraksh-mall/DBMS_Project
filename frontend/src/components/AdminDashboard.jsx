import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Map,
  BarChart3,
  Users,
  Shield,
  Plus,
  Edit2,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { Header } from "./Header";
import {
  getAuthorities,
  createAuthority,
  updateAuthority,
  deactivateAuthority,
} from "../services/admin.service";
import { fetchWards, fetchCities } from "../services/ward.service";

const SIDEBAR_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "authorities", label: "Authorities", icon: Shield },
  { key: "complaints", label: "Complaints", icon: FileText },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "users", label: "Users", icon: Users },
];

function CreateAuthorityModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [wardId, setWardId] = useState("");
  const [cities, setCities] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchCities()
      .then((res) => setCities(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!city) { setWards([]); return; }
    fetchWards(city)
      .then((res) => setWards(res.data.data || []))
      .catch(() => {});
  }, [city]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !wardId) return;
    setLoading(true);
    try {
      const res = await createAuthority({ name, email, wardId });
      setResult(res.data);
      onCreated();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create authority");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">Create Authority</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p className="text-green-700 dark:text-green-400 font-bold">Authority created successfully</p>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <p><strong>Name:</strong> {result.name}</p>
              <p><strong>Email:</strong> {result.email}</p>
              <p><strong>Ward:</strong> {result.wardName}</p>
              <p><strong>City:</strong> {result.city}</p>
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-amber-700 dark:text-amber-400 text-xs font-bold mb-1">Temporary Password</p>
                <p className="text-amber-800 dark:text-amber-300 font-mono text-sm break-all">{result.tempPassword}</p>
                <p className="text-amber-600 dark:text-amber-500 text-[10px] mt-1">Share this securely. Authority can login or use Google OAuth.</p>
              </div>
            </div>
            <Button onClick={onClose} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-3 border dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 border dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">City</label>
                <select
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setWardId(""); }}
                  required
                  className="w-full p-3 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="">Select City</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ward</label>
                <select
                  value={wardId}
                  onChange={(e) => setWardId(e.target.value)}
                  required
                  disabled={!city}
                  className="w-full p-3 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm disabled:opacity-50"
                >
                  <option value="">Select Ward</option>
                  {wards.map((w) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create Authority"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

function EditAuthorityModal({ authority, onClose, onUpdated }) {
  const [name, setName] = useState(authority.name || "");
  const [wardId, setWardId] = useState(authority.wardId?._id || authority.wardId || "");
  const [cities, setCities] = useState([]);
  const [wards, setWards] = useState([]);
  const [city, setCity] = useState(authority.wardId?.city || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCities()
      .then((res) => setCities(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!city) { setWards([]); return; }
    fetchWards(city)
      .then((res) => setWards(res.data.data || []))
      .catch(() => {});
  }, [city]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateAuthority(authority._id, { name, wardId });
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update authority");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg p-6 bg-white dark:bg-slate-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">Edit Authority</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-3 border dark:border-slate-700 rounded-xl bg-transparent outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Email</label>
            <input
              type="email"
              value={authority.email}
              disabled
              className="w-full p-3 border dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">City</label>
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setWardId(""); }}
                className="w-full p-3 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
              >
                <option value="">Select City</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ward</label>
              <select
                value={wardId}
                onChange={(e) => setWardId(e.target.value)}
                disabled={!city}
                className="w-full p-3 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm disabled:opacity-50"
              >
                <option value="">Select Ward</option>
                {wards.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function AdminDashboard({ onNavigate, onLogout }) {
  const [activeTab, setActiveTab] = useState("authorities");
  const [authorities, setAuthorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAuth, setEditingAuth] = useState(null);

  const loadAuthorities = () => {
    setLoading(true);
    getAuthorities()
      .then((res) => setAuthorities(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeTab !== "authorities") return;

    let cancelled = false;
    getAuthorities()
      .then((res) => {
        if (!cancelled) setAuthorities(res.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleDeactivate = async (id) => {
    if (!confirm("Deactivate this authority account? They will not be able to log in.")) return;
    try {
      await deactivateAuthority(id);
      loadAuthorities();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to deactivate");
    }
  };

  const formatDate = (d) =>
    new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Header userRole="admin" onLogout={onLogout} onNavigate={onNavigate} />

      {showCreateModal && (
        <CreateAuthorityModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadAuthorities}
        />
      )}

      {editingAuth && (
        <EditAuthorityModal
          authority={editingAuth}
          onClose={() => setEditingAuth(null)}
          onUpdated={loadAuthorities}
        />
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-73px)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
          <nav className="p-4 space-y-1">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm ${
                  activeTab === item.key
                    ? "bg-blue-600/10 text-blue-600 dark:text-blue-500 font-medium border border-blue-200 dark:border-blue-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === "dashboard" && (
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Admin Dashboard</h1>
              <div className="grid md:grid-cols-4 gap-6">
                <Card className="p-6 border-blue-200/50 bg-white dark:bg-slate-900">
                  <div className="text-3xl font-bold text-blue-600">{authorities.length}</div>
                  <div className="text-sm text-slate-500">Authority Accounts</div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "authorities" && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Authority Management
                </h1>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus size={16} className="mr-2" /> Create Authority
                </Button>
              </div>

              <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl rounded-2xl">
                {loading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4 text-left">Name</th>
                        <th className="px-6 py-4 text-left">Email</th>
                        <th className="px-6 py-4 text-left">Ward</th>
                        <th className="px-6 py-4 text-left">City</th>
                        <th className="px-6 py-4 text-left">Status</th>
                        <th className="px-6 py-4 text-left">Created</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {authorities.map((a) => (
                        <tr key={a._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{a.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{a.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {a.wardId?.name || "—"}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                            {a.wardId?.city || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <Badge status={a.isActive === false ? "resolved" : a.isActive === undefined ? "submitted" : "acknowledged"} />
                            <span className={`ml-2 text-[10px] font-bold uppercase ${a.isActive === false ? "text-red-500" : "text-green-500"}`}>
                              {a.isActive === false ? "Inactive" : "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400">{formatDate(a.createdAt)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingAuth(a)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-600/10 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              {a.isActive !== false && (
                                <button
                                  onClick={() => handleDeactivate(a._id)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-600/10 rounded-lg transition-all"
                                  title="Deactivate"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {authorities.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                            No authority accounts yet. Create one to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </Card>
            </div>
          )}

          {activeTab === "complaints" && (
            <div className="text-center py-20">
              <FileText size={48} className="mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-500">Complaint Review</h2>
              <p className="text-slate-400 mt-2">Coming soon — view and manage all complaints city-wide.</p>
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="text-center py-20">
              <BarChart3 size={48} className="mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-500">City-Wide Analytics</h2>
              <p className="text-slate-400 mt-2">Coming soon — aggregate metrics across all wards.</p>
            </div>
          )}

          {activeTab === "users" && (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <h2 className="text-xl font-bold text-slate-500">User Management</h2>
              <p className="text-slate-400 mt-2">Coming soon — view and manage citizen accounts.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
