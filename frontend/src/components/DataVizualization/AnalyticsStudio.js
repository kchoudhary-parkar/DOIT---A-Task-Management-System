import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, FileSpreadsheet, BarChart3, LineChart, PieChart, ScatterChart,
  Database, Sparkles, Download, Eye, ChevronRight, TrendingUp, Activity,
  Calendar, Layers, Settings, Search, X, Check, AlertCircle, Loader2,
  Grid3x3, List, Brain, Zap, Target, Award, Clock, AlertTriangle,
  RefreshCw, MessageSquare, Image, ChevronDown, ChevronUp, Users,
  CheckCircle, XCircle, BarChart2, TrendingDown, Star, Flame
} from 'lucide-react';
import {
  PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart,
  RadialBar, LineChart as RechartsLine, Line, AreaChart, Area
} from 'recharts';
import './AnalyticsStudio.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'X-Tab-Session-Key': sessionStorage.getItem('tab_session_key') || '',
  'Content-Type': 'application/json',
});

// ── Color palettes ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  'To Do': '#64748b', 'In Progress': '#3b82f6', 'Done': '#10b981',
  'Closed': '#6366f1', 'Dev Complete': '#f59e0b'
};
const PRIORITY_COLORS = {
  'Critical': '#dc2626', 'High': '#ef4444', 'Medium': '#f59e0b',
  'Low': '#22c55e'
};
const CHART_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// ── Sub-components ─────────────────────────────────────────────────────────────

const StatPill = ({ icon: Icon, label, value, color, sublabel }) => (
  <div className="as-stat-pill" style={{ '--pill-color': color }}>
    <div className="as-stat-pill-icon"><Icon size={20} /></div>
    <div className="as-stat-pill-body">
      <div className="as-stat-pill-value">{value}</div>
      <div className="as-stat-pill-label">{label}</div>
      {sublabel && <div className="as-stat-pill-sub">{sublabel}</div>}
    </div>
  </div>
);

const ChartCard = ({ title, children, icon: Icon, className = '' }) => (
  <div className={`as-chart-card ${className}`}>
    <div className="as-chart-card-header">
      {Icon && <Icon size={16} />}
      <span>{title}</span>
    </div>
    <div className="as-chart-card-body">{children}</div>
  </div>
);

const AlertBadge = ({ type, tasks }) => {
  if (!tasks || tasks.length === 0) return null;
  const colors = { overdue: '#ef4444', soon: '#f59e0b' };
  const icons = { overdue: XCircle, soon: Clock };
  const Icon = icons[type];
  return (
    <div className="as-alert-badge" style={{ '--badge-color': colors[type] }}>
      <Icon size={14} />
      <span>{type === 'overdue' ? `${tasks.length} overdue` : `${tasks.length} due soon`}</span>
    </div>
  );
};

