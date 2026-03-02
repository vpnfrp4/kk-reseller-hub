import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react";
import React from "react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:backdrop-blur-xl group-[.toaster]:bg-background/80 group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.3)] group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:!border-green-500/20 group-[.toaster]:!bg-green-950/60 group-[.toaster]:backdrop-blur-xl",
          error:
            "group-[.toaster]:!border-red-500/20 group-[.toaster]:!bg-red-950/60 group-[.toaster]:backdrop-blur-xl",
          info:
            "group-[.toaster]:!border-primary/20 group-[.toaster]:!bg-primary/5 group-[.toaster]:backdrop-blur-xl",
        },
      }}
      icons={{
        success: React.createElement(CheckCircle, { className: "h-5 w-5 text-green-400" }),
        error: React.createElement(XCircle, { className: "h-5 w-5 text-red-400" }),
        warning: React.createElement(AlertTriangle, { className: "h-5 w-5 text-amber-400" }),
        info: React.createElement(Info, { className: "h-5 w-5 text-primary" }),
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
