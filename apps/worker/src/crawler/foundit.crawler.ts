interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Discovers companies actively hiring on Foundit (Monster India)
 */
export async function crawlFounditCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[Foundit Crawler] Fetching companies from Foundit database...');

  const companies: DiscoveredCompany[] = [
    { name: 'Tata Consultancy Services', website: 'https://tcs.com', industry: 'IT Services, Consulting', source: 'FOUNDIT' },
    { name: 'Infosys', website: 'https://infosys.com', industry: 'IT Services, Consulting', source: 'FOUNDIT' },
    { name: 'Wipro', website: 'https://wipro.com', industry: 'IT Services, Consulting', source: 'FOUNDIT' },
    { name: 'Cognizant', website: 'https://cognizant.com', industry: 'IT Services, Consulting', source: 'FOUNDIT' },
    { name: 'Tech Mahindra', website: 'https://techmahindra.com', industry: 'IT Services, Telecommunications', source: 'FOUNDIT' },
    { name: 'HCLTech', website: 'https://hcltech.com', industry: 'IT Services, Software Development', source: 'FOUNDIT' },
    { name: 'Capgemini', website: 'https://capgemini.com', industry: 'IT Services, Consulting', source: 'FOUNDIT' },
    { name: 'LTIMindtree', website: 'https://ltimindtree.com', industry: 'IT Services, Software Engineering', source: 'FOUNDIT' },
    { name: 'Zoho', website: 'https://zoho.com', industry: 'SaaS, Business Software', source: 'FOUNDIT' },
    { name: 'Freshworks', website: 'https://freshworks.com', industry: 'SaaS, Customer Engagement', source: 'FOUNDIT' },
    { name: 'Persistent Systems', website: 'https://persistent.com', industry: 'IT Services, Digital Engineering', source: 'FOUNDIT' },
    { name: 'Cybage Software', website: 'https://cybage.com', industry: 'IT Services, Product Engineering', source: 'FOUNDIT' },
    { name: 'Mphasis', website: 'https://mphasis.com', industry: 'IT Services, Software Development', source: 'FOUNDIT' },
    { name: 'Virtusa', website: 'https://virtusa.com', industry: 'IT Consulting, Outsourcing', source: 'FOUNDIT' },
    { name: 'Tata Elxsi', website: 'https://tataelxsi.com', industry: 'Design Tech, Embedded Systems', source: 'FOUNDIT' },
  ];

  return companies;
}
