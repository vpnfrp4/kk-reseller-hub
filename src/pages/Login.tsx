import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { t, useT } from "@/lib/i18n";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const l = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (isForgot) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess(l(t.login.resetSuccess));
      }
      setLoading(false);
      return;
    }

    if (isSignup) {
      const { error } = await signup(email, password, name);
      if (error) {
        setError(error);
      } else {
        setSuccess(l(t.login.signupSuccess));
        setIsSignup(false);
      }
    } else {
      const { error } = await login(email, password);
      if (error) {
        setError(error);
      } else {
        navigate("/dashboard");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient radial backgrounds — subtle, not glowing */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[550px] h-[550px] rounded-full opacity-100"
          style={{ background: "radial-gradient(circle, hsl(220 40% 12% / 0.4), transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full opacity-100"
          style={{ background: "radial-gradient(circle, hsl(220 35% 10% / 0.3), transparent 70%)", filter: "blur(100px)" }}
        />
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        {/* Branding — professional, no emoji */}
        <div className="text-center mb-10 animate-fade-in">
          <div
            className="rounded-2xl mx-auto mb-5 flex items-center justify-center bg-muted/50 border border-border"
            style={{ width: "64px", height: "64px" }}
          >
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            KK<span className="text-primary">Tech</span>
          </h1>
          <p className="text-overline uppercase tracking-[0.2em] text-muted-foreground font-semibold mt-1.5">
            Reseller Platform
          </p>
          <p className="text-muted-foreground text-sm mt-4">
            {isForgot
              ? l(t.login.forgotSubtitle)
              : isSignup
              ? l(t.login.signupSubtitle)
              : l(t.login.subtitle)}
          </p>
        </div>

        {/* Form Card — glass, no neon borders */}
        <div className="glass-card p-8 animate-fade-in" style={{ animationDelay: "0.08s" }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <div className="space-y-2 opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: "0.1s" }}>
                <Label htmlFor="name" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  {l(t.login.fullName)}
                </Label>
                <Input
                  id="name"
                  placeholder={l(t.login.namePlaceholder)}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-muted/40 border-border/60 focus:border-primary/40 transition-colors h-11"
                />
              </div>
            )}

            <div className="space-y-2 opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: isSignup ? "0.18s" : "0.1s" }}>
              <Label htmlFor="email" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {l(t.login.emailAddress)}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="reseller@kktech.shop"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/40 border-border/60 focus:border-primary/40 transition-colors h-11"
              />
            </div>

            {!isForgot && (
              <div className="space-y-2 opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: isSignup ? "0.26s" : "0.18s" }}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {l(t.login.password)}
                  </Label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }}
                      className="text-xs text-primary/70 hover:text-primary transition-colors"
                    >
                      {l(t.login.forgotPassword)}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-muted/40 border-border/60 focus:border-primary/40 pr-10 transition-colors h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-destructive/8 border border-destructive/15 rounded-lg px-4 py-2.5">
                <p className="text-destructive text-sm text-center">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-success/8 border border-success/15 rounded-lg px-4 py-2.5">
                <p className="text-success text-sm text-center">{success}</p>
              </div>
            )}

            <div className="opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: isSignup ? "0.34s" : isForgot ? "0.18s" : "0.26s" }}>
              <Button type="submit" className="w-full btn-glow font-semibold h-11 gap-2 text-sm" disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    {l(t.login.pleaseWait)}
                  </>
                ) : (
                  <>
                    {isForgot ? l(t.login.sendResetLink) : isSignup ? l(t.login.createAccount) : l(t.login.signIn)}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            <div className="opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: isSignup ? "0.42s" : isForgot ? "0.26s" : "0.34s" }}>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[hsl(220_28%_9%)] px-3 text-muted-foreground">
                    {isForgot ? l(t.login.orDividerForgot) : isSignup ? l(t.login.orDividerSignup) : l(t.login.orDividerLogin)}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm mt-5">
                {isForgot ? (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(false); setError(""); setSuccess(""); }}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {l(t.login.backToSignIn)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setIsSignup(!isSignup); setError(""); setSuccess(""); }}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    {isSignup ? l(t.login.signInInstead) : l(t.login.createAnAccount)}
                  </button>
                )}
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          {new Date().getFullYear()} KKTech. All rights reserved.
        </p>
      </div>
    </div>
  );
}
