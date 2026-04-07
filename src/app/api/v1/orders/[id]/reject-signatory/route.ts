import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSignatoryRejectedEmail } from "@/lib/email/templates";
import { z } from "zod";

const schema = z.object({ comment: z.string().min(1).max(1000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "signatory") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
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
  if (order.signatoryId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (order.status !== "pending_signatory") {
    return NextResponse.json({ error: "הזמנה אינה ממתינה לאישור" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "rejected_signatory",
      signatoryReviewedAt: new Date(),
      signatoryComment: parsed.data.comment,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "order",
      entityId: id,
      action: "rejected_by_signatory",
      actorId: session.user.id,
      actorEmail: session.user.email,
      newValue: { status: "rejected_signatory", comment: parsed.data.comment },
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const editUrl = `${baseUrl}/orders/${id}`;

  await sendSignatoryRejectedEmail(
    {
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
    },
    parsed.data.comment,
    editUrl
  );

  return NextResponse.json(updated);
}
