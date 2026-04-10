// import { useState, useRef, useCallback } from "react";
// import './DocumentIntelligence.css';
// import Loader from "../Loader/Loader";

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// const DOC_ICONS = { pdf: "📄", pptx: "📊", ppt: "📊", docx: "📝", doc: "📝", url: "🌐", txt: "📃", csv: "📊", xlsx: "📊", xls: "📊", default: "📎" };
// function getDocIcon(name) { const ext = name?.split(".").pop()?.toLowerCase(); return DOC_ICONS[ext] || DOC_ICONS.default; }
// function formatBytes(b) { if (b < 1024) return `${b} B`; if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`; return `${(b / (1024 * 1024)).toFixed(1)} MB`; }

// const STEPS = [
//   { id: "parse",    label: "Parsing document with Docling" },
//   { id: "extract",  label: "Extracting structured content" },
//   { id: "analyze",  label: "Analyzing with Azure OpenAI" },
//   { id: "insights", label: "Generating business insights" },
//   { id: "report",   label: "Building insight report" },
// ];

// export default function DocumentIntelligence() {
//   const [file, setFile] = useState(null);
//   const [url, setUrl] = useState("");
//   const [question, setQuestion] = useState("");
//   const [dragging, setDragging] = useState(false);
//   const [processing, setProcessing] = useState(false);
//   const [currentStep, setCurrentStep] = useState(-1);
//   const [doneSteps, setDoneSteps] = useState([]);
//   const [insights, setInsights] = useState(null);
//   const [error, setError] = useState(null);
//   const [exportLoading, setExportLoading] = useState(false);
//   const [exportDone, setExportDone] = useState(false);
//   const fileRef = useRef();

//   const docSource = file ? file.name : url || null;
//   const canAnalyze = (file || url.trim()) && !processing;

//   const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
//   const onDragLeave = useCallback(() => setDragging(false), []);
//   const onDrop = useCallback((e) => {
//     e.preventDefault(); setDragging(false);
//     const f = e.dataTransfer.files[0];
//     if (f) { setFile(f); setUrl(""); }
//   }, []);
//   const onFileChange = (e) => {
//     const f = e.target.files[0];
//     if (f) { setFile(f); setUrl(""); }
//   };

//   const animateSteps = async (durationMs) => {
//     const stepDelay = durationMs / STEPS.length;
//     for (let i = 0; i < STEPS.length; i++) {
//       setCurrentStep(i);
//       await new Promise((r) => setTimeout(r, stepDelay));
//       setDoneSteps((prev) => [...prev, i]);
//     }
//     setCurrentStep(-1);
//   };

//   const runAnalysis = async () => {
//     if (!canAnalyze) return;
//     setProcessing(true);
//     setInsights(null);
//     setError(null);
//     setCurrentStep(-1);
//     setDoneSteps([]);
//     setExportDone(false);

//     const token = localStorage.getItem("token");
//     const tabKey = sessionStorage.getItem("tab_session_key") || "";

//     try {
//       const formData = new FormData();
//       if (file) {
//         formData.append("file", file);
//       } else {
//         formData.append("url", url.trim());
//       }
//       formData.append("question", question);

//       const animPromise = animateSteps(25000);

//       const response = await fetch(`${API_BASE_URL}/api/document-intelligence/analyze`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "X-Tab-Session-Key": tabKey,
//         },
//         body: formData,
//       });

//       await animPromise.catch(() => {});

//       if (!response.ok) {
//         const errData = await response.json().catch(() => ({}));
//         throw new Error(errData.detail || `Server error ${response.status}`);
//       }

