import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import { TEST_USER, testLoginEnabled, testPasswordMatches } from "@/lib/testLogin";

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
  providers: [
    Google,
    // Feature-flagged password login for the shared test user (no Google account needed).
    ...(testLoginEnabled()
      ? [
          Credentials({
            id: "test-user",
            name: "Test user",
            credentials: { password: { label: "Password", type: "password" } },
            async authorize(credentials) {
              if (!testPasswordMatches(credentials?.password)) return null;
              const [row] = await db
                .insert(users)
                .values({ googleSub: TEST_USER.googleSub, email: TEST_USER.email, name: TEST_USER.name })
                .onConflictDoUpdate({ target: users.googleSub, set: { email: TEST_USER.email } })
                .returning({ id: users.id });
              return { id: row.id, name: TEST_USER.name, email: TEST_USER.email };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "test-user") return testLoginEnabled();
      return account?.provider === "google" && !!profile?.sub && profile.email_verified === true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "test-user" && user?.id && testLoginEnabled()) token.uid = user.id;
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
