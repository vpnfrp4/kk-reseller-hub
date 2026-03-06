import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getNotificationPrefs } from "@/lib/notifications";

/** Play a short pleasant notification chime via Web Audio API */
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch {
    // Audio not available
  }
}

/**
 * Global realtime listener – shows a discreet auto-dismissing toast
 * (bottom-right, 2s duration) whenever a new notification is inserted.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;

  const lowBalanceShownRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-notif-toast")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as { title?: string; body?: string; type?: string; link?: string | null };
          const prefs = getNotificationPrefs();
          if (prefs.soundEnabled) {
            playNotificationSound();
          }
          toast(n.title || "New Notification", {
            description: n.body || undefined,
            duration: 2000,
            action: n.link
              ? { label: "View", onClick: () => navRef.current(n.link!) }
              : undefined,
          });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["notif-dropdown"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const profile = payload.new as { balance?: number };
          const prefs = getNotificationPrefs();

          if (!prefs.lowBalance || profile.balance == null) return;

          const threshold = prefs.lowBalanceThreshold || 5000;
          const balance = Number(profile.balance);

          if (balance < threshold && lowBalanceShownRef.current !== threshold) {
            lowBalanceShownRef.current = threshold;

            if (prefs.soundEnabled) playNotificationSound();

            const body = `Your balance is ${balance.toLocaleString()} MMK — below your ${threshold.toLocaleString()} MMK threshold.`;

            supabase.from("notifications").insert({
              user_id: user.id,
              title: "Low Balance Alert",
              body,
              type: "warning",
              link: "/dashboard/wallet",
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              queryClient.invalidateQueries({ queryKey: ["notif-dropdown"] });
            });

            toast.warning("Low Balance Alert", {
              description: body,
              duration: 3000,
              action: { label: "Top Up", onClick: () => navRef.current("/dashboard/wallet") },
            });
          } else if (balance >= threshold) {
            lowBalanceShownRef.current = null;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
