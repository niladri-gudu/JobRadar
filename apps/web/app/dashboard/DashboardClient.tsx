'use client';

import React, { useState } from 'react';
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
  Bell
} from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import { User } from '../../lib/auth-server';

interface DashboardClientProps {
  user: User;
}

// Mock job matches to show in the high-density feed
const mockJobs = [
  {
    id: '1',
    title: 'Senior Systems Engineer',
    company: 'Vercel',
    location: 'Remote, US',
    score: 95,
    tags: ['Rust', 'Go', 'Kubernetes', 'HTTP/3'],
    reason: 'Matches your expertise in high-concurrency network servers and distributed edge runtimes. The profile requires deep networking knowledge which aligns with your projects.',
    postedAt: '2h ago',
    url: '#'
  },
  {
    id: '2',
    title: 'Lead Platform Architect',
    company: 'Stripe',
    location: 'San Francisco, CA',
    score: 88,
    tags: ['Ruby', 'Java', 'PCI-DSS', 'Distributed Systems'],
    reason: 'High correlation with your ledger system design experience. Recommended due to core infra scale and API design requirements.',
    postedAt: '5h ago',
    url: '#'
  },
  {
    id: '3',
    title: 'Developer Experience Engineer',
    company: 'Supabase',
    location: 'Remote',
    score: 82,
    tags: ['TypeScript', 'PostgreSQL', 'Rust', 'Next.js'],
    reason: 'Matches web stack profiling. Strong matching on PostgreSQL internals knowledge and frontend integration mechanics.',
    postedAt: '1d ago',
    url: '#'
  },
  {
    id: '4',
    title: 'Distributed Infrastructure Specialist',
    company: 'Cloudflare',
    location: 'Austin, TX',
    score: 64,
    tags: ['C++', 'Rust', 'WASM', 'Linux Kernel'],
    reason: 'Medium score due to heavy C++ requirement. However, your WASM runtime and memory sandbox skills are highly relevant.',
    postedAt: '2d ago',
    url: '#'
  }
];

