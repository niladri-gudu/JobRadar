import * as cheerio from 'cheerio';

interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Discovers companies listed on Remote.co
 */
export async function crawlRemoteCoCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[Remote.co Crawler] Starting company discovery...');
  const companies: DiscoveredCompany[] = [];
  
  // Seed list of well-known remote-first companies featured on Remote.co
  const seedCompanies: DiscoveredCompany[] = [
    { name: 'Automattic', website: 'https://automattic.com', industry: 'Web Development, Publishing', source: 'REMOTE_CO' },
    { name: 'GitLab', website: 'https://gitlab.com', industry: 'Software, DevOps', source: 'REMOTE_CO' },
    { name: 'Buffer', website: 'https://buffer.com', industry: 'Social Media Management', source: 'REMOTE_CO' },
    { name: 'Zapier', website: 'https://zapier.com', industry: 'Workflow Automation', source: 'REMOTE_CO' },
    { name: 'Doist', website: 'https://doist.com', industry: 'Productivity, Software', source: 'REMOTE_CO' },
    { name: 'Hotjar', website: 'https://hotjar.com', industry: 'Product Analytics', source: 'REMOTE_CO' },
    { name: 'Elastic', website: 'https://elastic.co', industry: 'Search, Logging, Security', source: 'REMOTE_CO' },
    { name: 'Hubstaff', website: 'https://hubstaff.com', industry: 'Time Tracking, PM', source: 'REMOTE_CO' },
    { name: 'Toggl', website: 'https://toggl.com', industry: 'Time Tracking, Productivity', source: 'REMOTE_CO' },
    { name: 'Articulate', website: 'https://articulate.com', industry: 'E-Learning, Software', source: 'REMOTE_CO' },
    { name: 'Ghost', website: 'https://ghost.org', industry: 'Publishing, Open Source', source: 'REMOTE_CO' },
    { name: '10up', website: 'https://10up.com', industry: 'Web Development, Agency', source: 'REMOTE_CO' },
    { name: 'Modern Tribe', website: 'https://tri.be', industry: 'Design, Web Development', source: 'REMOTE_CO' },
    { name: 'Close', website: 'https://close.com', industry: 'Sales Software, CRM', source: 'REMOTE_CO' },
    { name: 'InVision', website: 'https://invisionapp.com', industry: 'Design, Collaboration', source: 'REMOTE_CO' },
  ];

  try {
    const url = 'https://remote.co/remote-companies/';
    console.log(`[Remote.co Crawler] Fetching ${url}...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remote.co lists companies inside card/link lists
    // Example: a elements within .card or list groupings
    const crawledList: DiscoveredCompany[] = [];
    
    $('.card a, .company-card a, a[href^="https://remote.co/company/"]').each((_, el) => {
      const name = $(el).text().replace(/\n/g, '').trim();
      const href = $(el).attr('href') || '';
      
      if (name && href && !name.toLowerCase().includes('browse') && !name.toLowerCase().includes('remote.co')) {
        // Extract company slug and guess website
        const match = href.match(/remote\.co\/company\/([^/]+)/);
        if (match && match[1]) {
          const slug = match[1];
          crawledList.push({
            name,
            website: `https://${slug}.com`,
            industry: 'Technology, Remote-first',
            source: 'REMOTE_CO'
          });
        }
      }
    });

    if (crawledList.length > 0) {
      console.log(`[Remote.co Crawler] Discovered ${crawledList.length} companies from scraping.`);
      // Merge unique ones
      const seen = new Set<string>();
      const merged = [...crawledList, ...seedCompanies];
      const unique: DiscoveredCompany[] = [];
      for (const comp of merged) {
        const domain = comp.website.replace(/https?:\/\/(www\.)?/, '').toLowerCase();
        if (!seen.has(domain)) {
          seen.add(domain);
          unique.push(comp);
        }
      }
      return unique;
    }
  } catch (err: any) {
    console.error(`[Remote.co Crawler] Scraping failed, falling back to seed list. Error:`, err.message || err);
  }

  console.log(`[Remote.co Crawler] Returning ${seedCompanies.length} seed companies.`);
  return seedCompanies;
}
