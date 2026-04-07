"use client";

import { useState, useEffect } from "react";

interface Settings {
  welcomeText?: string;
  paymentDetails?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface OrderWindow {
  id: string;
  name: string;
  holiday: string;
  orderOpenAt: string;
  orderCloseAt: string;
  deliveryDate: string;
  minOrderTotal: string;
  isActive: boolean;
}

const HOLIDAY_LABELS: Record<string, string> = {
  rosh_hashana: "ראש השנה",
  passover: "פסח",
  other: "אחר",
};

const emptyWindow = {
  name: "",
  holiday: "other",
  orderOpenAt: "",
  orderCloseAt: "",
  deliveryDate: "",
  minOrderTotal: "2000",
};

function toLocalDatetimeValue(iso: string) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function toLocalDateValue(iso: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    welcomeText: "ברוכים הבאים למערכת הזמנות תווי השי של משקי דן",
    paymentDetails: "בנק: הפועלים (12)\nסניף: 412\nחשבון: 697890\nשם: משקי הדרום אשראי ורכישות",
    primaryColor: "#2563eb",
    secondaryColor: "#fbbc04",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [windows, setWindows] = useState<OrderWindow[]>([]);
  const [windowModal, setWindowModal] = useState<{ open: boolean; editing: OrderWindow | null }>({ open: false, editing: null });
  const [windowForm, setWindowForm] = useState(emptyWindow);
  const [windowSaving, setWindowSaving] = useState(false);
  const [windowError, setWindowError] = useState("");

  useEffect(() => {
    fetch("/api/v1/settings/branding")
      .then((r) => r.json())
      .then((data) => setSettings({
        welcomeText: data.welcomeText,
        paymentDetails: data.paymentDetails,
        primaryColor: data.primaryColor ?? "#2563eb",
        secondaryColor: data.secondaryColor ?? "#fbbc04",
      }));
    loadWindows();
  }, []);

  async function loadWindows() {
    const res = await fetch("/api/v1/order-windows");
    const data = await res.json();
    setWindows(Array.isArray(data) ? data : []);
  }

  async function handleSaveSettings() {
    setSaving(true);
    await fetch("/api/v1/settings/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function openAddWindow() {
    setWindowForm(emptyWindow);
    setWindowError("");
    setWindowModal({ open: true, editing: null });
  }

  function openEditWindow(w: OrderWindow) {
    setWindowForm({
      name: w.name,
      holiday: w.holiday,
      orderOpenAt: toLocalDatetimeValue(w.orderOpenAt),
      orderCloseAt: toLocalDatetimeValue(w.orderCloseAt),
      deliveryDate: toLocalDateValue(w.deliveryDate),
      minOrderTotal: w.minOrderTotal,
    });
    setWindowError("");
    setWindowModal({ open: true, editing: w });
  }

  async function handleSaveWindow(e: React.FormEvent) {
    e.preventDefault();
    setWindowError("");
    setWindowSaving(true);

    const body = {
      name: windowForm.name.trim(),
      holiday: windowForm.holiday,
      orderOpenAt: new Date(windowForm.orderOpenAt).toISOString(),
      orderCloseAt: new Date(windowForm.orderCloseAt).toISOString(),
      deliveryDate: new Date(windowForm.deliveryDate).toISOString(),
      minOrderTotal: parseFloat(String(windowForm.minOrderTotal)),
    };

    const url = windowModal.editing
      ? `/api/v1/order-windows/${windowModal.editing.id}`
      : "/api/v1/order-windows";
    const method = windowModal.editing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setWindowSaving(false);

    if (!res.ok) { setWindowError("שגיאה בשמירה. אנא נסה שוב."); return; }
    setWindowModal({ open: false, editing: null });
    loadWindows();
  }

  async function handleToggleWindow(w: OrderWindow) {
    await fetch(`/api/v1/order-windows/${w.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: w.name, holiday: w.holiday,
        orderOpenAt: w.orderOpenAt, orderCloseAt: w.orderCloseAt,
        deliveryDate: w.deliveryDate, minOrderTotal: parseFloat(w.minOrderTotal),
        isActive: !w.isActive,
      }),
    });
    loadWindows();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">הגדרות מערכת</h1>

      {/* ── General settings ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-700 text-lg">הגדרות כלליות</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">טקסט ברוכים הבאים</label>
          <textarea
            value={settings.welcomeText ?? ""}
            onChange={(e) => setSettings({ ...settings, welcomeText: e.target.value })}
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            פרטי תשלום (מופיעים במיילים ובמסמכים)
          </label>
          <textarea
            value={settings.paymentDetails ?? ""}
            onChange={(e) => setSettings({ ...settings, paymentDetails: e.target.value })}
            rows={5}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={"בנק: הפועלים (12)\nסניף: 412\nחשבון: 697890\nשם: משקי הדרום אשראי ורכישות"}
            dir="rtl"
          />
          <p className="text-xs text-slate-400 mt-1">ניתן לכתוב מספר שורות — יופיע כפי שנכתב</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">צבע ראשי</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.primaryColor ?? "#2563eb"}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-slate-300" />
              <input type="text" value={settings.primaryColor ?? "#2563eb"}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">צבע משני</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.secondaryColor ?? "#fbbc04"}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-slate-300" />
              <input type="text" value={settings.secondaryColor ?? "#fbbc04"}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">הצבעים נשמרים ומשמשים בדוחות ובמיילים</p>

        <div className="flex items-center gap-3">
          <button onClick={handleSaveSettings} disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {saving ? "שומר..." : "שמור הגדרות"}
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">נשמר ✓</span>}
        </div>
      </div>

      {/* ── Order Windows ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700 text-lg">חלונות הזמנות</h2>
          <button onClick={openAddWindow}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + חלון חדש
          </button>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
            <tr>
              <th className="text-right px-4 py-3 font-medium">שם</th>
              <th className="text-center px-4 py-3 font-medium">חג</th>
              <th className="text-center px-4 py-3 font-medium">פתיחה – סגירה</th>
              <th className="text-center px-4 py-3 font-medium">אספקה</th>
              <th className="text-center px-4 py-3 font-medium">מינ׳ הזמנה</th>
              <th className="text-center px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {windows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">אין חלונות הזמנות</td></tr>
            )}
            {windows.map((w) => (
              <tr key={w.id} className={`border-t border-slate-100 hover:bg-slate-50 ${!w.isActive ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-slate-800">{w.name}</td>
                <td className="px-4 py-3 text-center text-slate-500">{HOLIDAY_LABELS[w.holiday] ?? w.holiday}</td>
                <td className="px-4 py-3 text-center text-slate-600 text-xs">
                  {new Date(w.orderOpenAt).toLocaleDateString("he-IL")} –{" "}
                  {new Date(w.orderCloseAt).toLocaleDateString("he-IL")}
                </td>
                <td className="px-4 py-3 text-center text-slate-600 text-xs">
                  {new Date(w.deliveryDate).toLocaleDateString("he-IL")}
                </td>
                <td className="px-4 py-3 text-center">₪{parseFloat(w.minOrderTotal).toLocaleString()}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => handleToggleWindow(w)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      w.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {w.isActive ? "פעיל" : "לא פעיל"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEditWindow(w)} className="text-blue-600 text-xs hover:underline">עריכה</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order window modal */}
      {windowModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-slate-800">
                {windowModal.editing ? "עריכת חלון" : "חלון הזמנות חדש"}
              </h2>
              <button onClick={() => setWindowModal({ open: false, editing: null })}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSaveWindow} className="px-6 py-5 space-y-4">
              {windowError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{windowError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם החלון</label>
                <input type="text" required value={windowForm.name}
                  onChange={(e) => setWindowForm({ ...windowForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ראש השנה תשפ״ה" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">חג</label>
                <select value={windowForm.holiday}
                  onChange={(e) => setWindowForm({ ...windowForm, holiday: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="rosh_hashana">ראש השנה</option>
                  <option value="passover">פסח</option>
                  <option value="other">אחר</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">פתיחת הזמנות</label>
                  <input type="datetime-local" required value={windowForm.orderOpenAt}
                    onChange={(e) => setWindowForm({ ...windowForm, orderOpenAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סגירת הזמנות</label>
                  <input type="datetime-local" required value={windowForm.orderCloseAt}
                    onChange={(e) => setWindowForm({ ...windowForm, orderCloseAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תאריך אספקה</label>
                <input type="date" required value={windowForm.deliveryDate}
                  onChange={(e) => setWindowForm({ ...windowForm, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">מינימום הזמנה (₪)</label>
                <input type="number" required min={0} step={1} value={windowForm.minOrderTotal}
                  onChange={(e) => setWindowForm({ ...windowForm, minOrderTotal: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2000" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={windowSaving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {windowSaving ? "שומר..." : "שמור"}
                </button>
                <button type="button" onClick={() => setWindowModal({ open: false, editing: null })}
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
