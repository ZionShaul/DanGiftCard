import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/utils";
import { z } from "zod";
import { OrderStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as OrderStatus | null;
  const orgId = searchParams.get("organizationId");
  const windowId = searchParams.get("orderWindowId");

  const where: Record<string, unknown> = {};

  if (session.user.role === "requester") {
    where.requesterId = session.user.id;
  } else if (session.user.role === "signatory") {
    where.organizationId = session.user.organizationId!;
  }
  // admin sees all

  if (status) where.status = status;
  if (orgId) where.organizationId = orgId;
  if (windowId) where.orderWindowId = windowId;

  const orders = await prisma.order.findMany({
    where,
    include: {
      organization: { select: { name: true } },
      orderWindow: { select: { name: true, deliveryDate: true } },
      requester: { select: { fullName: true, email: true } },
      signatory: { select: { fullName: true, email: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

const createSchema = z.object({
  orderWindowId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "requester") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Validate window exists and is open
  const window = await prisma.orderWindow.findUnique({
    where: { id: parsed.data.orderWindowId, isActive: true },
  });
  if (!window) return NextResponse.json({ error: "חלון הזמנות לא נמצא" }, { status: 404 });

  const now = new Date();
  if (now < window.orderOpenAt) {
    return NextResponse.json({ error: "חלון ההזמנות טרם נפתח" }, { status: 400 });
  }
  if (now > window.orderCloseAt) {
    return NextResponse.json({ error: "המועד האחרון להזמנות עבר" }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      organizationId: session.user.organizationId!,
      orderWindowId: parsed.data.orderWindowId,
      requesterId: session.user.id,
      status: "draft",
    },
  });

  return NextResponse.json(order, { status: 201 });
}
