import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { isAdminEmail } from "@/lib/admin";
import { loadUser, requireUserId } from "@/lib/data";

export type ShellUser = Awaited<ReturnType<typeof loadUser>>;

/**
 * What a page's render function receives. `userId` is available immediately (read from the session cookie),
 * so the page can start its own queries right away; `user` resolves to the full user row. Pages should await
 * `user` in the same `Promise.all` as their first queries so the two overlap instead of running one after the other.
 */
export type ShellContext = { userId: string; user: Promise<ShellUser> };

/** The nav once the user row is loaded (name, avatar, admin link). */
async function UserNav({ user }: { user: Promise<ShellUser> }) {
  const me = await user;
  return <Nav name={me.name} image={me.image} isAdmin={isAdminEmail(me.email)} />;
}

/** The page body, streamed in when its queries finish. */
async function Content({ content, wide }: { content: Promise<React.ReactNode>; wide: boolean }) {
  return <main className={`mx-auto w-full ${wide ? "max-w-6xl" : "max-w-4xl"} flex-1 space-y-6 px-4 pb-28 pt-6 md:pb-6`}>{await content}</main>;
}

function ContentSkeleton({ wide }: { wide: boolean }) {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className={`mx-auto w-full ${wide ? "max-w-6xl" : "max-w-4xl"} flex-1 animate-pulse space-y-6 px-4 pb-28 pt-6 md:pb-6`}
    >
      <div className="h-8 w-40 rounded bg-stone-300/50 dark:bg-stone-700/50" />
      <div className="h-28 rounded-xl bg-stone-300/40 dark:bg-stone-800/60" />
      <div className="h-28 rounded-xl bg-stone-300/40 dark:bg-stone-800/60" />
      <div className="h-28 rounded-xl bg-stone-300/40 dark:bg-stone-800/60" />
    </main>
  );
}

/**
 * Only the session cookie is read before streaming starts, so the frame (nav, page skeleton) reaches the
 * browser immediately. The user row and the page's own queries stream into their Suspense boundaries.
 * A missing user row still redirects to "/" (Next handles a redirect thrown after streaming began).
 */
export async function AppShell({
  children,
  wide = false,
}: {
  wide?: boolean;
  children: (ctx: ShellContext) => React.ReactNode | Promise<React.ReactNode>;
}) {
  const userId = await requireUserId();
  const user = loadUser(userId);
  // Start the page's work now, in parallel with the user lookup.
  const content = Promise.resolve(children({ userId, user }));
  // Unhandled-rejection guard: the awaiting component below surfaces the real error.
  content.catch(() => {});
  user.catch(() => {});
  return (
    <>
      {/* The fallback is the same nav without the user's name/avatar/admin link. */}
      <Suspense fallback={<Nav />}>
        <UserNav user={user} />
      </Suspense>
      <Suspense fallback={<ContentSkeleton wide={wide} />}>
        <Content content={content} wide={wide} />
      </Suspense>
    </>
  );
}
