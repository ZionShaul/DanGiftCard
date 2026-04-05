import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/utils";
import { createApprovalToken } from "@/lib/auth/approval-token";
import { sendOrderSubmittedEmail, sendSignatoryRequestEmail } from "@/lib/email/templates";
import { calculateItemTotals, calculateOrderTotals } from "@/lib/orders/calculations";
import { z } from "zod";

const itemSchema = z.object({
  cardTypeId: z.string().min(1),
  quantity: z.number().int().min(1),
  loadAmount: z.number().min(1),
});

const schema = z.object({
  orderWindowId: z.string().min(1),
  items: z.array(itemSchema),
  notes: z.string().max(2000).optional(),
  signatoryId: z.string().min(1),
  termsAccepted: z.literal(true),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "requester") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "שגיאת נתונים";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { orderWindowId, items, notes, signatoryId } = parsed.data;

  if (items.length === 0) {
    return NextResponse.json({ error: "יש להוסיף לפחות פריט אחד" }, { status: 400 });
  }

  // Validate window
  const orderWindow = await prisma.orderWindow.findUnique({
    where: { id: orderWindowId, isActive: true },
  });
  if (!orderWindow) {
    return NextResponse.json({ error: "חלון הזמנות לא נמצא" }, { status: 404 });
  }
  const now = new Date();
  if (now < orderWindow.orderOpenAt) {
    return NextResponse.json({ error: "חלון ההזמנות טרם נפתח" }, { status: 400 });
  }
  if (now > orderWindow.orderCloseAt) {
    return NextResponse.json({ error: "המועד האחרון להזמנות עבר" }, { status: 400 });
  }

  // Validate signatory
  const signatory = await prisma.user.findUnique({
    where: { id: signatoryId, role: "signatory", isActive: true },
  });
  if (!signatory || signatory.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "חתם לא נמצא בארגון זה" }, { status: 400 });
  }

  // Validate card types and calculate totals
  const cardTypeIds = items.map((i) => i.cardTypeId);
  const cardTypes = await prisma.cardType.findMany({
    where: { id: { in: cardTypeIds }, isActive: true },
  });
  const cardTypeMap = new Map(cardTypes.map((ct) => [ct.id, ct]));

  const itemsWithTotals: Array<{
    cardTypeId: string;
    quantity: number;
    loadAmount: number;
    discountPct: number;
    faceValueTotal: number;
    payableTotal: number;
  }> = [];

  for (const item of items) {
    const ct = cardTypeMap.get(item.cardTypeId);
    if (!ct) {
      return NextResponse.json({ error: "סוג כרטיס לא נמצא" }, { status: 400 });
    }
    const min = Number(ct.minLoadAmount);
    const max = Number(ct.maxLoadAmount);
    if (item.loadAmount < min || item.loadAmount > max) {
      return NextResponse.json(
        { error: `סכום טעינה עבור ${ct.nameHe} חייב להיות בין ₪${min} ל-₪${max}` },
        { status: 400 }
      );
    }
    const totals = calculateItemTotals({
      quantity: item.quantity,
      loadAmount: item.loadAmount,
      discountPct: Number(ct.discountPct),
    });
    itemsWithTotals.push({
      cardTypeId: item.cardTypeId,
      quantity: item.quantity,
      loadAmount: item.loadAmount,
      discountPct: Number(ct.discountPct),
      faceValueTotal: totals.faceValueTotal,
      payableTotal: totals.payableTotal,
    });
  }

  const orderTotals = calculateOrderTotals(itemsWithTotals);

  // Validate minimum order total
  const minOrderTotal = Number(orderWindow.minOrderTotal);
  if (orderTotals.totalPayable < minOrderTotal) {
    return NextResponse.json(
      { error: `סכום ההזמנה המינימלי הוא ₪${minOrderTotal}` },
      { status: 400 }
    );
  }

  // Create order + items + audit in a single transaction
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        organizationId: session.user.organizationId!,
        orderWindowId,
        requesterId: session.user.id,
        status: "pending_signatory",
        signatoryId: signatory.id,
        termsAcceptedAt: new Date(),
        notes: notes ?? "",
        totalCards: orderTotals.totalCards,
        totalFaceValue: orderTotals.totalFaceValue,
        totalPayable: orderTotals.totalPayable,
      },
    });

    await tx.orderItem.createMany({
      data: itemsWithTotals.map((i) => ({ orderId: created.id, ...i })),
    });

    await tx.auditLog.create({
      data: {
        entityType: "order",
        entityId: created.id,
        action: "submitted",
        actorId: session.user.id,
        actorEmail: session.user.email ?? "",
        newValue: { status: "pending_signatory" },
      },
    });

    return created;
  });

  // Send emails (best-effort, errors don't fail the order)
  void (async () => {
    try {
      const [organization, requester] = await Promise.all([
        prisma.organization.findUnique({ where: { id: session.user.organizationId! } }),
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { fullName: true, email: true },
        }),
      ]);

      if (!organization || !requester) return;

      const approvalToken = await createApprovalToken(order.id, signatory.id);
      const vercelUrl = process.env.VERCEL_URL;
      const baseUrl =
        process.env.NEXTAUTH_URL ??
        (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
      const approvalUrl = `${baseUrl}/approval/${approvalToken}`;

      const emailOrder = {
        orderNumber: order.orderNumber,
        organization,
        orderWindow,
        totalCards: order.totalCards,
        totalFaceValue: Number(order.totalFaceValue),
        totalPayable: Number(order.totalPayable),
        requester,
        signatory: { fullName: signatory.fullName, email: signatory.email },
      };

      await Promise.all([
        sendOrderSubmittedEmail(emailOrder),
        sendSignatoryRequestEmail(emailOrder, approvalUrl),
      ]);
    } catch {
      // Email errors don't fail the order
    }
  })();

  return NextResponse.json({ id: order.id, orderNumber: order.orderNumber }, { status: 201 });
}
