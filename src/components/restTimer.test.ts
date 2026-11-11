import { describe, expect, it } from "vitest";

// Mirrors the storage format used by WorkoutForm's rest timer persistence.
function parseRestRaw(raw: string | null, now: number, maxAgeMs: number) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { ts: number; rest: { endsAt: number; total: number } };
    if (now - parsed.ts >= maxAgeMs) return null;
    return parsed.rest;
  } catch {
    return null;
  }
}

describe("rest timer persistence", () => {
  it("returns null for missing / invalid / expired payloads", () => {
    expect(parseRestRaw(null, 10_000, 5_000)).toBeNull();
    expect(parseRestRaw("not-json", 10_000, 5_000)).toBeNull();
    expect(
      parseRestRaw(JSON.stringify({ ts: 1_000, rest: { endsAt: 2_000, total: 30 } }), 10_000, 5_000),
    ).toBeNull();
  });

  it("returns rest payload when within max age", () => {
    const raw = JSON.stringify({ ts: 9_000, rest: { endsAt: 15_000, total: 60 } });
    expect(parseRestRaw(raw, 10_000, 5_000)).toEqual({ endsAt: 15_000, total: 60 });
  });
});
