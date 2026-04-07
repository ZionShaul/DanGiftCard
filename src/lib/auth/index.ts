import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
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
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {} },
      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        if (!email) return null;

        // בדוק verified token — נוצר ע"י /api/auth/otp/verify לאחר אימות קוד OTP
        const verifiedIdentifier = `verified:${email}`;
        const verified = await prisma.verificationToken.findFirst({
          where: { identifier: verifiedIdentifier, expires: { gt: new Date() } },
        });
        if (!verified) return null;

        // מחק token — שימוש חד-פעמי
        await prisma.verificationToken.deleteMany({ where: { identifier: verifiedIdentifier } });

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, fullName: true, role: true, organizationId: true, isActive: true },
        });

        if (!user || !user.isActive) return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
        token.organizationId = (user as { organizationId: string | null }).organizationId;
        token.isActive = (user as { isActive: boolean }).isActive;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.organizationId = token.organizationId as string | null;
      session.user.isActive = token.isActive as boolean;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login?error=1",
  },
});
