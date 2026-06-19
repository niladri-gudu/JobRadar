import { redirect } from 'next/navigation';
import { getSession } from '../../lib/auth-server';
import RegisterClient from './RegisterClient';

export default async function RegisterPage() {
  const session = await getSession();
  
  if (session) {
    redirect('/dashboard');
  }
  
  return <RegisterClient />;
}
