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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">
            <Terminal size={18} className="text-accent-system" style={{ color: 'var(--accent-system)' }} />
            <span>JOBRADAR // SIGN_IN</span>
          </div>
          <p className="auth-subtitle">Establish terminal session credentials</p>
        </div>

        {error && (
          <div className="alert-box">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  color: 'var(--text-secondary)' 
                }} 
              />
              <input
                id="email"
                type="email"
                className="form-input"
                style={{ width: '100%', paddingLeft: '34px' }}
                placeholder="developer@jobradar.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" htmlFor="password">
              Access Token / Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  color: 'var(--text-secondary)' 
                }} 
              />
              <input
                id="password"
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '34px' }}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Authorizing...</span>
              </>
            ) : (
              <span>Execute Session Connect</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>New node deployment? </span>
          <Link href="/register" className="auth-link">
            Register Client
          </Link>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
