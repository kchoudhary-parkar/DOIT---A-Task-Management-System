import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiZap, FiUsers, FiBarChart2, FiShield, FiMessageCircle,
  FiCode, FiArrowRight, FiPlay, FiCheckCircle,
} from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';
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

const stackItems = [
  { emoji: '⚛️', name: 'React 19' },
  { emoji: '🐍', name: 'FastAPI' },
  { emoji: '🍃', name: 'MongoDB' },
  { emoji: '🔴', name: 'Redis' },
  { emoji: '🌿', name: 'Celery' },
  { emoji: '🔗', name: 'LangChain' },
  { emoji: '🕸️', name: 'LangGraph' },
  { emoji: '📚', name: 'LlamaIndex' },
  { emoji: '🎨', name: 'ChromaDB' },
  { emoji: '☁️', name: 'Azure AI' },
  { emoji: '🤖', name: 'GPT-4o' },
  { emoji: '🦙', name: 'Ollama' },
  { emoji: '🔌', name: 'MCP' },
  { emoji: '🔐', name: 'Clerk' },
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
          <div className="brand-icon-wrap">
            <FiZap size={16} />
          </div>
          DOIT
        </div>

        <nav className="landing-nav-links">
          {['Products', 'Features', 'Docs', 'Pricing', 'Company'].map(item => (
            <span key={item} className="landing-nav-link">
              {item}
              {['Products', 'Company'].includes(item) && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              )}
            </span>
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

      {/* ── Stack ───────────────────────────────────────────────────────── */}
      <section className="landing-section" ref={addRef}>
        <div className="landing-container landing-fade-up">
          <div className="landing-section-label">Tech Stack</div>
          <h2 className="landing-section-title centered">Built on the best tools</h2>
          <p className="landing-section-sub">
            Every component hand-picked for performance, scalability, and developer experience.
          </p>
          <div className="landing-stack-grid">
            {stackItems.map(({ emoji, name }) => (
              <div key={name} className="stack-item">
                <span className="stack-item-emoji">{emoji}</span>
                {name}
              </div>
            ))}
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
              <div className="brand-icon-wrap" style={{ width: 22, height: 22 }}>
                <FiZap size={12} />
              </div>
              DOIT
            </div>
            <div className="footer-copy">© 2025 DOIT · AI-Powered Task Management</div>
          </div>
        </div>
      </footer>
    </div>
  );
}