import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email: string = (body.email ?? "").trim().toLowerCase();
  const code: string = (body.code ?? "").trim();

  if (!email || !code) {
    return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
  }

  const otpIdentifier = `otp:${email}`;

  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier: otpIdentifier,
      expires: { gt: new Date() },
    },
  });

  if (!record) {
    return NextResponse.json(
      { error: "הקוד פג תוקפו. אנא בקש קוד חדש." },
      { status: 400 }
    );
  }

  // token format: "CODE|CALLBACKURL"
  const pipeIndex = record.token.indexOf("|");
  const storedCode = record.token.substring(0, pipeIndex);
  const callbackUrl = record.token.substring(pipeIndex + 1);

  if (storedCode !== code) {
    return NextResponse.json(
      { error: "הקוד שגוי. אנא נסה שוב." },
      { status: 400 }
    );
  }

  // Delete – one-time use
  await prisma.verificationToken.deleteMany({ where: { identifier: otpIdentifier } });

  return NextResponse.json({ callbackUrl });
}
