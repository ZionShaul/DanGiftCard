import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Holiday } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2).max(200),
  holiday: z.nativeEnum(Holiday).default("other"),
  orderOpenAt: z.string(),
  orderCloseAt: z.string(),
  deliveryDate: z.string(),
  minOrderTotal: z.number().min(0).default(2000),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, holiday, orderOpenAt, orderCloseAt, deliveryDate, minOrderTotal, isActive } = parsed.data;

  const window = await prisma.orderWindow.update({
    where: { id },
    data: {
      name,
      holiday,
      orderOpenAt: new Date(orderOpenAt),
      orderCloseAt: new Date(orderCloseAt),
      deliveryDate: new Date(deliveryDate),
      minOrderTotal,
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  return NextResponse.json(window);
}
