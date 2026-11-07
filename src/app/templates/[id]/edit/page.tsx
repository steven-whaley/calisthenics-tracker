import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { TemplateForm } from "@/components/TemplateForm";
import { saveTemplate } from "@/lib/actions";
import { getTemplate, listExercises } from "@/lib/data";
import { toPickable } from "@/lib/pickable";

export default async function EditTemplate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      {async (user) => {
        const t = await getTemplate(user.id, id);
        if (!t) notFound();
        return (
          <>
            <h1 className="text-2xl font-bold">Edit {t.name}</h1>
            <TemplateForm
              action={saveTemplate.bind(null, t.id)}
              exercises={toPickable(await listExercises(user.id))}
              name={t.name}
              selectedIds={t.exercises.map((e) => e.id)}
              submitLabel="Save"
              unit={user.unit}
            />
          </>
        );
      }}
    </AppShell>
  );
}
