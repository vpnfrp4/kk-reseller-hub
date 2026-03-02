import { useEffect } from "react";
import { Sparkles, Video, Palette, Layers, Zap, TrendingUp } from "lucide-react";
import ServicePageLayout from "@/components/ServicePageLayout";

const features = [
  { icon: Sparkles, title: "CapCut Pro Accounts", text: "Verified CapCut Pro subscriptions with full premium access. Effects, filters, fonts, and advanced editing tools included." },
  { icon: Video, title: "Full Feature Access", text: "Premium effects, transitions, AI-powered tools, background removal, and commercial-use assets — all features unlocked." },
  { icon: Palette, title: "Canva Pro Available", text: "Canva Pro accounts also available through the platform. Design tools alongside video editing for catalog diversification." },
  { icon: Layers, title: "Duration Options", text: "1-month, 3-month, 6-month, and annual plans. Flexible provisioning for different distribution requirements." },
  { icon: Zap, title: "Instant Delivery", text: "Credentials delivered immediately upon order confirmation. Available in the dashboard for direct distribution." },
  { icon: TrendingUp, title: "Consistent Demand", text: "CapCut is widely adopted across Myanmar. Structured provisioning for resellers serving content creator markets." },
];

const specs = [
  { label: "Activation Type", value: "Premium Subscription Credentials" },
  { label: "Account Type", value: "CapCut Pro — Full Access" },
  { label: "Platform", value: "iOS, Android, Windows, Mac" },
  { label: "Duration Options", value: "1-Month, 3-Month, 6-Month, Annual" },
  { label: "Delivery Method", value: "Instant — credentials via dashboard" },
  { label: "Fulfillment", value: "Replacement provided if credentials fail on first login" },
  { label: "Volume Pricing", value: "Tiered pricing applied automatically on volume orders" },
];

const notice = "CapCut Pro accounts are single-user credentials. Distributing one account to multiple end-users may result in deactivation. Each credential should be assigned to one customer. Canva Pro accounts follow the same policy.";

const faqs = [
  { q: "What is CapCut Pro?", a: "CapCut Pro is the premium tier of the CapCut video editor by ByteDance. It provides access to advanced AI tools, premium effects, 4K export, cloud storage, and commercial-use assets." },
  { q: "How are accounts delivered?", a: "Login credentials appear in the KKTech dashboard immediately after order confirmation. Credentials can then be distributed to the end customer with activation instructions." },
  { q: "Is cross-platform access supported?", a: "Yes. CapCut Pro accounts function across mobile (iOS/Android) and desktop (Windows/Mac). Premium features synchronize across all devices." },
  { q: "What margin structure applies?", a: "Margins vary by duration plan. The dashboard displays the exact cost and suggested retail price per product before every order." },
  { q: "Is Canva Pro also available?", a: "Yes. Both CapCut Pro and Canva Pro accounts are available through the platform. Resellers can distribute both categories through a single dashboard." },
];

const seoContent = (
  <>
    <h2 className="text-xl font-bold tracking-tight">CapCut Pro Account Provisioning for Resellers</h2>
    <p>
      KKTech provides structured access to <strong>CapCut Pro accounts</strong> for professional resellers. Verified credentials with full premium access, delivered instantly through the platform with transparent pricing and volume-based tiers.
    </p>
    <h3>Premium Feature Set</h3>
    <p>
      CapCut Pro unlocks AI-powered editing tools, premium effects and transitions, commercial-use music and assets, 4K video export, expanded cloud storage, and priority rendering. These capabilities serve content creators, social media operators, and businesses producing marketing content.
    </p>
    <h3>Distribution Model</h3>
    <p>
      Accounts are provisioned through KKTech and delivered via the reseller dashboard. No minimum order requirement. Each account includes login credentials for direct distribution to end customers. The process is automated — order, receive credentials, distribute.
    </p>
    <h3>Catalog Expansion</h3>
    <p>
      Beyond CapCut Pro, the platform offers <strong>Canva Pro accounts</strong>, AI tool subscriptions, and additional digital products. All services are managed through a single dashboard with structured pricing and instant delivery.
    </p>
  </>
);

export default function CapcutProServicePage() {
  useEffect(() => {
    const title = "CapCut Pro Accounts — Professional Reseller Distribution | KKTech";
    const desc = "CapCut Pro accounts for professional resellers. Instant delivery, verified credentials, transparent pricing. Canva Pro also available.";
    const url = "https://kktech.shop/services/capcut-pro";
    const image = "https://kktech.shop/og-image.png";

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
      name: "CapCut Pro Account Distribution",
      description: desc,
      provider: { "@type": "Organization", name: "KKTech", url: "https://kktech.shop" },
      url,
      areaServed: "Worldwide",
      serviceType: "Digital Subscription Accounts",
    });
    document.head.appendChild(ld);
    return () => { document.getElementById("service-jsonld")?.remove(); };
  }, []);

  return (
    <ServicePageLayout
      icon={Sparkles}
      h1="CapCut Pro Account Distribution"
      subtitle="Verified CapCut Pro credentials with full premium access. Instant delivery, structured pricing, volume-ready."
      features={features}
      specs={specs}
      notice={notice}
      seoContent={seoContent}
      faqs={faqs}
      ctaTitle="Access Digital Accounts Catalog"
      ctaText="Register to view pricing and begin distributing CapCut Pro accounts through the platform."
    />
  );
}
