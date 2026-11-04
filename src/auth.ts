import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
    trustHost: process.env.AUTH_TRUST_HOST === "true" ? true : undefined,
  adapter: PrismaAdapter(db),
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email_verified === true;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        return token;
      }
      

      if (!token.sub) return null;

      const dbUser = await db.user.findUnique({
        where: { id: token.sub },
        select: { role: true, sessionVersion: true },
      });

      if (!dbUser || dbUser.sessionVersion !== token.sessionVersion) {
        return null;
      }

      token.role = dbUser.role;
      return token;
    }, 
  },

    events: {
    async createUser({ user }) {
      if (!user.id) return;
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },
});