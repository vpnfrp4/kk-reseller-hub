import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Camera, Mail, Calendar, Loader2, Trash2, Send, Link2, Copy, CheckCircle2, Unlink, Bell, Package, RefreshCw, XCircle, Wallet, AlertTriangle, ClipboardList, Sparkles, Search, DollarSign } from "lucide-react";
import { t, useT } from "@/lib/i18n";

const BOT_USERNAME = "karkar4store_bot";

export default function ProfileTab() {
  const { profile, refreshProfile, user } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [telegramChatId, setTelegramChatId] = useState((profile as any)?.telegram_chat_id || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const l = useT();

  const isLinked = !!(profile as any)?.telegram_chat_id;

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

  // ── Avatar handlers (unchanged logic) ──
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
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl } as any).eq("user_id", user.id);
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

  // ── Telegram Link Generation (uses user_id directly) ──
  const generateLinkToken = useCallback(async () => {
    if (!user) return;
    setGeneratingLink(true);
    try {
      setLinkToken(user.id);
      toast.success("Link generated! Click it or copy to share.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate link");
    } finally {
      setGeneratingLink(false);
    }
  }, [user]);

  const handleCopyLink = useCallback(() => {
    if (!user) return;
    const url = `https://t.me/${BOT_USERNAME}?start=${user.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }, [user]);

  const handleUnlinkTelegram = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: null, telegram_link_token: null } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      setTelegramChatId("");
      setLinkToken(null);
      await refreshProfile();
      toast.success("Telegram disconnected");
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink");
    } finally {
      setSaving(false);
    }
  }, [user, refreshProfile]);

  const initials = (profile?.name || profile?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarUrl = profile?.avatar_url;
  const telegramLink = linkToken ? `https://t.me/${BOT_USERNAME}?start=${linkToken}` : null;

  return (
    <div className="space-y-default">

      {/* Connect Telegram */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-[hsl(200,80%,50%)]/10 flex items-center justify-center">
            <Send className="w-4 h-4 text-[hsl(200,80%,50%)]" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">{l(t.settings.telegramTitle)}</h3>
            <p className="text-[11px] text-muted-foreground">
              {l(t.settings.telegramDesc)}
            </p>
          </div>
          {isLinked ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-medium text-primary">{l(t.settings.connected)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/20 border border-border/20">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              <span className="text-[11px] font-medium text-muted-foreground">{l(t.settings.notConnected)}</span>
            </div>
          )}
        </div>

        {isLinked ? (
          <div className="space-y-compact">
            {/* Connection Status Card */}
            <div className="flex items-center gap-compact p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="w-10 h-10 rounded-xl bg-[hsl(200,80%,50%)]/10 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-[hsl(200,80%,50%)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">@{BOT_USERNAME}</p>
                <p className="text-[10px] text-muted-foreground font-mono">Chat ID: {telegramChatId}</p>
              </div>
            </div>

            {/* What You'll Receive */}
            <div className="p-3 rounded-lg bg-muted/10 border border-border/10 space-y-2">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1"><Bell className="w-3 h-3 text-primary" /> {l(t.settings.autoNotifications)}:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {l(t.settings.orderPlaced)}</span>
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {l(t.settings.orderProcessing)}</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {l(t.settings.orderCompleted)}</span>
                <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> {l(t.settings.orderRejected)}</span>
                <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> {l(t.settings.topupApproved)}</span>
                <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {l(t.settings.balanceAlerts)}</span>
              </div>
            </div>

            {/* Bot Commands Reference */}
            <div className="p-3 rounded-lg bg-muted/10 border border-border/10 space-y-2">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1"><ClipboardList className="w-3 h-3 text-primary" /> {l(t.settings.botCommands)}:</p>
              <div className="grid gap-1.5">
                {[
                  { cmd: "/balance", desc: "Check wallet balance (MMK & USD)" },
                  { cmd: "/orders", desc: "View your last 5 orders" },
                  { cmd: "/status [ID]", desc: "Check specific order status" },
                  { cmd: "/help", desc: "Show all available commands" },
                  { cmd: "/unlink", desc: "Disconnect Telegram" },
                ].map((item) => (
                  <div key={item.cmd} className="flex items-center gap-2">
                    <code className="text-[11px] font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded min-w-[90px]">{item.cmd}</code>
                    <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[11px] gap-1.5 text-destructive/60 hover:text-destructive"
              onClick={handleUnlinkTelegram}
              disabled={saving}
            >
              <Unlink className="w-3 h-3" />
              {l(t.settings.disconnectTelegram)}
            </Button>
          </div>
        ) : (
          <div className="space-y-compact">
            {/* Benefits */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
              <p className="text-[11px] font-semibold text-foreground flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> {l(t.settings.whyConnect)}</p>
              <div className="grid gap-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {l(t.settings.instantNotifs)}</span>
                <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> {l(t.settings.topupAlerts)}</span>
                <span className="flex items-center gap-1"><Search className="w-3 h-3" /> {l(t.settings.checkFromTg)}</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {l(t.settings.quickBalance)}</span>
              </div>
            </div>

            {/* Steps */}
            <div className="p-3 rounded-lg bg-muted/10 border border-border/20 space-y-2">
              <p className="text-xs text-muted-foreground">
                <b>Step 1:</b> {l(t.settings.step1)}
              </p>
              <p className="text-xs text-muted-foreground">
                <b>Step 2:</b> {l(t.settings.step2).replace("{bot}", BOT_USERNAME)}
              </p>
              <p className="text-xs text-muted-foreground">
                <b>Step 3:</b> {l(t.settings.step3)}
              </p>
            </div>

            {telegramLink ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2.5 rounded-lg bg-muted/20 border border-primary/20">
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-primary break-all hover:underline"
                    >
                      {telegramLink}
                    </a>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 shrink-0"
                    onClick={handleCopyLink}
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/60">
                  {l(t.settings.linkExpireNote)}
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-xs"
                onClick={generateLinkToken}
                disabled={generatingLink}
              >
                {generatingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                Generate Connection Link
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
