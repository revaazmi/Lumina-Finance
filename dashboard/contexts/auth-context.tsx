"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TelegramWebApp {
  initData: string;
}
interface WindowWithTelegram {
  Telegram?: { WebApp?: TelegramWebApp };
}
declare global {
  interface Window extends WindowWithTelegram {}
}

interface User {
  id: string;
  username: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (telegramId: string, pin: string) => Promise<boolean>;
  miniappLogin: () => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (telegramId: string, pin: string): Promise<boolean> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        console.error('NEXT_PUBLIC_API_URL is not set');
        return false;
      }

      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId, pin }),
      });

      if (res.ok) {
        const { token: newToken, user: newUser } = await res.json();
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const miniappLogin = async (): Promise<boolean> => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.initData) return false;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return false;

      const res = await fetch(`${apiUrl}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
      });

      if (res.ok) {
        const { token: newToken, user: newUser } = await res.json();
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, miniappLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}