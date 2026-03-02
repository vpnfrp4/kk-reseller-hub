import { useState, useCallback, useEffect } from "react";
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

const iconMap: Record<NType, typeof Bell> = {
  success: Package,
  info: Wallet,
  warning: AlertTriangle,
  error: XCircle,
  order: ShoppingCart,
};

const colorMap: Record<NType, string> = {
  success: "text-success",
  info: "text-ice",
  warning: "text-warning",
  error: "text-destructive",
  order: "text-primary",
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
        .limit(20);
      return (data || []) as Notif[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleClick = useCallback(
    async (n: Notif) => {
      if (!n.is_read) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", n.id);
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
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200">
          <Bell className="w-[18px] h-[18px]" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1 shadow-[0_0_8px_hsl(var(--primary)/0.4)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] p-0 bg-card/80 backdrop-blur-xl border border-border/60 shadow-[var(--shadow-elevated)] rounded-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-secondary/30">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up ✓"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-primary hover:text-primary hover:bg-primary/10 gap-1.5 px-2.5 rounded-lg"
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
                  <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/5 rounded" />
                    <Skeleton className="h-3 w-4/5 rounded" />
                    <Skeleton className="h-2.5 w-1/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                <Bell className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = iconMap[n.type] || Info;
              const color = colorMap[n.type] || "text-muted-foreground";

              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left flex items-start gap-3 px-4 py-3 transition-all duration-200 border-b border-border/30 last:border-0 group",
                    !n.is_read
                      ? "bg-secondary/40 border-l-[3px] border-l-primary"
                      : "bg-card hover:bg-secondary/30 border-l-[3px] border-l-transparent"
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      !n.is_read ? "bg-primary/10" : "bg-secondary"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", color)} strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-[13px] leading-snug truncate",
                        !n.is_read
                          ? "font-semibold text-foreground"
                          : "font-medium text-muted-foreground"
                      )}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <span className="mt-2 w-2 h-2 rounded-full bg-primary shrink-0 shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/dashboard/notifications");
              }}
              className="w-full py-2.5 text-[12px] font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              View all notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
