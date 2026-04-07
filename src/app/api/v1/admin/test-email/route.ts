import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/helpers";
import { sendActiveTrailEmail, getTemplateId } from "@/lib/email/activetrail";

const TEMPLATE_ENV_VARS = [
  "ACTIVETRAIL_TEMPLATE_OTP",
  "ACTIVETRAIL_TEMPLATE_ORDER_SUBMITTED",
  "ACTIVETRAIL_TEMPLATE_SIGNATORY_REQUEST",
  "ACTIVETRAIL_TEMPLATE_SIGNATORY_REJECTED",
  "ACTIVETRAIL_TEMPLATE_ADMIN_PENDING",
  "ACTIVETRAIL_TEMPLATE_ORDER_APPROVED",
];

/** GET: return email configuration status (no sensitive values exposed) */
export async function GET() {
  await requireAdmin();

  const apiKey = process.env.ACTIVETRAIL_API_KEY ?? "";
  const config = {
    api_key_set: !!apiKey,
    api_key_preview: apiKey ? `${apiKey.slice(0, 6)}...` : "❌ לא מוגדר",
    nextauth_url: process.env.NEXTAUTH_URL ?? "❌ לא מוגדר",
    vercel_url: process.env.VERCEL_URL ?? "(לא זמין)",
    templates: Object.fromEntries(
      TEMPLATE_ENV_VARS.map((envVar) => {
        const id = getTemplateId(envVar);
        return [envVar, id > 0 ? `✅ ${id}` : "❌ לא מוגדר"];
      })
    ),
  };

  return NextResponse.json(config);
}

/** POST: send a test email */
export async function POST(req: NextRequest) {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const to: string = (body.to ?? "").trim();
  const templateEnvVar: string = body.templateEnvVar ?? "ACTIVETRAIL_TEMPLATE_OTP";

  if (!to) {
    return NextResponse.json({ error: "חסר כתובת מייל" }, { status: 400 });
  }

  const templateId = getTemplateId(templateEnvVar);
  if (!templateId) {
    return NextResponse.json(
      { error: `משתנה הסביבה ${templateEnvVar} אינו מוגדר או שגוי` },
      { status: 400 }
    );
  }

  // Default test parameters per template
  const testParams: Record<string, Record<string, string>> = {
    ACTIVETRAIL_TEMPLATE_OTP: { otp_code: "123456", expiry: "15 דקות", otp_url: "https://example.com/otp?code=123456" },
    ACTIVETRAIL_TEMPLATE_ORDER_SUBMITTED: {
      order_number: "ORD-2026-TEST",
      org_name: "ארגון בדיקה",
      window_name: "ראש השנה תשפ״ו",
      delivery_date: "01.09.2026",
      total_cards: "10",
      total_face_value: "₪5,000",
      total_payable: "₪4,600",
      requester_name: "משה בדיקה",
      signatory_name: "יוסי מנהל",
      order_link: "https://dan-gift-card.vercel.app/orders/test",
    },
    ACTIVETRAIL_TEMPLATE_SIGNATORY_REQUEST: {
      order_number: "ORD-2026-TEST",
      org_name: "ארגון בדיקה",
      window_name: "ראש השנה תשפ״ו",
      delivery_date: "01.09.2026",
      total_cards: "10",
      total_face_value: "₪5,000",
      total_payable: "₪4,600",
      requester_name: "משה בדיקה",
      signatory_name: "יוסי מנהל",
      approve_url: "https://dan-gift-card.vercel.app/approval/test?action=approve",
      reject_url: "https://dan-gift-card.vercel.app/approval/test?action=reject",
      approval_url: "https://dan-gift-card.vercel.app/approval/test",
      pdf_link: "https://dan-gift-card.vercel.app/api/approval/test/pdf",
    },
  };

  const params = testParams[templateEnvVar] ?? testParams["ACTIVETRAIL_TEMPLATE_OTP"];

  try {
    await sendActiveTrailEmail(templateId, to, params, `בדיקת מייל – ${templateEnvVar}`);
    return NextResponse.json({ success: true, message: `מייל נשלח ל-${to} (תבנית ${templateId})` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[test-email] FAILED:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
