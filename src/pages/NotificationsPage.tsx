import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  CheckCheck,
  Filter,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";
import { t, useT } from "@/lib/i18n";

type NotificationType = "success" | "info" | "warning" | "error" | "order";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  link?: string | null;
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; colorClass: string; bgClass: string }> = {
  success: { icon: CheckCircle2, colorClass: "text-success", bgClass: "bg-success/10 border-success/20" },
  info: { icon: Info, colorClass: "text-primary", bgClass: "bg-primary/10 border-primary/20" },
  warning: { icon: AlertTriangle, colorClass: "text-warning", bgClass: "bg-warning/10 border-warning/20" },
  error: { icon: AlertTriangle, colorClass: "text-destructive", bgClass: "bg-destructive/10 border-destructive/20" },
  order: { icon: ShoppingCart, colorClass: "text-primary", bgClass: "bg-primary/10 border-primary/20" },
};

export default function NotificationsPage() {
  const l = useT();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

  // Realtime: auto-refresh on new/updated notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const filtered = filter === "unread"
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return l(t.notifs.justNow);
    if (diffMin < 60) return `${diffMin} ${l(t.notifs.minutesAgo)}`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ${l(t.notifs.hoursAgo)}`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays} ${l(t.notifs.daysAgo)}`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.notifications) },
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {l(t.notifs.title)}
          </h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `${unreadCount} ${l(t.notifs.unread)}` : l(t.notifs.allCaughtUp)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            {l(t.notifs.all)}
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            {l(t.notifs.unreadFilter)}
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </Button>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5 text-muted-foreground">
              <CheckCheck className="w-3.5 h-3.5" />
              {l(t.notifs.markAllRead)}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {l(t.notifs.clearAll)}
            </Button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {filter === "unread" ? l(t.notifs.noUnread) : l(t.notifs.noNotifs)}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filtered.map((n, i) => {
              const config = typeConfig[n.type] || typeConfig.info;
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  className={`p-4 sm:p-5 flex items-start gap-4 transition-all duration-200 hover:bg-muted/20 opacity-0 animate-fade-in ${
                    !n.is_read ? "bg-primary/[0.03]" : ""
                  }`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div className={`mt-0.5 p-2 rounded-lg border ${config.bgClass} shrink-0`}>
                    <Icon className={`w-4 h-4 ${config.colorClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                        )}
                        {n.link && (
                          <Link
                            to={n.link}
                            className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Order
                          </Link>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="mt-1 p-1 rounded hover:bg-muted transition-colors shrink-0"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary/60 hover:text-primary" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
