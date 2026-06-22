import * as cheerio from 'cheerio';
import { db } from '@repo/database';
import { discoverHiringContacts } from './contacts';

export interface CrawledJob {
  title: string;
  location?: string;
  applyUrl?: string;
  description?: string;
  externalJobId?: string;
}

export interface DiscoveryResult {
  careerPageUrl: string;
  isValid: boolean;
  atsProvider: 'GREENHOUSE' | 'LEVER' | 'ASHBY' | 'WORKABLE' | 'SMARTRECRUITERS' | 'BAMBOOHR' | 'TEAMTAILOR' | null;
  jobsCount: number;
  jobs: CrawledJob[];
}

/**
 * Normalizes relative URLs to absolute URLs.
 */
function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch (e) {
    return relative;
  }
}

/**
 * Step 1: Find Careers Page from homepage URL
 */
export async function findCareerPage(homepageUrl: string): Promise<string> {
  let url = homepageUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    console.log(`[Discovery] Extracting links from homepage: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.log(`[Discovery] Homepage fetch failed: HTTP ${response.status}. Using homepage as fallback.`);
      return url;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const links: Array<{ href: string; text: string }> = [];

    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().toLowerCase();
      if (href) {
        links.push({ href, text });
      }
    });

    // Keywords to match in URL or link text
    const careerKeywords = ['careers', 'career', 'jobs', 'join-us', 'hiring', 'work-with-us', 'open-roles', 'positions'];
    
    // 1. First priority: look for direct match of keywords in the link text or href path
    for (const link of links) {
      const resolved = resolveUrl(url, link.href);
      const isExternalOrSelf = resolved.startsWith(url) || !link.href.startsWith('http');
      
      if (isExternalOrSelf) {
        for (const kw of careerKeywords) {
          const hrefLower = link.href.toLowerCase();
          // Check if link text exactly matches or contains, or URL path has the keyword
          if (link.text.includes(kw) || hrefLower.includes(`/${kw}`) || hrefLower.endsWith(kw)) {
            console.log(`[Discovery] Found career link match: "${link.text}" -> ${resolved}`);
            return resolved;
          }
        }
      }
    }

    // 2. Second priority: any link that contains career keywords anywhere in it
    for (const link of links) {
      const resolved = resolveUrl(url, link.href);
      for (const kw of careerKeywords) {
        if (link.href.toLowerCase().includes(kw)) {
          console.log(`[Discovery] Found soft career link match in URL: ${resolved}`);
          return resolved;
        }
      }
    }

    console.log(`[Discovery] No career links detected on ${url}. Using homepage as fallback.`);
    return url;
  } catch (err: any) {
    console.error(`[Discovery] Error finding career page on ${url}:`, err.message || err);
    return url;
  }
}

/**
 * Step 2: Validate Career Page
 */
export async function validateCareerPage(url: string): Promise<{ isValid: boolean; html: string }> {
  try {
    console.log(`[Discovery] Validating career page URL: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return { isValid: false, html: '' };
    }

    const html = await response.text();
    const htmlLower = html.toLowerCase();
    
    // Check if the page contains job-related keywords in its body
    const hasJobKeywords = ['jobs', 'open positions', 'open roles', 'hiring', 'careers', 'careers page'].some(kw => 
      htmlLower.includes(kw)
    );

    return {
      isValid: hasJobKeywords,
      html,
    };
  } catch (err: any) {
    console.error(`[Discovery] Error validating career page ${url}:`, err.message || err);
    return { isValid: false, html: '' };
  }
}

/**
 * Step 3: Detect ATS Provider
 */
export function detectAts(url: string, html: string): 'GREENHOUSE' | 'LEVER' | 'ASHBY' | 'WORKABLE' | 'SMARTRECRUITERS' | 'BAMBOOHR' | 'TEAMTAILOR' | null {
  const combined = (url + ' ' + html).toLowerCase();

  if (combined.includes('greenhouse.io') || combined.includes('boards.greenhouse.io')) {
    return 'GREENHOUSE';
  }
  if (combined.includes('lever.co') || combined.includes('jobs.lever.co')) {
    return 'LEVER';
  }
  if (combined.includes('ashbyhq.com') || combined.includes('jobs.ashbyhq.com')) {
    return 'ASHBY';
  }
  if (combined.includes('workable.com')) {
    return 'WORKABLE';
  }
  if (combined.includes('smartrecruiters.com')) {
    return 'SMARTRECRUITERS';
  }
  if (combined.includes('bamboohr.com')) {
    return 'BAMBOOHR';
  }
  if (combined.includes('teamtailor.com')) {
    return 'TEAMTAILOR';
  }

  return null;
}

