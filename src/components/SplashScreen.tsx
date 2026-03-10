import { useEffect, useState } from "react";
import kkLogo from "@/assets/kkremote-logo.png";

interface SplashScreenProps {
  onFinished: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onFinished, minDuration = 1200 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 100;
        // Ease-out: fast start, slow finish
        const remaining = 100 - p;
        return p + Math.max(remaining * 0.06, 0.5);
      });
    }, 30);

    const timer = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(onFinished, 600);
      }, 300);
    }, minDuration);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [minDuration, onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060608] transition-opacity duration-600 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Green radial glow behind logo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(34,197,94,0.08)_0%,_transparent_60%)]" />
      {/* Secondary subtle gold glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,_rgba(212,175,55,0.04)_0%,_transparent_50%)]" />

      {/* Animated circuit lines (decorative) */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500 to-transparent animate-[shimmerLine_3s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent animate-[shimmerLine_4s_ease-in-out_infinite_0.5s]" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent animate-[shimmerLine_3.5s_ease-in-out_infinite_1s]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10">
        {/* Logo with breathing glow */}
        <div className="relative">
          {/* Green glow pulse behind logo */}
          <div className="absolute -inset-6 rounded-3xl bg-green-500/10 blur-2xl animate-[breathe_3s_ease-in-out_infinite]" />
          <div className="absolute -inset-3 rounded-2xl bg-green-500/5 blur-xl animate-[breathe_3s_ease-in-out_infinite_0.5s]" />

          <img
            src={kkLogo}
            alt="KKRemoter Logo"
            className="relative h-36 w-36 sm:h-44 sm:w-44 rounded-2xl object-contain animate-[breathe_3s_ease-in-out_infinite] drop-shadow-[0_0_40px_rgba(34,197,94,0.25)]"
          />
        </div>

        {/* Brand text */}
        <div className="flex flex-col items-center gap-1 animate-[fadeInUp_0.8s_ease-out_0.3s_both]">
          <p className="text-xs tracking-[0.4em] uppercase text-green-500/40 font-medium">
            Digital Services Platform
          </p>
        </div>

        {/* Slim progress bar */}
        <div className="w-48 sm:w-56 animate-[fadeInUp_0.8s_ease-out_0.6s_both]">
          <div className="h-[2px] w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-100 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #22c55e 0%, #D4AF37 100%)",
                boxShadow: "0 0 12px rgba(34,197,94,0.4)",
              }}
            />
          </div>
          <p className="mt-3 text-center text-[10px] tracking-[0.2em] uppercase text-white/20 font-medium">
            Loading
          </p>
        </div>
      </div>
    </div>
  );
}
