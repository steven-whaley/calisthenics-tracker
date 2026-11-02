import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CycleProgress } from "@/components/CycleProgress";
import { deleteTemplate } from "@/lib/actions";
import { listTemplates } from "@/lib/data";

export default function Templates() {
  return (
    <AppShell>
      {async (user) => {
        const ts = await listTemplates(user.id);
        return (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Workout templates</h1>
              <Link href="/templates/new" className="btn">New template</Link>
            </div>
            {ts.length === 0 && <p className="opacity-70">Group exercises into a template (e.g. &quot;Push day&quot;) to start a whole workout in one tap.</p>}
            <div className="grid gap-4">
              {ts.map((t) => (
                <div key={t.id} className="card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold">{t.name}</h2>
                    <div className="flex gap-2">
                      <Link href={`/session/${t.id}`} className="btn">Start</Link>
                      <Link href={`/templates/${t.id}/edit`} className="btn-ghost">Edit</Link>
                      <form action={deleteTemplate.bind(null, t.id)}><button className="btn-ghost text-red-600">Delete</button></form>
                    </div>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {t.exercises.map((e) => (
                      <li key={e.id} className="space-y-1">
                        <span className="text-sm font-medium">{e.name}</span>
                        <CycleProgress cycle={e.currentCycle} week={e.currentWeek} cyclesPerBlock={e.cyclesPerBlock} blockNumber={e.blockNumber} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        );
      }}
    </AppShell>
  );
}
