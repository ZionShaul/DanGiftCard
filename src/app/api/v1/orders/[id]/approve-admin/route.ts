import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendOrderApprovedEmail } from "@/lib/email/templates";
import { z } from "zod";

const schema = z.object({ comment: z.string().max(1000).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { fullName: true, email: true } },
      signatory: { select: { fullName: true, email: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  if (order.status !== "pending_admin") {
    return NextResponse.json({ error: "הזמנה אינה ממתינה לאישור מנהל" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "approved",
      adminReviewedAt: new Date(),
      adminReviewedById: session.user.id,
      adminComment: parsed.success ? (parsed.data.comment ?? null) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "order",
      entityId: id,
      action: "approved_by_admin",
      actorId: session.user.id,
      actorEmail: session.user.email,
      newValue: { status: "approved" },
    },
  });

  await sendOrderApprovedEmail({
    orderNumber: order.orderNumber,
    organization: order.organization,
    orderWindow: order.orderWindow,
    totalCards: order.totalCards,
    totalFaceValue: Number(order.totalFaceValue),
    totalPayable: Number(order.totalPayable),
    requester: order.requester,
    signatory: order.signatory,
  });

  return NextResponse.json(updated);
}
