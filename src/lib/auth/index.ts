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
          console.log("[OTP] sendVerificationRequest start for:", identifier);

          // Generate a 6-digit OTP code
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          console.log("[OTP] generated code:", code);

          // Remove any existing OTP for this email
          await prisma.otpCode.deleteMany({ where: { email: identifier } });
          console.log("[OTP] deleted old OTP codes");

          // Store the code alongside the next-auth magic link URL
          await prisma.otpCode.create({
            data: {
              email: identifier,
              code,
              callbackUrl: url,
              expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            },
          });
          console.log("[OTP] stored OTP code in DB");

          // Send the 6-digit code via ActiveTrail
          const templateId = getTemplateId("ACTIVETRAIL_TEMPLATE_OTP");
          console.log("[OTP] sending via ActiveTrail templateId:", templateId, "to:", identifier);

          await sendActiveTrailEmail(templateId, identifier, {
            otp_code: code,
            expiry: "15 דקות",
          });

          console.log("[OTP] ActiveTrail send success");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[OTP] sendVerificationRequest FAILED:", msg);
          throw err; // re-throw so next-auth handles the error
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
