interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Mock Product Hunt startup directory crawler
 */
export async function crawlProductHuntCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[PH Crawler] Discovering companies on Product Hunt...');
  
  // Return a list of modern, real startups that are popular on Product Hunt
  const mockStartups = [
    { name: 'Linear', website: 'https://linear.app', industry: 'Software, Productivity' },
    { name: 'Vercel', website: 'https://vercel.com', industry: 'Web Development, Hosting' },
    { name: 'Supabase', website: 'https://supabase.com', industry: 'Database, Backend' },
    { name: 'Neon', website: 'https://neon.tech', industry: 'Database, Serverless' },
    { name: 'Resend', website: 'https://resend.com', industry: 'Email Infrastructure' },
    { name: 'Clerk', website: 'https://clerk.com', industry: 'Authentication' },
    { name: 'Railway', website: 'https://railway.app', industry: 'Cloud Hosting' },
    { name: 'PlanetScale', website: 'https://planetscale.com', industry: 'Database' },
    { name: 'Render', website: 'https://render.com', industry: 'Cloud Hosting' },
    { name: 'PostHog', website: 'https://posthog.com', industry: 'Product Analytics' },
    { name: 'Dub.co', website: 'https://dub.co', industry: 'Link Management' },
    { name: 'Cal.com', website: 'https://cal.com', industry: 'Scheduling' },
    { name: 'Inngest', website: 'https://inngest.com', industry: 'Event-driven queues' },
    { name: 'Trigger.dev', website: 'https://trigger.dev', industry: 'Background Tasks' },
    { name: 'Loops', website: 'https://loops.so', industry: 'Email Marketing' },
    { name: 'SST', website: 'https://sst.dev', industry: 'Serverless Deployment' },
    { name: 'Axiom', website: 'https://axiom.co', industry: 'Log Management' },
    { name: 'Baselime', website: 'https://baselime.io', industry: 'Observability' },
    { name: 'Svix', website: 'https://svix.com', industry: 'Webhooks' },
    { name: 'Zeplo', website: 'https://zeplo.io', industry: 'Background Tasks' },
  ];

  return mockStartups.map(s => ({
    name: s.name,
    website: s.website,
    industry: s.industry,
    source: 'PRODUCT_HUNT'
  }));
}
