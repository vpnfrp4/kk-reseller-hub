import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { DollarSign, RefreshCw, Zap, Clock, Globe, List } from "lucide-react";
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

        {/* Last fetched & next auto-fetch info */}
        {fetchedAt && (
          <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Last fetched: {new Date(fetchedAt).toLocaleString()}
            </div>
            {autoFetch && (() => {
              const last = new Date(fetchedAt);
              const nextRun = new Date(last);
              // Cron runs at 00:00, 06:00, 12:00, 18:00 UTC
              const h = last.getUTCHours();
              const nextSlot = Math.ceil((h + 1) / 6) * 6;
              nextRun.setUTCHours(nextSlot >= 24 ? 0 : nextSlot, 0, 0, 0);
              if (nextSlot >= 24) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
              if (nextRun <= new Date()) {
                // Already past, jump to next slot
                nextRun.setUTCHours(nextRun.getUTCHours() + 6);
              }
              const diff = nextRun.getTime() - Date.now();
              const hoursLeft = Math.floor(diff / 3600000);
              const minsLeft = Math.floor((diff % 3600000) / 60000);
              return (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-primary" />
                  <span>
                    Next auto-fetch:{" "}
                    <span className="font-medium text-foreground">
                      {nextRun.toLocaleString()}
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      ({hoursLeft > 0 ? `${hoursLeft}h ` : ""}{minsLeft}m)
                    </span>
                  </span>
                </div>
              );
            })()}
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

/* ─── Service Margin Row ─── */
function ServiceMarginRow({ service, saving, onSave, existingProductId, onCreateProduct, creatingProduct }: {
  service: any; saving: boolean; onSave: (id: string, margin: number) => void;
  existingProductId?: string | null; onCreateProduct: (service: any) => void; creatingProduct: boolean;
}) {
  const [margin, setMargin] = useState<number>(service.margin_percent ?? 30);
  const changed = margin !== (service.margin_percent ?? 30);
  const hasProduct = !!existingProductId;

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/10 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-foreground truncate">{service.name}</p>
          {!service.is_active && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium shrink-0">Disabled</span>
          )}
          {hasProduct && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">Product linked</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          ID: {service.provider_service_id} • Rate: ${service.rate}/1k • Min: {service.min} • Max: {service.max}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Input
          type="number"
          value={margin}
          onChange={(e) => setMargin(Math.max(0, parseFloat(e.target.value) || 0))}
          className="w-16 h-7 text-xs text-center font-mono"
          min={0}
          max={999}
        />
        <span className="text-[10px] text-muted-foreground">%</span>
        {changed && (
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
            onClick={() => onSave(service.id, margin)} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          </Button>
        )}
        {!hasProduct ? (
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-primary border-primary/30 hover:bg-primary/10"
            onClick={() => onCreateProduct(service)} disabled={creatingProduct || !service.is_active}>
            {creatingProduct ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            <span className="ml-0.5">Product</span>
          </Button>
        ) : (
          <a href={`/admin/products`} className="text-[10px] text-primary hover:underline">View</a>
        )}
      </div>
    </div>
  );
}

/* ─── API Providers Section ─── */
function ApiProvidersSection() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [fetchingServices, setFetchingServices] = useState<string | null>(null);
  const [servicesOpen, setServicesOpen] = useState<string | null>(null);
  const [savingMargin, setSavingMargin] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const emptyForm = { name: "", api_url: "", api_key: "", api_type: "generic", is_active: true };
  const [newProvider, setNewProvider] = useState(emptyForm);
  const [editData, setEditData] = useState<Record<string, any>>({});

  const apiTypeOptions = [
    { label: "Generic SMM", value: "generic" },
    { label: "IMEI Service", value: "imei" },
    { label: "Custom", value: "custom" },
  ];

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-api-providers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_providers" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const handleCreate = async () => {
    if (!newProvider.name.trim()) { toast.error("Provider name is required"); return; }
    if (!newProvider.api_url.trim()) { toast.error("API URL is required"); return; }
    if (!newProvider.api_key.trim()) { toast.error("API Key is required"); return; }
    setCreating(true);
    try {
      const { error } = await supabase.from("api_providers" as any).insert({
        name: newProvider.name.trim(),
        api_url: newProvider.api_url.trim(),
        api_key: newProvider.api_key.trim(),
        api_type: newProvider.api_type,
        is_active: newProvider.is_active,
      } as any);
      if (error) throw error;
      toast.success(`${newProvider.name} added`);
      queryClient.invalidateQueries({ queryKey: ["admin-api-providers"] });
      setCreateOpen(false);
      setNewProvider(emptyForm);
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async (id: string) => {
    const edit = editData[id];
    if (!edit) return;
    if (!edit.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(id);
    try {
      const { error } = await supabase.from("api_providers" as any).update({
        name: edit.name.trim(),
        api_url: (edit.api_url || "").trim(),
        api_key: (edit.api_key || "").trim(),
        api_type: edit.api_type || "generic",
        is_active: edit.is_active,
      } as any).eq("id", id);
      if (error) throw error;
      toast.success(`${edit.name} updated`);
      queryClient.invalidateQueries({ queryKey: ["admin-api-providers"] });
      setEditOpen(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase.from("api_providers" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success(`${name} deleted`);
      queryClient.invalidateQueries({ queryKey: ["admin-api-providers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id: string, isActive: boolean, name: string) => {
    try {
      const { error } = await supabase.from("api_providers" as any).update({ is_active: isActive } as any).eq("id", id);
      if (error) throw error;
      toast.success(`${name} ${isActive ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-api-providers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/test-api-provider`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || anonKey}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message + (data.balance !== undefined ? ` | Balance: ${data.balance} ${data.currency || ""}` : ""));
      } else {
        toast.error(data.message || data.error || "Connection failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Test failed");
    } finally {
      setTesting(null);
    }
  };

  const handleFetchServices = async (id: string, name: string) => {
    setFetchingServices(id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/fetch-api-services`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || anonKey}`,
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider_id: id }),
      });
      const data = await res.json();
      if (data.success) {
        const svc = data.services || {};
        toast.success(
          `${name}: ${data.message}\nServices: ${svc.inserted ?? 0} new, ${svc.updated ?? 0} updated${data.soft_disabled ? `\n${data.soft_disabled} removed services disabled` : ""}`,
          { duration: 8000 }
        );
        queryClient.invalidateQueries({ queryKey: ["admin-api-services"] });
        queryClient.invalidateQueries({ queryKey: ["admin-api-service-counts"] });
      } else {
        toast.error(data.message || data.error || "Fetch failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Fetch failed");
    } finally {
      setFetchingServices(null);
    }
  };
  // Services query for the currently open provider
  const { data: servicesList, refetch: refetchServices } = useQuery({
    queryKey: ["admin-api-services", servicesOpen],
    queryFn: async () => {
      if (!servicesOpen) return [];
      const { data } = await supabase
        .from("api_services")
        .select("*")
        .eq("provider_id", servicesOpen)
        .order("category")
        .order("name");
      return (data || []) as any[];
    },
    enabled: !!servicesOpen,
  });

  // Map service_id -> product_id for linked products
  const { data: linkedProducts, refetch: refetchLinkedProducts } = useQuery({
    queryKey: ["admin-linked-products", servicesOpen],
    queryFn: async () => {
      if (!servicesOpen) return {};
      const { data } = await supabase
        .from("products")
        .select("id, api_service_id")
        .eq("product_type", "api")
        .eq("provider_id", servicesOpen)
        .not("api_service_id", "is", null);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        if (p.api_service_id) map[p.api_service_id] = p.id;
      });
      return map;
    },
    enabled: !!servicesOpen,
  });

  const [creatingProductFor, setCreatingProductFor] = useState<string | null>(null);

  /** Detect which custom fields an API service needs based on name/type/category */
  function detectRequiredFields(service: any): Array<{
    field_name: string; field_type: string; required: boolean;
    min_length: number | null; max_length: number | null;
    linked_mode: string; sort_order: number; options: string[];
    placeholder: string; validation_rule: string;
  }> {
    const name = (service.name || "").toLowerCase();
    const cat = (service.category || "").toLowerCase();
    const type = (service.type || "").toLowerCase();
    const text = `${name} ${cat} ${type}`;
    const fields: ReturnType<typeof detectRequiredFields> = [];
    let order = 0;

    // Link/URL detection — most SMM services need a link
    const needsLink = /follow|like|view|share|react|retweet|repost|subscriber|watch|visit|traffic|comment|save|impression|reach|engagement|stream|play|pin|vote|poll|click/i.test(text)
      || /default|custom comments/i.test(type);
    if (needsLink) {
      fields.push({
        field_name: "Link", field_type: "text", required: true,
        min_length: 5, max_length: 500, linked_mode: "api", sort_order: order++,
        options: [], placeholder: "https://example.com/post/123", validation_rule: "url",
      });
    }

    // Username detection
    const needsUsername = /username|mention|dm|direct message|power|member|add.*group/i.test(text)
      && !needsLink;
    if (needsUsername) {
      fields.push({
        field_name: "Username", field_type: "text", required: true,
        min_length: 1, max_length: 200, linked_mode: "api", sort_order: order++,
        options: [], placeholder: "@username", validation_rule: "",
      });
    }

    // Comments/text detection
    const needsComments = /comment|review|testimonial|custom comment/i.test(text);
    if (needsComments) {
      fields.push({
        field_name: "Comments", field_type: "textarea", required: true,
        min_length: 1, max_length: 5000, linked_mode: "api", sort_order: order++,
        options: [], placeholder: "Enter comments (one per line for multiple)", validation_rule: "",
      });
    }

    // Quantity — always added for API services
    fields.push({
      field_name: "Quantity", field_type: "number", required: true,
      min_length: service.min || 1, max_length: service.max || 10000,
      linked_mode: "api", sort_order: order++, options: [],
      placeholder: `Min ${service.min || 1} — Max ${service.max || 10000}`, validation_rule: "",
    });

    return fields;
  }

  const handleCreateProductFromService = async (service: any) => {
    setCreatingProductFor(service.id);
    try {
      // Fetch exchange rate
      const { data: rateSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "usd_mmk_rate")
        .single();
      const usdRate = rateSetting?.value ? (rateSetting.value as any).rate || 2100 : 2100;
      const margin = service.margin_percent ?? 30;
      const costPer1000 = Math.ceil(service.rate * usdRate);
      const sellPer1000 = Math.ceil(costPer1000 * (1 + margin / 100));

      const { data: newProduct, error } = await supabase.from("products").insert({
        name: service.name,
        product_type: "api",
        category: service.category || "Uncategorized API",
        provider_id: servicesOpen,
        api_service_id: String(service.provider_service_id),
        api_rate: service.rate,
        api_min_quantity: service.min,
        api_max_quantity: service.max,
        base_price: costPer1000,
        wholesale_price: sellPer1000,
        retail_price: sellPer1000,
        margin_percent: margin,
        base_currency: "USD",
        description: "",
        duration: "",
        type: "auto",
        stock: 0,
        icon: "📦",
        fulfillment_modes: JSON.stringify(["api"]),
      }).select("id").single();
      if (error) throw error;

      // Auto-create custom fields based on service detection
      const detectedFields = detectRequiredFields(service);
      if (detectedFields.length > 0 && newProduct?.id) {
        const fieldRows = detectedFields.map((f) => ({
          product_id: newProduct.id,
          field_name: f.field_name,
          field_type: f.field_type,
          required: f.required,
          min_length: f.min_length,
          max_length: f.max_length,
          linked_mode: f.linked_mode,
          sort_order: f.sort_order,
          options: f.options,
          placeholder: f.placeholder,
          validation_rule: f.validation_rule,
        }));
        await supabase.from("product_custom_fields").insert(fieldRows);
      }

      const fieldNames = detectedFields.map((f) => f.field_name).join(", ");
      toast.success(`Product created for "${service.name}"`, {
        description: `Auto-added fields: ${fieldNames}`,
        duration: 5000,
      });
      refetchLinkedProducts();
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to create product");
    } finally {
      setCreatingProductFor(null);
    }
  };

  // Service counts per provider
  const { data: serviceCounts } = useQuery({
    queryKey: ["admin-api-service-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_services")
        .select("provider_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        counts[s.provider_id] = (counts[s.provider_id] || 0) + 1;
      });
      return counts;
    },
  });

  const handleSaveMargin = async (serviceId: string, margin: number) => {
    setSavingMargin(serviceId);
    try {
      const { error } = await supabase
        .from("api_services")
        .update({ margin_percent: margin })
        .eq("id", serviceId);
      if (error) throw error;
      toast.success("Margin updated");
      refetchServices();
    } catch (err: any) {
      toast.error(err.message || "Failed to update margin");
    } finally {
      setSavingMargin(null);
    }
  };

  const ProviderForm = ({ data, onChange, showKey, onToggleKey }: {
    data: any; onChange: (field: string, value: any) => void;
    showKey: boolean; onToggleKey: () => void;
  }) => (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Provider Name</Label>
        <Input value={data.name} onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. SMMKings" className="h-9 text-sm" maxLength={100} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">API Type</Label>
        <UiSelect value={data.api_type} onValueChange={(v) => onChange("api_type", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {apiTypeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </UiSelect>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">API URL</Label>
        <Input value={data.api_url} onChange={(e) => onChange("api_url", e.target.value)}
          placeholder="https://provider.com/api/v2" className="h-9 text-sm font-mono" maxLength={500} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">API Key</Label>
        <div className="relative">
          <Input type={showKey ? "text" : "password"} value={data.api_key}
            onChange={(e) => onChange("api_key", e.target.value)}
            placeholder="Enter API key" className="h-9 text-sm font-mono pr-10" maxLength={500} />
          <button type="button" onClick={onToggleKey}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4 text-primary" /> API Providers
          </CardTitle>
          <CardDescription>Manage external API provider connections for automated fulfillment.</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-xs shrink-0">
              <Plus className="w-3 h-3" /> Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add API Provider</DialogTitle>
              <DialogDescription>Connect a new external API provider for automated service fulfillment.</DialogDescription>
            </DialogHeader>
            <ProviderForm data={newProvider}
              onChange={(f, v) => setNewProvider((p) => ({ ...p, [f]: v }))}
              showKey={!!showKeys["new"]}
              onToggleKey={() => setShowKeys((p) => ({ ...p, new: !p.new }))} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Provider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!providers || providers.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-6">No API providers configured yet.</p>
        )}
        {(providers || []).map((p: any) => (
          <div key={p.id} className="p-4 rounded-xl border border-border/40 bg-muted/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold text-foreground">{p.name}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{p.api_type}</Badge>
                <Badge variant={p.is_active ? "default" : "outline"} className="text-[10px] h-4 px-1.5">
                  {p.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <Switch checked={p.is_active} onCheckedChange={(v) => handleToggle(p.id, v, p.name)} />
            </div>

            <div className="text-xs text-muted-foreground font-mono truncate">
              {p.api_url || "No URL set"}
              {(serviceCounts?.[p.id] || 0) > 0 && (
                <span className="ml-2 font-sans text-primary">• {serviceCounts[p.id]} services</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                onClick={() => handleTest(p.id)} disabled={testing === p.id}>
                {testing === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Test Connection
              </Button>

              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                onClick={() => handleFetchServices(p.id, p.name)} disabled={fetchingServices === p.id}>
                {fetchingServices === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Fetch Services
              </Button>

              <Dialog open={servicesOpen === p.id} onOpenChange={(open) => setServicesOpen(open ? p.id : null)}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                    <List className="w-3 h-3" /> Services{(serviceCounts?.[p.id] || 0) > 0 ? ` (${serviceCounts[p.id]})` : ""}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>{p.name} — Services</DialogTitle>
                    <DialogDescription>Edit margin per service. Default: 30%. Leave at 30 for global fallback.</DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-auto space-y-1 pr-1">
                    {!servicesList?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No services synced yet. Click "Fetch Services" first.</p>
                    ) : (
                      (() => {
                        const grouped = new Map<string, any[]>();
                        servicesList.forEach((s: any) => {
                          const cat = s.category || "Uncategorized";
                          if (!grouped.has(cat)) grouped.set(cat, []);
                          grouped.get(cat)!.push(s);
                        });
                        return Array.from(grouped, ([cat, items]) => (
                          <Fragment key={cat}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-3 pb-1 sticky top-0 bg-card z-10">{cat} ({items.length})</p>
                            {items.map((s: any) => (
                              <ServiceMarginRow
                                key={s.id}
                                service={s}
                                saving={savingMargin === s.id}
                                onSave={handleSaveMargin}
                                existingProductId={linkedProducts?.[String(s.provider_service_id)] || null}
                                onCreateProduct={handleCreateProductFromService}
                                creatingProduct={creatingProductFor === s.id}
                              />
                            ))}
                          </Fragment>
                        ));
                      })()
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={editOpen === p.id} onOpenChange={(open) => {
                setEditOpen(open ? p.id : null);
                if (open) setEditData((prev) => ({ ...prev, [p.id]: { ...p } }));
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                    <Save className="w-3 h-3" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit {p.name}</DialogTitle>
                    <DialogDescription>Update provider connection details.</DialogDescription>
                  </DialogHeader>
                  {editData[p.id] && (
                    <ProviderForm data={editData[p.id]}
                      onChange={(f, v) => setEditData((prev) => ({ ...prev, [p.id]: { ...prev[p.id], [f]: v } }))}
                      showKey={!!showKeys[p.id]}
                      onToggleKey={() => setShowKeys((prev) => ({ ...prev, [p.id]: !prev[p.id] }))} />
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditOpen(null)}>Cancel</Button>
                    <Button onClick={() => handleSave(p.id)} disabled={saving === p.id} className="gap-1.5">
                      {saving === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline"
                    className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    disabled={deleting === p.id}>
                    {deleting === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {p.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove this API provider and its credentials. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(p.id, p.name)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ─── */
export default function AdminSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <ThemeSection />
      <ApiProvidersSection />
      <ExchangeRateSection />
      <PaymentMethodsSection />
      <NotificationSection />
      <PasswordSection />
    </div>
  );
}
