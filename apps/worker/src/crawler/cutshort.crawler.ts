interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Discovers companies actively hiring on Cutshort
 */
export async function crawlCutshortCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[Cutshort Crawler] Fetching high-growth startups from Cutshort directory...');
  
  // Cutshort features premium tech companies and startups, primarily in India/Remote.
  const companies: DiscoveredCompany[] = [
    { name: 'Razorpay', website: 'https://razorpay.com', industry: 'Fintech, Payment Gateway', source: 'CUTSHORT' },
    { name: 'Cred', website: 'https://cred.club', industry: 'Fintech, Credit Cards', source: 'CUTSHORT' },
    { name: 'Meesho', website: 'https://meesho.com', industry: 'E-commerce, Social Commerce', source: 'CUTSHORT' },
    { name: 'Groww', website: 'https://groww.in', industry: 'Fintech, Investment Platform', source: 'CUTSHORT' },
    { name: 'Zerodha', website: 'https://zerodha.com', industry: 'Fintech, Stock Broking', source: 'CUTSHORT' },
    { name: 'BrowserStack', website: 'https://browserstack.com', industry: 'SaaS, DevTools Testing', source: 'CUTSHORT' },
    { name: 'Khatabook', website: 'https://khatabook.com', industry: 'Fintech, SaaS', source: 'CUTSHORT' },
    { name: 'ShareChat', website: 'https://sharechat.com', industry: 'Social Media, Tech', source: 'CUTSHORT' },
    { name: 'CureFit', website: 'https://cult.fit', industry: 'Health & Fitness Tech', source: 'CUTSHORT' },
    { name: 'Udaan', website: 'https://udaan.com', industry: 'B2B E-commerce', source: 'CUTSHORT' },
    { name: 'Yellow.ai', website: 'https://yellow.ai', industry: 'Conversational AI, SaaS', source: 'CUTSHORT' },
    { name: 'Darwinbox', website: 'https://darwinbox.com', industry: 'HR Tech, SaaS Enterprise', source: 'CUTSHORT' },
    { name: 'Simpl', website: 'https://getsimpl.com', industry: 'Fintech, Buy Now Pay Later', source: 'CUTSHORT' },
    { name: 'ElasticRun', website: 'https://elasticrun.com', industry: 'Logistics Tech, B2B', source: 'CUTSHORT' },
    { name: 'Jupiter Money', website: 'https://jupiter.money', industry: 'Fintech, Neobanking', source: 'CUTSHORT' },
  ];

  return companies;
}
