import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Holiday } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2).max(200),
  holiday: z.nativeEnum(Holiday).default("other"),
  orderOpenAt: z.string().datetime(),
  orderCloseAt: z.string().datetime(),
  deliveryDate: z.string().datetime(),
  minOrderTotal: z.number().min(0).default(2000),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "true";

  const windows = await prisma.orderWindow.findMany({
    where: activeOnly ? { isActive: true } : {},
    orderBy: { orderCloseAt: "desc" },
  });

  return NextResponse.json(windows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const window = await prisma.orderWindow.create({
    data: {
      name: parsed.data.name,
      holiday: parsed.data.holiday,
      orderOpenAt: new Date(parsed.data.orderOpenAt),
      orderCloseAt: new Date(parsed.data.orderCloseAt),
      deliveryDate: new Date(parsed.data.deliveryDate),
      minOrderTotal: parsed.data.minOrderTotal,
    },
  });

  return NextResponse.json(window, { status: 201 });
}