//       const data = await response.json();
//       setInsights(data);
//     } catch (err) {
//       setError(err.message || "Analysis failed. Please try again.");
//       setCurrentStep(-1);
//       setDoneSteps([]);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const exportPDF = async () => {
//     if (!insights) return;
//     setExportLoading(true);
//     setError(null);
//     const token = localStorage.getItem("token");
//     const tabKey = sessionStorage.getItem("tab_session_key") || "";
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/document-intelligence/export-pdf`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "X-Tab-Session-Key": tabKey,
//         },
//         body: JSON.stringify(insights),
//       });
//       if (!response.ok) throw new Error(`Export failed: ${response.status}`);
//       const blob = await response.blob();
//       const blobUrl = URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = blobUrl;
//       a.download = `insights_${Date.now()}.pdf`;
//       a.click();
//       URL.revokeObjectURL(blobUrl);
//       setExportDone(true);
//       setTimeout(() => setExportDone(false), 4000);
//     } catch (err) {
//       setError(err.message || "PDF export failed.");
//     } finally {
//       setExportLoading(false);
//     }
//   };

//   const reset = () => {
//     setFile(null); setUrl(""); setQuestion(""); setInsights(null);
//     setProcessing(false); setCurrentStep(-1); setDoneSteps([]);
//     setExportDone(false); setError(null);
//   };

//   return (
//     <div className="di-page">
//       <div className="di-hero">
//         <div className="di-hero-bg" aria-hidden="true">
//           <div className="di-orb di-orb-1" />
//           <div className="di-orb di-orb-2" />
//           <div className="di-grid" />
//         </div>

//         <div className="di-hero-content">
//           <div className="di-title-wrap">
//             <span className="di-eyebrow">Document Intelligence</span>
//             <h2 className="di-title">Analyze Reports, Decks, and Docs in One View</h2>
//             <p className="di-subtitle">Docling parsing, Azure OpenAI analysis, and instant PDF export in a compact command center.</p>
//           </div>

//           <div className="di-hero-actions">
//             <button className="di-btn di-btn-secondary" onClick={reset}>New Analysis</button>
//             <button
//               className={`di-btn di-btn-primary ${exportLoading ? 'di-btn-loading' : ''}`}
//               onClick={exportPDF}
//               disabled={!insights || exportLoading}
//             >
//               {exportLoading ? <Loader /> : exportDone ? 'PDF Downloaded' : 'Export PDF'}
//             </button>
//           </div>
//         </div>

//         <div className="di-kpi-strip">
//           <div className="di-strip-card">
//             <span className="di-strip-label">Source</span>
//             <strong className="di-strip-value">{docSource || 'Not selected'}</strong>
//           </div>
//           <div className="di-strip-card">
//             <span className="di-strip-label">KPIs</span>
//             <strong className="di-strip-value">{insights?.kpis?.length || 0}</strong>
//           </div>
//           <div className="di-strip-card">
//             <span className="di-strip-label">Insights</span>
//             <strong className="di-strip-value">{insights?.insights?.length || 0}</strong>
//           </div>
//           <div className="di-strip-card">
//             <span className="di-strip-label">Generated</span>
//             <strong className="di-strip-value">{insights?.generated_at || 'Pending'}</strong>
//           </div>
//         </div>
//       </div>

//       <div className="di-layout">
//         <aside className="di-panel">
//           <div className="di-control-card">
//             <span className="di-label">Document Source</span>
//             <div
//               className={`di-dropzone ${dragging ? 'dragging' : ''}`}
//               onDragOver={onDragOver}
//               onDragLeave={onDragLeave}
//               onDrop={onDrop}
//               onClick={() => fileRef.current.click()}
//             >
//               <div className="di-dropzone-title">Drop file or click to upload</div>
//               <div className="di-dropzone-sub">Supported: PDF, PPTX, DOCX, TXT, CSV, XLSX</div>
//               <div className="di-dropzone-tags">
//                 {['PDF', 'PPTX', 'DOCX', 'TXT', 'CSV', 'XLSX'].map((t) => (
//                   <span key={t} className="di-tag di-tag-blue">{t}</span>
//                 ))}
//               </div>
//             </div>
//             <input
//               ref={fileRef}
//               type="file"
//               accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.csv,.xlsx,.xls"
//               className="di-file-input"
//               onChange={onFileChange}
//             />
//             {file && (
//               <div className="di-file-chip">
//                 <span className="di-file-icon">{getDocIcon(file.name)}</span>
//                 <div className="di-file-info">
//                   <div className="di-file-name">{file.name}</div>
//                   <div className="di-file-size">{formatBytes(file.size)}</div>
//                 </div>
//                 <button
//                   className="di-file-remove"
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setFile(null);
//                   }}
//                 >
//                   x
//                 </button>
//               </div>
//             )}
//           </div>

//           <div className="di-control-card">
//             <span className="di-label">Or Analyze URL</span>
//             <input
//               className={`di-input ${file ? 'disabled' : ''}`}
//               placeholder="https://example.com/report"
//               value={url}
//               onChange={(e) => {
//                 setUrl(e.target.value);
//                 if (e.target.value) setFile(null);
//               }}
//               disabled={!!file}
//             />
//           </div>

//           <div className="di-control-card">
//             <span className="di-label">Business Question (optional)</span>
//             <textarea
//               className="di-textarea"
//               placeholder="What are the primary risks, opportunities, and next actions?"
//               value={question}
//               onChange={(e) => setQuestion(e.target.value)}
//             />
//             <button
//               className={`di-btn di-btn-primary di-btn-full ${!canAnalyze ? 'di-btn-disabled' : ''}`}
//               onClick={runAnalysis}
//               disabled={!canAnalyze}
//             >
//               {processing ? (
//                 <>
//                   <span className="di-spinner" />
//                   Running Analysis
//                 </>
//               ) : (
//                 'Run Analysis'
//               )}
//             </button>
//           </div>

//           {error && <div className="di-error">{error}</div>}

//           {processing && (
//             <div className="di-control-card">
//               <span className="di-label">Pipeline</span>
//               <div className="di-steps">
//                 {STEPS.map((step, i) => {
//                   const active = currentStep === i;
//                   const done = doneSteps.includes(i);
//                   return (
//                     <div key={step.id} className={`di-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
//                       <span className="di-step-dot">{done ? 'OK' : active ? <span className="di-spinner di-spinner-small" /> : i + 1}</span>
//                       <span className="di-step-text">{step.label}</span>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}
//         </aside>

