import { AppShell } from "@/components/AppShell";
import { updateProfile } from "@/lib/actions";

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  return (
    <AppShell>
      {async ({ user: userP }) => {
        const user = await userP;
        return (
        <>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm opacity-70">Signed in with Google as {user.email}</p>
          {saved && <p className="text-sm text-green-600">Saved.</p>}
          <form action={updateProfile} className="card grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="label" htmlFor="name">Display name</label>
              <input id="name" name="name" defaultValue={user.name ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="unit">Units</label>
              <select id="unit" name="unit" defaultValue={user.unit} className="input">
                <option value="lb">Pounds (lb)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="rounding">Round weights to</label>
              <input id="rounding" name="rounding" type="number" step="any" min="0.25" defaultValue={user.rounding} className="input" />
            </div>
            <div className="self-end"><button className="btn">Save</button></div>
          </form>
        </>
        );
      }}
    </AppShell>
  );
}
