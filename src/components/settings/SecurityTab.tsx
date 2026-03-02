import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Shield, Eye, EyeOff, Check, X } from "lucide-react";
import { t, useT } from "@/lib/i18n";
import { getPasswordStrength, validatePassword } from "@/lib/username-validation";

export default function SecurityTab() {
  const { profile } = useAuth();
  const l = useT();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const passwordPolicyError = useMemo(() => validatePassword(newPassword), [newPassword]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordPolicyError) {
      toast.error(passwordPolicyError);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(l(t.settings.pwMismatch));
      return;
    }
    setChangingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile?.email || "",
      password: currentPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      toast.error(l(t.settings.pwIncorrect));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast.error(error.message); return; }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success(l(t.settings.pwChanged));
  };

  return (
    <div className="space-y-default">
      {/* Password Change */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-primary/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Password</h3>
            <p className="text-[11px] text-muted-foreground">Update your password to keep your account secure</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-default">
          <div className="space-y-micro">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="bg-muted/20 border-border/20 h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-micro">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="bg-muted/20 border-border/20 h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Strength indicator */}
            {newPassword.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                        i <= strength.score ? strength.color : "bg-muted/30"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-[10px] font-semibold ${
                  strength.score <= 2 ? "text-destructive" :
                  strength.score <= 3 ? "text-warning" :
                  strength.score <= 4 ? "text-primary" : "text-success"
                }`}>
                  {strength.label}
                </p>
                <div className="space-y-1">
                  {[
                    { met: newPassword.length >= 8, label: "8+ characters" },
                    { met: /[A-Z]/.test(newPassword), label: "Uppercase letter" },
                    { met: /[a-z]/.test(newPassword), label: "Lowercase letter" },
                    { met: /[0-9]/.test(newPassword), label: "Number" },
                    { met: /[^A-Za-z0-9]/.test(newPassword), label: "Special character" },
                  ].map((req) => (
                    <div key={req.label} className="flex items-center gap-1.5">
                      {req.met ? (
                        <Check className="w-3 h-3 text-success shrink-0" />
                      ) : (
                        <X className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={`text-[10px] font-medium ${req.met ? "text-success" : "text-muted-foreground/60"}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-micro">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="bg-muted/20 border-border/20 h-10"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[10px] text-destructive">Passwords do not match</p>
            )}
          </div>

          <div className="flex justify-end pt-tight border-t border-border/20">
            <Button type="submit" disabled={changingPassword} size="sm" className="btn-glow h-9 px-6 text-xs font-semibold">
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </div>

      {/* 2FA Section */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-muted/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Two-Factor Authentication</h3>
            <p className="text-[11px] text-muted-foreground">Add an extra layer of security to your account</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-compact rounded-btn bg-muted/10 border border-border/20">
          <div className="flex items-center gap-compact">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium text-foreground">Authenticator App</p>
              <p className="text-[11px] text-muted-foreground">Not configured</p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled className="h-8 text-xs opacity-50">
            Coming Soon
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Two-factor authentication adds a second verification step when signing in. 
          This feature will be available in a future update.
        </p>
      </div>
    </div>
  );
}
