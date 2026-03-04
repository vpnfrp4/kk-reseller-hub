import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  delivered: { label: "Delivered", className: "badge-delivered" },
  pending: { label: "Pending", className: "badge-pending" },
  pending_creation: { label: "Preparing", className: "badge-pending" },
  pending_review: { label: "Review", className: "badge-review" },
  processing: { label: "Processing", className: "badge-processing" },
  completed: { label: "Completed", className: "badge-completed" },
  approved: { label: "Approved", className: "badge-approved" },
  rejected: { label: "Rejected", className: "badge-rejected" },
  cancelled: { label: "Cancelled", className: "badge-cancelled" },
  api_pending: { label: "API Pending", className: "badge-api-pending" },
  active: { label: "Active", className: "badge-delivered" },
  suspended: { label: "Suspended", className: "badge-pending" },
  blocked: { label: "Blocked", className: "badge-cancelled" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || { label: status, className: "bg-muted text-muted-foreground font-semibold" };
  return (
    <span className={cn("text-[11px] px-2.5 py-1 rounded-full capitalize inline-block", config.className, className)}>
      {config.label}
    </span>
  );
}
