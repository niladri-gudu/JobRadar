'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Terminal as TerminalIcon, 
  Cpu, 
  Activity, 
  Shield, 
  Briefcase, 
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
  UserCheck,
  Building,
  RefreshCw
} from 'lucide-react';
import { AuthSession } from '../lib/auth-server';

interface LandingClientProps {
  session: AuthSession | null;
}

interface LogLine {
  time: string;
  type: string;
  message: string;
  status: string;
}

const SAMPLE_LOG_POOL: Omit<LogLine, 'time'>[] = [
  { type: 'CRAWLER', message: 'Scanning Greenhouse directory for new listings...', status: '[OK]' },
  { type: 'DEDUPLICATOR', message: 'Supabase domain verified. Indexing job listings...', status: '[SKIP]' },
  { type: 'PARSER', message: 'Extracting JD fields for job_id 89410_platform_engineer...', status: '[OK]' },
  { type: 'VECTORIZER', message: 'Generating token embeddings via OpenAI text-embedding-3...', status: '[OK]' },
  { type: 'SCORER', message: 'Calculating cosine similarity index vs. Operator Resume...', status: '[OK]' },
  { type: 'MATCH_ENGINE', message: 'Computed match score: 94.2% match priority.', status: '[MATCH]' },
  { type: 'DISCOVERY', message: 'Discovered company hiring lead: Sarah Jenkins (Recruiting Lead).', status: '[OK]' },
  { type: 'NOTIFIER', message: 'Queued notification dispatch to Telegram & Discord webhooks.', status: '[SENT]' },
  { type: 'CRAWLER', message: 'Polling YC Startups list for recent job updates...', status: '[OK]' },
  { type: 'PARSER', message: 'No new job nodes detected for Vercel. Crawl cycle complete.', status: '[IDLE]' },
  { type: 'CRAWLER', message: 'Initializing page scrape for Linear career page...', status: '[OK]' },
  { type: 'SCORER', message: 'Computed match score: 68.1% match priority.', status: '[LOW_SCORE]' },
];

