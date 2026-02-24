import { useEffect } from "react";
import { Lock, Smartphone, Globe, Shield, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import ServicePageLayout from "@/components/ServicePageLayout";

const features = [
  { icon: Smartphone, title: "iPhone Carrier Unlock", text: "Official permanent unlock for all iPhone models. Directly processed through Apple's activation database for a clean, warranty-safe unlock." },
  { icon: Lock, title: "Samsung FRP Removal", text: "Remove Factory Reset Protection on all Samsung Galaxy devices. Fast turnaround with high success rates across all Android versions." },
  { icon: Globe, title: "Network Unlock Codes", text: "NCK codes for AT&T, T-Mobile, Vodafone, O2, and 200+ carriers worldwide. Compatible with Samsung, LG, Huawei, Motorola, and more." },
  { icon: Shield, title: "IMEI Blacklist Check", text: "Verify if a device is blacklisted, reported stolen, or has outstanding financial obligations before purchasing or unlocking." },
  { icon: Zap, title: "Instant IMEI Reports", text: "Get detailed device reports instantly — carrier info, lock status, iCloud status, warranty, and model details from the IMEI number." },
  { icon: CheckCircle2, title: "Bulk Order Support", text: "Process multiple unlock orders at once with our bulk ordering system. Ideal for repair shops handling high volumes daily." },
];

const specs = [
  { label: "Activation Type", value: "Official IMEI / Server-Based Unlock" },
  { label: "Account Type", value: "Permanent Carrier Unlock" },
  { label: "Supported Brands", value: "iPhone, Samsung, Huawei, LG, Motorola" },
  { label: "Carrier Coverage", value: "200+ Carriers Worldwide" },
  { label: "Delivery Method", value: "Automated via Dashboard" },
  { label: "Warranty", value: "Replacement if activation fails on first use" },
  { label: "Bulk Orders", value: "Supported — Volume pricing available" },
  { label: "Pricing Tiers", value: "Up to 30% off on bulk orders — tiered volume discounts" },
];

const notice = "IMEI unlock processing times vary by carrier and model. iPhone unlocks typically take 1–5 business days. Samsung FRP removal is usually completed within 24 hours. Delivery estimates shown at checkout are approximate and may change during peak periods.";

const faqs = [
  { q: "What is IMEI carrier unlock?", a: "IMEI carrier unlock permanently removes the network restriction on a phone, allowing it to be used with any SIM card worldwide. Unlike software unlocks, this method is official and does not void warranty." },
  { q: "How long does iPhone unlock take?", a: "iPhone carrier unlock typically takes 1–5 business days depending on the original carrier. Some carriers like AT&T can be processed within 24 hours. You'll receive confirmation once the unlock is complete." },
  { q: "Is the unlock permanent?", a: "Yes. Official IMEI unlocks are permanent and survive software updates, factory resets, and iOS upgrades. The unlock is registered in Apple's or the carrier's activation database." },
  { q: "What information do I need to place an order?", a: "You need the device IMEI number (dial *#06#), the original carrier/network, and the device model. Our system validates these details before processing." },
  { q: "Do you offer wholesale pricing for resellers?", a: "Yes. KKTech offers tiered wholesale pricing — the more you order, the lower your per-unit cost. Register for a free account to see reseller pricing on all IMEI services." },
];

const seoContent = (
  <>
    <h2 className="text-xl font-bold tracking-tight">IMEI Unlock Services for Myanmar Resellers</h2>
    <p>
      KKTech provides a comprehensive <strong>IMEI unlock reseller</strong> platform designed for mobile repair shops and individual resellers in Myanmar. Our system aggregates the most reliable unlock servers worldwide, giving you access to <strong>iPhone unlock wholesale</strong> services, Samsung FRP removal, and network unlock codes for over 200 carriers — all from a single dashboard.
    </p>
    <h3>How Our IMEI Unlock System Works</h3>
    <p>
      Our <strong>GSM unlock server</strong> connects directly to official carrier databases and trusted third-party unlock providers. When you submit an IMEI unlock order, our automated system routes the request to the appropriate server based on the carrier, model, and service type. Most orders are fully automated, meaning you receive results without any manual intervention.
    </p>
    <p>
      For <strong>iPhone carrier unlock</strong>, we use Apple's official activation database. Once processed, the unlock is permanently registered — it survives iOS updates, factory resets, and device restores. For Samsung and other Android devices, we provide NCK (Network Control Key) codes and remote FRP removal services with industry-leading success rates.
    </p>
    <h3>Why Resellers Choose KKTech for IMEI Services</h3>
    <p>
      Unlike generic unlock websites that charge retail prices, KKTech offers <strong>wholesale IMEI unlock pricing</strong> with volume-based tiers. Every order shows your cost and suggested retail price, so you always know your profit margin before placing the order. Our wallet system accepts Myanmar payment methods including KBZPay, WavePay, and bank transfers, with top-ups approved within 5–15 minutes.
    </p>
    <p>
      Our real-time stock system ensures you never submit an order for a service that's temporarily unavailable. Each service listing shows current availability, estimated delivery time, and success rate history. Combined with our automated order processing and instant notification system, KKTech is the most efficient way to run an <strong>IMEI unlock business in Myanmar</strong>.
    </p>
    <h3>Supported Carriers &amp; Services</h3>
    <p>
      We support unlocks for major US carriers (AT&amp;T, T-Mobile, Verizon, Sprint), European networks (Vodafone, O2, EE, Three), Asian carriers, and dozens more. Our catalog covers iPhone unlock (all models from iPhone 6 to iPhone 15 series), Samsung Galaxy unlock, Huawei unlock, LG unlock, Motorola unlock, and IMEI reports from multiple databases. New services are added regularly based on reseller demand.
    </p>
  </>
);

export default function ImeiUnlockServicePage() {
  useEffect(() => {
    document.title = "IMEI Unlock Services Myanmar | iPhone & Samsung Wholesale Unlock — KKTech";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Wholesale IMEI unlock services for Myanmar resellers. iPhone carrier unlock, Samsung FRP removal, network unlock codes for 200+ carriers. Instant delivery at wholesale prices.");
  }, []);

  return (
    <ServicePageLayout
      icon={Lock}
      h1="IMEI Unlock Services — Wholesale for Myanmar Resellers"
      subtitle="Official iPhone unlock, Samsung FRP removal, and network unlock codes for 200+ carriers at wholesale pricing."
      features={features}
      specs={specs}
      notice={notice}
      seoContent={seoContent}
      faqs={faqs}
      ctaTitle="Start Your IMEI Unlock Business"
      ctaText="Register for free and access wholesale pricing on all IMEI unlock services."
    />
  );
}
