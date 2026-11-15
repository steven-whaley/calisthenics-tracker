import { describe, expect, it } from "vitest";
import { parseYouTubeId } from "./youtube";

describe("parseYouTubeId", () => {
  const id = "dQw4w9WgXcQ";
  it("accepts ids and common URL shapes", () => {
    for (const s of [
      id,
      `https://www.youtube.com/watch?v=${id}&t=30s`,
      `https://youtu.be/${id}?si=x`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `youtube.com/watch?v=${id}`,
    ]) expect(parseYouTubeId(s)).toBe(id);
  });
  it("rejects other input", () => {
    for (const s of ["", "hello world", "https://example.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=short", "https://evil.com/youtu.be/dQw4w9WgXcQ"])
      expect(parseYouTubeId(s)).toBeNull();
  });
});
