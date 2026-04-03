import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email: string = String(body.email ?? "").trim().toLowerCase();

  if (!email) return NextResponse.json({ exists: false });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { isActive: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ exists: false });
  }
  return NextResponse.json({ exists: true });
}
