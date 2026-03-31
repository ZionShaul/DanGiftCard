"use client";

import { useState, useEffect } from "react";

interface Branding {
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  welcomeText?: string;
}

export default function SettingsPage() {
  const [branding, setBranding] = useState<Branding>({
    primaryColor: "#1a73e8",
    secondaryColor: "#fbbc04",
    welcomeText: "ברוכים הבאים למערכת הזמנות תווי השי של מישקי דן",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/v1/settings/branding")
      .then((r) => r.json())
      .then(setBranding);
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/v1/settings/branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branding),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">הגדרות מיתוג</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Welcome text */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            טקסט ברוכים הבאים (עמוד כניסה)
          </label>
          <textarea
            value={branding.welcomeText ?? ""}
            onChange={(e) => setBranding({ ...branding, welcomeText: e.target.value })}
            rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              צבע ראשי
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.primaryColor ?? "#1a73e8"}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-slate-300"
              />
              <input
                type="text"
                value={branding.primaryColor ?? "#1a73e8"}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              צבע משני
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={branding.secondaryColor ?? "#fbbc04"}
                onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer border border-slate-300"
              />
              <input
                type="text"
                value={branding.secondaryColor ?? "#fbbc04"}
                onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">תצוגה מקדימה</label>
          <div
            className="rounded-lg p-4 text-white text-sm font-medium"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {branding.welcomeText}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? "שומר..." : "שמור הגדרות"}
          </button>
          {saved && <span className="text-green-600 text-sm">נשמר!</span>}
        </div>
      </div>

      {/* Payment details info box */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mt-6">
        <h2 className="font-semibold text-slate-700 mb-3">פרטי תשלום (נשלחים במיילים)</h2>
        <div className="text-sm text-slate-600 space-y-1">
          <p><strong>בנק:</strong> הפועלים (12)</p>
          <p><strong>סניף:</strong> 412</p>
          <p><strong>חשבון:</strong> 697890</p>
          <p><strong>שם:</strong> מישקי הדרום אשראי ורכישות</p>
        </div>
        <p className="text-xs text-slate-400 mt-2">לעדכון פרטי בנק, צור קשר עם הפיתוח.</p>
      </div>
    </div>
  );
}
