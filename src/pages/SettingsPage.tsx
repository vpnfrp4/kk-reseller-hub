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
  const { profile, refreshProfile, user } = useAuth();

  const initial = (profile?.name || profile?.email || "U").charAt(0).toUpperCase();
  const initials = (profile?.name || profile?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // ── Profile edit state ──
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarUrl = profile?.avatar_url;

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
      .update({ name: trimmed } as any)
      .eq("user_id", profile?.user_id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success(l(t.settings.nameUpdated));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) { toast.error("File too large. Maximum size is 2MB."); return; }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) { toast.error("Invalid file type. Use JPG, PNG, or WebP."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: url } as any).eq("user_id", user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      toast.success("Avatar updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const { data: files } = await supabase.storage.from("avatars").list(user.id);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from("avatars").remove(paths);
      }
      const { error } = await supabase.from("profiles").update({ avatar_url: null } as any).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Avatar removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-section">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.settings) },
      ]} />

      {/* ═══ BNPL PROFILE HERO CARD with Personal Info ═══ */}
      <div className="relative overflow-hidden rounded-[var(--radius-modal)] animate-fade-in">
        <div className="absolute inset-0 bnpl-hero-gradient" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" />
        <div className="relative z-10 p-5 lg:p-7 space-y-5">
          {/* Top row: avatar + info */}
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
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

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Personal Information section */}
          <div className="space-y-4">
            <div className="flex items-center gap-compact">
              <div className="w-7 h-7 rounded-btn bg-white/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white/70" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{l(t.settings.personalInfo)}</h3>
                <p className="text-[11px] text-white/40">{l(t.settings.personalInfoDesc)}</p>
              </div>
            </div>

            {/* Avatar edit row */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white/70 tracking-tight">{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  type="button"
                >
                  {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white/80" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div className="flex items-center gap-tight">
                <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5 border-white/20 text-white hover:bg-white/10 bg-white/5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Camera className="w-3 h-3" />
                  {avatarUrl ? l(t.settings.changeAvatar) : l(t.settings.uploadAvatar)}
                </Button>
                {avatarUrl && (
                  <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1.5 text-white/40 hover:text-white hover:bg-white/10" onClick={handleRemoveAvatar} disabled={uploading}>
                    <Trash2 className="w-3 h-3" />
                    {l(t.settings.removeAvatar)}
                  </Button>
                )}
              </div>
            </div>

            {/* Name / Email form */}
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-micro">
                  <Label className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">{l(t.settings.email)}</Label>
                  <Input value={profile?.email || ""} disabled className="bg-white/5 border-white/10 opacity-60 font-mono text-sm h-10 text-white" />
                  <p className="text-[10px] text-white/30">{l(t.settings.emailCannotChange)}</p>
                </div>
                <div className="space-y-micro">
                  <Label className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">{l(t.settings.displayName)}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder={l(t.settings.enterName)} className="bg-white/5 border-white/10 h-10 text-white placeholder:text-white/20" />
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t border-white/10">
                <Button type="submit" disabled={saving} size="sm" className="h-9 px-6 text-xs font-semibold bg-white text-foreground hover:bg-white/90">
                  {saving ? l(t.settings.saving) : l(t.settings.saveChanges)}
                </Button>
              </div>
            </form>
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
