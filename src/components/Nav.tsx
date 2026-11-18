import Link from "next/link";
import { signOut } from "@/auth";
import { BottomNav } from "@/components/BottomNav";
import { UserMenu } from "@/components/UserMenu";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export function Nav({ name, image }: { name?: string | null; image?: string | null }) {
  return (
    <>
      <header className="border-b border-stone-300/60 dark:border-stone-800">
        <div className="mx-auto flex max-w-4xl items-center gap-x-5 px-4 py-3">
          <Link href="/dashboard" className="font-bold tracking-tight">5/3/1 Tracker</Link>
          {/* Desktop links; phones use the bottom tab bar */}
          <nav className="hidden gap-4 text-sm md:flex">
            <Link href="/get-started">Get started</Link>
            <Link href="/dashboard">Today</Link>
            <Link href="/templates">Templates</Link>
            <Link href="/exercises">Exercises</Link>
            <Link href="/calendar">Calendar</Link>
            <Link href="/coach">Coach</Link>
            <Link href="/progress">Progress</Link>
            <Link href="/issues">Issues</Link>
          </nav>
          <div className="ml-auto">
            <UserMenu name={name} image={image} signOutAction={signOutAction} />
          </div>
        </div>
      </header>
      <BottomNav signOutAction={signOutAction} />
    </>
  );
}
