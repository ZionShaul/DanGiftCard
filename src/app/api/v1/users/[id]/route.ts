import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const updateSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  phone: z.string().max(20).optional().nullable(),
  role: z.nativeEnum(UserRole).optional(),
  organizationId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { role, organizationId } = parsed.data;
  if (role === "admin" && organizationId) {
    return NextResponse.json({ error: "מנהל לא יכול להיות שייך לארגון" }, { status: 400 });
  }
  if (role && role !== "admin" && organizationId === null) {
    return NextResponse.json({ error: "חובה לשייך משתמש לארגון" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(user);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const orderCount = await prisma.order.count({
    where: { OR: [{ requesterId: id }, { signatoryId: id }] },
  });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "לא ניתן למחוק — למשתמש יש הזמנות במערכת." },
      { status: 409 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
