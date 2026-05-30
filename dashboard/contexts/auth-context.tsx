"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

declare global {
  interface Window {
    Telegram?: { WebApp?: { initData: string } };
  }
}

interface User {
  id: string;
  username: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (telegramId: string, pin: string) => Promise<boolean>;
  miniappLogin: () => Promise<string | false>;
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

  const miniappLogin = async (): Promise<string | false> => {
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg) {
        console.warn('[miniappLogin] window.Telegram.WebApp is undefined — not opened from Mini App');
        return false;
      }
      if (!tg.initData) {
        console.error('[miniappLogin] initData is empty — check Mini App domain in @BotFather');
        return false;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        console.error('[miniappLogin] NEXT_PUBLIC_API_URL is not set');
        return false;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${apiUrl}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: tg.initData }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const { token: newToken, user: newUser } = await res.json();
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return newToken;
      }

      const text = await res.text();
      console.error(`[miniappLogin] API error ${res.status}: ${text}`);
      return false;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error('[miniappLogin] Request timed out after 5s');
      } else {
        console.error('[miniappLogin]', err?.message || err);
      }
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