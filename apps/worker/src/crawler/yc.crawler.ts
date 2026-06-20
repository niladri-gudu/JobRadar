import { chromium } from 'playwright';

interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Crawls/Discovers companies from Y Combinator directory.
 * Uses Algolia API directly for speed, with Playwright browser scraping as a fallback.
 */
export async function crawlYcCompanies(): Promise<DiscoveredCompany[]> {
  try {
    console.log('[YC Crawler] Attempting to fetch companies via YC Algolia API...');
    const companies = await fetchYcCompaniesAlgolia();
    if (companies && companies.length > 0) {
      console.log(`[YC Crawler] Successfully fetched ${companies.length} companies from Algolia.`);
      return companies;
    }
  } catch (err) {
    console.error('[YC Crawler] Algolia fetch failed, falling back to Playwright scraping:', err);
  }

  // Fallback to Playwright crawler
  return crawlYcCompaniesPlaywright();
}

/**
 * Direct Algolia API fetching
 */
async function fetchYcCompaniesAlgolia(): Promise<DiscoveredCompany[]> {
  const url = 'https://45bwzj1sgc-dsn.algolia.net/1/indexes/*/queries?x-algolia-application-id=45BWZJ1SGC&x-algolia-api-key=NzllNTY5MzJiZGM2OTY2ZTQwMDEzOTNhYWZiZGRjODlhYzVkNjBmOGRjNzJiMWM4ZTU0ZDlhYTZjOTJiMjlhMWFuYWx5dGljc1RhZ3M9eWNkYyZyZXN0cmljdEluZGljZXM9WUNDb21wYW55X3Byb2R1Y3Rpb24lMkNZQ0NvbXBhbnlfQnlfTGF1bmNoX0RhdGVfcHJvZHVjdGlvbiZ0YWdGaWx0ZXJzPSU1QiUyMnljZGNfcHVibGljJTIyJTVE';
  const companies: DiscoveredCompany[] = [];
  
  // We will fetch pages 0 to 4 (5000 potential results)
  for (let page = 0; page < 5; page++) {
    const body = {
      requests: [
        {
          indexName: 'YCCompany_production',
          params: `query=&hitsPerPage=1000&page=${page}`
        }
      ]
    };

    console.log(`[YC Crawler] Fetching Algolia page ${page}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Algolia query responded with status: ${response.status}`);
    }

    const data: any = await response.json();
    const hits = data.results?.[0]?.hits || [];
    if (hits.length === 0) {
      console.log('[YC Crawler] No more hits found. Stopping fetch.');
      break;
    }

    for (const hit of hits) {
      if (hit.name && hit.website) {
        companies.push({
          name: hit.name,
          website: hit.website,
          industry: hit.industries ? hit.industries.join(', ') : (hit.industry || undefined),
          source: 'YC'
        });
      }
    }
  }

  return companies;
}

/**
 * Playwright Browser Crawler Fallback
 */
async function crawlYcCompaniesPlaywright(): Promise<DiscoveredCompany[]> {
  console.log('[YC Crawler] Starting Playwright browser crawler fallback...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const companies: DiscoveredCompany[] = [];

  try {
    await page.goto('https://www.ycombinator.com/companies', { waitUntil: 'networkidle' });
    console.log('[YC Crawler] Companies page loaded. Extracting visible cards...');

    // Scroll a few times to load initial content
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1000);
    }

    // Extract visible cards. YC listing page uses anchors for company details.
    const cardsData = await page.evaluate(() => {
      const cards = document.querySelectorAll('a[href^="/companies/"]');
      const results: { name: string; website: string; industry?: string }[] = [];
      cards.forEach(card => {
        // Find company name inside card
        const nameEl = card.querySelector('.coName') || card.querySelector('span');
        const name = nameEl?.textContent?.trim() || '';
        
        // Find industry/tags
        const tagEl = card.querySelector('.coTags') || card.querySelector('span:nth-child(2)');
        const industry = tagEl?.textContent?.trim() || '';

        // Playwright fallback won't have direct company website unless we click,
        // so we'll construct a website URL using slug, or map a placeholder that is updated later,
        // or extract it if available. Since it links to /companies/slug, we construct a fallback website.
        const href = (card as HTMLAnchorElement).getAttribute('href') || '';
        const slug = href.replace('/companies/', '').split('/')[0];
        
        if (name && slug) {
          results.push({
            name,
            website: `https://${slug}.com`, // Fallback guess
            industry: industry || undefined
          });
        }
      });
      return results;
    });

    for (const card of cardsData) {
      companies.push({
        ...card,
        source: 'YC'
      });
    }

    console.log(`[YC Crawler] Playwright fallback discovered ${companies.length} companies.`);
  } catch (err) {
    console.error('[YC Crawler] Playwright crawler failed:', err);
  } finally {
    await browser.close();
  }

  return companies;
}
