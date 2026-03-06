import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye, EyeOff, ArrowRight, RefreshCw, Check, X,
  Mail, Lock, User, Zap, BarChart3, Wallet, Send,
  Server, ShieldCheck, Clock,
} from "lucide-react";
import kkLogo from "@/assets/kkremote-logo.png";
import { t, useT } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  validateUsername,
  validatePassword,
  getPasswordStrength,
  generateCaptcha,
} from "@/lib/username-validation";
import ThemeToggle from "@/components/ThemeToggle";

/* ── Feature items ── */
const FEATURES = [
  { icon: Zap, label: "Instant Delivery" },
  { icon: BarChart3, label: "Real-time Tracking" },
  { icon: Wallet, label: "Secure Wallet" },
  { icon: Send, label: "Telegram Bot" },
];

const STATS = [
  { value: "200+", label: "Services" },
  { value: "50K+", label: "Orders" },
  { value: "99.9%", label: "Uptime" },
];

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
    <div className="min-h-[100dvh] flex items-center justify-center bg-background relative overflow-hidden px-4 py-8 sm:py-12">
      {/* ── Minimal background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, hsl(174 62% 41% / 0.04), transparent 70%)", filter: "blur(100px)" }} />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        className="w-full max-w-[480px] relative z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ═══ BRAND HEADER ═══ */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative">
              <img src={kkLogo} alt="KKTech" className="relative w-12 h-12 rounded-xl" />
            </div>
          </motion.div>

          <motion.h1
            className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            KK<span className="text-primary">Tech</span>
          </motion.h1>

          <motion.p
            className="text-sm text-muted-foreground mt-1.5 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            Digital Unlock Marketplace for Technicians
          </motion.p>
        </div>

        {/* ═══ TRUST STATS ═══ */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center py-3 px-2 rounded-xl bg-card border border-border/60">
              <p className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-foreground tracking-tight">{stat.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ═══ FORM CARD ═══ */}
        <motion.div
          className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.1)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="p-6 sm:p-8">
            {/* Form title */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isForgot ? "forgot" : isSignup ? "signup" : "login"}
                className="mb-6"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  {isForgot ? "Reset Password" : isSignup ? "Create Account" : "Sign In"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isForgot
                    ? l(t.login.forgotSubtitle)
                    : isSignup
                    ? "Join the platform and start reselling"
                    : l(t.login.subtitle)}
                </p>
              </motion.div>
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ── Username (signup) ── */}
              {isSignup && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.05 }}
                  className="space-y-1.5"
                >
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input
                      id="name"
                      placeholder="e.g. kk_reseller"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      maxLength={15}
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 h-11 pl-10"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">4–15 characters, letters, numbers & underscores</p>
                  {name.length > 0 && usernameError && (
                    <div className="flex items-center gap-1.5 text-destructive">
                      <X className="w-3 h-3 shrink-0" />
                      <p className="text-[11px] font-medium">{usernameError}</p>
                    </div>
                  )}
                  {name.length >= 4 && !usernameError && (
                    <div className="flex items-center gap-1.5 text-success">
                      <Check className="w-3 h-3 shrink-0" />
                      <p className="text-[11px] font-medium">Username available</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Email ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: isSignup ? 0.1 : 0.05 }}
                className="space-y-1.5"
              >
                <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 h-11 pl-10"
                  />
                </div>
              </motion.div>

              {/* ── Password ── */}
              {!isForgot && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: isSignup ? 0.15 : 0.1 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                      Password
                    </Label>
                    {!isSignup && (
                      <button
                        type="button"
                        onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={isSignup ? 8 : 6}
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 pr-10 h-11 pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength (signup) */}
                  <AnimatePresence>
                    {isSignup && password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 pt-1 overflow-hidden"
                      >
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                                i <= strength.score ? strength.color : "bg-muted/30"
                              }`}
                            />
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
                              {req.met ? (
                                <Check className="w-2.5 h-2.5 text-success shrink-0" />
                              ) : (
                                <X className="w-2.5 h-2.5 text-muted-foreground/30 shrink-0" />
                              )}
                              <span className={`text-[10px] ${req.met ? "text-success" : "text-muted-foreground/40"}`}>
                                {req.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* ── Confirm Password (signup) ── */}
              {isSignup && !isForgot && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.2 }}
                  className="space-y-1.5"
                >
                  <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 pr-10 h-11 pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
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
                </motion.div>
              )}

              {/* ── Math Captcha (signup) ── */}
              {isSignup && !isForgot && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.25 }}
                  className="space-y-1.5"
                >
                  <Label className="text-xs font-medium text-muted-foreground">
                    Verification
                  </Label>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-xl px-3.5 py-2 select-none shrink-0">
                      <span className="text-base font-mono font-bold text-foreground tracking-wider">
                        {captcha.question}
                      </span>
                      <span className="text-base font-mono font-bold text-primary">=</span>
                      <span className="text-base font-mono font-bold text-muted-foreground">?</span>
                    </div>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Answer"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                      className="bg-muted/30 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/10 h-11 font-mono w-20"
                    />
                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/30"
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
                          <span className="text-[11px] font-medium text-destructive">Incorrect</span>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Remember Me (login) ── */}
              {!isSignup && !isForgot && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                >
                  <label htmlFor="remember-me" className="group flex items-center gap-2.5 cursor-pointer select-none">
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        id="remember-me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-[16px] h-[16px] rounded-[4px] border border-border bg-muted/30 transition-all peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 group-hover:border-muted-foreground/50" />
                      <Check className="absolute w-2.5 h-2.5 text-primary-foreground opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      Remember me
                    </span>
                  </label>
                </motion.div>
              )}

              {/* ── Error / Success ── */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2.5"
                  >
                    <p className="text-destructive text-sm font-medium text-center">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="bg-success/10 border border-success/20 rounded-xl px-4 py-2.5"
                  >
                    <p className="text-success text-sm font-medium text-center">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Submit Button ── */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: isSignup ? 0.3 : 0.2 }}
              >
                <Button
                  type="submit"
                  className="w-full h-11 gap-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-primary to-[hsl(var(--primary-glow))] hover:shadow-[0_0_24px_hsl(var(--primary)/0.3)] transition-all duration-300"
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
              </motion.div>

              {/* ── Toggle ── */}
              <div className="pt-2 text-center">
                <span className="text-sm text-muted-foreground">
                  {isForgot ? "Remembered it? " : isSignup ? "Already have an account? " : "New to KKTech? "}
                </span>
                {isForgot ? (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(false); setError(""); setSuccess(""); }}
                    className="text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Back to Sign In
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={switchMode}
                    className="text-sm text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    {isSignup ? "Sign In" : "Create Account"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>

        {/* ═══ FEATURES GRID ═══ */}
        <motion.div
          className="grid grid-cols-4 gap-2 mt-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          {FEATURES.map((feat) => (
            <div key={feat.label} className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-card/40 border border-border/30 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                <feat.icon className={`w-4 h-4 ${feat.color}`} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">{feat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* ═══ FOOTER ═══ */}
        <motion.div
          className="mt-8 text-center space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <p className="text-[11px] text-muted-foreground/50 font-medium">
            Trusted by technicians across Myanmar & Southeast Asia
          </p>
          <p className="text-[10px] text-muted-foreground/30 font-medium">
            © {new Date().getFullYear()} KKTech. All rights reserved.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
