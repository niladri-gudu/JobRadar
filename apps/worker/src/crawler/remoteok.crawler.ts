interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Discovers companies hiring on RemoteOK via its public API
 */
export async function crawlRemoteOkCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[RemoteOK Crawler] Starting company discovery...');
  
  const seedCompanies: DiscoveredCompany[] = [
    { name: 'Oyster HR', website: 'https://oysterhr.com', industry: 'HR Tech, Global Payroll', source: 'REMOTE_OK' },
    { name: 'SafetyWing', website: 'https://safetywing.com', industry: 'Fintech, Insurance', source: 'REMOTE_OK' },
    { name: 'Rebellion Defense', website: 'https://rebelliondefense.com', industry: 'Defense Tech, Software', source: 'REMOTE_OK' },
    { name: 'Clevertech', website: 'https://clevertech.biz', industry: 'Software Consulting', source: 'REMOTE_OK' },
    { name: 'X-Team', website: 'https://x-team.com', industry: 'Talent Network, Consulting', source: 'REMOTE_OK' },
    { name: 'Hopin', website: 'https://hopin.com', industry: 'Virtual Events, Software', source: 'REMOTE_OK' },
    { name: 'TestGorilla', website: 'https://testgorilla.com', industry: 'HR Tech, Pre-employment testing', source: 'REMOTE_OK' },
    { name: 'Sourcegraph', website: 'https://sourcegraph.com', industry: 'Developer Tools, Code Search', source: 'REMOTE_OK' },
    { name: 'DuckDuckGo', website: 'https://duckduckgo.com', industry: 'Privacy, Search Engine', source: 'REMOTE_OK' },
    { name: 'Frontastic', website: 'https://frontastic.cloud', industry: 'E-commerce, Cloud Frontend', source: 'REMOTE_OK' },
  ];

  try {
    const url = 'https://remoteok.com/api';
    console.log(`[RemoteOK Crawler] Querying public API: ${url}...`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      const crawledList: DiscoveredCompany[] = [];
      
      // Skip index 0 (which contains legal/meta disclaimer info)
      for (let i = 1; i < data.length; i++) {
        const item = data[i];
        if (item && item.company) {
          const companyName = item.company.trim();
          const cleanName = companyName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
          const domainPrefix = cleanName.toLowerCase().replace(/\s+/g, '');
          
          if (cleanName.length > 1) {
            crawledList.push({
              name: companyName,
              website: `https://${domainPrefix}.com`,
              industry: item.tags ? item.tags.join(', ') : 'Remote Startup',
              source: 'REMOTE_OK'
            });
          }
        }
      }

      if (crawledList.length > 0) {
        console.log(`[RemoteOK Crawler] Successfully retrieved ${crawledList.length} companies from API.`);
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
    }
  } catch (err: any) {
    console.error(`[RemoteOK Crawler] API query failed, falling back to seed list. Error:`, err.message || err);
  }

  console.log(`[RemoteOK Crawler] Returning ${seedCompanies.length} seed companies.`);
  return seedCompanies;
}
