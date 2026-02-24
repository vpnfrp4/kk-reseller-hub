import { ArrowLeft, ScrollText, ShieldCheck, Wallet, Package, AlertTriangle, FileText, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const sections = [
  {
    icon: ShieldCheck,
    title: "1. No Refund Policy",
    content: [
      "ဝယ်ယူပြီးသား အကောင့်များကို Refund (ငွေပြန်အမ်းခြင်း) လုံးဝပြုလုပ်ပေးမည်မဟုတ်ပါ။ Customer အဆင်သင့်ရှိမှသာ ဝယ်ယူပေးပါရန်။",
      "All sales are final. Once a purchase is completed and credentials are delivered, no refunds or exchanges will be provided under any circumstances.",
    ],
  },
  {
    icon: ScrollText,
    title: "2. Account Usage",
    content: [
      "Purchased credentials are for personal or authorized resale use only. Sharing, redistributing, or misusing credentials outside of the intended purpose is strictly prohibited.",
    ],
  },
  {
    icon: Wallet,
    title: "3. Wallet & Balance",
    content: [
      "Your wallet balance is used to purchase products on the platform. Top-up requests are subject to admin approval. Approved funds are non-withdrawable and can only be used for purchases within the platform.",
    ],
  },
  {
    icon: Package,
    title: "4. Product Availability",
    content: [
      "Products and credentials are subject to availability. We do not guarantee stock at any given time. Pricing may change without prior notice.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "5. Liability",
    content: [
      "We are not responsible for any issues arising from third-party services associated with purchased credentials. Use all products at your own risk.",
    ],
  },
  {
    icon: FileText,
    title: "6. Amendments",
    content: [
      "We reserve the right to update these terms at any time. Continued use of the platform constitutes acceptance of the revised terms.",
    ],
  },
];

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[150px] opacity-20"
          style={{ background: "radial-gradient(circle, hsl(43 76% 47% / 0.15), transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[130px] opacity-15"
          style={{ background: "radial-gradient(circle, hsl(224 76% 33% / 0.15), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 py-8 md:py-16">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8 gap-2 text-muted-foreground hover:text-foreground btn-glass !bg-transparent"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {/* Hero header */}
        <div className="text-center mb-12 animate-fade-in">
          <div
            className="w-[72px] h-[72px] rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{
              background: "var(--gradient-gold)",
              boxShadow: "0 0 40px hsl(43 76% 47% / 0.25)",
            }}
          >
            <Crown className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight">
            <span className="gold-text">Terms</span>{" "}
            <span className="text-foreground">&</span>{" "}
            <span className="gold-text">Conditions</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            Last updated: February 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-5">
          {sections.map((section, i) => (
            <section
              key={section.title}
              className="glass-card p-6 relative overflow-hidden opacity-0 animate-stagger-in hover-lift"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Gold accent line */}
              <div
                className="absolute top-0 left-0 w-1 h-full rounded-r"
                style={{ background: "var(--gradient-gold)" }}
              />

              <div className="flex items-start gap-4 pl-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <section.icon className="w-[18px] h-[18px] text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground mb-2">{section.title}</h2>
                  <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                    {section.content.map((para, j) => (
                      <p key={j}>{para}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-12 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          &copy; {new Date().getFullYear()} KKTech. All rights reserved.
        </p>
      </div>
    </div>
  );
}
