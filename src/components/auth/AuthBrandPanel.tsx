import { Zap, BarChart3, Wallet, MessageCircle, Shield, Globe } from "lucide-react";
import { motion } from "framer-motion";
import kkLogo from "@/assets/kkremote-logo.png";

const features = [
  { icon: Zap, label: "Instant Delivery", desc: "Auto-delivery for digital products" },
  { icon: BarChart3, label: "Live Tracking", desc: "Real-time status on every order" },
  { icon: Wallet, label: "Secure Wallet", desc: "Fast top-ups via KPay & WavePay" },
  { icon: MessageCircle, label: "Telegram Bot", desc: "Instant notifications on Telegram" },
  { icon: Shield, label: "Enterprise Security", desc: "End-to-end encrypted transactions" },
  { icon: Globe, label: "Global Coverage", desc: "200+ services across 50+ countries" },
];

const stats = [
  { value: "200+", label: "Services" },
  { value: "50K+", label: "Orders" },
  { value: "99.9%", label: "Uptime" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function AuthBrandPanel() {
  return (
    <div className="relative flex flex-col justify-between h-full overflow-hidden bg-[hsl(222,47%,5%)] p-8 lg:p-12">
      {/* Animated grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(24,95%,53%) 1px, transparent 1px), linear-gradient(90deg, hsl(24,95%,53%) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      {/* Ambient glow orbs */}
      <motion.div
        className="absolute top-[8%] left-[20%] w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(24 95% 53% / 0.12), transparent 70%)", filter: "blur(80px)" }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[10%] right-[15%] w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(28 100% 64% / 0.08), transparent 70%)", filter: "blur(60px)" }}
        animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Top content */}
      <div className="relative z-10">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 mb-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-[hsl(24,95%,53%)] opacity-25 blur-xl" />
            <img src={kkLogo} alt="KKTech" className="relative w-12 h-12 rounded-2xl ring-1 ring-white/10" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight font-display">
              KK<span className="text-[hsl(24,95%,53%)]">Tech</span>
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(24,95%,53%)]/60">
              Reseller Platform
            </p>
          </div>
        </motion.div>

        <motion.div
          className="mt-10 lg:mt-14"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-2xl lg:text-[2rem] font-bold text-white leading-tight font-display">
            Digital Unlock
            <br />
            <span className="bg-gradient-to-r from-[hsl(24,95%,53%)] to-[hsl(28,100%,64%)] bg-clip-text text-transparent">
              Marketplace
            </span>{" "}
            for
            <br />
            Technicians
          </h2>
          <p className="text-sm text-[hsl(215,20%,55%)] mt-4 max-w-[300px] leading-relaxed">
            Professional reseller tools for IMEI unlocking, VPN keys, digital subscriptions and more.
          </p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          className="mt-10 grid grid-cols-1 gap-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {features.map((f) => (
            <motion.div
              key={f.label}
              variants={itemVariants}
              className="group flex items-start gap-3 p-2.5 -ml-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
            >
              <div className="shrink-0 w-9 h-9 rounded-xl bg-[hsl(24,95%,53%)]/10 border border-[hsl(24,95%,53%)]/10 flex items-center justify-center mt-0.5 group-hover:bg-[hsl(24,95%,53%)]/15 group-hover:border-[hsl(24,95%,53%)]/20 transition-all duration-300">
                <f.icon className="w-4 h-4 text-[hsl(24,95%,53%)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90 font-display">{f.label}</p>
                <p className="text-[11px] text-[hsl(215,20%,45%)] mt-0.5">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom stats */}
      <motion.div
        className="relative z-10 mt-12"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <div className="flex items-center gap-8 pt-6 border-t border-white/[0.06]">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-lg font-bold text-white font-display">{s.value}</p>
              <p className="text-[10px] font-medium text-[hsl(215,20%,45%)] uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[hsl(215,20%,30%)] mt-6">
          Trusted by technicians across Myanmar & beyond
        </p>
      </motion.div>
    </div>
  );
}
