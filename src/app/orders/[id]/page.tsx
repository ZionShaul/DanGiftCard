import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/orders/status-machine";
import { OrderStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import SignatoryActions from "./signatory-actions";
import DeleteOrderButton from "./delete-order-button";

const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_signatory: "bg-yellow-100 text-yellow-800",
  rejected_signatory: "bg-red-100 text-red-800",
  pending_admin: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const { submitted } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { id: true, fullName: true, email: true } },
      signatory: { select: { id: true, fullName: true, email: true } },
      items: {
        include: { cardType: { select: { nameHe: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  // Note: signatoryComment and signatoryId are on the order model directly

  if (!order) notFound();

  // Access control
  if (
    (user.role === "requester" && order.requesterId !== user.id) ||
    (user.role === "signatory" && order.organizationId !== user.organizationId)
  ) {
    notFound();
  }

  const totalFaceValue = order.items.reduce(
    (s, i) => s + Number(i.faceValueTotal),
    0
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/orders" className="text-slate-400 hover:text-slate-600 text-sm">
              ← חזור להזמנות
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1 font-mono">
            {order.orderNumber}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            נוצר: {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[order.status]}`}>
            {STATUS_LABELS[order.status]}
          </span>
          <a
            href={`/api/v1/orders/${order.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            הורד PDF
          </a>
        </div>
      </div>

      {/* Signatory approve/reject actions */}
      {user.role === "signatory" &&
        order.status === "pending_signatory" &&
        order.signatoryId === user.id && (
          <SignatoryActions orderId={order.id} />
        )}

      {/* Rejection comment banner */}
      {order.status === "rejected_signatory" && order.signatoryComment && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="font-semibold text-red-800">נדחתה על ידי מורשה החתימה</p>
          <p className="text-red-700 text-sm mt-1">{order.signatoryComment}</p>
        </div>
      )}

      {/* Submitted success banner */}
      {submitted === "1" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <p className="font-semibold text-green-800">ההזמנה הוגשה בהצלחה!</p>
          <p className="text-green-700 text-sm mt-0.5">
            נשלחה הודעה למורשה החתימה {order.signatory?.fullName} לאישור.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Order info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">
            פרטי הזמנה
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">ארגון</dt>
              <dd className="text-slate-800 font-medium">{order.organization.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">חלון הזמנות</dt>
              <dd className="text-slate-800">{order.orderWindow.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">מועד אספקה</dt>
              <dd className="text-slate-800">{formatDate(order.orderWindow.deliveryDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">מגיש</dt>
              <dd className="text-slate-800">{order.requester.fullName}</dd>
            </div>
            {order.signatory && (
              <div className="flex justify-between">
                <dt className="text-slate-500">מורשה חתימה</dt>
                <dd className="text-slate-800">{order.signatory.fullName}</dd>
              </div>
            )}
            {order.notes && (
              <div className="flex justify-between">
                <dt className="text-slate-500">הערות</dt>
                <dd className="text-slate-800 text-right max-w-48">{order.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Financial summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">
            סיכום כספי
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">סה״כ כרטיסים</dt>
              <dd className="text-slate-800 font-medium">{order.totalCards}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">שווי פנים (ברוטו)</dt>
              <dd className="text-slate-800">{formatCurrency(totalFaceValue)}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <dt className="font-semibold text-slate-700">לתשלום (נטו)</dt>
              <dd className="font-bold text-blue-700 text-base">
                {formatCurrency(Number(order.totalPayable))}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">פירוט הפריטים</h2>
        </div>
        {order.items.length === 0 ? (
          <p className="px-4 py-6 text-slate-400 text-sm text-center">
            אין פריטים בהזמנה זו
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-right px-4 py-3 font-medium">סוג כרטיס</th>
                  <th className="text-center px-4 py-3 font-medium">כמות</th>
                  <th className="text-center px-4 py-3 font-medium">טעינה לכרטיס</th>
                  <th className="text-center px-4 py-3 font-medium">הנחה</th>
                  <th className="text-center px-4 py-3 font-medium">שווי פנים</th>
                  <th className="text-left px-4 py-3 font-medium">לתשלום</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800">{item.cardType.nameHe}</td>
                    <td className="px-4 py-3 text-center text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-slate-700">
                      {formatCurrency(Number(item.loadAmount))}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {Number(item.discountPct)}%
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {formatCurrency(Number(item.faceValueTotal))}
                    </td>
                    <td className="px-4 py-3 text-left font-medium text-slate-800">
                      {formatCurrency(Number(item.payableTotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                  <td className="px-4 py-3">סה״כ</td>
                  <td className="px-4 py-3 text-center">{order.totalCards}</td>
                  <td colSpan={3} />
                  <td className="px-4 py-3 text-left text-blue-700">
                    {formatCurrency(Number(order.totalPayable))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Link
          href="/orders"
          className="text-slate-500 text-sm hover:underline"
        >
          חזור לרשימת ההזמנות
        </Link>
        {(order.status === "draft" || order.status === "rejected_signatory" || order.status === "pending_signatory") &&
          user.role === "requester" &&
          order.requesterId === user.id && (
            <div className="flex items-center gap-3">
              <Link
                href={`/orders/${order.id}/edit`}
                className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                ערוך הזמנה
              </Link>
              <DeleteOrderButton orderId={order.id} />
            </div>
          )}
      </div>
    </div>
  );
}
