import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/orders/status-machine";
import { OrderStatus } from "@prisma/client";
import Link from "next/link";
import OrdersExportButton from "./orders-export-button";

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_signatory: "bg-yellow-100 text-yellow-800",
  rejected_signatory: "bg-red-100 text-red-800",
  pending_admin: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default async function OrdersPage() {
  const user = await requireAuth();

  const where =
    user.role === "requester"
      ? { requesterId: user.id }
      : user.role === "signatory"
      ? { signatoryId: user.id }
      : {};

  const orders = await prisma.order.findMany({
    where,
    include: {
      organization: { select: { name: true } },
      orderWindow: { select: { name: true, deliveryDate: true } },
      requester: { select: { fullName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const pendingSignatory = user.role === "signatory"
    ? orders.filter((o) => o.status === "pending_signatory" && o.signatoryId === user.id)
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {user.role === "signatory" ? "הזמנות הארגון" : "ההזמנות שלי"}
        </h1>
        <div className="flex items-center gap-3">
          <OrdersExportButton />
          {user.role === "requester" && (
            <Link href="/orders/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + הזמנה חדשה
            </Link>
          )}
        </div>
      </div>

      {/* Pending signatory banner */}
      {pendingSignatory.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="font-semibold text-yellow-800">
            {pendingSignatory.length} הזמנות ממתינות לאישורך
          </p>
          <p className="text-yellow-700 text-sm mt-0.5">לחץ על מספר ההזמנה לפרטים ואישור</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="text-right px-4 py-3 font-medium">מספר הזמנה</th>
                {user.role === "signatory" && (
                  <th className="text-right px-4 py-3 font-medium">מגיש</th>
                )}
                <th className="text-right px-4 py-3 font-medium">חלון</th>
                <th className="text-center px-4 py-3 font-medium">סטטוס</th>
                <th className="text-center px-4 py-3 font-medium">כרטיסים</th>
                <th className="text-right px-4 py-3 font-medium">לתשלום</th>
                <th className="text-right px-4 py-3 font-medium">עדכון</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}
                  className={`border-t border-slate-100 hover:bg-slate-50 ${order.status === "pending_signatory" && user.role === "signatory" ? "bg-yellow-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {order.orderNumber}
                    </Link>
                  </td>
                  {user.role === "signatory" && (
                    <td className="px-4 py-3 text-slate-700">{order.requester.fullName}</td>
                  )}
                  <td className="px-4 py-3 text-slate-600">{order.orderWindow.name}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{order.totalCards}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(Number(order.totalPayable))}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(order.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a href={`/api/v1/orders/${order.id}/pdf`} target="_blank" rel="noopener noreferrer"
                        className="text-slate-500 text-xs hover:text-slate-700 hover:underline">
                        PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={user.role === "signatory" ? 8 : 7} className="px-4 py-8 text-center text-slate-400">
                    אין הזמנות להצגה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-2">{orders.length} הזמנות</p>
    </div>
  );
}