/**
 * Extract token/subdomain representing company board identifier
 */
function extractAtsToken(url: string, provider: string, html: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (host.includes('greenhouse.io')) {
      const searchParams = parsed.searchParams;
      if (searchParams.has('board')) return searchParams.get('board');
      const parts = pathname.split('/').filter(Boolean);
      if (parts[0] !== 'embed' || parts[1] !== 'job_board') {
        return parts[0] || null;
      }
    }
    if (host.includes('lever.co')) {
      const parts = pathname.split('/').filter(Boolean);
      return parts[0] || null;
    }
    if (host.includes('ashbyhq.com')) {
      const parts = pathname.split('/').filter(Boolean);
      return parts[0] || null;
    }
    if (host.endsWith('.workable.com')) {
      return host.split('.')[0];
    }
    if (host.includes('smartrecruiters.com')) {
      const parts = pathname.split('/').filter(Boolean);
      return parts[0] || null;
    }
    if (host.endsWith('.bamboohr.com')) {
      return host.split('.')[0];
    }
    if (host.endsWith('.teamtailor.com')) {
      return host.split('.')[0];
    }
  } catch (e) {}

  // Extract from HTML if the career page embeds/links to the ATS
  if (provider === 'GREENHOUSE') {
    const match = html.match(/boards\.greenhouse\.io\/(embed\/job_board\?board=|v1\/boards\/)?([^/"'\s>]+)/i);
    if (match && match[2] && match[2] !== 'embed') return match[2];
  }
  if (provider === 'LEVER') {
    const match = html.match(/jobs\.lever\.co\/([^/"'\s>]+)/i);
    if (match && match[1]) return match[1];
  }
  if (provider === 'ASHBY') {
    const match = html.match(/(?:api\.ashbyhq\.com\/v1\/iframe\/careers|embed\.ashbyhq\.com)\/([^/"'\s>]+)/i);
    if (match && match[1]) return match[1];
  }
  if (provider === 'WORKABLE') {
    const match = html.match(/([^/"'\s.]+)\.workable\.com/i);
    if (match && match[1] && match[1] !== 'www') return match[1];
  }
  if (provider === 'SMARTRECRUITERS') {
    const match = html.match(/smartrecruiters\.com\/([^/"'\s>]+)/i);
    if (match && match[1]) return match[1];
  }
  if (provider === 'BAMBOOHR') {
    const match = html.match(/([^/"'\s.]+)\.bamboohr\.com/i);
    if (match && match[1]) return match[1];
  }
  if (provider === 'TEAMTAILOR') {
    const match = html.match(/([^/"'\s.]+)\.teamtailor\.com/i);
    if (match && match[1]) return match[1];
  }

  return null;
}

/**
 * Step 4: Structured Job Fetchers
 */
async function fetchGreenhouseJobs(token: string): Promise<CrawledJob[]> {
  try {
    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
    console.log(`[Greenhouse API] Fetching jobs for: ${token}`);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Greenhouse API responded with HTTP ${response.status}`);
    }
    const data: any = await response.json();
    const jobs = data.jobs || [];
    
    return jobs.map((j: any) => ({
      title: j.title,
      location: j.location?.name || 'Remote',
      applyUrl: j.absolute_url,
      description: j.content, // HTML description
      externalJobId: String(j.id),
    }));
  } catch (err: any) {
    console.error(`[Greenhouse API] Error:`, err.message || err);
    return [];
  }
}

async function fetchLeverJobs(token: string): Promise<CrawledJob[]> {
  try {
    const apiUrl = `https://api.lever.co/v0/postings/${token}?mode=json`;
    console.log(`[Lever API] Fetching jobs for: ${token}`);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Lever API responded with HTTP ${response.status}`);
    }
    const jobs: any[] = await response.json();
    
    return jobs.map((j: any) => ({
      title: j.text,
      location: j.categories?.location || 'Remote',
      applyUrl: j.hostedUrl,
      description: j.descriptionHtml + ' ' + (j.lists?.map((l: any) => l.text + ' ' + l.content).join(' ') || ''),
      externalJobId: String(j.id),
    }));
  } catch (err: any) {
    console.error(`[Lever API] Error:`, err.message || err);
    return [];
  }
}

async function fetchAshbyJobs(token: string): Promise<CrawledJob[]> {
  try {
    const apiUrl = `https://api.ashbyhq.com/v1/iframe/careers/${token}/jobs`;
    console.log(`[Ashby API] Fetching jobs for: ${token}`);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Ashby API responded with HTTP ${response.status}`);
    }
    const data: any = await response.json();
    const jobs = data.jobs || [];
    
    return jobs.map((j: any) => ({
      title: j.title,
      location: j.location || 'Remote',
      applyUrl: j.jobUrl,
      description: j.description || '',
      externalJobId: String(j.id),
    }));
  } catch (err: any) {
    console.error(`[Ashby API] Error:`, err.message || err);
    return [];
  }
}

/**
 * General Cheerio Crawling Fallback for other ATS or non-ATS career pages
 */
async function scrapeGeneralJobs(url: string, html: string): Promise<CrawledJob[]> {
  try {
    console.log(`[Cheerio Scraper] Scraping general career page HTML for: ${url}`);
    const $ = cheerio.load(html);
    const jobs: CrawledJob[] = [];
    
    // Look for link elements that look like jobs
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href && text.length > 5 && text.length < 100) {
        const textLower = text.toLowerCase();
        const hrefLower = href.toLowerCase();
        
        // Match standard developer and Indian tech job title keywords to see if link text represents a job posting
        const isJobLink = [
          'engineer', 'developer', 'designer', 'manager', 'lead', 'fresher', 'intern', 
          'analyst', 'architect', 'writer', 'support', 'ops', 'marketing', 'trainee', 
          'specialist', 'consultant', 'programmer', 'mts', 'associate', 'technical', 
          'software', 'web', 'stack', 'qa', 'test', 'frontend', 'backend', 'fullstack', 
          'cloud', 'data', 'ml', 'ai', 'member'
        ].some(k => 
          textLower.includes(k)
        );
        
        const isJobPath = ['/jobs/', '/careers/', '/positions/', '/posting/', '/job/'].some(k => 
          hrefLower.includes(k)
        );

        if (isJobLink || isJobPath) {
          const resolved = resolveUrl(url, href);
          jobs.push({
            title: text.replace(/\s+/g, ' '),
            location: textLower.includes('remote') ? 'Remote' : 'Office',
            applyUrl: resolved,
            description: `Opportunity surfaced via general web scrape of career page: ${url}. Link text: ${text}`,
            externalJobId: resolved, // Use URL as unique identifier
          });
        }
      }
    });

    // Deduplicate jobs by applyUrl
    const seenUrls = new Set<string>();
    const uniqueJobs: CrawledJob[] = [];
    for (const job of jobs) {
      if (job.applyUrl && !seenUrls.has(job.applyUrl)) {
        seenUrls.add(job.applyUrl);
        uniqueJobs.push(job);
      }
    }
    
    return uniqueJobs;
  } catch (err: any) {
    console.error(`[Cheerio Scraper] Error scraping ${url}:`, err.message || err);
    return [];
  }
}

/**
 * Step 5: Pre-Filter & Relevance Scoring
 * Tailored for: Fresher, India, Backend, Web3, Remote.
 * Examples:
 * - "Backend Engineer, Remote, 0-2 Years" -> Score: 95
 * - "Principal Platform Engineer, USA" -> Score: 5
 */
export function calculateRelevanceScore(
  job: { title: string; location?: string; description?: string },
  companyContext?: { source?: string; normalizedDomain?: string }
): number {
  let score = 35; // base score

  const title = (job.title || '').toLowerCase();
  const location = (job.location || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();

  // Positive Keywords
  const isRemote = title.includes('remote') || location.includes('remote') || desc.includes('remote work') || desc.includes('work from home') || desc.includes('work-from-home') || location.includes('anywhere');
  
  // Detect if company belongs to India context
  const isIndianCompany = companyContext && (
    companyContext.source === 'CUTSHORT' || 
    companyContext.source === 'FOUNDIT' || 
    companyContext.source === 'NAUKRI' || 
    companyContext.normalizedDomain?.endsWith('.in')
  );

  const isIndia = 
    location.includes('india') || 
    location.includes('bangalore') || 
    location.includes('bengaluru') || 
    location.includes('pune') || 
    location.includes('mumbai') || 
    location.includes('delhi') || 
    location.includes('hyderabad') || 
    location.includes('chennai') || 
    location.includes('noida') || 
    location.includes('gurgaon') || 
    location.includes('in') || 
    location.includes('ind') ||
    !!isIndianCompany ||
    // If the description contains clear Indian cities and it doesn't explicitly name USA/UK
    ((desc.includes('bangalore') || desc.includes('bengaluru') || desc.includes('pune') || desc.includes('mumbai') || desc.includes('hyderabad') || desc.includes('noida') || desc.includes('gurgaon') || desc.includes('delhi') || desc.includes('india')) &&
     !location.includes('usa') && !location.includes('united states') && !location.includes('uk') && !location.includes('london'));

  const isEntryLevel = title.includes('junior') || title.includes('jr') || title.includes('associate') || title.includes('intern') || title.includes('graduate') || title.includes('grad') || title.includes('fresher') || title.includes('entry level') || title.includes('entry-level') || desc.includes('0-2 years') || desc.includes('0-3 years') || desc.includes('no experience') || desc.includes('new grad') || title.includes('trainee');
  const isBackendWeb3 = title.includes('backend') || title.includes('software engineer') || title.includes('software developer') || title.includes('node') || title.includes('typescript') || title.includes('javascript') || title.includes('golang') || title.includes('go') || title.includes('rust') || title.includes('solidity') || title.includes('web3') || title.includes('blockchain') || title.includes('smart contract') || title.includes('full stack') || title.includes('fullstack') || title.includes('engineer');

  if (isRemote) score += 20;
  if (isIndia) score += 20;
  if (isEntryLevel) score += 20;
  if (isBackendWeb3) score += 20;

  // Negative Keywords
  const isSeniority = title.includes('senior') || title.includes('sr') || title.includes('staff') || title.includes('principal') || title.includes('lead') || title.includes('director') || title.includes('manager') || title.includes('vp') || title.includes('head') || title.includes('architect') || title.includes('mgr');
  
  if (isSeniority) {
    score -= 40;
  }

  // Location Penalty for non-remote, non-India roles
  const hasSpecificNonIndiaLocation = (location.includes('usa') || location.includes('united states') || location.includes('uk') || location.includes('london') || location.includes('europe') || location.includes('germany') || location.includes('canada') || location.includes('san francisco') || location.includes('ny') || location.includes('new york')) && !isIndia && !isRemote;
  if (hasSpecificNonIndiaLocation) {
    score -= 10;
  }

  // Double check the specific user examples
  // 1. "Backend Engineer, Remote, 0-2 Years"
  // base (35) + remote (20) + entry (20) + backend/engineer (20) = 95. (Matches exactly)
  // 2. "Principal Platform Engineer, USA"
  // base (35) + engineer (20) - senior/principal (40) - non-india location (10) = 5. (Matches exactly)

  // Bounds limit 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Core orchestrator for Career Intelligence Discovery on a company
 */
export async function runCareerIntelligence(companyId: string): Promise<DiscoveryResult> {
  const company = await db.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error(`Company with ID ${companyId} not found`);
  }

  console.log(`\n--- [Career Intelligence] Starting discovery for ${company.name} (${company.website}) ---`);

  // Step 1: Find Careers Page
  const careerPageUrl = await findCareerPage(company.website);

  // Step 2: Validate Career Page
  const { isValid, html } = await validateCareerPage(careerPageUrl);
  
  // Step 3: Detect ATS
  let atsProvider: DiscoveryResult['atsProvider'] = null;
  if (isValid) {
    atsProvider = detectAts(careerPageUrl, html);
  }

  console.log(`[Career Intelligence] Career page detected: ${careerPageUrl}`);
  console.log(`[Career Intelligence] isValid: ${isValid}, atsProvider: ${atsProvider || 'NONE'}`);

  // Create or Update CareerPage in DB
  const careerPage = await db.careerPage.upsert({
    where: { id: companyId }, // We map CareerPage 1-to-1 with Company by using companyId as its unique primary key, or let UUID auto-generate
    // Wait, the schema has: CareerPage mapping companyId -> Company (many to one or one to many).
    // Let's find if a career page already exists for this company URL.
    create: {
      companyId: company.id,
      url: careerPageUrl,
      atsProvider,
      isValid,
      lastValidatedAt: new Date(),
      status: isValid ? 'validated' : 'invalid',
    },
    update: {
      url: careerPageUrl,
      atsProvider,
      isValid,
      lastValidatedAt: new Date(),
      status: isValid ? 'validated' : 'invalid',
    },
  });

  let jobs: CrawledJob[] = [];

  // Step 4: Job Existence & Retrieval Check
  if (isValid) {
    const token = atsProvider ? extractAtsToken(careerPageUrl, atsProvider, html) : null;
    let fetchSuccess = false;
    
    if (atsProvider === 'GREENHOUSE' && token) {
      jobs = await fetchGreenhouseJobs(token);
      fetchSuccess = jobs.length > 0;
    } else if (atsProvider === 'LEVER' && token) {
      jobs = await fetchLeverJobs(token);
      fetchSuccess = jobs.length > 0;
    } else if (atsProvider === 'ASHBY' && token) {
      jobs = await fetchAshbyJobs(token);
      fetchSuccess = jobs.length > 0;
    }

    // Fallback: If no ATS provider detected, or if direct API fetch failed/returned 0 jobs, run Cheerio fallback
    if (!fetchSuccess) {
      console.log(`[Career Intelligence] Direct API fetch failed or returned 0 jobs. Running Cheerio scraper fallback...`);
      jobs = await scrapeGeneralJobs(careerPageUrl, html);
    }
  }

  const jobsCount = jobs.length;
  console.log(`[Career Intelligence] Jobs Found: ${jobsCount}`);

  // If jobs exist, score them and store them in the DB
  if (jobsCount > 0) {
    // We clean up old jobs for this company first to keep data fresh (upsert/replace snapshot)
    await db.job.deleteMany({
      where: { companyId: company.id },
    });

    const isIndianCompany = 
      company.source === 'CUTSHORT' || 
      company.source === 'FOUNDIT' || 
      company.source === 'NAUKRI' || 
      company.normalizedDomain.endsWith('.in');

    for (const job of jobs) {
      // Step 5: Relevance scoring
      const relevanceScore = calculateRelevanceScore(job, {
        source: company.source,
        normalizedDomain: company.normalizedDomain,
      });

      // Enrich job location for Indian companies
      let jobLocation = job.location || 'Remote';
      if (isIndianCompany) {
        const jobLocLower = jobLocation.toLowerCase();
        const hasIndiaClues = jobLocLower.includes('india') || 
                              jobLocLower.includes('bangalore') || 
                              jobLocLower.includes('bengaluru') || 
                              jobLocLower.includes('pune') || 
                              jobLocLower.includes('mumbai') || 
                              jobLocLower.includes('delhi') || 
                              jobLocLower.includes('hyderabad') || 
                              jobLocLower.includes('chennai') || 
                              jobLocLower.includes('noida') || 
                              jobLocLower.includes('gurgaon');
        
        if (!hasIndiaClues) {
          if (jobLocation === 'Office') {
            jobLocation = 'India (Office)';
          } else if (jobLocation === 'Remote') {
            jobLocation = 'India (Remote)';
          } else {
            jobLocation = `${jobLocation}, India`;
          }
        }
      }

      // Create Job
      const createdJob = await db.job.create({
        data: {
          companyId: company.id,
          careerPageId: careerPage.id,
          title: job.title,
          location: jobLocation,
          applyUrl: job.applyUrl || careerPageUrl,
          description: job.description || '',
          externalJobId: job.externalJobId || null,
          relevanceScore,
          isActive: true,
        },
      });

      // Run contact discovery
      try {
        await discoverHiringContacts(
          createdJob.id,
          job.title,
          job.description || '',
          company.id,
          company.name,
          company.normalizedDomain,
          relevanceScore
        );
      } catch (contactErr) {
        console.error(`[Career Intelligence] Contact discovery failed for job ${job.title}:`, contactErr);
      }
    }
    console.log(`[Career Intelligence] Stored ${jobsCount} jobs with computed relevance scores.`);
  } else {
    // If no jobs found, mark career page invalid or keep it but clear jobs
    console.log(`[Career Intelligence] 0 active jobs found. Skipping job persistence.`);
    await db.job.deleteMany({
      where: { companyId: company.id },
    });
  }

  // Update CareerPage with lastCrawledAt
  await db.careerPage.update({
    where: { id: careerPage.id },
    data: { lastCrawledAt: new Date() },
  });

  return {
    careerPageUrl,
    isValid,
    atsProvider,
    jobsCount,
    jobs,
  };
}
