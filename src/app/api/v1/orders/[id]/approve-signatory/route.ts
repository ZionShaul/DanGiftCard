import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendAdminPendingEmail } from "@/lib/email/templates";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "signatory") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { fullName: true, email: true } },
      signatory: { select: { fullName: true, email: true } },
      items: { include: { cardType: { select: { nameHe: true } } } },
    },
  });

  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  if (order.signatoryId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (order.status !== "pending_signatory") {
    return NextResponse.json({ error: "הזמנה אינה ממתינה לאישור" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "pending_admin", signatoryReviewedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "order",
      entityId: id,
      action: "approved_by_signatory",
      actorId: session.user.id,
      actorEmail: session.user.email,
      newValue: { status: "pending_admin" },
    },
  });

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: "admin", isActive: true } });
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const adminUrl = `${baseUrl}/admin/orders/${id}`;

  const emailOrder = {
    orderNumber: order.orderNumber,
    organization: order.organization,
    orderWindow: order.orderWindow,
    totalCards: order.totalCards,
    totalFaceValue: Number(order.totalFaceValue),
    totalPayable: Number(order.totalPayable),
    requester: order.requester,
    signatory: order.signatory,
    items: order.items.map((i) => ({
      cardTypeName: i.cardType.nameHe,
      quantity: i.quantity,
      loadAmount: Number(i.loadAmount),
      discountPct: Number(i.discountPct),
      payableTotal: Number(i.payableTotal),
    })),
  };

  await Promise.all(
    admins.map((admin) => sendAdminPendingEmail(emailOrder, admin.email, adminUrl))
  );

  return NextResponse.json(updated);
}
