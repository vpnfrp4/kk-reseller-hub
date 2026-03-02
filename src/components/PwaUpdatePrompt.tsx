import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import React from "react";

const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, UPDATE_CHECK_INTERVAL);
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast("A new version of KKREMOTER is available.", {
        duration: Infinity,
        icon: React.createElement(RefreshCw, { className: "h-5 w-5 text-primary animate-spin" }),
        action: {
          label: "Update Now",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