const MarkdownRenderer = ({ content }) => {
  // Simple markdown → JSX renderer
  const lines = content.split('\n');
  return (
    <div className="as-markdown">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>;
        if (line.startsWith('**') && line.endsWith('**')) return <strong key={i}>{line.slice(2, -2)}</strong>;
        if (line.startsWith('- ')) return <li key={i}>{line.slice(2)}</li>;
        if (line.match(/^\d+\./)) return <li key={i} className="numbered">{line.replace(/^\d+\.\s*/, '')}</li>;
        if (line.trim() === '') return <br key={i} />;
        // Inline bold
        const parts = line.split(/\*\*(.*?)\*\*/g);
        if (parts.length > 1) {
          return (
            <p key={i}>
              {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
            </p>
          );
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
};

// ── User Analytics Tab ────────────────────────────────────────────────────────
const UserAnalyticsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [insight, setInsight] = useState('');
  const [insightTokens, setInsightTokens] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [question, setQuestion] = useState('');
  const [askMode, setAskMode] = useState(false);
  const [imageType, setImageType] = useState('performance_summary');
  const inputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-analytics/data`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error('Analytics fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchInsight = async (customQuestion = null) => {
    setInsightLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-analytics/insight`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ question: customQuestion || null }),
      });
      const json = await res.json();
      if (json.success) {
        setInsight(json.insight);
        setInsightTokens(json.tokens);
      }
    } catch (e) {
      console.error('Insight error:', e);
    } finally {
      setInsightLoading(false);
      setQuestion('');
      setAskMode(false);
    }
  };

  const generateImage = async () => {
    setImageLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-analytics/generate-image`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ viz_type: imageType }),
      });
      const json = await res.json();
      if (json.success) setGeneratedImage(json.image_url || json.filepath);
    } catch (e) {
      console.error('Image error:', e);
    } finally {
      setImageLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="as-loading-state">
        <div className="as-loader-ring" />
        <span>Loading your analytics…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="as-empty-state">
        <Brain size={48} />
        <h3>No Analytics Available</h3>
        <p>Start managing tasks and projects to see your analytics.</p>
      </div>
    );
  }

  const { summary, charts, alerts, user } = data;

  // Prepare chart data
  const statusData = Object.entries(charts.status_distribution || {}).map(([name, value]) => ({
    name, value, fill: STATUS_COLORS[name] || '#94a3b8'
  }));

  const priorityData = Object.entries(charts.priority_distribution || {}).map(([name, value]) => ({
    name, value, fill: PRIORITY_COLORS[name] || '#94a3b8'
  }));

  const projectData = (charts.project_progress || []).map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    Completed: p.completed,
    'In Progress': p.in_progress,
    Total: p.total,
    pct: p.progress_pct,
  }));

  const sprintData = (charts.sprint_velocity || []).slice(-6).map(s => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + '…' : s.name,
    'Completion %': s.completion_rate,
    Completed: s.completed,
    Total: s.total,
  }));

  const trendData = Object.entries(charts.completion_trend || {})
    .sort((a, b) => new Date(a[0].replace('Week of ', '')) - new Date(b[0].replace('Week of ', '')))
    .map(([week, count]) => ({ week: week.replace('Week of ', ''), tasks: count }));

  const teamData = Object.entries(charts.team_workload || {})
    .map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, tasks: value }))
    .sort((a, b) => b.tasks - a.tasks).slice(0, 6);

  const dayData = Object.entries(charts.day_workload || {}).map(([day, count]) => ({
    day: day.slice(0, 3), count
  }));

  const issueTypeData = Object.entries(charts.issue_type_distribution || {}).map(([name, value]) => ({
    name, value
  }));

  return (
    <div className="as-user-analytics">
      {/* Header Row */}
      <div className="as-ua-header">
        <div className="as-ua-greeting">
          <div className="as-ua-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <div>
            <h2>Hi, {user.name.split(' ')[0]} 👋</h2>
            <p className="as-ua-subtitle">Here's your performance overview</p>
          </div>
        </div>
        <div className="as-ua-alerts">
          <AlertBadge type="overdue" tasks={alerts.overdue_tasks} />
          <AlertBadge type="soon" tasks={alerts.due_soon_tasks} />
          <button className="as-refresh-btn" onClick={fetchData} title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="as-kpi-strip">
        <StatPill icon={Target} label="Total Tasks" value={summary.total_tasks} color="#3b82f6" />
        <StatPill icon={CheckCircle} label="Completed" value={summary.done_count} color="#10b981"
          sublabel={`${summary.completion_rate}% rate`} />
        <StatPill icon={AlertTriangle} label="Overdue" value={summary.overdue_count} color="#ef4444" />
        <StatPill icon={Clock} label="Due Soon" value={summary.due_soon_count} color="#f59e0b" />
        <StatPill icon={BarChart2} label="Projects" value={summary.total_projects} color="#8b5cf6" />
        <StatPill icon={Flame} label="Active Sprints" value={summary.active_sprints} color="#f97316" />
      </div>

      {/* Completion Rate Radial */}
      <div className="as-charts-grid">
        <ChartCard title="Completion Rate" icon={Award} className="as-card-sm">
          <div className="as-radial-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%"
                data={[{ name: 'Rate', value: summary.completion_rate, fill: '#10b981' }]}
                startAngle={90} endAngle={90 - (360 * summary.completion_rate / 100)}>
                <RadialBar dataKey="value" cornerRadius={8} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="as-radial-center">
              <span className="as-radial-pct">{summary.completion_rate}%</span>
              <span className="as-radial-label">done</span>
            </div>
          </div>
        </ChartCard>

        {/* Task Status Pie */}
        <ChartCard title="Task Status" icon={PieChart} className="as-card-sm">
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={70}
                dataKey="value" label={({ name, percent }) =>
                  percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(val, name) => [val, name]} />
              <Legend iconSize={10} />
            </RechartsPie>
          </ResponsiveContainer>
        </ChartCard>

        {/* Priority Distribution */}
        <ChartCard title="Priority Breakdown" icon={AlertTriangle} className="as-card-sm">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Issue Type */}
        <ChartCard title="Issue Types" icon={Grid3x3} className="as-card-sm">
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie data={issueTypeData} cx="50%" cy="50%" outerRadius={70}
                dataKey="value" label={({ name, percent }) =>
                  percent > 0.05 ? name : ''}>
                {issueTypeData.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} />
            </RechartsPie>
          </ResponsiveContainer>
        </ChartCard>

        {/* Project Progress */}
        {projectData.length > 0 && (
          <ChartCard title="Project Progress" icon={BarChart3} className="as-card-wide">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={projectData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={50} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="In Progress" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Sprint Velocity */}
        {sprintData.length > 0 && (
          <ChartCard title="Sprint Velocity" icon={TrendingUp} className="as-card-wide">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sprintData}>
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="Completion %" stroke="#3b82f6"
                  fill="url(#velocityGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Weekly Completion Trend */}
        {trendData.length > 0 && (
          <ChartCard title="8-Week Completion Trend" icon={TrendingUp} className="as-card-wide">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="tasks" stroke="#10b981"
                  fill="url(#trendGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Day-of-week Workload */}
        <ChartCard title="Activity by Day" icon={Calendar} className="as-card-md">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {dayData.map((_, i) => (
                  <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Team Workload */}
        {teamData.length > 0 && (
          <ChartCard title="Team Task Distribution" icon={Users} className="as-card-md">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={teamData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* ── AI Insights Panel ─────────────────────────────────────────────── */}
      <div className="as-ai-panel">
        <div className="as-ai-panel-header">
          <div className="as-ai-panel-title">
            <Brain size={22} />
            <span>AI Performance Insights</span>
            <span className="as-ai-badge">GPT-5</span>
          </div>
          <div className="as-ai-panel-actions">
            <button className="as-ai-btn as-ai-btn-secondary"
              onClick={() => setAskMode(v => !v)}>
              <MessageSquare size={15} />
              Ask a question
            </button>
            <button className="as-ai-btn as-ai-btn-primary"
              onClick={() => fetchInsight()} disabled={insightLoading}>
              {insightLoading ? <Loader2 size={15} className="as-spin" /> : <Sparkles size={15} />}
              {insightLoading ? 'Analyzing…' : 'Analyze My Performance'}
            </button>
          </div>
        </div>

        {askMode && (
          <div className="as-ai-ask-row">
            <input ref={inputRef} className="as-ai-input" placeholder="e.g. What are my bottlenecks? How can I improve velocity?"
              value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && question.trim() && fetchInsight(question)} />
            <button className="as-ai-btn as-ai-btn-primary"
              onClick={() => question.trim() && fetchInsight(question)}
              disabled={!question.trim() || insightLoading}>
              {insightLoading ? <Loader2 size={15} className="as-spin" /> : <Zap size={15} />}
              Ask
            </button>
          </div>
        )}

        {insightLoading && !insight && (
          <div className="as-ai-loading">
            <div className="as-ai-dots">
              <span /><span /><span />
            </div>
            <span>GPT-5 is analyzing your data…</span>
          </div>
        )}

        {insight && (
          <div className="as-ai-response">
            <MarkdownRenderer content={insight} />
            {insightTokens && (
              <div className="as-ai-footer">
                <span>Tokens used: {insightTokens.total || '—'}</span>
              </div>
            )}
          </div>
        )}

        {!insight && !insightLoading && (
          <div className="as-ai-placeholder">
            <Sparkles size={32} />
            <p>Click "Analyze My Performance" to get AI-powered insights about your productivity, risks, and recommendations.</p>
          </div>
        )}
      </div>

      {/* ── AI Image Generator ────────────────────────────────────────────── */}
      <div className="as-image-panel">
        <div className="as-image-panel-header">
          <div className="as-ai-panel-title">
            <Image size={20} />
            <span>AI Visual Summary</span>
            <span className="as-flux-badge">FLUX</span>
          </div>
          <div className="as-image-controls">
            <select className="as-select" value={imageType} onChange={e => setImageType(e.target.value)}>
              <option value="performance_summary">Performance Summary</option>
              <option value="project_map">Project Network</option>
              <option value="velocity_chart">Velocity Art</option>
            </select>
            <button className="as-ai-btn as-ai-btn-primary"
              onClick={generateImage} disabled={imageLoading}>
              {imageLoading ? <Loader2 size={15} className="as-spin" /> : <Sparkles size={15} />}
              {imageLoading ? 'Generating…' : 'Generate Visual'}
            </button>
          </div>
        </div>

        {generatedImage ? (
          <div className="as-generated-image">
            <img src={`${API_BASE_URL}${generatedImage}`} alt="AI-generated performance visual" />
            <div className="as-image-overlay">
              <a href={`${API_BASE_URL}${generatedImage}`} download className="as-ai-btn as-ai-btn-secondary">
                <Download size={15} /> Download
              </a>
            </div>
          </div>
        ) : (
          <div className="as-image-placeholder">
            {imageLoading ? (
              <div className="as-image-loading">
                <div className="as-loader-ring" />
                <span>FLUX is creating your visual…</span>
              </div>
            ) : (
              <>
                <div className="as-image-preview-art">
                  <div className="as-preview-circle c1" />
                  <div className="as-preview-circle c2" />
                  <div className="as-preview-circle c3" />
                </div>
                <p>Generate an AI-crafted visual representation of your performance metrics</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Alert Details ─────────────────────────────────────────────────── */}
      {(alerts.overdue_tasks.length > 0 || alerts.due_soon_tasks.length > 0) && (
        <div className="as-alerts-section">
          {alerts.overdue_tasks.length > 0 && (
            <div className="as-alert-group as-alert-overdue">
              <div className="as-alert-group-header">
                <XCircle size={16} /> Overdue Tasks
              </div>
              {alerts.overdue_tasks.map((t, i) => (
                <div key={i} className="as-alert-item">
                  <span className="as-ticket-badge">{t.ticket_id}</span>
                  <span className="as-alert-title">{t.title}</span>
                  <span className="as-alert-days">{t.days_overdue}d overdue</span>
                  <span className={`as-priority-tag as-priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                </div>
              ))}
            </div>
          )}
          {alerts.due_soon_tasks.length > 0 && (
            <div className="as-alert-group as-alert-soon">
              <div className="as-alert-group-header">
                <Clock size={16} /> Due Within 7 Days
              </div>
              {alerts.due_soon_tasks.map((t, i) => (
                <div key={i} className="as-alert-item">
                  <span className="as-ticket-badge">{t.ticket_id}</span>
                  <span className="as-alert-title">{t.title}</span>
                  <span className={`as-priority-tag as-priority-${t.priority?.toLowerCase()}`}>{t.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Upload & Analyze Tab (existing functionality) ─────────────────────────────
const UploadAnalyzeTab = () => {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [visualizations, setVisualizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('configure');
  const [vizConfig, setVizConfig] = useState({
    chart_type: 'scatter', x_column: '', y_column: '',
    color_column: '', title: '', library: 'plotly'
  });

  useEffect(() => {
    fetchDatasets();
    fetchVisualizations();
  }, []);

  const fetchDatasets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/data-viz/datasets`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setDatasets(data.datasets);
    } catch (e) { console.error(e); }
  };

  const fetchVisualizations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/data-viz/visualizations`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setVisualizations(data.visualizations || []);
    } catch (e) { console.error(e); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['.csv', '.xlsx', '.xls'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('Please upload a CSV or Excel file');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE_URL}/api/data-viz/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'X-Tab-Session-Key': sessionStorage.getItem('tab_session_key') || '' },
        body: formData
      });
      const data = await res.json();
      if (data.success) { fetchDatasets(); setSelectedDataset(data.dataset); setActiveTab('configure'); }
      else alert(data.error || 'Upload failed');
    } catch (e) { alert('Upload failed'); }
    finally { setLoading(false); }
  };

  const handleDatasetSelect = async (dataset) => {
    setSelectedDataset(dataset);
    setVizConfig({ ...vizConfig, x_column: dataset.column_names[0] || '', y_column: dataset.column_names[1] || '', title: `${dataset.filename} Visualization` });
    setActiveTab('configure');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/data-viz/analyze`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ dataset_id: dataset.dataset_id })
      });
      const data = await res.json();
      if (data.success) setAnalysis(data.analysis);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!selectedDataset || !vizConfig.x_column) { alert('Select a dataset and X column'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/data-viz/visualize`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ dataset_id: selectedDataset.dataset_id, config: vizConfig })
      });
      const data = await res.json();
      if (data.success) {
        setVisualizations([{ viz_id: data.viz_id, chart_type: vizConfig.chart_type, library: data.library, interactive: data.interactive, format: data.format }, ...visualizations]);
        setActiveTab('visualizations');
      } else alert(data.error || 'Failed to generate');
    } catch (e) { alert('Failed to generate'); }
    finally { setLoading(false); }
  };

  const chartTypes = [
    { value: 'scatter', label: 'Scatter', icon: ScatterChart },
    { value: 'line', label: 'Line', icon: LineChart },
    { value: 'bar', label: 'Bar', icon: BarChart3 },
    { value: 'pie', label: 'Pie', icon: PieChart },
    { value: 'histogram', label: 'Histogram', icon: Activity },
    { value: 'box', label: 'Box Plot', icon: Layers },
    { value: 'heatmap', label: 'Heatmap', icon: Grid3x3 },
  ];

  const filteredDatasets = datasets.filter(d => d.filename.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="as-upload-tab">
      <div className="as-upload-layout">
        {/* Sidebar */}
        <div className="as-upload-sidebar">
          <div className="as-sidebar-top">
            <div className="as-sidebar-head">
              <Database size={18} />
              <span>Datasets</span>
            </div>
            <div className="as-search-box">
              <Search size={14} />
              <input placeholder="Search…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              {searchTerm && <X size={14} onClick={() => setSearchTerm('')} className="as-clear" />}
            </div>
            <label className="as-upload-btn" htmlFor="file-input">
              <Upload size={15} /> Import File
            </label>
            <input id="file-input" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
          </div>
          <div className="as-dataset-list">
            {filteredDatasets.length === 0 ? (
              <div className="as-sidebar-empty">
                <FileSpreadsheet size={32} />
                <p>No datasets yet</p>
              </div>
            ) : filteredDatasets.map(d => (
              <div key={d.dataset_id} className={`as-dataset-row ${selectedDataset?.dataset_id === d.dataset_id ? 'active' : ''}`}
                onClick={() => handleDatasetSelect(d)}>
                <div className="as-dataset-icon"><FileSpreadsheet size={16} /></div>
                <div className="as-dataset-info">
                  <div className="as-dataset-name">{d.filename}</div>
                  <div className="as-dataset-meta">{d.rows} rows · {d.columns} cols</div>
                </div>
                <ChevronRight size={14} className="as-chevron" />
              </div>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="as-upload-main">
          {selectedDataset ? (
            <>
              <div className="as-upload-tabs">
                <button className={activeTab === 'configure' ? 'active' : ''} onClick={() => setActiveTab('configure')}>
                  <Settings size={15} /> Configure
                </button>
                <button className={activeTab === 'visualizations' ? 'active' : ''} onClick={() => setActiveTab('visualizations')}>
                  <BarChart3 size={15} /> Visualizations {visualizations.length > 0 && <span className="as-tab-badge">{visualizations.length}</span>}
                </button>
              </div>

              {activeTab === 'configure' && (
                <div className="as-configure-body">
                  {/* Preview */}
                  <div className="as-config-card">
                    <div className="as-config-card-title"><Eye size={16} /> Preview — {selectedDataset.filename}</div>
                    <div className="as-table-wrap">
                      <table className="as-data-table">
                        <thead><tr>{selectedDataset.column_names.map(c => <th key={c}>{c}</th>)}</tr></thead>
                        <tbody>
                          {selectedDataset.preview.slice(0, 5).map((row, i) => (
                            <tr key={i}>{selectedDataset.column_names.map(c => <td key={c}>{row[c]}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Insights */}
                  {analysis && (
                    <div className="as-config-card">
                      <div className="as-config-card-title"><TrendingUp size={16} /> Column Insights</div>
                      <div className="as-insight-chips">
                        {analysis.numeric_columns?.map(c => <span key={c} className="as-chip as-chip-num">{c}</span>)}
                        {analysis.categorical_columns?.map(c => <span key={c} className="as-chip as-chip-cat">{c}</span>)}
                      </div>
                    </div>
                  )}

                  {/* Config */}
                  <div className="as-config-card">
                    <div className="as-config-card-title"><Sparkles size={16} /> Create Visualization</div>
                    <div className="as-chart-type-grid">
                      {chartTypes.map(({ value, label, icon: Icon }) => (
                        <button key={value} className={`as-chart-type-btn ${vizConfig.chart_type === value ? 'active' : ''}`}
                          onClick={() => setVizConfig({ ...vizConfig, chart_type: value })}>
                          <Icon size={18} />
                          <span>{label}</span>
                          {vizConfig.chart_type === value && <Check size={12} className="as-check" />}
                        </button>
                      ))}
                    </div>
                    <div className="as-config-fields">
                      <div className="as-field-group">
                        <label>Library</label>
                        <select value={vizConfig.library} onChange={e => setVizConfig({ ...vizConfig, library: e.target.value })}>
                          <option value="plotly">Plotly (Interactive)</option>
                          <option value="seaborn">Seaborn (Static)</option>
                          <option value="matplotlib">Matplotlib (Static)</option>
                        </select>
                      </div>
                      <div className="as-field-group">
                        <label>X Axis</label>
                        <select value={vizConfig.x_column} onChange={e => setVizConfig({ ...vizConfig, x_column: e.target.value })}>
                          <option value="">Select column…</option>
                          {selectedDataset.column_names.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      {!['histogram', 'pie'].includes(vizConfig.chart_type) && (
                        <div className="as-field-group">
                          <label>Y Axis</label>
                          <select value={vizConfig.y_column} onChange={e => setVizConfig({ ...vizConfig, y_column: e.target.value })}>
                            <option value="">Select column…</option>
                            {selectedDataset.column_names.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="as-field-group">
                        <label>Color By</label>
                        <select value={vizConfig.color_column} onChange={e => setVizConfig({ ...vizConfig, color_column: e.target.value })}>
                          <option value="">None</option>
                          {selectedDataset.column_names.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="as-field-group as-field-full">
                        <label>Chart Title</label>
                        <input value={vizConfig.title} onChange={e => setVizConfig({ ...vizConfig, title: e.target.value })} placeholder="Enter title…" />
                      </div>
                    </div>
                    <button className="as-generate-btn" onClick={handleGenerate} disabled={loading || !vizConfig.x_column}>
                      {loading ? <><Loader2 size={16} className="as-spin" /> Generating…</> : <><Sparkles size={16} /> Generate Visualization</>}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'visualizations' && (
                <div className="as-viz-body">
                  {visualizations.length === 0 ? (
                    <div className="as-empty-state">
                      <BarChart3 size={48} />
                      <h3>No Visualizations Yet</h3>
                      <button className="as-ai-btn as-ai-btn-primary" onClick={() => setActiveTab('configure')}>
                        <Sparkles size={15} /> Create One
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="as-viz-controls">
                        <div className="as-view-toggle">
                          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><Grid3x3 size={16} /></button>
                          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={16} /></button>
                        </div>
                      </div>
                      <div className={`as-viz-grid ${viewMode}`}>
                        {visualizations.map((v, i) => (
                          <div key={i} className="as-viz-card">
                            <div className="as-viz-preview">
                              {v.interactive
                                ? <iframe src={`${API_BASE_URL}/api/data-viz/download/${v.viz_id}?format=html`} title={`viz-${i}`} />
                                : <img src={`${API_BASE_URL}/api/data-viz/download/${v.viz_id}?format=png`} alt={`viz-${i}`} />}
                            </div>
                            <div className="as-viz-footer">
                              <span className="as-viz-type">{v.chart_type} · {v.library}</span>
                              <button className="as-icon-btn" onClick={() => window.open(`${API_BASE_URL}/api/data-viz/download/${v.viz_id}?format=${v.interactive ? 'html' : 'png'}`, '_blank')}>
                                <Download size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="as-upload-empty">
              <Database size={56} />
              <h3>Analytics Studio</h3>
              <p>Select a dataset or import a new CSV / Excel file</p>
              <label className="as-upload-btn" htmlFor="file-input">
                <Upload size={16} /> Import Data
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Analytics Studio ─────────────────────────────────────────────────────
export default function AnalyticsStudio() {
  const [activeTab, setActiveTab] = useState('user-analytics');

  return (
    <div className="analytics-studio">
      <div className="as-top-nav">
        <div className="as-top-nav-brand">
          <div className="as-brand-icon"><BarChart3 size={20} /></div>
          <span>Analytics Studio</span>
        </div>
        <div className="as-top-nav-tabs">
          <button className={activeTab === 'user-analytics' ? 'active' : ''} onClick={() => setActiveTab('user-analytics')}>
            <Brain size={16} />
            <span>AI User Analytics</span>
            <span className="as-ai-tag">AI</span>
          </button>
          <button className={activeTab === 'upload-analyze' ? 'active' : ''} onClick={() => setActiveTab('upload-analyze')}>
            <Upload size={16} />
            <span>Upload & Analyze</span>
          </button>
        </div>
      </div>

      <div className="as-tab-content">
        {activeTab === 'user-analytics' ? <UserAnalyticsTab /> : <UploadAnalyzeTab />}
      </div>
    </div>
  );
}