import { AppShell } from "@/components/AppShell";
import { TemplateForm } from "@/components/TemplateForm";
import { saveTemplate } from "@/lib/actions";
import { listExercises } from "@/lib/data";

export default function NewTemplate() {
  return (
    <AppShell>
      {async (user) => (
        <>
          <h1 className="text-2xl font-bold">New template</h1>
          <TemplateForm action={saveTemplate.bind(null, null)} exercises={await listExercises(user.id)} submitLabel="Create template" />
        </>
      )}
    </AppShell>
  );
}
