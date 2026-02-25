import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldAlert } from "lucide-react";
import { t, useT } from "@/lib/i18n";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const l = useT();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError(l(t.resetPw.minLength));
      return;
    }
    if (password !== confirmPassword) {
      setError(l(t.resetPw.noMatch));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20" style={{ background: "radial-gradient(circle, hsl(0 72% 51% / 0.15), transparent 70%)" }} />
        </div>

        <div className="w-full max-w-md text-center space-y-6 relative z-10 animate-fade-in">
          <div
            className="w-[72px] h-[72px] rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: "hsl(var(--destructive) / 0.15)", border: "1px solid hsl(var(--destructive) / 0.2)" }}
          >
            <ShieldAlert className="w-9 h-9 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">{l(t.resetPw.invalidLink)}</h1>
          <p className="text-muted-foreground text-sm">{l(t.resetPw.invalidLinkDesc)}</p>
          <Button onClick={() => navigate("/login")} className="btn-glass gap-2">
            {l(t.resetPw.backToLogin)}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-30" style={{ background: "radial-gradient(circle, hsl(43 76% 47% / 0.12), transparent 70%)" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-20" style={{ background: "radial-gradient(circle, hsl(224 76% 33% / 0.15), transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-fade-in">
          <div
            className="w-[72px] h-[72px] rounded-2xl mx-auto mb-5 flex items-center justify-center relative overflow-hidden"
            style={{ background: "var(--gradient-gold)", boxShadow: "0 0 40px hsl(43 76% 47% / 0.3)" }}
          >
            <KeyRound className="w-9 h-9 text-primary-foreground relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">{l(t.resetPw.title)}</h1>
          <p className="text-muted-foreground text-sm mt-3">{l(t.resetPw.subtitle)}</p>
        </div>

        {success ? (
          <div className="glass-card p-8 text-center space-y-4 animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, hsl(var(--success)), hsl(var(--success) / 0.3))" }} />
            <CheckCircle2 className="w-14 h-14 text-success mx-auto" />
            <p className="text-foreground font-semibold text-lg">{l(t.resetPw.passwordUpdated)}</p>
            <p className="text-muted-foreground text-sm">{l(t.resetPw.redirecting)}</p>
          </div>
        ) : (
          <div className="glass-card p-8 animate-fade-in relative overflow-hidden" style={{ animationDelay: "0.1s" }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "var(--gradient-gold)" }} />

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {l(t.resetPw.newPassword)}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-muted/50 border-border/50 focus:border-primary/50 pr-10 transition-all duration-200 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {l(t.resetPw.confirmPassword)}
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-muted/50 border-border/50 focus:border-primary/50 transition-all duration-200 h-11"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
                  <p className="text-destructive text-sm text-center">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full btn-glow font-semibold h-11 gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    {l(t.resetPw.updating)}
                  </>
                ) : (
                  <>
                    {l(t.resetPw.updatePassword)}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground/60 mt-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          &copy; {new Date().getFullYear()} KKTech. All rights reserved.
        </p>
      </div>
    </div>
  );
}
