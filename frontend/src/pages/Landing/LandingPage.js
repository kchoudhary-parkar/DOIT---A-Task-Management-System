import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiZap, FiUsers, FiBarChart2, FiShield, FiMessageCircle,
  FiCode, FiArrowRight, FiPlay, FiCheckCircle, FiTarget, FiCpu,
} from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';
import doitLogo from '../../doit.png';
import './LandingPage.css';

/* ══════════════════════════════════════════════════════════════════════
   Animated Counter (same pattern as AboutPage stats)
   ══════════════════════════════════════════════════════════════════════ */
function AnimatedCounter({ target, suffix = '', duration = 1800 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
            else setCount(target);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{count}{suffix}</span>;
}

/* ══════════════════════════════════════════════════════════════════════
   Scroll-reveal hook (mirrors AboutPage addRef pattern)
   ══════════════════════════════════════════════════════════════════════ */
function useScrollReveal() {
  const sectionsRef = useRef([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('landing-visible'); }),
      { threshold: 0.1 }
    );
    sectionsRef.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const addRef = el => { if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el); };
  return addRef;
}

/* ══════════════════════════════════════════════════════════════════════
   Data
   ══════════════════════════════════════════════════════════════════════ */
const stats = [
  { target: 10,   suffix: 'K+', label: 'Tasks Managed' },
  { target: 500,  suffix: '+',  label: 'Teams Onboarded' },
  { target: 99,   suffix: '.9%',label: 'Uptime SLA' },
  { target: 4,    suffix: 'x',  label: 'Faster Planning' },
];

const features = [
  {
    icon: <BsStars size={26} />,
    color: 'purple',
    title: 'AI Sprint Planning',
    desc: 'LangGraph-powered agents decompose epics into sprint-ready tasks, estimate complexity, and auto-assign based on team velocity — cutting planning time from hours to minutes.',
    tags: ['LangGraph', 'GPT-4o', 'LangChain'],
  },
  {
    icon: <FiUsers size={26} />,
    color: 'blue',
    title: 'Drag-and-Drop Kanban',
    desc: 'Fully interactive boards with real-time sync, swimlanes, WIP limits, and dependency linking. Dnd-Kit makes it buttery smooth across all screen sizes.',
    tags: ['Dnd-Kit', 'React 19', 'WebSocket'],
  },
  {
    icon: <FiCode size={26} />,
    color: 'teal',
    title: 'Automated Code Review',
    desc: 'AI agents analyse pull requests, flag issues, suggest refactors, and summarise diffs — integrated directly into your sprint workflow with zero context-switching.',
    tags: ['GPT-4o', 'LangChain', 'GitHub'],
  },
  {
    icon: <FiMessageCircle size={26} />,
    color: 'green',
    title: 'Voice Chat Interface',
    desc: 'Talk to your project. Ask for sprint summaries, create tasks, update statuses, and get blockers surfaced — all through a natural voice interface powered by Azure AI.',
    tags: ['Azure AI', 'RAG', 'LlamaIndex'],
  },
  {
    icon: <FiBarChart2 size={26} />,
    color: 'amber',
    title: 'Analytics & Insights',
    desc: 'Burndown charts, velocity tracking, cycle-time analysis, and AI-generated retrospective insights. Drill into any metric and export reports without needing a data team.',
    tags: ['Recharts', 'TanStack Query', 'Celery'],
  },
  {
    icon: <FiShield size={26} />,
    color: 'red',
    title: 'Enterprise Security',
    desc: 'Clerk + JWT + Bcrypt auth stack with role-based access control, granular permissions, full audit trails, and SOC2-ready infrastructure — security baked in from day one.',
    tags: ['Clerk', 'JWT', 'Bcrypt', 'Redis'],
  },
];

const capabilityAtlas = [
  {
    icon: <FiTarget size={20} />,
    title: 'Delivery Engine',
    points: [
      'Project lifecycle: create, update, delete, ownership-aware access',
      'Task workflows: labels, links, comments, attachments, approvals',
      'Sprint planning: backlog, start/complete, task assignment cycles',
      'Realtime Kanban updates through WebSocket channels',
    ],
  },
  {
    icon: <FiMessageCircle size={20} />,
    title: 'Collaboration Layer',
    points: [
      'Team chat with channels, threads, reactions, mentions, and search',
      'Read receipts, file sharing, and channel-level live presence',
      'Slack, Microsoft Teams, and Discord integration orchestration',
      'Notification paths tied directly to task and sprint events',
    ],
  },
  {
    icon: <FiCpu size={20} />,
    title: 'Intelligence Stack',
    points: [
      '5 AI framework modes: LLM Assistant, Foundry, MCP, LangGraph, Local',
      'Voice pipeline: Whisper STT -> Foundry Agent -> Azure TTS',
      'Document Intelligence analysis with PDF report export',
      'Analytics and dashboard insights for teams and super admins',
    ],
  },
];

