import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Server,
  TrendingDown,
  Smartphone,
} from "lucide-react";
import { format } from "date-fns";
import { Money } from "@/components/shared";
import { Input } from "@/components/ui/input";

export default function AdminMonitoring() {
  const [tab, setTab] = useState("errors");
  const [ifreeSearch, setIfreeSearch] = useState("");

  // Failed orders
  const { data: failedOrders = [], isLoading: loadingFailed, refetch: refetchFailed } = useQuery({
    queryKey: ["admin-failed-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_code, product_name, status, price, created_at, admin_notes, external_order_id, provider_response, user_id")
        .in("status", ["failed", "cancelled", "rejected"])
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // API logs (errors)
  const { data: apiErrors = [], isLoading: loadingErrors, refetch: refetchErrors } = useQuery({
    queryKey: ["admin-api-errors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_logs")
        .select("*")
        .eq("success", false)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // All API logs (recent)
  const { data: recentLogs = [], isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["admin-api-logs-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Client-side errors (from ErrorBoundary)
  const { data: clientErrors = [], isLoading: loadingClientErrors, refetch: refetchClientErrors } = useQuery({
    queryKey: ["admin-client-errors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_logs")
        .select("*")
        .eq("log_type", "error_boundary")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Provider health
  const { data: providerHealth = [], isLoading: loadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ["admin-provider-health"],
    queryFn: async () => {
      const { data: providers } = await supabase
        .from("imei_providers")
        .select("id, name, status, success_rate, total_completed, avg_rating, api_url")
        .order("name");

      if (!providers) return [];

      // Get recent error counts per provider
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: errorCounts } = await supabase
        .from("api_logs")
        .select("provider_id")
        .eq("success", false)
        .gte("created_at", twentyFourHoursAgo);

      const errorMap = new Map<string, number>();
      (errorCounts || []).forEach((e: any) => {
        errorMap.set(e.provider_id, (errorMap.get(e.provider_id) || 0) + 1);
      });

      const { data: totalCounts } = await supabase
        .from("api_logs")
        .select("provider_id")
        .gte("created_at", twentyFourHoursAgo);

      const totalMap = new Map<string, number>();
      (totalCounts || []).forEach((e: any) => {
        totalMap.set(e.provider_id, (totalMap.get(e.provider_id) || 0) + 1);
      });

      return providers.map((p: any) => ({
        ...p,
        errors_24h: errorMap.get(p.id) || 0,
        calls_24h: totalMap.get(p.id) || 0,
        health: (() => {
          const errors = errorMap.get(p.id) || 0;
          const total = totalMap.get(p.id) || 0;
          if (total === 0) return "idle";
          const errorRate = errors / total;
          if (errorRate > 0.3) return "critical";
          if (errorRate > 0.1) return "degraded";
          return "healthy";
        })(),
      }));
    },
  });

  // Refund stats
  const { data: refundStats } = useQuery({
    queryKey: ["admin-refund-stats"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, count } = await supabase
        .from("wallet_transactions")
        .select("amount", { count: "exact" })
        .eq("type", "refund")
        .gte("created_at", twentyFourHoursAgo);

      const totalAmount = (data || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      return { count: count || 0, totalAmount };
    },
  });

  // iFree IMEI checks
  const { data: ifreeChecks = [], isLoading: loadingIfree, refetch: refetchIfree } = useQuery({
    queryKey: ["admin-ifree-checks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ifree_checks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data as any[]) || [];
    },
  });

  const filteredIfreeChecks = ifreeSearch
    ? ifreeChecks.filter((c: any) =>
        c.imei?.includes(ifreeSearch) ||
        c.service_name?.toLowerCase().includes(ifreeSearch.toLowerCase())
      )
    : ifreeChecks;

  const handleRefresh = () => {
    refetchFailed();
    refetchErrors();
    refetchLogs();
    refetchHealth();
    refetchIfree();
    refetchClientErrors();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      failed: "destructive",
      cancelled: "secondary",
      rejected: "destructive",
      healthy: "default",
      degraded: "secondary",
      critical: "destructive",
      idle: "outline",
    };
    return <Badge variant={(map[status] || "outline") as any}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Monitoring</h1>
          <p className="text-sm text-muted-foreground">API health, errors, and refund tracking</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in [animation-delay:0.08s]">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{failedOrders.length}</p>
                <p className="text-xs text-muted-foreground">Failed Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{apiErrors.length}</p>
                <p className="text-xs text-muted-foreground">API Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{refundStats?.count || 0}</p>
                <p className="text-xs text-muted-foreground">Refunds (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                <Server className="w-4 h-4 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {providerHealth.filter((p: any) => p.health === "healthy").length}/{providerHealth.length}
                </p>
                <p className="text-xs text-muted-foreground">Providers OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientErrors.length}</p>
                <p className="text-xs text-muted-foreground">Client Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="animate-fade-in [animation-delay:0.15s]">
        <TabsList className="flex-wrap">
          <TabsTrigger value="errors">Failed Orders</TabsTrigger>
          <TabsTrigger value="api-errors">API Errors</TabsTrigger>
          <TabsTrigger value="client-errors" className="gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            Client Errors
            {clientErrors.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">{clientErrors.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="health">Provider Health</TabsTrigger>
          <TabsTrigger value="logs">All Logs</TabsTrigger>
          <TabsTrigger value="ifree" className="gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            iFree Checks
          </TabsTrigger>
        </TabsList>

        {/* Failed Orders */}
        <TabsContent value="errors">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingFailed ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : failedOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No failed orders — All clear</TableCell></TableRow>
                  ) : failedOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.order_code}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{order.product_name}</TableCell>
                      <TableCell>{statusBadge(order.status)}</TableCell>
                      <TableCell><Money amount={order.price} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(order.created_at), "MMM d, HH:mm")}</TableCell>
                      <TableCell className="max-w-[250px] truncate text-xs">{order.admin_notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Errors */}
        <TabsContent value="api-errors">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>HTTP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingErrors ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : apiErrors.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No API errors — All clear</TableCell></TableRow>
                  ) : apiErrors.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "MMM d, HH:mm:ss")}</TableCell>
                      <TableCell className="font-mono text-xs">{log.action}</TableCell>
                      <TableCell><Badge variant="outline">{log.log_type}</Badge></TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-destructive">{log.error_message || "Unknown"}</TableCell>
                      <TableCell className="text-xs">{log.duration_ms ? `${log.duration_ms}ms` : "—"}</TableCell>
                      <TableCell className="text-xs">{log.response_status || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provider Health */}
        <TabsContent value="health">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Calls (24h)</TableHead>
                    <TableHead>Errors (24h)</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingHealth ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : providerHealth.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No providers configured</TableCell></TableRow>
                  ) : providerHealth.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell>{statusBadge(p.health)}</TableCell>
                      <TableCell>{p.success_rate != null ? `${p.success_rate}%` : "—"}</TableCell>
                      <TableCell>{p.calls_24h}</TableCell>
                      <TableCell className={p.errors_24h > 0 ? "text-destructive font-medium" : ""}>{p.errors_24h}</TableCell>
                      <TableCell>{p.avg_rating ? `⭐ ${p.avg_rating}` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Logs */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLogs ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : recentLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No logs yet</TableCell></TableRow>
                  ) : recentLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(log.created_at), "MMM d, HH:mm:ss")}</TableCell>
                      <TableCell><Badge variant="outline">{log.log_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{log.action}</TableCell>
                      <TableCell>
                        {log.success ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{log.duration_ms ? `${log.duration_ms}ms` : "—"}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs">
                        {log.error_message || (log.response_body ? JSON.stringify(log.response_body).slice(0, 100) : "—")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* iFree IMEI Checks */}
        <TabsContent value="ifree">
          <Card>
            <CardContent className="p-4 space-y-4">
              <Input
                placeholder="Search by IMEI or service name..."
                value={ifreeSearch}
                onChange={(e) => setIfreeSearch(e.target.value)}
                className="max-w-sm"
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Response / Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingIfree ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filteredIfreeChecks.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No iFree checks yet</TableCell></TableRow>
                    ) : filteredIfreeChecks.map((check: any) => (
                      <TableRow key={check.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(check.created_at), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{check.imei}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {check.service_name || `Service #${check.service_id}`}
                        </TableCell>
                        <TableCell>
                          {check.success ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{check.account_balance || "—"}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-xs">
                          {check.error_message || check.response_text?.slice(0, 120) || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Showing {filteredIfreeChecks.length} of {ifreeChecks.length} checks
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Client Errors (ErrorBoundary) */}
        <TabsContent value="client-errors">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Page URL</TableHead>
                    <TableHead>Error Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingClientErrors ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : clientErrors.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No client errors 🎉</TableCell></TableRow>
                  ) : clientErrors.map((err: any) => (
                    <TableRow key={err.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(err.created_at), "MMM dd HH:mm:ss")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">
                        {err.request_url || "—"}
                      </TableCell>
                      <TableCell>
                        <details className="cursor-pointer">
                          <summary className="text-xs text-destructive truncate max-w-[400px]">
                            {err.error_message?.split("\n")[0] || "Unknown error"}
                          </summary>
                          <pre className="text-[10px] text-muted-foreground mt-2 whitespace-pre-wrap break-all max-h-40 overflow-auto bg-secondary/30 rounded p-2">
                            {err.error_message}
                          </pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
