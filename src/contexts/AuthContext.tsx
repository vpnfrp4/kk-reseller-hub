import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { notifyEvent } from "@/lib/notifications";
import { getNotificationPrefs } from "@/lib/notifications";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  balance: number;
  total_spent: number;
  total_orders: number;
  avatar_url: string | null;
  tier: string;
  designation: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          setTimeout(() => fetchProfile(currentUser.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Realtime profile updates (e.g. when admin approves a top-up)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-balance')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as Profile;
          setProfile((prev) => {
            if (!prev) return newData;
            // Balance increase detected — show toast only (notification is created server-side by approve-topup)
            if (newData.balance > prev.balance) {
              const added = newData.balance - prev.balance;
              notifyEvent(
                "Top-Up Approved",
                `${added.toLocaleString()} MMK has been added to your wallet.`,
                "success",
                "topupApproved"
              );
              // Do NOT insert notification here — the approve-topup edge function already does it
            }
            // Detect low balance after a purchase — toast only, DB insert handled by use-realtime-notifications
            if (newData.balance < prev.balance) {
              const prefs = getNotificationPrefs();
              if (prefs.lowBalance && newData.balance > 0 && newData.balance <= prefs.lowBalanceThreshold) {
                notifyEvent(
                  "Low Balance",
                  `Your balance is ${newData.balance.toLocaleString()} MMK. Consider topping up.`,
                  "error",
                  "lowBalance"
                );
              }
            }
            return { ...prev, ...newData };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signup = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    return { error: error?.message || null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, isAuthenticated: !!user, loading, login, signup, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
