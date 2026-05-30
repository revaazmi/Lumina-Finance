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
  oneTapLogin: (oneTapToken: string) => Promise<string | null>;
  miniappLogin: () => Promise<string | null>;
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

  const oneTapLogin = async (oneTapToken: string): Promise<string | null> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return null;

      const res = await fetch(`${apiUrl}/api/auth/bot-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: oneTapToken }),
      });

      if (res.ok) {
        const { token: newToken, user: newUser } = await res.json();
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return newToken;
      }
      return null;
    } catch {
      return null;
    }
  };

  const miniappLogin = async (): Promise<string | null> => {
    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) return null;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) return null;

      const res = await fetch(`${apiUrl}/api/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      });

      if (res.ok) {
        const { token: newToken, user: newUser } = await res.json();
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        return newToken;
      }
      return null;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, oneTapLogin, miniappLogin, logout, loading }}>
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