import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  XCircle,
  Package,
  Info,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type NType = "success" | "info" | "warning" | "error" | "order";

interface Notif {
  id: string;
  title: string;
  body: string;
  type: NType;
  is_read: boolean;
  created_at: string;
  link?: string | null;
}

interface GroupedNotif extends Notif {
  count: number;
  groupedIds: string[];
}

const iconMap: Record<NType, typeof Bell> = {
  success: Package,
  info: Wallet,
  warning: AlertTriangle,
  error: XCircle,
  order: ShoppingCart,
};

const colorMap: Record<NType, string> = {
  success: "text-emerald-400",
  info: "text-sky-400",
  warning: "text-amber-400",
  error: "text-red-400",
  order: "text-teal-400",
};

const bgMap: Record<NType, string> = {
  success: "rgba(16,185,129,0.1)",
  info: "rgba(56,189,248,0.1)",
  warning: "rgba(245,158,11,0.1)",
  error: "rgba(239,68,68,0.1)",
  order: "rgba(13,148,136,0.1)",
};

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function groupNotifications(notifications: Notif[]): GroupedNotif[] {
  const groups: GroupedNotif[] = [];
  const WINDOW_MS = 5 * 60 * 1000;

  for (const n of notifications) {
    const existing = groups.find(
      (g) =>
        g.title === n.title &&
        g.type === n.type &&
        Math.abs(new Date(g.created_at).getTime() - new Date(n.created_at).getTime()) < WINDOW_MS
    );

    if (existing) {
      existing.count += 1;
      existing.groupedIds.push(n.id);
      if (!n.is_read) existing.is_read = false;
      if (new Date(n.created_at) > new Date(existing.created_at)) {
        existing.created_at = n.created_at;
      }
    } else {
      groups.push({ ...n, count: 1, groupedIds: [n.id] });
    }
  }

  return groups;
}

export default function NotificationDropdown() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notif-dropdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, type, is_read, created_at, link")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as Notif[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const grouped = useMemo(() => groupNotifications(notifications), [notifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dropdown-notif-rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notif-dropdown"] });
          queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const unreadCount = grouped.filter((n) => !n.is_read).length;

  const handleClick = useCallback(
    async (n: GroupedNotif) => {
      if (!n.is_read) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", n.groupedIds);
        queryClient.invalidateQueries({ queryKey: ["notif-dropdown"] });
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
      setOpen(false);
      if (n.link) navigate(n.link);
    },
    [navigate, queryClient]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notif-dropdown"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [user, queryClient]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200">
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[8px] h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] p-0 border-0 shadow-2xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
        style={{
          background: "#0D1117",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "12px",
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-sm font-semibold text-white">Notifications</p>
            <p className="text-[11px]" style={{ color: "#8b949e" }}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-teal-400 hover:text-teal-300 hover:bg-teal-400/10 gap-1.5 px-2.5 rounded-lg"
              onClick={markAllRead}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[380px] overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="w-9 h-9 rounded-lg shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/5 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <Skeleton className="h-3 w-4/5 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                    <Skeleton className="h-2.5 w-1/4 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <Bell className="w-5 h-5" style={{ color: "#484f58" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#8b949e" }}>No notifications yet</p>
            </div>
          ) : (
            grouped.slice(0, 20).map((n) => {
              const Icon = iconMap[n.type] || Info;
              const color = colorMap[n.type] || "text-gray-400";

              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 transition-all duration-200 group",
                    !n.is_read ? "border-l-2 border-l-teal-400" : "border-l-2 border-l-transparent"
                  )}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    background: !n.is_read ? "rgba(13,148,136,0.04)" : "transparent",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = !n.is_read ? "rgba(13,148,136,0.04)" : "transparent"; }}
                >
                  {/* Icon */}
                  <div
                    className="mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: bgMap[n.type] || "rgba(255,255,255,0.06)" }}
                  >
                    <Icon className={cn("w-4 h-4", color)} strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-[13px] leading-snug truncate",
                          !n.is_read ? "font-semibold text-white" : "font-medium"
                        )}
                        style={{ color: n.is_read ? "#8b949e" : undefined }}
                      >
                        {n.title}
                      </p>
                      {n.count > 1 && (
                        <span
                          className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#8b949e" }}
                        >
                          x{n.count}
                        </span>
                      )}
                    </div>
                    {n.body && (
                      <p className="text-[11px] mt-0.5 line-clamp-2 leading-relaxed" style={{ color: "#6e7681" }}>
                        {n.count > 1
                          ? `${n.body} (and ${n.count - 1} more)`
                          : n.body}
                      </p>
                    )}
                    <p className="text-[10px] mt-1 font-mono" style={{ color: "#484f58" }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className="mt-2 w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {grouped.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/dashboard/notifications");
              }}
              className="w-full py-2.5 text-[12px] font-semibold transition-colors"
              style={{ color: "#0d9488" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(13,148,136,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              View all notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
