import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  label: string;
  /** Render cell content. Falls back to row[key] */
  render?: (row: T, index: number) => React.ReactNode;
  /** Right-align (use for numbers/currency) */
  align?: "left" | "right" | "center";
  /** Hide on mobile card view */
  hideOnMobile?: boolean;
  /** Priority column — visually stronger */
  priority?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  /** Optional per-row className */
  rowClassName?: (row: T) => string;
}

export default function ResponsiveTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data available",
  className,
  onRowClick,
  rowClassName,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-page text-muted-foreground text-body">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className={cn("hidden md:block overflow-x-auto", className)}>
        <table className="premium-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(col.align === "right" && "text-right", col.align === "center" && "text-center")}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  "animate-row-in transition-all duration-200",
                  onRowClick && "cursor-pointer",
                  rowClassName?.(row),
                )}
                style={{ animationDelay: `${idx * 30}ms` }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "p-default text-sm",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.priority ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {col.render ? col.render(row, idx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className={cn("md:hidden space-y-compact", className)}>
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            className={cn(
              "glass-card p-default space-y-compact transition-colors duration-700",
              onRowClick && "cursor-pointer active:scale-[0.99]",
              rowClassName?.(row),
            )}
            onClick={() => onRowClick?.(row)}
          >
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((col) => (
                <div key={col.key} className="flex items-center justify-between gap-tight">
                  <span className="text-caption text-muted-foreground uppercase tracking-wider">
                    {col.label}
                  </span>
                  <span className={cn(
                    "text-sm",
                    col.priority ? "font-semibold text-foreground" : "text-foreground"
                  )}>
                    {col.render ? col.render(row, 0) : row[col.key]}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
