interface DiscoveredCompany {
  name: string;
  website: string;
  industry?: string;
  source: string;
}

/**
 * Mock Wellfound (AngelList) company directory crawler
 */
export async function crawlWellfoundCompanies(): Promise<DiscoveredCompany[]> {
  console.log('[WF Crawler] Discovering companies on Wellfound...');
  
  // Return a list of modern, real startups that are active on Wellfound
  const mockStartups = [
    { name: 'Retool', website: 'https://retool.com', industry: 'Internal Tools, DevTools' },
    { name: 'Rippling', website: 'https://rippling.com', industry: 'HR, Payroll, IT' },
    { name: 'Brex', website: 'https://brex.com', industry: 'Fintech, Corporate Card' },
    { name: 'Ramp', website: 'https://ramp.com', industry: 'Fintech, Spend Management' },
    { name: 'Mercury', website: 'https://mercury.com', industry: 'Fintech, Startup Banking' },
    { name: 'Deel', website: 'https://deel.com', industry: 'HR, Global Payroll' },
    { name: 'Gusto', website: 'https://gusto.com', industry: 'HR, Payroll' },
    { name: 'Lattice', website: 'https://lattice.com', industry: 'HR, Performance' },
    { name: 'Figma', website: 'https://figma.com', industry: 'Design, Collaboration' },
    { name: 'Notion', website: 'https://notion.so', industry: 'Productivity, Collaboration' },
    { name: 'Webflow', website: 'https://webflow.com', industry: 'No-Code, Web Development' },
    { name: 'Zapier', website: 'https://zapier.com', industry: 'Automation, Workflow' },
    { name: 'Miro', website: 'https://miro.com', industry: 'Collaboration, Whiteboard' },
    { name: 'ClickUp', website: 'https://clickup.com', industry: 'Productivity, PM' },
    { name: 'Asana', website: 'https://asana.com', industry: 'Productivity, PM' },
    { name: 'Monday.com', website: 'https://monday.com', industry: 'Productivity, PM' },
    { name: 'Trello', website: 'https://trello.com', industry: 'Productivity, PM' },
    { name: 'Slack', website: 'https://slack.com', industry: 'Collaboration, Messaging' },
    { name: 'Zoom', website: 'https://zoom.us', industry: 'Collaboration, Video' },
  ];

  return mockStartups.map(s => ({
    name: s.name,
    website: s.website,
    industry: s.industry,
    source: 'WELLFOUND'
  }));
}
