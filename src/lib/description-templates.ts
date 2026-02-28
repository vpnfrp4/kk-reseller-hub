/**
 * Universal Description Template Engine
 * Generates structured, professional product descriptions
 * based on category, product metadata, and selected mode.
 *
 * Modes:
 *  - ultra-short: 5-line max, bullet-only, keyword-extracted
 *  - standard:    7-section structured description
 *  - seo-full:    SEO-optimized extended description
 */

export type DescriptionMode = "ultra-short" | "standard" | "seo-full";

export interface DescriptionInput {
  name: string;
  category: string;
  productType: string;
  duration: string;
  processingTime?: string;
  brand?: string;
  carrier?: string;
  country?: string;
}

type CategoryKey = "unlock" | "hardware" | "digital" | "api" | "general";

/* ────────────────────────────────────────────
   Keyword extraction utilities
   ──────────────────────────────────────────── */

function extractKeywords(name: string) {
  const n = name.toLowerCase();
  return {
    hasPremium: /premium/i.test(n),
    hasClean: /clean/i.test(n),
    hasFRP: /frp/i.test(n),
    hasICloud: /icloud/i.test(n),
    hasUSA: /usa|united states|us region/i.test(n),
    has2FA: /2fa/i.test(n),
    hasWithout2FA: /without 2fa|no 2fa/i.test(n),
    hasAuto: /auto/i.test(n),
    has247: /24\/7|24-7/i.test(n),
    hasInstant: /instant/i.test(n),
    hasAPI: /api/i.test(n),
    // Extract durations like "1 Year", "6 Month"
    durationMatch: n.match(/(\d+)\s*(year|month|day|week)s?/i),
    // Extract device counts like "3 PC", "5 Users"
    deviceMatch: n.match(/(\d+)\s*(pc|user|device|license)s?/i),
    // Extract warranty hours like "48 Hours"
    warrantyMatch: n.match(/(\d+)\s*hours?/i),
    // Carrier/Network detection
    hasCarrier: /carrier|network/i.test(n),
    hasIMEI: /imei/i.test(n),
  };
}

