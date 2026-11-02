import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
  }
}

// Reads AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET from the environment.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      return account?.provider === "google" && !!profile?.sub && profile.email_verified === true;
    },
    async jwt({ token, account, profile }) {
      // First sign-in: map the Google identity to our own user row.
      if (account?.provider === "google" && profile?.sub && profile.email) {
        const [row] = await db
          .insert(users)
          .values({
            googleSub: profile.sub,
            email: profile.email,
            name: profile.name ?? null,
            image: typeof profile.picture === "string" ? profile.picture : null,
          })
          .onConflictDoUpdate({
            target: users.googleSub,
            set: { email: profile.email },
          })
          .returning({ id: users.id });
        token.uid = row.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
  pages: { signIn: "/" },
});
