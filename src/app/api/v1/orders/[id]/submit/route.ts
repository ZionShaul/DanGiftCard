import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createApprovalToken } from "@/lib/auth/approval-token";
import { sendOrderSubmittedEmail, sendSignatoryRequestEmail } from "@/lib/email/templates";
import { z } from "zod";

const schema = z.object({
  signatoryId: z.string().min(1),
  termsAccepted: z.literal(true),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "requester") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { fullName: true, email: true } },
      items: true,
    },
  });

  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  if (order.requesterId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (order.status !== "draft" && order.status !== "rejected_signatory") {
    return NextResponse.json({ error: "לא ניתן להגיש הזמנה בסטטוס זה" }, { status: 400 });
  }
  if (order.items.length === 0) {
    return NextResponse.json({ error: "יש להוסיף לפחות פריט אחד להזמנה" }, { status: 400 });
  }

  const minOrderTotal = Number(order.orderWindow.minOrderTotal);
  if (Number(order.totalPayable) < minOrderTotal) {
    return NextResponse.json(
      { error: `סכום ההזמנה המינימלי הוא ₪${minOrderTotal}` },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Validate signatory belongs to same org
  const signatory = await prisma.user.findUnique({
    where: { id: parsed.data.signatoryId, role: "signatory", isActive: true },
  });
  if (!signatory || signatory.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "מורשה חתימה לא נמצא בארגון זה" }, { status: 400 });
  }

  // Update order
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "pending_signatory",
      signatoryId: signatory.id,
      termsAcceptedAt: new Date(),
    },
  });

  // Write audit log
  await prisma.auditLog.create({
    data: {
      entityType: "order",
      entityId: id,
      action: "submitted",
      actorId: session.user.id,
      actorEmail: session.user.email,
      newValue: { status: "pending_signatory" },
    },
  });

  // Send emails
  const approvalToken = await createApprovalToken(id, signatory.id);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const approvalUrl = `${baseUrl}/approval/${approvalToken}`;
  const editUrl = `${baseUrl}/orders/${id}`;

  const emailOrder = {
    orderNumber: order.orderNumber,
    organization: order.organization,
    orderWindow: order.orderWindow,
    totalCards: order.totalCards,
    totalFaceValue: Number(order.totalFaceValue),
    totalPayable: Number(order.totalPayable),
    requester: order.requester,
    signatory: { fullName: signatory.fullName, email: signatory.email },
  };

  const pdfLink = `${baseUrl}/api/approval/${approvalToken}/pdf`;
  const orderLink = `${baseUrl}/orders/${id}`;
  await Promise.all([
    sendOrderSubmittedEmail(emailOrder, orderLink),
    sendSignatoryRequestEmail(emailOrder, approvalUrl, pdfLink),
  ]);

  void editUrl; // used for rejection later

  return NextResponse.json(updated);
}
