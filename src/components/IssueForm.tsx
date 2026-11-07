"use client";

import { useRef, useState, useTransition } from "react";
import { submitIssue } from "@/lib/actions";

export function IssueForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      ref={formRef}
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setResult(null);
        startTransition(async () => {
          try {
            const r = await submitIssue(fd);
            if (r.ok) {
              form.reset();
              setResult({ ok: true, message: `Thanks! Your issue was submitted (#${r.number}).` });
            } else {
              setResult({ ok: false, message: r.error });
            }
          } catch {
            setResult({ ok: false, message: "Couldn't submit. Check your connection and try again." });
          }
        });
      }}
    >
      <div>
        <label className="label" htmlFor="kind">Type</label>
        <select id="kind" name="kind" className="input sm:max-w-xs" defaultValue="bug">
          <option value="bug">Bug</option>
          <option value="feature">Feature request</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input id="title" name="title" required minLength={5} maxLength={100} className="input" placeholder="Short summary" />
      </div>
      <div>
        <label className="label" htmlFor="details">Details</label>
        <textarea
          id="details"
          name="details"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          className="input"
          placeholder="What happened, or what would you like to see? Which page were you on?"
        />
        <p className="mt-1 text-xs opacity-70">Issues may be public. Don&apos;t include personal information.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" disabled={pending}>{pending ? "Submitting…" : "Submit issue"}</button>
        {result && (
          <p role={result.ok ? "status" : "alert"} className={`text-sm ${result.ok ? "text-green-600" : "text-red-600"}`}>
            {result.message}
          </p>
        )}
      </div>
    </form>
  );
}
