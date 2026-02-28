import { useEffect } from "react";
import { Lock, Smartphone, Globe, Shield, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import ServicePageLayout from "@/components/ServicePageLayout";

const features = [
  { icon: Smartphone, title: "iPhone Carrier Unlock", text: "Permanent unlock via Apple's activation database. Server-based, warranty-safe, no software modification required." },
  { icon: Lock, title: "Samsung FRP Removal", text: "Factory Reset Protection removal across all Samsung Galaxy models. Structured processing with consistent turnaround." },
  { icon: Globe, title: "Network Unlock Codes", text: "NCK codes for AT&T, T-Mobile, Vodafone, O2, and 200+ carriers. Routed through verified provider infrastructure." },
  { icon: Shield, title: "IMEI Blacklist Verification", text: "Pre-purchase device verification — blacklist status, financial obligations, and carrier lock state confirmed before processing." },
  { icon: Zap, title: "IMEI Device Reports", text: "Carrier info, lock status, iCloud state, warranty, and model details — structured data returned from IMEI lookup." },
  { icon: CheckCircle2, title: "Volume Processing", text: "Submit multiple unlock requests in a single operation. Built for repair shops and resellers handling consistent volume." },
];

const specs = [
  { label: "Activation Type", value: "Official IMEI / Server-Based" },
  { label: "Unlock Duration", value: "Permanent — survives updates and resets" },
  { label: "Supported Brands", value: "iPhone, Samsung, Huawei, LG, Motorola" },
  { label: "Carrier Coverage", value: "200+ carriers across global networks" },
  { label: "Delivery Method", value: "Automated via dashboard" },
  { label: "Fulfillment", value: "Replacement provided if activation fails on first use" },
  { label: "Volume Orders", value: "Supported — tiered pricing applied automatically" },
  { label: "Processing", value: "Routed through verified provider network" },
];

const notice = "Processing times depend on carrier and model. iPhone unlocks: 1–5 business days. Samsung FRP: typically within 24 hours. Delivery estimates at checkout are approximate and subject to provider availability.";

const faqs = [
  { q: "What is IMEI carrier unlock?", a: "A permanent server-side removal of network restrictions, allowing the device to operate on any carrier globally. Official method — does not void warranty." },
  { q: "What is the processing time for iPhone unlock?", a: "Typically 1–5 business days depending on the original carrier. Some carriers process within 24 hours. Status updates are delivered through the dashboard." },
  { q: "Is the unlock permanent?", a: "Yes. Official IMEI unlocks are registered in the carrier's activation database. They persist through software updates, factory resets, and device restores." },
  { q: "What information is required to place an order?", a: "Device IMEI number (dial *#06#), original carrier, and device model. The system validates all details before processing begins." },
  { q: "How does volume pricing work?", a: "KKTech applies tiered pricing automatically based on order volume. Higher volume results in lower per-unit cost. Pricing is visible after registration." },
];

const seoContent = (
  <>
    <h2 className="text-xl font-bold tracking-tight">IMEI Unlock Infrastructure for Resellers</h2>
    <p>
      KKTech provides structured access to <strong>IMEI unlock services</strong> through a controlled reseller platform. The system aggregates verified unlock providers, routing requests to the appropriate server based on carrier, model, and service type — delivering consistent results through a single operational dashboard.
    </p>
    <h3>How the System Operates</h3>
    <p>
      Orders are routed through our provider network to official carrier databases and verified third-party unlock servers. For <strong>iPhone carrier unlock</strong>, processing occurs through Apple's activation database — permanently registered and persistent across updates. For Samsung and Android devices, NCK codes and remote FRP removal are fulfilled through established provider channels.
    </p>
    <h3>Structured for Professional Use</h3>
    <p>
      KKTech operates on a <strong>wholesale pricing model</strong> with volume-based tiers. Each order displays cost and suggested retail price, providing clear margin visibility. The wallet system accepts Myanmar payment methods including KBZPay, WavePay, and bank transfers.
    </p>
    <p>
      Real-time availability, estimated delivery times, and provider success rates are displayed per service. Combined with automated order processing and structured notifications, the platform is designed for resellers who require operational reliability.
    </p>
    <h3>Carrier &amp; Service Coverage</h3>
    <p>
      Coverage includes major US carriers (AT&amp;T, T-Mobile, Verizon, Sprint), European networks (Vodafone, O2, EE, Three), Asian carriers, and additional global networks. The catalog spans iPhone (all models), Samsung Galaxy, Huawei, LG, Motorola, and IMEI report services. New services are added based on reseller demand and provider availability.
    </p>
  </>
);

export default function ImeiUnlockServicePage() {
  useEffect(() => {
    document.title = "IMEI Unlock Services — Professional Reseller Infrastructure | KKTech";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Structured IMEI unlock services for professional resellers. iPhone carrier unlock, Samsung FRP removal, 200+ carrier coverage. Verified providers, transparent pricing.");
  }, []);

  return (
    <ServicePageLayout
      icon={Lock}
      h1="IMEI Unlock Services"
      subtitle="Structured access to iPhone carrier unlock, Samsung FRP removal, and network unlock codes across 200+ carriers. Verified providers. Transparent pricing."
      features={features}
      specs={specs}
      notice={notice}
      seoContent={seoContent}
      faqs={faqs}
      ctaTitle="Access IMEI Unlock Services"
      ctaText="Register to view pricing and begin processing unlock orders through the platform."
    />
  );
}
