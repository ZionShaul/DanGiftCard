import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendAdminRejectedEmail } from "@/lib/email/templates";
import { z } from "zod";

const schema = z.object({ comment: z.string().min(1).max(1000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "יש לציין סיבת דחייה" }, { status: 400 });
  }

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
  if (order.status !== "pending_admin") {
    return NextResponse.json({ error: "הזמנה אינה ממתינה לאישור מנהל" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "rejected_signatory",
      adminReviewedAt: new Date(),
      adminReviewedById: session.user.id,
      adminComment: parsed.data.comment,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "order",
      entityId: id,
      action: "rejected_by_admin",
      actorId: session.user.id,
      actorEmail: session.user.email,
      newValue: { status: "rejected_signatory", comment: parsed.data.comment },
    },
  });

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

  await sendAdminRejectedEmail(emailOrder, parsed.data.comment);

  return NextResponse.json(updated);
}
