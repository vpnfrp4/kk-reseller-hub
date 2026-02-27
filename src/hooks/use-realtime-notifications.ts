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

    // Two-tone chime: C5 → E5
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
    // Audio not available — silently skip
  }
}

/**
 * Global realtime listener – shows a sonner toast whenever a new
 * notification row is inserted for the current user.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const navRef = useRef(navigate);
  navRef.current = navigate;

  // Track whether we already showed a low-balance alert this session
  // to avoid spamming on every profile update
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
            action: n.link
              ? { label: "View", onClick: () => navRef.current(n.link!) }
              : undefined,
          });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

          // Only alert once per threshold crossing (not on every update)
          if (balance < threshold && lowBalanceShownRef.current !== threshold) {
            lowBalanceShownRef.current = threshold;

            if (prefs.soundEnabled) playNotificationSound();

            const body = `Your balance is ${balance.toLocaleString()} MMK — below your ${threshold.toLocaleString()} MMK threshold.`;

            // Persist to DB for notification history
            supabase.from("notifications").insert({
              user_id: user.id,
              title: "Low Balance Alert",
              body,
              type: "warning",
              link: "/dashboard/wallet",
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
            });

            toast.warning("Low Balance Alert", {
              description: body,
              action: { label: "Top Up", onClick: () => navRef.current("/dashboard/wallet") },
              duration: 8000,
            });
          } else if (balance >= threshold) {
            // Reset so it can fire again next time balance drops
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