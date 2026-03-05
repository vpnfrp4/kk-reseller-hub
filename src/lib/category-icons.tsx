import {
  Smartphone,
  Wifi,
  Search,
  Gamepad2,
  ShieldCheck,
  Monitor,
  Key,
  Lock,
  Users,
  Heart,
  Eye,
  ThumbsUp,
  MessageCircle,
  Video,
  Music,
  Globe,
  Package,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps a product category string to a Lucide icon component.
 * Uses keyword matching against the category name (case-insensitive).
 */

interface CategoryMapping {
  keywords: string[];
  icon: LucideIcon;
}

const CATEGORY_MAPPINGS: CategoryMapping[] = [
  // Apple-specific (use Smartphone as Apple-device proxy)
  { keywords: ["apple", "iphone", "ipad", "macbook", "icloud", "apple id", "ios"], icon: Smartphone },
  // Android
  { keywords: ["android", "samsung", "huawei", "xiaomi", "oppo", "google pixel"], icon: Monitor },
  // Network / SIM / Carrier unlock
  { keywords: ["network", "carrier", "sim", "unlock", "softbank", "docomo", "kddi", "at&t", "t-mobile", "sprint", "verizon"], icon: Wifi },
  // IMEI check / lookup
  { keywords: ["imei", "check", "lookup", "verify", "blacklist"], icon: Search },
  // Game credits / gaming
  { keywords: ["game", "gaming", "pubg", "free fire", "roblox", "steam", "xbox", "playstation", "nintendo", "mlbb", "mobile legends"], icon: Gamepad2 },
  // VPN / Security
  { keywords: ["vpn", "proxy", "security", "nordvpn", "expressvpn", "surfshark"], icon: ShieldCheck },
  // Social media - specific platforms
  { keywords: ["tiktok", "tok"], icon: Video },
  { keywords: ["youtube", "yt"], icon: Video },
  { keywords: ["instagram", "ig"], icon: Heart },
  { keywords: ["facebook", "fb"], icon: ThumbsUp },
  { keywords: ["telegram", "tg channel", "tg group"], icon: MessageCircle },
  { keywords: ["twitter", "x.com"], icon: MessageCircle },
  // Social media - engagement types
  { keywords: ["followers", "subscriber"], icon: Users },
  { keywords: ["likes", "reactions"], icon: ThumbsUp },
  { keywords: ["views", "watch"], icon: Eye },
  { keywords: ["comments"], icon: MessageCircle },
  // Streaming / subscriptions
  { keywords: ["spotify", "netflix", "disney", "hbo", "canva", "capcut", "premium", "subscription"], icon: Music },
  // Keys / licenses
  { keywords: ["key", "license", "activation", "serial"], icon: Key },
  // Password / account recovery
  { keywords: ["password", "recovery", "reset", "bypass"], icon: Lock },
  // Web / hosting / domain
  { keywords: ["web", "hosting", "domain", "website"], icon: Globe },
];

/**
 * Get the appropriate icon component for a category or product name.
 * Falls back to Package icon if no match found.
 */
export function getCategoryIcon(category: string, productName?: string): LucideIcon {
  const searchText = `${category} ${productName || ""}`.toLowerCase();

  for (const mapping of CATEGORY_MAPPINGS) {
    if (mapping.keywords.some((kw) => searchText.includes(kw))) {
      return mapping.icon;
    }
  }

  return Package;
}

/**
 * Get a color class for the icon based on category.
 * Returns HSL-based Tailwind classes for consistency.
 */
export function getCategoryIconColor(category: string, productName?: string): string {
  const searchText = `${category} ${productName || ""}`.toLowerCase();

  if (["apple", "iphone", "ipad", "icloud", "ios"].some((k) => searchText.includes(k))) {
    return "text-foreground/70 bg-foreground/8";
  }
  if (["android", "samsung", "huawei", "xiaomi"].some((k) => searchText.includes(k))) {
    return "text-[hsl(122,40%,55%)] bg-[hsl(122,40%,55%)]/10";
  }
  if (["network", "carrier", "sim", "unlock", "softbank", "docomo", "at&t"].some((k) => searchText.includes(k))) {
    return "text-primary bg-primary/10";
  }
  if (["imei", "check", "lookup"].some((k) => searchText.includes(k))) {
    return "text-[hsl(200,80%,55%)] bg-[hsl(200,80%,55%)]/10";
  }
  if (["game", "gaming", "pubg", "roblox", "steam"].some((k) => searchText.includes(k))) {
    return "text-[hsl(280,65%,60%)] bg-[hsl(280,65%,60%)]/10";
  }
  if (["vpn", "proxy", "security"].some((k) => searchText.includes(k))) {
    return "text-[hsl(160,60%,45%)] bg-[hsl(160,60%,45%)]/10";
  }
  if (["tiktok", "instagram", "facebook", "youtube", "twitter", "telegram", "followers", "likes", "views", "comments", "subscriber"].some((k) => searchText.includes(k))) {
    return "text-[hsl(340,75%,55%)] bg-[hsl(340,75%,55%)]/10";
  }
  if (["spotify", "netflix", "disney", "capcut", "canva", "premium", "subscription"].some((k) => searchText.includes(k))) {
    return "text-[hsl(25,90%,55%)] bg-[hsl(25,90%,55%)]/10";
  }

  return "text-muted-foreground/70 bg-muted/15";
}
