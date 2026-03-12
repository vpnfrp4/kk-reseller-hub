/** Format a number as MMK with thousand separators */
export function mmk(value: unknown): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Format a date as "01 Mar 2026 14:30" */
export function shortDate(value: unknown): string {
  if (!value) return "-";
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date).replace(",", "");
}

/** Compact relative time: "5m ago", "2h ago", "3d ago" */
export function ago(value: unknown): string {
  if (!value) return "-";
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return "-";
  const diffSec = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

/** Normalize status string to "success" | "fail" | "pending" */
export function formatStatus(status: unknown): "success" | "fail" | "pending" {
  const s = String(status || "").toLowerCase();
  if (s.includes("approve") || s.includes("complete") || s.includes("deliver") || s.includes("active") || s === "success") return "success";
  if (s.includes("reject") || s.includes("fail") || s.includes("decline") || s.includes("cancel")) return "fail";
  return "pending";
}

/** Convert status string to Title Case label */
export function badgeLabel(status: unknown): string {
  if (!status) return "Pending";
  return String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
