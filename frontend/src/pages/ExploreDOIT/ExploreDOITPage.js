import React, { useEffect, useRef } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiBookOpen,
  FiCheckCircle,
  FiCode,
  FiCompass,
  FiCpu,
  FiDatabase,
  FiFileText,
  FiGitBranch,
  FiLayers,
  FiLifeBuoy,
  FiLock,
  FiMessageCircle,
  FiMic,
  FiPieChart,
  FiShield,
  FiTarget,
  FiUsers,
  FiVolume2,
  FiZap,
} from "react-icons/fi";
import { BsStars } from "react-icons/bs";
import "./ExploreDOITPage.css";

const platformStats = [
  { value: "25+", label: "API Router Modules" },
  { value: "5", label: "AI Agent Framework Modes" },
  { value: "3", label: "Team Platforms Integrated" },
  { value: "4", label: "Realtime Collaboration Channels" },
];

const capabilityGroups = [
  {
    title: "Project Delivery Core",
    subtitle: "Everything needed to plan, execute, and close work.",
    icon: <FiTarget size={18} />,
    items: [
      {
        name: "Project Lifecycle Management",
        desc: "Create, edit, delete, and view projects with team ownership and role-aware access.",
      },
      {
        name: "Task System With Full Context",
        desc: "Create/update tasks, manage labels, attachments, comments, links, due dates, approvals, and closed-task tracking.",
      },
      {
        name: "Sprint Planning and Execution",
        desc: "Create sprints, manage backlogs, add/remove sprint tasks, start/complete cycles, and review sprint outcomes.",
      },
      {
        name: "Kanban Realtime Board",
        desc: "Project-level Kanban WebSocket channels broadcast task create/update/delete and drag-drop status changes live.",
      },
      {
        name: "Git Activity Tracking",
        desc: "Task-level branch, commit, and PR activity retrieval keeps implementation history tied to delivery records.",
      },
    ],
  },
  {
    title: "Team Collaboration",
    subtitle: "Conversations and notifications where teams already work.",
    icon: <FiUsers size={18} />,
    items: [
      {
        name: "Project Team Chat",
        desc: "Channel creation, threaded replies, edits, deletion, emoji reactions, mentions, search, read receipts, and file uploads.",
      },
      {
        name: "Realtime Chat Presence",
        desc: "WebSocket-based join/leave events, ping/pong keepalive, and channel-level live message flow.",
      },
      {
        name: "Slack Integration",
        desc: "Auto channel provisioning, bot token support, user invite lookup, lifecycle task notifications, and integration test messaging.",
      },
      {
        name: "Microsoft Teams Integration",
        desc: "Supports webhook-based setup and Graph credential setup with project-level notification dispatch.",
      },
      {
        name: "Discord Integration",
        desc: "Guild/bot setup flow with channel provisioning and outbound notification delivery per project.",
      },
    ],
  },
  {
    title: "AI Workspace and Agent Frameworks",
    subtitle: "Multi-agent architecture for different execution styles.",
    icon: <BsStars size={18} />,
    items: [
      {
        name: "DOIT-AI (LLM Assistant)",
        desc: "Conversation management, project-aware responses, file uploads, and image generation in assistant mode.",
      },
      {
        name: "Azure AI Foundry Agent",
        desc: "Dedicated conversation thread flow, message exchange, upload support, health checks, and thread reset tools.",
      },
      {
        name: "LangGraph Agent",
        desc: "Tool-enabled conversational agent with history reset/retrieval and workflow-style orchestration endpoints.",
      },
      {
        name: "MCP Agent",
        desc: "MCP conversation mode backed by task/sprint/project/member MCP server capabilities.",
      },
      {
        name: "Local Agent",
        desc: "Local inference path with independent conversation lifecycle and health operations for offline/controlled usage.",
      },
    ],
  },
  {
    title: "Analytics, Visualization, and Reporting",
    subtitle: "Operational intelligence for teams and leadership.",
    icon: <FiBarChart2 size={18} />,
    items: [
      {
        name: "Dashboard Bootstrap + KPIs",
        desc: "Single-call startup payload for analytics, reports, and approval/closed task summaries.",
      },
      {
        name: "System Dashboard (Super Admin)",
        desc: "Centralized platform-level analytics for governance, capacity visibility, and admin controls.",
      },
      {
        name: "Data Visualization Studio",
        desc: "Dataset upload/analyze/visualize/download pipeline with chart configuration and visualization cataloging.",
      },
      {
        name: "Structured Report Generation",
        desc: "Export report and export-PDF APIs support formal report payload generation and document sharing.",
      },
      {
        name: "AI Analytics Support",
        desc: "User performance analytics aggregation and insight generation pathways in analytics controllers.",
      },
    ],
  },
  {
    title: "Document Intelligence and Voice AI",
    subtitle: "Multimodal processing across files and speech.",
    icon: <FiCpu size={18} />,
    items: [
      {
        name: "Azure Document Intelligence Parsing",
        desc: "Analyze PDF/DOCX/forms/tables and return structured insight reports with parser metadata.",
      },
      {
        name: "Doc-Based Insight PDFs",
        desc: "Branded report output generated with ReportLab from analyzed insight payloads.",
      },
      {
        name: "Voice Agent Pipeline",
        desc: "Audio upload -> Whisper STT -> Azure Foundry Agent response -> Azure TTS synthesis -> streamed audio reply.",
      },
      {
        name: "Voice Utilities",
        desc: "Dedicated transcribe-only, synthesize-only, and voice health endpoints for diagnostics and modular use.",
      },
      {
        name: "Persona-Aware Speech",
        desc: "Voice personas map to TTS voice styles for friendly/professional/direct/assistant experiences.",
      },
    ],
  },
  {
    title: "Access, Identity, and Administration",
    subtitle: "Security controls and governance for growing organizations.",
    icon: <FiShield size={18} />,
    items: [
      {
        name: "Role-Based Access",
        desc: "Member, Admin, and Super Admin role separation with route-level protections and scoped actions.",
      },
      {
        name: "Auth and Session Management",
        desc: "Register, login, OAuth sync, logout, logout-all, refresh-session, active-session listing, and password changes.",
      },
      {
        name: "User Governance",
        desc: "Admin user listing plus super-admin tools for role updates, project mapping, and guarded user deletion.",
      },
      {
        name: "Profile and Integration Preferences",
        desc: "Personal info, education, certificates, organization details, and webhook integration preferences.",
      },
      {
        name: "Platform Health Endpoints",
        desc: "Root/health/warmup checks with startup readiness and service-level health verification across AI modules.",
      },
    ],
  },
];

