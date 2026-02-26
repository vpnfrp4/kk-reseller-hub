import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { DollarSign, RefreshCw, Zap, Clock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Eye, EyeOff, Lock, Bell, BellOff, Volume2, VolumeX,
  Sun, Moon, Monitor, Wallet, ShoppingCart, TrendingDown, Package,
  CreditCard, Save, Loader2, Trash2, Plus,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select as UiSelect, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  requestNotificationPermission,
  playSound,
  type NotificationPrefs,
} from "@/lib/notifications";

/* ─── Password Section ─── */
function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match"); return; }
    if (currentPassword === newPassword) { toast.error("New password must be different from current password"); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { toast.error("Could not verify current user"); return; }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) { toast.error("Current password is incorrect"); return; }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast.error(error.message); return; }

      toast.success("Password changed successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  };

  const PasswordField = ({ id, label, value, onChange, show, onToggle, placeholder }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    show: boolean; onToggle: () => void; placeholder: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)} required placeholder={placeholder} className="pr-10" />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="w-4 h-4 text-primary" /> Change Password
        </CardTitle>
        <CardDescription>Update your account password. You'll need your current password for verification.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <PasswordField id="current-password" label="Current Password" value={currentPassword}
            onChange={setCurrentPassword} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} placeholder="Enter current password" />
          <PasswordField id="new-password" label="New Password" value={newPassword}
            onChange={setNewPassword} show={showNew} onToggle={() => setShowNew(!showNew)} placeholder="Enter new password (min 6 chars)" />
          <PasswordField id="confirm-password" label="Confirm New Password" value={confirmPassword}
            onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} placeholder="Confirm new password" />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Updating..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Notification Preferences Section ─── */
