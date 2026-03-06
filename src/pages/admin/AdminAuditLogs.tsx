import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Filter, ClipboardList, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, DataCard } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { exportToCsv } from "@/lib/csv-export";

export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!data || (data as any[]).length === 0) return [];

      const userIds = [...new Set((data as any[]).map((l: any) => l.admin_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      return (data as any[]).map((l: any) => ({
        ...l,
        admin_name: profileMap[l.admin_user_id]?.name || profileMap[l.admin_user_id]?.email || "Unknown",
      }));
    },
  });

  const actionTypes = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map((l: any) => l.action))].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    let list = logs || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l: any) =>
          l.action?.toLowerCase().includes(q) ||
          l.target_type?.toLowerCase().includes(q) ||
          l.admin_name?.toLowerCase().includes(q) ||
          l.target_id?.toLowerCase().includes(q)
      );
    }
    if (actionFilter !== "all") list = list.filter((l: any) => l.action === actionFilter);
    if (statusFilter !== "all") list = list.filter((l: any) => l.status === statusFilter);
    return list;
  }, [logs, search, actionFilter, statusFilter]);

  const handleExport = () => {
    exportToCsv("audit-logs", filtered, [
      { key: "created_at", label: "Timestamp" },
      { key: "admin_name", label: "Admin" },
      { key: "action", label: "Action" },
      { key: "target_type", label: "Target Type" },
      { key: "target_id", label: "Target ID" },
      { key: "status", label: "Status" },
    ]);
  };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track all administrative actions for security & accountability</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 h-8 text-xs">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search action, admin, target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card border-border"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs bg-card border-border">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map((a: string) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px] h-9 text-xs bg-card border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <DataCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted/40 rounded animate-pulse w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No audit logs found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Admin actions will appear here as they occur</p>
                  </td>
                </tr>
              ) : (
                filtered.map((log: any) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">
                        {format(new Date(log.created_at), "MMM dd, HH:mm:ss")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{log.admin_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-xs text-foreground">{log.target_type}</span>
                        {log.target_id && (
                          <span className="text-[10px] text-muted-foreground ml-1 font-mono">
                            #{log.target_id.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {log.status === "success" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCircle className="w-3.5 h-3.5" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {logs?.length || 0} logs
          </div>
        )}
      </DataCard>
    </PageContainer>
  );
}