const agentFrameworks = [
  {
    name: 'DOIT-AI LLM',
    desc: 'General project copilot mode with context-aware assistant capabilities.',
    badge: 'Core Assistant',
  },
  {
    name: 'Azure AI Foundry',
    desc: 'Managed agent thread flow with upload and health operations.',
    badge: 'Enterprise Agent',
  },
  {
    name: 'LangGraph',
    desc: 'Tool-chaining workflow agent for structured orchestration.',
    badge: 'Workflow Agent',
  },
  {
    name: 'MCP Agent',
    desc: 'Model Context Protocol mode for task/project/sprint/member operations.',
    badge: 'Tool Protocol',
  },
  {
    name: 'Local Agent',
    desc: 'Local-first inference route with independent conversation lifecycle.',
    badge: 'Offline Ready',
  },
];

const stackItems = [
  { name: 'React 19', logo: 'https://cdn.simpleicons.org/react/61DAFB', short: 'R' },
  { name: 'FastAPI', logo: 'https://cdn.simpleicons.org/fastapi/009688', short: 'F' },
  { name: 'MongoDB', logo: 'https://cdn.simpleicons.org/mongodb/47A248', short: 'M' },
  { name: 'Redis', logo: 'https://cdn.simpleicons.org/redis/DC382D', short: 'Re' },
  { name: 'Celery', logo: 'https://cdn.simpleicons.org/celery/37814A', short: 'C' },
  { name: 'LangChain', logo: 'https://cdn.simpleicons.org/langchain/1C3C3C', short: 'LC' },
  { name: 'LangGraph', logo: 'https://cdn.simpleicons.org/langgraph/1D293D', short: 'LG' },
  { name: 'LlamaIndex', logo: 'https://cdn.simpleicons.org/llamaindex/4D6BFE', short: 'LI' },
  { name: 'ChromaDB', logo: 'https://cdn.simpleicons.org/chromadb/7B61FF', short: 'CH' },
  { name: 'Azure AI', logo: 'https://cdn.simpleicons.org/microsoftazure/0078D4', short: 'Az' },
  { name: 'GPT-4o', logo: 'https://cdn.simpleicons.org/openai/FFFFFF', short: 'AI' },
  { name: 'Ollama', logo: 'https://cdn.simpleicons.org/ollama/FFFFFF', short: 'O' },
  { name: 'Clerk', logo: 'https://cdn.simpleicons.org/clerk/6C47FF', short: 'Cl' },
];

const techPills = [
  'React 19', 'FastAPI', 'MongoDB', 'Celery', 'Redis',
  'LangChain', 'LangGraph', 'LlamaIndex', 'ChromaDB',
  'Azure AI', 'GPT-4o', 'MCP', 'Clerk',
];

