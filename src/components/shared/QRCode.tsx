import { cn } from "@/lib/utils";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * QR Code component using Google Charts API.
 * Lightweight — no external library needed.
 */
export default function QRCode({ value, size = 160, className }: QRCodeProps) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=000000&margin=8`;

  return (
    <div className={cn("rounded-[var(--radius-card)] overflow-hidden bg-white p-2 inline-block", className)}>
      <img
        src={url}
        alt="QR Code"
        width={size}
        height={size}
        className="block"
        loading="lazy"
      />
    </div>
  );
}
