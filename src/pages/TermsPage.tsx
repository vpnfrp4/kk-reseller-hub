import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 max-w-3xl mx-auto">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <h1 className="text-2xl font-bold mb-2 font-display gold-text">Terms and Conditions</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-2">1. No Refund Policy</h2>
          <p>
            ဝယ်ယူပြီးသား အကောင့်များကို Refund (ငွေပြန်အမ်းခြင်း) လုံးဝပြုလုပ်ပေးမည်မဟုတ်ပါ။
            Customer အဆင်သင့်ရှိမှသာ ဝယ်ယူပေးပါရန်။
          </p>
          <p className="mt-2">
            All sales are final. Once a purchase is completed and credentials are delivered, no refunds or exchanges will be provided under any circumstances.
          </p>
        </section>

        <section className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-2">2. Account Usage</h2>
          <p>
            Purchased credentials are for personal or authorized resale use only. Sharing, redistributing, or misusing credentials outside of the intended purpose is strictly prohibited.
          </p>
        </section>

        <section className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-2">3. Wallet & Balance</h2>
          <p>
            Your wallet balance is used to purchase products on the platform. Top-up requests are subject to admin approval. Approved funds are non-withdrawable and can only be used for purchases within the platform.
          </p>
        </section>

        <section className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-2">4. Product Availability</h2>
          <p>
            Products and credentials are subject to availability. We do not guarantee stock at any given time. Pricing may change without prior notice.
          </p>
        </section>

        <section className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-2">5. Liability</h2>
          <p>
            We are not responsible for any issues arising from third-party services associated with purchased credentials. Use all products at your own risk.
          </p>
        </section>

        <section className="glass-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-2">6. Amendments</h2>
          <p>
            We reserve the right to update these terms at any time. Continued use of the platform constitutes acceptance of the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
