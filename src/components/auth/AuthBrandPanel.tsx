import { Zap, BarChart3, Wallet, MessageCircle } from "lucide-react";
import kkLogo from "@/assets/kkremote-logo.png";

const features = [
  { icon: Zap, label: "Instant service ordering", desc: "Auto-delivery for digital products" },
  { icon: BarChart3, label: "Real-time order tracking", desc: "Live status updates on every order" },
  { icon: Wallet, label: "Secure wallet system", desc: "Fast top-ups with KPay & WavePay" },
  { icon: MessageCircle, label: "Telegram bot integration", desc: "Get instant notifications on Telegram" },
];

const stats = [
  { value: "200+", label: "Active Services" },
  { value: "50K+", label: "Orders Processed" },
  { value: "99.9%", label: "Platform Uptime" },
];

export default function AuthBrandPanel() {
  return (
    <div className="relative flex flex-col justify-between h-full overflow-hidden bg-[hsl(222,47%,5%)] p-8 lg:p-12">
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(217,91%,60%) 1px, transparent 1px), linear-gradient(90deg, hsl(217,91%,60%) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow behind logo */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[hsl(217,91%,60%)] opacity-[0.06] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[10%] w-[250px] h-[250px] rounded-full bg-[hsl(217,91%,68%)] opacity-[0.04] blur-[100px] pointer-events-none" />

      {/* Top content */}
      <div className="relative z-10">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl" />
            <img src={kkLogo} alt="KKTech" className="relative w-12 h-12 rounded-2xl" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              KK<span className="text-primary">Tech</span>
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/60">
              Reseller Platform
            </p>
          </div>
        </div>

        <div className="mt-10 lg:mt-14">
          <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
            Digital Unlock
            <br />
            <span className="text-primary">Marketplace</span> for
            <br />
            Technicians
          </h2>
          <p className="text-sm text-[hsl(215,20%,55%)] mt-4 max-w-[300px] leading-relaxed">
            Professional reseller tools for IMEI unlocking, VPN keys, digital subscriptions and more.
          </p>
        </div>

        {/* Features */}
        <div className="mt-10 space-y-4">
          {features.map((f) => (
            <div key={f.label} className="flex items-start gap-3 group">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center mt-0.5 group-hover:bg-primary/15 transition-colors">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">{f.label}</p>
                <p className="text-xs text-[hsl(215,20%,45%)] mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom stats */}
      <div className="relative z-10 mt-12">
        <div className="flex items-center gap-6 pt-6 border-t border-white/[0.06]">
          {stats.map((s, i) => (
            <div key={s.label}>
              <p className="text-lg font-bold text-white font-mono">{s.value}</p>
              <p className="text-[10px] font-medium text-[hsl(215,20%,45%)] uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[hsl(215,20%,35%)] mt-6">
          Trusted by technicians worldwide
        </p>
      </div>
    </div>
  );
}
