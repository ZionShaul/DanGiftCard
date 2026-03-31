import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateItemTotals, calculateOrderTotals } from "@/lib/orders/calculations";
import { z } from "zod";

const itemSchema = z.object({
  cardTypeId: z.string().uuid(),
  quantity: z.number().int().min(1),
  loadAmount: z.number().min(1),
});

const updateSchema = z.object({
  items: z.array(itemSchema).optional(),
  notes: z.string().max(2000).optional(),
});

async function getOrderOrFail(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { cardType: true } },
      organization: true,
      orderWindow: true,
      requester: { select: { id: true, fullName: true, email: true } },
      signatory: { select: { id: true, fullName: true, email: true } },
      adminReviewedBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getOrderOrFail(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Access control
  if (
    session.user.role === "requester" && order.requesterId !== session.user.id ||
    session.user.role === "signatory" && order.organizationId !== session.user.organizationId
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "requester") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.requesterId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (order.status !== "draft" && order.status !== "rejected_signatory") {
    return NextResponse.json({ error: "לא ניתן לערוך הזמנה שאינה טיוטה" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Recalculate items if provided
  if (parsed.data.items) {
    // Fetch card types to get discounts
    const cardTypeIds = parsed.data.items.map((i) => i.cardTypeId);
    const cardTypes = await prisma.cardType.findMany({
      where: { id: { in: cardTypeIds }, isActive: true },
    });
    const cardTypeMap = new Map(cardTypes.map((ct) => [ct.id, ct]));

    for (const item of parsed.data.items) {
      const ct = cardTypeMap.get(item.cardTypeId);
      if (!ct) return NextResponse.json({ error: `סוג כרטיס לא נמצא` }, { status: 400 });
      const min = Number(ct.minLoadAmount);
      const max = Number(ct.maxLoadAmount);
      if (item.loadAmount < min || item.loadAmount > max) {
        return NextResponse.json(
          { error: `סכום טעינה עבור ${ct.nameHe} חייב להיות בין ₪${min} ל-₪${max}` },
          { status: 400 }
        );
      }
    }

    const itemsWithTotals = parsed.data.items.map((item) => {
      const ct = cardTypeMap.get(item.cardTypeId)!;
      const totals = calculateItemTotals({
        quantity: item.quantity,
        loadAmount: item.loadAmount,
        discountPct: Number(ct.discountPct),
      });
      return {
        cardTypeId: item.cardTypeId,
        quantity: item.quantity,
        loadAmount: item.loadAmount,
        discountPct: Number(ct.discountPct),
        faceValueTotal: totals.faceValueTotal,
        payableTotal: totals.payableTotal,
      };
    });

    const orderTotals = calculateOrderTotals(itemsWithTotals);

    // Delete existing items and recreate
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.orderItem.createMany({
      data: itemsWithTotals.map((i) => ({
        orderId: id,
        cardTypeId: i.cardTypeId,
        quantity: i.quantity,
        loadAmount: i.loadAmount,
        discountPct: i.discountPct,
        faceValueTotal: i.faceValueTotal,
        payableTotal: i.payableTotal,
      })),
    });

    await prisma.order.update({
      where: { id },
      data: {
        totalCards: orderTotals.totalCards,
        totalFaceValue: orderTotals.totalFaceValue,
        totalPayable: orderTotals.totalPayable,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      },
    });
  } else if (parsed.data.notes !== undefined) {
    await prisma.order.update({ where: { id }, data: { notes: parsed.data.notes } });
  }

  return NextResponse.json(await getOrderOrFail(id));
}