/* ══════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const addRef = useScrollReveal();

  // Sticky header border/shadow on scroll
  useEffect(() => {
    const onScroll = () =>
      headerRef.current?.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="doit-landing-container">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="landing-header" ref={headerRef}>
        <div className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={doitLogo} alt="DOIT Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          DOIT
        </div>

        <nav className="landing-nav-links">
          <button className="landing-nav-link" onClick={() => navigate('/')}>
            Home
          </button>
          {['Products', 'Features', 'Docs', 'Pricing', 'Company'].map(item => (
            <button key={item} className="landing-nav-link" onClick={() => navigate('/login')}>
              {item}
              {['Products', 'Company'].includes(item) && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              )}
            </button>
          ))}
        </nav>

        <div className="landing-nav-actions">
          <button className="btn-ghost" onClick={() => navigate('/login')}>Sign in</button>
          <button className="btn-outline" onClick={() => navigate('/login')}>Try for free</button>
          <button className="btn-primary" onClick={() => navigate('/login')}>Get a demo</button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid" />
        </div>

        <div className="landing-container">
          <div className="hero-badge">
            <span className="badge-dot" />
            AI-Powered · Agentic · Observability
          </div>

          <h1 className="hero-title">
            Ship faster with
            <br />
            <span className="hero-gradient">intelligent teams</span>
          </h1>

          <p className="hero-subtitle">
            DOIT unifies agile workflows, AI agents, and team collaboration
            in one powerful platform — built with GPT-4o, LangGraph, and MCP
            to automate everything that slows you down.
          </p>

          <div className="hero-cta">
            <button className="btn-cta-primary" onClick={() => navigate('/login')}>
              Start building free <FiArrowRight size={15} />
            </button>
            <button className="btn-cta-secondary" onClick={() => navigate('/login')}>
              <FiPlay size={13} /> Watch demo
            </button>
          </div>

          <div className="hero-tech-row">
            <span className="hero-tech-label"> built with</span>
            {techPills.map(t => <span key={t} className="tech-pill">{t}</span>)}
          </div>
        </div>
      </section>

      {/* ── Dashboard Mockup Strip ──────────────────────────────────────── */}
      <div className="hero-mockup-strip">
        <div className="landing-container">
          <div className="hero-mockup-wrap">

            {/* Floating badges */}
            <div className="float-badge float-badge-1">
              <span className="float-badge-dot green" />
              AI Sprint Planned · 14 tasks
            </div>
            <div className="float-badge float-badge-2">
              <span className="float-badge-dot purple" />
              MCP Agent Active
            </div>
            <div className="float-badge float-badge-3">
              <span className="float-badge-dot blue" />
              Code Review Ready
            </div>

            <div className="dashboard-mockup">
              <div className="mockup-top-bar" />

              {/* Window controls */}
              <div className="mockup-window-controls">
                <div className="wc red" />
                <div className="wc yellow" />
                <div className="wc green" />
                <div className="wc-spacer" />
                <div className="wc-url">
                  <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  doit.app/workspace
                </div>
              </div>

              {/* Metrics */}
              <div className="mockup-metrics">
                <div className="metric-card">
                  <div className="metric-label">Agent Traces</div>
                  <div className="metric-value">2,345</div>
                  <div className="metric-change up">
                    <FiCheckCircle size={10} /> +25% this week
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Tasks Done</div>
                  <div className="metric-value">189</div>
                  <div className="metric-change up">
                    <FiCheckCircle size={10} /> +12% sprint
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Errors</div>
                  <div className="metric-value">892</div>
                  <div className="metric-change down">
                    ↓ −8.3% today
                  </div>
                </div>
              </div>

              {/* Kanban */}
              <div className="kanban-preview">
                <div className="kanban-col">
                  <div className="kanban-col-label col-label-blue">
                    <span className="k-dot blue" />TO DO
                  </div>
                  <div className="kanban-task">
                    OAuth flow integration
                    <div className="task-tag">🤖 AI</div>
                  </div>
                  <div className="kanban-task">
                    Vector DB indexing
                    <div className="task-tag">⚙️ BE</div>
                  </div>
                </div>
                <div className="kanban-col">
                  <div className="kanban-col-label col-label-amber">
                    <span className="k-dot amber" />IN PROGRESS
                  </div>
                  <div className="kanban-task">
                    LangGraph agent flow
                    <div className="task-tag">🔗 AI</div>
                  </div>
                  <div className="kanban-task">
                    Real-time dashboard
                    <div className="task-tag">💻 FE</div>
                  </div>
                </div>
                <div className="kanban-col">
                  <div className="kanban-col-label col-label-green">
                    <span className="k-dot green" />DONE
                  </div>
                  <div className="kanban-task">
                    MCP bridge setup
                    <div className="task-tag">🔌 Infra</div>
                  </div>
                  <div className="kanban-task">
                    Clerk auth integration
                    <div className="task-tag">🔐 Auth</div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="mockup-chart">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Task Completion Score (Online Eval)</div>
                    <div className="chart-subtitle">% runs flagged by evaluation · 94% coverage</div>
                  </div>
                  <div>
                    <div className="chart-value">1.6%</div>
                    <div className="chart-badge">94% coverage</div>
                  </div>
                </div>
                <div className="chart-legend">
                  <div className="legend-item"><span className="legend-dot blue" />Completion</div>
                  <div className="legend-item"><span className="legend-dot green" />Errors</div>
                </div>
                <div className="chart-body">
                  <svg className="chart-svg" viewBox="0 0 500 90" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-blue,#4f8ef7)" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="var(--accent-blue,#4f8ef7)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[22,44,66].map(y => (
                      <line key={y} x1="0" y1={y} x2="500" y2={y}
                        stroke="var(--border-primary)" strokeDasharray="4" opacity="0.5" />
                    ))}
                    <path className="chart-area-fill"
                      d="M0 78 C60 74,120 68,180 58 C240 48,300 64,360 30 C410 16,460 22,500 18 L500 90 L0 90Z" />
                    <path className="chart-path-main"
                      d="M0 78 C60 74,120 68,180 58 C240 48,300 64,360 30 C410 16,460 22,500 18" />
                    <path className="chart-path-secondary"
                      d="M0 84 C60 82,120 80,180 76 C240 72,300 76,360 68 C410 62,460 64,500 62" />
                    {[[180,58],[360,30],[500,18]].map(([x,y]) => (
                      <circle key={`${x}-${y}`} cx={x} cy={y} r="3"
                        fill="var(--accent-blue,#4f8ef7)"
                        stroke="var(--bg-primary)" strokeWidth="2"
                        style={{ filter: 'drop-shadow(0 0 5px #4f8ef7)' }} />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats  (mirrors AboutPage stats section exactly) ────────────── */}
      <section className="landing-stats-section" ref={addRef}>
        <div className="landing-container">
          <div className="landing-stats-grid landing-fade-up">
            {stats.map(s => (
              <div key={s.label} className="landing-stat-card">
                <div className="landing-stat-value">
                  <AnimatedCounter target={s.target} suffix={s.suffix} />
                </div>
                <div className="landing-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="landing-section landing-section-alt" ref={addRef}>
        <div className="landing-container landing-fade-up">
          <div className="landing-section-label">Platform Features</div>
          <h2 className="landing-section-title centered">
            Everything your team needs. Nothing it doesn't.
          </h2>
          <p className="landing-section-sub">
            Six core pillars power every workflow — from a two-person startup
            to a 200-person engineering org, all AI-enhanced.
          </p>
          <div className="landing-features-grid">
            {features.map(f => (
              <div key={f.title} className="landing-feature-card">
                <div className={`landing-feature-icon icon-${f.color}`}>{f.icon}</div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
                <div className="landing-feature-tags">
                  {f.tags.map(t => <span key={t} className="feature-tag-pill">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capability Atlas ───────────────────────────────────────────── */}
      <section className="landing-section" ref={addRef}>
        <div className="landing-container landing-fade-up">
          <div className="landing-section-label">Capability Atlas</div>
          <h2 className="landing-section-title centered">All DOIT capabilities in one platform</h2>
          <p className="landing-section-sub">
            No separate explorer required. Project execution, collaboration, AI orchestration,
            voice interaction, and reporting live in a single product surface.
          </p>

          <div className="landing-atlas-grid">
            {capabilityAtlas.map((group) => (
              <article key={group.title} className="landing-atlas-card">
                <div className="landing-atlas-head">
                  <div className="landing-atlas-icon">{group.icon}</div>
                  <h3>{group.title}</h3>
                </div>
                <div className="landing-atlas-points">
                  {group.points.map((point) => (
                    <div key={point} className="landing-atlas-point">
                      <FiCheckCircle size={14} />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agent Frameworks ───────────────────────────────────────────── */}
      <section className="landing-section landing-section-alt" ref={addRef}>
        <div className="landing-container landing-fade-up">
          <div className="landing-section-label">Agent Frameworks</div>
          <h2 className="landing-section-title centered">5 agent frameworks, one control plane</h2>
          <p className="landing-section-sub">
            Route each problem to the right execution mode without changing your workspace.
          </p>

          <div className="landing-framework-grid">
            {agentFrameworks.map((framework) => (
              <article key={framework.name} className="landing-framework-card">
                <div className="framework-badge">{framework.badge}</div>
                <h3>{framework.name}</h3>
                <p>{framework.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stack ───────────────────────────────────────────────────────── */}
      <section className="landing-section" ref={addRef}>
        <div className="landing-container landing-fade-up">
          <div className="landing-section-label">Tech Stack</div>
          <h2 className="landing-section-title centered">Built on the best tools</h2>
          <p className="landing-section-sub">
            Every component hand-picked for performance, scalability, and developer experience.
          </p>
          <div className="landing-stack-marquee" aria-label="Technology stack logos">
            <div className="landing-stack-track">
              {[...stackItems, ...stackItems].map(({ name, logo, short }, index) => (
                <div
                  key={`${name}-${index}`}
                  className="stack-logo-item"
                  aria-hidden={index >= stackItems.length}
                >
                  <div className="stack-logo-mark" aria-hidden="true">
                    <img
                      src={logo}
                      alt={`${name} logo`}
                      className="stack-logo-img"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) fallback.style.display = 'inline-flex';
                      }}
                    />
                    <span className="stack-logo-fallback">{short}</span>
                  </div>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA  (mirrors about-cta-section) ────────────────────────────── */}
      <section className="landing-cta-section" ref={addRef}>
        <div className="landing-container">
          <div className="landing-cta-inner landing-fade-up">
            <h2 className="landing-cta-title">Ready to get things done?</h2>
            <p className="landing-cta-sub">
              DOIT is already running for your team. Start your first sprint today
              and ship 4× faster with AI-powered planning.
            </p>
            <div className="landing-cta-actions">
              <button className="landing-cta-btn primary" onClick={() => navigate('/login')}>
                Start for free <FiArrowRight size={15} />
              </button>
              <button className="landing-cta-btn secondary" onClick={() => navigate('/login')}>
                Try DOIT-AI <BsStars size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-inner">
            <div className="footer-brand">
              <img src={doitLogo} alt="DOIT Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              DOIT
            </div>
            <div className="footer-copy">© 2025 DOIT · AI-Powered Task Management</div>
          </div>
        </div>
      </footer>
    </div>
  );
}