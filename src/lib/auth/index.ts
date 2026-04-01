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
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: process.env.EMAIL_FROM ?? "noreply@mishkeydan.co.il",
      // OTP expires in 15 minutes
      maxAge: 15 * 60,
      // Override default Resend sending with ActiveTrail
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendActiveTrailEmail(
          getTemplateId("ACTIVETRAIL_TEMPLATE_OTP"),
          identifier,
          {
            otp_url: url,
            expiry: "15 דקות",
          }
        );
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
