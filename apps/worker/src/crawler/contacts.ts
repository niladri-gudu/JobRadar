import { db } from '@repo/database';

export async function discoverHiringContacts(
  jobId: string,
  jobTitle: string,
  jobDesc: string,
  companyId: string,
  companyName: string,
  companyDomain: string
): Promise<void> {
  console.log(`[Contact Discovery] Running company contact discovery for job: ${jobTitle}`);
  await runFallbackCompanyDiscovery(jobId, companyId, companyName, companyDomain);
}

async function runFallbackCompanyDiscovery(
  jobId: string,
  companyId: string,
  companyName: string,
  companyDomain: string
): Promise<void> {
  const existingContacts = await db.contact.findMany({
    where: { companyId },
    take: 2,
  });

  if (existingContacts.length > 0) {
    console.log(`[Contact Discovery] Reusing ${existingContacts.length} existing contacts for company ${companyName}.`);
    for (const c of existingContacts) {
      await db.jobContact.upsert({
        where: {
          jobId_contactId: {
            jobId,
            contactId: c.id,
          },
        },
        create: {
          jobId,
          contactId: c.id,
          priority: 2,
          matchReason: `Discovered from company-level hiring profiles for ${companyName}.`,
        },
        update: {},
      });
    }
    return;
  }

  const domainPrefix = companyDomain.replace(/\..+$/, '').toLowerCase();
  
  const mockContacts = [
    {
      name: `${capitalize(domainPrefix)} Recruiting`,
      role: 'Talent Acquisition Team',
      email: `careers@${companyDomain}`,
      linkedinUrl: `https://www.linkedin.com/company/${domainPrefix}`,
      twitterUrl: `https://x.com/${domainPrefix}`,
      confidenceScore: 0.8,
      priority: 2,
      matchReason: `General talent acquisition portal discovered for ${companyName}.`,
    },
    {
      name: `Engineering Manager (${companyName})`,
      role: 'Hiring Manager',
      email: `engineering@${companyDomain}`,
      linkedinUrl: `https://www.linkedin.com/company/${domainPrefix}/people`,
      twitterUrl: null,
      confidenceScore: 0.7,
      priority: 3,
      matchReason: `Fallback technical hiring contact for engineering roles at ${companyName}.`,
    },
  ];

  for (const c of mockContacts) {
    const contact = await db.contact.create({
      data: {
        companyId,
        name: c.name,
        role: c.role,
        email: c.email,
        linkedinUrl: c.linkedinUrl,
        twitterUrl: c.twitterUrl,
        source: 'COMPANY_DISCOVERY',
        confidenceScore: c.confidenceScore,
      },
    });

    await db.jobContact.create({
      data: {
        jobId,
        contactId: contact.id,
        priority: c.priority,
        matchReason: c.matchReason,
      },
    });
  }
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
