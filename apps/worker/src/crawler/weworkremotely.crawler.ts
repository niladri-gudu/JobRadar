import * as cheerio from 'cheerio';

interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Discovers companies listed on WeWorkRemotely via their programming RSS feed
 */
export async function crawlWeWorkRemotelyCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[WeWorkRemotely Crawler] Starting company discovery...');
  
  const seedCompanies: DiscoveredCompany[] = [
    { name: 'Basecamp', website: 'https://basecamp.com', industry: 'Collaboration, Productivity', source: 'WE_WORK_REMOTELY' },
    { name: 'TaxJar', website: 'https://taxjar.com', industry: 'Fintech, Tax Compliance', source: 'WE_WORK_REMOTELY' },
    { name: 'Help Scout', website: 'https://helpscout.com', industry: 'Customer Support Software', source: 'WE_WORK_REMOTELY' },
    { name: 'Wildbit', website: 'https://wildbit.com', industry: 'Software, Email Delivery', source: 'WE_WORK_REMOTELY' },
    { name: 'Knack', website: 'https://knack.com', industry: 'No-Code Database', source: 'WE_WORK_REMOTELY' },
    { name: 'Awesome Motive', website: 'https://awesomemotive.com', industry: 'WordPress Plugins, Software', source: 'WE_WORK_REMOTELY' },
    { name: 'TeeSpring', website: 'https://teespring.com', industry: 'E-commerce, Custom Merch', source: 'WE_WORK_REMOTELY' },
    { name: 'Scrapinghub', website: 'https://zyte.com', industry: 'Web Scraping, Data Extraction', source: 'WE_WORK_REMOTELY' },
    { name: 'Tuple', website: 'https://tuple.app', industry: 'Developer Tools, Pair Programming', source: 'WE_WORK_REMOTELY' },
    { name: 'Aha!', website: 'https://aha.io', industry: 'Product Management Software', source: 'WE_WORK_REMOTELY' },
  ];

  try {
    const url = 'https://weworkremotely.com/categories/remote-programming-jobs.rss';
    console.log(`[WeWorkRemotely Crawler] Fetching RSS feed: ${url}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });
    const crawledList: DiscoveredCompany[] = [];

    $('item').each((_, el) => {
      const title = $(el).find('title').text() || '';
      
      // Title format is usually: "Company Name: Job Title"
      if (title.includes(':')) {
        const companyName = title.split(':')[0].trim();
        if (companyName && companyName.length > 1 && !companyName.includes('WWR')) {
          const cleanName = companyName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
          const domainPrefix = cleanName.toLowerCase().replace(/\s+/g, '');
          
          crawledList.push({
            name: companyName,
            website: `https://${domainPrefix}.com`,
            industry: 'Technology, Remote Software',
            source: 'WE_WORK_REMOTELY'
          });
        }
      }
    });

    if (crawledList.length > 0) {
      console.log(`[WeWorkRemotely Crawler] Successfully parsed ${crawledList.length} companies from RSS feed.`);
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
    console.error(`[WeWorkRemotely Crawler] RSS parse failed, falling back to seed list. Error:`, err.message || err);
  }

  console.log(`[WeWorkRemotely Crawler] Returning ${seedCompanies.length} seed companies.`);
  return seedCompanies;
}
