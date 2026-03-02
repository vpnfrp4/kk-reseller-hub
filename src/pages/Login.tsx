import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, ArrowRight, RefreshCw, Check, X } from "lucide-react";
import { t, useT } from "@/lib/i18n";
import {
  validateUsername,
  validatePassword,
  getPasswordStrength,
  generateCaptcha,
} from "@/lib/username-validation";

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

  // --- Username validation ---
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const handleNameChange = useCallback((val: string) => {
    setName(val);
    if (val.length > 0) {
      setUsernameError(validateUsername(val));
    } else {
      setUsernameError(null);
    }
  }, []);

  // --- Password strength ---
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordPolicyError = useMemo(() => validatePassword(password), [password]);

  // --- Math Captcha ---
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const captchaSolved = captchaInput.trim() !== "" && Number(captchaInput.trim()) === captcha.answer;

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  }, []);

  // Refresh captcha when switching to signup
  useEffect(() => {
    if (isSignup) refreshCaptcha();
  }, [isSignup, refreshCaptcha]);

  const canSubmitSignup =
    name.length > 0 &&
    !usernameError &&
    email.length > 0 &&
    !passwordPolicyError &&
    captchaSolved;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isForgot) {
      setLoading(true);
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
      // Final client-side checks
      const uErr = validateUsername(name);
      if (uErr) { setError(uErr); return; }
      const pErr = validatePassword(password);
      if (pErr) { setError(pErr); return; }
      if (!captchaSolved) { setError("Please solve the verification challenge."); return; }

      setLoading(true);
      const { error } = await signup(email, password, name);
      if (error) {
        setError(error);
        refreshCaptcha();
      } else {
        setSuccess(l(t.login.signupSuccess));
        setIsSignup(false);
      }
      setLoading(false);
    } else {
      setLoading(true);
      const { error } = await login(email, password);
      if (error) {
        setError(error);
      } else {
        navigate("/dashboard");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient radial backgrounds */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[550px] h-[550px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--ambient-blob-1), transparent 70%)", filter: "blur(100px)" }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, var(--ambient-blob-2), transparent 70%)", filter: "blur(100px)" }}
        />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Branding */}
        <div className="text-center mb-10 animate-fade-in">
          <div
            className="rounded-2xl mx-auto mb-5 flex items-center justify-center bg-secondary border border-border"
            style={{ width: "64px", height: "64px" }}
          >
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            KK<span className="text-primary">Tech</span>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-2">
            Reseller Platform
          </p>
          <p className="text-muted-foreground text-sm font-medium mt-4">
            {isForgot
              ? l(t.login.forgotSubtitle)
              : isSignup
              ? l(t.login.signupSubtitle)
              : l(t.login.subtitle)}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 animate-fade-in" style={{ animationDelay: "0.08s" }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ───── Username (signup only) ───── */}
            {isSignup && (
              <div className="space-y-2 opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: "0.1s" }}>
                <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {l(t.login.fullName)}
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. kk_reseller"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  maxLength={15}
                  className="bg-secondary border-border focus:border-primary/50 transition-colors h-12 text-base"
                />
                {/* Username rules hint */}
                <p className="text-[10px] text-muted-foreground/60">4–15 characters, letters, numbers & underscores only</p>
                {name.length > 0 && usernameError && (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <X className="w-3 h-3 shrink-0" />
                    <p className="text-[11px] font-medium">{usernameError}</p>
                  </div>
                )}
                {name.length >= 4 && !usernameError && (
                  <div className="flex items-center gap-1.5 text-success">
                    <Check className="w-3 h-3 shrink-0" />
                    <p className="text-[11px] font-medium">Username looks good!</p>
                  </div>
                )}
              </div>
            )}

            {/* ───── Email ───── */}
            <div className="space-y-2 opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: isSignup ? "0.18s" : "0.1s" }}>
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {l(t.login.emailAddress)}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="reseller@kktech.shop"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border focus:border-primary/50 transition-colors h-12 text-base"
              />
            </div>

            {/* ───── Password ───── */}
            {!isForgot && (
              <div className="space-y-2 opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: isSignup ? "0.26s" : "0.18s" }}>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {l(t.login.password)}
                  </Label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }}
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
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
                    minLength={isSignup ? 8 : 6}
                    className="bg-secondary border-border focus:border-primary/50 pr-12 transition-colors h-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* ───── Password Strength Meter (signup only) ───── */}
                {isSignup && password.length > 0 && (
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
                    <div className="flex items-center justify-between">
                      <p className={`text-[11px] font-semibold ${
                        strength.score <= 2 ? "text-destructive" :
                        strength.score <= 3 ? "text-warning" :
                        strength.score <= 4 ? "text-primary" : "text-success"
                      }`}>
                        {strength.label}
                      </p>
                    </div>
                    {/* Requirements checklist */}
                    <div className="space-y-1">
                      {[
                        { met: password.length >= 8, label: "8+ characters" },
                        { met: /[A-Z]/.test(password), label: "Uppercase letter" },
                        { met: /[a-z]/.test(password), label: "Lowercase letter" },
                        { met: /[0-9]/.test(password), label: "Number" },
                        { met: /[^A-Za-z0-9]/.test(password), label: "Special character" },
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
            )}

            {/* ───── Math Captcha (signup only) ───── */}
            {isSignup && !isForgot && (
              <div className="space-y-2 opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: "0.32s" }}>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Verification
                </Label>
                <div className="flex items-center gap-3">
                  {/* Challenge box */}
                  <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-4 py-2.5 select-none shrink-0">
                    <span className="text-lg font-mono font-bold text-foreground tracking-wider">
                      {captcha.question}
                    </span>
                    <span className="text-lg font-mono font-bold text-primary">=</span>
                    <span className="text-lg font-mono font-bold text-muted-foreground">?</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Answer"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    className="bg-secondary border-border focus:border-primary/50 h-12 text-base font-mono w-24"
                  />
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/20"
                    title="New challenge"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                {captchaInput.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {captchaSolved ? (
                      <>
                        <Check className="w-3 h-3 text-success" />
                        <span className="text-[11px] font-medium text-success">Verified!</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3 text-destructive" />
                        <span className="text-[11px] font-medium text-destructive">Incorrect answer</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ───── Error / Success Messages ───── */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                <p className="text-destructive text-sm font-medium text-center">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-success/10 border border-success/20 rounded-xl px-4 py-3">
                <p className="text-success text-sm font-medium text-center">{success}</p>
              </div>
            )}

            {/* ───── Submit Button ───── */}
            <div className="opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: isSignup ? "0.40s" : isForgot ? "0.18s" : "0.26s" }}>
              <Button
                type="submit"
                className="w-full btn-glow font-semibold h-12 gap-2 text-base"
                disabled={loading || (isSignup && !canSubmitSignup)}
              >
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

            {/* ───── Toggle Login/Signup ───── */}
            <div className="opacity-0 animate-[slideUpFade_0.35s_ease-out_forwards]" style={{ animationDelay: isSignup ? "0.48s" : isForgot ? "0.26s" : "0.34s" }}>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground font-medium">
                    {isForgot ? l(t.login.orDividerForgot) : isSignup ? l(t.login.orDividerSignup) : l(t.login.orDividerLogin)}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm mt-5">
                {isForgot ? (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(false); setError(""); setSuccess(""); }}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    {l(t.login.backToSignIn)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setIsSignup(!isSignup); setError(""); setSuccess(""); }}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    {isSignup ? l(t.login.signInInstead) : l(t.login.createAnAccount)}
                  </button>
                )}
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 font-medium animate-fade-in" style={{ animationDelay: "0.15s" }}>
          {new Date().getFullYear()} KKTech. All rights reserved.
        </p>
      </div>
    </div>
  );
}
