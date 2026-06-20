import { db } from '@repo/database';
import { discoveryQueue } from '../discover/discover.service';
import dns from 'dns';
import { promisify } from 'util';

const resolveA = promisify(dns.resolve4);

/**
 * Normalizes a URL to its base domain (e.g. https://www.supabase.com/blog -> supabase.com)
 */
function normalizeDomain(url: string): string {
  try {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname;
  } catch (e) {
    return url
      .replace(/^(https?:\/\/)?(www\.)?/i, '')
      .split('/')[0]
      .toLowerCase()
      .trim();
  }
}

/**
 * Validates whether a website is active and reachable via DNS and HTTP.
 */
async function validateWebsite(website: string): Promise<boolean> {
  try {
    let url = website.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const parsed = new URL(url);
    const hostname = parsed.hostname;

    if (!hostname) {
      return false;
    }

    // 1. Check DNS (A record resolution)
    let dnsResolved = false;
    try {
      const records = await resolveA(hostname);
      if (records && records.length > 0) {
        dnsResolved = true;
      }
    } catch (dnsErr) {
      return false;
    }

    if (!dnsResolved) {
      return false;
    }

    // 2. HTTP Check
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeoutId);

      if (response.status === 404) {
        return false;
      }

      return response.status >= 200 && response.status < 400 || (response.status >= 400 && response.status !== 404);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      return false;
    }
  } catch (err) {
    return false;
  }
}

// Helper to scrape site title using simple regex
async function fetchSiteTitle(url: string, defaultName: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) return defaultName;
    const text = await response.text();
    const match = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match && match[1]) {
      return match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }
    return defaultName;
  } catch (err) {
    console.error('Error fetching site title:', err);
    return defaultName;
  }
}

/**
 * Get paginated list of companies with optional search and filters
 */
export async function getCompanies(params: {
  page?: number;
  limit?: number;
  search?: string;
  source?: string;
  status?: 'PENDING' | 'VALIDATED' | 'REJECTED';
}) {
  const page = params.page || 1;
  const limit = params.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { website: { contains: params.search, mode: 'insensitive' } },
      { industry: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  if (params.source) {
    where.source = params.source;
  }

  if (params.status) {
    where.status = params.status;
  }

  const [items, total] = await Promise.all([
    db.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.company.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get company statistics
 */
export async function getCompanyStats() {
  const [total, validated, rejected, pending, sourcesCount, runsCount] = await Promise.all([
    db.company.count(),
    db.company.count({ where: { status: 'VALIDATED' } }),
    db.company.count({ where: { status: 'REJECTED' } }),
    db.company.count({ where: { status: 'PENDING' } }),
    db.company.groupBy({
      by: ['source'],
      _count: {
        _all: true,
      },
    }),
    db.discoveryRun.count(),
  ]);

  const sources: Record<string, number> = {};
  for (const s of sourcesCount) {
    sources[s.source] = s._count._all;
  }

  return {
    total,
    validated,
    rejected,
    pending,
    sources,
    runsCount,
  };
}

/**
 * Discover/Crawl a single manual URL
 */
export async function discoverCompanyUrl(websiteUrl: string) {
  let url = websiteUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  const domain = normalizeDomain(url);
  if (!domain) {
    throw new Error('Invalid URL format');
  }

  // Deduplication check
  const existing = await db.company.findUnique({
    where: { normalizedDomain: domain },
  });

  if (existing) {
    return {
      status: 'duplicate',
      company: existing,
      message: `Company already exists in the database: ${existing.name}`,
    };
  }

  // Validate website availability
  const isValid = await validateWebsite(url);
  
  // Scrape site title to get a friendly company name, defaulting to domain name
  const rawTitle = await fetchSiteTitle(url, domain);
  let companyName = rawTitle.split(' - ')[0].split(' | ')[0].trim();
  if (companyName.length > 50) {
    companyName = companyName.substring(0, 50);
  }

  const companyStatus = isValid ? 'VALIDATED' : 'REJECTED';

  const company = await db.company.create({
    data: {
      name: companyName,
      website: url,
      normalizedDomain: domain,
      industry: 'Manual Upload',
      source: 'MANUAL',
      status: companyStatus,
    },
  });

  if (!isValid) {
    return {
      status: 'failed_validation',
      company,
      message: `Company added but failed availability validation. Status marked as REJECTED.`,
    };
  }

  // Queue Career Intelligence job to extract and score roles in the background
  try {
    await discoveryQueue.add(
      `discover-ci-manual-${company.id}-${Date.now()}`,
      { companyId: company.id }
    );
  } catch (queueErr: any) {
    console.error(`[Company Service] Failed to queue Career Intelligence job for ${companyName}:`, queueErr.message || queueErr);
  }

  return {
    status: 'success',
    company,
    message: `Successfully crawled and validated company: ${company.name}. Job board queue initialized.`,
  };
}

/**
 * Delete all manual company entries from the database.
 */
export async function deleteManualCompanies() {
  const result = await db.company.deleteMany({ where: { source: 'MANUAL' } });
  return { deletedCount: result.count };
}
