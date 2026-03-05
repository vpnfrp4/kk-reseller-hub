import { useEffect } from "react";
import { Key, Shield, Globe, Zap, Users, BarChart3 } from "lucide-react";
import ServicePageLayout from "@/components/ServicePageLayout";

const features = [
  { icon: Key, title: "ExpressVPN Keys", text: "Premium activation keys provisioned through verified channels. 1-month, 6-month, and 12-month plans available." },
  { icon: Shield, title: "LetsVPN Accounts", text: "High-demand VPN keys for the Myanmar market. Consistent stock with structured provisioning." },
  { icon: Globe, title: "NordVPN & Surfshark", text: "Subscription keys from established providers. Multiple duration options with transparent pricing." },
  { icon: Zap, title: "Instant Key Delivery", text: "Keys delivered immediately upon order confirmation. Credentials appear in the dashboard for direct distribution." },
  { icon: Users, title: "Multi-Device Plans", text: "Plans covering multiple simultaneous connections. Family and multi-device keys available through the catalog." },
  { icon: BarChart3, title: "Margin Visibility", text: "Cost and suggested retail price displayed per product. Clear margin structure before every order." },
];

const specs = [
  { label: "Activation Type", value: "Digital Key / Activation Code" },
  { label: "Account Type", value: "VPN Subscription Key" },
  { label: "Supported Brands", value: "ExpressVPN, LetsVPN, NordVPN, Surfshark" },
  { label: "Duration Options", value: "1-Month, 6-Month, 12-Month" },
  { label: "Delivery Method", value: "Instant — credentials via dashboard" },
  { label: "Fulfillment", value: "Replacement provided if key fails on first activation" },
  { label: "Multi-Device", value: "Supported — as per provider specifications" },
  { label: "Volume Pricing", value: "Tiered pricing applied automatically on volume orders" },
];

const notice = "VPN keys are region-sensitive. Some keys may only activate in specific regions depending on the provider. Verify compatibility before distribution. Previously activated or expired keys are not eligible for replacement.";

const faqs = [
  { q: "Which VPN providers are available?", a: "The catalog currently includes ExpressVPN, LetsVPN, NordVPN, and Surfshark. Additional providers are added based on demand and availability." },
  { q: "How are keys verified?", a: "All keys are sourced through authorized distribution channels. Each key is unique and unused. Activation is verified on first use." },
  { q: "What is the delivery time?", a: "Keys are delivered instantly. Once the order is confirmed and balance deducted, credentials appear in the order details immediately." },
  { q: "What if a key does not activate?", a: "Submit the order ID through the support system. Non-functional keys are verified and replaced within 24 hours." },
  { q: "Is volume ordering supported?", a: "Yes. Tiered pricing applies automatically — higher volume results in lower per-unit cost. Pricing is visible after registration." },
];

const seoContent = (
  <>
    <h2 className="text-xl font-bold tracking-tight">VPN Key Distribution for Resellers</h2>
    <p>
      KKTech provides structured access to <strong>VPN activation keys</strong> from verified providers including ExpressVPN, LetsVPN, NordVPN, and Surfshark. The platform operates on a <strong>wholesale pricing model</strong> designed for professional resellers requiring consistent stock and transparent margins.
    </p>
    <h3>Platform Operations</h3>
    <p>
      Every VPN product listing displays the wholesale cost alongside the suggested retail price, providing clear margin visibility. The instant delivery system processes orders in seconds — credentials appear in the dashboard immediately upon confirmation.
    </p>
    <h3>Provider Coverage</h3>
    <p>
      <strong>ExpressVPN</strong> — established provider with reliable performance. <strong>LetsVPN</strong> — strong demand in the Myanmar market. <strong>NordVPN</strong> — advanced security features including double VPN. <strong>Surfshark</strong> — unlimited device connections per subscription.
    </p>
    <h3>Distribution Structure</h3>
    <p>
      Register for a KKTech account, fund the wallet through supported payment channels (KBZPay, WavePay, bank transfer), and access the VPN catalog. Purchase individually or in volume. The platform tracks all orders, margins, and inventory through a structured dashboard.
    </p>
  </>
);

export default function VpnKeysServicePage() {
  useEffect(() => {
    const title = "VPN Keys — Professional Reseller Distribution | KKTech";
    const desc = "VPN activation keys for professional resellers. ExpressVPN, LetsVPN, NordVPN, Surfshark. Instant delivery, transparent pricing, verified providers.";
    const url = "https://karkar4.store/services/vpn-keys";
    const image = "https://karkar4.store/og-vpn-keys.png";

    document.title = title;
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("name", "description", desc);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", image);
    setMeta("name", "twitter:card", "summary_large_image");

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.id = "service-jsonld";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      name: "VPN Key Distribution",
      description: desc,
      provider: { "@type": "Organization", name: "KKTech", url: "https://karkar4.store" },
      url,
      areaServed: "Worldwide",
      serviceType: "VPN Subscription Keys",
    });
    document.head.appendChild(ld);
    return () => { document.getElementById("service-jsonld")?.remove(); };
  }, []);

  return (
    <ServicePageLayout
      icon={Key}
      h1="VPN Key Distribution"
      subtitle="Verified VPN activation keys from established providers. Instant delivery, transparent pricing, volume-ready."
      features={features}
      specs={specs}
      notice={notice}
      seoContent={seoContent}
      faqs={faqs}
      ctaTitle="Access VPN Key Catalog"
      ctaText="Register to view pricing and begin distributing VPN keys through the platform."
    />
  );
}
