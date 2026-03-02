import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Camera, Mail, Calendar, Loader2, Trash2, Send } from "lucide-react";
import { t, useT } from "@/lib/i18n";

export default function ProfileTab() {
  const { profile, refreshProfile, user } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [telegramChatId, setTelegramChatId] = useState((profile as any)?.telegram_chat_id || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const l = useT();

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) {
      toast.error(l(t.settings.nameValidation));
      return;
    }
    setSaving(true);
    const updateData: any = { name: trimmed };
    const tgId = telegramChatId.trim();
    updateData.telegram_chat_id = tgId || null;
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", profile?.user_id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success(l(t.settings.nameUpdated));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("File too large. Maximum size is 2MB.");
      return;
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use JPG, PNG, or WebP.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to storage (upsert)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl } as any)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Avatar updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setUploading(true);
    try {
      // List files in user folder and remove them
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(user.id);

      if (files && files.length > 0) {
        const paths = files.map((f) => `${user.id}/${f.name}`);
        await supabase.storage.from("avatars").remove(paths);
      }

      // Clear avatar_url in profile
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Avatar removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove avatar");
    } finally {
      setUploading(false);
    }
  };

  const initials = (profile?.name || profile?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarUrl = profile?.avatar_url;

  return (
    <div className="space-y-default">
      {/* Avatar + Identity */}
      <div className="glass-card p-card">
        <div className="flex items-start gap-card">
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary tracking-tight">
                  {initials}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-2xl bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              type="button"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
            />
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
            <div className="flex items-center gap-tight pt-micro">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Camera className="w-3 h-3" />
                {avatarUrl ? "Change Avatar" : "Upload Avatar"}
              </Button>
              {avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1.5 text-destructive/60 hover:text-destructive"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </Button>
              )}
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
            <div className="sm:col-span-2 space-y-micro">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Send className="w-3 h-3" /> Telegram Chat ID
              </Label>
              <Input
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789"
                className="bg-muted/20 border-border/20 h-10 font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground/50">
                Link your Telegram to receive order status updates. Send <span className="font-semibold">/start</span> to <span className="font-semibold">@KKRemoteBot</span> to get your Chat ID.
              </p>
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
