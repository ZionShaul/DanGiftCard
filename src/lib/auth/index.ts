import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "@/lib/db";
import { sendActiveTrailEmail, getTemplateId } from "@/lib/email/activetrail";
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: process.env.EMAIL_FROM ?? "noreply@mishkeydan.co.il",
      // Token valid for 15 minutes – gives us time for OTP entry
      maxAge: 15 * 60,
      sendVerificationRequest: async ({ identifier, url }) => {
        try {
          console.error("[OTP] start for:", identifier);

          // Generate a 6-digit OTP code
          const code = Math.floor(100000 + Math.random() * 900000).toString();

          // Store via existing VerificationToken table using "otp:" prefix
          // token format: "CODE|CALLBACKURL"  (| not present in URLs)
          const otpIdentifier = `otp:${identifier}`;
          const tokenValue = `${code}|${url}`;
          const expires = new Date(Date.now() + 15 * 60 * 1000);

          // Delete any previous OTP for this email
          await prisma.verificationToken.deleteMany({
            where: { identifier: otpIdentifier },
          });
          console.error("[OTP] old tokens cleared");

          await prisma.verificationToken.create({
            data: { identifier: otpIdentifier, token: tokenValue, expires },
          });
          console.error("[OTP] token stored in DB");

          // Send via ActiveTrail
          const templateId = getTemplateId("ACTIVETRAIL_TEMPLATE_OTP");
          console.error("[OTP] calling ActiveTrail templateId:", templateId);

          await sendActiveTrailEmail(templateId, identifier, {
            otp_code: code,
            expiry: "15 דקות",
          });

          console.error("[OTP] ActiveTrail success ✓");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[OTP] FAILED:", msg);
          throw err;
        }
      },
    }),
  ],
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

        // Update last login
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
