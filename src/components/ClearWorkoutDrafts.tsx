"use client";

import { useEffect } from "react";

/** After a workout is saved, remove any unfinished-workout drafts kept on this device. */
export function ClearWorkoutDrafts() {
  useEffect(() => {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith("wf:")) localStorage.removeItem(k);
    } catch {}
  }, []);
  return null;
}
