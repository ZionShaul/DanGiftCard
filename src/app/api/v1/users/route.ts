import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(200),
  role: z.nativeEnum(UserRole),
  organizationId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("organizationId");
  const role = searchParams.get("role") as UserRole | null;

  const users = await prisma.user.findMany({
    where: {
      ...(orgId ? { organizationId: orgId } : {}),
      ...(role ? { role } : {}),
    },
    include: { organization: { select: { id: true, name: true } } },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Admin cannot be assigned to an org
  if (parsed.data.role === "admin" && parsed.data.organizationId) {
    return NextResponse.json({ error: "מנהל לא יכול להיות שייך לארגון" }, { status: 400 });
  }
  // Non-admin must have org
  if (parsed.data.role !== "admin" && !parsed.data.organizationId) {
    return NextResponse.json({ error: "חובה לשייך משתמש לארגון" }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      organizationId: parsed.data.organizationId ?? null,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
