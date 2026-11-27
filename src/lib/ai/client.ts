import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The Anthropic client, or `null` when `ANTHROPIC_API_KEY` isn't set.
 *
 * `null` is a normal answer, not an error: the app works without AI, and
 * everything the AI would have categorised simply stays "needs review".
 *
 * The key is read here and handed straight to the SDK. It is never logged,
 * returned to a caller or sent to the browser (`server-only` makes the build
 * fail if a client component ever imports this file).
 */

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // One client per server process, like the database client
  cached ??= new Anthropic({ apiKey });
  return cached;
}
