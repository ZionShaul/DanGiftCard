import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/orders/status-machine";
import Link from "next/link";
import { OrderStatus } from "@prisma/client";

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_signatory: "bg-yellow-100 text-yellow-800",
  rejected_signatory: "bg-red-100 text-red-800",
  pending_admin: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default async function DashboardPage() {
  const user = await requireAuth();

  let orders;
  if (user.role === "admin") {
    orders = await prisma.order.findMany({
      include: {
        organization: { select: { name: true } },
        orderWindow: { select: { name: true, deliveryDate: true } },
        requester: { select: { fullName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
  } else if (user.role === "requester") {
    orders = await prisma.order.findMany({
      where: { requesterId: user.id },
      include: {
        organization: { select: { name: true } },
        orderWindow: { select: { name: true, deliveryDate: true } },
        requester: { select: { fullName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
  } else {
    // signatory
    orders = await prisma.order.findMany({
      where: { organizationId: user.organizationId! },
      include: {
        organization: { select: { name: true } },
        orderWindow: { select: { name: true, deliveryDate: true } },
        requester: { select: { fullName: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
  }

  const pendingCount = orders.filter(
    (o) => o.status === "pending_signatory" || o.status === "pending_admin"
  ).length;

  const activeWindow = await prisma.orderWindow.findFirst({
    where: {
      isActive: true,
      orderOpenAt: { lte: new Date() },
      orderCloseAt: { gte: new Date() },
    },
    orderBy: { orderCloseAt: "asc" },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">לוח בקרה</h1>

      {/* Active window banner */}
      {activeWindow && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-800">{activeWindow.name} – הזמנות פתוחות</p>
            <p className="text-blue-600 text-sm">
              מועד אחרון: {formatDate(activeWindow.orderCloseAt)} | אספקה: {formatDate(activeWindow.deliveryDate)}
            </p>
          </div>
          {user.role === "requester" && (
            <Link
              href="/orders/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              הגש הזמנה חדשה
            </Link>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="סה״כ הזמנות" value={orders.length} />
        <StatCard label="ממתין לטיפול" value={pendingCount} highlight />
        <StatCard
          label="שווי כולל (₪)"
          value={formatCurrency(orders.reduce((s, o) => s + Number(o.totalPayable), 0))}
        />
        <StatCard
          label="כרטיסים"
          value={orders.reduce((s, o) => s + o.totalCards, 0)}
        />
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">הזמנות אחרונות</h2>
          <Link href="/orders" className="text-blue-600 text-sm hover:underline">
            הצג הכל
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-right px-4 py-3 font-medium">מספר הזמנה</th>
                <th className="text-right px-4 py-3 font-medium">ארגון</th>
                <th className="text-right px-4 py-3 font-medium">חלון</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium">לתשלום</th>
                <th className="text-right px-4 py-3 font-medium">עדכון</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.organization.name}</td>
                  <td className="px-4 py-3 text-slate-600">{order.orderWindow.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(Number(order.totalPayable))}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(order.updatedAt)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    אין הזמנות להצגה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "bg-yellow-50 border-yellow-200" : "bg-white border-slate-200"}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-yellow-700" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}
