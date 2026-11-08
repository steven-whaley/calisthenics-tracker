import { timingSafeEqual } from "node:crypto";

/** Fixed identity of the shared test user (never a real Google account). */
export const TEST_USER = {
  googleSub: "local-test-user",
  email: "test-user@example.invalid",
  name: "Test User",
} as const;

/**
 * The test login exists only when the ENABLE_TEST_LOGIN flag is "true" and a password is configured.
 * Vercel Production is refused regardless of the flag (defense in depth).
 */
export function testLoginEnabled(): boolean {
  return (
    process.env.ENABLE_TEST_LOGIN === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    !!process.env.TEST_USER_PASSWORD
  );
}

export function testPasswordMatches(input: unknown): boolean {
  const expected = process.env.TEST_USER_PASSWORD;
  if (!testLoginEnabled() || !expected || typeof input !== "string") return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
