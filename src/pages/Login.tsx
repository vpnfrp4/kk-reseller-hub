import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, RefreshCw, Check, X, Mail, Lock, User } from "lucide-react";
import kkLogo from "@/assets/kkremote-logo.png";
import { t, useT } from "@/lib/i18n";
import {
  validateUsername,
  validatePassword,
  getPasswordStrength,
  generateCaptcha,
} from "@/lib/username-validation";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("kktech_remember") === "true");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const confirmPasswordError = isSignup && confirmPassword.length > 0 && password !== confirmPassword
    ? "Passwords do not match"
    : null;

  const canSubmitSignup =
    name.length > 0 &&
    !usernameError &&
    email.length > 0 &&
    !passwordPolicyError &&
    !confirmPasswordError &&
    confirmPassword.length > 0 &&
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
      const uErr = validateUsername(name);
      if (uErr) { setError(uErr); return; }
      const pErr = validatePassword(password);
      if (pErr) { setError(pErr); return; }
      if (password !== confirmPassword) { setError("Passwords do not match"); return; }
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
      if (rememberMe) {
        localStorage.setItem("kktech_remember", "true");
      } else {
        localStorage.removeItem("kktech_remember");
      }
      const { error } = await login(email, password);
      if (error) {
        setError(error);
      } else {
        navigate("/dashboard");
      }
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignup(!isSignup);
    setIsForgot(false);
    setError("");
    setSuccess("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background">
      {/* ─── Brand Panel (left on desktop, top on mobile) ─── */}
      <div className="hidden lg:block lg:w-[480px] xl:w-[520px] shrink-0">
        <div className="sticky top-0 h-screen">
          <AuthBrandPanel />
        </div>
      </div>

      {/* Mobile brand header */}
      <div className="lg:hidden bg-[hsl(222,47%,5%)] px-6 py-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(217,91%,60%) 1px, transparent 1px), linear-gradient(90deg, hsl(217,91%,60%) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute top-[-30%] right-[-20%] w-[200px] h-[200px] rounded-full bg-primary opacity-[0.06] blur-[80px]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg" />
            <img src={kkLogo} alt="KKTech" className="relative w-10 h-10 rounded-xl" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              KK<span className="text-primary">Tech</span>
            </h1>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary/50">
              Reseller Platform
            </p>
          </div>
        </div>
        <p className="relative z-10 text-sm text-[hsl(215,20%,55%)] mt-4 font-medium">
          Digital Unlock Marketplace for Technicians
        </p>
      </div>

      {/* ─── Form Panel (right on desktop, below on mobile) ─── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-hidden">
        {/* Subtle ambient blobs */}
        <div className="absolute top-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(217 91% 60% / 0.04), transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(220 29% 88% / 0.06), transparent 70%)", filter: "blur(80px)" }} />

        <div className="w-full max-w-[440px] relative z-10">
          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              {isForgot ? "Reset Password" : isSignup ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {isForgot
                ? l(t.login.forgotSubtitle)
                : isSignup
                ? "Join KKTech and start reselling digital services"
                : l(t.login.subtitle)}
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ───── Username (signup only) ───── */}
              {isSignup && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="name"
                      placeholder="e.g. kk_reseller"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      maxLength={15}
                      className="bg-secondary/50 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all h-12 text-base pl-10"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50">4–15 characters, letters, numbers & underscores only</p>
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
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="reseller@kktech.shop"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-secondary/50 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all h-12 text-base pl-10"
                  />
                </div>
              </div>

              {/* ───── Password ───── */}
              {!isForgot && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Password
                    </Label>
                    {!isSignup && (
                      <button
                        type="button"
                        onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={isSignup ? 8 : 6}
                      className="bg-secondary/50 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 pr-12 transition-all h-12 text-base pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter (signup only) */}
                  {isSignup && password.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
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
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {[
                          { met: password.length >= 8, label: "8+ characters" },
                          { met: /[A-Z]/.test(password), label: "Uppercase" },
                          { met: /[a-z]/.test(password), label: "Lowercase" },
                          { met: /[0-9]/.test(password), label: "Number" },
                          { met: /[^A-Za-z0-9]/.test(password), label: "Special char" },
                        ].map((req) => (
                          <div key={req.label} className="flex items-center gap-1.5">
                            {req.met ? (
                              <Check className="w-3 h-3 text-success shrink-0" />
                            ) : (
                              <X className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                            )}
                            <span className={`text-[10px] font-medium ${req.met ? "text-success" : "text-muted-foreground/50"}`}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ───── Confirm Password (signup only) ───── */}
              {isSignup && !isForgot && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-secondary/50 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 pr-12 transition-all h-12 text-base pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <X className="w-3 h-3 shrink-0" />
                      <p className="text-[11px] font-medium">{confirmPasswordError}</p>
                    </div>
                  )}
                  {confirmPassword.length > 0 && !confirmPasswordError && (
                    <div className="flex items-center gap-1.5 text-success">
                      <Check className="w-3 h-3 shrink-0" />
                      <p className="text-[11px] font-medium">Passwords match</p>
                    </div>
                  )}
                </div>
              )}

              {/* ───── Math Captcha (signup only) ───── */}
              {isSignup && !isForgot && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Verification
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-secondary/60 border border-border/40 rounded-xl px-4 py-2.5 select-none shrink-0">
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
                      className="bg-secondary/50 border-border/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 h-12 text-base font-mono w-24"
                    />
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="text-muted-foreground hover:text-foreground transition-colors p-2.5 rounded-xl hover:bg-muted/20"
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

              {/* ───── Remember Me (login only) ───── */}
              {!isSignup && !isForgot && (
                <label
                  htmlFor="remember-me"
                  className="group flex items-center gap-2.5 cursor-pointer select-none py-0.5"
                >
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-[18px] h-[18px] rounded-[5px] border border-border bg-secondary/50 transition-all duration-200 peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 group-hover:border-muted-foreground/50" />
                    <Check className="absolute w-3 h-3 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity duration-150 pointer-events-none" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Remember me
                  </span>
                </label>
              )}

              {/* ───── Error / Success ───── */}
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
              <Button
                type="submit"
                className="w-full h-12 gap-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:shadow-[0_0_24px_hsl(var(--primary)/0.3)] transition-all duration-300"
                disabled={loading || (isSignup && !canSubmitSignup)}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    {l(t.login.pleaseWait)}
                  </>
                ) : (
                  <>
                    {isForgot ? l(t.login.sendResetLink) : isSignup ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              {/* ───── Toggle ───── */}
              <div className="relative pt-2">
                <div className="absolute inset-0 flex items-center pt-2">
                  <div className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-sm pt-2">
                  <span className="bg-card/80 px-4 text-muted-foreground text-xs font-medium">
                    {isForgot ? "Remembered it?" : isSignup ? "Already have an account?" : "New to KKTech?"}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm">
                {isForgot ? (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(false); setError(""); setSuccess(""); }}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Back to Sign In
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    {isSignup ? "Sign in instead" : "Create reseller account"}
                  </button>
                )}
              </p>
            </form>
          </div>

          {/* Social proof */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-muted-foreground/50 font-medium">
              Trusted by technicians across Myanmar & Southeast Asia
            </p>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/30 mt-4 font-medium">
            © {new Date().getFullYear()} KKTech. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
