/**
 * Parse an ifreeicloud API response string into structured key-value pairs.
 * Handles HTML tags like <br>, <b>, etc. and "Key: Value" patterns.
 */
export function parseIfreeResponse(raw: string): { key: string; value: string }[] {
  // Strip all HTML tags, convert <br> variants to newlines first
  const cleaned = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const pairs: { key: string; value: string }[] = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 40) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (key && value) {
        pairs.push({ key, value });
        continue;
      }
    }
    // Fallback: treat entire line as a value with no key
    pairs.push({ key: "", value: line });
  }

  return pairs;
}

/** Clean raw HTML from a response string into plain text with newlines */
export function cleanIfreeResponse(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();
}