export default function DashboardClient({ user }: DashboardClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [filterText, setFilterText] = useState('');

  // Resume states
  const [resume, setResume] = useState<any>(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terminal log state
  const [terminalLogs, setTerminalLogs] = useState<Array<{ time: string; type: string; message: string; action?: string }>>([
    { time: '03:00:02', type: 'CRAWLER', message: 'Scanning Greenhouse company lists...', action: '[OK]' },
    { time: '03:00:05', type: 'CRAWLER', message: 'Scraping company career page: Vercel...', action: '[OK]' },
    { time: '03:00:06', type: 'WORKER', message: '2 new postings identified. Diff comparison initiated.' },
    { time: '03:00:09', type: 'AI_MATCH', message: 'Matching user profile against "Senior Systems Engineer"...' },
    { time: '03:00:11', type: 'AI_MATCH', message: 'Score generated: 95%. Match reasons stored in relational database.' },
    { time: '03:00:12', type: 'NOTIFY', message: 'Notification dispatched via SMTP. Delivery confirmation received.' }
  ]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  React.useEffect(() => {
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

  const filteredJobs = mockJobs.filter(job => 
    job.title.toLowerCase().includes(filterText.toLowerCase()) ||
    job.company.toLowerCase().includes(filterText.toLowerCase()) ||
    job.tags.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))
  );

  return (
    <div className="flex h-screen w-screen bg-canvas overflow-hidden">
      {/* Sidebar Panel */}
      <aside className="w-[260px] min-w-[260px] bg-surface border-r border-border-subtle flex flex-col p-4">
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
          <div className="font-mono text-[10px] tracking-widest text-ink-secondary mb-3">ACTIVE CRAWLERS</div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-primary">
              <Cpu size={12} />
              <span>Greenhouse</span>
            </div>
            <div className="text-[9px] py-0.5 px-1.5 rounded-[3px] font-bold bg-accent-match/10 text-accent-match border border-accent-match/20">OK</div>
          </div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-primary">
              <Cpu size={12} />
              <span>Lever</span>
            </div>
            <div className="text-[9px] py-0.5 px-1.5 rounded-[3px] font-bold bg-accent-match/10 text-accent-match border border-accent-match/20">OK</div>
          </div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-primary">
              <Cpu size={12} />
              <span>Ashby</span>
            </div>
            <div className="text-[9px] py-0.5 px-1.5 rounded-[3px] font-bold bg-accent-system/10 text-accent-system border border-accent-system/20">SYNC</div>
          </div>
        </div>

        <div className="py-4 border-b border-border-subtle">
          <div className="font-mono text-[10px] tracking-widest text-ink-secondary mb-3">SYSTEM HEALTH</div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-primary">
              <Activity size={12} />
              <span>DB Connection</span>
            </div>
            <div className="text-[9px] py-0.5 px-1.5 rounded-[3px] font-bold bg-accent-match/10 text-accent-match border border-accent-match/20">1.2ms</div>
          </div>
          <div className="flex justify-between items-center mb-2 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-ink-primary">
              <Shield size={12} />
              <span>Auth Session</span>
            </div>
            <div className="text-[9px] py-0.5 px-1.5 rounded-[3px] font-bold bg-accent-match/10 text-accent-match border border-accent-match/20">ACTIVE</div>
          </div>
        </div>

        <div className="py-4 border-b border-border-subtle">
          <div className="font-mono text-[10px] tracking-widest text-ink-secondary mb-3">METRICS</div>
          <div className="flex justify-between mb-1.5 font-mono text-[11px]">
            <span className="text-ink-secondary">JOBS_CRAWLED:</span>
            <span className="text-ink-primary">1,248</span>
          </div>
          <div className="flex justify-between mb-1.5 font-mono text-[11px]">
            <span className="text-ink-secondary">MATCHES_GEN:</span>
            <span className="text-ink-primary">342</span>
          </div>
          <div className="flex justify-between mb-1.5 font-mono text-[11px]">
            <span className="text-ink-secondary">COMPANIES:</span>
            <span className="text-ink-primary">42</span>
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
            <p className="text-xs text-ink-secondary mt-0.5">AI-categorized high-fidelity opportunities and semantic matches</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-2.5 text-ink-secondary" />
              <input 
                type="text" 
                placeholder="Query jobs, stacks or keywords..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="bg-canvas border border-border-subtle rounded-[6px] py-1.5 pr-3 pl-8 text-xs text-ink-primary w-[240px] focus:outline-none focus:border-accent-system focus:w-[300px] transition-all duration-150"
              />
            </div>
            <button className="w-7 h-7 border border-border-subtle rounded-[6px] flex items-center justify-center text-ink-secondary bg-canvas hover:text-ink-primary hover:bg-surface-hover">
              <Bell size={14} />
            </button>
          </div>
        </header>

        {/* Scrollable Feed */}
        <div className="flex-1 flex flex-col py-5 px-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="font-mono text-[11px] font-semibold text-ink-secondary flex items-center gap-2">
              <Briefcase size={14} />
              <span>SEMANTIC OPPORTUNITY FLOW ({filteredJobs.length} matches found)</span>
            </div>
            <div className="flex gap-2">
              <span className="font-mono text-[10px] py-0.5 px-2 rounded-[4px] border border-border-subtle text-ink-primary border-ink-secondary bg-surface-hover cursor-pointer hover:bg-surface-hover">MATCHES_ALL</span>
              <span className="font-mono text-[10px] py-0.5 px-2 rounded-[4px] border border-border-subtle text-ink-secondary bg-surface cursor-pointer hover:text-ink-primary hover:border-ink-secondary hover:bg-surface-hover">SCORE_80+</span>
              <span className="font-mono text-[10px] py-0.5 px-2 rounded-[4px] border border-border-subtle text-ink-secondary bg-surface cursor-pointer hover:text-ink-primary hover:border-ink-secondary hover:bg-surface-hover">REMOTE_ONLY</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-6">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                // Determine matching color token
                let matchColor = 'var(--color-accent-warn)';
                let matchBg = 'rgba(245, 158, 11, 0.1)';
                let matchBorder = 'rgba(245, 158, 11, 0.2)';
                if (job.score >= 85) {
                  matchColor = 'var(--color-accent-match)';
                  matchBg = 'rgba(16, 185, 129, 0.1)';
                  matchBorder = 'rgba(16, 185, 129, 0.2)';
                } else if (job.score < 70) {
                  matchColor = 'var(--color-ink-secondary)';
                  matchBg = 'rgba(156, 163, 175, 0.1)';
                  matchBorder = 'rgba(156, 163, 175, 0.2)';
                }

                return (
                  <div key={job.id} className="bg-surface border border-border-subtle rounded-[6px] p-4 hover:border-ink-secondary transition-colors duration-150">
                    {/* Job Card Header */}
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink-primary">{job.title}</span>
                        <span className="text-border-subtle font-mono">//</span>
                        <span className="font-medium text-ink-secondary">{job.company}</span>
                        <span className="text-[11px] text-ink-secondary">({job.location})</span>
                      </div>
                      
                      <div 
                        className="font-mono text-[11px] font-bold py-0.5 px-2 rounded-[4px]" 
                        style={{ 
                          color: matchColor, 
                          backgroundColor: matchBg,
                          border: `1px solid ${matchBorder}`
                        }}
                      >
                        {job.score}% Match
                      </div>
                    </div>

                    {/* Tech tags */}
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {job.tags.map((tag, idx) => (
                        <span key={idx} className="font-mono text-[10px] py-0.5 px-1.5 rounded-[4px] bg-canvas border border-border-subtle text-ink-secondary">{tag}</span>
                      ))}
                    </div>

                    {/* AI Callout */}
                    <div className="bg-canvas border-l-2 border-accent-system py-2.5 px-3 mb-3 rounded-r-[4px]">
                      <div className="font-mono text-[9px] font-bold text-accent-system mb-1 tracking-wider">
                        <span>AI ANALYTICS GAP EVALUATION</span>
                      </div>
                      <p className="text-xs leading-normal text-ink-primary">{job.reason}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center font-mono text-[10px] text-ink-secondary border-t border-dashed border-border-subtle pt-3">
                      <span>DETECTED: {job.postedAt}</span>
                      <a href={job.url} className="flex items-center gap-1 text-accent-system hover:text-ink-primary hover:underline">
                        <span>OPEN EXTERNAL PORT</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 border border-dashed border-border-subtle rounded-[6px] text-center text-ink-secondary flex flex-col items-center">
                <TerminalIcon size={24} className="text-border-subtle mb-3" />
                <p className="font-mono text-xs font-bold text-ink-primary mb-1">NO JOBS MATCHED CURRENT SEARCH QUERY</p>
                <span className="text-[11px]">Adjust filters or input parameters to capture opportunity flows.</span>
              </div>
            )}
          </div>
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
                <span className="text-ink-secondary">[{log.time}]</span> {log.type} -&gt; {log.message} {log.action && <span className="text-accent-system">{log.action}</span>}
              </div>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}
