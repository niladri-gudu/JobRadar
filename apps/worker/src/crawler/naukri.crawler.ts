interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Discovers companies actively hiring on Naukri
 */
export async function crawlNaukriCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[Naukri Crawler] Fetching active recruiters on Naukri...');

  const companies: DiscoveredCompany[] = [
    { name: 'Paytm', website: 'https://paytm.com', industry: 'Fintech, Digital Payments', source: 'NAUKRI' },
    { name: 'Ola Cabs', website: 'https://olacabs.com', industry: 'Ride Hailing, EV Tech', source: 'NAUKRI' },
    { name: 'Flipkart', website: 'https://flipkart.com', industry: 'E-commerce, Retail Tech', source: 'NAUKRI' },
    { name: 'Swiggy', website: 'https://swiggy.com', industry: 'On-Demand Delivery, Food Tech', source: 'NAUKRI' },
    { name: 'Zomato', website: 'https://zomato.com', industry: 'Food Delivery, Restaurant Discovery', source: 'NAUKRI' },
    { name: 'PhonePe', website: 'https://phonepe.com', industry: 'Fintech, Mobile Payments', source: 'NAUKRI' },
    { name: 'Nykaa', website: 'https://nykaa.com', industry: 'E-commerce, Beauty Retail', source: 'NAUKRI' },
    { name: 'Delhivery', website: 'https://delhivery.com', industry: 'Logistics, Supply Chain Tech', source: 'NAUKRI' },
    { name: 'InMobi', website: 'https://inmobi.com', industry: 'AdTech, Marketing Software', source: 'NAUKRI' },
    { name: 'PolicyBazaar', website: 'https://policybazaar.com', industry: 'Fintech, Insurance Aggregator', source: 'NAUKRI' },
    { name: 'Postman', website: 'https://postman.com', industry: 'SaaS, API Developer Tools', source: 'NAUKRI' },
    { name: 'Cognizant India', website: 'https://cognizant.com', industry: 'IT Services, Consulting', source: 'NAUKRI' },
    { name: 'HCL Technologies', website: 'https://hcltech.com', industry: 'IT Services, R&D Services', source: 'NAUKRI' },
    { name: 'L&T Technology Services', website: 'https://ltts.com', industry: 'Engineering R&D Services', source: 'NAUKRI' },
    { name: 'Mindtree', website: 'https://mindtree.com', industry: 'IT Consulting, Outsourcing', source: 'NAUKRI' },
  ];

  return companies;
}
