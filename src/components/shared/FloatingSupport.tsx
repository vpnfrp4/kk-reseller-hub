import { MessageCircle } from "lucide-react";

const TELEGRAM_URL = "https://t.me/kktech_support";

export default function FloatingSupport() {
  return (
    <a
      href={TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="floating-support"
      title="Contact Support on Telegram"
    >
      <MessageCircle className="w-6 h-6" strokeWidth={2} />
    </a>
  );
}
