/** Bilingual label: Burmese primary, English secondary */
export default function MmLabel({ mm, en, className = "" }: { mm: string; en: string; className?: string }) {
  return (
    <span className={className}>
      <span>{mm}</span>
      <span className="block text-[10px] text-muted-foreground/70 font-normal tracking-normal">{en}</span>
    </span>
  );
}

/** Inline bilingual - single line */
export function MmInline({ mm, en, className = "" }: { mm: string; en: string; className?: string }) {
  return (
    <span className={className}>
      {mm} <span className="text-[10px] text-muted-foreground/60">({en})</span>
    </span>
  );
}

/** Status badge with Burmese */
export function MmStatus({ status, className = "" }: { status: string; className?: string }) {
  const map: Record<string, { mm: string; en: string; style: string }> = {
    delivered: { mm: "ပြီးမြောက်", en: "Delivered", style: "badge-delivered" },
    pending: { mm: "စောင့်ဆိုင်းနေ", en: "Pending", style: "badge-pending" },
    pending_creation: { mm: "ပြင်ဆင်နေ", en: "Preparing", style: "bg-primary/10 text-primary" },
    pending_review: { mm: "စစ်ဆေးနေ", en: "Review", style: "badge-pending" },
    approved: { mm: "အတည်ပြုပြီး", en: "Approved", style: "badge-delivered" },
    rejected: { mm: "ငြင်းပယ်", en: "Rejected", style: "badge-cancelled" },
    cancelled: { mm: "ပယ်ဖျက်", en: "Cancelled", style: "badge-cancelled" },
  };
  const s = map[status] || { mm: status, en: status, style: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.style} ${className}`}>
      {s.mm}
    </span>
  );
}
