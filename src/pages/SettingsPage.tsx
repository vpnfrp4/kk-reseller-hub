import { useState, useRef } from "react";
import { User, Lock, Bell, Key, Monitor, Settings2, Camera, Loader2, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const tabs = [
  { id: "profile", label: t.settings.profile, icon: User },
  { id: "preferences", label: t.settings.preferences, icon: Settings2 },
  { id: "security", label: t.settings.security, icon: Lock },
  { id: "notifications", label: t.settings.notifications, icon: Bell },
  { id: "api-keys", label: t.settings.apiKeys, icon: Key },
  { id: "sessions", label: t.settings.sessions, icon: Monitor },
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

      {/* ═══ BNPL PROFILE HERO CARD ═══ */}
      <div className="relative overflow-hidden rounded-[var(--radius-modal)] animate-fade-in">
        <div className="absolute inset-0 bnpl-hero-gradient" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" />
        <div className="relative z-10 p-5 lg:p-7 flex items-center gap-4">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
              <span className="text-xl font-bold text-white">{initial}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight truncate">
              {profile?.name || "User"}
            </h1>
            <p className="text-sm text-white/50 truncate">{profile?.email}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] font-semibold text-white bg-white/10 px-2.5 py-0.5 rounded-pill uppercase tracking-wider border border-white/10">
                {profile?.tier || "Standard"}
              </span>
              <span className="text-xs text-white/40">
                Balance: <Money amount={profile?.balance || 0} className="font-mono font-semibold text-white inline" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-default animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {isMobile ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 rounded-pill text-xs font-semibold whitespace-nowrap transition-all shrink-0",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.25)]"
                      : "text-muted-foreground hover:text-foreground bg-card border border-border/30"
                  )}
                  style={isActive ? undefined : { boxShadow: "var(--shadow-card)" }}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {l(tab.label)}
                </button>
              );
            })}
          </div>
        ) : (
          <nav className="w-56 shrink-0">
            <div className="rounded-2xl border border-border/30 bg-card p-2 space-y-1 sticky top-24" style={{ boxShadow: "var(--shadow-card)" }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-compact px-compact py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left relative",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_2px_8px_hsl(var(--primary)/0.2)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                    )}
                  >
                    <tab.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                    {l(tab.label)}
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
