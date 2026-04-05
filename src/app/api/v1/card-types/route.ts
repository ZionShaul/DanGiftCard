import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(200),
  nameHe: z.string().min(2).max(200),
  description: z.string().optional().nullable(),
  discountPct: z.number().min(0).max(100),
  minLoadAmount: z.number().min(1).default(100),
  maxLoadAmount: z.number().min(1).default(1500),
  displayOrder: z.number().default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const showAll = req.nextUrl.searchParams.get("all") === "1" && session.user.role === "admin";

  const cardTypes = await prisma.cardType.findMany({
    where: showAll ? undefined : { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  return NextResponse.json(cardTypes);
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

  const cardType = await prisma.cardType.create({ data: parsed.data });
  return NextResponse.json(cardType, { status: 201 });
}
