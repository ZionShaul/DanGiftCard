import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(200),
  nameHe: z.string().min(2).max(200),
  description: z.string().optional().nullable(),
  discountPct: z.number().min(0).max(100),
  minLoadAmount: z.number().min(1),
  maxLoadAmount: z.number().min(1),
  displayOrder: z.number().default(0),
  isActive: z.boolean().default(true),
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

  const cardType = await prisma.cardType.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(cardType);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const usageCount = await prisma.orderItem.count({ where: { cardTypeId: id } });
  if (usageCount > 0) {
    return NextResponse.json(
      { error: "לא ניתן למחוק — סוג כרטיס זה משמש בהזמנות קיימות." },
      { status: 409 }
    );
  }

  await prisma.cardType.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
