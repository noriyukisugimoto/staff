import { Role } from "@prisma/client";
import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  loginId: z.string().regex(/^\d{3}$/),
  password: z.string().min(4)
});

export const authConfig = {
  /** Next.js の Route Handler は `/api/auth/*`。環境変数の URL 解釈で `/` になり Bad request になるのを防ぐ */
  basePath: "/api/auth",
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Login ID and Password",
      credentials: {
        loginId: { label: "Login ID", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { loginId: parsed.data.loginId }
        });
        if (!user) {
          return null;
        }

        if (!verifyPassword(parsed.data.password, user.passwordHash)) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.loginId = (user as { loginId?: string }).loginId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.loginId = token.loginId as string;
        session.user.role = (token.role as Role | undefined) ?? Role.STAFF;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
} satisfies NextAuthConfig;

export const { handlers, auth } = NextAuth(authConfig);
