import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_ATTEMPTS = 5;

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

  // פורמט token: "CODE:ATTEMPTS"
  const parts = record.token.split(":");
  const storedCode = parts[0];
  const attempts = parseInt(parts[1] ?? "0", 10);

  // בדיקת brute force
  if (attempts >= MAX_ATTEMPTS) {
    await prisma.verificationToken.deleteMany({ where: { identifier: otpIdentifier } });
    return NextResponse.json(
      { error: "חרגת ממספר הניסיונות המותר. אנא בקש קוד חדש." },
      { status: 429 }
    );
  }

  if (storedCode !== code) {
    // עדכון מונה ניסיונות (שמירת תאריך הפקיעה המקורי)
    await prisma.verificationToken.update({
      where: { identifier_token: { identifier: otpIdentifier, token: record.token } },
      data: { token: `${storedCode}:${attempts + 1}` },
    });

    const remaining = MAX_ATTEMPTS - attempts - 1;
    return NextResponse.json(
      {
        error:
          remaining > 0
            ? `הקוד שגוי. נותרו ${remaining} ניסיונות.`
            : "הקוד שגוי. זהו הניסיון האחרון.",
      },
      { status: 400 }
    );
  }

  // קוד נכון — מחק OTP token
  await prisma.verificationToken.deleteMany({ where: { identifier: otpIdentifier } });

  // צור verified token עם תוקף 30 שניות (שימוש חד-פעמי ע"י authorize())
  const verifiedIdentifier = `verified:${email}`;
  const verifiedToken = crypto.randomUUID();
  const verifiedExpires = new Date(Date.now() + 30_000);

  await prisma.verificationToken.deleteMany({ where: { identifier: verifiedIdentifier } });
  await prisma.verificationToken.create({
    data: {
      identifier: verifiedIdentifier,
      token: verifiedToken,
      expires: verifiedExpires,
    },
  });

  return NextResponse.json({ success: true });
}
