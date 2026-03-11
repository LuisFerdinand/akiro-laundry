// auth.ts  (project root)
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email    = credentials?.email    as string | undefined;
          const password = credentials?.password as string | undefined;

          if (!email || !password) {
            console.log("[auth] Missing email or password");
            return null;
          }

          const normalizedEmail = email.toLowerCase().trim();
          console.log("[auth] Looking up user:", normalizedEmail);

          const result = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

          const user = result[0];

          if (!user) {
            console.log("[auth] No user found for email:", normalizedEmail);
            return null;
          }

          console.log("[auth] User found, id:", user.id, "role:", user.role);

          // Guard: password must be a bcrypt hash (starts with $2b$ or $2a$)
          if (!user.password.startsWith("$2")) {
            console.log("[auth] Password is not a bcrypt hash — run npm run seed:users to rehash");
            return null;
          }

          const ok = await bcrypt.compare(password, user.password);
          console.log("[auth] Password match:", ok);

          if (!ok) return null;

          return {
            id:    String(user.id),
            name:  user.name,
            email: user.email,
            role:  user.role as UserRole,
          };
        } catch (err) {
          console.error("[auth] authorize() threw:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: UserRole }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role: UserRole; id: string }).role = token.role as UserRole;
        (session.user as { role: UserRole; id: string }).id   = token.sub ?? "";
      }
      return session;
    },
  },
});