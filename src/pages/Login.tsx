import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Eye, EyeOff } from "lucide-react";

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
      {/* Background orbs */}
      <div className="fixed top-1/4 left-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center btn-glow">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-display">KKTech Reseller</h1>
          <p className="text-muted-foreground text-sm mt-2">
            {isForgot ? "Enter your email to reset your password" : isSignup ? "Create your reseller account" : "Sign in to your reseller dashboard"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-muted-foreground">Full Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-muted/50 border-border focus:border-primary transition-colors duration-200"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="reseller@kktech.shop"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border focus:border-primary transition-colors duration-200"
            />
          </div>

          {!isForgot && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError(""); setSuccess(""); }}
                    className="text-xs text-primary hover:underline"
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
                  className="bg-muted/50 border-border focus:border-primary pr-10 transition-colors duration-200"
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

          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          {success && <p className="text-success text-sm text-center">{success}</p>}

          <Button type="submit" className="w-full btn-glow font-semibold" disabled={loading}>
            {loading ? "Please wait..." : isForgot ? "Send Reset Link" : isSignup ? "Create Account" : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isForgot ? (
              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(""); setSuccess(""); }}
                className="text-primary hover:underline"
              >
                Back to Sign In
              </button>
            ) : (
              <>
                {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignup(!isSignup); setError(""); setSuccess(""); }}
                  className="text-primary hover:underline font-medium"
                >
                  {isSignup ? "Sign In" : "Sign Up"}
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
