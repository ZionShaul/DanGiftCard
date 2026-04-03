import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { sendActiveTrailEmail, getTemplateId } from "@/lib/email/activetrail";
import type { EmailConfig } from "next-auth/providers/email";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      organizationId: string | null;
      isActive: boolean;
    };
  }
}

// Custom email provider that sends OTP via ActiveTrail
const ActiveTrailEmailProvider: EmailConfig = {
  id: "resend",           // keep id="resend" so next-auth adapter & callbacks work unchanged
  type: "email",
  name: "ActiveTrail OTP",
  from: process.env.EMAIL_FROM ?? "noreply@mishkeydan.co.il",
  maxAge: 15 * 60,        // 15 minutes
  async sendVerificationRequest({ identifier, url }) {
    try {
      console.error("[OTP] sendVerificationRequest called for:", identifier);

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const otpIdentifier = `otp:${identifier}`;
      const tokenValue = `${code}|${url}`;  // "CODE|CALLBACKURL"
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.verificationToken.deleteMany({ where: { identifier: otpIdentifier } });
      console.error("[OTP] cleared old tokens");

      await prisma.verificationToken.create({
        data: { identifier: otpIdentifier, token: tokenValue, expires },
      });
      console.error("[OTP] stored token in DB");

      const templateId = getTemplateId("ACTIVETRAIL_TEMPLATE_OTP");
      console.error("[OTP] sending via ActiveTrail, templateId:", templateId, "to:", identifier);

      await sendActiveTrailEmail(
        templateId,
        identifier,
        { otp_code: code, expiry: "15 דקות" },
        "קוד הכניסה שלך למישקי דן"
      );

      console.error("[OTP] email sent successfully ✓");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[OTP] FAILED:", msg);
      throw err;
    }
  },
  options: {},
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [ActiveTrailEmailProvider],
  callbacks: {
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true, organizationId: true, isActive: true, fullName: true },
      });

      if (dbUser) {
        session.user.id = user.id;
        session.user.role = dbUser.role;
        session.user.organizationId = dbUser.organizationId;
        session.user.isActive = dbUser.isActive;
        session.user.name = dbUser.fullName;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=1",
    error: "/login?error=1",
  },
});
