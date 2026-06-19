'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Terminal, Lock, Mail, User, Loader2, AlertCircle } from 'lucide-react';
import { authClient } from '../../lib/auth-client';

export default function RegisterClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: '/dashboard',
      });
      
      if (response?.error) {
        setError(response.error.message || 'Registration failed.');
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
            <span>JOBRADAR // REGISTER_CLIENT</span>
          </div>
          <p className="auth-subtitle">Initialize a new secure operator node</p>
        </div>

        {error && (
          <div className="alert-box">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Operator Name
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <User 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  color: 'var(--text-secondary)' 
                }} 
              />
              <input
                id="name"
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '34px' }}
                placeholder="Niladri Mohanta"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

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
              Secure Password
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
                placeholder="Minimum 8 characters"
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
                <span>Initializing Node...</span>
              </>
            ) : (
              <span>Deploy Operator Profile</span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already registered? </span>
          <Link href="/login" className="auth-link">
            Connect Session
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
