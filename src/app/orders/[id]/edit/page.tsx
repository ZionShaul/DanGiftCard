import { requireAuth } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import EditOrderForm from "./edit-order-form";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  if (user.role !== "requester") {
    redirect("/orders");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { id: true, fullName: true } },
      items: {
        include: { cardType: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) notFound();

  if (order.requesterId !== user.id) notFound();

  if (order.status !== "draft" && order.status !== "rejected_signatory" && order.status !== "pending_signatory") {
    redirect(`/orders/${id}`);
  }

  const cardTypes = await prisma.cardType.findMany({
    where: { isActive: true },
    orderBy: { nameHe: "asc" },
  });

  const signatories = await prisma.user.findMany({
    where: {
      role: "signatory",
      isActive: true,
      organizationId: user.organizationId,
    },
    select: { id: true, fullName: true, email: true },
  });

  const initialItems = order.items.map((item) => ({
    cardTypeId: item.cardTypeId,
    quantity: item.quantity,
    loadAmount: Number(item.loadAmount),
  }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <a href={`/orders/${id}`} className="text-slate-400 hover:text-slate-600 text-sm">
          ← חזור להזמנה
        </a>
        <h1 className="text-2xl font-bold text-slate-800 mt-2">עריכת הזמנה</h1>
        <p className="text-slate-500 text-sm mt-0.5 font-mono">{order.orderNumber}</p>
      </div>

      <EditOrderForm
        orderId={id}
        initialItems={initialItems}
        initialSignatoryId={order.signatoryId ?? ""}
        initialNotes={order.notes ?? ""}
        cardTypes={cardTypes.map((ct) => ({
          id: ct.id,
          nameHe: ct.nameHe,
          discountPct: Number(ct.discountPct),
          minLoadAmount: Number(ct.minLoadAmount),
          maxLoadAmount: Number(ct.maxLoadAmount),
        }))}
        signatories={signatories}
        minOrderTotal={Number(order.orderWindow.minOrderTotal)}
      />
    </div>
  );
}
