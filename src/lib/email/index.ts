import { prisma } from "@/lib/db";

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
  const name = settings.fromName ?? "משקי דן";
  const email = settings.fromEmail ?? (process.env.EMAIL_FROM ?? "noreply@mishkeydan.co.il");
  return `${name} <${email}>`;
}
