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
import { useAuth } from "@/contexts/AuthContext";
import { Money } from "@/components/shared";

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
  const { profile } = useAuth();

  const initial = (profile?.name || profile?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="space-y-section">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.settings) },
      ]} />

      {/* ═══ PROFILE HERO CARD ═══ */}
      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-border/50 bg-card/90 backdrop-blur-md p-5 lg:p-6 animate-fade-in">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="relative z-10 flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-14 h-14 rounded-2xl object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{initial}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground tracking-tight truncate">
              {profile?.name || "User"}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-primary/15">
                {profile?.tier || "Standard"}
              </span>
              <span className="text-xs text-muted-foreground">
                Balance: <Money amount={profile?.balance || 0} className="font-mono font-semibold text-foreground inline" />
              </span>
            </div>
          </div>
        </div>
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
            <div className="rounded-[var(--radius-card)] border border-border/50 bg-card/90 backdrop-blur-sm p-2 space-y-0.5 sticky top-24" style={{ boxShadow: "var(--shadow-card)" }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-compact px-compact py-2.5 rounded-btn text-sm font-medium transition-all text-left",
                      isActive
                        ? "bg-primary/8 text-primary border border-primary/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent"
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
