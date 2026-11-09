"use client";

import { useState } from "react";
import {
  DEFAULT_DURATION_SECONDS,
  DEFAULT_DURATION_SETS,
  DEFAULT_STRAIGHT_REPS,
  DEFAULT_STRAIGHT_SETS,
  PROGRESSION_HELP,
  PROGRESSION_LABELS,
  FORM_PROGRESSION_TYPES,
  type ProgressionType,
} from "@/lib/531";

export function ProgressionFields({
  progression: initialProp,
  setCount,
  repTarget,
  durationIncrement,
  jokersEnabled,
  unit,
  increment,
  onTypeChange,
}: {
  unit: string;
  increment: number;
  progression?: ProgressionType;
  setCount?: number | null;
  repTarget?: number | null;
  durationIncrement?: number | null;
  jokersEnabled?: boolean;
  onTypeChange?: (type: ProgressionType) => void;
}) {
  const [type, setType] = useState<ProgressionType>(initialProp ?? "531");
  return (
    <>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="progression">Progression type</label>
        <select
          id="progression"
          name="progression"
          value={type}
          onChange={(e) => {
            const t = e.target.value as ProgressionType;
            setType(t);
            onTypeChange?.(t);
          }}
          className="input"
        >
          {FORM_PROGRESSION_TYPES.map((t) => (
            <option key={t} value={t}>{PROGRESSION_LABELS[t]}</option>
          ))}
        </select>
        <p className="mt-1 text-xs opacity-70">{PROGRESSION_HELP[type]}</p>
      </div>
      <div>
        <label className="label" htmlFor="increment">
          {type === "straight_sets" || type === "duration" ? `Weight increase per successful week (${unit})` : `Increase per cycle (${unit})`}
        </label>
        <input key={type} id="increment" name="increment" type="number" step="any" min={type === "duration" ? "0" : "0.5"} required defaultValue={type === "duration" && !initialProp ? 0 : increment} className="input" />
      </div>
      {type === "straight_sets" && (
        <>
          <div>
            <label className="label" htmlFor="setCount">Sets</label>
            <input id="setCount" name="setCount" type="number" min="1" max="10" defaultValue={setCount ?? DEFAULT_STRAIGHT_SETS} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="repTarget">Reps per set</label>
            <input id="repTarget" name="repTarget" type="number" min="1" max="30" defaultValue={repTarget ?? DEFAULT_STRAIGHT_REPS} className="input" />
          </div>
          <p className="text-xs opacity-70 sm:col-span-2">
            The weight goes up next week only if you hit the target reps on at least half of your sets (at the target weight).
            Otherwise it stays the same. The deload week is at {Math.round(0.6 * 100)}% of your working weight.
          </p>
        </>
      )}
      {type === "duration" && (
        <>
          <div>
            <label className="label" htmlFor="setCount">Sets</label>
            <input id="setCount" name="setCount" type="number" min="1" max="10" defaultValue={setCount ?? DEFAULT_DURATION_SETS} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="repTarget">Seconds per set</label>
            <input id="repTarget" name="repTarget" type="number" min="1" max="3600" defaultValue={repTarget ?? DEFAULT_DURATION_SECONDS} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="durationIncrement">Seconds added per successful week (optional)</label>
            <input id="durationIncrement" name="durationIncrement" type="number" min="0" max="600" defaultValue={durationIncrement ?? ""} className="input" />
          </div>
          <p className="text-xs opacity-70 sm:col-span-2">
            Weight is optional: leave the training max blank for a bodyweight hold. Next week the weight and/or target time go up
            only if you hit the target time on at least half of your sets. Otherwise they stay the same.
          </p>
        </>
      )}
      {type === "531" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="jokersEnabled" defaultChecked={jokersEnabled} />
          Enable joker sets
        </label>
      )}
    </>
  );
}
