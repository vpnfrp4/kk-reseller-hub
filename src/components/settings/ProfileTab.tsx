import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send, Link2, Copy, CheckCircle2, Unlink, Bell, Package, RefreshCw, XCircle, Wallet, AlertTriangle, ClipboardList, Sparkles, Search, DollarSign, Loader2 } from "lucide-react";
import { t, useT } from "@/lib/i18n";

const BOT_USERNAME = "karkar4store_bot";

export default function ProfileTab() {
  const { profile, refreshProfile, user } = useAuth();
  const [telegramChatId, setTelegramChatId] = useState((profile as any)?.telegram_chat_id || "");
  const [saving, setSaving] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const l = useT();

  const isLinked = !!(profile as any)?.telegram_chat_id;

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
                {l(t.settings.generateLink)}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
