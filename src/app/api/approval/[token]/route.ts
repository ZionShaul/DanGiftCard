import { NextRequest, NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/auth/approval-token";
import { prisma } from "@/lib/db";
import { sendAdminPendingEmail, sendSignatoryRejectedEmail } from "@/lib/email/templates";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comment: z.string().max(1000).optional(),
});

// GET: validate token and return order summary
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await verifyApprovalToken(token);
  if (!payload) {
    return NextResponse.json({ error: "הקישור אינו תקף או שפג תוקפו" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { fullName: true, email: true } },
      items: { include: { cardType: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  if (order.signatoryId !== payload.signatoryId) {
    return NextResponse.json({ error: "אינך מורשה לאשר הזמנה זו" }, { status: 401 });
  }
  if (order.status !== "pending_signatory") {
    return NextResponse.json({ error: "הזמנה זו כבר טופלה", status: order.status }, { status: 409 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      organization: order.organization.name,
      orderWindow: order.orderWindow.name,
      deliveryDate: order.orderWindow.deliveryDate,
      requester: order.requester.fullName,
      totalCards: order.totalCards,
      totalFaceValue: Number(order.totalFaceValue),
      totalPayable: Number(order.totalPayable),
      items: order.items.map((i) => ({
        cardType: i.cardType.nameHe,
        quantity: i.quantity,
        loadAmount: Number(i.loadAmount),
        discountPct: Number(i.discountPct),
        payableTotal: Number(i.payableTotal),
      })),
    },
  });
}

// POST: approve or reject
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await verifyApprovalToken(token);
  if (!payload) {
    return NextResponse.json({ error: "הקישור אינו תקף או שפג תוקפו" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { fullName: true, email: true } },
      signatory: { select: { fullName: true, email: true } },
      items: { include: { cardType: { select: { nameHe: true } } } },
    },
  });

  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  if (order.signatoryId !== payload.signatoryId) {
    return NextResponse.json({ error: "אינך מורשה" }, { status: 401 });
  }
  if (order.status !== "pending_signatory") {
    return NextResponse.json({ error: "הזמנה זו כבר טופלה" }, { status: 409 });
  }

  const signatory = await prisma.user.findUnique({ where: { id: payload.signatoryId } });

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

  if (parsed.data.action === "approve") {
    await prisma.order.update({
      where: { id: payload.orderId },
      data: { status: "pending_admin", signatoryReviewedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        entityType: "order",
        entityId: payload.orderId,
        action: "approved_by_signatory_via_email",
        actorEmail: signatory?.email,
        newValue: { status: "pending_admin" },
      },
    });

    const admins = await prisma.user.findMany({ where: { role: "admin", isActive: true } });
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await Promise.all(
      admins.map((admin) =>
        sendAdminPendingEmail(emailOrder, admin.email, `${baseUrl}/orders/${order.id}`)
      )
    );

    return NextResponse.json({ success: true, action: "approved" });
  } else {
    if (!parsed.data.comment) {
      return NextResponse.json({ error: "יש לציין סיבת דחייה" }, { status: 400 });
    }
    await prisma.order.update({
      where: { id: payload.orderId },
      data: {
        status: "rejected_signatory",
        signatoryReviewedAt: new Date(),
        signatoryComment: parsed.data.comment,
      },
    });
    await prisma.auditLog.create({
      data: {
        entityType: "order",
        entityId: payload.orderId,
        action: "rejected_by_signatory_via_email",
        actorEmail: signatory?.email,
        newValue: { status: "rejected_signatory", comment: parsed.data.comment },
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await sendSignatoryRejectedEmail(emailOrder, parsed.data.comment, `${baseUrl}/orders/${order.id}`);

    return NextResponse.json({ success: true, action: "rejected" });
  }
}
