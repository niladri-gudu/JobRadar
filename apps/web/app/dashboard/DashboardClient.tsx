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
  ChevronRight, 
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
    <div className="dashboard-layout">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <TerminalIcon size={16} className="text-accent-system" />
          <span>JOBRADAR // CMD_CTR</span>
        </div>

        {/* User Identity block */}
        <div className="sidebar-identity">
          <div className="identity-avatar">
            <UserIcon size={14} />
          </div>
          <div className="identity-details">
            <div className="identity-name">{user.name || 'Operator'}</div>
            <div className="identity-email">{user.email}</div>
          </div>
        </div>

        {/* Navigation / Monitors */}
        <div className="sidebar-section">
          <div className="section-title">ACTIVE CRAWLERS</div>
          <div className="monitor-row">
            <div className="monitor-name">
              <Cpu size={12} />
              <span>Greenhouse</span>
            </div>
            <div className="status-badge status-ok">OK</div>
          </div>
          <div className="monitor-row">
            <div className="monitor-name">
              <Cpu size={12} />
              <span>Lever</span>
            </div>
            <div className="status-badge status-ok">OK</div>
          </div>
          <div className="monitor-row">
            <div className="monitor-name">
              <Cpu size={12} />
              <span>Ashby</span>
            </div>
            <div className="status-badge status-sync">SYNC</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-title">SYSTEM HEALTH</div>
          <div className="monitor-row">
            <div className="monitor-name">
              <Activity size={12} />
              <span>DB Connection</span>
            </div>
            <div className="status-badge status-ok">1.2ms</div>
          </div>
          <div className="monitor-row">
            <div className="monitor-name">
              <Shield size={12} />
              <span>Auth Session</span>
            </div>
            <div className="status-badge status-ok">ACTIVE</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="section-title">METRICS</div>
          <div className="metric-row">
            <span className="metric-label">JOBS_CRAWLED:</span>
            <span className="metric-val">1,248</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">MATCHES_GEN:</span>
            <span className="metric-val">342</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">COMPANIES:</span>
            <span className="metric-val">42</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sidebar-footer">
          <button 
            className="btn-logout" 
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={13} />
            <span>{loggingOut ? 'DISCONNECTING...' : 'DISCONNECT SESSION'}</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="viewport">
        {/* View Header */}
        <header className="viewport-header">
          <div className="header-title-block">
            <h1>JOBRADAR // CENTRAL_COMMAND</h1>
            <p className="subtitle">AI-categorized high-fidelity opportunities and semantic matches</p>
          </div>
          
          <div className="header-actions">
            <div className="search-bar">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                placeholder="Query jobs, stacks or keywords..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <button className="icon-btn">
              <Bell size={14} />
            </button>
          </div>
        </header>

        {/* Scrollable Feed */}
        <div className="feed-container">
          <div className="feed-header">
            <div className="feed-title">
              <Briefcase size={14} />
              <span>SEMANTIC OPPORTUNITY FLOW ({filteredJobs.length} matches found)</span>
            </div>
            <div className="feed-filter-tags">
              <span className="filter-tag active">MATCHES_ALL</span>
              <span className="filter-tag">SCORE_80+</span>
              <span className="filter-tag">REMOTE_ONLY</span>
            </div>
          </div>

          <div className="jobs-list">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => {
                // Determine matching color token
                let matchColor = 'var(--accent-warn)';
                let matchBg = 'rgba(245, 158, 11, 0.1)';
                if (job.score >= 85) {
                  matchColor = 'var(--accent-match)';
                  matchBg = 'rgba(16, 185, 129, 0.1)';
                } else if (job.score < 70) {
                  matchColor = 'var(--text-secondary)';
                  matchBg = 'rgba(156, 163, 175, 0.1)';
                }

                return (
                  <div key={job.id} className="job-card">
                    {/* Job Card Header */}
                    <div className="job-card-header">
                      <div className="title-area">
                        <span className="job-title">{job.title}</span>
                        <span className="company-separator">//</span>
                        <span className="job-company">{job.company}</span>
                        <span className="job-location">({job.location})</span>
                      </div>
                      
                      <div 
                        className="match-badge" 
                        style={{ 
                          color: matchColor, 
                          backgroundColor: matchBg,
                          border: `1px solid ${matchColor}33`
                        }}
                      >
                        {job.score}% Match
                      </div>
                    </div>

                    {/* Tech tags */}
                    <div className="job-tags">
                      {job.tags.map((tag, idx) => (
                        <span key={idx} className="tech-tag">{tag}</span>
                      ))}
                    </div>

                    {/* AI Callout */}
                    <div className="ai-summary">
                      <div className="ai-summary-label">
                        <span>AI ANALYTICS GAP EVALUATION</span>
                      </div>
                      <p className="ai-summary-text">{job.reason}</p>
                    </div>

                    {/* Footer */}
                    <div className="job-card-footer">
                      <span className="posted-time">DETECTED: {job.postedAt}</span>
                      <a href={job.url} className="apply-link">
                        <span>OPEN EXTERNAL PORT</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-feed">
                <TerminalIcon size={24} style={{ color: 'var(--border-subtle)', marginBottom: '12px' }} />
                <p>NO JOBS MATCHED CURRENT SEARCH QUERY</p>
                <span className="sub">Adjust filters or input parameters to capture opportunity flows.</span>
              </div>
            )}
          </div>
        </div>

        {/* Systems Monitor Log Stream at bottom */}
        <footer className="terminal-logs">
          <div className="terminal-header">
            <div className="terminal-dot green"></div>
            <span className="terminal-title">LIVE WORKER MONITOR STREAM</span>
          </div>
          <div className="terminal-body text-mono">
            <div><span className="log-time">[03:00:02]</span> CRAWLER -&gt; Scanning Greenhouse company lists... <span className="log-action">[OK]</span></div>
            <div><span className="log-time">[03:00:05]</span> CRAWLER -&gt; Scraping company career page: Vercel... <span className="log-action">[OK]</span></div>
            <div><span className="log-time">[03:00:06]</span> WORKER  -&gt; 2 new postings identified. Diff comparison initiated.</div>
            <div><span className="log-time">[03:00:09]</span> AI_MATCH -&gt; Matching user profile against <span style={{ color: 'var(--text-primary)' }}>"Senior Systems Engineer"</span>...</div>
            <div><span className="log-time">[03:00:11]</span> AI_MATCH -&gt; Score generated: <span style={{ color: 'var(--accent-match)' }}>95%</span>. Match reasons stored in relational database.</div>
            <div><span className="log-time">[03:00:12]</span> NOTIFY   -&gt; Notification dispatched via SMTP. Delivery confirmation received.</div>
          </div>
        </footer>
      </main>

      {/* Embedded Component Styles */}
      <style jsx>{`
        .dashboard-layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          background-color: var(--bg-canvas);
          overflow: hidden;
        }

        /* Sidebar styling */
        .sidebar {
          width: 260px;
          min-width: 260px;
          background-color: var(--bg-surface);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          padding: 16px;
        }

        .sidebar-brand {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }

        .sidebar-identity {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .identity-avatar {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background-color: var(--bg-canvas);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .identity-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .identity-email {
          font-size: 11px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
          word-break: break-all;
        }

        .sidebar-section {
          padding: 16px 0;
          border-bottom: 1px solid var(--border-subtle);
        }

        .section-title {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .monitor-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .monitor-name {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-primary);
        }

        .status-badge {
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: bold;
        }

        .status-ok {
          background-color: rgba(16, 185, 129, 0.1);
          color: var(--accent-match);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-sync {
          background-color: rgba(99, 102, 241, 0.1);
          color: var(--accent-system);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .metric-label {
          color: var(--text-secondary);
        }

        .metric-val {
          color: var(--text-primary);
        }

        .sidebar-footer {
          margin-top: auto;
          padding-top: 16px;
        }

        .btn-logout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          background-color: var(--bg-canvas);
          transition: all 0.15s ease;
        }

        .btn-logout:hover {
          background-color: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }

        /* Viewport Styling */
        .viewport {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          background-color: var(--bg-canvas);
        }

        .viewport-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-subtle);
          background-color: var(--bg-surface);
        }

        .header-title-block h1 {
          font-family: var(--font-sans);
          font-size: 16px;
          font-weight: 700;
        }

        .header-title-block .subtitle {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .search-bar {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 10px;
          color: var(--text-secondary);
        }

        .search-bar input {
          background-color: var(--bg-canvas);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 6px 12px 6px 30px;
          font-size: 12px;
          color: var(--text-primary);
          width: 240px;
          transition: all 0.15s ease;
        }

        .search-bar input:focus {
          outline: none;
          border-color: var(--accent-system);
          width: 300px;
        }

        .icon-btn {
          width: 28px;
          height: 28px;
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          background-color: var(--bg-canvas);
        }

        .icon-btn:hover {
          color: var(--text-primary);
          background-color: var(--bg-hover);
        }

        /* Feed container styling */
        .feed-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 20px 24px;
          overflow-y: auto;
        }

        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .feed-title {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .feed-filter-tags {
          display: flex;
          gap: 8px;
        }

        .filter-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          background-color: var(--bg-surface);
          cursor: pointer;
        }

        .filter-tag.active, .filter-tag:hover {
          color: var(--text-primary);
          border-color: var(--text-secondary);
          background-color: var(--bg-hover);
        }

        .jobs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .job-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          padding: 16px;
          transition: border-color 0.15s ease;
        }

        .job-card:hover {
          border-color: var(--text-secondary);
        }

        .job-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        .title-area {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .job-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .company-separator {
          color: var(--border-subtle);
          font-family: var(--font-mono);
        }

        .job-company {
          font-weight: 500;
          color: var(--text-secondary);
        }

        .job-location {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .match-badge {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 4px;
        }

        .job-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .tech-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 4px;
          background-color: var(--bg-canvas);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }

        .ai-summary {
          background-color: var(--bg-canvas);
          border-left: 2px solid var(--accent-system);
          padding: 10px 12px;
          margin-bottom: 12px;
          border-radius: 0 4px 4px 0;
        }

        .ai-summary-label {
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: bold;
          color: var(--accent-system);
          margin-bottom: 4px;
          letter-spacing: 0.05em;
        }

        .ai-summary-text {
          font-size: 12px;
          line-height: 1.4;
          color: var(--text-primary);
        }

        .job-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-secondary);
          border-top: 1px dashed var(--border-subtle);
          padding-top: 12px;
        }

        .apply-link {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--accent-system);
        }

        .apply-link:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }

        .empty-feed {
          padding: 48px;
          border: 1px dashed var(--border-subtle);
          border-radius: 6px;
          text-align: center;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .empty-feed p {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: bold;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .empty-feed .sub {
          font-size: 11px;
        }

        /* Systems terminal logs */
        .terminal-logs {
          background-color: var(--bg-canvas);
          border-top: 1px solid var(--border-subtle);
          padding: 12px 24px;
          height: 160px;
          min-height: 160px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .terminal-header {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 6px;
        }

        .terminal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .terminal-dot.green {
          background-color: var(--accent-match);
          box-shadow: 0 0 4px var(--accent-match);
        }

        .terminal-title {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: bold;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }

        .terminal-body {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: var(--text-secondary);
        }

        .log-time {
          color: var(--text-secondary);
        }

        .log-action {
          color: var(--accent-system);
        }
      `}</style>
    </div>
  );
}
