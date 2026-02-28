import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Camera, Mail, Calendar } from "lucide-react";
import { t, useT } from "@/lib/i18n";

export default function ProfileTab() {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [saving, setSaving] = useState(false);
  const l = useT();

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

  const initials = (profile?.name || profile?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-default">
      {/* Avatar + Identity */}
      <div className="glass-card p-card">
        <div className="flex items-start gap-card">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary tracking-tight">
              {initials}
            </div>
            <button
              className="absolute inset-0 rounded-2xl bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-not-allowed"
              title="Avatar upload coming soon"
              type="button"
            >
              <Camera className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 min-w-0 space-y-micro">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {profile?.name || "Unnamed User"}
            </h3>
            <div className="flex items-center gap-tight text-sm text-muted-foreground">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-mono text-xs">{profile?.email}</span>
            </div>
            <div className="flex items-center gap-tight text-xs text-muted-foreground/60">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>Member</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
            <p className="text-[11px] text-muted-foreground">Update your display name and profile details</p>
          </div>
        </div>

        <form onSubmit={handleUpdateName} className="space-y-default">
          <div className="grid gap-default sm:grid-cols-2">
            <div className="space-y-micro">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Email Address</Label>
              <Input
                value={profile?.email || ""}
                disabled
                className="bg-muted/20 border-border/20 opacity-60 font-mono text-sm h-10"
              />
              <p className="text-[10px] text-muted-foreground/50">Email cannot be changed</p>
            </div>
            <div className="space-y-micro">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Display Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                placeholder="Enter your name"
                className="bg-muted/20 border-border/20 h-10"
              />
            </div>
          </div>

          <div className="flex justify-end pt-tight border-t border-border/20">
            <Button type="submit" disabled={saving} size="sm" className="btn-glow h-9 px-6 text-xs font-semibold">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
