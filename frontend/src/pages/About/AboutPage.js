import React, { useEffect, useRef } from "react";
import { FiCheckCircle, FiZap, FiUsers, FiShield, FiBarChart2, FiMessageCircle, FiArrowRight, FiStar } from "react-icons/fi";
import { BsStars } from "react-icons/bs";
import "./AboutPage.css";

/* ── Data ─────────────────────────────────────────────────────────────── */
const stats = [
  { value: "10K+", label: "Tasks Completed" },
  { value: "500+", label: "Teams Onboarded" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "4.9★", label: "User Rating" },
];

const features = [
  {
    icon: <FiZap size={28} />,
    color: "blue",
    title: "Smart Task Management",
    desc: "Create, assign, and track tasks with full lifecycle support — from backlog to done. Set priorities, due dates, and custom fields that fit your team's workflow, not the other way around.",
  },
  {
    icon: <FiUsers size={28} />,
    color: "green",
    title: "Real-Time Collaboration",
    desc: "Built-in team chat, live notifications, and comment threads on every task. Your team stays in sync without switching between a dozen apps. Everything lives in one place.",
  },
  {
    icon: <BsStars size={28} />,
    color: "purple",
    title: "DOIT-AI Assistant",
    desc: "An intelligent AI layer trained on your project context. Ask it to summarize sprint progress, draft task descriptions, flag blockers, or suggest re-prioritizations based on deadlines.",
  },
  {
    icon: <FiBarChart2 size={28} />,
    color: "amber",
    title: "Analytics & Insights",
    desc: "Visualize velocity, burndown, cycle time, and team throughput with DOIT Analytics. Drill into any metric, export reports, and make data-driven decisions without needing a data team.",
  },
  {
    icon: <FiShield size={28} />,
    color: "red",
    title: "Role-Based Access Control",
    desc: "Granular permission management across Super Admin, Admin, and Member roles. Control who sees what, who can approve tasks, and who manages project membership — with full audit trails.",
  },
  {
    icon: <FiMessageCircle size={28} />,
    color: "teal",
    title: "Integrated Team Chat",
    desc: "Persistent project-scoped chat channels so conversations stay connected to context. No more digging through Slack threads to find why a decision was made three sprints ago.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Create a Project",
    desc: "Set up a project in seconds. Define your team, invite members, and choose a workflow template — Scrum, Kanban, or custom.",
  },
  {
    step: "02",
    title: "Build Your Backlog",
    desc: "Add tasks, epics, and stories. Attach files, set priorities, and link dependencies. Your backlog becomes the single source of truth.",
  },
  {
    step: "03",
    title: "Run Sprints",
    desc: "Plan sprints, assign work, and track daily progress on the board. DOIT surfaces blockers automatically so nothing slips through.",
  },
  {
    step: "04",
    title: "Ship & Reflect",
    desc: "Close sprints, review velocity, and feed learnings back into the next cycle. Continuous improvement, baked in from day one.",
  },
];

const values = [
  { icon: <FiCheckCircle size={20} />, text: "Transparency over bureaucracy" },
  { icon: <FiCheckCircle size={20} />, text: "Speed without sacrificing clarity" },
  { icon: <FiCheckCircle size={20} />, text: "AI that augments, not replaces" },
  { icon: <FiCheckCircle size={20} />, text: "Privacy and security by default" },
  { icon: <FiCheckCircle size={20} />, text: "Built for real teams, not demos" },
  { icon: <FiCheckCircle size={20} />, text: "Open to feedback, always evolving" },
];

const developers = [
  {
    name: "Abhishek Nage",
    role: "Software Engineer",
    bio: "Architect of scalable applications with expertise in Python,Agentic Frameworks and AI integrations. Passionate about building intelligent systems that empower teams to deliver faster.",
    image: "https://media.licdn.com/dms/image/v2/D4D03AQGJxBBDIurS3g/profile-displayphoto-crop_800_800/B4DZmgfpGTJcAI-/0/1759334278764?e=1776297600&v=beta&t=1lkngnKhLFLxm_cjzXrZLBEqEQF0Cw7TgANxf07CUrs",
    linkedin: "https://www.linkedin.com/in/abhisheknage16/"
  },
  {
    name: "Kamlesh Choudhary",
    role: "Software Engineer",
    bio: "Specialist in robust AI systems, database optimization, API development, and microservices. Ensures DOIT's core infrastructure scales seamlessly under heavy loads.",
    image: "https://media.licdn.com/dms/image/v2/D4D03AQGF5bMiuokK2A/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1725448834074?e=1776297600&v=beta&t=L653uVCQ9nb8yXUIYFzIuHZW0d_6-5xpJmMAObp4Jnc",
    linkedin: "https://www.linkedin.com/in/kamlesh-choudhary-775512257/"
  }
];

