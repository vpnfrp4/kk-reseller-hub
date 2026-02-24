import { useMemo } from "react";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export default function MiniSparkline({
  data,
  width = 80,
  height = 28,
  color = "hsl(var(--primary))",
  className = "",
}: MiniSparklineProps) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return "";
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const points = data.map((v, i) => ({
      x: i * stepX,
      y: height - ((v - min) / range) * (height - 4) - 2,
    }));
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  }, [data, width, height]);

  const areaPath = useMemo(() => {
    if (!path) return "";
    return `${path} L${width},${height} L0,${height} Z`;
  }, [path, width, height]);

  if (!data || data.length < 2) return null;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#spark-grad-${color.replace(/[^a-z0-9]/gi, "")})`}
      />
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
