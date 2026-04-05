"use client";

import { useState } from "react";

export default function OrdersExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const res = await fetch("/api/v1/orders/export/excel");
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setLoading(false);
  }

  return (
    <button onClick={handleExport} disabled={loading}
      className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-60 transition-colors">
      {loading ? "מייצא..." : "ייצוא Excel"}
    </button>
  );
}
