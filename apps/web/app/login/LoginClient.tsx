'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Terminal, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await authClient.signIn.email({
        email,
        password,
        callbackURL: '/dashboard',
      });
      
      if (response?.error) {
        setError(response.error.message || 'Invalid credentials.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-canvas">
      <div className="w-full max-w-[380px] bg-surface border border-border-subtle rounded-[6px] p-6">
        <div className="mb-6">
          <div className="font-mono text-base font-semibold mb-1 text-ink-primary flex items-center gap-2">
            <Terminal size={18} className="text-accent-system" />
            <span>JOBRADAR // SIGN_IN</span>
          </div>
          <p className="text-ink-secondary text-xs">Establish terminal session credentials</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-[6px] p-3 mb-4 text-[#F87171] text-xs flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 flex flex-col gap-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-ink-secondary" htmlFor="email">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail 
                size={14} 
                className="absolute left-3 text-ink-secondary"
              />
              <input
                id="email"
                type="email"
                className="w-full bg-canvas border border-border-subtle rounded-[6px] py-2 px-3 pl-9 text-ink-primary focus:outline-none focus:border-accent-system transition-colors duration-150"
                placeholder="developer@jobradar.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-1.5">
            <label className="font-mono text-[11px] uppercase tracking-wider text-ink-secondary" htmlFor="password">
              Access Token / Password
            </label>
            <div className="relative flex items-center">
              <Lock 
                size={14} 
                className="absolute left-3 text-ink-secondary"
              />
              <input
                id="password"
                type="password"
                className="w-full bg-canvas border border-border-subtle rounded-[6px] py-2 px-3 pl-9 text-ink-primary focus:outline-none focus:border-accent-system transition-colors duration-150"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" className="font-mono text-xs font-medium uppercase tracking-wider bg-canvas border border-border-subtle hover:enabled:bg-surface-hover hover:enabled:border-ink-secondary disabled:opacity-50 disabled:cursor-not-allowed text-ink-primary py-2.5 px-4 rounded-[6px] flex items-center justify-center gap-2 w-full mt-2 transition-all duration-150" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Authorizing...</span>
              </>
            ) : (
              <span>Execute Session Connect</span>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-ink-secondary">
          <span>New node deployment? </span>
          <Link href="/register" className="text-accent-system font-mono underline underline-offset-4 hover:text-ink-primary">
            Register Client
          </Link>
        </div>
      </div>
    </div>
  );
}
