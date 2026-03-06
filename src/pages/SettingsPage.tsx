import { useState } from "react";
import { User, Lock, Bell, Key, Monitor, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Breadcrumb from "@/components/Breadcrumb";
import { t, useT } from "@/lib/i18n";
import MmLabel from "@/components/shared/MmLabel";
import ProfileTab from "@/components/settings/ProfileTab";
import SecurityTab from "@/components/settings/SecurityTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import ApiKeysTab from "@/components/settings/ApiKeysTab";
import SessionsTab from "@/components/settings/SessionsTab";
import PreferencesTab from "@/components/settings/PreferencesTab";
import { useIsMobile } from "@/hooks/use-mobile";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: Settings2 },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "sessions", label: "Sessions", icon: Monitor },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const l = useT();
  const isMobile = useIsMobile();

  return (
    <div className="space-y-section">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.settings) },
      ]} />

      <div className="animate-fade-in space-y-1">
        <h1 className="text-xl font-bold text-foreground tracking-tight">
          <MmLabel mm={t.settings.title.mm} en={t.settings.title.en} />
        </h1>
        <p className="text-muted-foreground text-sm">{l(t.settings.subtitle)}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-default animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {isMobile ? (
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs font-medium whitespace-nowrap transition-all shrink-0",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : (
          <nav className="w-56 shrink-0">
            <div className="rounded-[var(--radius-card)] border border-border/50 bg-card p-2 space-y-0.5 sticky top-24" style={{ boxShadow: "var(--shadow-card)" }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-compact px-compact py-2.5 rounded-btn text-sm font-medium transition-all text-left",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.15)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
                    )}
                  >
                    <tab.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        <div className="flex-1 min-w-0 max-w-2xl">
          <div key={activeTab} className="animate-fade-in">
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "preferences" && <PreferencesTab />}
            {activeTab === "security" && <SecurityTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "api-keys" && <ApiKeysTab />}
            {activeTab === "sessions" && <SessionsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