const architectureFlow = [
  {
    icon: <FiLayers size={18} />,
    title: "Unified Frontend Workspace",
    desc: "Dashboard, Projects, Tasks, Sprints, Analytics Studio, AI Assistant, Team Chat, and profile/admin pages.",
  },
  {
    icon: <FiDatabase size={18} />,
    title: "FastAPI Modular Backend",
    desc: "Domain routers + controllers for projects, tasks, sprints, chat, integrations, voice, and analytics.",
  },
  {
    icon: <FiCpu size={18} />,
    title: "AI and Agent Layer",
    desc: "Foundry, LangGraph, MCP, Local, and core LLM assistant modes operate as specialized agent channels.",
  },
  {
    icon: <FiMessageCircle size={18} />,
    title: "Realtime and External Connectors",
    desc: "Kanban/chat websockets plus Slack, Teams, and Discord integration orchestration for delivery updates.",
  },
];

const highlightTags = [
  { icon: <FiBookOpen size={13} />, label: "Project Intelligence" },
  { icon: <FiGitBranch size={13} />, label: "Delivery Traceability" },
  { icon: <FiFileText size={13} />, label: "Actionable Reporting" },
  { icon: <FiMic size={13} />, label: "Voice-Native Interaction" },
  { icon: <FiVolume2 size={13} />, label: "Speech Response" },
  { icon: <FiLock size={13} />, label: "Role-Based Security" },
];

