import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { organizationId } = session.user;

  if (!organizationId) {
    return NextResponse.json([], { status: 200 });
  }

  const signatories = await prisma.user.findMany({
    where: {
      role: "signatory",
      organizationId,
      isActive: true,
    },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" },
  });

  return NextResponse.json(signatories);
}
