/**
 * Sanitize service/product names by stripping HTML entities and emojis.
 * Ensures clean, professional text display across the UI.
 */
export function sanitizeName(raw: string): string {
  if (!raw) return raw;

  let cleaned = raw
    // Decode numeric HTML entities (&#128274; &#127760; etc.) to actual chars first
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    // Decode hex HTML entities (&#x1F512;)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    // Decode named HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Remove any remaining undecoded HTML entities
    .replace(/&[a-zA-Z0-9#]+;/g, "");

  // Remove emoji characters (Unicode emoji ranges)
  cleaned = cleaned.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}\u{1F1E0}-\u{1F1FF}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}-\u{26AB}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}-\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/gu,
    ""
  );

  // Collapse multiple spaces and trim
  return cleaned.replace(/\s{2,}/g, " ").trim();
}