//         <section className="di-content">
//           {!insights && !processing && (
//             <div className="di-empty">
//               <h3 className="di-empty-title">Ready to generate business intelligence</h3>
//               <p className="di-empty-sub">Upload a document or provide a URL, then run analysis to receive executive summaries, KPIs, insights, and recommendations.</p>
//               <div className="di-empty-tags">
//                 {['Annual reports', 'Pitch decks', 'Policy docs', 'Market briefs', 'Web pages'].map((item) => (
//                   <span key={item} className="di-tag di-tag-muted">{item}</span>
//                 ))}
//               </div>
//             </div>
//           )}

//           {insights && (
//             <>
//               <article className="di-card di-summary">
//                 <div className="di-card-head">Executive Summary</div>
//                 <p className="di-body-text">{insights.summary}</p>
//               </article>

//               {insights.kpis?.length > 0 && (
//                 <div>
//                   <div className="di-section-head">Key Performance Indicators</div>
//                   <div className="di-kpi-grid">
//                     {insights.kpis.map((kpi, i) => (
//                       <div key={i} className="di-card di-kpi-card" style={{ animationDelay: `${i * 0.06}s` }}>
//                         <div className="di-kpi-label">{kpi.label}</div>
//                         <div className="di-kpi-value">{kpi.value}</div>
//                         <div className="di-progress">
//                           <div className="di-progress-fill" style={{ width: `${kpi.score}%` }} />
//                         </div>
//                         <div className="di-kpi-foot">
//                           <span className={`di-kpi-trend ${kpi.trend}`}>{kpi.trend === 'up' ? 'Positive' : kpi.trend === 'down' ? 'Negative' : 'Stable'}</span>
//                           <span>{kpi.score}/100</span>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {insights.insights?.length > 0 && (
//                 <div>
//                   <div className="di-section-head">Business Insights</div>
//                   <div className="di-insights-list">
//                     {insights.insights.map((ins, i) => (
//                       <div
//                         key={i}
//                         className="di-card di-insight-item"
//                         style={{ borderLeftColor: ins.priority === 'HIGH' ? 'var(--di-danger)' : ins.priority === 'MEDIUM' ? 'var(--di-warning)' : 'var(--di-border)' }}
//                       >
//                         <div className="di-insight-top">
//                           <span className={`di-tag ${ins.priority === 'HIGH' ? 'di-tag-high' : 'di-tag-muted'}`}>{ins.priority}</span>
//                           <span className="di-tag di-tag-green">{ins.category}</span>
//                           <strong className="di-insight-title">{ins.title}</strong>
//                         </div>
//                         <p className="di-body-text">{ins.body}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {insights.recommendations?.length > 0 && (
//                 <article className="di-card di-recommendations">
//                   <div className="di-card-head">Strategic Recommendations</div>
//                   <div className="di-reco-list">
//                     {insights.recommendations.map((rec, i) => (
//                       <div key={i} className="di-reco-item">
//                         <span className="di-reco-number">{i + 1}</span>
//                         <span className="di-body-text">{rec}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </article>
//               )}
//             </>
//           )}
//         </section>
//       </div>
//     </div>
//   );
// }
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
    <div className="di-page">
      <div className="di-hero">
        <div className="di-hero-bg" aria-hidden="true">
          <div className="di-orb di-orb-1" />
          <div className="di-orb di-orb-2" />
          <div className="di-orb di-orb-3" />
          <div className="di-grid" />
        </div>

        <div className="di-hero-content">
          <div className="di-title-wrap">
            <span className="di-eyebrow">Document Intelligence</span>
            <h2 className="di-title">Analyze Reports, Decks, and Docs in One View</h2>
            <p className="di-subtitle">Docling parsing, Azure OpenAI analysis, and instant PDF export in a compact command center.</p>
          </div>

          <div className="di-hero-actions">
            <button className="di-btn di-btn-secondary" onClick={reset}>New Analysis</button>
            <button
              className={`di-btn di-btn-primary ${exportLoading ? 'di-btn-loading' : ''}`}
              onClick={exportPDF}
              disabled={!insights || exportLoading}
            >
              {exportLoading ? <Loader /> : exportDone ? 'PDF Downloaded' : 'Export PDF'}
            </button>
          </div>
        </div>

        <div className="di-kpi-strip">
          <div className="di-strip-card">
            <span className="di-strip-label">Source</span>
            <strong className="di-strip-value">{docSource || 'Not selected'}</strong>
          </div>
          <div className="di-strip-card">
            <span className="di-strip-label">KPIs</span>
            <strong className="di-strip-value">{insights?.kpis?.length || 0}</strong>
          </div>
          <div className="di-strip-card">
            <span className="di-strip-label">Insights</span>
            <strong className="di-strip-value">{insights?.insights?.length || 0}</strong>
          </div>
          <div className="di-strip-card">
            <span className="di-strip-label">Generated</span>
            <strong className="di-strip-value">{insights?.generated_at || 'Pending'}</strong>
          </div>
        </div>
      </div>

      <div className="di-layout">
        <aside className="di-panel">
          <div className="di-control-card">
            <span className="di-label">Document Source</span>
            <div
              className={`di-dropzone ${dragging ? 'dragging' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
            >
              <div className="di-dropzone-title">Drop file or click to upload</div>
              <div className="di-dropzone-sub">Supported: PDF, PPTX, DOCX, TXT, CSV, XLSX</div>
              <div className="di-dropzone-tags">
                {['PDF', 'PPTX', 'DOCX', 'TXT', 'CSV', 'XLSX'].map((t) => (
                  <span key={t} className="di-tag di-tag-blue">{t}</span>
                ))}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.csv,.xlsx,.xls"
              className="di-file-input"
              onChange={onFileChange}
            />
            {file && (
              <div className="di-file-chip">
                <span className="di-file-icon">{getDocIcon(file.name)}</span>
                <div className="di-file-info">
                  <div className="di-file-name">{file.name}</div>
                  <div className="di-file-size">{formatBytes(file.size)}</div>
                </div>
                <button
                  className="di-file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  x
                </button>
              </div>
            )}
          </div>

          <div className="di-control-card">
            <span className="di-label">Or Analyze URL</span>
            <input
              className={`di-input ${file ? 'disabled' : ''}`}
              placeholder="https://example.com/report"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (e.target.value) setFile(null);
              }}
              disabled={!!file}
            />
          </div>

          <div className="di-control-card">
            <span className="di-label">Business Question (optional)</span>
            <textarea
              className="di-textarea"
              placeholder="What are the primary risks, opportunities, and next actions?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button
              className={`di-btn di-btn-primary di-btn-full ${!canAnalyze ? 'di-btn-disabled' : ''}`}
              onClick={runAnalysis}
              disabled={!canAnalyze}
            >
              {processing ? (
                <>
                  <span className="di-spinner" />
                  Running Analysis
                </>
              ) : (
                'Run Analysis'
              )}
            </button>
          </div>

          {error && <div className="di-error">{error}</div>}

          {processing && (
            <div className="di-control-card">
              <span className="di-label">Pipeline</span>
              <div className="di-steps">
                {STEPS.map((step, i) => {
                  const active = currentStep === i;
                  const done = doneSteps.includes(i);
                  return (
                    <div key={step.id} className={`di-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                      <span className="di-step-dot">{done ? 'OK' : active ? <span className="di-spinner di-spinner-small" /> : i + 1}</span>
                      <span className="di-step-text">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        <section className="di-content">
          {!insights && !processing && (
            <div className="di-empty">
              <h3 className="di-empty-title">Ready to generate business intelligence</h3>
              <p className="di-empty-sub">Upload a document or provide a URL, then run analysis to receive executive summaries, KPIs, insights, and recommendations.</p>
              <div className="di-empty-tags">
                {['Annual reports', 'Pitch decks', 'Policy docs', 'Market briefs', 'Web pages'].map((item) => (
                  <span key={item} className="di-tag di-tag-muted">{item}</span>
                ))}
              </div>
            </div>
          )}

          {insights && (
            <>
              <article className="di-card di-summary">
                <div className="di-card-head">Executive Summary</div>
                <p className="di-body-text">{insights.summary}</p>
              </article>

              {insights.kpis?.length > 0 && (
                <div>
                  <div className="di-section-head">Key Performance Indicators</div>
                  <div className="di-kpi-grid">
                    {insights.kpis.map((kpi, i) => (
                      <div key={i} className="di-card di-kpi-card" style={{ animationDelay: `${i * 0.06}s` }}>
                        <div className="di-kpi-label">{kpi.label}</div>
                        <div className="di-kpi-value">{kpi.value}</div>
                        <div className="di-progress">
                          <div className="di-progress-fill" style={{ width: `${kpi.score}%` }} />
                        </div>
                        <div className="di-kpi-foot">
                          <span className={`di-kpi-trend ${kpi.trend}`}>{kpi.trend === 'up' ? 'Positive' : kpi.trend === 'down' ? 'Negative' : 'Stable'}</span>
                          <span>{kpi.score}/100</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.insights?.length > 0 && (
                <div>
                  <div className="di-section-head">Business Insights</div>
                  <div className="di-insights-list">
                    {insights.insights.map((ins, i) => (
                      <div
                        key={i}
                        className="di-card di-insight-item"
                        style={{ borderLeftColor: ins.priority === 'HIGH' ? 'var(--di-danger)' : ins.priority === 'MEDIUM' ? 'var(--di-warning)' : 'var(--di-border)' }}
                      >
                        <div className="di-insight-top">
                          <span className={`di-tag ${ins.priority === 'HIGH' ? 'di-tag-high' : 'di-tag-muted'}`}>{ins.priority}</span>
                          <span className="di-tag di-tag-green">{ins.category}</span>
                          <strong className="di-insight-title">{ins.title}</strong>
                        </div>
                        <p className="di-body-text">{ins.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.recommendations?.length > 0 && (
                <article className="di-card di-recommendations">
                  <div className="di-card-head">Strategic Recommendations</div>
                  <div className="di-reco-list">
                    {insights.recommendations.map((rec, i) => (
                      <div key={i} className="di-reco-item">
                        <span className="di-reco-number">{i + 1}</span>
                        <span className="di-body-text">{rec}</span>
                      </div>
                    ))}
                  </div>
                </article>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}