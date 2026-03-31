import { Resend } from "resend";
import { prisma } from "@/lib/db";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY ?? "");
  }
  return _resend;
}

export async function getBranding() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "branding" } });
  return (setting?.value as {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    welcomeText?: string;
  }) ?? {};
}

export async function getEmailSettings() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "email_settings" } });
  return (setting?.value as {
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
  }) ?? {};
}

export async function getFromAddress(): Promise<string> {
  const settings = await getEmailSettings();
  const name = settings.fromName ?? "מישקי דן";
  const email = settings.fromEmail ?? (process.env.EMAIL_FROM ?? "noreply@mishkei-dan.co.il");
  return `${name} <${email}>`;
}
