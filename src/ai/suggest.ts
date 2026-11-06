import { generateText } from "ai";
import { COACH_FALLBACK_MODELS, COACH_MODEL } from "./models";
import { COACH_PROMPT } from "./prompt";

/** Pull a clean exercise name out of a model reply, or null if there isn't one. */
export function parseSuggestion(raw: string): string | null {
  const line = raw
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (!line) return null;
  const name = line
    .replace(/^[-*>\d.\s"'`]+/, "")
    .replace(/["'`*.]+$/g, "")
    .replace(/^(next( progression)?|answer)\s*[:\-]\s*/i, "")
    .trim();
  if (!name || /^none\b/i.test(name) || name.length > 60) return null;
  return name;
}

/**
 * Ask the coach model (same free gateway models and prompt as the chat) for the next, harder
 * variation of a bodyweight exercise. Returns null when there is no sensible suggestion.
 */
export async function suggestNextProgression(exerciseName: string, userId: string): Promise<string | null> {
  const { text } = await generateText({
    model: COACH_MODEL,
    system: COACH_PROMPT,
    prompt: `The user is adding the bodyweight-only exercise "${exerciseName}". Name the single next, harder progression or variation a calisthenics athlete would move on to once they have mastered it (for example: Pike HSPU -> Elevated pike HSPU). Reply with ONLY the exercise name, nothing else. If it is already the hardest variation, reply NONE.`,
    // The free models are reasoning models: thinking tokens count against this limit, and
    // a small cap leaves the visible answer empty (finishReason "length").
    maxOutputTokens: 4000,
    reasoning: "low",
    timeout: 45_000,
    providerOptions: {
      gateway: { models: COACH_FALLBACK_MODELS, user: userId, tags: ["coach", "next-progression"] },
    },
  });
  return parseSuggestion(text);
}
