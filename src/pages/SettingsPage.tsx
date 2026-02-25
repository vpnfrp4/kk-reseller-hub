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
import { t, useT } from "@/lib/i18n";
import MmLabel from "@/components/shared/MmLabel";

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(getNotificationPrefs);
  const l = useT();

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
        toast.error(l(t.settings.browserNotifBlocked));
        return;
      }
    }
    updateNotifPref("browserNotificationsEnabled", enabled);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      toast.error(l(t.settings.nameValidation));
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
    toast.success(l(t.settings.nameUpdated));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(l(t.settings.pwMinLength));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(l(t.settings.pwMismatch));
      return;
    }

    setChangingPassword(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      toast.error(l(t.settings.pwIncorrect));
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast.error(error.message); return; }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success(l(t.settings.pwChanged));
  };

  return (
    <div className="space-y-[var(--space-section)] max-w-lg">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.settings) },
      ]} />

      <div className="animate-fade-in space-y-[var(--space-micro)]">
        <h1 className="text-2xl font-bold text-foreground">
          <MmLabel mm={t.settings.title.mm} en={t.settings.title.en} />
        </h1>
        <p className="text-muted-foreground text-sm">{l(t.settings.subtitle)}</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-[var(--space-card)] space-y-[var(--space-default)] animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-[var(--space-compact)] font-semibold">
          <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <MmLabel mm={t.settings.profile.mm} en={t.settings.profile.en} className="text-foreground" />
        </div>
        <form onSubmit={handleUpdateName} className="space-y-[var(--space-default)]">
          <div className="space-y-[var(--space-micro)]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{l(t.settings.email)}</Label>
            <Input value={profile?.email || ""} disabled className="bg-muted/30 border-border/20 opacity-60 font-mono text-sm" />
          </div>
          <div className="space-y-[var(--space-micro)]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{l(t.settings.displayName)}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="bg-muted/30 border-border/20"
            />
          </div>
          <Button type="submit" disabled={saving} className="btn-glow">
            {saving ? l(t.settings.saving) : l(t.settings.updateName)}
          </Button>
        </form>
      </div>

      {/* Password Section */}
      <div className="glass-card p-[var(--space-card)] space-y-[var(--space-default)] animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-[var(--space-compact)] font-semibold">
          <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <MmLabel mm={t.settings.changePassword.mm} en={t.settings.changePassword.en} className="text-foreground" />
        </div>
        <form onSubmit={handleChangePassword} className="space-y-[var(--space-default)]">
          <div className="space-y-[var(--space-micro)]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{l(t.settings.currentPw)}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="bg-muted/30 border-border/20"
            />
          </div>
          <div className="space-y-[var(--space-micro)]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{l(t.settings.newPw)}</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/30 border-border/20"
            />
          </div>
          <div className="space-y-[var(--space-micro)]">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{l(t.settings.confirmPw)}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/30 border-border/20"
            />
          </div>
          <Button type="submit" disabled={changingPassword} className="btn-glow">
            {changingPassword ? l(t.settings.changing) : l(t.settings.changePwBtn)}
          </Button>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="glass-card p-[var(--space-card)] space-y-[var(--space-card)] animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-[var(--space-compact)] font-semibold">
          <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <MmLabel mm={t.settings.notifPrefs.mm} en={t.settings.notifPrefs.en} className="text-foreground" />
        </div>

        {/* Delivery Methods */}
        <div className="space-y-[var(--space-compact)]">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{l(t.settings.deliveryMethods)}</p>
          <div className="space-y-[var(--space-tight)]">
            <div className="flex items-center justify-between p-[var(--space-compact)] rounded-[var(--radius)] bg-muted/10 border border-border/20">
              <div className="flex items-center gap-[var(--space-compact)]">
                <Volume2 className={`w-4 h-4 ${notifPrefs.soundEnabled ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{l(t.settings.soundEffects)}</p>
                  <p className="text-xs text-muted-foreground">{l(t.settings.soundDesc)}</p>
                </div>
              </div>
              <Switch checked={notifPrefs.soundEnabled} onCheckedChange={handleSoundToggle} />
            </div>

            <div className="flex items-center justify-between p-[var(--space-compact)] rounded-[var(--radius)] bg-muted/10 border border-border/20">
              <div className="flex items-center gap-[var(--space-compact)]">
                <Globe className={`w-4 h-4 ${notifPrefs.browserNotificationsEnabled ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{l(t.settings.browserNotifs)}</p>
                  <p className="text-xs text-muted-foreground">{l(t.settings.browserDesc)}</p>
                </div>
              </div>
              <Switch checked={notifPrefs.browserNotificationsEnabled} onCheckedChange={handleBrowserToggle} />
            </div>
          </div>

          {"Notification" in window && Notification.permission === "denied" && notifPrefs.browserNotificationsEnabled && (
            <p className="text-[11px] text-destructive mt-[var(--space-tight)] px-1">
              {l(t.settings.browserNotifBlocked)}
            </p>
          )}
        </div>

        {/* Alert Types */}
        <div className="space-y-[var(--space-compact)] pt-[var(--space-default)] border-t border-border/20">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{l(t.settings.alertTypes)}</p>
          <div className="space-y-[var(--space-tight)]">
            <div className="flex items-center justify-between p-[var(--space-compact)] rounded-[var(--radius)] bg-muted/10 border border-border/20">
              <div className="flex items-center gap-[var(--space-compact)]">
                <Wallet className={`w-4 h-4 ${notifPrefs.topupApproved ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{l(t.settings.topupApproved)}</p>
                  <p className="text-xs text-muted-foreground">{l(t.settings.topupApprovedDesc)}</p>
                </div>
              </div>
              <Switch checked={notifPrefs.topupApproved} onCheckedChange={(v) => updateNotifPref("topupApproved", v)} />
            </div>

            <div className="flex items-center justify-between p-[var(--space-compact)] rounded-[var(--radius)] bg-muted/10 border border-border/20">
              <div className="flex items-center gap-[var(--space-compact)]">
                <ShoppingBag className={`w-4 h-4 ${notifPrefs.purchaseComplete ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{l(t.settings.purchaseComplete)}</p>
                  <p className="text-xs text-muted-foreground">{l(t.settings.purchaseCompleteDesc)}</p>
                </div>
              </div>
              <Switch checked={notifPrefs.purchaseComplete} onCheckedChange={(v) => updateNotifPref("purchaseComplete", v)} />
            </div>

            <div className="rounded-[var(--radius)] bg-muted/10 border border-border/20 overflow-hidden">
              <div className="flex items-center justify-between p-[var(--space-compact)]">
                <div className="flex items-center gap-[var(--space-compact)]">
                  <AlertTriangle className={`w-4 h-4 ${notifPrefs.lowBalance ? "text-warning" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{l(t.settings.lowBalanceWarning)}</p>
                    <p className="text-xs text-muted-foreground">{l(t.settings.lowBalanceDesc)}</p>
                  </div>
                </div>
                <Switch checked={notifPrefs.lowBalance} onCheckedChange={(v) => updateNotifPref("lowBalance", v)} />
              </div>
              {notifPrefs.lowBalance && (
                <div className="px-[var(--space-compact)] pb-[var(--space-compact)] pt-0">
                  <div className="flex items-center gap-[var(--space-tight)] p-[var(--space-compact)] rounded-[var(--radius)] bg-background/50 border border-border/20">
                    <Label className="text-[11px] text-muted-foreground whitespace-nowrap">{l(t.settings.alertBelow)}</Label>
                    <Input
                      type="number"
                      min={1000}
                      max={10000000}
                      step={1000}
                      value={notifPrefs.lowBalanceThreshold}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 10000000) {
                          updateNotifPref("lowBalanceThreshold", val as any);
                        }
                      }}
                      className="h-8 w-28 bg-muted/30 border-border/20 text-sm font-mono text-right tabular-nums"
                    />
                    <span className="text-[11px] font-medium text-muted-foreground font-mono">MMK</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-[var(--space-micro)] px-1">
                    {l(t.settings.thresholdHint)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-[var(--space-compact)] rounded-[var(--radius)] bg-muted/10 border border-border/20">
              <div className="flex items-center gap-[var(--space-compact)]">
                <ClipboardList className={`w-4 h-4 ${notifPrefs.orderUpdates ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{l(t.settings.orderUpdates)}</p>
                  <p className="text-xs text-muted-foreground">{l(t.settings.orderUpdatesDesc)}</p>
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