function NotificationSection() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(getNotificationPrefs);

  useEffect(() => {
    const handler = (e: Event) => setPrefs((e as CustomEvent).detail);
    window.addEventListener("notification-prefs-changed", handler);
    return () => window.removeEventListener("notification-prefs-changed", handler);
  }, []);

  const updatePref = (key: keyof NotificationPrefs, value: boolean | number) => {
    setNotificationPrefs({ [key]: value });
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleBrowserToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) { toast.error("Browser notifications are blocked. Enable them in your browser settings."); return; }
    }
    updatePref("browserNotificationsEnabled", enabled);
  };

  const handleSoundToggle = (enabled: boolean) => {
    updatePref("soundEnabled", enabled);
    if (enabled) playSound("info");
  };

  const ToggleRow = ({ icon: Icon, iconActive, label, description, checked, onChange }: {
    icon: React.ElementType; iconActive?: boolean; label: string; description: string;
    checked: boolean; onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${iconActive !== false && checked ? "text-primary" : "text-muted-foreground"}`} />
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4 text-primary" /> Notification Preferences
        </CardTitle>
        <CardDescription>Control how and when you receive alerts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delivery</p>
        <ToggleRow icon={prefs.soundEnabled ? Volume2 : VolumeX} label="Sound Effects"
          description="Play a chime when notifications arrive" checked={prefs.soundEnabled} onChange={handleSoundToggle} />
        <ToggleRow icon={prefs.browserNotificationsEnabled ? Bell : BellOff} label="Browser Notifications"
          description="Show native browser alerts when tab is not focused" checked={prefs.browserNotificationsEnabled} onChange={handleBrowserToggle} />

        <Separator className="my-3" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alert Categories</p>
        <ToggleRow icon={Wallet} label="Top-Up Approved"
          description="When a top-up is approved and balance is credited" checked={prefs.topupApproved} onChange={(v) => updatePref("topupApproved", v)} />
        <ToggleRow icon={ShoppingCart} label="Purchase Complete"
          description="Confirmation after a successful purchase" checked={prefs.purchaseComplete} onChange={(v) => updatePref("purchaseComplete", v)} />
        <ToggleRow icon={Package} label="Order Updates"
          description="Status changes on pending/manual orders" checked={prefs.orderUpdates} onChange={(v) => updatePref("orderUpdates", v)} />
        <ToggleRow icon={TrendingDown} label="Low Balance Warning"
          description="Alert when balance drops below threshold" checked={prefs.lowBalance} onChange={(v) => updatePref("lowBalance", v)} />

        {prefs.lowBalance && (
          <div className="pt-2 pl-7">
            <Label htmlFor="low-balance-threshold" className="text-xs text-muted-foreground">Low balance threshold (MMK)</Label>
            <Input id="low-balance-threshold" type="number" min={1000} step={1000}
              value={prefs.lowBalanceThreshold}
              onChange={(e) => updatePref("lowBalanceThreshold", Math.max(1000, Number(e.target.value)))}
              className="mt-1 w-40 h-8 text-sm" />
          </div>
        )}

        {"Notification" in window && Notification.permission === "denied" && prefs.browserNotificationsEnabled && (
          <p className="text-xs text-destructive mt-2">Browser notifications are blocked. Please update your browser permissions.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Theme Section ─── */
function ThemeSection() {
  const [theme, setThemeState] = useState<"dark" | "light">(() => {
    try {
      const s = localStorage.getItem("theme");
      if (s === "light" || s === "dark") return s;
    } catch {}
    return "dark";
  });

  const setTheme = useCallback((t: "dark" | "light") => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    setThemeState(t);
    if (t === "light") root.classList.add("light");
    else root.classList.remove("light");
    localStorage.setItem("theme", t);
    setTimeout(() => root.classList.remove("theme-transition"), 450);
  }, []);

  const ThemeOption = ({ value, label, icon: Icon }: { value: "dark" | "light"; label: string; icon: React.ElementType }) => (
    <button onClick={() => setTheme(value)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 flex-1 ${
        theme === value
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground"
      }`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="w-4 h-4 text-primary" /> Appearance
        </CardTitle>
        <CardDescription>Choose your preferred theme for the admin panel.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <ThemeOption value="dark" label="Dark" icon={Moon} />
          <ThemeOption value="light" label="Light" icon={Sun} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Payment Methods Section ─── */
function PaymentMethodsSection() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMethod, setNewMethod] = useState({
    provider: "KBZPay",
    method_id: "kbzpay",
    name: "",
    phone: "",
    binance_uid: "",
    network: "",
    accepted_currency: "",
    min_deposit: 5000,
  });

  const providerOptions = [
    { label: "KBZPay", method_id: "kbzpay" },
    { label: "WavePay", method_id: "wavepay" },
    { label: "AYA Pay", method_id: "ayapay" },
    { label: "CB Pay", method_id: "cbpay" },
    { label: "Binance", method_id: "binance" },
    { label: "Other", method_id: "other" },
  ];

  const handleCreate = async () => {
    if (!newMethod.provider.trim()) {
      toast.error("Provider is required");
      return;
    }
    const isBinance = newMethod.method_id === "binance";
    if (!isBinance && !newMethod.name.trim()) {
      toast.error("Account name is required");
      return;
    }
    if (isBinance && !newMethod.binance_uid.trim()) {
      toast.error("Binance UID is required");
      return;
    }
    setCreating(true);
    try {
      const maxSort = (methods || []).reduce((max: number, m: any) => Math.max(max, m.sort_order || 0), 0);
      const { error } = await supabase.from("payment_methods").insert({
        provider: newMethod.provider.trim(),
        method_id: newMethod.method_id,
        name: newMethod.name.trim(),
        phone: newMethod.phone.trim(),
        binance_uid: newMethod.binance_uid.trim(),
        network: newMethod.network.trim(),
        accepted_currency: newMethod.accepted_currency.trim(),
        min_deposit: newMethod.min_deposit || 5000,
        sort_order: maxSort + 1,
        is_active: true,
      });
      if (error) throw error;
      toast.success(`${newMethod.provider} payment method created`);
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      setCreateOpen(false);
      setNewMethod({ provider: "KBZPay", method_id: "kbzpay", name: "", phone: "", binance_uid: "", network: "", accepted_currency: "", min_deposit: 5000 });
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, provider: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);
      if (error) throw error;
      toast.success(`${provider} payment method deleted`);
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const { data: methods, isLoading } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_methods")
        .select("*")
        .order("sort_order");
      return data || [];
    },
  });

  const [edits, setEdits] = useState<Record<string, any>>({});

  // Sync edits when data loads
  useEffect(() => {
    if (methods) {
      const map: Record<string, any> = {};
      methods.forEach((m: any) => { map[m.id] = { ...m }; });
      setEdits(map);
    }
  }, [methods]);

  const updateField = (id: string, field: string, value: any) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    setSaving(id);
    try {
      const { error } = await supabase
        .from("payment_methods")
        .update({
          provider: edit.provider,
          name: edit.name,
          phone: edit.phone,
          binance_uid: edit.binance_uid,
          network: edit.network,
          accepted_currency: edit.accepted_currency,
          min_deposit: parseInt(edit.min_deposit) || 5000,
          is_active: edit.is_active,
        })
        .eq("id", id);
      if (error) throw error;
      toast.success(`${edit.provider} settings saved`);
      queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4 text-primary" /> Payment Methods
          </CardTitle>
          <CardDescription>Manage top-up payment accounts visible to resellers.</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0">
              <Plus className="w-3 h-3" /> Add Method
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
              <DialogDescription>Create a new payment option for reseller top-ups.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Provider</Label>
                <UiSelect value={newMethod.method_id} onValueChange={(v) => {
                  const opt = providerOptions.find((o) => o.method_id === v);
                  setNewMethod((prev) => ({ ...prev, method_id: v, provider: opt?.label || v }));
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {providerOptions.map((o) => (
                      <SelectItem key={o.method_id} value={o.method_id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </UiSelect>
              </div>
              {newMethod.method_id === "binance" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Binance UID</Label>
                    <Input value={newMethod.binance_uid} onChange={(e) => setNewMethod((p) => ({ ...p, binance_uid: e.target.value }))}
                      placeholder="477879311" className="h-9 text-sm" maxLength={50} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Network</Label>
                      <Input value={newMethod.network} onChange={(e) => setNewMethod((p) => ({ ...p, network: e.target.value }))}
                        placeholder="TRC20" className="h-9 text-sm" maxLength={20} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Currency</Label>
                      <Input value={newMethod.accepted_currency} onChange={(e) => setNewMethod((p) => ({ ...p, accepted_currency: e.target.value }))}
                        placeholder="USDT" className="h-9 text-sm" maxLength={10} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Account Name</Label>
                    <Input value={newMethod.name} onChange={(e) => setNewMethod((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Account holder name" className="h-9 text-sm" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Phone Number</Label>
                    <Input value={newMethod.phone} onChange={(e) => setNewMethod((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="09xxxxxxxxx" className="h-9 text-sm" maxLength={20} />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Min Deposit (MMK)</Label>
                <Input type="number" value={newMethod.min_deposit} onChange={(e) => setNewMethod((p) => ({ ...p, min_deposit: parseInt(e.target.value) || 5000 }))}
                  className="h-9 text-sm" min={1000} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-6">
        {(methods || []).map((method: any) => {
          const edit = edits[method.id];
          if (!edit) return null;
          const isBinance = method.method_id === "binance";

          return (
            <div key={method.id} className="space-y-4 p-4 rounded-xl border border-border/40 bg-muted/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    {edit.provider}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase">{method.method_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{edit.is_active ? "Active" : "Inactive"}</span>
                  <Switch
                    checked={edit.is_active}
                    onCheckedChange={(v) => updateField(method.id, "is_active", v)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isBinance ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Binance UID</Label>
                      <Input value={edit.binance_uid || ""} onChange={(e) => updateField(method.id, "binance_uid", e.target.value)}
                        placeholder="477879311" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Network</Label>
                      <Input value={edit.network || ""} onChange={(e) => updateField(method.id, "network", e.target.value)}
                        placeholder="TRC20" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Accepted Currency</Label>
                      <Input value={edit.accepted_currency || ""} onChange={(e) => updateField(method.id, "accepted_currency", e.target.value)}
                        placeholder="USDT" className="h-9 text-sm" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Account Name</Label>
                      <Input value={edit.name || ""} onChange={(e) => updateField(method.id, "name", e.target.value)}
                        placeholder="Account holder name" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Phone Number</Label>
                      <Input value={edit.phone || ""} onChange={(e) => updateField(method.id, "phone", e.target.value)}
                        placeholder="09xxxxxxxxx" className="h-9 text-sm" />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Min Deposit (MMK)</Label>
                  <Input type="number" value={edit.min_deposit || 5000} onChange={(e) => updateField(method.id, "min_deposit", e.target.value)}
                    className="h-9 text-sm" min={1000} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleSave(method.id)} disabled={saving === method.id}
                  className="h-8 gap-1.5 text-xs">
                  {saving === method.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                      disabled={deleting === method.id}>
                      {deleting === method.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {edit.provider}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove this payment method. Resellers will no longer see it as a top-up option.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(method.id, edit.provider)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─── USD Exchange Rate Section ─── */
function ExchangeRateSection() {
  const queryClient = useQueryClient();
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [usdProductCount, setUsdProductCount] = useState(0);

  const { data: setting } = useQuery({
    queryKey: ["usd-mmk-rate"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("system_settings")
        .select("*")
        .eq("key", "usd_mmk_rate")
        .single();
      return data;
    },
  });

  useQuery({
    queryKey: ["usd-product-count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("base_currency", "USD");
      setUsdProductCount(count || 0);
      return count;
    },
  });

  const settingValue = (setting?.value || {}) as Record<string, any>;

  useEffect(() => {
    if (settingValue.rate) {
      setRate(String(settingValue.rate));
    }
  }, [setting]);

  const autoFetch = settingValue.auto_fetch ?? false;
  const source = settingValue.source || "manual";
  const fetchedAt = settingValue.fetched_at;
  const currentRate = settingValue.rate;

  const handleSave = async () => {
    const numRate = parseFloat(rate);
    if (!numRate || numRate <= 0) { toast.error("Enter a valid rate"); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("system_settings")
        .update({ value: { ...settingValue, rate: numRate, source: "manual" } })
        .eq("key", "usd_mmk_rate");
      if (error) throw error;
      toast.success(`USD rate updated to ${numRate.toLocaleString()} MMK. ${usdProductCount} USD-based product${usdProductCount !== 1 ? "s" : ""} recalculated.`);
      queryClient.invalidateQueries({ queryKey: ["usd-mmk-rate"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save rate");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoFetch = async (enabled: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("system_settings")
        .update({ value: { ...settingValue, auto_fetch: enabled } })
        .eq("key", "usd_mmk_rate");
      if (error) throw error;
      toast.success(enabled ? "Auto-fetch enabled" : "Auto-fetch disabled");
      queryClient.invalidateQueries({ queryKey: ["usd-mmk-rate"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleFetchNow = async () => {
    setFetching(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/fetch-usd-rate`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token || anonKey}`,
            "apikey": anonKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ manual: true }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data?.error) throw new Error(data.error);
      if (data?.skipped) {
        toast.info(`Skipped: ${data.reason}`);
      } else {
        toast.success(`Rate updated: ${data.old_rate} → ${data.new_rate} MMK`);
      }
      queryClient.invalidateQueries({ queryKey: ["usd-mmk-rate"] });
      queryClient.invalidateQueries({ queryKey: ["rate-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch rate");
    } finally {
      setFetching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="w-4 h-4 text-primary" /> USD Exchange Rate
        </CardTitle>
        <CardDescription>
          Set the USD → MMK conversion rate. Updating this will automatically recalculate all USD-based product prices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-fetch toggle */}
        <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/40 bg-muted/10">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Auto-Fetch Live Rate</p>
              <p className="text-xs text-muted-foreground">Fetch from exchange rate API every 6 hours</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchNow}
              disabled={fetching}
              className="h-7 gap-1 text-xs"
            >
              {fetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Fetch Now
            </Button>
            <Switch checked={autoFetch} onCheckedChange={handleToggleAutoFetch} />
          </div>
        </div>

        {/* Manual rate input */}
        <div className="flex items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs text-muted-foreground">1 USD =</Label>
            <div className="relative">
              <Input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="2100"
                className="h-11 text-lg font-mono pr-14"
                min={1}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">MMK</span>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="h-11 gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Rate
          </Button>
        </div>

        {/* Current rate info with source badge */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {currentRate && (
            <span className="flex items-center gap-1.5">
              Current rate: <span className="font-mono font-semibold text-foreground">{Number(currentRate).toLocaleString()}</span> MMK/USD
              <Badge variant={source === "er-api" ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                {source === "er-api" ? "Live API" : "Manual"}
              </Badge>
            </span>
          )}
          <span>•</span>
          <span className="flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            {usdProductCount} USD-priced product{usdProductCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Last fetched info */}
        {fetchedAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            Last fetched: {new Date(fetchedAt).toLocaleString()}
          </div>
        )}

        {currentRate && (
          <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
            <p className="text-[11px] text-muted-foreground">
              <strong>How it works:</strong> Products with <code className="text-foreground bg-muted px-1 rounded">base_currency = USD</code> will have their wholesale price auto-calculated as <code className="text-foreground bg-muted px-1 rounded">base_price × rate</code>. MMK-based products are unaffected.
            </p>
          </div>
        )}

        <RateHistoryChart />
      </CardContent>
    </Card>
  );
}

/* ─── Rate History Chart ─── */
function RateHistoryChart() {
  const { data: history, isLoading } = useQuery({
    queryKey: ["rate-history"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("rate_history")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50);
      return data || [];
    },
  });

  const chartData = useMemo(() => {
    if (!history?.length) return [];
    return history.map((h: any) => ({
      date: new Date(h.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      time: new Date(h.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      rate: Number(h.rate),
      source: h.source,
    }));
  }, [history]);

  if (isLoading || !chartData.length) return null;

  const rates = chartData.map((d: any) => d.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const padding = Math.max((maxRate - minRate) * 0.15, 50);

  return (
    <div className="space-y-2 pt-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <TrendingDown className="w-3 h-3" /> Rate History
      </p>
      <div className="rounded-lg border border-border/40 bg-muted/5 p-3">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <YAxis domain={[minRate - padding, maxRate + padding]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString()} width={55} />
              <RechartsTooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                formatter={(value: number, _: any, props: any) => [
                  `${value.toLocaleString()} MMK (${props.payload.source})`,
                  "Rate"
                ]}
                labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload ? `${label} ${payload[0].payload.time}` : label}
              />
              <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#rateGrad)" dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Showing last {chartData.length} rate change{chartData.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function AdminSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <ThemeSection />
      <ExchangeRateSection />
      <PaymentMethodsSection />
      <NotificationSection />
      <PasswordSection />
    </div>
  );
}
