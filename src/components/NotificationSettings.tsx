import { useState, useEffect } from "react";
import { Bell, Volume2, VolumeX, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  requestNotificationPermission,
  playSound,
  type NotificationPrefs,
} from "@/lib/notifications";
import { t, useT } from "@/lib/i18n";

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(getNotificationPrefs);
  const l = useT();

  useEffect(() => {
    const handler = (e: Event) => {
      setPrefs((e as CustomEvent).detail);
    };
    window.addEventListener("notification-prefs-changed", handler);
    return () => window.removeEventListener("notification-prefs-changed", handler);
  }, []);

  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    setNotificationPrefs({ [key]: value });
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const handleBrowserToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    updatePref("browserNotificationsEnabled", enabled);
  };

  const handleSoundToggle = (enabled: boolean) => {
    updatePref("soundEnabled", enabled);
    if (enabled) playSound("info");
  };

  const anyEnabled = prefs.soundEnabled || prefs.browserNotificationsEnabled;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
          {anyEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-card border-border z-50" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">{l(t.notifSettings.title)}</h4>
            <p className="text-xs text-muted-foreground">{l(t.notifSettings.subtitle)}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {prefs.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-primary" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground">{l(t.notifSettings.soundEffects)}</span>
              </div>
              <Switch
                checked={prefs.soundEnabled}
                onCheckedChange={handleSoundToggle}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {prefs.browserNotificationsEnabled ? (
                  <Bell className="w-4 h-4 text-primary" />
                ) : (
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm text-foreground">{l(t.notifSettings.browserAlerts)}</span>
              </div>
              <Switch
                checked={prefs.browserNotificationsEnabled}
                onCheckedChange={handleBrowserToggle}
              />
            </div>
          </div>

          {!("Notification" in window) && (
            <p className="text-[10px] text-muted-foreground">{l(t.notifSettings.notSupported)}</p>
          )}
          {"Notification" in window && Notification.permission === "denied" && prefs.browserNotificationsEnabled && (
            <p className="text-[10px] text-destructive">{l(t.notifSettings.blockedByBrowser)}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
