import { AppShell } from "@/components/AppShell";
import { IssueForm } from "@/components/IssueForm";
import { listIssueReports } from "@/lib/data";

const KIND = { bug: "Bug", feature: "Feature request", other: "Other" } as const;

export default function Issues() {
  return (
    <AppShell>
      {async ({ userId }) => {
        const mine = await listIssueReports(userId);
        return (
          <>
            <h1 className="text-2xl font-bold">Report an issue</h1>
            <p className="text-sm opacity-70">Found a bug or have an idea? Submit it here and it goes straight to the developer.</p>
            <IssueForm />
            {mine.length > 0 && (
              <section className="card space-y-2">
                <h2 className="font-semibold">Your submitted issues</h2>
                <ul className="divide-y divide-stone-300/40 dark:divide-stone-800">
                  {mine.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm">
                      <span>
                        <a href={i.githubUrl} target="_blank" rel="noreferrer" className="underline">#{i.githubNumber}</a>{" "}
                        {i.title}
                      </span>
                      <span className="text-xs opacity-60">{KIND[i.kind]} · {i.createdAt.toLocaleDateString("en-US")}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        );
      }}
    </AppShell>
  );
}
