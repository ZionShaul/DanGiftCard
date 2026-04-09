"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderStatus } from "@prisma/client";

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "טיוטה",
  pending_signatory: "ממתין לאישור מורשה חתימה",
  rejected_signatory: "נדחה ע״י מורשה חתימה",
  pending_admin: "ממתין לאישור מנהל",
  approved: "מאושר",
  cancelled: "בוטל",
};

const STATUS_SHORT: Record<OrderStatus, string> = {
  draft: "טיוטה",
  pending_signatory: "ממתין לחתם",
  rejected_signatory: "נדחה ע״י חתם",
  pending_admin: "ממתין למנהל",
  approved: "מאושר",
  cancelled: "בוטל",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_signatory: "bg-yellow-100 text-yellow-800",
  rejected_signatory: "bg-red-100 text-red-800",
  pending_admin: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export type SerializedOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalPayable: number;
  totalCards: number;
  updatedAt: string;
  organization: { name: string };
  orderWindow: { name: string; deliveryDate: string };
  requester: { fullName: string };
};

interface Props {
  orders: SerializedOrder[];
  userRole: string;
}

const ALL_STATUSES = Object.keys(STATUS_LABELS) as OrderStatus[];

export default function DashboardOrdersTable({ orders, userRole }: Props) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [windowFilter, setWindowFilter] = useState("");

  // Build window options (unique values)
  const windowOptions = Array.from(new Set(orders.map((o) => o.orderWindow.name))).sort();

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (windowFilter && o.orderWindow.name !== windowFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !o.orderNumber.toLowerCase().includes(q) &&
        !o.organization.name.toLowerCase().includes(q) &&
        !o.requester.fullName.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("he-IL");
  }

  function formatCurrency(n: number) {
    return `₪${n.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="font-semibold text-slate-700">הזמנות אחרונות</h2>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="חיפוש מספר / ארגון / מגיש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:ring-2 focus:ring-blue-400"
            dir="rtl"
          />
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "")}
            className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">כל הסטטוסים</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_SHORT[s]}</option>
            ))}
          </select>
          {/* Window filter (admin only or when multiple windows) */}
          {windowOptions.length > 1 && (
            <select
              value={windowFilter}
              onChange={(e) => setWindowFilter(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">כל החלונות</option>
              {windowOptions.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          )}
          {/* Clear filters */}
          {(statusFilter || search || windowFilter) && (
            <button
              onClick={() => { setStatusFilter(""); setSearch(""); setWindowFilter(""); }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              נקה
            </button>
          )}
          <span className="text-xs text-slate-400">{filtered.length}/{orders.length}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-right px-4 py-3 font-medium">מספר הזמנה</th>
              <th className="text-right px-4 py-3 font-medium">ארגון</th>
              {userRole === "admin" && (
                <th className="text-right px-4 py-3 font-medium">מגיש</th>
              )}
              <th className="text-right px-4 py-3 font-medium">חלון</th>
              <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              <th className="text-right px-4 py-3 font-medium">לתשלום</th>
              <th className="text-right px-4 py-3 font-medium">עדכון</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{order.organization.name}</td>
                {userRole === "admin" && (
                  <td className="px-4 py-3 text-slate-500 text-xs">{order.requester.fullName}</td>
                )}
                <td className="px-4 py-3 text-slate-600">{order.orderWindow.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_SHORT[order.status]}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{formatCurrency(order.totalPayable)}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(order.updatedAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={userRole === "admin" ? 7 : 6} className="px-4 py-8 text-center text-slate-400">
                  {orders.length === 0 ? "אין הזמנות להצגה" : "אין תוצאות לפי הסינון"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
