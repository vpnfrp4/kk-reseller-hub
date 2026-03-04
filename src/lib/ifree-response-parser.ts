/**
 * Parse an ifreeicloud API response string into structured key-value pairs.
 * Handles HTML tags like <br>, <b>, etc. and "Key: Value" patterns.
 *
 * Also supports SickW beta JSON format where result fields are plain objects
 * (e.g. { "Manufacturer": "Apple", "Model Name": "iPhone 15" }).
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

/**
 * Parse a SickW beta-format JSON result object into key-value pairs.
 * Accepts a plain object with string/number values and maps them directly.
 */
export function parseSickwBetaResult(
  result: Record<string, unknown>
): { key: string; value: string }[] {
  const SKIP_KEYS = new Set(["status", "success", "error", "account_balance"]);
  const pairs: { key: string; value: string }[] = [];

  for (const [key, val] of Object.entries(result)) {
    if (SKIP_KEYS.has(key) || val == null || val === "") continue;
    if (typeof val === "object") continue; // skip nested objects/arrays
    pairs.push({ key, value: String(val) });
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
