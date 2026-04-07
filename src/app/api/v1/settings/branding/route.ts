import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_BRANDING = {
  logoUrl: null,
  primaryColor: "#1a73e8",
  secondaryColor: "#fbbc04",
  welcomeText: "ברוכים הבאים למערכת הזמנות תווי השי של משקי דן",
};

export async function GET() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "branding" } });
  return NextResponse.json(setting?.value ?? DEFAULT_BRANDING);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const setting = await prisma.systemSetting.upsert({
    where: { key: "branding" },
    update: { value: body, updatedById: session.user.id },
    create: {
      key: "branding",
      value: body,
      description: "הגדרות מיתוג המערכת",
      updatedById: session.user.id,
    },
  });

  return NextResponse.json(setting.value);
}
