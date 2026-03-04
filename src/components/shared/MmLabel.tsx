import { useLang } from "@/contexts/LangContext";

/** Bilingual label: shows primary lang large, secondary lang small */
export default function MmLabel({ mm, en, className = "" }: { mm: string; en: string; className?: string }) {
  const { lang } = useLang();
  const primary = lang === "mm" ? mm : en;
  const secondary = lang === "mm" ? en : mm;
  return (
    <span className={className}>
      <span>{primary}</span>
      <span className="block text-[10px] text-muted-foreground/70 font-normal tracking-normal">{secondary}</span>
    </span>
  );
}

/** Inline bilingual - single line */
export function MmInline({ mm, en, className = "" }: { mm: string; en: string; className?: string }) {
  const { lang } = useLang();
  const primary = lang === "mm" ? mm : en;
  const secondary = lang === "mm" ? en : mm;
  return (
    <span className={className}>
      {primary} <span className="text-[10px] text-muted-foreground/60">({secondary})</span>
    </span>
  );
}

/** Status badge - lang-aware */
export function MmStatus({ status, className = "" }: { status: string; className?: string }) {
  const { lang } = useLang();
  const map: Record<string, { mm: string; en: string; style: string }> = {
    delivered: { mm: "ပြီးမြောက်", en: "Delivered", style: "badge-delivered" },
    pending: { mm: "စောင့်ဆိုင်းနေ", en: "Pending", style: "badge-pending" },
    pending_creation: { mm: "ပြင်ဆင်နေ", en: "Preparing", style: "badge-pending" },
    pending_review: { mm: "စစ်ဆေးနေ", en: "Review", style: "badge-review" },
    processing: { mm: "လုပ်ဆောင်နေ", en: "Processing", style: "badge-processing" },
    completed: { mm: "ပြီးဆုံး", en: "Completed", style: "badge-completed" },
    approved: { mm: "အတည်ပြုပြီး", en: "Approved", style: "badge-approved" },
    rejected: { mm: "ငြင်းပယ်", en: "Rejected", style: "badge-rejected" },
    cancelled: { mm: "ပယ်ဖျက်", en: "Cancelled", style: "badge-cancelled" },
    api_pending: { mm: "API စောင့်နေ", en: "API Pending", style: "badge-api-pending" },
  };
  const s = map[status] || { mm: status, en: status, style: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.style} ${className}`}>
      {s[lang]}
    </span>
  );
}
