import { useEffect } from "react";
import { Sparkles, Video, Palette, Layers, Zap, TrendingUp } from "lucide-react";
import ServicePageLayout from "@/components/ServicePageLayout";

const features = [
  { icon: Sparkles, title: "CapCut Pro Accounts", text: "Genuine CapCut Pro subscriptions with all premium features unlocked. Effects, filters, fonts, and advanced editing tools included." },
  { icon: Video, title: "Full Premium Features", text: "Access premium effects, transitions, AI-powered editing tools, background remover, and commercial-use assets not available in the free version." },
  { icon: Palette, title: "Canva Pro Available Too", text: "We also offer Canva Pro accounts at wholesale rates. Expand your product catalog with design tools alongside video editing." },
  { icon: Layers, title: "Multiple Duration Options", text: "Offer your customers 1-month, 3-month, 6-month, or annual CapCut Pro plans. Flexible options for different customer budgets." },
  { icon: Zap, title: "Instant Account Delivery", text: "CapCut Pro credentials are delivered instantly after purchase. Share with your customer immediately for a seamless experience." },
  { icon: TrendingUp, title: "High Demand Product", text: "CapCut is the #1 video editor in Myanmar. Reselling Pro accounts is one of the highest-margin digital products available." },
];

const specs = [
  { label: "Activation Type", value: "Premium Subscription Credentials" },
  { label: "Account Type", value: "CapCut Pro (Full Access)" },
  { label: "Platform", value: "iOS, Android, Windows, Mac" },
  { label: "Duration Options", value: "1-Month, 3-Month, 6-Month, Annual" },
  { label: "Delivery Method", value: "Instant — Credentials in Dashboard" },
  { label: "Warranty", value: "Replacement if credentials fail on first login" },
  { label: "Pricing Tiers", value: "Up to 40% off on bulk orders — volume discounts applied automatically" },
];

const notice = "CapCut Pro accounts are single-user credentials. Sharing one account across multiple end-customers may result in deactivation. Each credential should be sold to one customer only. Canva Pro accounts follow the same policy.";

const faqs = [
  { q: "What is CapCut Pro?", a: "CapCut Pro is the premium version of the popular CapCut video editor by ByteDance. It unlocks advanced features like AI effects, premium filters, 4K export, cloud storage, and commercial-use assets." },
  { q: "How are CapCut Pro accounts delivered?", a: "After purchase, you receive login credentials in your KKTech dashboard instantly. You can then share these with your end customer along with activation instructions." },
  { q: "Can customers use CapCut Pro on mobile and desktop?", a: "Yes. CapCut Pro accounts work across mobile (iOS/Android) and desktop (Windows/Mac). The premium features sync across all devices." },
  { q: "What's the profit margin on CapCut Pro reselling?", a: "Profit margins vary by duration plan but typically range from 40–60%. Our dashboard shows your exact cost and suggested retail price for each product." },
  { q: "Do you offer Canva Pro as well?", a: "Yes. We offer both CapCut Pro and Canva Pro accounts at wholesale rates. Many resellers bundle video editing and design tool accounts together for higher average order values." },
];

const seoContent = (
  <>
    <h2 className="text-xl font-bold tracking-tight">CapCut Pro Reseller Platform for Myanmar</h2>
    <p>
      CapCut has become the most popular video editing app in Myanmar, with millions of users creating content for TikTok, Facebook, and YouTube. As a <strong>CapCut Pro reseller</strong>, you tap into this massive demand by offering premium accounts at competitive prices — while earning healthy profit margins on every sale through KKTech's wholesale platform.
    </p>
    <h3>Why CapCut Pro Sells in Myanmar</h3>
    <p>
      The free version of CapCut is already widely used, but creators quickly hit limitations — watermarks on premium effects, limited AI features, and restricted access to trending templates. <strong>CapCut Pro</strong> removes all these restrictions, making it an easy upsell for anyone already using the free app. With Myanmar's booming creator economy, the demand for affordable CapCut Pro accounts continues to grow.
    </p>
    <h3>What's Included in CapCut Pro</h3>
    <p>
      CapCut Pro unlocks advanced AI-powered editing tools, premium effects and transitions, commercial-use music and assets, 4K video export, increased cloud storage, and priority rendering. These features are essential for professional content creators, social media managers, and businesses producing marketing videos.
    </p>
    <h3>How the Reseller Model Works</h3>
    <p>
      KKTech sources <strong>CapCut Pro accounts wholesale</strong> and makes them available to registered resellers at bulk pricing. You purchase accounts through your wallet balance — no minimum order required. Each account comes with login credentials that you share with your end customer. The process is fully automated: order, receive credentials instantly, and resell.
    </p>
    <p>
      Many successful resellers in Myanmar sell CapCut Pro accounts through their <strong>Telegram channels</strong>, <strong>Facebook pages</strong>, and local networks. Some bundle CapCut Pro with other digital products like Canva Pro and VPN keys to increase average order value and customer retention.
    </p>
    <h3>Expand with Canva Pro &amp; Other Digital Accounts</h3>
    <p>
      Beyond CapCut Pro, KKTech offers <strong>Canva Pro accounts</strong>, AI tool subscriptions, and other premium digital products at wholesale rates. Diversifying your product catalog means more revenue streams and a stronger value proposition for your customers. All products are managed through a single dashboard with transparent pricing and instant delivery.
    </p>
  </>
);

export default function CapcutProServicePage() {
  useEffect(() => {
    document.title = "CapCut Pro Reseller Myanmar | Wholesale Accounts & Digital Tools — KKTech";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Wholesale CapCut Pro accounts for Myanmar resellers. Instant delivery, high profit margins, and Canva Pro also available. Start reselling digital accounts today.");
  }, []);

  return (
    <ServicePageLayout
      icon={Sparkles}
      h1="CapCut Pro Wholesale — Reseller Accounts for Myanmar"
      subtitle="Premium CapCut Pro accounts at wholesale pricing with instant delivery. Canva Pro also available."
      features={features}
      specs={specs}
      notice={notice}
      seoContent={seoContent}
      faqs={faqs}
      ctaTitle="Start Reselling CapCut Pro"
      ctaText="Register for free and access wholesale pricing on CapCut Pro and other digital accounts."
    />
  );
}
