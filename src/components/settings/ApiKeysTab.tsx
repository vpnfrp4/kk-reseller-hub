import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Copy, Plus, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyEntry {
  id: string;
  name: string;
  key: string;
  created: Date;
  lastUsed: Date | null;
}

export default function ApiKeysTab() {
  // API keys are a placeholder feature — actual key storage would need backend support
  const [keys] = useState<ApiKeyEntry[]>([]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-default">
      {/* API Keys Management */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-compact">
            <div className="w-8 h-8 rounded-btn bg-primary/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
              <p className="text-[11px] text-muted-foreground">Manage keys for programmatic access</p>
            </div>
          </div>
          <Button size="sm" disabled className="h-8 text-xs gap-1.5 opacity-50">
            <Plus className="w-3 h-3" />
            Generate Key
          </Button>
        </div>

        {keys.length === 0 ? (
          <div className="flex flex-col items-center gap-compact py-section text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center">
              <Key className="w-6 h-6 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No API keys</p>
              <p className="text-[11px] text-muted-foreground mt-micro">
                API key management will be available in a future update
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-tight">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center justify-between p-compact rounded-btn bg-muted/10 border border-border/20"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{k.name}</p>
                  <div className="flex items-center gap-tight mt-micro">
                    <code className="text-[11px] font-mono text-muted-foreground">
                      {k.key.slice(0, 8)}{"...".padEnd(24, "*")}
                    </code>
                    <button
                      onClick={() => copyToClipboard(k.key)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/60 hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className="glass-card p-card border-warning/10">
        <div className="flex gap-compact">
          <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Security Notice</p>
            <p className="text-[11px] text-muted-foreground mt-micro leading-relaxed">
              API keys grant full access to your account. Never share them publicly or commit them to version control.
              Rotate keys regularly and revoke any that may have been compromised.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
