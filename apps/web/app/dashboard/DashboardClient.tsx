'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Terminal as TerminalIcon, 
  User as UserIcon, 
  LogOut, 
  Cpu, 
  Activity, 
  Shield, 
  Briefcase, 
  ExternalLink,
  Search,
  Bell,
  Building,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FolderOpen,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import { User } from '../../lib/auth-server';

interface DashboardClientProps {
  user: User;
}

// Utility to recursively decode escaped HTML entities (like &lt;, &gt;, &quot;, &nbsp;, etc.)
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  let decoded = str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
  
  if (decoded.includes('&lt;') || decoded.includes('&gt;')) {
    decoded = decodeHtmlEntities(decoded);
  }
  return decoded;
}

// Generate a dynamic match explanation based on job details and resume skills
function getMatchExplanation(opp: any, resume: any): string {
  let userSkills: string[] = ['node', 'typescript', 'javascript', 'postgres', 'backend', 'web3', 'express', 'fastify', 'git'];
  if (resume && resume.parsedText) {
    try {
      const parsed = JSON.parse(resume.parsedText);
      if (parsed && parsed.aiProfile && parsed.aiProfile.skills) {
        userSkills = parsed.aiProfile.skills;
      }
    } catch {
      // Plain text
    }
  }

  const title = (opp.title || '').toLowerCase();
  const desc = (opp.description || '').toLowerCase();
  
  const matched: string[] = [];
  userSkills.forEach(skill => {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(title) || regex.test(desc)) {
      matched.push(skill);
    }
  });

  const matchedStr = matched.slice(0, 4).join(', ');
  
  if (matched.length > 0) {
    return `Matches your experience in ${matchedStr}. Highly relevant technical role based on title and skill intersections.`;
  }
  
  return `Surfaced based on backend engineering matching heuristics and general developer alignment.`;
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'companies'>('companies');

  // Responsive UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);

  // Resume states
  const [resume, setResume] = useState<any>(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Companies Directory states
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [companySearch, setCompanySearch] = useState('');
  const [companySourceFilter, setCompanySourceFilter] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

  // Opportunities Directory states
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(true);
  const [oppSearch, setOppSearch] = useState('');
  const [oppLocation, setOppLocation] = useState('');
  const [oppCompanyName, setOppCompanyName] = useState('');
  const [oppSeniority, setOppSeniority] = useState('all');
  const [oppRemoteOnly, setOppRemoteOnly] = useState(false);
  const [oppMinScore, setOppMinScore] = useState('');
  const [oppCurrentPage, setOppCurrentPage] = useState(1);
  const [oppPagination, setOppPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [oppContacts, setOppContacts] = useState<{ [jobId: string]: any[] }>({});
  const [loadingContacts, setLoadingContacts] = useState<{ [jobId: string]: boolean }>({});

  // Company stats
  const [stats, setStats] = useState<any>({ total: 0, validated: 0, rejected: 0, pending: 0, sources: {}, runsCount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Manual crawl URL input
  const [crawlUrlInput, setCrawlUrlInput] = useState('');
  const [submittingCrawl, setSubmittingCrawl] = useState(false);
  const [crawlStatusMessage, setCrawlStatusMessage] = useState<{ text: string; isError: boolean; isSuccess: boolean } | null>(null);

  // Crawler triggers
  const [triggeringCrawler, setTriggeringCrawler] = useState<string | null>(null);

  // Terminal log state
  const [terminalLogs, setTerminalLogs] = useState<Array<{ time: string; type: string; message: string; action?: string }>>([
    { time: '08:30:01', type: 'SYSTEM', message: 'JobRadar Command Center initializing...', action: '[OK]' },
    { time: '08:30:03', type: 'SYSTEM', message: 'Listening for discovery queue notifications on channel company-discovery.' },
    { time: '08:30:05', type: 'SCHEDULER', message: 'Cron loaded for YC, Product Hunt, Wellfound. Trigger scheduled for 9:00 AM daily.' },
  ]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch resume
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const res = await fetch(`${API_URL}/resume`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.resume) {
            setResume(data.resume);
          }
        }
      } catch (err) {
        console.error('Error fetching resume:', err);
      } finally {
        setLoadingResume(false);
      }
    };
    fetchResume();
  }, [API_URL]);

  // Fetch company stats
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${API_URL}/companies/stats`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch companies list
  const fetchCompanies = async (page = 1) => {
    setLoadingCompanies(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search: companySearch,
        source: companySourceFilter,
        status: companyStatusFilter,
      });

      const res = await fetch(`${API_URL}/companies?${query.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setCompanies(data.items || []);
        setPagination(data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Fetch opportunities list
  const fetchOpportunities = async (page = 1) => {
    setLoadingOpportunities(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search: oppSearch,
        remoteOnly: oppRemoteOnly.toString(),
        minScore: oppMinScore,
        location: oppLocation,
        companyName: oppCompanyName,
        seniority: oppSeniority,
      });

      const res = await fetch(`${API_URL}/jobs?${query.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.items || []);
        setOppPagination(data.pagination || { page: 1, limit: 15, total: 0, pages: 1 });
        setOppCurrentPage(page);
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  // Fetch contacts for job ID
  const fetchJobContacts = async (jobId: string) => {
    if (oppContacts[jobId]) return; // already loaded
    setLoadingContacts(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/contacts`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setOppContacts(prev => ({ ...prev, [jobId]: data.contacts || [] }));
      }
    } catch (err) {
      console.error('Error fetching job contacts:', err);
    } finally {
      setLoadingContacts(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const handleOpportunityClick = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      fetchJobContacts(jobId);
    }
  };

  // Trigger initial fetch and filter changes
  useEffect(() => {
    fetchStats();
  }, [API_URL]);

  useEffect(() => {
    fetchCompanies(1);
  }, [API_URL, companySearch, companySourceFilter, companyStatusFilter]);

  useEffect(() => {
    if (resume) {
      fetchOpportunities(1);
    }
  }, [API_URL, oppSearch, oppRemoteOnly, oppMinScore, oppLocation, oppCompanyName, oppSeniority, activeTab, resume]);

  // Handle manual URL crawling submit
  const handleCrawlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crawlUrlInput.trim()) return;

    setSubmittingCrawl(true);
    setCrawlStatusMessage(null);

    const now = new Date().toTimeString().split(' ')[0];
    setTerminalLogs(prev => [
      ...prev,
      { time: now, type: 'OPERATOR', message: `Initializing manual crawl portal for URL: "${crawlUrlInput}"...` }
    ]);

    try {
      const res = await fetch(`${API_URL}/companies/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: crawlUrlInput }),
        credentials: 'include',
      });

      const data = await res.json();
      const actionTime = new Date().toTimeString().split(' ')[0];

      if (res.status === 200) {
        setCrawlStatusMessage({ text: data.message, isError: false, isSuccess: true });
        setCrawlUrlInput('');
        
        setTerminalLogs(prev => [
          ...prev,
          { time: actionTime, type: 'VALIDATOR', message: `Crawled site name: "${data.company.name}". Normalized Domain: ${data.company.normalizedDomain}.`, action: '[OK]' }
        ]);

        // Refresh list and stats
        fetchStats();
        fetchCompanies(1);
      } else if (res.status === 409) {
        // Duplicate
        setCrawlStatusMessage({ text: data.message, isError: true, isSuccess: false });
        setTerminalLogs(prev => [
          ...prev,
          { time: actionTime, type: 'DEDUPLICATOR', message: `Domain "${data.company.normalizedDomain}" already exists. Crawl skipped.`, action: '[SKIP]' }
        ]);
      } else if (res.status === 422) {
        // Validation failed
        setCrawlStatusMessage({ text: data.message, isError: true, isSuccess: false });
        setTerminalLogs(prev => [
          ...prev,
          { time: actionTime, type: 'VALIDATOR', message: `Domain validation failed for website: "${data.company.website}". Added as REJECTED.`, action: '[REJECT]' }
        ]);
        fetchStats();
        fetchCompanies(1);
      } else {
        throw new Error(data.message || 'Crawl request failed.');
      }
    } catch (err: any) {
      console.error('Manual crawl error:', err);
      setCrawlStatusMessage({ text: err.message || 'Failed to crawl URL.', isError: true, isSuccess: false });
      const failTime = new Date().toTimeString().split(' ')[0];
      setTerminalLogs(prev => [
        ...prev,
        { time: failTime, type: 'OPERATOR', message: `Manual URL crawl failed: ${err.message || 'Unknown network error'}.`, action: '[FAIL]' }
      ]);
    } finally {
      setSubmittingCrawl(false);
    }
  };

  // Handle trigger background discovery runs
  const handleTriggerDiscovery = async (
    source?:
      | 'YC'
      | 'PRODUCT_HUNT'
      | 'WELLFOUND'
      | 'REMOTE_CO'
      | 'REMOTE_OK'
      | 'WE_WORK_REMOTELY'
      | 'CUTSHORT'
      | 'FOUNDIT'
      | 'LINKEDIN'
      | 'NAUKRI'
      | 'INDEED'
  ) => {
    const targetSource = source || 'ALL';
    setTriggeringCrawler(targetSource);

    const now = new Date().toTimeString().split(' ')[0];
    setTerminalLogs(prev => [
      ...prev,
      { time: now, type: 'OPERATOR', message: `Manual trigger command issued: DISCOVER_${targetSource}...` }
    ]);

    try {
      const res = await fetch(`${API_URL}/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(source ? { source } : {}),
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Discovery command rejected by queue controller.');
      }

      const data = await res.json();
      const completeTime = new Date().toTimeString().split(' ')[0];

      setTerminalLogs(prev => [
        ...prev,
        { 
          time: completeTime, 
          type: 'DISCOVERY', 
          message: `Run complete. Found: ${data.companiesFound}, Added: ${data.companiesAdded}, Duplicates: ${data.duplicates}, Failures: ${data.failures}`,
          action: '[OK]' 
        }
      ]);

      // Refresh data
      fetchStats();
      fetchCompanies(1);
    } catch (err: any) {
      console.error('Trigger discovery error:', err);
      const failTime = new Date().toTimeString().split(' ')[0];
      setTerminalLogs(prev => [
        ...prev,
        { time: failTime, type: 'DISCOVERY', message: `Command failed: ${err.message || 'Unknown error'}.`, action: '[FAIL]' }
      ]);
    } finally {
      setTriggeringCrawler(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF resumes are supported.');
      return;
    }

    setError(null);
    setUploading(true);

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    setTerminalLogs(prev => [
      ...prev,
      { time: timeStr, type: 'OPERATOR', message: `Initializing upload sequence for "${file.name}"...` }
    ]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/resume/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await res.json();
      setResume(data.resume);

      const successTime = new Date().toTimeString().split(' ')[0];
      setTerminalLogs(prev => [
        ...prev,
        { time: successTime, type: 'OPERATOR', message: `Resume parsed and stored. Path: ${data.resume.fileUrl}.`, action: '[OK]' }
      ]);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload resume.');
      
      const failTime = new Date().toTimeString().split(' ')[0];
      setTerminalLogs(prev => [
        ...prev,
        { time: failTime, type: 'OPERATOR', message: `Upload failed: ${err.message || 'Unknown error'}.`, action: '[FAIL]' }
      ]);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authClient.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-canvas overflow-hidden relative">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] min-w-[260px] bg-surface border-r border-border-subtle flex flex-col p-4 overflow-y-auto transition-transform duration-200 ease-in-out transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:relative lg:translate-x-0 lg:flex`}>
        <div className="font-mono text-sm font-semibold tracking-wider flex items-center justify-between pb-4 border-b border-border-subtle text-ink-primary">
          <div className="flex items-center gap-2">
            <TerminalIcon size={16} className="text-accent-system" />
            <span>JOBRADAR // CMD_CTR</span>
          </div>
          {/* Mobile close button */}
          <button 
            className="lg:hidden text-ink-secondary hover:text-ink-primary cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* User Identity block */}
        <div className="flex items-center gap-2.5 py-4 border-b border-border-subtle">
          <div className="w-8 h-8 rounded-[4px] bg-canvas border border-border-subtle flex items-center justify-center text-ink-secondary">
            <UserIcon size={14} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="font-semibold text-ink-primary truncate">{user.name || 'Operator'}</div>
            <div className="text-[11px] text-ink-secondary font-mono break-all leading-tight">{user.email}</div>
          </div>
        </div>

        {/* Operator Resume Section */}
        <div className="py-4 border-b border-border-subtle">
          <div className="font-mono text-[10px] tracking-widest text-ink-secondary mb-3">OPERATOR RESUME</div>
          {loadingResume ? (
            <div className="font-mono text-[11px] text-ink-secondary animate-pulse">RETRIEVING PROFILE...</div>
          ) : resume ? (
            <div className="border border-border-subtle bg-canvas rounded-[4px] p-2.5 flex flex-col gap-2">
              <div className="flex justify-between items-center font-mono text-[11px]">
                <span className="text-ink-secondary">STATUS:</span>
                <span className="text-[9px] py-0.5 px-1.5 rounded-[3px] font-bold bg-accent-match/10 text-accent-match border border-accent-match/20">ACTIVE</span>
              </div>
              <div className="font-mono text-[10px]">
                <div className="text-ink-primary truncate max-w-full" title={resume.fileUrl.split('/').pop()?.replace(/^[a-f0-9-]+_/, '')}>
                  {resume.fileUrl.split('/').pop()?.replace(/^[a-f0-9-]+_/, '') || 'resume.pdf'}
                </div>
                <div className="text-ink-secondary mt-0.5">
                  PARSED: {new Date(resume.createdAt).toLocaleDateString()}
                </div>
              </div>
              <label className="flex items-center justify-center w-full py-1.5 border border-border-subtle rounded-[4px] font-mono text-[10px] text-ink-secondary bg-surface cursor-pointer hover:bg-surface-hover hover:text-ink-primary hover:border-ink-secondary transition-all duration-150 text-center">
                <span>{uploading ? 'PARSING DATA...' : 'REPLACE PDF PORT'}</span>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
          ) : (
            <div className="border border-dashed border-border-subtle rounded-[4px] p-3 text-center bg-canvas flex flex-col items-center gap-1.5">
              <p className="font-mono text-[11px] font-bold text-accent-warn">NO RESUME INJECTED</p>
              <span className="text-[10px] text-ink-secondary leading-tight">Provide PDF to enable semantic matching.</span>
              <label className="inline-block mt-1 py-1.5 px-3 border border-border-subtle rounded-[4px] font-mono text-[10px] text-ink-primary bg-surface cursor-pointer hover:bg-surface-hover hover:border-ink-secondary transition-all duration-150">
                {uploading ? 'PARSING DATA...' : 'INJECT PDF RESUME'}
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
          {error && <div className="font-mono text-[10px] text-red-500 mt-1.5 break-all">{error}</div>}
        </div>

        {/* Navigation / Monitors */}
        <div className="py-4 border-b border-border-subtle">
          <div className="font-mono text-[10px] tracking-widest text-ink-secondary mb-3">DISCOVERY CRAWLERS</div>
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
            {([
              { id: 'YC', label: 'YC Directory' },
              { id: 'PRODUCT_HUNT', label: 'Product Hunt' },
              { id: 'WELLFOUND', label: 'Wellfound' },
              { id: 'REMOTE_CO', label: 'Remote.co' },
              { id: 'REMOTE_OK', label: 'RemoteOK' },
              { id: 'WE_WORK_REMOTELY', label: 'WeWorkRemotely' },
              { id: 'CUTSHORT', label: 'Cutshort' },
              { id: 'FOUNDIT', label: 'Foundit' },
              { id: 'LINKEDIN', label: 'LinkedIn' },
              { id: 'NAUKRI', label: 'Naukri' },
              { id: 'INDEED', label: 'Indeed' },
            ] as const).map((crawler) => (
              <div key={crawler.id} className="flex justify-between items-center font-mono text-[11px]">
                <span className="text-ink-primary flex items-center gap-1"><Cpu size={11} /> {crawler.label}</span>
                <button 
                  onClick={() => handleTriggerDiscovery(crawler.id)}
                  disabled={triggeringCrawler !== null}
                  className="text-[9px] py-0.5 px-1.5 border border-border-subtle rounded-[3px] bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary"
                >
                  {triggeringCrawler === crawler.id ? 'RUNNING...' : 'TRIGGER'}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button 
              onClick={() => handleTriggerDiscovery()}
              disabled={triggeringCrawler !== null}
              className="w-full py-1.5 border border-dashed border-accent-system/35 rounded-[4px] font-mono text-[10px] text-accent-system bg-accent-system/5 hover:bg-accent-system/10 hover:text-ink-primary transition-all duration-150"
            >
              {triggeringCrawler === 'ALL' ? 'RUNNING GLOBAL RUN...' : '⚡ CRAWL ALL SOURCES'}
            </button>
          </div>
        </div>

        <div className="py-4 border-b border-border-subtle">
          <div className="font-mono text-[10px] tracking-widest text-ink-secondary mb-3">SYSTEM HEALTH</div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-primary">
              <Activity size={12} />
              <span>DB Connection</span>
            </div>
            <div className="text-[9px] py-0.5 px-1.5 rounded-[3px] font-bold bg-accent-match/10 text-accent-match border border-accent-match/20">ACTIVE</div>
          </div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-primary">
              <Shield size={12} />
              <span>Queue Host (Redis)</span>
            </div>
            <div className="text-[9px] py-0.5 px-1.5 rounded-[3px] font-bold bg-accent-match/10 text-accent-match border border-accent-match/20">ONLINE</div>
          </div>
        </div>

        {/* Live stats sidebar block */}
        <div className="py-4 border-b border-border-subtle">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-[10px] tracking-widest text-ink-secondary">LIVE STATS</span>
            <button onClick={fetchStats} className="text-ink-secondary hover:text-ink-primary">
              <RefreshCw size={10} className={loadingStats ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex justify-between mb-1.5 font-mono text-[11px]">
            <span className="text-ink-secondary">COMPANIES_TOTAL:</span>
            <span className="text-ink-primary font-bold">{stats.total}</span>
          </div>
          <div className="flex justify-between mb-1.5 font-mono text-[11px]">
            <span className="text-ink-secondary">VALIDATED:</span>
            <span className="text-accent-match font-bold">{stats.validated}</span>
          </div>
          <div className="flex justify-between mb-1.5 font-mono text-[11px]">
            <span className="text-ink-secondary">REJECTED_DEAD:</span>
            <span className="text-accent-warn font-bold">{stats.rejected}</span>
          </div>
          <div className="flex justify-between mb-1.5 font-mono text-[11px]">
            <span className="text-ink-secondary">DISCOVER_RUNS:</span>
            <span className="text-ink-primary">{stats.runsCount}</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-auto pt-4">
          <button 
            className="flex items-center justify-center gap-2 w-full py-2 px-3 border border-border-subtle rounded-[6px] font-mono text-[11px] text-ink-secondary bg-canvas hover:bg-surface-hover hover:text-ink-primary hover:border-ink-secondary transition-all duration-150" 
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={13} />
            <span>{loggingOut ? 'DISCONNECTING...' : 'DISCONNECT SESSION'}</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-canvas">
        {/* View Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-6 border-b border-border-subtle bg-surface">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              {/* Sidebar toggle button */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-1.5 border border-border-subtle rounded-[6px] bg-canvas text-ink-secondary hover:text-ink-primary hover:bg-surface-hover cursor-pointer"
              >
                <Menu size={16} />
              </button>
              <div className="flex flex-col">
                <h1 className="text-sm sm:text-base font-bold text-ink-primary tracking-tight">JOBRADAR // CENTRAL_COMMAND</h1>
                <p className="text-[10px] sm:text-xs text-ink-secondary mt-0.5 hidden sm:block">AI-categorized high-fidelity opportunities and company discovery databases</p>
              </div>
            </div>
            
            {/* Refresh button mobile */}
            <button 
              onClick={() => { fetchStats(); fetchCompanies(1); fetchOpportunities(1); }} 
              className="md:hidden w-7 h-7 border border-border-subtle rounded-[6px] flex items-center justify-center text-ink-secondary bg-canvas hover:text-ink-primary hover:bg-surface-hover cursor-pointer"
            >
              <RefreshCw size={12} />
            </button>
          </div>
          
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full md:w-auto">
            <div className="flex border border-border-subtle bg-canvas rounded-[6px] p-0.5 w-full sm:w-auto">
              <button 
                onClick={() => setActiveTab('companies')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 font-mono text-xs rounded-[4px] transition-all duration-150 ${activeTab === 'companies' ? 'bg-surface-hover text-ink-primary font-bold' : 'text-ink-secondary hover:text-ink-primary'}`}
              >
                <Building size={12} />
                <span className="hidden xs:inline">COMPANIES</span>
                <span className="xs:hidden">COMP</span>
                <span>({stats.total})</span>
              </button>
              <button 
                onClick={() => setActiveTab('opportunities')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 font-mono text-xs rounded-[4px] transition-all duration-150 ${activeTab === 'opportunities' ? 'bg-surface-hover text-ink-primary font-bold' : 'text-ink-secondary hover:text-ink-primary'}`}
              >
                <Briefcase size={12} />
                <span className="hidden xs:inline">OPPORTUNITIES</span>
                <span className="xs:hidden">OPPS</span>
                <span>({oppPagination.total})</span>
              </button>
            </div>
            <button 
              onClick={() => { fetchStats(); fetchCompanies(1); fetchOpportunities(1); }} 
              className="hidden md:flex w-7 h-7 border border-border-subtle rounded-[6px] items-center justify-center text-ink-secondary bg-canvas hover:text-ink-primary hover:bg-surface-hover cursor-pointer"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </header>

        {/* Scrollable Feed */}
        <div className="flex-1 flex flex-col py-5 px-6 overflow-y-auto">
          {activeTab === 'companies' ? (
            /* COMPANIES TAB */
            <div className="flex flex-col gap-4 flex-1">
              
              {/* Manual URL Ingestion Area */}
              <div className="bg-surface border border-border-subtle rounded-[6px] p-4">
                <div className="font-mono text-xs font-semibold text-ink-primary mb-2 flex items-center gap-1.5">
                  <Plus size={14} className="text-accent-system" />
                  <span>MANUAL COMPANY INGESTION PORTAL</span>
                </div>
                <form onSubmit={handleCrawlSubmit} className="flex flex-col sm:flex-row gap-2.5">
                  <input 
                    type="text" 
                    placeholder="Enter website url to crawl (e.g. supabase.com)..."
                    value={crawlUrlInput}
                    onChange={(e) => setCrawlUrlInput(e.target.value)}
                    disabled={submittingCrawl}
                    className="flex-1 bg-canvas border border-border-subtle rounded-[6px] px-3 py-1.5 text-xs text-ink-primary focus:outline-none focus:border-accent-system transition-colors"
                  />
                  <button 
                    type="submit" 
                    disabled={submittingCrawl || !crawlUrlInput.trim()}
                    className="px-4 py-1.5 bg-canvas border border-border-subtle hover:border-accent-system text-ink-primary rounded-[6px] font-mono text-xs font-semibold hover:bg-surface-hover transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {submittingCrawl ? 'CRAWLING...' : 'INJECT & CRAWL'}
                  </button>
                </form>
                {crawlStatusMessage && (
                  <div className={`mt-2 font-mono text-[11px] flex items-center gap-1 ${crawlStatusMessage.isError ? 'text-accent-warn' : 'text-accent-match'}`}>
                    {crawlStatusMessage.isError ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                    <span>{crawlStatusMessage.text}</span>
                  </div>
                )}
              </div>

              {/* Company Directory List & Filters */}
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                  {/* Filters */}
                  <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto">
                    <div className="relative flex items-center flex-grow sm:flex-grow-0 min-w-[180px]">
                      <Search size={12} className="absolute left-2.5 text-ink-secondary" />
                      <input 
                        type="text" 
                        placeholder="Search directory..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="bg-surface border border-border-subtle rounded-[6px] py-1 px-3 pl-8 text-xs text-ink-primary w-full sm:w-[180px] sm:focus:w-[220px] focus:outline-none focus:border-accent-system transition-all"
                      />
                    </div>
                    
                    {/* Source selection */}
                    <select
                      value={companySourceFilter}
                      onChange={(e) => setCompanySourceFilter(e.target.value)}
                      className="bg-surface border border-border-subtle rounded-[6px] py-1 px-2.5 text-xs text-ink-primary focus:outline-none cursor-pointer flex-grow sm:flex-grow-0"
                    >
                      <option value="">ALL SOURCES</option>
                      <option value="YC">YC STARTUPS</option>
                      <option value="PRODUCT_HUNT">PRODUCT HUNT</option>
                      <option value="WELLFOUND">WELLFOUND</option>
                      <option value="REMOTE_CO">REMOTE.CO</option>
                      <option value="REMOTE_OK">REMOTEOK</option>
                      <option value="WE_WORK_REMOTELY">WE WORK REMOTELY</option>
                      <option value="CUTSHORT">CUTSHORT</option>
                      <option value="FOUNDIT">FOUNDIT</option>
                      <option value="LINKEDIN">LINKEDIN</option>
                      <option value="NAUKRI">NAUKRI</option>
                      <option value="INDEED">INDEED</option>
                      <option value="MANUAL">MANUAL ENTRIES</option>
                    </select>

                    {/* Status selection */}
                    <select
                      value={companyStatusFilter}
                      onChange={(e) => setCompanyStatusFilter(e.target.value)}
                      className="bg-surface border border-border-subtle rounded-[6px] py-1 px-2.5 text-xs text-ink-primary focus:outline-none cursor-pointer flex-grow sm:flex-grow-0"
                    >
                      <option value="">ALL STATUSES</option>
                      <option value="VALIDATED">VALIDATED (ACTIVE)</option>
                      <option value="REJECTED">REJECTED (DEAD)</option>
                    </select>
                  </div>

                  {/* Summary count */}
                  <div className="font-mono text-[10px] text-ink-secondary w-full sm:w-auto text-right sm:text-left">
                    SHOWING {companies.length} OF {pagination.total} ENTRIES
                  </div>
                </div>

                {/* Companies Table / Grid */}
                <div className="flex-1 border border-border-subtle rounded-[6px] bg-surface overflow-hidden flex flex-col">
                  {loadingCompanies ? (
                    <div className="p-12 text-center text-ink-secondary font-mono text-xs flex-1 flex items-center justify-center">
                      <span className="animate-pulse">QUERYING RELATIONAL DATABASE...</span>
                    </div>
                  ) : companies.length > 0 ? (
                    <div className="flex-1 flex flex-col overflow-y-auto">
                      {/* Desktop Table View (>= lg) */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border-subtle bg-canvas/30 font-mono text-ink-secondary text-[11px]">
                              <th className="p-3 font-semibold w-[60px]">SR NO</th>
                              <th className="p-3 font-semibold">COMPANY NAME</th>
                              <th className="p-3 font-semibold">WEBSITE PORT</th>
                              <th className="p-3 font-semibold">INDUSTRY</th>
                              <th className="p-3 font-semibold">SOURCE</th>
                              <th className="p-3 font-semibold">STATUS</th>
                              <th className="p-3 font-semibold">DATE ADDED</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-subtle">
                            {companies.map((company, index) => (
                              <tr key={company.id} className="hover:bg-bg-hover transition-colors">
                                <td className="p-3 font-mono text-ink-secondary">
                                  {String((currentPage - 1) * (pagination.limit || 15) + index + 1).padStart(2, '0')}
                                </td>
                                <td className="p-3 font-semibold text-ink-primary">{company.name}</td>
                                <td className="p-3 font-mono text-accent-system">
                                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                    <span>{company.normalizedDomain}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </td>
                                <td className="p-3 text-ink-secondary truncate max-w-[200px]" title={company.industry}>
                                  {company.industry || '—'}
                                </td>
                                <td className="p-3 font-mono">
                                  <span className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold ${
                                    company.source === 'YC' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                    company.source === 'PRODUCT_HUNT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                    company.source === 'WELLFOUND' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                    company.source === 'REMOTE_CO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    company.source === 'REMOTE_OK' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                                    company.source === 'WE_WORK_REMOTELY' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                    company.source === 'CUTSHORT' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                                    company.source === 'FOUNDIT' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                    company.source === 'LINKEDIN' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    company.source === 'NAUKRI' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                    company.source === 'INDEED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                    'bg-accent-system/10 text-indigo-400 border border-accent-system/20'
                                  }`}>
                                    {company.source}
                                  </span>
                                </td>
                                <td className="p-3 font-mono">
                                  {company.status === 'VALIDATED' ? (
                                    <span className="flex items-center gap-1 text-accent-match">
                                      <CheckCircle size={10} />
                                      <span>VALID</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-accent-warn" title="Failed http/dns availability checks">
                                      <XCircle size={10} />
                                      <span>REJECTED</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-ink-secondary font-mono text-[11px]">
                                  {new Date(company.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card List View (< lg) */}
                      <div className="lg:hidden divide-y divide-border-subtle p-3 flex flex-col gap-3 overflow-y-auto">
                        {companies.map((company, index) => (
                          <div key={company.id} className="pt-3 first:pt-0 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-[10px] text-ink-secondary">
                                  SR NO: {String((currentPage - 1) * (pagination.limit || 15) + index + 1).padStart(2, '0')}
                                </span>
                                <h3 className="text-xs font-bold text-ink-primary">{company.name}</h3>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded-[3px] text-[9px] font-bold font-mono ${
                                company.source === 'YC' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                company.source === 'PRODUCT_HUNT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                company.source === 'WELLFOUND' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                company.source === 'REMOTE_CO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                company.source === 'REMOTE_OK' ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20' :
                                company.source === 'WE_WORK_REMOTELY' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                company.source === 'CUTSHORT' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                                company.source === 'FOUNDIT' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                company.source === 'LINKEDIN' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                company.source === 'NAUKRI' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                company.source === 'INDEED' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                'bg-accent-system/10 text-indigo-400 border border-accent-system/20'
                              }`}>
                                {company.source}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-1">
                              <div>
                                <span className="text-ink-secondary block text-[9px] uppercase">Website Port:</span>
                                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-accent-system hover:underline inline-flex items-center gap-0.5">
                                  <span>{company.normalizedDomain}</span>
                                  <ExternalLink size={9} />
                                </a>
                              </div>
                              <div>
                                <span className="text-ink-secondary block text-[9px] uppercase">Industry:</span>
                                <span className="text-ink-primary truncate block">{company.industry || '—'}</span>
                              </div>
                              <div>
                                <span className="text-ink-secondary block text-[9px] uppercase">Status:</span>
                                {company.status === 'VALIDATED' ? (
                                  <span className="flex items-center gap-0.5 text-accent-match">
                                    <CheckCircle size={9} />
                                    <span>VALID</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5 text-accent-warn">
                                    <XCircle size={9} />
                                    <span>REJECTED</span>
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-ink-secondary block text-[9px] uppercase">Date Added:</span>
                                <span className="text-ink-primary">{new Date(company.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-ink-secondary font-mono text-xs flex-1 flex flex-col items-center justify-center">
                      <FolderOpen size={24} className="mb-2 text-border-subtle" />
                      <span>NO COMPANIES DISCOVERED CORRESPONDING TO THE SPECIFIED CRITERIA.</span>
                    </div>
                  )}
                  {/* Pagination Controls */}
                  <div className="mt-auto border-t border-border-subtle p-3 flex justify-between items-center bg-canvas/20">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => fetchCompanies(1)}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:enabled:text-ink-primary hover:enabled:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        [START]
                      </button>
                      <button
                        onClick={() => fetchCompanies(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:enabled:text-ink-primary hover:enabled:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        [PREV_PORT]
                      </button>
                    </div>
                    <span className="font-mono text-xs text-ink-secondary">
                      SECTOR {currentPage} / {pagination.pages || 1}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => fetchCompanies(currentPage + 1)}
                        disabled={currentPage === (pagination.pages || 1)}
                        className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:enabled:text-ink-primary hover:enabled:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        [NEXT_PORT]
                      </button>
                      <button
                        onClick={() => fetchCompanies(pagination.pages || 1)}
                        disabled={currentPage === (pagination.pages || 1)}
                        className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:enabled:text-ink-primary hover:enabled:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        [END]
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* OPPORTUNITIES TAB */
            <div className="flex flex-col gap-4 flex-1">
              {loadingResume ? (
                <div className="p-12 text-center text-ink-secondary font-mono text-xs flex-1 flex items-center justify-center border border-border-subtle rounded-[6px] bg-surface">
                  <span className="animate-pulse">DECRYPTING SECURITY PROFILE...</span>
                </div>
              ) : uploading ? (
                <div className="flex-1 border border-border-subtle rounded-[6px] bg-surface flex flex-col items-center justify-center p-8 max-w-lg mx-auto my-12 text-center font-mono">
                  <RefreshCw size={36} className="text-accent-system animate-spin mb-4" />
                  <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider mb-2">
                    GEMINI COGNITIVE PARSING IN PROGRESS
                  </h3>
                  <div className="w-full max-w-xs bg-canvas border border-border-subtle h-2.5 rounded-full overflow-hidden mb-4 p-[1px] relative">
                    <div className="bg-accent-system h-full rounded-full animate-pulse w-[75%]" />
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-relaxed">
                    Parsing PDF contents, evaluating developer experience vector, and extracting structured skills indices via Google AI Studio. Please stand by...
                  </p>
                </div>
              ) : !resume ? (
                <div className="flex-1 border border-dashed border-border-subtle rounded-[6px] bg-surface flex flex-col items-center justify-center p-8 max-w-lg mx-auto my-12 text-center">
                  <Briefcase size={36} className="text-accent-warn mb-4" />
                  <h3 className="font-mono text-sm font-bold text-ink-primary uppercase tracking-wider mb-2">
                    RELEVANCE VECTOR NOT INITIALIZED
                  </h3>
                  <p className="text-xs text-ink-secondary leading-relaxed mb-6">
                    In order to match and display opportunities, you must inject your PDF resume. Our career intelligence matrix will parse your skills to dynamically score and prioritize backend & Web3 roles.
                  </p>
                  
                  <label className="flex items-center justify-center gap-2 py-2 px-6 border border-border-subtle hover:border-accent-system bg-canvas text-ink-primary rounded-[6px] font-mono text-xs font-semibold cursor-pointer hover:bg-surface-hover transition-all duration-150">
                    <span>{uploading ? 'PARSING PROFILE...' : 'INJECT PDF RESUME'}</span>
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      onChange={handleFileUpload} 
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                  </label>
                  
                  {error && <div className="font-mono text-[10px] text-red-500 mt-3 max-w-xs break-all">{error}</div>}
                </div>
              ) : (
                <>
              
              {/* Opportunities Filters */}
              <div className="flex flex-col gap-2 mb-2 border-b border-border-subtle/30 pb-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex gap-2 items-center flex-1 sm:flex-initial">
                    {/* Search opportunities */}
                    <div className="relative flex items-center flex-1 sm:flex-initial min-w-[140px]">
                      <Search size={12} className="absolute left-2.5 text-ink-secondary" />
                      <input 
                        type="text" 
                        placeholder="Search roles..."
                        value={oppSearch}
                        onChange={(e) => setOppSearch(e.target.value)}
                        className="bg-surface border border-border-subtle rounded-[6px] py-1 px-3 pl-8 text-xs text-ink-primary w-full sm:w-[140px] sm:focus:w-[170px] focus:outline-none focus:border-accent-system transition-all"
                      />
                    </div>

                    {/* Filters Toggle for Mobile */}
                    <button 
                      type="button"
                      onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                      className="lg:hidden px-2.5 py-1.5 bg-surface border border-border-subtle rounded-[6px] text-xs font-mono text-ink-primary flex items-center gap-1.5 hover:bg-surface-hover cursor-pointer"
                    >
                      <SlidersHorizontal size={12} className="text-accent-system" />
                      <span>{isFiltersExpanded ? 'HIDE' : 'FILTERS'}</span>
                    </button>
                  </div>

                  {/* Counter */}
                  <div className="font-mono text-[10px] text-ink-secondary">
                    SHOWING {opportunities.length} OF {oppPagination.total} TARGETS
                  </div>
                </div>

                {/* Secondary Filters Grid */}
                <div className={`${isFiltersExpanded ? 'flex flex-col sm:grid sm:grid-cols-2 gap-2 mt-1' : 'hidden'} lg:flex lg:flex-row lg:items-center lg:gap-2 lg:flex-wrap lg:mt-0`}>
                  {/* Location Filter */}
                  <input 
                    type="text" 
                    placeholder="Location (e.g. India)..."
                    value={oppLocation}
                    onChange={(e) => setOppLocation(e.target.value)}
                    className="bg-surface border border-border-subtle rounded-[6px] py-1 px-3 text-xs text-ink-primary w-full lg:w-[140px] focus:outline-none focus:border-accent-system transition-all"
                  />

                  {/* Company Filter */}
                  <input 
                    type="text" 
                    placeholder="Company..."
                    value={oppCompanyName}
                    onChange={(e) => setOppCompanyName(e.target.value)}
                    className="bg-surface border border-border-subtle rounded-[6px] py-1 px-3 text-xs text-ink-primary w-full lg:w-[120px] focus:outline-none focus:border-accent-system transition-all"
                  />

                  {/* Seniority Filter */}
                  <select
                    value={oppSeniority}
                    onChange={(e) => setOppSeniority(e.target.value)}
                    className="bg-surface border border-border-subtle rounded-[6px] py-1 px-2.5 text-xs text-ink-primary focus:outline-none cursor-pointer w-full lg:w-auto"
                  >
                    <option value="all">ALL SENIORITIES</option>
                    <option value="entry">ENTRY LEVEL / JUNIOR</option>
                    <option value="senior">SENIOR / LEAD</option>
                  </select>

                  {/* Score Filter */}
                  <select
                    value={oppMinScore}
                    onChange={(e) => setOppMinScore(e.target.value)}
                    className="bg-surface border border-border-subtle rounded-[6px] py-1 px-2.5 text-xs text-ink-primary focus:outline-none cursor-pointer w-full lg:w-auto"
                  >
                    <option value="">ALL SCORES</option>
                    <option value="85">HIGH PRIORITY (85%+)</option>
                    <option value="60">MID MATCH (60%+)</option>
                    <option value="40">LOW MATCH (40%+)</option>
                  </select>

                  {/* Remote Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-ink-secondary hover:text-ink-primary py-1.5 px-2.5 bg-surface/30 border border-border-subtle rounded-[6px] lg:border-transparent lg:bg-transparent">
                    <input 
                      type="checkbox"
                      checked={oppRemoteOnly}
                      onChange={(e) => setOppRemoteOnly(e.target.checked)}
                      className="rounded-[3px] bg-surface border-border-subtle accent-accent-system focus:ring-0 cursor-pointer"
                    />
                    <span>REMOTE ONLY</span>
                  </label>
                </div>
              </div>

              {/* Opportunities List Container */}
              <div className="flex-1 flex flex-col">
                {loadingOpportunities ? (
                  <div className="p-12 text-center text-ink-secondary font-mono text-xs flex-1 flex items-center justify-center border border-border-subtle rounded-[6px] bg-surface">
                    <span className="animate-pulse">PARSING HIGH-FIDELITY MATCH VECTOR INDEX...</span>
                  </div>
                ) : opportunities.length > 0 ? (
                  <div className="flex-1 border border-border-subtle rounded-[6px] bg-surface overflow-hidden flex flex-col">
                    <div className="flex-1 flex flex-col overflow-y-auto">
                      {/* Desktop Table View (>= lg) */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border-subtle bg-canvas/30 font-mono text-ink-secondary text-[11px]">
                              <th className="p-3 font-semibold w-[60px]">SR NO</th>
                              <th className="p-3 font-semibold">ROLE TITLE</th>
                              <th className="p-3 font-semibold">COMPANY</th>
                              <th className="p-3 font-semibold">LOCATION</th>
                              <th className="p-3 font-semibold">RELEVANCE MATCH</th>
                              <th className="p-3 font-semibold text-right">ACTION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-subtle">
                            {opportunities.map((opp, index) => (
                              <React.Fragment key={opp.id}>
                                <tr 
                                  onClick={() => handleOpportunityClick(opp.id)}
                                  className={`hover:bg-bg-hover transition-colors cursor-pointer select-none ${expandedJobId === opp.id ? 'bg-bg-hover' : ''}`}
                                >
                                  <td className="p-3 font-mono text-ink-secondary">
                                    {String((oppCurrentPage - 1) * (oppPagination.limit || 15) + index + 1).padStart(2, '0')}
                                  </td>
                                  <td className="p-3 font-semibold text-ink-primary">
                                    <span>{opp.title}</span>
                                  </td>
                                  <td className="p-3 font-mono text-ink-secondary">
                                    <a 
                                      href={opp.company.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="hover:underline hover:text-accent-system flex items-center gap-0.5"
                                      onClick={(e) => e.stopPropagation()} // Prevent expansion when clicking external link
                                    >
                                      <span>{opp.company.name}</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  </td>
                                  <td className="p-3 font-mono">
                                    <span className="bg-canvas border border-border-subtle px-1.5 py-0.5 rounded-[3px]">
                                      {opp.location || 'Remote'}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono">
                                    <span className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold border ${
                                      opp.relevanceScore >= 85 ? 'bg-accent-match/10 text-accent-match border-accent-match/20' :
                                      opp.relevanceScore >= 60 ? 'bg-accent-warn/10 text-accent-warn border-accent-warn/20' :
                                      'bg-canvas text-ink-secondary border-border-subtle'
                                    }`}>
                                      {opp.relevanceScore}% MATCH
                                    </span>
                                  </td>
                                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    <a 
                                      href={opp.applyUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex px-2 py-1 border border-border-subtle hover:border-accent-system text-ink-primary rounded-[4px] font-mono text-[10px] bg-canvas hover:bg-surface-hover transition-all items-center gap-1 cursor-pointer"
                                    >
                                      <span>APPLY_PORT</span>
                                      <ExternalLink size={10} />
                                    </a>
                                  </td>
                                </tr>
                                {expandedJobId === opp.id && (
                                  <tr className="bg-canvas/40">
                                    <td colSpan={6} className="p-4 border-b border-border-subtle">
                                      <div 
                                        className="grid grid-cols-1 md:grid-cols-5 gap-4"
                                        onClick={(e) => e.stopPropagation()} // Prevent collapse when clicking details content
                                      >
                                        {/* Job Description (Left 3 columns) */}
                                        <div className="md:col-span-3 border-r border-border-subtle pr-4">
                                          <style dangerouslySetInnerHTML={{ __html: `
                                            .description-html p { margin-bottom: 8px; }
                                            .description-html ul { list-style-type: disc; padding-left: 16px; margin-bottom: 8px; }
                                            .description-html ol { list-style-type: decimal; padding-left: 16px; margin-bottom: 8px; }
                                            .description-html li { margin-bottom: 4px; }
                                            .description-html strong { color: var(--text-primary); font-weight: 600; }
                                            .description-html a { color: var(--accent-system); text-decoration: underline; }
                                          `}} />
                                          <div className="font-bold text-ink-primary mb-2 text-[11px] tracking-wider uppercase flex justify-between items-center">
                                            <span>JOB DESCRIPTION DETAILS & SPECIFICATIONS:</span>
                                          </div>
                                          <div className="mt-2 text-ink-secondary font-mono leading-relaxed description-html max-h-[300px] overflow-y-auto select-text">
                                            {opp.description ? (
                                              <div dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(opp.description) }} />
                                            ) : (
                                              'No details provided.'
                                            )}
                                          </div>
                                        </div>

                                        {/* Hiring Contacts & Outreach (Right 2 columns) */}
                                        <div className="md:col-span-2 flex flex-col gap-3 font-mono">
                                          <div className="font-bold text-ink-primary text-[11px] tracking-wider uppercase">
                                            <span>HIRING INTEL & CONTACT CHANNELS:</span>
                                          </div>
                                          
                                          {loadingContacts[opp.id] ? (
                                            <div className="text-ink-secondary text-[11px] animate-pulse py-4">
                                              DISCOVERING CONTACT VECTORS...
                                            </div>
                                          ) : oppContacts[opp.id] && oppContacts[opp.id].length > 0 ? (
                                            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[300px]">
                                              {oppContacts[opp.id].map((contact: any) => (
                                                <div key={contact.id} className="border border-border-subtle bg-canvas rounded-[4px] p-2.5 flex flex-col gap-1.5 hover:border-ink-secondary transition-all">
                                                  <div className="flex justify-between items-start">
                                                    <div>
                                                      <div className="text-ink-primary font-bold text-[11px]">{contact.name}</div>
                                                      <div className="text-[10px] text-ink-secondary">{contact.role}</div>
                                                    </div>
                                                    <span className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-bold border ${
                                                      contact.priority === 1 
                                                        ? 'bg-accent-match/10 text-accent-match border-accent-match/20' 
                                                        : 'bg-canvas text-ink-secondary border-border-subtle'
                                                    }`}>
                                                      {contact.priority === 1 ? 'TOP CONTACT' : `PRIORITY ${contact.priority}`}
                                                    </span>
                                                  </div>
                                                  
                                                  {contact.matchReason && (
                                                    <p className="text-[10px] text-ink-secondary italic leading-normal">
                                                      &gt; {contact.matchReason}
                                                    </p>
                                                  )}

                                                  <div className="flex gap-2 mt-1">
                                                    {contact.email && (
                                                      <a 
                                                        href={`mailto:${contact.email}`}
                                                        className="text-[9px] px-1.5 py-0.5 border border-border-subtle hover:border-accent-system bg-surface text-ink-primary rounded-[3px] flex items-center gap-1"
                                                      >
                                                        <span>EMAIL</span>
                                                      </a>
                                                    )}
                                                    {contact.linkedinUrl && (
                                                      <a 
                                                        href={contact.linkedinUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] px-1.5 py-0.5 border border-border-subtle hover:border-accent-system bg-surface text-ink-primary rounded-[3px] flex items-center gap-1"
                                                      >
                                                        <span>LINKEDIN</span>
                                                        <ExternalLink size={8} />
                                                      </a>
                                                    )}
                                                    {contact.twitterUrl && (
                                                      <a 
                                                        href={contact.twitterUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] px-1.5 py-0.5 border border-border-subtle hover:border-accent-system bg-surface text-ink-primary rounded-[3px] flex items-center gap-1"
                                                      >
                                                        <span>TWITTER/X</span>
                                                        <ExternalLink size={8} />
                                                      </a>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="text-ink-secondary text-[11px] py-4 italic">
                                              No hiring contact vectors discovered.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card List View (< lg) */}
                      <div className="lg:hidden p-3 flex flex-col gap-3 overflow-y-auto">
                        {opportunities.map((opp, index) => (
                          <div 
                            key={opp.id} 
                            onClick={() => handleOpportunityClick(opp.id)}
                            className={`border border-border-subtle bg-surface rounded-[6px] p-3.5 flex flex-col gap-2.5 hover:border-ink-secondary transition-all duration-150 cursor-pointer ${
                              expandedJobId === opp.id ? 'border-accent-system/60 bg-surface-hover/20' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-mono text-[10px] text-ink-secondary">
                                  SR NO: {String((oppCurrentPage - 1) * (oppPagination.limit || 15) + index + 1).padStart(2, '0')}
                                </span>
                                <h3 className="text-xs font-bold text-ink-primary leading-tight">{opp.title}</h3>
                                <a 
                                  href={opp.company.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="font-mono text-[10px] text-ink-secondary hover:text-accent-system hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span>{opp.company.name}</span>
                                  <ExternalLink size={8} />
                                </a>
                              </div>
                              
                              <span className={`shrink-0 font-mono text-[9px] font-bold py-0.5 px-1.5 rounded-[3px] border ${
                                opp.relevanceScore >= 85 ? 'bg-accent-match/10 text-accent-match border-accent-match/20' :
                                opp.relevanceScore >= 60 ? 'bg-accent-warn/10 text-accent-warn border-accent-warn/20' :
                                'bg-canvas text-ink-secondary border-border-subtle'
                              }`}>
                                {opp.relevanceScore}% MATCH
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1 font-mono text-[9px] text-ink-secondary">
                              <span className="bg-canvas border border-border-subtle px-1 rounded">
                                {opp.location || 'Remote'}
                              </span>
                            </div>

                            {/* AI Summary Block (as defined in DESIGN.md 5.1) */}
                            <div className="border-l-2 border-accent-system pl-2.5 py-0.5 bg-canvas/30 text-[11px] text-ink-secondary leading-normal">
                              <span className="font-semibold text-ink-primary">AI Match Analysis: </span>
                              {getMatchExplanation(opp, resume)}
                            </div>

                            <div className="flex justify-between items-center text-[10px] font-mono text-ink-secondary border-t border-border-subtle/50 pt-2 mt-1" onClick={(e) => e.stopPropagation()}>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpportunityClick(opp.id); }}
                                className="text-accent-system flex items-center gap-1 hover:underline text-[10px] cursor-pointer"
                              >
                                <span>{expandedJobId === opp.id ? 'COLLAPSE_DETAILS' : 'EXPAND_DETAILS'}</span>
                                {expandedJobId === opp.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                              </button>
                              
                              <a 
                                href={opp.applyUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex px-2 py-0.5 border border-border-subtle hover:border-accent-system text-ink-primary rounded-[3px] bg-canvas hover:bg-surface-hover transition-all items-center gap-1"
                              >
                                <span>APPLY_PORT</span>
                                <ExternalLink size={9} />
                              </a>
                            </div>

                            {/* Mobile Expanded Content */}
                            {expandedJobId === opp.id && (
                              <div className="mt-2.5 pt-2.5 border-t border-border-subtle/50 flex flex-col gap-4 font-sans text-xs" onClick={(e) => e.stopPropagation()}>
                                {/* Description */}
                                <div>
                                  <style dangerouslySetInnerHTML={{ __html: `
                                    .description-html p { margin-bottom: 6px; }
                                    .description-html ul { list-style-type: disc; padding-left: 12px; margin-bottom: 6px; }
                                    .description-html ol { list-style-type: decimal; padding-left: 12px; margin-bottom: 6px; }
                                    .description-html li { margin-bottom: 2px; }
                                    .description-html strong { color: var(--text-primary); font-weight: 600; }
                                    .description-html a { color: var(--accent-system); text-decoration: underline; }
                                  `}} />
                                  <div className="font-mono font-bold text-ink-primary text-[10px] tracking-wider uppercase mb-1">
                                    JOB DESCRIPTION DETAILS:
                                  </div>
                                  <div className="text-ink-secondary font-mono leading-relaxed description-html max-h-[220px] overflow-y-auto select-text bg-canvas/30 border border-border-subtle/30 rounded p-2">
                                    {opp.description ? (
                                      <div dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(opp.description) }} />
                                    ) : (
                                      'No details provided.'
                                    )}
                                  </div>
                                </div>

                                {/* Hiring Intel */}
                                <div className="flex flex-col gap-2 font-mono">
                                  <div className="font-bold text-ink-primary text-[10px] tracking-wider uppercase">
                                    HIRING INTEL & CONTACTS:
                                  </div>
                                  
                                  {loadingContacts[opp.id] ? (
                                    <div className="text-ink-secondary text-[10px] animate-pulse py-2">
                                      DISCOVERING CONTACT VECTORS...
                                    </div>
                                  ) : oppContacts[opp.id] && oppContacts[opp.id].length > 0 ? (
                                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                                      {oppContacts[opp.id].map((contact: any) => (
                                        <div key={contact.id} className="border border-border-subtle bg-canvas rounded-[4px] p-2 flex flex-col gap-1.5">
                                          <div className="flex justify-between items-start gap-1">
                                            <div>
                                              <div className="text-ink-primary font-bold text-[10px]">{contact.name}</div>
                                              <div className="text-[9px] text-ink-secondary">{contact.role}</div>
                                            </div>
                                            <span className={`px-1 py-0.5 rounded-[3px] text-[8px] font-bold border shrink-0 ${
                                              contact.priority === 1 
                                                ? 'bg-accent-match/10 text-accent-match border-accent-match/20' 
                                                : 'bg-canvas text-ink-secondary border-border-subtle'
                                            }`}>
                                              {contact.priority === 1 ? 'TOP' : `PRI ${contact.priority}`}
                                            </span>
                                          </div>
                                          
                                          {contact.matchReason && (
                                            <p className="text-[9px] text-ink-secondary italic leading-normal">
                                              &gt; {contact.matchReason}
                                            </p>
                                          )}

                                          <div className="flex flex-wrap gap-1.5 mt-1">
                                            {contact.email && (
                                              <a 
                                                href={`mailto:${contact.email}`}
                                                className="text-[9px] px-1.5 py-0.5 border border-border-subtle hover:border-accent-system bg-surface text-ink-primary rounded-[3px] hover:bg-surface-hover"
                                              >
                                                <span>EMAIL</span>
                                              </a>
                                            )}
                                            {contact.linkedinUrl && (
                                              <a 
                                                href={contact.linkedinUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] px-1.5 py-0.5 border border-border-subtle hover:border-accent-system bg-surface text-ink-primary rounded-[3px] flex items-center gap-0.5 hover:bg-surface-hover"
                                              >
                                                <span>LINKEDIN</span>
                                                <ExternalLink size={7} />
                                              </a>
                                            )}
                                            {contact.twitterUrl && (
                                              <a 
                                                href={contact.twitterUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] px-1.5 py-0.5 border border-border-subtle hover:border-accent-system bg-surface text-ink-primary rounded-[3px] flex items-center gap-0.5 hover:bg-surface-hover"
                                              >
                                                <span>TWITTER</span>
                                                <ExternalLink size={7} />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-ink-secondary text-[10px] py-1 italic">
                                      No hiring contact vectors discovered.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Google-Style Page Pagination */}
                    <div className="mt-auto border-t border-border-subtle p-3 flex justify-between items-center bg-canvas/20">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => fetchOpportunities(1)}
                          disabled={oppCurrentPage === 1}
                          className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:enabled:text-ink-primary hover:enabled:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          [START]
                        </button>
                        <button
                          onClick={() => fetchOpportunities(oppCurrentPage - 1)}
                          disabled={oppCurrentPage === 1}
                          className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:enabled:text-ink-primary hover:enabled:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          [PREV]
                        </button>
                      </div>
                      
                      <div className="flex gap-1">
                        {(() => {
                          const pages: number[] = [];
                          const maxVisible = 5;
                          let start = Math.max(1, oppCurrentPage - 2);
                          let end = Math.min(oppPagination.pages || 1, start + maxVisible - 1);
                          if (end - start + 1 < maxVisible) {
                            start = Math.max(1, end - maxVisible + 1);
                          }
                          for (let p = start; p <= end; p++) {
                            pages.push(p);
                          }
                          return pages.map(p => (
                            <button
                              key={p}
                              onClick={() => fetchOpportunities(p)}
                              className={`px-2.5 py-1 font-mono text-[11px] rounded-[4px] border ${
                                oppCurrentPage === p
                                  ? 'bg-accent-system/10 text-accent-system border-accent-system/25 font-bold'
                                  : 'border-border-subtle text-ink-secondary hover:text-ink-primary hover:border-ink-secondary bg-surface'
                              }`}
                            >
                              {p}
                            </button>
                          ));
                        })()}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => fetchOpportunities(oppCurrentPage + 1)}
                          disabled={oppCurrentPage === (oppPagination.pages || 1)}
                          className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:enabled:text-ink-primary hover:enabled:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          [NEXT]
                        </button>
                        <button
                          onClick={() => fetchOpportunities(oppPagination.pages || 1)}
                          disabled={oppCurrentPage === (oppPagination.pages || 1)}
                          className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:enabled:text-ink-primary hover:enabled:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          [END]
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-ink-secondary font-mono text-xs flex-1 flex flex-col items-center justify-center border border-border-subtle rounded-[6px] bg-surface min-h-[300px]">
                    <Briefcase size={24} className="mb-2 text-border-subtle" />
                    <span>NO RELEVANT OPPORTUNITIES DISCOVERED CORRESPONDING TO THE TARGET FILTER VECTOR.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
        </div>

        {/* Systems Monitor Log Stream at bottom */}
        <footer className={`bg-canvas border-t border-border-subtle flex flex-col gap-2 transition-all duration-200 ${
          isLogsExpanded ? 'h-40 min-h-[160px]' : 'h-10 min-h-[40px] overflow-hidden'
        }`}>
          <div 
            className="flex items-center justify-between px-6 py-2.5 border-b border-border-subtle/50 cursor-pointer select-none bg-surface/30 hover:bg-surface-hover/50"
            onClick={() => setIsLogsExpanded(!isLogsExpanded)}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-accent-match ${isLogsExpanded ? 'shadow-[0_0_4px_#10B981] animate-pulse' : ''}`}></div>
              <span className="font-mono text-[10px] font-bold text-ink-secondary tracking-wider">LIVE WORKER MONITOR STREAM</span>
            </div>
            <button type="button" className="text-ink-secondary hover:text-ink-primary cursor-pointer">
              {isLogsExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
          {isLogsExpanded && (
            <div className="flex-1 overflow-y-auto flex flex-col gap-1 text-ink-secondary font-mono text-[11px] px-6 pb-3">
              {terminalLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  <span className="text-ink-secondary">[{log.time}]</span>{' '}
                  <span className="text-accent-system">{log.type}</span> &gt; {log.message}{' '}
                  {log.action && <span className="text-accent-match font-bold">{log.action}</span>}
                </div>
              ))}
            </div>
          )}
        </footer>
      </main>
    </div>
  );
}
