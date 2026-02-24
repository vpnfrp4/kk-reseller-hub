import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Eye, EyeOff, ArrowRight } from "lucide-react";
import AccentParticles from "@/components/AccentParticles";

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
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -6, y: x * 6 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

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
        setSuccess("Password reset link sent! Check your email.");
      }
      setLoading(false);
      return;
    }

    if (isSignup) {
      const { error } = await signup(email, password, name);
      if (error) {
        setError(error);
      } else {
        setSuccess("Account created! Check your email to verify, then sign in.");
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
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20" style={{ background: "radial-gradient(circle, hsl(142 71% 45% / 0.15), transparent 70%)" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-15" style={{ background: "radial-gradient(circle, hsl(216 28% 20% / 0.3), transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10" style={{ background: "radial-gradient(circle, hsl(142 71% 45% / 0.12), transparent 70%)" }} />
      </div>

      {/* Subtle particle animation — green accent */}
      <AccentParticles />

      <div className="w-full max-w-md relative z-10">
        {/* Branding */}
        <div className="text-center mb-10 animate-fade-in">
          <div
            className="rounded-2xl mx-auto mb-5 flex items-center justify-center relative overflow-hidden bg-primary/10 border border-primary/20"
            style={{
              width: "72px",
              height: "72px",
              boxShadow: "0 0 40px hsl(142 71% 45% / 0.2)",
            }}
          >
            <Crown className="w-9 h-9 text-primary relative z-10" />
          </div>
          <h1 className="text-3xl font-bold text-foreground font-display tracking-tight">
            KK<span className="gold-text">Tech</span>
          </h1>
          <p className="text-[11px] uppercase tracking-[0.3em] gold-text font-semibold mt-1.5">
            Reseller Platform
          </p>
          <p className="text-muted-foreground text-sm mt-4">
            {isForgot
              ? "Enter your email to reset your password"
              : isSignup
              ? "Create your reseller account"
              : "Sign in to your reseller dashboard"}
          </p>
        </div>

        {/* Form Card */}
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="glass-card p-8 animate-fade-in relative overflow-hidden"
          style={{
            animationDelay: "0.1s",
            transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: tilt.x === 0 && tilt.y === 0 ? "transform 0.4s ease-out" : "transform 0.1s ease-out",
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary/40" />

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <div
                className="space-y-2 opacity-0 animate-[slideUpFade_0.4s_ease-out_forwards]"
                style={{ animationDelay: "0.15s" }}
              >
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-muted/50 border-border/50 focus:border-primary/50 transition-all duration-200 h-11"
                />
              </div>
            )}

            <div
              className="space-y-2 opacity-0 animate-[slideUpFade_0.4s_ease-out_forwards]"
              style={{ animationDelay: isSignup ? "0.25s" : "0.15s" }}
            >
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="reseller@kktech.shop"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/50 border-border/50 focus:border-primary/50 transition-all duration-200 h-11"
              />
            </div>

            {!isForgot && (
              <div
                className="space-y-2 opacity-0 animate-[slideUpFade_0.4s_ease-out_forwards]"
                style={{ animationDelay: isSignup ? "0.35s" : "0.25s" }}
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Password
                  </Label>
                  {!isSignup && (
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }}
                      className="text-xs text-primary/80 hover:text-primary transition-colors duration-200"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
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
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5">
                <p className="text-destructive text-sm text-center">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-success/10 border border-success/20 rounded-lg px-4 py-2.5">
                <p className="text-success text-sm text-center">{success}</p>
              </div>
            )}

            <div
              className="opacity-0 animate-[slideUpFade_0.4s_ease-out_forwards]"
              style={{ animationDelay: isSignup ? "0.45s" : isForgot ? "0.25s" : "0.35s" }}
            >
              <Button type="submit" className="w-full btn-glow font-semibold h-11 gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Please wait...
                  </>
                ) : (
                  <>
                    {isForgot ? "Send Reset Link" : isSignup ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            <div
              className="opacity-0 animate-[slideUpFade_0.4s_ease-out_forwards]"
              style={{ animationDelay: isSignup ? "0.55s" : isForgot ? "0.35s" : "0.45s" }}
            >
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">
                    {isForgot ? "or" : isSignup ? "already have an account?" : "new here?"}
                  </span>
                </div>
              </div>

              <p className="text-center text-sm mt-5">
                {isForgot ? (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(false); setError(""); setSuccess(""); }}
                    className="text-primary hover:text-primary/80 font-medium transition-colors duration-200"
                  >
                    Back to Sign In
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setIsSignup(!isSignup); setError(""); setSuccess(""); }}
                    className="text-primary hover:text-primary/80 font-medium transition-colors duration-200"
                  >
                    {isSignup ? "Sign In Instead" : "Create an Account"}
                  </button>
                )}
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          &copy; {new Date().getFullYear()} KKTech. All rights reserved.
        </p>
      </div>
    </div>
  );
}
