import { describe, expect, it } from "vitest";
import { advance, evaluateStraightSets, jokerSet, mainSets, projectBlock, roundWeight, type ProgressionState } from "./531";

const base: ProgressionState = {
  trainingMax: 100,
  increment: 5,
  cyclesPerBlock: 2,
  currentCycle: 1,
  currentWeek: 1,
  blockNumber: 1,
};

describe("531", () => {
  it("rounds weights", () => {
    expect(roundWeight(86.3, 5)).toBe(85);
    expect(roundWeight(86.1, 2.5)).toBe(85);
    expect(roundWeight(87.6, 2.5)).toBe(87.5);
  });
  it("computes week 3 sets", () => {
    const s = mainSets(200, 3, 5);
    expect(s.map((x) => x.weight)).toEqual([150, 170, 190]);
    expect(s[2].amrap).toBe(true);
  });
  it("runs multiple cycles before deload then restarts", () => {
    let s = base;
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      seen.push(`${s.blockNumber}:${s.currentCycle}:${s.currentWeek}:${s.trainingMax}`);
      s = advance(s);
    }
    expect(seen).toEqual([
      "1:1:1:100", "1:1:2:100", "1:1:3:100",
      "1:2:1:105", "1:2:2:105", "1:2:3:105",
      "1:2:4:110", "2:1:1:110",
    ]);
  });
  it("jokers step up 5% past the top set", () => {
    expect(jokerSet(200, 1, 5, 0)).toMatchObject({ pct: 0.9, weight: 180, reps: 3 });
    expect(jokerSet(200, 3, 5, 1)).toMatchObject({ pct: 1.05, weight: 210, reps: 1 });
  });
  it("projects block with deload", () => {
    const p = projectBlock(100, 5, 3, 5);
    expect(p).toHaveLength(4);
    expect(p[3].cycle).toBe("deload");
    expect(p[3].trainingMax).toBe(115);
  });
  it("builds pyramid sets climbing in weight and dropping in reps", () => {
    const s = mainSets(200, 1, 5, { type: "pyramid" });
    expect(s.map((x) => x.weight)).toEqual([120, 140, 150, 160]);
    expect(s.map((x) => x.reps)).toEqual([10, 8, 6, 4]);
    expect(s.some((x) => x.amrap)).toBe(false);
  });
  it("builds reverse pyramid with the heaviest set first", () => {
    const s = mainSets(200, 2, 5, { type: "reverse_pyramid" });
    expect(s.map((x) => x.weight)).toEqual([170, 155, 140]);
    expect(s.map((x) => x.reps)).toEqual([5, 7, 9]);
  });
  it("builds straight sets with configurable sets and reps", () => {
    const s = mainSets(200, 3, 5, { type: "straight_sets", setCount: 3, repTarget: 8 });
    expect(s).toHaveLength(3);
    expect(s.every((x) => x.weight === 200 && x.reps === 8)).toBe(true);
    expect(mainSets(200, 4, 5, { type: "straight_sets" })[0].weight).toBe(120);
    expect(mainSets(200, 1, 5, { type: "straight_sets" })).toHaveLength(5);
  });
  it("projects non-531 blocks including deload", () => {
    const p = projectBlock(100, 5, 2, 5, { type: "pyramid" });
    expect(p).toHaveLength(3);
    expect(p[2].weeks[0].sets).toHaveLength(3);
  });
  it("passes straight sets only when reps are hit on at least half the sets", () => {
    const set = (r: number | null, w: number | null = 100) => ({ targetWeight: 100, targetReps: 5, actualWeight: w, actualReps: r });
    expect(evaluateStraightSets([set(5), set(5), set(3), set(2)])).toEqual({ hit: 2, total: 4, passed: true });
    expect(evaluateStraightSets([set(5), set(4), set(3), set(2)]).passed).toBe(false);
    expect(evaluateStraightSets([set(6), set(5), set(null)]).passed).toBe(true); // 2 of 3
    expect(evaluateStraightSets([set(5, 90), set(5, 90)]).passed).toBe(false); // lighter than target
    expect(evaluateStraightSets([set(5, null), set(5, null)]).passed).toBe(true); // blank weight = target
  });
  it("does not bump the training max at cycle end when told not to", () => {
    const s = advance({ ...base, currentWeek: 3 }, { bumpAtCycleEnd: false });
    expect(s.trainingMax).toBe(100);
    expect(s.currentCycle).toBe(2);
  });
});
