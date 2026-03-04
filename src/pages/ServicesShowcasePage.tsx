import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { t, useT } from "@/lib/i18n";
import {
  Cloud,
  Fingerprint,
  Unlock,
  Wrench,
  Smartphone,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  Star,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ServiceCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  glowColor: string;
  badges: { label: string; variant: "success" | "warning" | "primary" }[];
  features: string[];
  path: string;
  popular?: boolean;
}

const services: ServiceCard[] = [
  {
    id: "icloud",
    title: "iCloud Unlock",
    subtitle: "Apple ID & Activation Lock",
    description: "Professional iCloud removal for all iPhone, iPad & Apple Watch models. Clean IMEI guaranteed.",
    icon: Cloud,
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/10 border-sky-500/20",
    glowColor: "group-hover:shadow-[0_0_40px_-8px_rgba(56,189,248,0.3)]",
    badges: [
      { label: "Most Popular", variant: "primary" },
      { label: "1-5 Days", variant: "warning" },
    ],
    features: ["All iPhone models", "Clean IMEI only", "Permanent removal", "Worldwide support"],
    path: "/dashboard/products",
    popular: true,
  },
  {
    id: "imei-check",
    title: "IMEI Check",
    subtitle: "Device Verification & Status",
    description: "Instant IMEI verification — check carrier lock, iCloud status, blacklist, warranty & more.",
    icon: Fingerprint,
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    glowColor: "group-hover:shadow-[0_0_40px_-8px_rgba(52,211,153,0.3)]",
    badges: [
      { label: "Instant", variant: "success" },
      { label: "Auto Delivery", variant: "success" },
    ],
    features: ["Carrier info", "Blacklist check", "iCloud status", "Warranty details"],
    path: "/tools/imei-check",
  },
  {
    id: "unlock",
    title: "Network Unlock",
    subtitle: "Carrier & SIM Unlock Services",
    description: "Factory unlock any phone from any carrier worldwide. Use any SIM card after unlock.",
    icon: Unlock,
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    glowColor: "group-hover:shadow-[0_0_40px_-8px_rgba(167,139,250,0.3)]",
    badges: [
      { label: "All Carriers", variant: "primary" },
      { label: "1-7 Days", variant: "warning" },
    ],
    features: ["Samsung, iPhone, LG+", "AT&T, T-Mobile, Sprint", "Factory permanent", "Money-back guarantee"],
    path: "/services/imei-unlock",
  },
  {
    id: "repair",
    title: "Repair Tools",
    subtitle: "Hardware & Software Solutions",
    description: "Professional repair tools, bypass utilities, and flashing software for technicians.",
    icon: Wrench,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    glowColor: "group-hover:shadow-[0_0_40px_-8px_rgba(251,191,36,0.3)]",
    badges: [
      { label: "Pro Tools", variant: "primary" },
      { label: "Digital", variant: "success" },
    ],
    features: ["FRP bypass tools", "Flash & repair", "License keys", "Instant download"],
    path: "/dashboard/products",
  },
  {
    id: "digital",
    title: "Digital Services",
    subtitle: "Subscriptions & Accounts",
    description: "Premium digital subscriptions including VPN, streaming, and productivity tools at wholesale prices.",
    icon: Smartphone,
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    glowColor: "group-hover:shadow-[0_0_40px_-8px_rgba(251,113,133,0.3)]",
    badges: [
      { label: "Instant", variant: "success" },
      { label: "Auto Delivery", variant: "success" },
    ],
    features: ["VPN keys", "CapCut Pro", "Streaming accounts", "Bulk pricing"],
    path: "/dashboard/products",
  },
  {
    id: "security",
    title: "Security Services",
    subtitle: "Device Protection & MDM",
    description: "MDM bypass, remote management removal, and enterprise lock solutions for managed devices.",
    icon: Shield,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    glowColor: "group-hover:shadow-[0_0_40px_-8px_rgba(34,211,238,0.3)]",
    badges: [
      { label: "Enterprise", variant: "primary" },
      { label: "2-5 Days", variant: "warning" },
    ],
    features: ["MDM removal", "Remote management", "Supervised bypass", "All iOS versions"],
    path: "/dashboard/products",
  },
];

const badgeStyles = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  primary: "bg-primary/15 text-primary border-primary/20",
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

export default function ServicesShowcasePage() {
  const l = useT();
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: "Services" },
      ]} />

      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Our Services</h1>
        <p className="text-sm text-muted-foreground/60 mt-1.5 max-w-lg">
          Professional mobile device solutions — from IMEI checks to carrier unlocks and digital tools.
        </p>
      </div>

      {/* Quick stats bar */}
      <div className="animate-fade-in flex items-center gap-6 py-3 px-5 rounded-2xl bg-secondary/20 border border-border/15" style={{ animationDelay: "0.05s" }}>
        {[
          { icon: Zap, label: "Instant Services", value: "3" },
          { icon: Clock, label: "Avg. Delivery", value: "< 24h" },
          { icon: Star, label: "Success Rate", value: "98.5%" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2.5">
            <stat.icon className="w-4 h-4 text-primary/60" />
            <div>
              <p className="text-sm font-bold font-mono tabular-nums text-foreground">{stat.value}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-semibold">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Service Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {services.map((service) => (
          <motion.button
            key={service.id}
            variants={cardVariants}
            onClick={() => navigate(service.path)}
            className={cn(
              "group relative text-left rounded-2xl border border-border/20 bg-card/80 backdrop-blur-sm p-5",
              "transition-all duration-300 hover:border-border/40 hover:-translate-y-1",
              service.glowColor,
              service.popular && "ring-1 ring-primary/20"
            )}
          >
            {/* Popular badge */}
            {service.popular && (
              <div className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wide shadow-lg">
                ★ POPULAR
              </div>
            )}

            {/* Icon + Title */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className={cn(
                "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110",
                service.iconBg
              )}>
                <service.icon className={cn("w-5 h-5", service.iconColor)} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground leading-tight">{service.title}</h3>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">{service.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground/70 leading-relaxed mb-4">
              {service.description}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {service.badges.map((badge) => (
                <span key={badge.label} className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                  badgeStyles[badge.variant]
                )}>
                  {badge.label}
                </span>
              ))}
            </div>

            {/* Features */}
            <div className="space-y-1.5 mb-4">
              {service.features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-success/60 shrink-0" />
                  <span className="text-[11px] text-muted-foreground/60">{f}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1.5 text-primary text-xs font-semibold group-hover:gap-2.5 transition-all duration-200">
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
