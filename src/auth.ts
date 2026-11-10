import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/features/auth/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
   
  adapter: PrismaAdapter(db),
    providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        if (profile?.email_verified !== true) return false;

        const linked = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          select: { user: { select: { deletionScheduledFor: true } } },
        });

        if (linked?.user.deletionScheduledFor) {
          return "/login?error=AccountPendingDeletion";
        }
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
        select: { role: true, sessionVersion: true, deletionScheduledFor: true },
      });

      if (!dbUser || dbUser.sessionVersion !== token.sessionVersion || dbUser.deletionScheduledFor) {
        return null;
      }

      token.role = dbUser.role;
      return token;
    }, 
  },

    events: {
      async createUser({ user }) {
        if (!user.id) return;
        await db.$transaction([
          db.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          }),
          db.activityEvent.create({
            data: { type: "SIGN_UP", userId: user.id },
          }),
        ]);
      },
    },
});