export default function LandingClient({ session }: LandingClientProps) {
  const [logs, setLogs] = useState<LogLine[]>([
    { time: '16:40:01', type: 'SYSTEM', message: 'JobRadar protocol bootstrap complete.', status: '[READY]' },
    { time: '16:40:03', type: 'SYSTEM', message: 'Awaiting connection stream from operators...', status: '[WAIT]' },
  ]);
  const [activeTab, setActiveTab] = useState<'match' | 'crawler' | 'contacts'>('match');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Terminal simulated logs loop
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      const logTemplate = SAMPLE_LOG_POOL[index % SAMPLE_LOG_POOL.length];
      
      setLogs(prev => [
        ...prev.slice(-20), // keep only last 20 logs for performance
        {
          time: timeString,
          ...logTemplate
        }
      ]);
      index++;
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="flex flex-col min-h-screen bg-canvas text-ink-primary font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-canvas/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-[6px] bg-surface border border-border-subtle">
            <TerminalIcon size={16} className="text-accent-system animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="font-mono text-xs font-semibold tracking-wider flex items-center gap-1.5">
              <span>JOBRADAR</span>
              <span className="text-[9px] text-ink-secondary px-1 py-0.5 border border-border-subtle rounded bg-surface">CORE_v1.0</span>
            </div>
            <span className="text-[10px] text-ink-secondary font-mono tracking-tight leading-none">SECURE CLIENT PROTOCOL</span>
          </div>
        </div>

        {/* System status display */}
        <div className="hidden md:flex items-center gap-6 font-mono text-[10px] text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-match opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-match"></span>
            </span>
            <span>NODE_STATUS: ONLINE</span>
          </div>
          <div>CRAWL_PORTAL: 8000</div>
          <div>DB: postgresql://localhost:5432</div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {session ? (
            <Link 
              href="/dashboard"
              className="font-mono text-xs font-medium uppercase tracking-wider bg-canvas border border-border-subtle hover:bg-surface-hover hover:border-ink-secondary text-ink-primary py-1.5 px-3 rounded-[6px] flex items-center gap-1.5 transition-all duration-150"
            >
              <span>Dashboard</span>
              <ArrowRight size={12} className="text-accent-system" />
            </Link>
          ) : (
            <>
              <Link 
                href="/login" 
                className="font-mono text-[11px] uppercase tracking-wider text-ink-secondary hover:text-ink-primary transition-colors py-1.5 px-3"
              >
                Sign In
              </Link>
              <Link 
                href="/register"
                className="font-mono text-xs font-medium uppercase tracking-wider bg-canvas border border-border-subtle hover:bg-surface-hover hover:border-ink-secondary text-ink-primary py-1.5 px-3.5 rounded-[6px] flex items-center gap-1 transition-all duration-150"
              >
                <span>Deploy Node</span>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-12 border-b border-border-subtle">
        {/* Subtle Tech Tag */}
        <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 border border-border-subtle rounded-full bg-surface font-mono text-[10px] text-accent-system uppercase tracking-widest">
          <Activity size={10} className="animate-pulse" />
          <span>Autonomous Search Protocol Active</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight max-w-3xl leading-tight mb-4 text-transparent bg-clip-text bg-gradient-to-b from-ink-primary via-ink-primary to-ink-primary/70">
          Autonomous Job Discovery & Career Intelligence Protocol
        </h1>

        {/* Sub-headline */}
        <p className="text-sm md:text-base text-ink-secondary max-w-2xl font-sans mb-8 leading-relaxed">
          Continuously scans company directories, indexes job boards, parses your resume embeddings, and outputs priority matches. All in a single technical console. No manual search lists.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="font-mono text-xs font-bold uppercase tracking-wider bg-canvas border border-border-subtle hover:bg-surface-hover hover:border-accent-system text-ink-primary py-2.5 px-6 rounded-[6px] flex items-center gap-2 transition-all duration-150 w-full sm:w-auto justify-center"
            >
              <span>Access Command Center</span>
              <ChevronRight size={14} className="text-accent-system" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="font-mono text-xs font-bold uppercase tracking-wider bg-canvas border border-border-subtle hover:bg-surface-hover hover:border-accent-system text-ink-primary py-2.5 px-6 rounded-[6px] flex items-center gap-2 transition-all duration-150 w-full sm:w-auto justify-center"
              >
                <span>Initialize Core Client</span>
                <ChevronRight size={14} className="text-accent-system" />
              </Link>
              <Link
                href="/register"
                className="font-mono text-xs font-medium uppercase tracking-wider text-ink-secondary hover:text-ink-primary py-2.5 px-6 border border-transparent hover:border-border-subtle rounded-[6px] transition-all duration-150 w-full sm:w-auto text-center"
              >
                Provision Operator Node
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Bento Showcase & simulated console */}
      <section className="px-6 py-12 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Technical Features (8 columns on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="border border-border-subtle bg-surface rounded-[6px] p-5 flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
                <span className="font-mono text-[11px] tracking-widest text-ink-secondary uppercase font-semibold">System Features & Modules</span>
                <span className="text-[10px] font-mono text-accent-system">[SECURE_LINK]</span>
              </div>
              <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
                JobRadar operates by separating background workers into three distinct micro-services executing continuously.
              </p>

              {/* Grid of features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border-subtle bg-canvas rounded-[6px] p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-ink-primary mb-1">
                    <Cpu size={14} className="text-accent-system" />
                    <span>01 / WEB CRAWLING</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-normal">
                    Orchestrated Playwright scrapers scan Greenhouse, Lever, and 10+ major job portals without relying on brittle RSS feeds.
                  </p>
                </div>

                <div className="border border-border-subtle bg-canvas rounded-[6px] p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-ink-primary mb-1">
                    <Sparkles size={14} className="text-accent-match" />
                    <span>02 / VECTOR MATCHING</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-normal">
                    Converts resume metadata and job descriptions into high-dimensional embeddings to compute similarity scores.
                  </p>
                </div>

                <div className="border border-border-subtle bg-canvas rounded-[6px] p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-ink-primary mb-1">
                    <UserCheck size={14} className="text-accent-warn" />
                    <span>03 / HIRING INTEL</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-normal">
                    Extracts recruiter names, LinkedIn pathways, and email profiles directly from targeted web crawls to skip standard pipelines.
                  </p>
                </div>

                <div className="border border-border-subtle bg-canvas rounded-[6px] p-3.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-ink-primary mb-1">
                    <Activity size={14} className="text-accent-system" />
                    <span>04 / ALERTS QUEUE</span>
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-normal">
                    Dispatches formatted reports containing job matching reasons directly to Telegram channels and Discord channels.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between font-mono text-[10px] text-ink-secondary">
              <span>LATENCY: ~85ms</span>
              <span>COMPILATION: SUCCESSFUL</span>
            </div>
          </div>
        </div>

        {/* Right Column: Operational Preview (5 columns on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="border border-border-subtle bg-surface rounded-[6px] p-4 flex flex-col justify-between">
            <div className="flex justify-between items-center pb-3 border-b border-border-subtle mb-3">
              <span className="font-mono text-[10px] tracking-widest text-ink-secondary uppercase">Operational Previews</span>
              <div className="flex gap-1.5">
                <button 
                  onClick={() => setActiveTab('match')}
                  className={`px-2 py-0.5 font-mono text-[9px] rounded-[3px] border ${activeTab === 'match' ? 'border-accent-system text-accent-system bg-accent-system/5 font-semibold' : 'border-border-subtle text-ink-secondary hover:text-ink-primary'}`}
                >
                  MATCH
                </button>
                <button 
                  onClick={() => setActiveTab('crawler')}
                  className={`px-2 py-0.5 font-mono text-[9px] rounded-[3px] border ${activeTab === 'crawler' ? 'border-accent-system text-accent-system bg-accent-system/5 font-semibold' : 'border-border-subtle text-ink-secondary hover:text-ink-primary'}`}
                >
                  CRAWLER
                </button>
                <button 
                  onClick={() => setActiveTab('contacts')}
                  className={`px-2 py-0.5 font-mono text-[9px] rounded-[3px] border ${activeTab === 'contacts' ? 'border-accent-system text-accent-system bg-accent-system/5 font-semibold' : 'border-border-subtle text-ink-secondary hover:text-ink-primary'}`}
                >
                  INTEL
                </button>
              </div>
            </div>

            {/* TAB CONTENT: MATCH (Job Card as defined in DESIGN.md) */}
            {activeTab === 'match' && (
              <div className="border border-border-subtle bg-canvas rounded-[6px] p-3 flex flex-col gap-2.5 transition-all duration-150">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-semibold text-ink-primary">Lead Platform Engineer</h3>
                    <span className="text-[10px] text-ink-secondary font-mono">Supabase // Remote</span>
                  </div>
                  <span className="font-mono text-[9px] font-bold py-0.5 px-1.5 rounded-[3px] bg-accent-match/10 text-accent-match border border-accent-match/20">
                    94% MATCH
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {['rust', 'go', 'kubernetes', 'postgres'].map(tag => (
                    <span key={tag} className="font-mono text-[9px] text-ink-secondary bg-surface border border-border-subtle px-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* AI Summary Block (defined in DESIGN.md 5.1) */}
                <div className="border-l-2 border-accent-system pl-2.5 py-0.5 bg-surface/50 text-[11px] text-ink-secondary leading-normal">
                  <span className="font-semibold text-ink-primary">AI Match Analysis: </span>
                  Matches your background in infrastructure design and Go. Focuses on distributed database scaling.
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-ink-secondary border-t border-border-subtle pt-2 mt-1">
                  <span>POSTED: 2h ago</span>
                  <span className="text-accent-system flex items-center gap-1 hover:underline cursor-pointer">
                    Apply Port <ExternalLink size={10} />
                  </span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CRAWLER (List of crawlers status) */}
            {activeTab === 'crawler' && (
              <div className="flex flex-col gap-2 font-mono text-[11px] transition-all duration-150">
                <div className="bg-canvas border border-border-subtle rounded-[6px] p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-ink-primary flex items-center gap-1"><Cpu size={10} /> YC Directory</span>
                    <span className="text-[9px] font-bold text-ink-secondary">[IDLE]</span>
                  </div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-ink-primary flex items-center gap-1"><Cpu size={10} /> Wellfound</span>
                    <span className="text-[9px] font-bold text-accent-match">[COMPLETED]</span>
                  </div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-ink-primary flex items-center gap-1"><Cpu size={10} /> LinkedIn</span>
                    <span className="text-[9px] font-bold text-accent-system animate-pulse">[CRAWLING...]</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-primary flex items-center gap-1"><Cpu size={10} /> Remote.co</span>
                    <span className="text-[9px] font-bold text-accent-warn">[PENDING_QUEUE]</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-ink-secondary px-1">
                  <span>QUEUE BACKLOG: 0 nodes</span>
                  <span>RATE LIMIT: SAFE</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT: INTEL (Hiring contact recommendations) */}
            {activeTab === 'contacts' && (
              <div className="border border-border-subtle bg-canvas rounded-[6px] p-3 flex flex-col gap-2 transition-all duration-150">
                <div className="flex justify-between items-start pb-2 border-b border-border-subtle/50">
                  <div>
                    <span className="text-[9px] font-mono text-ink-secondary block">DISCOVERED CONTACT</span>
                    <h3 className="text-xs font-semibold text-ink-primary">Sarah Jenkins</h3>
                    <span className="text-[10px] text-ink-secondary">Recruiting Lead, Core Engineering</span>
                  </div>
                  <span className="font-mono text-[9px] font-bold py-0.5 px-1.5 rounded-[3px] bg-accent-system/10 text-accent-system border border-accent-system/20">
                    PRIORITY 0.89
                  </span>
                </div>

                <div className="text-[11px] text-ink-secondary space-y-1">
                  <div className="flex justify-between">
                    <span>Email Address:</span>
                    <span className="text-ink-primary font-mono text-[10px] select-all">s.jen****@supabase.io</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LinkedIn Portal:</span>
                    <span className="text-accent-system hover:underline flex items-center gap-0.5 cursor-pointer text-[10px]">
                      linkedin.com/in/sjenkins <ExternalLink size={9} />
                    </span>
                  </div>
                </div>

                <div className="mt-2 bg-surface/50 border border-border-subtle rounded p-2 text-[10px] text-ink-secondary font-mono leading-normal">
                  <span className="text-accent-warn font-semibold">Outreach Prompt:</span> &quot;Hi Sarah, I noticed Supabase is hiring a Lead Platform Engineer. Given my 4 years of Go/Kubernetes experience...&quot;
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono text-ink-secondary">
              <span>METRICS STATUS: OK</span>
              <span>INDEXED COMPANIES: 1,482</span>
            </div>
          </div>
        </div>

      </section>

      {/* Simulated Live Terminal View */}
      <section className="px-6 pb-16 max-w-6xl mx-auto w-full flex flex-col">
        <div className="border border-border-subtle bg-surface rounded-[6px] overflow-hidden flex flex-col">
          {/* Terminal Title Bar */}
          <div className="flex items-center justify-between bg-canvas px-4 py-2 border-b border-border-subtle font-mono text-[10px] text-ink-secondary">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500/80"></span>
              <span className="h-2 w-2 rounded-full bg-yellow-500/80"></span>
              <span className="h-2 w-2 rounded-full bg-green-500/80"></span>
              <span className="ml-2 font-semibold text-ink-primary">OPERATOR_LOGS // live-stream.stdout</span>
            </div>
            <span>PORT_CONNECTION: SECURE</span>
          </div>

          {/* Terminal Output */}
          <div className="p-4 bg-canvas/30 min-h-[180px] max-h-[240px] overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col gap-1 select-text">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-ink-secondary shrink-0 select-none">[{log.time}]</span>
                <span className="text-accent-system shrink-0 select-none">{log.type}</span>
                <span className="text-ink-secondary shrink-0 select-none">-&gt;</span>
                <span className="text-ink-primary flex-1">{log.message}</span>
                <span className={`shrink-0 font-bold ${
                  log.status === '[OK]' || log.status === '[READY]' || log.status === '[MATCH]' ? 'text-accent-match' :
                  log.status === '[WAIT]' || log.status === '[PENDING_QUEUE]' || log.status === '[LOW_SCORE]' ? 'text-accent-warn' :
                  'text-accent-system'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border-subtle bg-surface px-6 py-6 text-center text-xs text-ink-secondary font-mono">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span>JOBRADAR PROTOCOL v1.0.0 // DESIGN: ZEN SYSTEMS ENGINEERING</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hover:text-ink-primary cursor-pointer">API_SPECS</span>
            <span>•</span>
            <span className="hover:text-ink-primary cursor-pointer">SECURITY_SHA</span>
            <span>•</span>
            <span className="hover:text-ink-primary cursor-pointer">TERMS_OF_SERVICE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
