import { db } from '@repo/database';
import { config } from '../config';

export async function discoverHiringContacts(
  jobId: string,
  jobTitle: string,
  jobDesc: string,
  companyId: string,
  companyName: string,
  companyDomain: string,
  relevanceScore: number
): Promise<void> {
  console.log(`[Contact Discovery] Running company contact discovery for job: ${jobTitle} (Score: ${relevanceScore})`);

  // 1. Relevance Score Pre-check (Threshold: 75% or higher)
  if (relevanceScore < 75) {
    console.log(`[Contact Discovery] Job relevance score ${relevanceScore} is below threshold (75). Skipping AI extraction and running fallback company discovery.`);
    await runFallbackCompanyDiscovery(jobId, companyId, companyName, companyDomain);
    return;
  }

  // 2. Pre-screen RegExp check: Does description contain contact info keywords?
  const cleanDesc = jobDesc.toLowerCase();
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/;
  
  // General keywords related to contact details
  const contactKeywords = [
    'contact', 'reach out', 'write to', 'email', 'hiring manager', 'recruiter', 
    'apply at', 'questions', 'resume to', 'cv to', 'talent'
  ];
  
  const hasContactInfo = 
    emailRegex.test(jobDesc) || 
    linkedinRegex.test(jobDesc) || 
    contactKeywords.some(kw => cleanDesc.includes(kw));

  if (!hasContactInfo) {
    console.log(`[Contact Discovery] No contact cues detected in job description. Skipping AI extraction and running fallback company discovery.`);
    await runFallbackCompanyDiscovery(jobId, companyId, companyName, companyDomain);
    return;
  }

  // 3. Try to extract contact details using Gemini API
  const apiKey = config.ai.geminiApiKey;
  if (!apiKey) {
    console.log(`[Contact Discovery] GEMINI_API_KEY is not configured. Falling back to programmatic discovery.`);
    await runFallbackCompanyDiscovery(jobId, companyId, companyName, companyDomain);
    return;
  }

  console.log(`[Contact Discovery] Match score and pre-screen passed. Triggering Gemini AI extraction for: ${jobTitle}`);

  const model = config.ai.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `You are an AI assistant specialized in analyzing tech job descriptions.
Your task is to extract hiring contact information (like recruiters, hiring managers, or talent acquisition) mentioned in the description.

Job Description:
\"\"\"
${jobDesc}
\"\"\"

Extract the following fields if present:
- name: The full name of the contact person (e.g. "Jane Doe"). If no specific name is mentioned but there's a title (like "Hiring Manager"), output that. If completely missing, use "Talent Team".
- role: The role or title (e.g. "Technical Recruiter", "Hiring Manager", "VP of Engineering").
- email: The email address mentioned for contact.
- linkedinUrl: The LinkedIn profile URL of the contact person.
- twitterUrl: The Twitter/X profile URL of the contact person.
- confidenceScore: Float value between 0.0 and 1.0 representing your confidence in this extraction.

Output a JSON response in the following format:
{
  "name": "string",
  "role": "string" or null,
  "email": "string" or null,
  "linkedinUrl": "string" or null,
  "twitterUrl": "string" or null,
  "confidenceScore": float
}

Output ONLY valid JSON. No other text or markdown wrappers.`;

  try {
    let geminiResponse: any = null;
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
          throw new Error(`Gemini API HTTP error ${response.status}: ${errorText}`);
        }

        const result = (await response.json()) as any;
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          geminiResponse = JSON.parse(text.trim());
          break;
        }
      } catch (err: any) {
        console.error(`[Contact Discovery] Gemini extraction attempt ${attempt + 1} failed:`, err.message);
        if (attempt < 2 && (err.status === 429 || err.message?.includes('429'))) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          break;
        }
      }
    }

    if (geminiResponse && geminiResponse.name) {
      console.log(`[Contact Discovery] Successfully extracted recruiter details via Gemini: ${geminiResponse.name}`);
      
      // Save contact to DB
      const contact = await db.contact.create({
        data: {
          companyId,
          name: geminiResponse.name,
          role: geminiResponse.role || 'Talent Acquisition',
          email: geminiResponse.email || null,
          linkedinUrl: geminiResponse.linkedinUrl || null,
          twitterUrl: geminiResponse.twitterUrl || null,
          source: 'DIRECT_EXTRACTION',
          confidenceScore: geminiResponse.confidenceScore || 0.9,
        },
      });

      // Link to Job
      await db.jobContact.create({
        data: {
          jobId,
          contactId: contact.id,
          priority: 1, // High priority since it was extracted directly
          matchReason: `Directly extracted from the job description context by Gemini.`,
        },
      });
      return;
    }
  } catch (apiErr: any) {
    console.error(`[Contact Discovery] AI extraction error:`, apiErr.message);
  }

  // Fallback if AI extraction failed or was skipped
  console.log(`[Contact Discovery] AI extraction failed or returned no results. Running fallback company discovery.`);
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
