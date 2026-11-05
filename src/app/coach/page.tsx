import { AppShell } from "@/components/AppShell";
import { CoachChat } from "@/components/CoachChat";

export default function CoachPage() {
  return (
    <AppShell>
      {() => (
        <>
          <div>
            <h1 className="text-2xl font-bold">Coach</h1>
            <p className="text-xs opacity-60">
              Runs on free AI Gateway models, so replies can be slow or imperfect. Check anything important.
            </p>
          </div>
          <CoachChat />
        </>
      )}
    </AppShell>
  );
}
