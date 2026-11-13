import { Nav } from "@/components/Nav";
import { loadUser, requireUserId } from "@/lib/data";

export type ShellUser = Awaited<ReturnType<typeof loadUser>>;

/**
 * What a page's render function receives. `userId` is available immediately (read from the session cookie),
 * so the page can start its own queries right away; `user` resolves to the full user row. Pages should await
 * `user` in the same `Promise.all` as their first queries so the two overlap instead of running one after the other.
 */
export type ShellContext = { userId: string; user: Promise<ShellUser> };

export async function AppShell({
  children,
}: {
  children: (ctx: ShellContext) => React.ReactNode | Promise<React.ReactNode>;
}) {
  const userId = await requireUserId();
  const user = loadUser(userId);
  // Start the page's work now, in parallel with the user lookup.
  const content = Promise.resolve(children({ userId, user }));
  // If the user lookup redirects first, don't leave the page work as an unhandled rejection.
  content.catch(() => {});
  const me = await user;
  return (
    <>
      <Nav name={me.name} image={me.image} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 pb-28 pt-6 md:pb-6">{await content}</main>
    </>
  );
}
