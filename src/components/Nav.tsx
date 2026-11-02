import Link from "next/link";
import { signOut } from "@/auth";

export function Nav({ name, image }: { name?: string | null; image?: string | null }) {
  return (
    <header className="border-b border-stone-300/60 dark:border-stone-800">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link href="/dashboard" className="font-bold tracking-tight">5/3/1 Tracker</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/dashboard">Today</Link>
          <Link href="/templates">Templates</Link>
          <Link href="/exercises">Exercises</Link>
          <Link href="/calendar">Calendar</Link>
          <Link href="/progress">Progress</Link>
          <Link href="/settings">Profile</Link>
        </nav>
        <form
          className="ml-auto flex items-center gap-2 text-sm"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {image && <img src={image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />}
          <span className="hidden opacity-70 sm:inline">{name}</span>
          <button className="btn-ghost">Sign out</button>
        </form>
      </div>
    </header>
  );
}
