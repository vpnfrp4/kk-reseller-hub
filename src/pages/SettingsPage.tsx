import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  User,
  Lock,
  Bell,
  Volume2,
  Wallet,
  ShoppingBag,
  AlertTriangle,
  ClipboardList,
  Globe,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  requestNotificationPermission,
  playSound,
  type NotificationPrefs,
} from "@/lib/notifications";

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(getNotificationPrefs);

  useEffect(() => {
    const handler = (e: Event) => setNotifPrefs((e as CustomEvent).detail);
    window.addEventListener("notification-prefs-changed", handler);
    return () => window.removeEventListener("notification-prefs-changed", handler);
  }, []);

  const updateNotifPref = (key: keyof NotificationPrefs, value: boolean) => {
    setNotificationPrefs({ [key]: value });
    setNotifPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleSoundToggle = (enabled: boolean) => {
    updateNotifPref("soundEnabled", enabled);
    if (enabled) playSound("info");
  };

  const handleBrowserToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error("Browser notifications blocked. Enable in browser settings.");
        return;
      }
    }
    updateNotifPref("browserNotificationsEnabled", enabled);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      toast.error("Name must be between 1 and 100 characters");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: trimmed })
      .eq("user_id", profile?.user_id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success("Name updated successfully");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      toast.error("Current password is incorrect");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast.error(error.message); return; }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password changed successfully");
  };

  return (
    <div className="space-y-8 max-w-lg">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Settings" },
      ]} />

      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 font-semibold">
          <User className="w-5 h-5 text-primary" />
          <span className="gold-text">Profile</span>
        </div>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <Input value={profile?.email || ""} disabled className="bg-muted/50 border-border opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Display Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="bg-muted/50 border-border"
            />
          </div>
          <Button type="submit" disabled={saving} className="btn-glow">
            {saving ? "Saving..." : "Update Name"}
          </Button>
        </form>
      </div>

      {/* Password Section */}
      <div className="glass-card p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 font-semibold">
          <Lock className="w-5 h-5 text-primary" />
          <span className="gold-text">Change Password</span>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="bg-muted/50 border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/50 border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/50 border-border"
            />
          </div>
          <Button type="submit" disabled={changingPassword} className="btn-glow">
            {changingPassword ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="glass-card p-6 space-y-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 font-semibold">
          <Bell className="w-5 h-5 text-primary" />
          <span className="gold-text">Notification Preferences</span>
        </div>

        {/* Delivery Methods */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Methods</p>
          <div className="space-y-3 mt-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <Volume2 className={`w-4 h-4 ${notifPrefs.soundEnabled ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">Sound Effects</p>
                  <p className="text-xs text-muted-foreground">Play audio chime for alerts</p>
                </div>
              </div>
              <Switch checked={notifPrefs.soundEnabled} onCheckedChange={handleSoundToggle} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <Globe className={`w-4 h-4 ${notifPrefs.browserNotificationsEnabled ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">Browser Notifications</p>
                  <p className="text-xs text-muted-foreground">Show desktop alerts when tab is unfocused</p>
                </div>
              </div>
              <Switch checked={notifPrefs.browserNotificationsEnabled} onCheckedChange={handleBrowserToggle} />
            </div>
          </div>

          {"Notification" in window && Notification.permission === "denied" && notifPrefs.browserNotificationsEnabled && (
            <p className="text-[11px] text-destructive mt-2 px-1">
              Browser notifications are blocked. Enable them in your browser settings.
            </p>
          )}
        </div>

        {/* Alert Types */}
        <div className="space-y-1 pt-2 border-t border-border/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alert Types</p>
          <div className="space-y-3 mt-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <Wallet className={`w-4 h-4 ${notifPrefs.topupApproved ? "text-success" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">Top-Up Approved</p>
                  <p className="text-xs text-muted-foreground">When your wallet top-up is approved</p>
                </div>
              </div>
              <Switch checked={notifPrefs.topupApproved} onCheckedChange={(v) => updateNotifPref("topupApproved", v)} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <ShoppingBag className={`w-4 h-4 ${notifPrefs.purchaseComplete ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">Purchase Complete</p>
                  <p className="text-xs text-muted-foreground">When a product purchase is completed</p>
                </div>
              </div>
              <Switch checked={notifPrefs.purchaseComplete} onCheckedChange={(v) => updateNotifPref("purchaseComplete", v)} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-4 h-4 ${notifPrefs.lowBalance ? "text-warning" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">Low Balance Warning</p>
                  <p className="text-xs text-muted-foreground">When your balance drops below threshold</p>
                </div>
              </div>
              <Switch checked={notifPrefs.lowBalance} onCheckedChange={(v) => updateNotifPref("lowBalance", v)} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <ClipboardList className={`w-4 h-4 ${notifPrefs.orderUpdates ? "text-ice" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">Order Updates</p>
                  <p className="text-xs text-muted-foreground">When your order status changes</p>
                </div>
              </div>
              <Switch checked={notifPrefs.orderUpdates} onCheckedChange={(v) => updateNotifPref("orderUpdates", v)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
