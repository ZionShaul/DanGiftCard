"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Org = {
  id: string;
  name: string;
  code: string | null;
  contactEmail: string | null;
  isActive: boolean;
  _count: { users: number; orders: number };
};

const emptyForm = { name: "", code: "", contactEmail: "", isActive: true };

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing: Org | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/v1/organizations");
    const data = await res.json();
    setOrgs(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm(emptyForm);
    setError("");
    setModal({ open: true, editing: null });
  }

  function openEdit(org: Org) {
    setForm({ name: org.name, code: org.code ?? "", contactEmail: org.contactEmail ?? "", isActive: org.isActive });
    setError("");
    setModal({ open: true, editing: org });
  }

  function closeModal() { setModal({ open: false, editing: null }); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const body = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
      isActive: form.isActive,
    };

    const url = modal.editing ? `/api/v1/organizations/${modal.editing.id}` : "/api/v1/organizations";
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">ניהול ארגונים</h1>
        <button onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + ארגון חדש
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
            <tr>
              <th className="text-right px-4 py-3 font-medium">שם</th>
              <th className="text-right px-4 py-3 font-medium">קוד</th>
              <th className="text-right px-4 py-3 font-medium">מייל קשר</th>
              <th className="text-center px-4 py-3 font-medium">משתמשים</th>
              <th className="text-center px-4 py-3 font-medium">הזמנות</th>
              <th className="text-center px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">טוען...</td></tr>
            )}
            {!loading && orgs.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">אין ארגונים. הוסף ארגון ראשון.</td></tr>
            )}
            {orgs.map((org) => (
              <tr key={org.id} className={`border-t border-slate-100 hover:bg-slate-50 ${!org.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-slate-800">{org.name}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{org.code ?? "–"}</td>
                <td className="px-4 py-3 text-slate-500">{org.contactEmail ?? "–"}</td>
                <td className="px-4 py-3 text-center">{org._count.users}</td>
                <td className="px-4 py-3 text-center">{org._count.orders}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${org.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {org.isActive ? "פעיל" : "לא פעיל"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <Link href={`/admin/users?orgId=${org.id}`} className="text-slate-500 text-xs hover:underline">
                      משתמשים
                    </Link>
                    <button onClick={() => openEdit(org)} className="text-blue-600 text-xs hover:underline">
                      עריכה
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{orgs.length} ארגונים רשומים</p>

      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{modal.editing ? "עריכת ארגון" : "ארגון חדש"}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם ארגון</label>
                <input type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="קיבוץ דן" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">קוד ארגון (אופציונלי)</label>
                <input type="text" value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DAN" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">מייל קשר (אופציונלי)</label>
                <input type="email" value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="contact@org.co.il" dir="ltr" />
              </div>
              {modal.editing && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="orgActive" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded" />
                  <label htmlFor="orgActive" className="text-sm text-slate-700">ארגון פעיל</label>
                </div>
              )}
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
