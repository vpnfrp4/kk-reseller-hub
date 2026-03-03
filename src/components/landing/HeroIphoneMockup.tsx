/**
 * Premium 3D iPhone mockup with neon green glow — pure CSS/SVG, no 3D libs.
 * Renders a realistic phone frame showing a KKTech dashboard screenshot.
 */
export default function HeroIphoneMockup() {
  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Radial glow behind phone */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(57,255,20,0.12) 0%, rgba(57,255,20,0.04) 40%, transparent 70%)",
        }}
      />
      {/* Light mode glow */}
      <div
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(21,128,61,0.08) 0%, rgba(21,128,61,0.02) 40%, transparent 70%)",
        }}
      />

      {/* Floating shadow beneath phone */}
      <div
        className="absolute bottom-[-8%] left-1/2 -translate-x-1/2 w-[55%] h-6 rounded-[50%] blur-xl dark:block hidden"
        style={{ background: "rgba(57,255,20,0.10)" }}
      />
      <div
        className="absolute bottom-[-8%] left-1/2 -translate-x-1/2 w-[55%] h-6 rounded-[50%] blur-xl dark:hidden"
        style={{ background: "rgba(21,128,61,0.08)" }}
      />

      {/* Phone frame */}
      <div
        className="relative z-10 w-[260px] sm:w-[280px] lg:w-[300px]"
        style={{
          perspective: "1200px",
        }}
      >
        <div
          className="relative rounded-[40px] border-[6px] dark:border-[#1a1a22] border-[#2a2a35] bg-[#0d0d12] overflow-hidden"
          style={{
            transform: "rotateY(-8deg) rotateX(4deg)",
            transformStyle: "preserve-3d",
            boxShadow:
              "20px 20px 60px rgba(0,0,0,0.5), -5px -5px 20px rgba(57,255,20,0.04), 0 0 80px rgba(57,255,20,0.06)",
            aspectRatio: "9 / 19.5",
          }}
        >
          {/* Notch / Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-full z-30" />

          {/* Screen content — stylized dashboard */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0e] via-[#0d0d14] to-[#0f0f18] p-4 pt-12 flex flex-col gap-3">
            {/* Status bar */}
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[8px] font-semibold text-white/60">KKTech</span>
              <div className="flex gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-[#39FF14]/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
              </div>
            </div>

            {/* Balance card */}
            <div className="rounded-xl bg-gradient-to-br from-[#39FF14]/10 to-[#39FF14]/5 border border-[#39FF14]/15 p-3">
              <p className="text-[7px] uppercase tracking-[0.15em] text-[#39FF14]/50 font-semibold">Wallet Balance</p>
              <p className="text-lg font-extrabold text-white mt-0.5 tracking-tight">125,000 <span className="text-[9px] text-white/40">MMK</span></p>
              <div className="flex gap-2 mt-2">
                <div className="flex-1 h-5 rounded-md bg-[#39FF14] flex items-center justify-center">
                  <span className="text-[7px] font-bold text-[#0a0a0e]">Top Up</span>
                </div>
                <div className="flex-1 h-5 rounded-md border border-[#39FF14]/30 flex items-center justify-center">
                  <span className="text-[7px] font-semibold text-[#39FF14]/80">History</span>
                </div>
              </div>
            </div>

            {/* Quick services */}
            <div className="grid grid-cols-3 gap-1.5">
              {["IMEI", "VPN", "CapCut"].map((s) => (
                <div key={s} className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-2 text-center">
                  <div className="w-4 h-4 mx-auto rounded-md bg-[#39FF14]/15 mb-1" />
                  <span className="text-[6px] font-semibold text-white/50">{s}</span>
                </div>
              ))}
            </div>

            {/* Recent orders */}
            <div className="mt-1 space-y-1.5">
              <p className="text-[7px] uppercase tracking-[0.12em] text-white/30 font-semibold">Recent Orders</p>
              {[
                { name: "iPhone 15 Unlock", status: "Completed", color: "#39FF14" },
                { name: "VPN Key - 1 Year", status: "Processing", color: "#FBBF24" },
              ].map((o) => (
                <div key={o.name} className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/[0.04] px-2.5 py-1.5">
                  <span className="text-[7px] font-medium text-white/60">{o.name}</span>
                  <span className="text-[6px] font-bold" style={{ color: o.color }}>{o.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subtle screen glare */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.02) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
