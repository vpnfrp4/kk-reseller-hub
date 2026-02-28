/**
 * Product Name Optimization Engine
 * 
 * Takes raw admin-entered service names and produces:
 * - Clean Display Title (marketplace-ready)
 * - Short Title (compact variant)
 * - SEO Slug
 */

export interface OptimizedTitle {
  displayTitle: string;
  shortTitle: string;
  seoSlug: string;
}

/* ─── Stop words to remove for cleanliness ─── */
const STOP_WORDS = [
  "services", "service", "the", "for", "with", "a", "an",
  "new", "best", "top", "great", "amazing", "super", "mega",
  "special", "exclusive", "limited", "premium quality", "high quality",
  "100%", "guaranteed",
];

/* ─── Keyword normalization map ─── */
const KEYWORD_MAP: Record<string, string> = {
  "united states": "USA",
  "us region": "USA",
  "twenty four seven": "24/7",
  "twenty-four-seven": "24/7",
  "without 2fa": "No 2FA",
  "no two factor": "No 2FA",
  "without two factor": "No 2FA",
  "with 2fa": "2FA Enabled",
  "one year": "1 Year",
  "two year": "2 Year",
  "three year": "3 Year",
  "1year": "1 Year",
  "2year": "2 Year",
  "3year": "3 Year",
  "1 yr": "1 Year",
  "2 yr": "2 Year",
  "3 yr": "3 Year",
  "twelve month": "12 Month",
  "six month": "6 Month",
  "three month": "3 Month",
  "one month": "1 Month",
  "personal computer": "PC",
  "apple id": "Apple ID",
  "icloud": "iCloud",
  "frp": "FRP",
  "imei": "IMEI",
  "sim": "SIM",
  "vpn": "VPN",
  "api": "API",
};

function normalizeKeywords(name: string): string {
  let result = name;
  // Apply keyword map (case-insensitive)
  for (const [raw, normalized] of Object.entries(KEYWORD_MAP)) {
    const regex = new RegExp(`\\b${raw}\\b`, "gi");
    result = result.replace(regex, normalized);
  }
  return result;
}

function removeDuplicateWords(name: string): string {
  // Tokenize preserving compound terms like AT&T
  const tokens = name.match(/\S+&\S+|\S+/g) || [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
    // Allow short words, connectors, and numbers to repeat
    if (lower.length <= 2 || !seen.has(lower)) {
      seen.add(lower);
      result.push(token);
    }
  }
  return result.join(" ");
}

function removeStopWords(name: string): string {
  let result = name;
  for (const sw of STOP_WORDS) {
    // Use word boundaries to avoid partial matches; case insensitive
    const regex = new RegExp(`\\b${sw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
    result = result.replace(regex, " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

function cleanPunctuation(name: string): string {
  return name
    .replace(/[^\w\s\-/&().+#']/g, "")
    .replace(/\s*[-–—]\s*[-–—]\s*/g, " – ")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeWords(text: string): string {
  const lowerWords = new Set(["for", "and", "or", "the", "a", "an", "in", "on", "to", "of", "with"]);
  return text
    .split(" ")
    .map((word, i) => {
      // Always capitalize first word and acronyms
      if (i === 0 || word === word.toUpperCase()) return word;
      if (lowerWords.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateShortTitle(displayTitle: string): string {
  // Extract core product + key qualifier
  const words = displayTitle.split(/\s+/);
  
  // If already short enough, return as-is
  if (words.length <= 4) return displayTitle;
  
  // Keep important terms: brand names, durations, key qualifiers
  const importantPatterns = [
    /^\d+/,           // Numbers (durations)
    /^(USA|API|VPN|FRP|IMEI|SIM|PC|2FA|iCloud|Pro|Premium|Clean)$/i,
    /^(Year|Month|Day|Week|Hour)s?$/i,
    /^(iPhone|Samsung|Apple|AT&T|T-Mobile|Sprint|Verizon)$/i,
    /^(Unlock|Check|Remove|Reset|Bypass)$/i,
    /^(ID|No)$/i,
  ];

  const important = words.filter(w => importantPatterns.some(p => p.test(w)));
  
  if (important.length >= 2 && important.length <= 5) {
    return important.join(" ");
  }
  
  // Fallback: first 4 meaningful words
  return words.slice(0, 4).join(" ");
}

export function optimizeTitle(rawName: string): OptimizedTitle {
  if (!rawName.trim()) {
    return { displayTitle: "", shortTitle: "", seoSlug: "" };
  }

  // Pipeline
  let title = rawName.trim();
  title = normalizeKeywords(title);
  title = cleanPunctuation(title);
  title = removeStopWords(title);
  title = removeDuplicateWords(title);
  title = capitalizeWords(title);

  // Final cleanup
  title = title.replace(/\s+/g, " ").trim();

  const displayTitle = title;
  const shortTitle = generateShortTitle(displayTitle);
  const seoSlug = generateSlug(displayTitle);

  return { displayTitle, shortTitle, seoSlug };
}
