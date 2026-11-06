import { describe, expect, it } from "vitest";
import { parseSuggestion } from "./suggest";

describe("parseSuggestion", () => {
  it("returns a clean exercise name", () => {
    expect(parseSuggestion("Elevated pike HSPU")).toBe("Elevated pike HSPU");
    expect(parseSuggestion('"Elevated pike HSPU".')).toBe("Elevated pike HSPU");
    expect(parseSuggestion("**Wall-assisted HSPU**\nbecause it is harder")).toBe("Wall-assisted HSPU");
    expect(parseSuggestion("Next progression: Archer push-up")).toBe("Archer push-up");
    expect(parseSuggestion("- Tuck front lever")).toBe("Tuck front lever");
  });
  it("returns null when there is no suggestion", () => {
    expect(parseSuggestion("NONE")).toBeNull();
    expect(parseSuggestion("none.")).toBeNull();
    expect(parseSuggestion("   \n")).toBeNull();
    expect(parseSuggestion("x".repeat(80))).toBeNull();
  });
});
