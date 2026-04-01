import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email: string = (body.email ?? "").trim().toLowerCase();
  const code: string = (body.code ?? "").trim();

  if (!email || !code) {
    return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      email,
      code,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otp) {
    return NextResponse.json(
      { error: "הקוד שגוי או פג תוקפו. אנא בקש קוד חדש." },
      { status: 400 }
    );
  }

  // Delete OTP – one-time use
  await prisma.otpCode.delete({ where: { id: otp.id } });

  // Return the next-auth magic link URL so the client can complete sign-in
  return NextResponse.json({ callbackUrl: otp.callbackUrl });
}
