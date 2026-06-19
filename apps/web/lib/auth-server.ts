import { headers } from 'next/headers';

export interface User {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: boolean;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  session: Session;
}

export async function getSession(): Promise<AuthSession | null> {
  const nextHeaders = await headers();
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/get-session`, {
      headers: {
        cookie: nextHeaders.get('cookie') || '',
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || !data.user) return null;
    return data as AuthSession;
  } catch (e) {
    return null;
  }
}
