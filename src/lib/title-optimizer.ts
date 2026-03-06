/**
 * Product Name Optimization Engine
 * 
 * Standardized format: [Brand/Carrier] [Device/Model] [Core Function] - [Key Features] [Delivery Method] [Warranty]
 * Examples:
 *   "Apple iPhone iCloud Unlock - Clean IMEI, Instant Delivery, Lifetime Warranty"
 *   "AT&T Samsung Galaxy SIM Unlock - All Models, 1-6 Hours, 30 Days Warranty"
 *   "Netflix Premium Account - 1 Year, No 2FA, Instant Delivery"
 */

export interface OptimizedTitle {
  displayTitle: string;
  shortTitle: string;
  seoSlug: string;
}

export interface ProductMetadata {
  category: string;
  duration: string;
  processingTime: string;
  warranty: string;
  icon: string;
  productType: "digital" | "imei" | "manual" | "api";
}

export interface AutoBuildResult extends OptimizedTitle {
  meta: ProductMetadata;
  productCode: string;
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

/* ─── Brand/Carrier Detection ─── */
const KNOWN_BRANDS = [
  "Apple", "Samsung", "iPhone", "iPad", "MacBook", "Google", "Pixel",
  "Huawei", "Xiaomi", "OnePlus", "LG", "Motorola", "Sony", "Nokia",
  "Oppo", "Vivo", "Realme", "ZTE", "Alcatel", "HTC",
  "Netflix", "Spotify", "Canva", "CapCut", "ChatGPT", "Adobe",
  "Microsoft", "Windows", "Office", "NordVPN", "ExpressVPN", "Surfshark",
];

const KNOWN_CARRIERS = [
  "AT&T", "T-Mobile", "Sprint", "Verizon", "Cricket", "MetroPCS",
  "Boost", "US Cellular", "Tracfone", "Straight Talk", "Xfinity",
  "EE", "Vodafone", "O2", "Three", "Rogers", "Bell", "Telus",
];

const CORE_FUNCTIONS = [
  "Unlock", "Check", "Remove", "Reset", "Bypass", "Activation",
  "Account", "Subscription", "Premium", "Pro", "License", "Key",
  "Followers", "Likes", "Views", "Comments", "Members", "Subscribers",
];

const DELIVERY_KEYWORDS: Record<string, string> = {
  "instant": "Instant Delivery",
  "24/7": "24/7 Delivery",
  "automatic": "Auto Delivery",
  "auto": "Auto Delivery",
};

function normalizeKeywords(name: string): string {
  let result = name;
  for (const [raw, normalized] of Object.entries(KEYWORD_MAP)) {
    const regex = new RegExp(`\\b${raw}\\b`, "gi");
    result = result.replace(regex, normalized);
  }
  return result;
}

function removeDuplicateWords(name: string): string {
  const tokens = name.match(/\S+&\S+|\S+/g) || [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
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
    const regex = new RegExp(`\\b${sw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
    result = result.replace(regex, " ");
  }
  return result.replace(/\s+/g, " ").trim();
}

function cleanPunctuation(name: string): string {
  return name
    .replace(/[^\w\s\-/&().+#',]/g, "")
    .replace(/\s*[-–—]\s*[-–—]\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalizeWords(text: string): string {
  const lowerWords = new Set(["for", "and", "or", "the", "a", "an", "in", "on", "to", "of", "with"]);
  return text
    .split(" ")
    .map((word, i) => {
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

/**
 * Extract structured parts from a raw product name and reassemble
 * into the standardized format:
 * [Brand/Carrier] [Device/Model] [Core Function] - [Key Features], [Delivery], [Warranty]
 */
function structureName(cleanedName: string, rawName: string): string {
  const lower = rawName.toLowerCase();
  const words = cleanedName.split(/\s+/);

  // Extract brand
  const brand = KNOWN_BRANDS.find(b =>
    lower.includes(b.toLowerCase())
  ) || "";

  // Extract carrier
  const carrier = KNOWN_CARRIERS.find(c =>
    lower.includes(c.toLowerCase())
  ) || "";

  // Extract core function
  const coreFunction = CORE_FUNCTIONS.find(f =>
    lower.includes(f.toLowerCase())
  ) || "";

  // Extract delivery method
  let delivery = "";
  for (const [kw, label] of Object.entries(DELIVERY_KEYWORDS)) {
    if (lower.includes(kw)) {
      delivery = label;
      break;
    }
  }

  // Extract duration
  const durationMatch = lower.match(/(\d+)\s*(year|month|week|day)s?/i);
  const duration = durationMatch
    ? `${durationMatch[1]} ${durationMatch[2].charAt(0).toUpperCase() + durationMatch[2].slice(1)}${parseInt(durationMatch[1]) > 1 ? "s" : ""}`
    : /\blifetime\b/i.test(lower) ? "Lifetime" : "";

  // Extract warranty
  const warrantyMatch = lower.match(/(\d+)\s*(hour|day|month|year)s?\s*warranty/i);
  const warranty = warrantyMatch
    ? `${warrantyMatch[1]} ${warrantyMatch[2].charAt(0).toUpperCase() + warrantyMatch[2].slice(1)}${parseInt(warrantyMatch[1]) > 1 ? "s" : ""} Warranty`
    : /\blifetime\s*warranty\b/i.test(lower) ? "Lifetime Warranty"
    : /\bwarranty\b/i.test(lower) ? "Warranty Included" : "";

  // Collect remaining meaningful words not already captured
  const usedTerms = new Set<string>();
  [brand, carrier, coreFunction, delivery, duration, warranty].forEach(term => {
    if (term) term.split(/\s+/).forEach(w => usedTerms.add(w.toLowerCase()));
  });
  // Also mark DELIVERY_KEYWORDS keys
  Object.keys(DELIVERY_KEYWORDS).forEach(k => usedTerms.add(k));

  const remaining = words.filter(w => !usedTerms.has(w.toLowerCase()) && w.length > 1);

  // Build primary part: [Brand/Carrier] [remaining context] [Core Function]
  const primaryParts: string[] = [];
  if (carrier) primaryParts.push(carrier);
  if (brand && brand.toLowerCase() !== carrier.toLowerCase()) primaryParts.push(brand);
  if (remaining.length > 0) primaryParts.push(...remaining.slice(0, 3));
  if (coreFunction && !primaryParts.some(p => p.toLowerCase() === coreFunction.toLowerCase())) {
    primaryParts.push(coreFunction);
  }

  // Build feature suffix
  const featureParts: string[] = [];
  if (duration) featureParts.push(duration);
  if (delivery) featureParts.push(delivery);
  if (warranty) featureParts.push(warranty);

  const primary = primaryParts.join(" ");

  if (featureParts.length > 0) {
    return `${primary} - ${featureParts.join(", ")}`;
  }

  return primary;
}

function generateShortTitle(displayTitle: string): string {
  // For structured names, use the part before the dash
  const dashIndex = displayTitle.indexOf(" - ");
  if (dashIndex > 0) {
    const primary = displayTitle.substring(0, dashIndex);
    const words = primary.split(/\s+/);
    return words.length <= 5 ? primary : words.slice(0, 4).join(" ");
  }

  const words = displayTitle.split(/\s+/);
  if (words.length <= 4) return displayTitle;

  const importantPatterns = [
    /^\d+/,
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

  return words.slice(0, 4).join(" ");
}

export function optimizeTitle(rawName: string): OptimizedTitle {
  if (!rawName.trim()) {
    return { displayTitle: "", shortTitle: "", seoSlug: "" };
  }

  let title = rawName.trim();
  title = normalizeKeywords(title);
  title = cleanPunctuation(title);
  title = removeStopWords(title);
  title = removeDuplicateWords(title);
  title = capitalizeWords(title);
  title = title.replace(/\s+/g, " ").trim();

  // Apply standardized structuring
  const displayTitle = structureName(title, rawName);
  const shortTitle = generateShortTitle(displayTitle);
  const seoSlug = generateSlug(displayTitle);

  return { displayTitle, shortTitle, seoSlug };
}

/* ═══════════════════════════════════════════════════════
   AUTO-BUILD INTELLIGENCE ENGINE
   ═══════════════════════════════════════════════════════ */

function generateProductCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "PRD-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ─── Category Detection ─── */
function detectCategory(raw: string): { category: string; productType: "digital" | "imei" | "manual" | "api"; icon: string } {
  const lower = raw.toLowerCase();

  if (/\b(imei|unlock|carrier|network unlock|sim unlock|frp|icloud|bypass)\b/i.test(lower)) {
    return { category: "IMEI Unlock", productType: "imei", icon: "phone" };
  }

  if (/\b(api|dhru|server|endpoint|credit)\b/i.test(lower)) {
    return { category: "API Services", productType: "api", icon: "plug" };
  }

  if (/\b(license|activation|dongle|tool|box|key|pc|hardware|umt|octoplus|z3x|miracle|chimera|unlocktool)\b/i.test(lower)) {
    return { category: "Hardware Tools", productType: "manual", icon: "wrench" };
  }

  if (/\b(account|subscription|premium|pro|vpn|netflix|spotify|canva|capcut|chatgpt|2fa|usa|email|id)\b/i.test(lower)) {
    return { category: "Digital Accounts", productType: "digital", icon: "monitor" };
  }

  return { category: "General", productType: "digital", icon: "package" };
}

/* ─── Duration Detection ─── */
function detectDuration(raw: string): string {
  const lower = raw.toLowerCase();

  const durationMatch = lower.match(/(\d+)\s*(year|month|week|day|hour)s?/i);
  if (durationMatch) {
    const num = durationMatch[1];
    const unit = durationMatch[2].charAt(0).toUpperCase() + durationMatch[2].slice(1);
    return `${num} ${unit}${parseInt(num) > 1 && !unit.endsWith("s") ? "s" : ""}`;
  }

  if (/\blifetime\b/i.test(lower)) return "Lifetime";
  if (/\bannual\b/i.test(lower)) return "1 Year";
  if (/\bmonthly\b/i.test(lower)) return "1 Month";
  if (/\bweekly\b/i.test(lower)) return "1 Week";

  return "";
}

/* ─── Delivery Time Detection ─── */
function detectDeliveryTime(raw: string): string {
  const lower = raw.toLowerCase();

  if (/\binstant\b/i.test(lower)) return "Instant";
  if (/\b24\s*\/?\s*7\b/.test(lower)) return "Instant - 24/7";

  const rangeMatch = lower.match(/(\d+)\s*[-–]\s*(\d+)\s*(hour|minute|day|hr|min)s?/i);
  if (rangeMatch) {
    const unit = rangeMatch[3].replace(/^hr$/i, "Hour").replace(/^min$/i, "Minute");
    const unitCap = unit.charAt(0).toUpperCase() + unit.slice(1);
    return `${rangeMatch[1]}-${rangeMatch[2]} ${unitCap}s`;
  }

  const singleMatch = lower.match(/(\d+)\s*(hour|minute|day|hr|min)s?/i);
  if (singleMatch) {
    const num = parseInt(singleMatch[1]);
    const rawUnit = singleMatch[2].toLowerCase();
    if (rawUnit.startsWith("hour") || rawUnit === "hr") {
      if (num <= 1) return "Instant";
      if (num <= 6) return "1-6 Hours";
      if (num <= 24) return "1-24 Hours";
      if (num <= 48) return "1-3 Days";
      return "3-7 Days";
    }
    if (rawUnit.startsWith("day")) {
      if (num <= 1) return "1-24 Hours";
      if (num <= 3) return "1-3 Days";
      if (num <= 5) return "2-5 Days";
      return "3-7 Days";
    }
  }

  return "";
}

/* ─── Warranty Detection ─── */
function detectWarranty(raw: string): string {
  const lower = raw.toLowerCase();

  const warrantyMatch = lower.match(/(\d+)\s*(h|hr|hour|day|month|year)s?\s*warranty/i);
  if (warrantyMatch) {
    const num = warrantyMatch[1];
    const rawUnit = warrantyMatch[2].toLowerCase();
    const unitMap: Record<string, string> = { h: "Hour", hr: "Hour", hour: "Hour", day: "Day", month: "Month", year: "Year" };
    const unit = unitMap[rawUnit] || rawUnit;
    return `${num} ${unit}${parseInt(num) > 1 ? "s" : ""} Warranty`;
  }

  if (/\bwarranty\b/i.test(lower)) return "Warranty Included";
  if (/\bguarantee\b/i.test(lower)) return "Guaranteed";

  return "";
}

/* ─── Full Auto-Build ─── */
export function autoBuildProduct(rawName: string): AutoBuildResult {
  const titleResult = optimizeTitle(rawName);
  const { category, productType, icon } = detectCategory(rawName);
  const duration = detectDuration(rawName);
  const processingTime = detectDeliveryTime(rawName);
  const warranty = detectWarranty(rawName);
  const productCode = generateProductCode();

  return {
    ...titleResult,
    productCode,
    meta: {
      category,
      duration,
      processingTime,
      warranty,
      icon,
      productType,
    },
  };
}
