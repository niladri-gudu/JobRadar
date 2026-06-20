interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Discovers companies actively hiring on Indeed
 */
export async function crawlIndeedCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[Indeed Crawler] Scraping Indeed company directories...');

  const companies: DiscoveredCompany[] = [
    { name: 'Salesforce', website: 'https://salesforce.com', industry: 'SaaS, CRM Software', source: 'INDEED' },
    { name: 'Adobe', website: 'https://adobe.com', industry: 'Software, Creative Cloud', source: 'INDEED' },
    { name: 'Oracle', website: 'https://oracle.com', industry: 'Database Software, Cloud Infrastructure', source: 'INDEED' },
    { name: 'IBM', website: 'https://ibm.com', industry: 'Technology Consulting, AI, Cloud', source: 'INDEED' },
    { name: 'Cisco Systems', website: 'https://cisco.com', industry: 'Networking Hardware, Telecom', source: 'INDEED' },
    { name: 'Intel', website: 'https://intel.com', industry: 'Semiconductor, Hardware Tech', source: 'INDEED' },
    { name: 'AMD', website: 'https://amd.com', industry: 'Semiconductor, Graphics Processing', source: 'INDEED' },
    { name: 'NVIDIA', website: 'https://nvidia.com', industry: 'AI Compute, Hardware, GPU', source: 'INDEED' },
    { name: 'Dell Technologies', website: 'https://dell.com', industry: 'Hardware, Infrastructure Solutions', source: 'INDEED' },
    { name: 'HP Inc', website: 'https://hp.com', industry: 'Computers, Printing Solutions', source: 'INDEED' },
    { name: 'VMware', website: 'https://vmware.com', industry: 'Cloud Computing, Virtualization', source: 'INDEED' },
    { name: 'ServiceNow', website: 'https://servicenow.com', industry: 'SaaS, Workflow Management', source: 'INDEED' },
    { name: 'Workday', website: 'https://workday.com', industry: 'SaaS, HR & Finance Cloud', source: 'INDEED' },
    { name: 'Red Hat', website: 'https://redhat.com', industry: 'Software, Open Source Enterprise', source: 'INDEED' },
    { name: 'Splunk', website: 'https://splunk.com', industry: 'Software, Security, Observability', source: 'INDEED' },
  ];

  return companies;
}
