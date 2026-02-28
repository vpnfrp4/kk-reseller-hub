/**
 * Universal Description Template Engine
 * Generates structured, professional product descriptions
 * based on category and product metadata.
 */

interface DescriptionInput {
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

function detectCategory(category: string, productType: string): CategoryKey {
  const cat = category.toLowerCase();
  if (productType === "imei" || cat.includes("imei") || cat.includes("unlock") || cat.includes("gsm")) return "unlock";
  if (cat.includes("hardware") || cat.includes("repair") || cat.includes("tool") || cat.includes("license") || cat.includes("activation")) return "hardware";
  if (productType === "api") return "api";
  if (productType === "digital" || cat.includes("account") || cat.includes("subscription") || cat.includes("vpn") || cat.includes("editing") || cat.includes("ai") || cat.includes("creative")) return "digital";
  if (productType === "manual") return "general";
  return "general";
}

function unlockTemplate(input: DescriptionInput): string {
  const { name, duration, processingTime, brand, carrier, country } = input;
  const brandText = brand || "All supported brands";
  const carrierText = carrier || "All carriers";
  const countryText = country || "Global";
  const timeText = processingTime || "1-3 Days";

  return `SERVICE OVERVIEW
${name} — server-based IMEI unlock service routed through verified provider infrastructure. Permanent unlock registered in the carrier activation database. No software modification required.

KEY FEATURES
- Official server-side unlock — warranty-safe
- Permanent activation — persists through updates and factory resets
- Structured provider routing for consistent results
- Real-time order status tracking via dashboard

DELIVERY TIME
- Estimated processing: ${timeText}
- Status updates delivered through the platform

WARRANTY / GUARANTEE
- Replacement provided if unlock fails on first verified attempt
- Support available through the order management system

COMPATIBILITY / REQUIREMENTS
- Brand: ${brandText}
- Carrier: ${carrierText}
- Region: ${countryText}
- IMEI submission required (dial *#06# to retrieve)
- Device must have clean status (not reported lost/stolen)

RESELLER ADVANTAGE
- Wholesale pricing with volume-based tiers
- Automated order routing — no manual intervention
- Secure delivery through controlled platform

IMPORTANT NOTES
- Processing times are estimates and subject to carrier availability
- Refunds are not available for orders already submitted to the provider network
- Results are final once the unlock is registered in the activation database`;
}

function hardwareTemplate(input: DescriptionInput): string {
  const { name, duration } = input;
  const durationText = duration || "As specified";

  return `SERVICE OVERVIEW
${name} — professional activation and licensing solution for repair technicians and service operators. Delivered through secure provisioning within the platform.

KEY FEATURES
- Official license activation — verified source
- Structured delivery through the platform dashboard
- Compatible with standard repair workflows
- Clear activation instructions provided

DELIVERY TIME
- License delivery: Immediate upon order confirmation
- Activation: As per provider specifications

WARRANTY / GUARANTEE
- Replacement provided if activation fails on first use
- License validity: ${durationText}

COMPATIBILITY / REQUIREMENTS
- Device count: As specified per license tier
- System requirements provided with activation details
- Internet connection required for initial activation
- Renewal terms apply as per license agreement

RESELLER ADVANTAGE
- Volume pricing available for multi-license orders
- Instant processing through the platform
- Secure license delivery — no third-party exposure

IMPORTANT NOTES
- Licenses are non-transferable once activated
- Ensure system compatibility before purchase
- No refund after activation has been completed`;
}

function digitalTemplate(input: DescriptionInput): string {
  const { name, duration } = input;
  const durationText = duration || "As specified";

  return `SERVICE OVERVIEW
${name} — secure digital account provisioned for controlled reseller distribution. Delivered instantly through the platform with structured credential management.

KEY FEATURES
- Verified account provisioning — quality controlled
- Instant credential delivery via dashboard
- Structured for reseller redistribution
- Account details secured within the platform

DELIVERY TIME
- Instant delivery upon successful order

WARRANTY / GUARANTEE
- Replacement within 24 hours if account is non-functional on first access
- Validity period: ${durationText}

COMPATIBILITY / REQUIREMENTS
- Account region and restrictions as specified
- 2FA status: Configured as per account specifications
- Usage restrictions apply per account terms
- Stable internet connection required for access

RESELLER ADVANTAGE
- Instant processing — no wait time
- Wholesale-ready pricing with volume tiers
- Secure credential delivery — encrypted within platform

IMPORTANT NOTES
- Account credentials are single-use — do not share publicly
- Warranty void if account terms are violated
- No refund once credentials have been accessed`;
}

function apiTemplate(input: DescriptionInput): string {
  const { name, duration } = input;
  const durationText = duration || "Per request";

  return `SERVICE OVERVIEW
${name} — automated service processed through integrated API infrastructure. Real-time request handling with structured response delivery.

KEY FEATURES
- 24/7 automated processing — no manual intervention
- Real-time API response and status updates
- Structured error handling and retry logic
- Volume-capable processing infrastructure

DELIVERY TIME
- Processing: Real-time / As per API response time
- Results delivered through dashboard and notifications

WARRANTY / GUARANTEE
- Retry or replacement for failed API requests
- Service period: ${durationText}

COMPATIBILITY / REQUIREMENTS
- Service-specific requirements as documented
- API processing handles validation automatically
- No manual input required after order submission

RESELLER ADVANTAGE
- Fully automated — scales with order volume
- Consistent processing through verified API endpoints
- Real-time status visibility for all orders

IMPORTANT NOTES
- Processing subject to external API availability
- Results are final once confirmed by the provider API
- Volume-based pricing applied automatically`;
}

function generalTemplate(input: DescriptionInput): string {
  const { name, duration } = input;
  const durationText = duration || "As specified";

  return `SERVICE OVERVIEW
${name} — professional digital service delivered through the KKTech platform. Structured fulfillment with order tracking and status updates.

KEY FEATURES
- Verified service delivery
- Order tracking through the platform dashboard
- Professional fulfillment process
- Structured communication on order status

DELIVERY TIME
- Processing time: As specified per service
- Status updates provided through the platform

WARRANTY / GUARANTEE
- Support available through order management system
- Service period: ${durationText}

COMPATIBILITY / REQUIREMENTS
- Requirements as specified per service listing
- Ensure all required information is provided at order time

RESELLER ADVANTAGE
- Wholesale pricing available
- Structured delivery through controlled platform
- Order history and tracking for all purchases

IMPORTANT NOTES
- Service terms apply as per listing specifications
- Ensure requirements are met before placing order
- Contact support for any fulfillment inquiries`;
}

export function generateProductDescription(input: DescriptionInput): string {
  const categoryKey = detectCategory(input.category, input.productType);

  switch (categoryKey) {
    case "unlock": return unlockTemplate(input);
    case "hardware": return hardwareTemplate(input);
    case "digital": return digitalTemplate(input);
    case "api": return apiTemplate(input);
    default: return generalTemplate(input);
  }
}
