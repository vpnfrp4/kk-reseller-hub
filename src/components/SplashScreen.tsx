import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinished: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onFinished, minDuration = 1800 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinished, 500); // match fade-out duration
    }, minDuration);
    return () => clearTimeout(timer);
  }, [minDuration, onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0B0B0F] transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(43_65%_52%/0.06)_0%,_transparent_70%)]" />

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="animate-[logoPulse_2s_ease-in-out_infinite] select-none">
          <h1
            className="text-5xl sm:text-6xl font-bold tracking-[0.15em]"
            style={{
              background: "linear-gradient(135deg, #D4AF37 0%, #F5D77A 50%, #D4AF37 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            KKTech
          </h1>
          <p className="mt-1 text-center text-xs tracking-[0.3em] uppercase text-[#D4AF37]/50 font-medium">
            Reseller Hub
          </p>
        </div>

        {/* Circular progress spinner */}
        <div className="relative h-10 w-10">
          <svg className="h-10 w-10 animate-spin" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="17" stroke="hsl(43 65% 52% / 0.15)" strokeWidth="2.5" />
            <circle
              cx="20"
              cy="20"
              r="17"
              stroke="url(#gold-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="80 107"
              className="origin-center"
            />
            <defs>
              <linearGradient id="gold-gradient" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#F5D77A" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
