import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Shield,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

// ── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => (
  <div
    className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-medium animate-slide-in max-w-sm
      ${type === "success" ? "bg-linear-to-r from-emerald-500 to-teal-600" : "bg-linear-to-r from-red-500 to-rose-600"}`}
  >
    {type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
    <span className="flex-1">{message}</span>
    <button onClick={onClose} className="ml-2 opacity-75 hover:opacity-100 transition-opacity cursor-pointer">
      <X size={16} />
    </button>
  </div>
);

// ── Form Field ───────────────────────────────────────────────────────────────
const Field = ({ label, type = "text", value, onChange, placeholder, required, options, showToggle, onToggle, showPass }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {options ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
      >
        <option value="">Select {label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    ) : (
      <div className="relative">
        <input
          type={showToggle ? (showPass ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all pr-10"
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    )}
  </div>
);

// ── Admin Form ───────────────────────────────────────────────────────────────
const AdminForm = ({ onSuccess, onError }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return onError("All fields are required");
    setLoading(true);
    try {
      const res = await axios.post("/superadmin/create-admin", form);
      if (res.data.success) {
        onSuccess(`Admin "${res.data.data.name}" created successfully!`);
        setForm({ name: "", email: "", password: "" });
      }
    } catch (err) {
      onError(err.response?.data?.message || "Failed to create admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full Name" value={form.name} onChange={set("name")} placeholder="e.g. Dr. John Doe" required />
      <Field label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="admin@school.com" required />
      <Field label="Password" value={form.password} onChange={set("password")} placeholder="Min. 6 characters" required showToggle showPass={showPass} onToggle={() => setShowPass((p) => !p)} />
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
        {loading ? "Creating..." : "Create Admin"}
      </button>
    </form>
  );
};

// ── Admins Table ─────────────────────────────────────────────────────────────
const AdminsTable = ({ onSuccess, onError }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10, role: "admin" };
      if (search) params.search = search;
      const res = await axios.get("/superadmin/users", { params });
      setUsers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      onError("Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, [page, search, onError]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleToggle = async (id) => {
    try {
      const res = await axios.patch(`/superadmin/users/${id}/toggle-active`);
      onSuccess(res.data.message);
      fetchAdmins();
    } catch (err) {
      onError(err.response?.data?.message || "Failed to update admin");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/superadmin/users/${id}`);
      onSuccess(`Admin "${name}" deleted`);
      fetchAdmins();
    } catch (err) {
      onError(err.response?.data?.message || "Failed to delete admin");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {["Name", "Email", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">
                    No admins found
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold
                        ${u.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(u._id)}
                          title={u.isActive ? "Deactivate" : "Activate"}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer
                            ${u.isActive
                              ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"}`}
                        >
                          {u.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          title="Delete admin"
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {users.length} of {pagination.total} admins
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "admins", label: "Admins List", icon: Shield },
  { id: "create", label: "Create Admin", icon: UserCog },
];

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("admins");
  const [toast, setToast] = useState(null);

  const showSuccess = (msg) => setToast({ message: msg, type: "success" });
  const showError = (msg) => setToast({ message: msg, type: "error" });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="min-h-screen">
      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super Admin Panel</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage admin credentials and control admin statuses</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer
              ${activeTab === id
                ? "bg-linear-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 dark:hover:text-violet-400"}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Content Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 lg:p-8">
        {activeTab === "admins" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Administrator Accounts</h2>
            <AdminsTable onSuccess={showSuccess} onError={showError} />
          </div>
        )}

        {activeTab === "create" && (
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <UserCog size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Admin Account</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Admins can manage students, teachers, courses, and reports</p>
              </div>
            </div>
            <AdminForm onSuccess={showSuccess} onError={showError} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default SuperAdminDashboard;
