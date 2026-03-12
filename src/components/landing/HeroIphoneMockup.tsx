/**
 * Premium 3D iPhone Pro mockup — Apple services themed.
 * Dark glass aesthetic with subtle gold accents. Pure CSS, no 3D libs.
 */
export default function HeroIphoneMockup() {
  return (
    <div className="relative flex items-center justify-center select-none">
      {/* Radial glow behind phone — warm gold */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.02) 40%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(201,162,39,0.06) 0%, rgba(201,162,39,0.01) 40%, transparent 70%)",
        }}
      />

      {/* Floating shadow beneath phone */}
      <div
        className="absolute bottom-[-8%] left-1/2 -translate-x-1/2 w-[55%] h-6 rounded-[50%] blur-xl"
        style={{ background: "rgba(212,175,55,0.08)" }}
      />

      {/* Phone frame with floating animation */}
      <div
        className="relative z-10 w-[260px] sm:w-[280px] lg:w-[300px]"
        style={{ perspective: "1200px" }}
      >
        <div
          className="relative rounded-[40px] border-[6px] overflow-hidden"
          style={{
            borderColor: "#1a1a1f",
            background: "#0d0d12",
            transform: "rotateY(-6deg) rotateX(3deg)",
            transformStyle: "preserve-3d",
            boxShadow:
              "20px 20px 60px rgba(0,0,0,0.55), -5px -5px 20px rgba(212,175,55,0.03), 0 0 80px rgba(212,175,55,0.04)",
            aspectRatio: "9 / 19.5",
            animation: "hero-phone-float 4s ease-in-out infinite",
          }}
        >
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-full z-30" />

          {/* Screen content — Apple services dashboard */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#08080c] via-[#0c0c12] to-[#0e0e16] p-4 pt-12 flex flex-col gap-3">
            {/* Status bar */}
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[8px] font-semibold text-white/50 tracking-wider">KKTech</span>
              <div className="flex gap-1 items-center">
                <div className="w-3 h-1.5 rounded-sm" style={{ background: "rgba(212,175,55,0.5)" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
              </div>
            </div>

            {/* Hero card — Apple services */}
            <div
              className="rounded-xl p-3 border"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.03) 100%)",
                borderColor: "rgba(212,175,55,0.12)",
              }}
            >
              <p className="text-[7px] uppercase tracking-[0.18em] font-semibold" style={{ color: "rgba(212,175,55,0.45)" }}>
                Apple Services
              </p>
              <p className="text-sm font-extrabold text-white mt-1 tracking-tight leading-tight">
                Premium Device
                <br />
                <span style={{ color: "rgba(212,175,55,0.85)" }}>Solutions</span>
              </p>
            </div>

            {/* Service grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "iCloud", Icon: Cloud, delay: "0s" },
                { label: "Unlock", Icon: LockOpen, delay: "0.5s" },
                { label: "IMEI", Icon: Smartphone, delay: "1s" },
                { label: "Repair", Icon: Wrench, delay: "1.5s" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg p-2 text-center border"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    borderColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    className="flex justify-center mb-0.5"
                    style={{ animation: `mockup-icon-float 3s ease-in-out ${s.delay} infinite` }}
                  >
                    <s.Icon className="w-3 h-3 text-white/50" strokeWidth={1.5} />
                  </div>
                  <span className="text-[6.5px] font-semibold text-white/45">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div className="mt-1 space-y-1.5">
              <p className="text-[7px] uppercase tracking-[0.12em] text-white/25 font-semibold">Recent</p>
              {[
                { name: "iPhone 15 Pro Unlock", status: "Completed", color: "#4ade80" },
                { name: "iCloud Removal", status: "Processing", color: "#D4AF37" },
              ].map((o) => (
                <div
                  key={o.name}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 border"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "rgba(255,255,255,0.035)",
                  }}
                >
                  <span className="text-[7px] font-medium text-white/50">{o.name}</span>
                  <span className="text-[6px] font-bold" style={{ color: o.color }}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Screen glare */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.015) 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
