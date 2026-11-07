import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { testLoginEnabled } from "@/lib/testLogin";

export default async function Home({ searchParams }: { searchParams: Promise<{ testlogin?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  // Only skip the landing page if the signed-in user still exists. A stale session (e.g. after a database
  // reset) would otherwise bounce between "/" and the app, which sends missing users back to "/".
  if (session?.user?.id) {
    const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, session.user.id));
    if (row) redirect("/dashboard");
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-bold tracking-tight">5/3/1 Tracker</h1>
      <p className="opacity-80">
        Build progressions for any lift, run as many 3-week cycles as you like before a deload,
        log every set against its target, and add joker sets when you feel strong.
      </p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button className="btn w-full py-3 text-base">Continue with Google</button>
      </form>
      {testLoginEnabled() && (
        <form
          className="card space-y-3"
          action={async (formData: FormData) => {
            "use server";
            try {
              await signIn("test-user", { password: String(formData.get("password") ?? ""), redirectTo: "/dashboard" });
            } catch (e) {
              if (e instanceof AuthError) redirect("/?testlogin=failed");
              throw e; // lets Next handle the success redirect
            }
          }}
        >
          <h2 className="font-semibold">Test login</h2>
          <p className="text-xs opacity-70">Shared test account for non-production environments.</p>
          <label className="label" htmlFor="test-password">Test user password</label>
          <input id="test-password" name="password" type="password" required autoComplete="off" className="input" />
          {sp.testlogin === "failed" && <p role="alert" className="text-sm text-red-600">Wrong password.</p>}
          <button className="btn-ghost w-full">Sign in as test user</button>
        </form>
      )}
    </main>
  );
}
