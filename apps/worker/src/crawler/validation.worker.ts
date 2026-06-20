import dns from 'dns';
import { promisify } from 'util';

const resolveA = promisify(dns.resolve4);

/**
 * Normalizes a URL to its base domain (e.g. https://www.supabase.com/blog -> supabase.com)
 */
export function normalizeDomain(url: string): string {
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
export async function validateWebsite(website: string): Promise<boolean> {
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
      console.log(`DNS resolution failed for hostname: ${hostname}`);
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

      // 2xx and 3xx are definitely valid. 
      // 401/403/503 might be valid sites protected by Cloudflare/auth, 
      // so if DNS resolved we can count them as valid.
      // But 404 or connection failures are rejected.
      if (response.status === 404) {
        console.log(`HTTP check failed: 404 Not Found for ${url}`);
        return false;
      }

      return response.status >= 200 && response.status < 400 || (response.status >= 400 && response.status !== 404);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.log(`HTTP request failed for ${url}: ${fetchErr.message || fetchErr}`);
      // If HTTP fails (e.g. SSL error or blocks), but DNS resolved, we can fall back to true, 
      // or false if we want to be strict. Let's be strict: if we can't connect at all, reject.
      return false;
    }
  } catch (err) {
    return false;
  }
}
