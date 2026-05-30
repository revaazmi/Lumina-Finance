"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const [telegramId, setTelegramId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const { login, miniappLogin, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (token) router.push('/');
  }, [token, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(telegramId.trim(), pin);
    if (success) {
      router.push('/');
    } else {
      setError('Invalid Telegram ID or PIN');
    }
    setIsLoading(false);
  };

  const handleTelegramLogin = async () => {
    setTgLoading(true);
    setError('');
    const ok = await miniappLogin();
    if (ok) {
      router.push('/');
    } else {
      setError('Telegram login failed. Try entering PIN manually.');
    }
    setTgLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md border-4 border-black bg-white p-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-6 text-black">
          Lumina Finance
        </h1>
        <p className="text-sm text-gray-600 mb-8">Enter your credentials to access your dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border-4 border-black p-4 text-black font-bold">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="telegramId" className="block text-sm font-bold mb-2 text-black">
              Telegram ID
            </label>
            <input
              id="telegramId"
              type="text"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              className="w-full border-4 border-black p-3 font-mono focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your Telegram user ID"
              required
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-bold mb-2 text-black">
              PIN (6+ digits)
            </label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border-4 border-black p-3 font-mono focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your PIN"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent-green text-black border-4 border-black font-bold py-3 px-4 hover:bg-accent-pink transition-colors disabled:opacity-50"
          >
            {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <div className="relative border-t-2 border-black my-1">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-500">
              or
            </span>
          </div>
          <button
            onClick={handleTelegramLogin}
            disabled={tgLoading}
            className="w-full bg-accent-cyan text-black border-4 border-black font-bold py-3 px-4 hover:bg-accent-pink transition-colors disabled:opacity-50"
          >
            {tgLoading ? 'VERIFYING...' : 'LOGIN WITH TELEGRAM'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Don&apos;t have a PIN? Chat /setpin to the bot
        </p>
      </div>
    </div>
  );
}