import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email/templates";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email: string = (body.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "חסרה כתובת מייל" }, { status: 400 });
  }

  // Rate limiting — מניעת OTP Bombing (60 שניות בין שליחות)
  const existing = await prisma.verificationToken.findFirst({
    where: { identifier: `otp:${email}`, expires: { gt: new Date() } },
  });
  if (existing) {
    const sentAt = existing.expires.getTime() - 15 * 60 * 1000;
    if (Date.now() - sentAt < 60_000) {
      return NextResponse.json(
        { error: "נשלח קוד לאחרונה, אנא המתן דקה ונסה שוב" },
        { status: 429 }
      );
    }
  }

  // בדיקת משתמש
  const user = await prisma.user.findUnique({
    where: { email },
    select: { isActive: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "כתובת המייל אינה רשומה במערכת. אנא פנה למנהל." },
      { status: 404 }
    );
  }

  if (!user.isActive) {
    return NextResponse.json(
      { error: "חשבונך אינו פעיל. אנא פנה למנהל המערכת." },
      { status: 403 }
    );
  }

  const code = generateCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 דקות

  // שמירה: CODE:0 (קוד + מונה ניסיונות)
  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier: `otp:${email}`, token: existing?.token ?? "" } },
    update: { token: `${code}:0`, expires },
    create: { identifier: `otp:${email}`, token: `${code}:0`, expires },
  });

  // שליחת מייל (שגיאה לא חוסמת את התגובה)
  try {
    await sendOtpEmail(email, code);
  } catch (err) {
    console.error("[OTP] Failed to send email:", err);
  }

  return NextResponse.json({ success: true });
}
