import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");
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
    </main>
  );
}
