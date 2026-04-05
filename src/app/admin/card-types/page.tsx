"use client";

import { useEffect, useState } from "react";

type CardType = {
  id: string;
  name: string;
  nameHe: string;
  description: string | null;
  discountPct: string;
  minLoadAmount: string;
  maxLoadAmount: string;
  displayOrder: number;
  isActive: boolean;
};

const empty = {
  name: "",
  nameHe: "",
  description: "",
  discountPct: "",
  minLoadAmount: "100",
  maxLoadAmount: "1500",
  displayOrder: 0,
  isActive: true,
};

export default function CardTypesPage() {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing: CardType | null }>({ open: false, editing: null });
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/v1/card-types?all=1");
    const data = await res.json();
    setCardTypes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setForm(empty);
    setError("");
    setModal({ open: true, editing: null });
  }

  function openEdit(ct: CardType) {
    setForm({
      name: ct.name,
      nameHe: ct.nameHe,
      description: ct.description ?? "",
      discountPct: ct.discountPct,
      minLoadAmount: ct.minLoadAmount,
      maxLoadAmount: ct.maxLoadAmount,
      displayOrder: ct.displayOrder,
      isActive: ct.isActive,
    });
    setError("");
    setModal({ open: true, editing: ct });
  }

  function closeModal() { setModal({ open: false, editing: null }); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body = {
      name: form.name.trim(),
      nameHe: form.nameHe.trim(),
      description: form.description?.trim() || null,
      discountPct: parseFloat(String(form.discountPct)),
      minLoadAmount: parseFloat(String(form.minLoadAmount)),
      maxLoadAmount: parseFloat(String(form.maxLoadAmount)),
      displayOrder: Number(form.displayOrder),
      isActive: form.isActive,
    };

    if (body.minLoadAmount >= body.maxLoadAmount) {
      setError("סכום מינימום חייב להיות קטן מסכום מקסימום");
      return;
    }

    setSaving(true);
    const url = modal.editing ? `/api/v1/card-types/${modal.editing.id}` : "/api/v1/card-types";
    const method = modal.editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);

    if (!res.ok) { setError("שגיאה בשמירה. אנא נסה שוב."); return; }
    closeModal();
    load();
  }

  async function handleToggleActive(ct: CardType) {
    await fetch(`/api/v1/card-types/${ct.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: ct.name, nameHe: ct.nameHe, description: ct.description,
        discountPct: parseFloat(ct.discountPct), minLoadAmount: parseFloat(ct.minLoadAmount),
        maxLoadAmount: parseFloat(ct.maxLoadAmount), displayOrder: ct.displayOrder,
        isActive: !ct.isActive,
      }),
    });
    load();
  }

  async function handleDelete(id: string) {
    setDeleteError("");
    const res = await fetch(`/api/v1/card-types/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "שגיאה במחיקה");
      return;
    }
    setDeleteConfirm(null);
    load();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">סוגי כרטיסים</h1>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + כרטיס חדש
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
            <tr>
              <th className="text-right px-4 py-3 font-medium">שם (עברית)</th>
              <th className="text-right px-4 py-3 font-medium">פירוט</th>
              <th className="text-center px-4 py-3 font-medium">הנחה</th>
              <th className="text-center px-4 py-3 font-medium">טווח סכומים</th>
              <th className="text-center px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">טוען...</td></tr>
            )}
            {!loading && cardTypes.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">אין כרטיסים. הוסף כרטיס ראשון.</td></tr>
            )}
            {cardTypes.map((ct) => (
              <tr key={ct.id} className={`border-t border-slate-100 hover:bg-slate-50 ${!ct.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{ct.nameHe}</div>
                  <div className="text-xs text-slate-400">{ct.name}</div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{ct.description ?? "–"}</td>
                <td className="px-4 py-3 text-center font-medium text-blue-700">{parseFloat(ct.discountPct)}%</td>
                <td className="px-4 py-3 text-center text-slate-600">
                  ₪{parseFloat(ct.minLoadAmount).toLocaleString()} – ₪{parseFloat(ct.maxLoadAmount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggleActive(ct)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      ct.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {ct.isActive ? "פעיל" : "לא פעיל"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 justify-end">
                    <button onClick={() => openEdit(ct)} className="text-blue-600 text-xs hover:underline">עריכה</button>
                    <button
                      onClick={() => { setDeleteConfirm(ct.id); setDeleteError(""); }}
                      className="text-red-500 text-xs hover:underline"
                    >
                      מחיקה
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">{cardTypes.length} כרטיסים</p>

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">מחיקת כרטיס</h2>
            <p className="text-slate-600 text-sm mb-4">האם אתה בטוח? פעולה זו לא ניתנת לביטול.</p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">{deleteError}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                מחק
              </button>
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(""); }}
                className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-slate-800">{modal.editing ? "עריכת כרטיס" : "כרטיס חדש"}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">שם (עברית)</label>
                  <input type="text" required value={form.nameHe}
                    onChange={(e) => setForm({ ...form, nameHe: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ישרכארט GiftCard" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">שם (אנגלית)</label>
                  <input type="text" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="ltr" placeholder="Isracard GiftCard" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">פירוט / תיאור</label>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="כרטיס כ-30 רשתות מזון ועד הרבה חנויות"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">אחוז הנחה (%)</label>
                <input type="number" required min={0} max={100} step={0.1} value={form.discountPct}
                  onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2.5" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">טווח סכומים (₪)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">מינימום</label>
                    <input type="number" required min={1} step={1} value={form.minLoadAmount}
                      onChange={(e) => setForm({ ...form, minLoadAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100" />
                  </div>
                  <span className="text-slate-400 mt-5">–</span>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">מקסימום</label>
                    <input type="number" required min={1} step={1} value={form.maxLoadAmount}
                      onChange={(e) => setForm({ ...form, maxLoadAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">סדר תצוגה</label>
                <input type="number" value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0" />
              </div>

              {modal.editing && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded" />
                  <label htmlFor="isActive" className="text-sm text-slate-700">פעיל</label>
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
