import { redirect } from 'next/navigation';
import { getSession } from '../../lib/auth-server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return <DashboardClient user={session.user} />;
}
