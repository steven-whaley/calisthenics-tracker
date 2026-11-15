import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ConfirmButton } from "@/components/ConfirmButton";
import { deleteCatalogItem, loadStarterCatalog, saveCatalogItem } from "@/lib/actions";
import { isAdminEmail } from "@/lib/admin";
import { FORM_PROGRESSION_TYPES, PROGRESSION_LABELS } from "@/lib/531";
import type { CatalogItem } from "@/lib/catalog";
import { listCatalog } from "@/lib/data";
import { toCatalogItem } from "@/lib/catalog";

function Fields({ item }: { item?: CatalogItem }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
      <div className="col-span-2">
        <label className="label">Name</label>
        <input name="name" required maxLength={60} defaultValue={item?.name} className="input" />
      </div>
      <div>
        <label className="label">Type</label>
        <select name="category" defaultValue={item?.category ?? "upper"} className="input">
          <option value="upper">Upper</option>
          <option value="lower">Lower</option>
          <option value="other">Other</option>
          <option value="bodyweight">Bodyweight</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="label">Progression</label>
        <select name="progression" defaultValue={item?.progression ?? "531"} className="input">
          {FORM_PROGRESSION_TYPES.map((t) => (
            <option key={t} value={t}>{PROGRESSION_LABELS[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Sets</label>
        <input name="setCount" type="number" inputMode="numeric" min="1" max="10" defaultValue={item?.setCount ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Reps / secs</label>
        <input name="repTarget" type="number" inputMode="numeric" min="1" max="3600" defaultValue={item?.repTarget ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Added / wk</label>
        <input name="durationIncrement" type="number" inputMode="numeric" min="0" max="600" defaultValue={item?.durationIncrement ?? ""} className="input" />
      </div>
    </div>
  );
}

export default async function CatalogAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AppShell>
      {async ({ user: userP }) => {
        const [user, rows] = await Promise.all([userP, listCatalog()]);
        if (!isAdminEmail(user.email)) notFound();
        const items = rows.map(toCatalogItem);
        return (
          <>
            <h1 className="text-2xl font-bold">Exercise library</h1>
            <p className="text-sm opacity-70">
              Default exercises offered to every user. Each has a suggested progression and sets/reps (users can change them) but no
              training max: users enter that when they add the exercise. Sets and reps apply to straight and timed sets; the last field is
              reps or seconds added per successful week for bodyweight exercises.
            </p>
            {sp.saved && <p className="text-sm text-green-600">Saved.</p>}
            {sp.error === "duplicate" && <p role="alert" className="text-sm text-red-600">An exercise with that name already exists in the library.</p>}

            <form action={saveCatalogItem.bind(null, null)} className="card space-y-3">
              <h2 className="font-semibold">Add to library</h2>
              <Fields />
              <button className="btn">Add</button>
            </form>

            {items.length === 0 && (
              <form action={loadStarterCatalog} className="card space-y-2">
                <p className="text-sm">The library is empty.</p>
                <button className="btn">Load starter set</button>
              </form>
            )}

            {items.map((it) => (
              <form key={it.id} action={saveCatalogItem.bind(null, it.id)} className="card space-y-3">
                <Fields item={it} />
                <div className="flex gap-2">
                  <button className="btn">Save</button>
                  <ConfirmButton
                    className="btn-ghost text-red-600"
                    message={`Remove ${it.name} from the library? Users who already added it keep their own copy.`}
                    formAction={deleteCatalogItem.bind(null, it.id)}
                  >
                    Remove
                  </ConfirmButton>
                </div>
              </form>
            ))}
          </>
        );
      }}
    </AppShell>
  );
}
