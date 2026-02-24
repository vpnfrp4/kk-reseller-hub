import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Max width constraint. Default: "max-w-7xl" */
  maxWidth?: string;
}

export default function PageContainer({
  children,
  className,
  maxWidth = "max-w-7xl",
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full space-y-section", maxWidth, className)}>
      {children}
    </div>
  );
}