/* ── Component ───────────────────────────────────────────────────────── */
export default function AboutPage() {
  const sectionsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("about-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionsRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = (el) => {
    if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el);
  };

  return (
    <div className="about-page">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="about-hero">
        <div className="about-hero-bg" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid" />
        </div>
        <div className="about-container">
          <div className="about-hero-badge">
            <BsStars size={14} />
            <span>Modern Project Intelligence</span>
          </div>
          <h1 className="about-hero-title">
            The platform that
            <span className="about-hero-gradient"> gets work done</span>
          </h1>
          <p className="about-hero-sub">
            DOIT is a full-stack project management platform built for teams that
            move fast. Tasks, sprints, AI assistance, analytics, and team chat —
            unified in one focused workspace.
          </p>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="about-stats-section" ref={addRef}>
        <div className="about-container">
          <div className="about-stats-grid about-fade-up">
            {stats.map((s) => (
              <div key={s.label} className="about-stat-card">
                <div className="about-stat-value">{s.value}</div>
                <div className="about-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ───────────────────────────────────────────────────── */}
      <section className="about-section" ref={addRef}>
        <div className="about-container about-fade-up">
          <div className="about-section-label">Our Mission</div>
          <div className="about-mission-grid">
            <div className="about-mission-text">
              <h2 className="about-section-title">
                Built because project management shouldn't feel like a project
              </h2>
              <p className="about-body-text">
                Most project tools are designed for the tool's sake — layers of
                abstraction, endless configuration, and features nobody asked for.
                DOIT was built by a team frustrated with exactly that. We wanted
                something opinionated enough to be fast, flexible enough to handle
                real complexity, and smart enough to get out of the way.
              </p>
              <p className="about-body-text">
                The result is a platform where a developer can file a bug, a PM can
                prioritize a sprint, and an exec can check delivery health — all
                from the same clean interface, with an AI layer that ties it together.
              </p>
              <div className="about-values-list">
                {values.map((v) => (
                  <div key={v.text} className="about-value-item">
                    <span className="about-value-icon">{v.icon}</span>
                    <span>{v.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="about-mission-visual">
              <div className="about-mission-card">
                <div className="mission-card-header">
                  <div className="mission-card-dots">
                    <span /><span /><span />
                  </div>
                  <span className="mission-card-title">Sprint #14 — Active</span>
                </div>
                <div className="mission-card-tasks">
                  {[
                    { label: "Design system audit", done: true, tag: "Design" },
                    { label: "Auth flow refactor", done: true, tag: "Backend" },
                    { label: "AI summary endpoint", done: false, tag: "AI" },
                    { label: "Dashboard analytics v2", done: false, tag: "Frontend" },
                    { label: "Load testing suite", done: false, tag: "QA" },
                  ].map((t) => (
                    <div key={t.label} className={`mission-task${t.done ? " done" : ""}`}>
                      <span className="mission-task-check">
                        {t.done ? <FiCheckCircle size={14} /> : <span className="task-circle" />}
                      </span>
                      <span className="mission-task-label">{t.label}</span>
                      <span className={`mission-task-tag tag-${t.tag.toLowerCase()}`}>{t.tag}</span>
                    </div>
                  ))}
                </div>
                <div className="mission-card-footer">
                  <div className="mission-progress-bar">
                    <div className="mission-progress-fill" style={{ width: "40%" }} />
                  </div>
                  <span className="mission-progress-text">40% complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="about-section about-section-alt" ref={addRef}>
        <div className="about-container about-fade-up">
          <div className="about-section-label">Platform Features</div>
          <h2 className="about-section-title about-centered">
            Everything your team needs. Nothing it doesn't.
          </h2>
          <p className="about-section-sub">
            Six core pillars power every workflow in DOIT — from a two-person
            startup to a 200-person engineering org.
          </p>
          <div className="about-features-grid">
            {features.map((f) => (
              <div key={f.title} className={`about-feature-card`}>
                <div className={`about-feature-icon icon-${f.color}`}>{f.icon}</div>
                <h3 className="about-feature-title">{f.title}</h3>
                <p className="about-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="about-section" ref={addRef}>
        <div className="about-container about-fade-up">
          <div className="about-section-label">How It Works</div>
          <h2 className="about-section-title about-centered">
            From zero to shipped — in four steps
          </h2>
          <div className="about-workflow-grid">
            {workflow.map((w, i) => (
              <div key={w.step} className="about-workflow-card">
                <div className="about-workflow-step">{w.step}</div>
                {i < workflow.length - 1 && (
                  <div className="about-workflow-connector" aria-hidden="true">
                    <FiArrowRight size={16} />
                  </div>
                )}
                <h3 className="about-workflow-title">{w.title}</h3>
                <p className="about-workflow-desc">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Callout ────────────────────────────────────────────────── */}
      <section className="about-section about-section-alt" ref={addRef}>
        <div className="about-container about-fade-up">
          <div className="about-ai-callout">
            <div className="about-ai-left">
              <div className="about-ai-badge">
                <BsStars size={16} />
                <span>DOIT-AI</span>
              </div>
              <h2 className="about-ai-title">
                Your project intelligence layer
              </h2>
              <p className="about-body-text">
                DOIT-AI is not a chatbot bolted on as an afterthought. It's a
                context-aware assistant trained on your sprint data, task history,
                and team activity. Ask it anything about your projects and get
                actionable answers, not generic responses.
              </p>
              <ul className="about-ai-list">
                {[
                  "Summarize sprint progress in plain English",
                  "Auto-generate task descriptions from a one-liner",
                  "Identify at-risk tasks before they become blockers",
                  "Suggest priority changes based on due date proximity",
                  "Answer questions about any project or task history",
                ].map((item) => (
                  <li key={item} className="about-ai-list-item">
                    <FiStar size={13} className="about-ai-star" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="about-ai-right">
              <div className="about-ai-chat">
                <div className="ai-chat-header">
                  <div className="ai-chat-avatar">
                    <BsStars size={16} />
                  </div>
                  <span>DOIT-AI</span>
                  <span className="ai-chat-status" />
                </div>
                <div className="ai-chat-messages">
                  <div className="ai-msg user">What's blocking Sprint 14?</div>
                  <div className="ai-msg bot">
                    <strong>2 blockers identified:</strong>
                    <br />• "AI summary endpoint" has no assignee and is due in 2 days.
                    <br />• "Load testing suite" depends on a pending PR from @karan.
                    <br /><br />
                    Want me to draft a re-prioritization plan?
                  </div>
                  <div className="ai-msg user">Yes, and notify the team</div>
                  <div className="ai-msg bot">Done — plan drafted and team notified via chat. ✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Our Developers ─────────────────────────────────────────────── */}
      <section className="about-section" ref={addRef}>
        <div className="about-container about-fade-up">
          <div className="about-section-label">Meet the Team</div>
          <h2 className="about-section-title about-centered">
            The developers powering DOIT
          </h2>
          <p className="about-section-sub">
            Passionate engineers dedicated to building the future of project management.
          </p>
          <div className="about-devs-grid">
            {developers.map((d) => (
              <a href={d.linkedin} target="_blank" rel="noopener noreferrer" className="about-dev-card" key={d.name}>
                <div 
                  className="dev-image" 
                  style={{ 
                    backgroundImage: `url(${d.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} 
                />
                <h3>{d.name}</h3>
                <div className="dev-role">{d.role}</div>
                <p>{d.bio}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="about-cta-section" ref={addRef}>
        <div className="about-container about-fade-up">
          <div className="about-cta-inner">
            <h2 className="about-cta-title">Ready to get things done?</h2>
            <p className="about-cta-sub">
              DOIT is already running for your team. Head to the dashboard and
              start your first sprint today.
            </p>
            <div className="about-cta-actions">
              <a href="/" className="about-cta-btn primary">
                Go to Dashboard <FiArrowRight size={16} />
              </a>
              <a href="/ai-assistant" className="about-cta-btn secondary">
                Try DOIT-AI <BsStars size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}