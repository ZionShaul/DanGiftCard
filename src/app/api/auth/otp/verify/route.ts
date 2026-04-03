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

  if (storedCode !== code) {
    return NextResponse.json(
      { error: "הקוד שגוי. אנא נסה שוב." },
      { status: 400 }
    );
  }

  // OTP valid – delete it (one-time use) + clean up next-auth's email token
  await prisma.verificationToken.deleteMany({ where: { identifier: otpIdentifier } });
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "המשתמש אינו קיים במערכת" }, { status: 400 });
  }

  // Create session directly in DB (bypasses next-auth magic link callback)
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  // Set next-auth v5 session cookie
  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const response = NextResponse.json({ redirectUrl: "/dashboard" });
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    expires,
    path: "/",
  });
  return response;
}
