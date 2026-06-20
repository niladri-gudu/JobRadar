import { getSession } from '../lib/auth-server';
import LandingClient from './LandingClient';

export default async function Home() {
  const session = await getSession();
  
  return <LandingClient session={session} />;
}

