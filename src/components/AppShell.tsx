import { Nav } from "@/components/Nav";
import { requireUser } from "@/lib/data";

export async function AppShell({
  children,
}: {
  children: (user: Awaited<ReturnType<typeof requireUser>>) => React.ReactNode | Promise<React.ReactNode>;
}) {
  const user = await requireUser();
  return (
    <>
      <Nav name={user.name} image={user.image} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 pb-28 pt-6 md:pb-6">{await children(user)}</main>
    </>
  );
}
