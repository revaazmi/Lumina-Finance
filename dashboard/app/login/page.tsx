"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const [telegramId, setTelegramId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

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

        <p className="text-xs text-gray-500 mt-6 text-center">
          Don't have a PIN? Set it via Telegram bot command: /setpin &lt;your-pin&gt;
        </p>
      </div>
    </div>
  );
}