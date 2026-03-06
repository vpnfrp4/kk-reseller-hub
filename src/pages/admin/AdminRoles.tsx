import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Search, UserCheck, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer, DataCard } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/audit-log";
import { format } from "date-fns";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-destructive/10 text-destructive border-destructive/20",
  moderator: "bg-warning/10 text-warning border-warning/20",
  user: "bg-primary/10 text-primary border-primary/20",
};

const PERMISSION_SECTIONS = [
  "Overview", "Orders", "Products", "Credentials", "Resellers",
  "Top-ups", "Profit", "Providers", "Settings", "Audit Logs",
];

const ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  admin: Object.fromEntries(PERMISSION_SECTIONS.map((s) => [s, ["create", "read", "update", "delete"]])),
  moderator: {
    Overview: ["read"],
    Orders: ["read", "update"],
    Products: ["read"],
    Credentials: ["read"],
    Resellers: ["read"],
    "Top-ups": ["read", "update"],
    Profit: ["read"],
    Providers: ["read"],
    Settings: [],
    "Audit Logs": ["read"],
  },
  user: Object.fromEntries(PERMISSION_SECTIONS.map((s) => [s, []])),
};

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [addDialog, setAddDialog] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<string>("moderator");
  const [addLoading, setAddLoading] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<any>(null);

  const { data: roleUsers, isLoading } = useQuery({
    queryKey: ["admin-role-users"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("*")
        .order("role", { ascending: true });

      if (!roles || roles.length === 0) return [];

      const userIds = [...new Set(roles.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      return roles.map((r: any) => ({
        ...r,
        name: profileMap[r.user_id]?.name || "",
        email: profileMap[r.user_id]?.email || "Unknown",
      }));
    },
  });

  const filtered = useMemo(() => {
    let list = roleUsers || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r: any) => r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q));
    }
    if (roleFilter !== "all") list = list.filter((r: any) => r.role === roleFilter);
    return list;
  }, [roleUsers, search, roleFilter]);

  const handleAddRole = async () => {
    if (!addEmail.trim()) return;
    setAddLoading(true);
    try {
      // Find user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", addEmail.trim())
        .single();

      if (!profile) {
        toast.error("User not found with that email");
        return;
      }

      // Check if already has role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("role", addRole as any);

      if (existing && existing.length > 0) {
        toast.error("User already has this role");
        return;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: profile.user_id, role: addRole as any });

      if (error) throw error;

      await logAdminAction({
        action: "assign_role",
        targetType: "user_role",
        targetId: profile.user_id,
        details: { email: addEmail, role: addRole },
      });

      toast.success(`${addRole} role assigned to ${addEmail}`);
      queryClient.invalidateQueries({ queryKey: ["admin-role-users"] });
      setAddDialog(false);
      setAddEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign role");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemoveRole = async (roleEntry: any) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleEntry.id);

      if (error) throw error;

      await logAdminAction({
        action: "remove_role",
        targetType: "user_role",
        targetId: roleEntry.user_id,
        details: { email: roleEntry.email, role: roleEntry.role },
      });

      toast.success(`Role removed from ${roleEntry.email}`);
      queryClient.invalidateQueries({ queryKey: ["admin-role-users"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove role");
    }
    setRemoveConfirm(null);
  };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Roles & Access Control</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage admin users and their permissions</p>
        </div>
        <Button size="sm" onClick={() => setAddDialog(true)} className="gap-1.5 h-8 text-xs">
          <Plus className="w-3.5 h-3.5" /> Assign Role
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm bg-card border-border" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs bg-card border-border">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <DataCard className="p-0 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted/40 rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <Shield className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No role assignments found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {(r.name || r.email)?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="text-sm font-medium text-foreground">{r.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[11px] ${ROLE_COLORS[r.role] || ""}`}>
                        {r.role.charAt(0).toUpperCase() + r.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRemoveConfirm(r)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Permissions Matrix */}
      <DataCard title="Permission Matrix" description="CRUD permissions by role">
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Section</th>
                <th className="text-center px-3 py-2 font-semibold text-destructive/80">Admin</th>
                <th className="text-center px-3 py-2 font-semibold text-warning/80">Moderator</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_SECTIONS.map((section) => (
                <tr key={section} className="border-b border-border/30 hover:bg-muted/10">
                  <td className="px-4 py-2.5 font-medium text-foreground">{section}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-mono text-success">
                      {ROLE_PERMISSIONS.admin[section]?.join(", ") || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {ROLE_PERMISSIONS.moderator[section]?.length
                        ? ROLE_PERMISSIONS.moderator[section].join(", ")
                        : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Add Role Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>Add an admin or moderator role to a user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">User Email</label>
              <Input
                placeholder="user@example.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Role</label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — Full access</SelectItem>
                  <SelectItem value="moderator">Moderator — Limited access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleAddRole} disabled={addLoading || !addEmail.trim()} className="text-xs gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> {addLoading ? "Assigning..." : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the <strong>{removeConfirm?.role}</strong> role from <strong>{removeConfirm?.email}</strong>? They will lose access to the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeConfirm && handleRemoveRole(removeConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
