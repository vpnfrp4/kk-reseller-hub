import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye, EyeOff, ArrowRight, RefreshCw, Check, X,
  Mail, Lock, User,
} from "lucide-react";
import { t, useT } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  validateUsername,
  validatePassword,
  getPasswordStrength,
  generateCaptcha,
} from "@/lib/username-validation";
import ThemeToggle from "@/components/ThemeToggle";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";

/* ─── Shared animation configs ─── */
const pageSpring = { type: "spring" as const, stiffness: 300, damping: 30 };
const fadeSlide = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.25 },
};

/* ─── Form sub-components ─── */
function UsernameField({ name, onChange, error }: { name: string; onChange: (v: string) => void; error: string | null }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">Username</Label>
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
        <Input id="name" placeholder="e.g. kk_reseller" value={name} onChange={(e) => onChange(e.target.value)}
          required maxLength={15} className="auth-input pl-10" />
      </div>
      <p className="text-[10px] text-muted-foreground/60">4–15 chars, letters, numbers & underscores</p>
      {name.length > 0 && error && (
        <p className="text-[11px] font-medium text-destructive flex items-center gap-1"><X className="w-3 h-3" />{error}</p>
      )}
      {name.length >= 4 && !error && (
        <p className="text-[11px] font-medium text-success flex items-center gap-1"><Check className="w-3 h-3" />Username available</p>
      )}
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  if (!password) return null;
  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : "bg-muted/30"}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {[
          { met: password.length >= 8, label: "8+ characters" },
          { met: /[A-Z]/.test(password), label: "Uppercase" },
          { met: /[a-z]/.test(password), label: "Lowercase" },
          { met: /[0-9]/.test(password), label: "Number" },
          { met: /[^A-Za-z0-9]/.test(password), label: "Special char" },
        ].map((req) => (
          <div key={req.label} className="flex items-center gap-1.5">
            {req.met ? <Check className="w-2.5 h-2.5 text-success shrink-0" /> : <X className="w-2.5 h-2.5 text-muted-foreground/30 shrink-0" />}
            <span className={`text-[10px] ${req.met ? "text-success" : "text-muted-foreground/40"}`}>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MathCaptcha({ captcha, input, onInput, onRefresh, solved }: {
  captcha: { question: string; answer: number };
  input: string;
  onInput: (v: string) => void;
  onRefresh: () => void;
  solved: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Verification</Label>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-xl px-3.5 py-2 select-none shrink-0">
          <span className="text-base font-mono font-bold text-foreground tracking-wider">{captcha.question}</span>
          <span className="text-base font-mono font-bold text-primary">=</span>
          <span className="text-base font-mono font-bold text-muted-foreground">?</span>
        </div>
        <Input type="number" inputMode="numeric" placeholder="Answer" value={input}
          onChange={(e) => onInput(e.target.value)}
          className="auth-input font-mono w-20" />
        <button type="button" onClick={onRefresh}
          className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/30" title="New challenge">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {input.length > 0 && (
        <p className={`text-[11px] font-medium flex items-center gap-1 ${solved ? "text-success" : "text-destructive"}`}>
          {solved ? <><Check className="w-3 h-3" />Verified!</> : <><X className="w-3 h-3" />Incorrect</>}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN LOGIN PAGE
   ═══════════════════════════════════════════════════ */
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

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const handleNameChange = useCallback((val: string) => {
    setName(val);
    setUsernameError(val.length > 0 ? validateUsername(val) : null);
  }, []);

  const passwordPolicyError = useMemo(() => validatePassword(password), [password]);

  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const captchaSolved = captchaInput.trim() !== "" && Number(captchaInput.trim()) === captcha.answer;

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  }, []);

  useEffect(() => {
    if (isSignup) refreshCaptcha();
  }, [isSignup, refreshCaptcha]);

  const confirmPasswordError = isSignup && confirmPassword.length > 0 && password !== confirmPassword
    ? "Passwords do not match" : null;

  const canSubmitSignup =
    name.length > 0 && !usernameError && email.length > 0 &&
    !passwordPolicyError && !confirmPasswordError &&
    confirmPassword.length > 0 && captchaSolved;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (isForgot) {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setSuccess(l(t.login.resetSuccess));
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
      if (error) { setError(error); refreshCaptcha(); }
      else { setSuccess(l(t.login.signupSuccess)); setIsSignup(false); }
      setLoading(false);
    } else {
      setLoading(true);
      if (rememberMe) localStorage.setItem("kktech_remember", "true");
      else localStorage.removeItem("kktech_remember");
      const { error } = await login(email, password);
      if (error) setError(error);
      else navigate("/dashboard");
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignup(!isSignup);
    setIsForgot(false);
    setError(""); setSuccess(""); setConfirmPassword("");
  };

  return (
    <div className="min-h-[100dvh] flex bg-background">
      {/* ═══ LEFT — Brand Panel (desktop only) ═══ */}
      <div className="hidden lg:block lg:w-[480px] xl:w-[520px] shrink-0">
        <AuthBrandPanel />
      </div>

      {/* ═══ RIGHT — Form Panel ═══ */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden px-5 py-8">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-60"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.06), transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-40"
            style={{ background: "radial-gradient(circle, hsl(var(--primary-glow) / 0.04), transparent 70%)", filter: "blur(60px)" }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }} />
        </div>

        {/* Theme toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggle />
        </div>

        <motion.div
          className="w-full max-w-[440px] relative z-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={pageSpring}
        >
          {/* ═══ BRAND (mobile) ═══ */}
          <div className="text-center mb-8 lg:mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...pageSpring, delay: 0.1 }}
              className="relative inline-block"
            >
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl scale-150" />
              <img src="/lovable-uploads/kkremote-logo.png" alt="KKTech"
                className="relative w-14 h-14 rounded-2xl ring-1 ring-border/30 mx-auto mb-3 lg:hidden"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-display lg:hidden">
              KK<span className="text-primary">Tech</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1 lg:hidden">
              Digital Unlock Marketplace
            </p>
          </div>

          {/* ═══ GLASS FORM CARD ═══ */}
          <motion.div
            className="relative rounded-[var(--radius-card)] border border-border/30 bg-card/70 backdrop-blur-xl p-6 sm:p-8 overflow-hidden"
            style={{ boxShadow: "0 20px 60px -15px hsl(var(--primary) / 0.12), 0 0 0 1px hsl(var(--border) / 0.1)" }}
            layout
            transition={{ layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            {/* Corner glow */}
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/[0.06] blur-[50px] pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-primary-glow/[0.04] blur-[40px] pointer-events-none" />
            {/* Title */}
            <AnimatePresence mode="wait">
              <motion.div key={isForgot ? "forgot" : isSignup ? "signup" : "login"} className="mb-6" {...fadeSlide}>
                <h2 className="text-xl font-bold text-foreground tracking-tight font-display">
                  {isForgot ? "Reset Password" : isSignup ? "Create Account" : "Welcome Back"}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {isForgot ? l(t.login.forgotSubtitle) : isSignup ? "Join the marketplace and start reselling" : l(t.login.subtitle)}
                </p>
              </motion.div>
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username (signup) */}
              <AnimatePresence>
                {isSignup && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <UsernameField name={name} onChange={handleNameChange} error={usernameError} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required className="auth-input pl-10" />
                </div>
              </div>

              {/* Password */}
              {!isForgot && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                    {!isSignup && (
                      <button type="button" onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)} required
                      minLength={isSignup ? 8 : 6} className="auth-input pl-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {isSignup && <PasswordStrengthBar password={password} />}
                </div>
              )}

              {/* Confirm Password (signup) */}
              <AnimatePresence>
                {isSignup && !isForgot && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                        <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••"
                          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="auth-input pl-10 pr-10" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5">
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPasswordError && (
                        <p className="text-[11px] font-medium text-destructive flex items-center gap-1"><X className="w-3 h-3" />{confirmPasswordError}</p>
                      )}
                      {confirmPassword.length > 0 && !confirmPasswordError && (
                        <p className="text-[11px] font-medium text-success flex items-center gap-1"><Check className="w-3 h-3" />Passwords match</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Math Captcha (signup) */}
              <AnimatePresence>
                {isSignup && !isForgot && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <MathCaptcha captcha={captcha} input={captchaInput} onInput={setCaptchaInput} onRefresh={refreshCaptcha} solved={captchaSolved} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remember Me (login) */}
              {!isSignup && !isForgot && (
                <label htmlFor="remember-me" className="group flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" id="remember-me" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="peer sr-only" />
                    <div className="w-4 h-4 rounded border border-border bg-muted/30 transition-all peer-checked:bg-primary peer-checked:border-primary" />
                    <Check className="absolute w-2.5 h-2.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
                </label>
              )}

              {/* Error / Success */}
              <AnimatePresence>
                {error && (
                  <motion.div {...fadeSlide} className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5">
                    <p className="text-destructive text-sm font-medium text-center">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {success && (
                  <motion.div {...fadeSlide} className="bg-success/10 border border-success/20 rounded-xl px-4 py-2.5">
                    <p className="text-success text-sm font-medium text-center">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <Button type="submit"
                className="w-full h-12 gap-2 text-sm font-semibold rounded-xl relative overflow-hidden group/btn shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.35)] hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.45)] transition-shadow duration-300"
                disabled={loading || (isSignup && !canSubmitSignup)}
              >
                {/* Shimmer effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700" />
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />{l(t.login.pleaseWait)}</>
                ) : (
                  <>{isForgot ? l(t.login.sendResetLink) : isSignup ? "Create Account" : "Sign In"}<ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-200" /></>
                )}
              </Button>

              {/* Toggle mode */}
              <p className="text-center text-sm text-muted-foreground pt-1">
                {isForgot ? "Remembered it? " : isSignup ? "Already have an account? " : "New to KKTech? "}
                <button type="button"
                  onClick={isForgot ? () => { setIsForgot(false); setError(""); setSuccess(""); } : switchMode}
                  className="text-primary hover:text-primary/80 font-semibold transition-colors">
                  {isForgot ? "Back to Sign In" : isSignup ? "Sign In" : "Create Account"}
                </button>
              </p>
            </form>
          </motion.div>

          {/* Footer */}
          <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
            © {new Date().getFullYear()} KKTech · All rights reserved
          </p>
        </motion.div>
      </div>
    </div>
  );
}
