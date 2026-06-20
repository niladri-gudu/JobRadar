import { db } from '@repo/database';

export class ContactService {
  /**
   * Retrieves all contacts associated with a specific job, ranked by priority.
   */
  async getJobContacts(jobId: string) {
    const jobContacts = await db.jobContact.findMany({
      where: { jobId },
      include: {
        contact: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    // Map to return a clean list of contacts with priority and matchReason
    return jobContacts.map(jc => ({
      id: jc.contact.id,
      name: jc.contact.name,
      role: jc.contact.role,
      email: jc.contact.email,
      linkedinUrl: jc.contact.linkedinUrl,
      twitterUrl: jc.contact.twitterUrl,
      source: jc.contact.source,
      confidenceScore: jc.contact.confidenceScore,
      priority: jc.priority,
      matchReason: jc.matchReason,
    }));
  }
}
