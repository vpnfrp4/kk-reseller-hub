import { useState, useEffect, useCallback } from "react";
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
  Wallet,
  XCircle,
  Zap,
  Package,
} from "lucide-react";
import { t, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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

/* ── Color-coded type config ── */
const typeConfig: Record<NotificationType, { icon: typeof Bell; colorClass: string; bgClass: string }> = {
  success: { icon: Package, colorClass: "text-[hsl(142_71%_45%)]", bgClass: "bg-[hsl(142_71%_45%/0.1)] border-[hsl(142_71%_45%/0.2)]" },
  info: { icon: Wallet, colorClass: "text-[hsl(199_89%_48%)]", bgClass: "bg-[hsl(199_89%_48%/0.1)] border-[hsl(199_89%_48%/0.2)]" },
  warning: { icon: AlertTriangle, colorClass: "text-[hsl(38_92%_50%)]", bgClass: "bg-[hsl(38_92%_50%/0.1)] border-[hsl(38_92%_50%/0.2)]" },
  error: { icon: XCircle, colorClass: "text-destructive", bgClass: "bg-destructive/10 border-destructive/20" },
  order: { icon: ShoppingCart, colorClass: "text-[hsl(270_60%_60%)]", bgClass: "bg-[hsl(270_60%_60%/0.1)] border-[hsl(270_60%_60%/0.2)]" },
};

/* ── Date grouping helpers ── */
function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  return "Earlier";
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const map = new Map<string, Notification[]>();
  const order = ["Today", "Yesterday", "Earlier"];
  for (const n of notifications) {
    const group = getDateGroup(n.created_at);
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(n);
  }
  return order.filter((k) => map.has(k)).map((label) => ({ label, items: map.get(label)! }));
}

export default function NotificationsPage() {
  const l = useT();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

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

  const filtered = (filter === "unread"
    ? notifications.filter((n) => !n.is_read)
    : notifications
  ).filter((n) => !dismissedIds.has(n.id));

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const groups = groupByDate(filtered);

  const markAsRead = useCallback(async (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setDismissedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }, 400);
  }, [queryClient]);

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    setDismissedIds(new Set(unreadIds));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setDismissedIds(new Set());
    }, 400);
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const markSelectedRead = async () => {
    setDismissedIds(new Set(selectedIds));
    for (const id of selectedIds) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    }
    setSelectedIds(new Set());
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setDismissedIds(new Set());
    }, 400);
  };

  const deleteSelected = async () => {
    for (const id of selectedIds) {
      await supabase.from("notifications").delete().eq("id", id);
    }
    setSelectedIds(new Set());
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
    <div className="space-y-[var(--space-card)]">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.notifications) },
      ]} />

      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-default)] animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5 animate-pulse shadow-[0_0_8px_hsl(142_71%_45%/0.4)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{l(t.notifs.title)}</p>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} ${l(t.notifs.unread)}` : l(t.notifs.allCaughtUp)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[var(--space-tight)]">
          <button
            onClick={() => setFilter("all")}
            className={`filter-pill ${filter === "all" ? "filter-pill-active" : "filter-pill-inactive"}`}
          >
            {l(t.notifs.all)}
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`filter-pill flex items-center gap-1.5 ${filter === "unread" ? "filter-pill-active" : "filter-pill-inactive"}`}
          >
            <Filter className="w-3 h-3" />
            {l(t.notifs.unreadFilter)}
          </button>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5 text-muted-foreground text-[11px]">
              <CheckCheck className="w-3.5 h-3.5" />
              {l(t.notifs.markAllRead)}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1.5 text-muted-foreground hover:text-destructive text-[11px]">
              <Trash2 className="w-3.5 h-3.5" />
              {l(t.notifs.clearAll)}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-primary/[0.06] border border-primary/20 animate-fade-in">
          <span className="text-xs font-semibold text-foreground">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={markSelectedRead} className="gap-1.5 text-xs h-8">
            <CheckCheck className="w-3.5 h-3.5" />
            Mark read
          </Button>
          <Button variant="ghost" size="sm" onClick={deleteSelected} className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      )}

      {/* Notifications grouped by date */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted/30" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted/30 rounded w-1/3" />
                  <div className="h-3 bg-muted/20 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-7 h-7 text-muted-foreground/20" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {filter === "unread" ? l(t.notifs.noUnread) : l(t.notifs.noNotifs)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">All caught up</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
          {groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[10px] text-muted-foreground font-mono">
                  {group.items.length}
                </span>
              </div>

              <div className="space-y-2">
                {group.items.map((n, i) => {
                  const config = typeConfig[n.type] || typeConfig.info;
                  const Icon = config.icon;
                  const isDismissing = dismissedIds.has(n.id);
                  const isSelected = selectedIds.has(n.id);

                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "group relative rounded-xl border bg-card p-4 flex items-start gap-4 transition-all duration-300",
                        !n.is_read
                          ? "border-primary/15 bg-primary/[0.02] shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                          : "border-border/40 hover:border-border/60",
                        "hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)] hover:-translate-y-px",
                        isDismissing && "opacity-0 -translate-x-8",
                        isSelected && "ring-1 ring-primary/30"
                      )}
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(n.id)}
                        className={cn(
                          "mt-1 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-200",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-border/50 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                      </button>

                      {/* Icon */}
                      <div className={cn("mt-0.5 p-2.5 rounded-xl border shrink-0", config.bgClass)}>
                        <Icon className={cn("w-4 h-4", config.colorClass)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={cn(
                              "text-[13px] font-semibold leading-snug",
                              !n.is_read ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                {n.body}
                              </p>
                            )}
                            {n.link && (
                              <Link
                                to={n.link}
                                className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/[0.08] text-primary hover:bg-primary/15 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Details
                              </Link>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                              {formatTime(n.created_at)}
                            </span>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_hsl(142_71%_45%/0.5)]" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mark as read */}
                      {!n.is_read && (
                        <button
                          onClick={() => markAsRead(n.id)}
                          className="mt-1 p-1.5 rounded-lg hover:bg-muted/30 transition-all duration-200 shrink-0 opacity-0 group-hover:opacity-100"
                          title="Mark as read"
                        >
                          <CheckCircle2 className="w-4 h-4 text-primary/40 hover:text-primary transition-colors" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
