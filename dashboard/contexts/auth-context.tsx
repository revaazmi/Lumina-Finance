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

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (telegramId: string, pin: string) => Promise<boolean>;
  miniappLogin: () => Promise<AuthResult>;
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

  function getInitDataFromHash(): string {
    try {
      const hash = window.location.hash;
      if (!hash) return '';
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      return params.get('tgWebAppData') || '';
    } catch {
      return '';
    }
  }

  const miniappLogin = async (): Promise<AuthResult> => {
    try {
      let tg = window.Telegram?.WebApp;
      let initData = tg?.initData || '';

      // Fallback: read from URL hash (Telegram injects #tgWebAppData=...)
      if (!initData) {
        initData = getInitDataFromHash();
      }

      if (!initData) {
        const debug: string[] = [];
        debug.push(`URL: ${window.location.href}`);
        debug.push(`Has Telegram: ${'Telegram' in window}`);
        debug.push(`Has WebApp: ${!!window.Telegram?.WebApp}`);
        debug.push(`Hash: ${window.location.hash || '(none)'}`);
        return { ok: false, error: `Not in Telegram Mini App.\n${debug.join('\n')}` };
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        return { ok: false, error: 'Server URL not configured (NEXT_PUBLIC_API_URL).' };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${apiUrl}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const { token: newToken, user: newUser } = await res.json();
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return { ok: true };
      }

      const text = await res.text();
      return { ok: false, error: `Server error (${res.status}): ${text}` };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { ok: false, error: 'Request timed out — server unreachable.' };
      }
      return { ok: false, error: err?.message || 'Unknown error' };
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