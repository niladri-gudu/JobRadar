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
  FolderOpen
} from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import { User } from '../../lib/auth-server';

interface DashboardClientProps {
  user: User;
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'opportunities' | 'companies'>('companies');

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

  // Trigger initial fetch and filter changes
  useEffect(() => {
    fetchStats();
  }, [API_URL]);

  useEffect(() => {
    fetchCompanies(1);
  }, [API_URL, companySearch, companySourceFilter, companyStatusFilter]);

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
  const handleTriggerDiscovery = async (source?: 'YC' | 'PRODUCT_HUNT' | 'WELLFOUND') => {
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
    <div className="flex h-screen w-screen bg-canvas overflow-hidden">
      {/* Sidebar Panel */}
      <aside className="w-[260px] min-w-[260px] bg-surface border-r border-border-subtle flex flex-col p-4 overflow-y-auto">
        <div className="font-mono text-sm font-semibold tracking-wider flex items-center gap-2 pb-4 border-b border-border-subtle text-ink-primary">
          <TerminalIcon size={16} className="text-accent-system" />
          <span>JOBRADAR // CMD_CTR</span>
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
                <span>REPLACE PDF PORT</span>
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
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <span className="text-ink-primary flex items-center gap-1"><Cpu size={11} /> YC Directory</span>
            <button 
              onClick={() => handleTriggerDiscovery('YC')}
              disabled={triggeringCrawler !== null}
              className="text-[9px] py-0.5 px-1.5 border border-border-subtle rounded-[3px] bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary"
            >
              {triggeringCrawler === 'YC' ? 'RUNNING...' : 'TRIGGER'}
            </button>
          </div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <span className="text-ink-primary flex items-center gap-1"><Cpu size={11} /> Product Hunt</span>
            <button 
              onClick={() => handleTriggerDiscovery('PRODUCT_HUNT')}
              disabled={triggeringCrawler !== null}
              className="text-[9px] py-0.5 px-1.5 border border-border-subtle rounded-[3px] bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary"
            >
              {triggeringCrawler === 'PRODUCT_HUNT' ? 'RUNNING...' : 'TRIGGER'}
            </button>
          </div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <span className="text-ink-primary flex items-center gap-1"><Cpu size={11} /> Wellfound</span>
            <button 
              onClick={() => handleTriggerDiscovery('WELLFOUND')}
              disabled={triggeringCrawler !== null}
              className="text-[9px] py-0.5 px-1.5 border border-border-subtle rounded-[3px] bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary"
            >
              {triggeringCrawler === 'WELLFOUND' ? 'RUNNING...' : 'TRIGGER'}
            </button>
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
        <header className="flex justify-between items-center py-4 px-6 border-b border-border-subtle bg-surface">
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-ink-primary">JOBRADAR // CENTRAL_COMMAND</h1>
            <p className="text-xs text-ink-secondary mt-0.5">AI-categorized high-fidelity opportunities and company discovery databases</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex border border-border-subtle bg-canvas rounded-[6px] p-0.5">
              <button 
                onClick={() => setActiveTab('companies')}
                className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs rounded-[4px] transition-all duration-150 ${activeTab === 'companies' ? 'bg-surface-hover text-ink-primary font-bold' : 'text-ink-secondary hover:text-ink-primary'}`}
              >
                <Building size={12} />
                <span>COMPANIES ({stats.total})</span>
              </button>
              <button 
                onClick={() => setActiveTab('opportunities')}
                className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs rounded-[4px] transition-all duration-150 ${activeTab === 'opportunities' ? 'bg-surface-hover text-ink-primary font-bold' : 'text-ink-secondary hover:text-ink-primary'}`}
              >
                <Briefcase size={12} />
                <span>OPPORTUNITIES (0)</span>
              </button>
            </div>
            <button onClick={() => { fetchStats(); fetchCompanies(1); }} className="w-7 h-7 border border-border-subtle rounded-[6px] flex items-center justify-center text-ink-secondary bg-canvas hover:text-ink-primary hover:bg-surface-hover">
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
                <form onSubmit={handleCrawlSubmit} className="flex gap-2.5">
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
                    className="px-4 py-1.5 bg-canvas border border-border-subtle hover:border-accent-system text-ink-primary rounded-[6px] font-mono text-xs font-semibold hover:bg-surface-hover transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  {/* Filters */}
                  <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative flex items-center">
                      <Search size={12} className="absolute left-2.5 text-ink-secondary" />
                      <input 
                        type="text" 
                        placeholder="Search directory..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="bg-surface border border-border-subtle rounded-[6px] py-1 px-3 pl-8 text-xs text-ink-primary w-[180px] focus:outline-none focus:border-accent-system focus:w-[220px] transition-all"
                      />
                    </div>
                    
