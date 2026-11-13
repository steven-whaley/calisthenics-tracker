import { AppShell } from "@/components/AppShell";
import { TemplateForm } from "@/components/TemplateForm";
import { saveTemplate } from "@/lib/actions";
import { listExercises } from "@/lib/data";
import { toPickable } from "@/lib/pickable";

export default function NewTemplate() {
  return (
    <AppShell>
      {async ({ userId, user: userP }) => {
        const [user, exs] = await Promise.all([userP, listExercises(userId)]);
        return (
          <>
            <h1 className="text-2xl font-bold">New template</h1>
            <TemplateForm action={saveTemplate.bind(null, null)} exercises={toPickable(exs)} submitLabel="Create template" unit={user.unit} />
          </>
        );
      }}
    </AppShell>
  );
}
