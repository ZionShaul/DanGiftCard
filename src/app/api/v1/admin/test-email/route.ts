import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { sendActiveTrailEmail, getTemplateId } from "@/lib/email/activetrail";

export async function POST(req: NextRequest) {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const to: string = body.to ?? "";

  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "כתובת מייל לא תקינה" }, { status: 400 });
  }

  const templateId = getTemplateId("ACTIVETRAIL_TEMPLATE_OTP");

  try {
    await sendActiveTrailEmail(templateId, to, {
      otp_url: "https://dan-gift-card.vercel.app/login",
      expiry: "בדיקה",
    });
    return NextResponse.json({ ok: true, message: `מייל נשלח בהצלחה ל-${to}`, templateId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[test-email]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