                    {/* Source selection */}
                    <select
                      value={companySourceFilter}
                      onChange={(e) => setCompanySourceFilter(e.target.value)}
                      className="bg-surface border border-border-subtle rounded-[6px] py-1 px-2.5 text-xs text-ink-primary focus:outline-none cursor-pointer"
                    >
                      <option value="">ALL SOURCES</option>
                      <option value="YC">YC STARTUPS</option>
                      <option value="PRODUCT_HUNT">PRODUCT HUNT</option>
                      <option value="WELLFOUND">WELLFOUND</option>
                      <option value="MANUAL">MANUAL ENTRIES</option>
                    </select>

                    {/* Status selection */}
                    <select
                      value={companyStatusFilter}
                      onChange={(e) => setCompanyStatusFilter(e.target.value)}
                      className="bg-surface border border-border-subtle rounded-[6px] py-1 px-2.5 text-xs text-ink-primary focus:outline-none cursor-pointer"
                    >
                      <option value="">ALL STATUSES</option>
                      <option value="VALIDATED">VALIDATED (ACTIVE)</option>
                      <option value="REJECTED">REJECTED (DEAD)</option>
                    </select>
                  </div>

                  {/* Summary count */}
                  <div className="font-mono text-[10px] text-ink-secondary">
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
                    <div className="flex-1 overflow-x-auto flex flex-col">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border-subtle bg-canvas/30 font-mono text-ink-secondary text-[11px]">
                            <th className="p-3 font-semibold">COMPANY NAME</th>
                            <th className="p-3 font-semibold">WEBSITE PORT</th>
                            <th className="p-3 font-semibold">INDUSTRY</th>
                            <th className="p-3 font-semibold">SOURCE</th>
                            <th className="p-3 font-semibold">STATUS</th>
                            <th className="p-3 font-semibold">DATE ADDED</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-subtle">
                          {companies.map((company) => (
                            <tr key={company.id} className="hover:bg-bg-hover transition-colors">
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

                      {/* Pagination Controls */}
                      {pagination.pages > 1 && (
                        <div className="mt-auto border-t border-border-subtle p-3 flex justify-between items-center bg-canvas/20">
                          <button
                            onClick={() => fetchCompanies(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:text-ink-primary hover:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            [PREV_PORT]
                          </button>
                          <span className="font-mono text-xs text-ink-secondary">
                            SECTOR {currentPage} / {pagination.pages}
                          </span>
                          <button
                            onClick={() => fetchCompanies(currentPage + 1)}
                            disabled={currentPage === pagination.pages}
                            className="px-2.5 py-1 border border-border-subtle rounded-[4px] font-mono text-[11px] text-ink-secondary hover:text-ink-primary hover:border-ink-secondary bg-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            [NEXT_PORT]
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-ink-secondary font-mono text-xs flex-1 flex flex-col items-center justify-center">
                      <FolderOpen size={24} className="mb-2 text-border-subtle" />
                      <span>NO COMPANIES DISCOVERED CORRESPONDING TO THE SPECIFIED CRITERIA.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            /* OPPORTUNITIES TAB (EMPTY PLACEHOLDER FOR PHASE 2) */
            <div className="flex flex-col gap-3 mb-6">
              <div className="p-12 border border-dashed border-border-subtle rounded-[6px] text-center text-ink-secondary flex flex-col items-center justify-center">
                <Briefcase size={24} className="text-border-subtle mb-3" />
                <p className="font-mono text-xs font-bold text-ink-primary mb-1">NO OPPORTUNITIES SURFACED YET</p>
                <span className="text-[11px] max-w-md mb-4">
                  Job Extraction & Crawler mechanisms are disabled for Phase 2. Startups database is active, and once crawler scripts are initiated in Phase 3, matching jobs will appear here.
                </span>
                <button 
                  onClick={() => setActiveTab('companies')}
                  className="px-3 py-1.5 border border-border-subtle hover:border-accent-system bg-surface hover:bg-surface-hover rounded-[6px] font-mono text-[11px] text-ink-primary"
                >
                  GOTO COMPANY DIRECTORY
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Systems Monitor Log Stream at bottom */}
        <footer className="bg-canvas border-t border-border-subtle py-3 px-6 h-40 min-h-40 overflow-y-auto flex flex-col gap-2">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-1.5">
            <div className="w-2 h-2 rounded-full bg-accent-match shadow-[0_0_4px_#10B981]"></div>
            <span className="font-mono text-[10px] font-bold text-ink-secondary tracking-wider">LIVE WORKER MONITOR STREAM</span>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 text-ink-secondary text-mono">
            {terminalLogs.map((log, idx) => (
              <div key={idx}>
                <span className="text-ink-secondary">[{log.time}]</span> {log.type} &gt; {log.message} {log.action && <span className="text-accent-system">{log.action}</span>}
              </div>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}
