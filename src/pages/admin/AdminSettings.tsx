import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
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

/* ─── Main Page ─── */
export default function AdminSettings() {
  return (
    <div className="max-w-2xl space-y-6">
      <ThemeSection />
      <NotificationSection />
      <PasswordSection />
    </div>
  );
}
