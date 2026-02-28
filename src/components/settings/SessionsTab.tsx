import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Globe, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: Date;
  isCurrent: boolean;
}

function detectDevice(): SessionInfo {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  let browser = "Unknown";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";

  return {
    id: "current",
    device: isMobile ? "Mobile Device" : "Desktop",
    browser,
    ip: "Current session",
    lastActive: new Date(),
    isCurrent: true,
  };
}

export default function SessionsTab() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setSessions([detectDevice()]);
  }, []);

  const handleSignOutAll = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast.success("Signed out from all devices");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-default">
      {/* Active Sessions */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-compact">
            <div className="w-8 h-8 rounded-btn bg-primary/10 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
              <p className="text-[11px] text-muted-foreground">Devices where you are currently signed in</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-destructive/20 text-destructive hover:bg-destructive/10"
            onClick={handleSignOutAll}
            disabled={signingOut}
          >
            <LogOut className="w-3 h-3" />
            {signingOut ? "Signing out..." : "Sign Out All"}
          </Button>
        </div>

        <div className="space-y-tight">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-compact p-compact rounded-btn border transition-colors ${
                s.isCurrent
                  ? "bg-primary/5 border-primary/20"
                  : "bg-muted/10 border-border/20"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                s.isCurrent ? "bg-primary/10" : "bg-muted/20"
              }`}>
                {s.device === "Mobile Device" ? (
                  <Smartphone className={`w-5 h-5 ${s.isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                ) : (
                  <Monitor className={`w-5 h-5 ${s.isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-tight">
                  <p className="text-sm font-medium text-foreground">{s.device}</p>
                  {s.isCurrent && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {s.browser} &middot; {s.ip}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground">
                  {s.isCurrent ? "Active now" : s.lastActive.toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Tip */}
      <div className="glass-card p-card">
        <div className="flex gap-compact">
          <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Session Security</p>
            <p className="text-[11px] text-muted-foreground mt-micro leading-relaxed">
              If you notice any unfamiliar sessions, sign out from all devices immediately 
              and change your password. Always sign out when using shared or public devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
