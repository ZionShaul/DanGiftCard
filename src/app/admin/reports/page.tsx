"use client";

import { useState, useEffect } from "react";

interface OrderWindow {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const [windows, setWindows] = useState<OrderWindow[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    organizationId: "",
    orderWindowId: "",
  });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/order-windows").then((r) => r.json()).then(setWindows);
  }, []);

  async function downloadExcel() {
    setDownloading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.organizationId) params.set("organizationId", filters.organizationId);
    if (filters.orderWindowId) params.set("orderWindowId", filters.orderWindowId);

    const res = await fetch(`/api/v1/reports/orders/excel?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">דוחות וייצוא</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">ייצוא הזמנות ל-Excel</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm text-slate-600 mb-1">סטטוס</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">כל הסטטוסים</option>
              <option value="draft">טיוטה</option>
              <option value="pending_signatory">ממתין לחתם</option>
              <option value="rejected_signatory">נדחה ע&quot;י חתם</option>
              <option value="pending_admin">ממתין למנהל</option>
              <option value="approved">מאושר</option>
              <option value="cancelled">בוטל</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">חלון הזמנות</label>
            <select
              value={filters.orderWindowId}
              onChange={(e) => setFilters({ ...filters, orderWindowId: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">כל החלונות</option>
              {windows.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={downloadExcel}
              disabled={downloading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {downloading ? "מייצא..." : "הורד Excel"}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          הייצוא כולל: מספר הזמנה, ארגון, חלון, סטטוס, מגיש, חתם, כמות כרטיסים, סכומים, תאריכים.
        </p>
      </div>
    </div>
  );
}
