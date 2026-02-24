import { cn } from "@/lib/utils";

interface DataCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Optional header actions (buttons, filters) */
  actions?: React.ReactNode;
  /** Optional footer */
  footer?: React.ReactNode;
  /** Remove default padding from body */
  noPadding?: boolean;
}

export default function DataCard({
  title,
  description,
  children,
  className,
  actions,
  footer,
  noPadding = false,
}: DataCardProps) {
  return (
    <div className={cn("glass-card overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-default p-card border-b border-border">
          <div>
            {title && <h3 className="text-h3 text-foreground">{title}</h3>}
            {description && <p className="text-caption text-muted-foreground mt-micro">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-tight shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-card")}>{children}</div>
      {footer && (
        <div className="border-t border-border p-card">{footer}</div>
      )}
    </div>
  );
}
