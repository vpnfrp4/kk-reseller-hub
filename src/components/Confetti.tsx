import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
}

const COLORS = [
  "hsl(43, 76%, 47%)",   // gold
  "hsl(48, 100%, 50%)",  // bright gold
  "hsl(142, 71%, 45%)",  // success green
  "hsl(142, 76%, 36%)",  // darker green
  "hsl(43, 76%, 70%)",   // light gold
  "hsl(0, 0%, 95%)",     // white
];

export default function Confetti({ duration = 3000 }: { duration?: number }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const count = 60;
    const generated: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -(Math.random() * 20 + 5),
      rotation: Math.random() * 360,
      scale: Math.random() * 0.6 + 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.8,
      duration: Math.random() * 1.5 + 1.5,
      drift: (Math.random() - 0.5) * 60,
    }));
    setParticles(generated);

    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            "--confetti-drift": `${p.drift}px`,
          } as React.CSSProperties}
        >
          <div
            style={{
              width: `${6 * p.scale}px`,
              height: `${8 * p.scale}px`,
              backgroundColor: p.color,
              borderRadius: "1px",
              transform: `rotate(${p.rotation}deg)`,
              animation: `confetti-spin ${p.duration * 0.6}s linear ${p.delay}s infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
