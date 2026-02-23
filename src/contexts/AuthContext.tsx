import { createContext, useContext, useState, ReactNode } from "react";
import { ResellerUser } from "@/types/reseller";
import { mockUser } from "@/data/mock-data";

interface AuthContextType {
  user: ResellerUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ResellerUser | null>(null);

  const login = (email: string, password: string) => {
    // Mock login - will be replaced with real auth
    if (email && password.length >= 4) {
      setUser(mockUser);
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