export default function ExploreDOITPage() {
  const sectionsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("explore-visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    sectionsRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = (el) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  return (
    <div className="explore-page">
      <section className="explore-hero">
        <div className="explore-hero-bg" aria-hidden="true">
          <div className="explore-orb orb-a" />
          <div className="explore-orb orb-b" />
          <div className="explore-grid" />
        </div>

        <div className="explore-container">
          <div className="explore-pill">
            <FiCompass size={14} />
            <span>Explore DOIT</span>
          </div>

          <h1 className="explore-title">
            Full Capability Map of
            <span> DOIT AI Task Management System</span>
          </h1>

          <p className="explore-subtitle">
            A complete guide to the modules, agent frameworks, collaboration engines,
            reporting stack, integrations, and governance controls implemented in your platform.
          </p>

          <div className="explore-tag-wrap">
            {highlightTags.map((tag) => (
              <div key={tag.label} className="explore-tag">
                {tag.icon}
                <span>{tag.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="explore-stats" ref={addRef}>
        <div className="explore-container explore-fade-up">
          <div className="explore-stat-grid">
            {platformStats.map((stat) => (
              <article key={stat.label} className="explore-stat-card">
                <div className="explore-stat-value">{stat.value}</div>
                <div className="explore-stat-label">{stat.label}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="explore-arch" ref={addRef}>
        <div className="explore-container explore-fade-up">
          <div className="explore-section-head">
            <div className="explore-eyebrow">Platform Architecture</div>
            <h2>How DOIT Is Structured End-to-End</h2>
          </div>

          <div className="explore-arch-grid">
            {architectureFlow.map((step, index) => (
              <article key={step.title} className="explore-arch-card">
                <div className="explore-arch-index">0{index + 1}</div>
                <div className="explore-arch-icon">{step.icon}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="explore-catalog" ref={addRef}>
        <div className="explore-container explore-fade-up">
          <div className="explore-section-head">
            <div className="explore-eyebrow">Feature Catalog</div>
            <h2>Detailed Functionalities Across All Modules</h2>
            <p>
              This section consolidates delivery, collaboration, AI frameworks, analytics,
              document intelligence, voice interaction, and administrative controls in one place.
            </p>
          </div>

          <div className="explore-group-grid">
            {capabilityGroups.map((group) => (
              <article key={group.title} className="explore-group-card">
                <header className="explore-group-head">
                  <div className="explore-group-icon">{group.icon}</div>
                  <div>
                    <h3>{group.title}</h3>
                    <p>{group.subtitle}</p>
                  </div>
                </header>

                <div className="explore-item-list">
                  {group.items.map((item) => (
                    <div key={item.name} className="explore-item">
                      <div className="explore-item-check">
                        <FiCheckCircle size={14} />
                      </div>
                      <div>
                        <h4>{item.name}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="explore-footer" ref={addRef}>
        <div className="explore-container explore-fade-up">
          <div className="explore-footer-card">
            <div>
              <div className="explore-eyebrow">DOIT Snapshot</div>
              <h2>Enterprise-Ready, Agent-Driven Delivery Platform</h2>
              <p>
                DOIT combines advanced project operations with multi-agent AI orchestration,
                realtime team workflows, document intelligence, and voice interaction in one
                cohesive operating system for product teams.
              </p>
            </div>
            <div className="explore-footer-badges">
              <span><FiZap size={14} /> AI-Native PM</span>
              <span><FiActivity size={14} /> Analytics-Driven Decisions</span>
              <span><FiCode size={14} /> Developer-Integrated Workflow</span>
              <span><FiLifeBuoy size={14} /> Built-In Operational Visibility</span>
              <span><FiPieChart size={14} /> Report + Export Ready</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
