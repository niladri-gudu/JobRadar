import { db } from '@repo/database';
import { config } from '../../config';

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

  /**
   * Retrieves existing outreach templates cached in the database.
   */
  async getOutreachTemplates(jobId: string, contactId: string) {
    return db.outreachTemplate.findMany({
      where: {
        jobId,
        contactId,
      },
      orderBy: {
        type: 'asc',
      },
    });
  }

  /**
   * Generates outreach templates using Google Gemini API or fallbacks, and caches them in the database.
   */
  async generateOutreachTemplates(userId: string, jobId: string, contactId: string) {
    // 1. Fetch user resume
    const resume = await db.resume.findUnique({
      where: { userId },
    });
    if (!resume) {
      throw new Error('No resume uploaded yet. Please upload your resume first.');
    }

    let resumeText = '';
    try {
      const parsed = JSON.parse(resume.parsedText);
      resumeText = parsed.rawText || resume.parsedText;
    } catch {
      resumeText = resume.parsedText;
    }

    // 2. Fetch job and company details
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        company: true,
      },
    });
    if (!job) {
      throw new Error('Job not found');
    }

    // 3. Fetch contact details
    const contact = await db.contact.findUnique({
      where: { id: contactId },
    });
    if (!contact) {
      throw new Error('Contact not found');
    }

    // 4. Try generating with Gemini API
    let geminiResponse: { LINKEDIN: string; TWITTER_DM: string; COLD_EMAIL: string } | null = null;
    const apiKey = config.ai.geminiApiKey;

    if (apiKey) {
      const model = config.ai.model || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const prompt = `You are an expert career counselor and professional recruiter. Generate highly personalized outreach messages for the following candidate to contact a hiring professional.

Candidate Resume Profile:
"""
${resumeText}
"""

Job Information:
- Title: ${job.title}
- Company: ${job.company.name} (Domain: ${job.company.normalizedDomain || 'N/A'})
- Description: ${job.description}

Contact Information:
- Name: ${contact.name}
- Role/Title: ${contact.role || 'Hiring/Recruiting Professional'}

Generate exactly three tailored outreach options:
1. LinkedIn Message (under 300 characters, extremely concise, personalized, professional).
2. X/Twitter DM (under 280 characters, punchy, casual yet professional).
3. Cold Email (complete with a compelling subject line and a structured email body).

Output a JSON response in the following format:
{
  "LINKEDIN": "string",
  "TWITTER_DM": "string",
  "COLD_EMAIL": "string"
}

For the COLD_EMAIL field, format the value as:
"Subject: [Subject Line]\\n\\n[Email Body]"

Output ONLY valid JSON. No other text, formatting, or markdown wrappers.`;

      let lastError: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            const err = new Error(`Gemini API error (${response.status}): ${errorText}`);
            (err as any).status = response.status;
            throw err;
          }

          const result = (await response.json()) as any;
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            throw new Error('Gemini API returned empty response');
          }

          geminiResponse = JSON.parse(text.trim());
          break; // successfully generated
        } catch (error: any) {
          lastError = error;
          console.error(`Gemini outreach generation attempt ${attempt + 1} failed:`, error);
          if (error.status === 429 || error.status === 503 || error.message?.includes('503') || error.message?.includes('429')) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          break; // don't retry on other errors
        }
      }
    }

    // 5. Fallback if Gemini failed or wasn't configured
    if (!geminiResponse) {
      console.warn('Falling back to programmatic outreach generation.');
      geminiResponse = this.generateFallbackOutreach(job.title, job.company.name, contact.name);
    }

    // 6. Save templates in database (upsert to overwrite if regenerate is clicked)
    const savedTemplates = [];
    const types = ['LINKEDIN', 'TWITTER_DM', 'COLD_EMAIL'] as const;

    for (const type of types) {
      const content = geminiResponse[type];
      if (content) {
        const t = await db.outreachTemplate.upsert({
          where: {
            jobId_contactId_type: {
              jobId,
              contactId,
              type,
            },
          },
          create: {
            jobId,
            contactId,
            type,
            content,
          },
          update: {
            content,
          },
        });
        savedTemplates.push(t);
      }
    }

    return savedTemplates;
  }

  /**
   * Programmatic fallback generator for outreach messages.
   */
  private generateFallbackOutreach(jobTitle: string, companyName: string, contactName: string) {
    const firstName = contactName.split(' ')[0] || 'there';
    return {
      LINKEDIN: `Hi ${firstName}, I noticed you're hiring for a ${jobTitle} at ${companyName}. I have a strong background in this stack and would love to connect to learn more about the role!`,
      TWITTER_DM: `Hi ${firstName}! Saw the ${jobTitle} opening at ${companyName}. Would love to connect and share how my background matches what you're looking for.`,
      COLD_EMAIL: `Subject: Interested in the ${jobTitle} role at ${companyName}\n\nHi ${firstName},\n\nI hope this email finds you well.\n\nI recently came across the ${jobTitle} position at ${companyName} and was excited to see how closely my experience aligns with the requirements.\n\nI'd love to share my resume and discuss how I can contribute to your team. Please let me know if you have a few minutes to connect.\n\nBest regards,\n[Your Name]`,
    };
  }
}
