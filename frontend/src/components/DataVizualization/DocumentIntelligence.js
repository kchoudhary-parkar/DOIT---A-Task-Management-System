import { useState, useRef, useCallback } from "react";
import './DocumentIntelligence.css';
import Loader from "../Loader/Loader";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

const DOC_ICONS = { pdf: "📄", pptx: "📊", ppt: "📊", docx: "📝", doc: "📝", url: "🌐", txt: "📃", csv: "📊", xlsx: "📊", xls: "📊", default: "📎" };
function getDocIcon(name) { const ext = name?.split(".").pop()?.toLowerCase(); return DOC_ICONS[ext] || DOC_ICONS.default; }
function formatBytes(b) { if (b < 1024) return `${b} B`; if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`; return `${(b / (1024 * 1024)).toFixed(1)} MB`; }

const STEPS = [
  { id: "parse",    label: "Parsing document with Docling" },
  { id: "extract",  label: "Extracting structured content" },
  { id: "analyze",  label: "Analyzing with Azure OpenAI" },
  { id: "insights", label: "Generating business insights" },
  { id: "report",   label: "Building insight report" },
];

export default function DocumentIntelligence() {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [doneSteps, setDoneSteps] = useState([]);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const fileRef = useRef();

  const docSource = file ? file.name : url || null;
  const canAnalyze = (file || url.trim()) && !processing;

  const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);
  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setUrl(""); }
  }, []);
  const onFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setUrl(""); }
  };

  const animateSteps = async (durationMs) => {
    const stepDelay = durationMs / STEPS.length;
    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, stepDelay));
      setDoneSteps((prev) => [...prev, i]);
    }
    setCurrentStep(-1);
  };

  const runAnalysis = async () => {
    if (!canAnalyze) return;
    setProcessing(true);
    setInsights(null);
    setError(null);
    setCurrentStep(-1);
    setDoneSteps([]);
    setExportDone(false);

    const token = localStorage.getItem("token");
    const tabKey = sessionStorage.getItem("tab_session_key") || "";

    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      } else {
        formData.append("url", url.trim());
      }
      formData.append("question", question);

      const animPromise = animateSteps(25000);

      const response = await fetch(`${API_BASE_URL}/api/document-intelligence/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Tab-Session-Key": tabKey,
        },
        body: formData,
      });

      await animPromise.catch(() => {});

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${response.status}`);
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
      setCurrentStep(-1);
      setDoneSteps([]);
    } finally {
      setProcessing(false);
    }
  };

  const exportPDF = async () => {
    if (!insights) return;
    setExportLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    const tabKey = sessionStorage.getItem("tab_session_key") || "";
    try {
      const response = await fetch(`${API_BASE_URL}/api/document-intelligence/export-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Tab-Session-Key": tabKey,
        },
        body: JSON.stringify(insights),
      });
      if (!response.ok) throw new Error(`Export failed: ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `insights_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 4000);
    } catch (err) {
      setError(err.message || "PDF export failed.");
    } finally {
      setExportLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setUrl(""); setQuestion(""); setInsights(null);
    setProcessing(false); setCurrentStep(-1); setDoneSteps([]);
    setExportDone(false); setError(null);
  };

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="header-icon">🧠</div>
        <div>
          <h2 className="title">Document Intelligence</h2>
          <p className="subtitle">Docling · Azure OpenAI · ReportLab Export</p>
        </div>
        {insights && (
          <div className="header-actions">
            <button className="btn btn-outline btn-hover btn-small" onClick={reset}>
              ↺ New Analysis
            </button>
            <button 
              className={`btn btn-success btn-hover ${exportLoading ? 'btn-loading' : ''}`} 
              onClick={exportPDF} 
              disabled={exportLoading}
            >
              {exportLoading ? (
                <>
                  <Loader />
                </>
              ) : exportDone ? (
                "✓ PDF Downloaded!"
              ) : (
                "⬇ Export Insights PDF"
              )}
            </button>
          </div>
        )}
      </div>

      <div className="body">
        {/* ── Sidebar ── */}
        <div className="sidebar">
          {/* Upload Zone */}
          <div>
            <span className="label">📁 Document Source</span>
            <div
              className={`dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
            >
              <div className="dropzone-icon">{dragging ? "📂" : "📤"}</div>
              <div className="dropzone-text">
                Drop a file here or <span className="dropzone-browse">browse</span>
              </div>
              <div className="dropzone-tags">
                {["PDF", "PPTX", "DOCX", "TXT", "CSV", "XLSX"].map((t) => (
                  <span key={t} className="tag tag-blue">{t}</span>
                ))}
              </div>
            </div>
            <input 
              ref={fileRef} 
              type="file" 
              accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.csv,.xlsx,.xls" 
              className="file-input"
              onChange={onFileChange} 
            />
            {file && (
              <div className="file-chip">
                <span className="file-icon">{getDocIcon(file.name)}</span>
                <div className="file-info">
                  <div className="file-name">{file.name}</div>
                  <div className="file-size">{formatBytes(file.size)}</div>
                </div>
                <button 
                  className="file-remove"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* URL Input */}
          <div>
            <span className="label">🌐 Or Enter URL</span>
            <input
              className={`url-input ${file ? 'disabled' : ''}`}
              placeholder="https://example.com/report"
              value={url}
              onChange={(e) => { setUrl(e.target.value); if (e.target.value) setFile(null); }}
              disabled={!!file}
            />
          </div>

          {/* Question */}
          <div>
            <span className="label">💬 Business Question (optional)</span>
            <textarea
              className="textarea"
              placeholder="e.g. What are the main revenue risks? How is market share trending?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          {/* Analyze Button */}
          <button
            className={`btn btn-primary btn-full ${!canAnalyze ? 'btn-disabled' : 'btn-hover'}`}
            onClick={runAnalysis}
            disabled={!canAnalyze}
          >
            {processing ? (
              <>
                <span className="spinner"></span>
                Analyzing…
              </>
            ) : (
              "▶ Run Analysis"
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="error">
              ❌ {error}
            </div>
          )}

          {/* Processing Steps */}
          {processing && (
            <div>
              <span className="label">Processing Pipeline</span>
              <div className="steps-container">
                {STEPS.map((step, i) => {
                  const active = currentStep === i;
                  const done = doneSteps.includes(i);
                  return (
                    <div 
                      key={step.id} 
                      className={`step ${active ? 'step-active' : ''} ${done ? 'step-done' : ''}`}
                    >
                      <span className="step-icon">
                        {done ? "✅" : active ? <span className="spinner spinner-small"></span> : "○"}
                      </span>
                      <span className={`step-label ${active || done ? 'step-label-bold' : ''}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Source Badge */}
          {insights && !processing && (
            <div className="card source-card">
              <span className="label">Source Analyzed</span>
              <div className="source-info">
                <span className="source-icon">{url ? "🌐" : getDocIcon(file?.name || "")}</span>
                <div>
                  <div className="source-name">{docSource}</div>
                  <div className="source-date">{insights.generated_at}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Main Content ── */}
        <div className="main">
          {!insights && !processing && (
            <div className="welcome-screen">
              <div className="welcome-icon">🧠</div>
              <div className="welcome-title">Upload a document to get started</div>
              <div className="welcome-description">
                Docling parses your PDF, PowerPoint, or web page. Azure OpenAI extracts business insights and KPIs. Export everything as a formatted PDF report.
              </div>
              <div className="welcome-examples">
                {[
                  { icon: "📄", label: "Annual reports" },
                  { icon: "📊", label: "Presentations" },
                  { icon: "📊", label: "CSV / Excel" },
                  { icon: "🌐", label: "Web pages" },
                  { icon: "📝", label: "Strategic docs" },
                ].map((item) => (
                  <div key={item.label} className="example-tag">
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights && (
            <>
              {/* Summary */}
              <div className="insight-card summary-card">
                <div className="insight-title">📋 Executive Summary</div>
                <p className="summary-text">{insights.summary}</p>
              </div>

              {/* KPIs */}
              {insights.kpis?.length > 0 && (
                <div>
                  <span className="label">📈 Key Performance Indicators</span>
                  <div className="kpi-grid">
                    {insights.kpis.map((kpi, i) => (
                      <div key={i} className="insight-card kpi-card" style={{animationDelay: `${i * 0.07}s`}}>
                        <div className="kpi-label">{kpi.label}</div>
                        <div className="kpi-value">{kpi.value}</div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{width: `${kpi.score}%`}}
                          />
                        </div>
                        <div className="kpi-footer">
                          <span className={`kpi-trend ${kpi.trend}`}>{kpi.trend === "up" ? "▲ Positive" : kpi.trend === "down" ? "▼ Negative" : "▶ Stable"}</span>
                          <span>{kpi.score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights */}
              {insights.insights?.length > 0 && (
                <div>
                  <span className="label">🔍 Business Insights</span>
                  <div className="insights-list">
                    {insights.insights.map((ins, i) => (
                      <div key={i} className="insight-card" style={{borderLeftColor: ins.priority === "HIGH" ? 'var(--danger)' : ins.priority === "MEDIUM" ? 'var(--warning)' : 'var(--text-muted)'}}>
                        <div className="insight-header">
                          <span className={`tag ${ins.priority === "HIGH" ? 'tag-blue' : ''}`}>{ins.priority}</span>
                          <span className="tag tag-green">{ins.category}</span>
                          <span className="insight-title-text">{ins.title}</span>
                        </div>
                        <p className="insight-body">{ins.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {insights.recommendations?.length > 0 && (
                <div className="card recommendations-card">
                  <div className="insight-title">✅ Strategic Recommendations</div>
                  <div className="recommendations-list">
                    {insights.recommendations.map((rec, i) => (
                      <div key={i} className="recommendation-item">
                        <span className="recommendation-number">{i + 1}</span>
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
