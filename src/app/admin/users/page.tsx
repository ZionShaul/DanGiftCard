"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "admin" | "requester" | "signatory";
  isActive: boolean;
  lastLoginAt: string | null;
  organization: { id: string; name: string } | null;
};

type Org = { id: string; name: string };

const ROLE_LABELS: Record<string, string> = {
  admin: "מנהל מערכת",
  requester: "מקים הזמנה",
  signatory: "מורשה חתימה",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700",
  requester: "bg-blue-100 text-blue-700",
  signatory: "bg-orange-100 text-orange-700",
};

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  role: "requester" as "admin" | "requester" | "signatory",
  organizationId: "",
  isActive: true,
};

function UsersPageInner() {
  const searchParams = useSearchParams();
  const orgIdFilter = searchParams.get("orgId") ?? "";

  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState(orgIdFilter);

  const [modal, setModal] = useState<{ open: boolean; editing: User | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (orgFilter) params.set("organizationId", orgFilter);
    if (roleFilter) params.set("role", roleFilter);
    const res = await fetch(`/api/v1/users?${params}`);
    const data = await res.json();
    setUsers(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [orgFilter, roleFilter]);

  useEffect(() => {
    fetch("/api/v1/organizations").then((r) => r.json()).then((data) => setOrgs(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ ...emptyForm, organizationId: orgFilter });
    setError("");
    setModal({ open: true, editing: null });
  }

  function openEdit(u: User) {
    setForm({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone ?? "",
      role: u.role,
      organizationId: u.organization?.id ?? "",
      isActive: u.isActive,
    });
    setError("");
    setModal({ open: true, editing: u });
  }

  function closeModal() { setModal({ open: false, editing: null }); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const isAdmin = form.role === "admin";
    if (!isAdmin && !form.organizationId) {
      setError("חובה לבחור ארגון עבור תפקיד זה");
      return;
    }

    setSaving(true);
    const body = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      role: form.role,
      organizationId: isAdmin ? undefined : form.organizationId,
      isActive: form.isActive,
    };

    const url = modal.editing ? `/api/v1/users/${modal.editing.id}` : "/api/v1/users";
    const method = modal.editing ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "שגיאה בשמירה");
      return;
    }
    closeModal();
    load();
  }

  async function handleDelete(id: string) {
    setDeleteError("");
    const res = await fetch(`/api/v1/users/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "שגיאה במחיקה");
      return;
    }
    setDeleteConfirm(null);
    load();
  }

  const filteredOrgName = orgs.find((o) => o.id === orgFilter)?.name;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ניהול משתמשים</h1>
          {filteredOrgName && (
            <p className="text-sm text-slate-500 mt-0.5">מסונן לפי ארגון: <span className="font-medium">{filteredOrgName}</span></p>
          )}
        </div>
        <button onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + משתמש חדש
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">כל הארגונים</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">כל התפקידים</option>
          <option value="admin">מנהל מערכת</option>
          <option value="requester">מקים הזמנה</option>
          <option value="signatory">מורשה חתימה</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
            <tr>
              <th className="text-right px-4 py-3 font-medium">שם</th>
              <th className="text-right px-4 py-3 font-medium">מייל</th>
              <th className="text-right px-4 py-3 font-medium">נייד</th>
              <th className="text-center px-4 py-3 font-medium">תפקיד</th>
              <th className="text-right px-4 py-3 font-medium">ארגון</th>
              <th className="text-center px-4 py-3 font-medium">סטטוס</th>
              <th className="text-center px-4 py-3 font-medium">כניסה אחרונה</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">טוען...</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">אין משתמשים</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className={`border-t border-slate-100 hover:bg-slate-50 ${!u.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
                <td className="px-4 py-3 text-slate-500 text-xs" dir="ltr">{u.email}</td>
                <td className="px-4 py-3 text-slate-500 text-xs" dir="ltr">{u.phone ?? "–"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.organization?.name ?? "–"}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.isActive ? "פעיל" : "לא פעיל"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-slate-500 text-xs">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("he-IL") : "–"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <button onClick={() => openEdit(u)} className="text-blue-600 text-xs hover:underline">עריכה</button>
                    <button onClick={() => { setDeleteConfirm(u.id); setDeleteError(""); }}
                      className="text-red-500 text-xs hover:underline">מחיקה</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{users.length} משתמשים</p>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">מחיקת משתמש</h2>
            <p className="text-slate-600 text-sm mb-4">האם אתה בטוח? פעולה זו לא ניתנת לביטול.</p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">{deleteError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">מחק</button>
              <button onClick={() => { setDeleteConfirm(null); setDeleteError(""); }}
                className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-slate-800">{modal.editing ? "עריכת משתמש" : "משתמש חדש"}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                <input type="text" required value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ישראל ישראלי" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">מייל</label>
                <input type="email" required={!modal.editing} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!!modal.editing}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  placeholder="user@example.co.il" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">נייד</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="050-1234567" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תפקיד</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role, organizationId: e.target.value === "admin" ? "" : form.organizationId })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="requester">מקים הזמנה</option>
                  <option value="signatory">מורשה חתימה</option>
                  <option value="admin">מנהל מערכת</option>
                </select>
              </div>
              {form.role !== "admin" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ארגון</label>
                  <select required value={form.organizationId}
                    onChange={(e) => setForm({ ...form, organizationId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">בחר ארגון...</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="userActive" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded" />
                <label htmlFor="userActive" className="text-sm text-slate-700">משתמש פעיל</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {saving ? "שומר..." : "שמור"}
                </button>
                <button type="button" onClick={closeModal}
                  className="flex-1 border border-slate-300 text-slate-600 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-400">טוען...</div>}>
      <UsersPageInner />
    </Suspense>
  );
}
