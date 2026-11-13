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
      {async ({ userId, user: userP }) => {
        const [user, t, exs] = await Promise.all([userP, getTemplate(userId, id), listExercises(userId)]);
        if (!t) notFound();
        return (
          <>
            <h1 className="text-2xl font-bold">Edit {t.name}</h1>
            <TemplateForm
              action={saveTemplate.bind(null, t.id)}
              exercises={toPickable(exs)}
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
