"use client";

/** Opens or closes every <details> inside the element with the given id. */
export function ExpandAll({ targetId }: { targetId: string }) {
  function set(open: boolean) {
    document.querySelectorAll<HTMLDetailsElement>(`#${targetId} details`).forEach((d) => (d.open = open));
  }
  return (
    <div className="flex gap-2 text-sm">
      <button type="button" className="btn-ghost" onClick={() => set(true)}>Expand all</button>
      <button type="button" className="btn-ghost" onClick={() => set(false)}>Collapse all</button>
    </div>
  );
}
