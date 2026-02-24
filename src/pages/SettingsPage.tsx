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
import { t } from "@/lib/i18n";
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
        toast.error("ဘရောက်ဇာ အသိပေးချက်များ ပိတ်ထားသည်။ ဘရောက်ဇာ ဆက်တင်တွင် ဖွင့်ပေးပါ။");
        return;
      }
    }
    updateNotifPref("browserNotificationsEnabled", enabled);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      toast.error("အမည်သည် ၁ မှ ၁၀၀ စာလုံးအတွင်း ဖြစ်ရမည်");
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
    toast.success("အမည်ပြင်ဆင်ပြီးပါပြီ");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("စကားဝှက်အသစ်သည် အနည်းဆုံး ၆ လုံး ရှိရမည်");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("စကားဝှက်များ မကိုက်ညီပါ");
      return;
    }

    setChangingPassword(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      toast.error("လက်ရှိစကားဝှက် မမှန်ကန်ပါ");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast.error(error.message); return; }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("စကားဝှက်ပြောင်းပြီးပါပြီ");
  };

  return (
    <div className="space-y-8 max-w-lg">
      <Breadcrumb items={[
        { label: t.nav.dashboard.mm, path: "/dashboard" },
        { label: t.nav.settings.mm },
      ]} />

      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">
          <MmLabel mm={t.settings.title.mm} en={t.settings.title.en} />
        </h1>
        <p className="text-muted-foreground text-sm">{t.settings.subtitle.mm}</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 font-semibold">
          <User className="w-5 h-5 text-primary" />
          <MmLabel mm={t.settings.profile.mm} en={t.settings.profile.en} className="gold-text" />
        </div>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t.settings.email.mm}</Label>
            <Input value={profile?.email || ""} disabled className="bg-muted/50 border-border opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t.settings.displayName.mm}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="bg-muted/50 border-border"
            />
          </div>
          <Button type="submit" disabled={saving} className="btn-glow">
            {saving ? t.settings.saving.mm : t.settings.updateName.mm}
          </Button>
        </form>
      </div>

      {/* Password Section */}
      <div className="glass-card p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 font-semibold">
          <Lock className="w-5 h-5 text-primary" />
          <MmLabel mm={t.settings.changePassword.mm} en={t.settings.changePassword.en} className="gold-text" />
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t.settings.currentPw.mm}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="bg-muted/50 border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">{t.settings.newPw.mm}</Label>
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
            <Label className="text-muted-foreground text-xs">{t.settings.confirmPw.mm}</Label>
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
            {changingPassword ? t.settings.changing.mm : t.settings.changePwBtn.mm}
          </Button>
        </form>
      </div>

      {/* Notification Preferences */}
      <div className="glass-card p-6 space-y-5 animate-fade-in" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 font-semibold">
          <Bell className="w-5 h-5 text-primary" />
          <MmLabel mm={t.settings.notifPrefs.mm} en={t.settings.notifPrefs.en} className="gold-text" />
        </div>

        {/* Delivery Methods */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.settings.deliveryMethods.mm}</p>
          <div className="space-y-3 mt-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <Volume2 className={`w-4 h-4 ${notifPrefs.soundEnabled ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.settings.soundEffects.mm}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.soundDesc.mm}</p>
                </div>
              </div>
              <Switch checked={notifPrefs.soundEnabled} onCheckedChange={handleSoundToggle} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <Globe className={`w-4 h-4 ${notifPrefs.browserNotificationsEnabled ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.settings.browserNotifs.mm}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.browserDesc.mm}</p>
                </div>
              </div>
              <Switch checked={notifPrefs.browserNotificationsEnabled} onCheckedChange={handleBrowserToggle} />
            </div>
          </div>

          {"Notification" in window && Notification.permission === "denied" && notifPrefs.browserNotificationsEnabled && (
            <p className="text-[11px] text-destructive mt-2 px-1">
              ဘရောက်ဇာ အသိပေးချက်များ ပိတ်ထားသည်။ ဘရောက်ဇာ ဆက်တင်တွင် ဖွင့်ပေးပါ။
            </p>
          )}
        </div>

        {/* Alert Types */}
        <div className="space-y-1 pt-2 border-t border-border/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.settings.alertTypes.mm}</p>
          <div className="space-y-3 mt-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <Wallet className={`w-4 h-4 ${notifPrefs.topupApproved ? "text-success" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.settings.topupApproved.mm}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.topupApprovedDesc.mm}</p>
                </div>
              </div>
              <Switch checked={notifPrefs.topupApproved} onCheckedChange={(v) => updateNotifPref("topupApproved", v)} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <ShoppingBag className={`w-4 h-4 ${notifPrefs.purchaseComplete ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.settings.purchaseComplete.mm}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.purchaseCompleteDesc.mm}</p>
                </div>
              </div>
              <Switch checked={notifPrefs.purchaseComplete} onCheckedChange={(v) => updateNotifPref("purchaseComplete", v)} />
            </div>

            <div className="rounded-lg bg-muted/20 border border-border/30 overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-4 h-4 ${notifPrefs.lowBalance ? "text-warning" : "text-muted-foreground"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.settings.lowBalanceWarning.mm}</p>
                    <p className="text-xs text-muted-foreground">{t.settings.lowBalanceDesc.mm}</p>
                  </div>
                </div>
                <Switch checked={notifPrefs.lowBalance} onCheckedChange={(v) => updateNotifPref("lowBalance", v)} />
              </div>
              {notifPrefs.lowBalance && (
                <div className="px-3 pb-3 pt-0">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/50 border border-border/20">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">{t.settings.alertBelow.mm}</Label>
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
                      className="h-8 w-28 bg-muted/50 border-border text-sm font-mono text-right"
                    />
                    <span className="text-xs font-medium text-muted-foreground">MMK</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                    အကြံပြု: 5,000 – 50,000 MMK
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <ClipboardList className={`w-4 h-4 ${notifPrefs.orderUpdates ? "text-ice" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{t.settings.orderUpdates.mm}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.orderUpdatesDesc.mm}</p>
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
