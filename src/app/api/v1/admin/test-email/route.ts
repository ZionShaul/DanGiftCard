import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { sendActiveTrailEmail, getTemplateId } from "@/lib/email/activetrail";

export async function POST(req: NextRequest) {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const to: string = (body.to ?? "").trim();

  if (!to) {
    return NextResponse.json({ error: "חסר כתובת מייל" }, { status: 400 });
  }

  try {
    const templateId = getTemplateId("ACTIVETRAIL_TEMPLATE_OTP");
    console.error("[test-email] sending to:", to, "templateId:", templateId);

    await sendActiveTrailEmail(templateId, to, {
      otp_code: "123456",
      expiry: "15 דקות",
    });

    return NextResponse.json({ success: true, message: `מייל נשלח ל-${to}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[test-email] FAILED:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
