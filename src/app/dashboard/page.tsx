import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import DashboardOrdersTable, { SerializedOrder } from "./orders-table";
import { OrderStatus } from "@prisma/client";

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
      take: 100,
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
      take: 100,
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
      take: 100,
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

  // Serialize for client component (Decimal → number, Date → string)
  const serializedOrders: SerializedOrder[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status as OrderStatus,
    totalPayable: Number(o.totalPayable),
    totalCards: o.totalCards,
    updatedAt: o.updatedAt.toISOString(),
    organization: { name: o.organization.name },
    orderWindow: {
      name: o.orderWindow.name,
      deliveryDate: o.orderWindow.deliveryDate.toISOString(),
    },
    requester: { fullName: o.requester.fullName },
  }));

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

      {/* Filterable Orders Table */}
      <DashboardOrdersTable orders={serializedOrders} userRole={user.role} />

      <div className="flex justify-end mt-2">
        <Link href="/orders" className="text-blue-600 text-sm hover:underline">
          הצג הכל →
        </Link>
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