function cleanTitle(name: string): string {
  // Remove redundant keywords for clean title
  return name
    .replace(/\s*-\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ────────────────────────────────────────────
   Category detection
   ──────────────────────────────────────────── */

function detectCategory(category: string, productType: string): CategoryKey {
  const cat = category.toLowerCase();
  if (productType === "imei" || cat.includes("imei") || cat.includes("unlock") || cat.includes("gsm")) return "unlock";
  if (cat.includes("hardware") || cat.includes("repair") || cat.includes("tool") || cat.includes("license") || cat.includes("activation")) return "hardware";
  if (productType === "api") return "api";
  if (productType === "digital" || cat.includes("account") || cat.includes("subscription") || cat.includes("vpn") || cat.includes("editing") || cat.includes("ai") || cat.includes("creative")) return "digital";
  if (productType === "manual") return "general";
  return "general";
}

/* ═══════════════════════════════════════════
   ULTRA SHORT MODE — 5 lines max, bullets only
   ═══════════════════════════════════════════ */

function ultraShortUnlock(input: DescriptionInput): string {
  const kw = extractKeywords(input.name);
  const title = cleanTitle(input.name);
  const time = input.processingTime || "1-3 Days";
  const lines: string[] = [title, ""];

  // Type line
  if (kw.hasFRP) lines.push("- Type: FRP Removal Service");
  else if (kw.hasICloud) lines.push("- Type: iCloud Unlock");
  else if (kw.hasCarrier || kw.hasIMEI) lines.push("- Type: IMEI / Carrier Unlock");
  else lines.push("- Type: Network Unlock");

  // Processing
  if (kw.hasInstant) lines.push("- Processing: Instant");
  else lines.push(`- Processing: ${time}`);

  // Conditional keywords
  if (kw.hasClean) lines.push("- Clean IMEI Only");
  else if (kw.hasPremium) lines.push("- High Success Rate");
  else if (input.carrier) lines.push(`- Carrier: ${input.carrier}`);
  else if (input.brand) lines.push(`- Supported: ${input.brand}`);

  // Warranty
  if (kw.warrantyMatch) lines.push(`- Warranty: ${kw.warrantyMatch[1]} Hours`);
  else lines.push("- Warranty: Replacement if failed");

  return lines.slice(0, 7).join("\n");
}

function ultraShortHardware(input: DescriptionInput): string {
  const kw = extractKeywords(input.name);
  const title = cleanTitle(input.name);
  const lines: string[] = [title, ""];

  // License duration
  if (kw.durationMatch) lines.push(`- License: ${kw.durationMatch[1]} ${kw.durationMatch[2].charAt(0).toUpperCase() + kw.durationMatch[2].slice(1)}`);
  else if (input.duration) lines.push(`- License: ${input.duration}`);
  else lines.push("- License: As specified");

  // Device count
  if (kw.deviceMatch) lines.push(`- Devices: ${kw.deviceMatch[1]} ${kw.deviceMatch[2].toUpperCase()}`);
  else lines.push("- Delivery: Instant Code");

  // Renewal
  lines.push("- Renewal: Available");

  // Warranty
  lines.push("- Warranty: Replacement if failed");

  return lines.slice(0, 7).join("\n");
}

function ultraShortDigital(input: DescriptionInput): string {
  const kw = extractKeywords(input.name);
  const title = cleanTitle(input.name);
  const lines: string[] = [title, ""];

  // Region
  if (kw.hasUSA) lines.push("- Region: USA");
  else lines.push("- Region: Global");

  // 2FA
  if (kw.hasWithout2FA) lines.push("- 2FA: Not Included");
  else if (kw.has2FA) lines.push("- 2FA: Enabled");
  else lines.push("- Delivery: Instant");

  // Processing
  if (kw.hasAuto) lines.push("- Processing: Auto");
  else if (kw.hasInstant) lines.push("- Processing: Instant");
  else lines.push("- Usage: Full Access");

  // Warranty
  if (kw.warrantyMatch) lines.push(`- Warranty: ${kw.warrantyMatch[1]} Hours`);
  else lines.push("- Warranty: Replacement if failed");

  return lines.slice(0, 7).join("\n");
}

function ultraShortAPI(input: DescriptionInput): string {
  const title = cleanTitle(input.name);
  const kw = extractKeywords(input.name);
  const lines: string[] = [title, ""];

  lines.push("- Type: Automated API");
  lines.push(kw.has247 ? "- Availability: 24/7" : "- Availability: On-demand");
  lines.push("- Response: Real-Time");
  lines.push("- Bulk Support: Yes");

  return lines.slice(0, 7).join("\n");
}

function ultraShortGeneral(input: DescriptionInput): string {
  const title = cleanTitle(input.name);
  const kw = extractKeywords(input.name);
  const lines: string[] = [title, ""];

  if (kw.hasInstant) lines.push("- Delivery: Instant");
  else lines.push("- Delivery: As specified");

  if (input.duration) lines.push(`- Duration: ${input.duration}`);
  else lines.push("- Processing: Standard");

  lines.push("- Warranty: Replacement if failed");
  lines.push("- Volume Pricing: Available");

  return lines.slice(0, 7).join("\n");
}

/* ═══════════════════════════════════════════
   STANDARD MODE — 7-section structured
   ═══════════════════════════════════════════ */

function unlockTemplate(input: DescriptionInput): string {
  const { name, processingTime, brand, carrier, country } = input;
  const brandText = brand || "All supported brands";
  const carrierText = carrier || "All carriers";
  const countryText = country || "Global";
  const timeText = processingTime || "1-3 Days";

  return `SERVICE OVERVIEW
${name} — server-based IMEI unlock service routed through verified provider infrastructure. Permanent unlock registered in the carrier activation database.

KEY FEATURES
- Official server-side unlock — warranty-safe
- Permanent activation — persists through updates and resets
- Structured provider routing for consistent results
- Real-time order status tracking via dashboard

DELIVERY TIME
- Estimated processing: ${timeText}
- Status updates delivered through the platform

WARRANTY / GUARANTEE
- Replacement provided if unlock fails on first verified attempt

COMPATIBILITY / REQUIREMENTS
- Brand: ${brandText}
- Carrier: ${carrierText}
- Region: ${countryText}
- IMEI submission required (dial *#06#)
- Device must have clean status

RESELLER ADVANTAGE
- Volume-based pricing tiers
- Automated order routing
- Secure delivery through controlled platform

IMPORTANT NOTES
- Processing times subject to carrier availability
- Results final once registered in activation database`;
}

function hardwareTemplate(input: DescriptionInput): string {
  const { name, duration } = input;
  const durationText = duration || "As specified";

  return `SERVICE OVERVIEW
${name} — professional activation and licensing solution. Delivered through secure provisioning within the platform.

KEY FEATURES
- Official license activation — verified source
- Structured delivery through platform dashboard
- Compatible with standard repair workflows

DELIVERY TIME
- License delivery: Immediate upon order confirmation

WARRANTY / GUARANTEE
- Replacement provided if activation fails on first use
- License validity: ${durationText}

COMPATIBILITY / REQUIREMENTS
- Device count: As specified per license tier
- Internet connection required for initial activation
- Renewal terms apply as per license agreement

RESELLER ADVANTAGE
- Volume pricing for multi-license orders
- Instant processing
- Secure license delivery

IMPORTANT NOTES
- Licenses are non-transferable once activated
- No refund after activation completed`;
}

function digitalTemplate(input: DescriptionInput): string {
  const { name, duration } = input;
  const durationText = duration || "As specified";

  return `SERVICE OVERVIEW
${name} — secure digital account provisioned for controlled reseller distribution. Instant delivery with structured credential management.

KEY FEATURES
- Verified account provisioning
- Instant credential delivery via dashboard
- Structured for reseller redistribution

DELIVERY TIME
- Instant delivery upon successful order

WARRANTY / GUARANTEE
- Replacement within 24 hours if non-functional on first access
- Validity period: ${durationText}

COMPATIBILITY / REQUIREMENTS
- Region and restrictions as specified
- 2FA status: As per account specifications
- Usage restrictions apply per account terms

RESELLER ADVANTAGE
- Instant processing
- Volume-ready pricing
- Secure credential delivery

IMPORTANT NOTES
- Credentials are single-use
- No refund once credentials accessed`;
}

function apiTemplate(input: DescriptionInput): string {
  const { name, duration } = input;
  const durationText = duration || "Per request";

  return `SERVICE OVERVIEW
${name} — automated service processed through integrated API infrastructure. Real-time request handling.

KEY FEATURES
- 24/7 automated processing
- Real-time API response and status updates
- Volume-capable processing infrastructure

DELIVERY TIME
- Processing: Real-time / As per API response time

WARRANTY / GUARANTEE
- Retry or replacement for failed API requests
- Service period: ${durationText}

COMPATIBILITY / REQUIREMENTS
- API processing handles validation automatically
- No manual input required after order submission

RESELLER ADVANTAGE
- Fully automated — scales with volume
- Consistent processing through verified endpoints
- Real-time status visibility

IMPORTANT NOTES
- Processing subject to external API availability
- Results final once confirmed by provider API`;
}

function generalTemplate(input: DescriptionInput): string {
  const { name, duration } = input;
  const durationText = duration || "As specified";

  return `SERVICE OVERVIEW
${name} — professional digital service delivered through the KKTech platform. Structured fulfillment with order tracking.

KEY FEATURES
- Verified service delivery
- Order tracking through platform dashboard
- Professional fulfillment process

DELIVERY TIME
- Processing time: As specified per service

WARRANTY / GUARANTEE
- Support available through order management system
- Service period: ${durationText}

COMPATIBILITY / REQUIREMENTS
- Requirements as specified per service listing

RESELLER ADVANTAGE
- Wholesale pricing available
- Structured delivery through controlled platform

IMPORTANT NOTES
- Service terms apply as per listing specifications`;
}

/* ═══════════════════════════════════════════
   SEO FULL MODE — Extended SEO-optimized
   ═══════════════════════════════════════════ */

function seoUnlock(input: DescriptionInput): string {
  const base = unlockTemplate(input);
  const { name, brand, carrier, country } = input;
  return `${base}

SEO KEYWORDS
${name}, IMEI unlock, carrier unlock, ${brand || "all brands"}, ${carrier || "all carriers"}, ${country || "global"}, server unlock, permanent unlock, wholesale IMEI, reseller unlock service, KKTech`;
}

function seoHardware(input: DescriptionInput): string {
  const base = hardwareTemplate(input);
  const { name, duration } = input;
  return `${base}

SEO KEYWORDS
${name}, license activation, repair tool, professional license, ${duration || "subscription"}, wholesale license, reseller tool, KKTech`;
}

function seoDigital(input: DescriptionInput): string {
  const base = digitalTemplate(input);
  const { name, duration } = input;
  return `${base}

SEO KEYWORDS
${name}, digital account, premium subscription, ${duration || "subscription"}, wholesale account, instant delivery, reseller account, KKTech`;
}

function seoAPI(input: DescriptionInput): string {
  const base = apiTemplate(input);
  const { name } = input;
  return `${base}

SEO KEYWORDS
${name}, API service, automated processing, 24/7 service, real-time, bulk processing, reseller API, KKTech`;
}

function seoGeneral(input: DescriptionInput): string {
  const base = generalTemplate(input);
  const { name } = input;
  return `${base}

SEO KEYWORDS
${name}, digital service, wholesale, reseller, professional service, KKTech`;
}

/* ═══════════════════════════════════════════
   Main export
   ═══════════════════════════════════════════ */

export function generateProductDescription(input: DescriptionInput, mode: DescriptionMode = "ultra-short"): string {
  const categoryKey = detectCategory(input.category, input.productType);

  if (mode === "ultra-short") {
    switch (categoryKey) {
      case "unlock": return ultraShortUnlock(input);
      case "hardware": return ultraShortHardware(input);
      case "digital": return ultraShortDigital(input);
      case "api": return ultraShortAPI(input);
      default: return ultraShortGeneral(input);
    }
  }

  if (mode === "seo-full") {
    switch (categoryKey) {
      case "unlock": return seoUnlock(input);
      case "hardware": return seoHardware(input);
      case "digital": return seoDigital(input);
      case "api": return seoAPI(input);
      default: return seoGeneral(input);
    }
  }

  // Standard mode
  switch (categoryKey) {
    case "unlock": return unlockTemplate(input);
    case "hardware": return hardwareTemplate(input);
    case "digital": return digitalTemplate(input);
    case "api": return apiTemplate(input);
    default: return generalTemplate(input);
  }
}
