import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bell, Volume2, Globe, Wallet, ShoppingBag,
  AlertTriangle, ClipboardList, Smartphone, Loader2,
} from "lucide-react";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  requestNotificationPermission,
  playSound,
  type NotificationPrefs,
} from "@/lib/notifications";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { t, useT } from "@/lib/i18n";

export default function NotificationsTab() {
  const [notifPrefs, setNotifPrefsState] = useState<NotificationPrefs>(getNotificationPrefs);
  const l = useT();
  const {
    isSubscribed,
    isSupported,
    permission,
    loading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  useEffect(() => {
    const handler = (e: Event) => setNotifPrefsState((e as CustomEvent).detail);
    window.addEventListener("notification-prefs-changed", handler);
    return () => window.removeEventListener("notification-prefs-changed", handler);
  }, []);

  const updateNotifPref = (key: keyof NotificationPrefs, value: boolean | number) => {
    setNotificationPrefs({ [key]: value });
    setNotifPrefsState((p) => ({ ...p, [key]: value }));
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

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success("Push notifications disabled");
    } else {
      const ok = await subscribe();
      if (ok) {
        toast.success("Push notifications enabled! You'll receive alerts even when the app is closed.");
      } else if (permission === "denied") {
        toast.error("Notifications are blocked. Please enable them in your browser/device settings.");
      } else {
        toast.error("Failed to enable push notifications. Please try again.");
      }
    }
  };

  const ToggleRow = ({
    icon: Icon,
    iconColor,
    title,
    description,
    checked,
    onChange,
    children,
  }: {
    icon: any;
    iconColor?: string;
    title: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    children?: React.ReactNode;
  }) => (
    <div className="rounded-btn bg-muted/10 border border-border/20 overflow-hidden">
      <div className="flex items-center justify-between p-compact">
        <div className="flex items-center gap-compact">
          <Icon className={`w-4 h-4 ${checked ? (iconColor || "text-primary") : "text-muted-foreground"} transition-colors`} />
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-default">
      {/* Push Notifications */}
      {isSupported && (
        <div className="glass-card p-card space-y-default">
          <div className="flex items-center gap-compact">
            <div className="w-8 h-8 rounded-btn bg-success/10 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-success" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Push Notifications</h3>
              <p className="text-[11px] text-muted-foreground">
                Receive alerts even when the app is closed or minimized
              </p>
            </div>
          </div>

          <div className="rounded-btn bg-muted/10 border border-border/20 p-compact">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-compact">
                <Bell className={`w-4 h-4 ${isSubscribed ? "text-success" : "text-muted-foreground"} transition-colors`} />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isSubscribed ? "Push Enabled" : "Enable Push Notifications"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isSubscribed
                      ? "Order updates, top-ups & announcements will appear in your notification bar"
                      : "Get notified about orders, wallet top-ups, and important updates"}
                  </p>
                </div>
              </div>
              <Button
                variant={isSubscribed ? "outline" : "default"}
                size="sm"
                className={`h-8 text-xs gap-1.5 ${
                  isSubscribed
                    ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                    : "btn-glow"
                }`}
                onClick={handlePushToggle}
                disabled={pushLoading}
              >
                {pushLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                {isSubscribed ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>

          {permission === "denied" && (
            <p className="text-[10px] text-destructive px-1">
              Notifications are blocked by your browser. Go to your browser or device settings to allow notifications for this site.
            </p>
          )}
        </div>
      )}

      {/* Delivery Methods */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-primary/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Delivery Methods</h3>
            <p className="text-[11px] text-muted-foreground">How you want to receive notifications</p>
          </div>
        </div>

        <div className="space-y-tight">
          <ToggleRow
            icon={Volume2}
            title={l(t.settings.soundEffects)}
            description={l(t.settings.soundDesc)}
            checked={notifPrefs.soundEnabled}
            onChange={handleSoundToggle}
          />
          <ToggleRow
            icon={Globe}
            title={l(t.settings.browserNotifs)}
            description={l(t.settings.browserDesc)}
            checked={notifPrefs.browserNotificationsEnabled}
            onChange={handleBrowserToggle}
          />
        </div>

        {"Notification" in window && Notification.permission === "denied" && notifPrefs.browserNotificationsEnabled && (
          <p className="text-[10px] text-destructive px-1">
            {l(t.settings.browserNotifBlocked)}
          </p>
        )}
      </div>

      {/* Alert Types */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-muted/20 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Alert Categories</h3>
            <p className="text-[11px] text-muted-foreground">Choose which events trigger notifications</p>
          </div>
        </div>

        <div className="space-y-tight">
          <ToggleRow
            icon={Wallet}
            title={l(t.settings.topupApproved)}
            description={l(t.settings.topupApprovedDesc)}
            checked={notifPrefs.topupApproved}
            onChange={(v) => updateNotifPref("topupApproved", v)}
          />
          <ToggleRow
            icon={ShoppingBag}
            title={l(t.settings.purchaseComplete)}
            description={l(t.settings.purchaseCompleteDesc)}
            checked={notifPrefs.purchaseComplete}
            onChange={(v) => updateNotifPref("purchaseComplete", v)}
          />
          <ToggleRow
            icon={AlertTriangle}
            iconColor="text-warning"
            title={l(t.settings.lowBalanceWarning)}
            description={l(t.settings.lowBalanceDesc)}
            checked={notifPrefs.lowBalance}
            onChange={(v) => updateNotifPref("lowBalance", v)}
          >
            {notifPrefs.lowBalance && (
              <div className="px-compact pb-compact pt-0">
                <div className="flex items-center gap-tight p-compact rounded-btn bg-background/50 border border-border/20">
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
                        updateNotifPref("lowBalanceThreshold", val);
                      }
                    }}
                    className="h-8 w-28 bg-muted/30 border-border/20 text-sm font-mono text-right tabular-nums"
                  />
                  <span className="text-[11px] font-medium text-muted-foreground font-mono">MMK</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-micro px-1">
                  {l(t.settings.thresholdHint)}
                </p>
              </div>
            )}
          </ToggleRow>
          <ToggleRow
            icon={ClipboardList}
            title={l(t.settings.orderUpdates)}
            description={l(t.settings.orderUpdatesDesc)}
            checked={notifPrefs.orderUpdates}
            onChange={(v) => updateNotifPref("orderUpdates", v)}
          />
        </div>
      </div>
    </div>
  );
}
