// // // import { useState, useRef, useCallback } from "react";

// // // // ─── Color palette matching PowerBI-style dark dashboard ───────────────────
// // // const COLORS = {
// // //   bg: "#0f1117",
// // //   surface: "#1a1d27",
// // //   surfaceHover: "#22263a",
// // //   border: "#2a2f45",
// // //   accent: "#4f8ef7",
// // //   accentGlow: "rgba(79,142,247,0.15)",
// // //   accentDim: "rgba(79,142,247,0.5)",
// // //   success: "#22c55e",
// // //   warning: "#f59e0b",
// // //   danger: "#ef4444",
// // //   text: "#e2e8f0",
// // //   textMuted: "#64748b",
// // //   textDim: "#94a3b8",
// // // };

// // // const styles = {
// // //   container: {
// // //     background: COLORS.bg,
// // //     minHeight: "100vh",
// // //     fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
// // //     color: COLORS.text,
// // //     padding: "0",
// // //   },
// // //   header: {
// // //     background: `linear-gradient(135deg, ${COLORS.surface} 0%, #13162b 100%)`,
// // //     borderBottom: `1px solid ${COLORS.border}`,
// // //     padding: "20px 32px",
// // //     display: "flex",
// // //     alignItems: "center",
// // //     gap: "16px",
// // //   },
// // //   headerIcon: {
// // //     width: "40px",
// // //     height: "40px",
// // //     background: `linear-gradient(135deg, ${COLORS.accent}, #7c3aed)`,
// // //     borderRadius: "10px",
// // //     display: "flex",
// // //     alignItems: "center",
// // //     justifyContent: "center",
// // //     fontSize: "20px",
// // //     boxShadow: `0 0 20px ${COLORS.accentGlow}`,
// // //   },
// // //   title: {
// // //     fontSize: "20px",
// // //     fontWeight: "600",
// // //     letterSpacing: "-0.3px",
// // //     margin: 0,
// // //   },
// // //   subtitle: {
// // //     fontSize: "12px",
// // //     color: COLORS.textMuted,
// // //     margin: "2px 0 0",
// // //     letterSpacing: "0.5px",
// // //     textTransform: "uppercase",
// // //   },
// // //   body: {
// // //     display: "grid",
// // //     gridTemplateColumns: "380px 1fr",
// // //     gap: "0",
// // //     height: "calc(100vh - 81px)",
// // //   },
// // //   sidebar: {
// // //     borderRight: `1px solid ${COLORS.border}`,
// // //     padding: "24px",
// // //     overflowY: "auto",
// // //     background: COLORS.surface,
// // //     display: "flex",
// // //     flexDirection: "column",
// // //     gap: "20px",
// // //   },
// // //   main: {
// // //     padding: "24px",
// // //     overflowY: "auto",
// // //     display: "flex",
// // //     flexDirection: "column",
// // //     gap: "20px",
// // //   },
// // //   card: {
// // //     background: COLORS.surface,
// // //     border: `1px solid ${COLORS.border}`,
// // //     borderRadius: "12px",
// // //     padding: "20px",
// // //   },
// // //   label: {
// // //     fontSize: "11px",
// // //     fontWeight: "700",
// // //     letterSpacing: "1.5px",
// // //     textTransform: "uppercase",
// // //     color: COLORS.textMuted,
// // //     marginBottom: "10px",
// // //     display: "block",
// // //   },
// // //   dropzone: (dragging) => ({
// // //     border: `2px dashed ${dragging ? COLORS.accent : COLORS.border}`,
// // //     borderRadius: "10px",
// // //     padding: "28px 20px",
// // //     textAlign: "center",
// // //     cursor: "pointer",
// // //     transition: "all 0.2s",
// // //     background: dragging ? COLORS.accentGlow : "transparent",
// // //   }),
// // //   fileChip: {
// // //     display: "flex",
// // //     alignItems: "center",
// // //     gap: "10px",
// // //     background: COLORS.surfaceHover,
// // //     border: `1px solid ${COLORS.border}`,
// // //     borderRadius: "8px",
// // //     padding: "10px 14px",
// // //     marginTop: "10px",
// // //     fontSize: "13px",
// // //   },
// // //   urlInput: {
// // //     width: "100%",
// // //     background: COLORS.bg,
// // //     border: `1px solid ${COLORS.border}`,
// // //     borderRadius: "8px",
// // //     padding: "10px 14px",
// // //     color: COLORS.text,
// // //     fontSize: "13px",
// // //     fontFamily: "inherit",
// // //     outline: "none",
// // //     boxSizing: "border-box",
// // //     transition: "border-color 0.2s",
// // //   },
// // //   textarea: {
// // //     width: "100%",
// // //     background: COLORS.bg,
// // //     border: `1px solid ${COLORS.border}`,
// // //     borderRadius: "8px",
// // //     padding: "10px 14px",
// // //     color: COLORS.text,
// // //     fontSize: "13px",
// // //     fontFamily: "inherit",
// // //     outline: "none",
// // //     boxSizing: "border-box",
// // //     resize: "vertical",
// // //     minHeight: "80px",
// // //     transition: "border-color 0.2s",
// // //   },
// // //   btn: (variant = "primary", disabled = false) => ({
// // //     padding: "10px 20px",
// // //     borderRadius: "8px",
// // //     border: "none",
// // //     cursor: disabled ? "not-allowed" : "pointer",
// // //     fontSize: "13px",
// // //     fontWeight: "600",
// // //     fontFamily: "inherit",
// // //     letterSpacing: "0.3px",
// // //     transition: "all 0.2s",
// // //     opacity: disabled ? 0.5 : 1,
// // //     ...(variant === "primary"
// // //       ? {
// // //           background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`,
// // //           color: "#fff",
// // //           boxShadow: disabled ? "none" : `0 4px 14px ${COLORS.accentDim}`,
// // //         }
// // //       : variant === "success"
// // //       ? {
// // //           background: `linear-gradient(135deg, #16a34a, #059669)`,
// // //           color: "#fff",
// // //           boxShadow: disabled ? "none" : "0 4px 14px rgba(34,197,94,0.3)",
// // //         }
// // //       : {
// // //           background: COLORS.surfaceHover,
// // //           color: COLORS.textDim,
// // //           border: `1px solid ${COLORS.border}`,
// // //         }),
// // //   }),
// // //   tag: (color) => ({
// // //     display: "inline-block",
// // //     padding: "3px 10px",
// // //     borderRadius: "20px",
// // //     fontSize: "11px",
// // //     fontWeight: "600",
// // //     letterSpacing: "0.5px",
// // //     textTransform: "uppercase",
// // //     background: color === "blue"
// // //       ? COLORS.accentGlow
// // //       : color === "green"
// // //       ? "rgba(34,197,94,0.1)"
// // //       : "rgba(245,158,11,0.1)",
// // //     color: color === "blue"
// // //       ? COLORS.accent
// // //       : color === "green"
// // //       ? COLORS.success
// // //       : COLORS.warning,
// // //     border: `1px solid ${
// // //       color === "blue"
// // //         ? COLORS.accentDim
// // //         : color === "green"
// // //         ? "rgba(34,197,94,0.3)"
// // //         : "rgba(245,158,11,0.3)"
// // //     }`,
// // //   }),
// // //   insightCard: {
// // //     background: `linear-gradient(135deg, ${COLORS.surface} 0%, #181c2e 100%)`,
// // //     border: `1px solid ${COLORS.border}`,
// // //     borderRadius: "12px",
// // //     padding: "20px",
// // //     borderLeft: `3px solid ${COLORS.accent}`,
// // //   },
// // //   insightTitle: {
// // //     fontSize: "13px",
// // //     fontWeight: "700",
// // //     color: COLORS.accent,
// // //     letterSpacing: "1px",
// // //     textTransform: "uppercase",
// // //     marginBottom: "12px",
// // //   },
// // //   kpiGrid: {
// // //     display: "grid",
// // //     gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
// // //     gap: "12px",
// // //   },
// // //   kpiCard: {
// // //     background: COLORS.bg,
// // //     border: `1px solid ${COLORS.border}`,
// // //     borderRadius: "10px",
// // //     padding: "16px",
// // //     textAlign: "center",
// // //   },
// // //   progressBar: (pct, color = COLORS.accent) => ({
// // //     height: "6px",
// // //     background: COLORS.border,
// // //     borderRadius: "3px",
// // //     overflow: "hidden",
// // //     position: "relative",
// // //   }),
// // //   progressFill: (pct, color = COLORS.accent) => ({
// // //     height: "100%",
// // //     width: `${pct}%`,
// // //     background: `linear-gradient(90deg, ${color}, ${color}88)`,
// // //     borderRadius: "3px",
// // //     transition: "width 1s ease",
// // //   }),
// // //   spinner: {
// // //     width: "20px",
// // //     height: "20px",
// // //     border: `2px solid ${COLORS.border}`,
// // //     borderTop: `2px solid ${COLORS.accent}`,
// // //     borderRadius: "50%",
// // //     animation: "spin 0.8s linear infinite",
// // //     display: "inline-block",
// // //   },
// // //   stepItem: (active, done) => ({
// // //     display: "flex",
// // //     alignItems: "center",
// // //     gap: "12px",
// // //     padding: "10px 14px",
// // //     borderRadius: "8px",
// // //     background: active
// // //       ? COLORS.accentGlow
// // //       : done
// // //       ? "rgba(34,197,94,0.05)"
// // //       : "transparent",
// // //     border: `1px solid ${
// // //       active ? COLORS.accentDim : done ? "rgba(34,197,94,0.2)" : "transparent"
// // //     }`,
// // //     transition: "all 0.3s",
// // //   }),
// // // };

// // // // ─── Document type icons ───────────────────────────────────────────────────
// // // const DOC_ICONS = {
// // //   pdf: "📄",
// // //   pptx: "📊",
// // //   ppt: "📊",
// // //   docx: "📝",
// // //   doc: "📝",
// // //   url: "🌐",
// // //   txt: "📃",
// // //   default: "📎",
// // // };

// // // function getDocIcon(name) {
// // //   const ext = name?.split(".").pop()?.toLowerCase();
// // //   return DOC_ICONS[ext] || DOC_ICONS.default;
// // // }

// // // function formatBytes(b) {
// // //   if (b < 1024) return `${b} B`;
// // //   if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
// // //   return `${(b / (1024 * 1024)).toFixed(1)} MB`;
// // // }

// // // // ─── Processing steps simulation ──────────────────────────────────────────
// // // const STEPS = [
// // //   { id: "parse", label: "Parsing document with Docling" },
// // //   { id: "extract", label: "Extracting structured content" },
// // //   { id: "analyze", label: "Analyzing with GPT-5" },
// // //   { id: "insights", label: "Generating business insights" },
// // //   { id: "report", label: "Building PDF report" },
// // // ];

// // // // ─── Mock insight generator (replace with real API call) ──────────────────
// // // function generateMockInsights(docName, question) {
// // //   return {
// // //     summary:
// // //       "Document analysis complete. Key strategic themes identified across financial performance, market positioning, and operational efficiency metrics.",
// // //     kpis: [
// // //       { label: "Revenue Growth", value: "+18.4%", trend: "up", score: 84 },
// // //       { label: "Market Share", value: "23.7%", trend: "up", score: 72 },
// // //       { label: "Cost Efficiency", value: "−6.2%", trend: "up", score: 91 },
// // //       { label: "Customer NPS", value: "67", trend: "neutral", score: 61 },
// // //     ],
// // //     insights: [
// // //       {
// // //         category: "Strategic",
// // //         priority: "HIGH",
// // //         title: "Accelerated Digital Transformation",
// // //         body: "Document reveals a 3-year roadmap prioritizing cloud migration and AI integration. Budget allocation increased 40% YoY, signaling executive commitment. Recommend aligning vendor strategy accordingly.",
// // //       },
// // //       {
// // //         category: "Financial",
// // //         priority: "HIGH",
// // //         title: "Margin Compression Risk in Q3",
// // //         body: "Supply chain costs projected to rise 12% while pricing power remains constrained. Operating margins may compress by 2–3pp unless procurement optimization is accelerated within 90 days.",
// // //       },
// // //       {
// // //         category: "Market",
// // //         priority: "MEDIUM",
// // //         title: "Emerging Competitor Positioning",
// // //         body: "Two new entrants identified with aggressive pricing in the SMB segment. Current competitive moat relies on enterprise relationships, which remain strong but require reinforcement via expanded service tiers.",
// // //       },
// // //       {
// // //         category: "Operational",
// // //         priority: "MEDIUM",
// // //         title: "Workforce Productivity Opportunity",
// // //         body: "Automation initiatives are partially deployed. Full rollout could reduce manual processing costs by an estimated $2.4M annually. Recommend prioritizing accounts payable and inventory reconciliation workflows.",
// // //       },
// // //     ],
// // //     recommendations: [
// // //       "Accelerate Q4 procurement negotiations to lock in raw material costs",
// // //       "Launch premium enterprise tier by end of fiscal year to protect margins",
// // //       "Increase digital marketing budget by 20% targeting SMB acquisition",
// // //       "Commission third-party operational efficiency audit within 60 days",
// // //     ],
// // //     docName,
// // //     question,
// // //     generatedAt: new Date().toLocaleString(),
// // //   };
// // // }

// // // // ─── Main Component ────────────────────────────────────────────────────────
// // // export default function DocumentIntelligence() {
// // //   const [file, setFile] = useState(null);
// // //   const [url, setUrl] = useState("");
// // //   const [question, setQuestion] = useState("");
// // //   const [dragging, setDragging] = useState(false);
// // //   const [processing, setProcessing] = useState(false);
// // //   const [currentStep, setCurrentStep] = useState(-1);
// // //   const [doneSteps, setDoneSteps] = useState([]);
// // //   const [insights, setInsights] = useState(null);
// // //   const [exportLoading, setExportLoading] = useState(false);
// // //   const [exportDone, setExportDone] = useState(false);
// // //   const fileRef = useRef();

// // //   const docSource = file ? file.name : url || null;
// // //   const canAnalyze = (file || url.trim()) && !processing;

// // //   // Drag handlers
// // //   const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
// // //   const onDragLeave = useCallback(() => setDragging(false), []);
// // //   const onDrop = useCallback((e) => {
// // //     e.preventDefault();
// // //     setDragging(false);
// // //     const f = e.dataTransfer.files[0];
// // //     if (f) { setFile(f); setUrl(""); }
// // //   }, []);

// // //   const onFileChange = (e) => {
// // //     const f = e.target.files[0];
// // //     if (f) { setFile(f); setUrl(""); }
// // //   };

// // //   // Simulate multi-step processing
// // //   const runAnalysis = async () => {
// // //     if (!canAnalyze) return;
// // //     setProcessing(true);
// // //     setInsights(null);
// // //     setCurrentStep(-1);
// // //     setDoneSteps([]);
// // //     setExportDone(false);

// // //     for (let i = 0; i < STEPS.length; i++) {
// // //       setCurrentStep(i);
// // //       await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));
// // //       setDoneSteps((prev) => [...prev, i]);
// // //     }

// // //     setCurrentStep(-1);
// // //     const result = generateMockInsights(
// // //       docSource,
// // //       question || "Provide a comprehensive business analysis."
// // //     );
// // //     setInsights(result);
// // //     setProcessing(false);
// // //   };

// // //   // Export to PDF via backend
// // //   const exportPDF = async () => {
// // //     setExportLoading(true);
// // //     try {
// // //       // In production: POST to /api/export-insights with insights JSON
// // //       // Backend uses reportlab to generate the PDF
// // //       await new Promise((r) => setTimeout(r, 1800)); // Simulated
// // //       setExportDone(true);
// // //       setTimeout(() => setExportDone(false), 4000);
// // //     } finally {
// // //       setExportLoading(false);
// // //     }
// // //   };

// // //   const reset = () => {
// // //     setFile(null);
// // //     setUrl("");
// // //     setQuestion("");
// // //     setInsights(null);
// // //     setProcessing(false);
// // //     setCurrentStep(-1);
// // //     setDoneSteps([]);
// // //     setExportDone(false);
// // //   };

// // //   return (
// // //     <div style={styles.container}>
// // //       <style>{`
// // //         @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
// // //         * { box-sizing: border-box; }
// // //         @keyframes spin { to { transform: rotate(360deg); } }
// // //         @keyframes fadeUp {
// // //           from { opacity: 0; transform: translateY(12px); }
// // //           to { opacity: 1; transform: translateY(0); }
// // //         }
// // //         @keyframes pulse {
// // //           0%, 100% { opacity: 1; }
// // //           50% { opacity: 0.5; }
// // //         }
// // //         .insight-card { animation: fadeUp 0.4s ease both; }
// // //         .insight-card:nth-child(1) { animation-delay: 0.05s; }
// // //         .insight-card:nth-child(2) { animation-delay: 0.12s; }
// // //         .insight-card:nth-child(3) { animation-delay: 0.19s; }
// // //         .insight-card:nth-child(4) { animation-delay: 0.26s; }
// // //         .btn-hover:hover { opacity: 0.88 !important; transform: translateY(-1px); }
// // //         input:focus, textarea:focus { border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 3px ${COLORS.accentGlow}; }
// // //         ::-webkit-scrollbar { width: 6px; }
// // //         ::-webkit-scrollbar-track { background: transparent; }
// // //         ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
// // //       `}</style>

// // //       {/* Header */}
// // //       <div style={styles.header}>
// // //         <div style={styles.headerIcon}>🧠</div>
// // //         <div>
// // //           <h2 style={styles.title}>Document Intelligence</h2>
// // //           <p style={styles.subtitle}>Docling · GPT-5 · ReportLab Export</p>
// // //         </div>
// // //         {insights && (
// // //           <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
// // //             <button style={{ ...styles.btn("outline"), ...{ fontSize: "12px" } }} className="btn-hover" onClick={reset}>
// // //               ↺ New Analysis
// // //             </button>
// // //             <button
// // //               style={styles.btn("success", exportLoading)}
// // //               className="btn-hover"
// // //               onClick={exportPDF}
// // //               disabled={exportLoading}
// // //             >
// // //               {exportLoading ? (
// // //                 <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
// // //                   <span style={styles.spinner} /> Generating PDF…
// // //                 </span>
// // //               ) : exportDone ? (
// // //                 "✓ PDF Exported!"
// // //               ) : (
// // //                 "⬇ Export Insights PDF"
// // //               )}
// // //             </button>
// // //           </div>
// // //         )}
// // //       </div>

// // //       <div style={styles.body}>
// // //         {/* ── Sidebar ── */}
// // //         <div style={styles.sidebar}>
// // //           {/* Upload Zone */}
// // //           <div>
// // //             <span style={styles.label}>📁 Document Source</span>
// // //             <div
// // //               style={styles.dropzone(dragging)}
// // //               onDragOver={onDragOver}
// // //               onDragLeave={onDragLeave}
// // //               onDrop={onDrop}
// // //               onClick={() => fileRef.current.click()}
// // //             >
// // //               <div style={{ fontSize: "28px", marginBottom: "8px" }}>
// // //                 {dragging ? "📂" : "📤"}
// // //               </div>
// // //               <div style={{ fontSize: "13px", color: COLORS.textDim, lineHeight: "1.5" }}>
// // //                 Drop a file here or{" "}
// // //                 <span style={{ color: COLORS.accent, fontWeight: "600" }}>browse</span>
// // //               </div>
// // //               <div style={{ marginTop: "8px", display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
// // //                 {["PDF", "PPTX", "DOCX", "TXT"].map((t) => (
// // //                   <span key={t} style={styles.tag("blue")}>{t}</span>
// // //                 ))}
// // //               </div>
// // //             </div>
// // //             <input
// // //               ref={fileRef}
// // //               type="file"
// // //               accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.csv"
// // //               style={{ display: "none" }}
// // //               onChange={onFileChange}
// // //             />

// // //             {file && (
// // //               <div style={styles.fileChip}>
// // //                 <span style={{ fontSize: "22px" }}>{getDocIcon(file.name)}</span>
// // //                 <div style={{ flex: 1, overflow: "hidden" }}>
// // //                   <div style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
// // //                     {file.name}
// // //                   </div>
// // //                   <div style={{ fontSize: "11px", color: COLORS.textMuted }}>{formatBytes(file.size)}</div>
// // //                 </div>
// // //                 <button
// // //                   onClick={(e) => { e.stopPropagation(); setFile(null); }}
// // //                   style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
// // //                 >×</button>
// // //               </div>
// // //             )}
// // //           </div>

// // //           {/* URL Input */}
// // //           <div>
// // //             <span style={styles.label}>🌐 Or Enter URL</span>
// // //             <input
// // //               style={styles.urlInput}
// // //               placeholder="https://example.com/report"
// // //               value={url}
// // //               onChange={(e) => { setUrl(e.target.value); if (e.target.value) setFile(null); }}
// // //               disabled={!!file}
// // //             />
// // //           </div>

// // //           {/* Question */}
// // //           <div>
// // //             <span style={styles.label}>💬 Business Question (optional)</span>
// // //             <textarea
// // //               style={styles.textarea}
// // //               placeholder="e.g. What are the main revenue risks? How is market share trending? What operational improvements are recommended?"
// // //               value={question}
// // //               onChange={(e) => setQuestion(e.target.value)}
// // //             />
// // //           </div>

// // //           {/* Analyze Button */}
// // //           <button
// // //             style={{ ...styles.btn("primary", !canAnalyze), width: "100%", padding: "14px" }}
// // //             className="btn-hover"
// // //             onClick={runAnalysis}
// // //             disabled={!canAnalyze}
// // //           >
// // //             {processing ? (
// // //               <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
// // //                 <span style={styles.spinner} /> Analyzing…
// // //               </span>
// // //             ) : (
// // //               "▶ Run Analysis"
// // //             )}
// // //           </button>

// // //           {/* Processing Steps */}
// // //           {processing && (
// // //             <div>
// // //               <span style={styles.label}>Processing Pipeline</span>
// // //               <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
// // //                 {STEPS.map((step, i) => {
// // //                   const active = currentStep === i;
// // //                   const done = doneSteps.includes(i);
// // //                   return (
// // //                     <div key={step.id} style={styles.stepItem(active, done)}>
// // //                       <span style={{ fontSize: "14px" }}>
// // //                         {done ? "✅" : active ? <span style={{ ...styles.spinner, width: "14px", height: "14px" }} /> : "○"}
// // //                       </span>
// // //                       <span style={{
// // //                         fontSize: "12px",
// // //                         color: done ? COLORS.success : active ? COLORS.accent : COLORS.textMuted,
// // //                         fontWeight: active || done ? "600" : "400",
// // //                       }}>
// // //                         {step.label}
// // //                       </span>
// // //                     </div>
// // //                   );
// // //                 })}
// // //               </div>
// // //             </div>
// // //           )}

// // //           {/* Source Badge */}
// // //           {insights && !processing && (
// // //             <div style={{ ...styles.card, padding: "14px" }}>
// // //               <span style={styles.label}>Source Analyzed</span>
// // //               <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// // //                 <span style={{ fontSize: "22px" }}>
// // //                   {url ? "🌐" : getDocIcon(file?.name || "")}
// // //                 </span>
// // //                 <div>
// // //                   <div style={{ fontSize: "12px", fontWeight: "600", wordBreak: "break-all" }}>
// // //                     {docSource}
// // //                   </div>
// // //                   <div style={{ fontSize: "11px", color: COLORS.textMuted }}>
// // //                     {insights.generatedAt}
// // //                   </div>
// // //                 </div>
// // //               </div>
// // //             </div>
// // //           )}
// // //         </div>

// // //         {/* ── Main Content ── */}
// // //         <div style={styles.main}>
// // //           {!insights && !processing && (
// // //             <div style={{
// // //               flex: 1,
// // //               display: "flex",
// // //               flexDirection: "column",
// // //               alignItems: "center",
// // //               justifyContent: "center",
// // //               gap: "16px",
// // //               color: COLORS.textMuted,
// // //               textAlign: "center",
// // //             }}>
// // //               <div style={{ fontSize: "64px", opacity: 0.3 }}>🧠</div>
// // //               <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.textDim }}>
// // //                 Upload a document to get started
// // //               </div>
// // //               <div style={{ fontSize: "13px", lineHeight: "1.6", maxWidth: "380px" }}>
// // //                 Docling parses your PDF, PowerPoint, or web page. GPT-5 extracts business insights and KPIs. Export everything as a formatted PDF report.
// // //               </div>
// // //               <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
// // //                 {[
// // //                   { icon: "📄", label: "Annual reports" },
// // //                   { icon: "📊", label: "Presentations" },
// // //                   { icon: "🌐", label: "Web pages" },
// // //                   { icon: "📝", label: "Strategic docs" },
// // //                 ].map((item) => (
// // //                   <div key={item.label} style={{
// // //                     display: "flex", alignItems: "center", gap: "6px",
// // //                     padding: "8px 14px", borderRadius: "8px",
// // //                     background: COLORS.surface, border: `1px solid ${COLORS.border}`,
// // //                     fontSize: "12px",
// // //                   }}>
// // //                     {item.icon} {item.label}
// // //                   </div>
// // //                 ))}
// // //               </div>
// // //             </div>
// // //           )}

// // //           {insights && (
// // //             <>
// // //               {/* Summary */}
// // //               <div style={{ ...styles.insightCard, animation: "fadeUp 0.4s ease both" }}>
// // //                 <div style={styles.insightTitle}>📋 Executive Summary</div>
// // //                 <p style={{ fontSize: "14px", color: COLORS.textDim, lineHeight: "1.7", margin: 0 }}>
// // //                   {insights.summary}
// // //                 </p>
// // //               </div>

// // //               {/* KPIs */}
// // //               <div>
// // //                 <span style={styles.label}>📈 Key Performance Indicators</span>
// // //                 <div style={styles.kpiGrid}>
// // //                   {insights.kpis.map((kpi, i) => (
// // //                     <div
// // //                       key={i}
// // //                       className="insight-card"
// // //                       style={{ ...styles.kpiCard, animationDelay: `${i * 0.07}s` }}
// // //                     >
// // //                       <div style={{ fontSize: "11px", color: COLORS.textMuted, marginBottom: "6px", letterSpacing: "0.5px" }}>
// // //                         {kpi.label}
// // //                       </div>
// // //                       <div style={{ fontSize: "22px", fontWeight: "700", color: COLORS.text, marginBottom: "8px" }}>
// // //                         {kpi.value}
// // //                       </div>
// // //                       <div style={styles.progressBar(kpi.score)}>
// // //                         <div style={styles.progressFill(kpi.score)} />
// // //                       </div>
// // //                       <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "10px", color: COLORS.textMuted }}>
// // //                         <span>{kpi.trend === "up" ? "▲ Positive" : "▶ Stable"}</span>
// // //                         <span>{kpi.score}/100</span>
// // //                       </div>
// // //                     </div>
// // //                   ))}
// // //                 </div>
// // //               </div>

// // //               {/* Insights */}
// // //               <div>
// // //                 <span style={styles.label}>🔍 Business Insights</span>
// // //                 <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
// // //                   {insights.insights.map((ins, i) => (
// // //                     <div
// // //                       key={i}
// // //                       className="insight-card"
// // //                       style={{
// // //                         ...styles.card,
// // //                         borderLeft: `3px solid ${
// // //                           ins.priority === "HIGH" ? COLORS.danger : COLORS.warning
// // //                         }`,
// // //                       }}
// // //                     >
// // //                       <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
// // //                         <span style={styles.tag(ins.priority === "HIGH" ? "blue" : "")}>
// // //                           {ins.priority}
// // //                         </span>
// // //                         <span style={styles.tag("green")}>{ins.category}</span>
// // //                         <span style={{ fontSize: "14px", fontWeight: "700", color: COLORS.text }}>
// // //                           {ins.title}
// // //                         </span>
// // //                       </div>
// // //                       <p style={{ fontSize: "13px", color: COLORS.textDim, lineHeight: "1.7", margin: 0 }}>
// // //                         {ins.body}
// // //                       </p>
// // //                     </div>
// // //                   ))}
// // //                 </div>
// // //               </div>

// // //               {/* Recommendations */}
// // //               <div style={styles.card}>
// // //                 <div style={styles.insightTitle}>✅ Strategic Recommendations</div>
// // //                 <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
// // //                   {insights.recommendations.map((rec, i) => (
// // //                     <div
// // //                       key={i}
// // //                       style={{
// // //                         display: "flex",
// // //                         alignItems: "flex-start",
// // //                         gap: "12px",
// // //                         padding: "10px 14px",
// // //                         background: COLORS.bg,
// // //                         borderRadius: "8px",
// // //                         fontSize: "13px",
// // //                         color: COLORS.textDim,
// // //                         lineHeight: "1.5",
// // //                       }}
// // //                     >
// // //                       <span style={{
// // //                         background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`,
// // //                         color: "#fff",
// // //                         width: "22px",
// // //                         height: "22px",
// // //                         borderRadius: "50%",
// // //                         display: "flex",
// // //                         alignItems: "center",
// // //                         justifyContent: "center",
// // //                         fontSize: "11px",
// // //                         fontWeight: "700",
// // //                         flexShrink: 0,
// // //                         marginTop: "1px",
// // //                       }}>
// // //                         {i + 1}
// // //                       </span>
// // //                       {rec}
// // //                     </div>
// // //                   ))}
// // //                 </div>
// // //               </div>
// // //             </>
// // //           )}
// // //         </div>
// // //       </div>
// // //     </div>
// // //   );
// // // }
// // import { useState, useRef, useCallback } from "react";

// // const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// // // ─── Color palette matching PowerBI-style dark dashboard ───────────────────
// // const COLORS = {
// //   bg: "#0f1117",
// //   surface: "#1a1d27",
// //   surfaceHover: "#22263a",
// //   border: "#2a2f45",
// //   accent: "#4f8ef7",
// //   accentGlow: "rgba(79,142,247,0.15)",
// //   accentDim: "rgba(79,142,247,0.5)",
// //   success: "#22c55e",
// //   warning: "#f59e0b",
// //   danger: "#ef4444",
// //   text: "#e2e8f0",
// //   textMuted: "#64748b",
// //   textDim: "#94a3b8",
// // };

// // const styles = {
// //   container: {
// //     background: COLORS.bg,
// //     minHeight: "100vh",
// //     fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
// //     color: COLORS.text,
// //     padding: "0",
// //   },
// //   header: {
// //     background: `linear-gradient(135deg, ${COLORS.surface} 0%, #13162b 100%)`,
// //     borderBottom: `1px solid ${COLORS.border}`,
// //     padding: "20px 32px",
// //     display: "flex",
// //     alignItems: "center",
// //     gap: "16px",
// //   },
// //   headerIcon: {
// //     width: "40px",
// //     height: "40px",
// //     background: `linear-gradient(135deg, ${COLORS.accent}, #7c3aed)`,
// //     borderRadius: "10px",
// //     display: "flex",
// //     alignItems: "center",
// //     justifyContent: "center",
// //     fontSize: "20px",
// //     boxShadow: `0 0 20px ${COLORS.accentGlow}`,
// //   },
// //   title: { fontSize: "20px", fontWeight: "600", letterSpacing: "-0.3px", margin: 0 },
// //   subtitle: { fontSize: "12px", color: COLORS.textMuted, margin: "2px 0 0", letterSpacing: "0.5px", textTransform: "uppercase" },
// //   body: { display: "grid", gridTemplateColumns: "380px 1fr", gap: "0", height: "calc(100vh - 81px)" },
// //   sidebar: {
// //     borderRight: `1px solid ${COLORS.border}`,
// //     padding: "24px",
// //     overflowY: "auto",
// //     background: COLORS.surface,
// //     display: "flex",
// //     flexDirection: "column",
// //     gap: "20px",
// //   },
// //   main: { padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" },
// //   card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px" },
// //   label: {
// //     fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase",
// //     color: COLORS.textMuted, marginBottom: "10px", display: "block",
// //   },
// //   dropzone: (dragging) => ({
// //     border: `2px dashed ${dragging ? COLORS.accent : COLORS.border}`,
// //     borderRadius: "10px", padding: "28px 20px", textAlign: "center",
// //     cursor: "pointer", transition: "all 0.2s",
// //     background: dragging ? COLORS.accentGlow : "transparent",
// //   }),
// //   fileChip: {
// //     display: "flex", alignItems: "center", gap: "10px",
// //     background: COLORS.surfaceHover, border: `1px solid ${COLORS.border}`,
// //     borderRadius: "8px", padding: "10px 14px", marginTop: "10px", fontSize: "13px",
// //   },
// //   urlInput: {
// //     width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
// //     borderRadius: "8px", padding: "10px 14px", color: COLORS.text,
// //     fontSize: "13px", fontFamily: "inherit", outline: "none",
// //     boxSizing: "border-box", transition: "border-color 0.2s",
// //   },
// //   textarea: {
// //     width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
// //     borderRadius: "8px", padding: "10px 14px", color: COLORS.text,
// //     fontSize: "13px", fontFamily: "inherit", outline: "none",
// //     boxSizing: "border-box", resize: "vertical", minHeight: "80px",
// //     transition: "border-color 0.2s",
// //   },
// //   btn: (variant = "primary", disabled = false) => ({
// //     padding: "10px 20px", borderRadius: "8px", border: "none",
// //     cursor: disabled ? "not-allowed" : "pointer", fontSize: "13px",
// //     fontWeight: "600", fontFamily: "inherit", letterSpacing: "0.3px",
// //     transition: "all 0.2s", opacity: disabled ? 0.5 : 1,
// //     ...(variant === "primary"
// //       ? { background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, color: "#fff", boxShadow: disabled ? "none" : `0 4px 14px ${COLORS.accentDim}` }
// //       : variant === "success"
// //       ? { background: `linear-gradient(135deg, #16a34a, #059669)`, color: "#fff", boxShadow: disabled ? "none" : "0 4px 14px rgba(34,197,94,0.3)" }
// //       : { background: COLORS.surfaceHover, color: COLORS.textDim, border: `1px solid ${COLORS.border}` }),
// //   }),
// //   tag: (color) => ({
// //     display: "inline-block", padding: "3px 10px", borderRadius: "20px",
// //     fontSize: "11px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase",
// //     background: color === "blue" ? COLORS.accentGlow : color === "green" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
// //     color: color === "blue" ? COLORS.accent : color === "green" ? COLORS.success : COLORS.warning,
// //     border: `1px solid ${color === "blue" ? COLORS.accentDim : color === "green" ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
// //   }),
// //   insightCard: {
// //     background: `linear-gradient(135deg, ${COLORS.surface} 0%, #181c2e 100%)`,
// //     border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px",
// //     borderLeft: `3px solid ${COLORS.accent}`,
// //   },
// //   insightTitle: { fontSize: "13px", fontWeight: "700", color: COLORS.accent, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" },
// //   kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" },
// //   kpiCard: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "16px", textAlign: "center" },
// //   progressBar: { height: "6px", background: COLORS.border, borderRadius: "3px", overflow: "hidden", position: "relative" },
// //   spinner: {
// //     width: "20px", height: "20px", border: `2px solid ${COLORS.border}`,
// //     borderTop: `2px solid ${COLORS.accent}`, borderRadius: "50%",
// //     animation: "spin 0.8s linear infinite", display: "inline-block",
// //   },
// // };

// // const DOC_ICONS = { pdf: "📄", pptx: "📊", ppt: "📊", docx: "📝", doc: "📝", url: "🌐", txt: "📃", default: "📎" };
// // function getDocIcon(name) { const ext = name?.split(".").pop()?.toLowerCase(); return DOC_ICONS[ext] || DOC_ICONS.default; }
// // function formatBytes(b) { if (b < 1024) return `${b} B`; if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`; return `${(b / (1024 * 1024)).toFixed(1)} MB`; }

// // // Processing steps (shown during real API call)
// // const STEPS = [
// //   { id: "parse",    label: "Parsing document with Docling" },
// //   { id: "extract",  label: "Extracting structured content" },
// //   { id: "analyze",  label: "Analyzing with Azure OpenAI" },
// //   { id: "insights", label: "Generating business insights" },
// //   { id: "report",   label: "Building insight report" },
// // ];

// // export default function DocumentIntelligence() {
// //   const [file, setFile] = useState(null);
// //   const [url, setUrl] = useState("");
// //   const [question, setQuestion] = useState("");
// //   const [dragging, setDragging] = useState(false);
// //   const [processing, setProcessing] = useState(false);
// //   const [currentStep, setCurrentStep] = useState(-1);
// //   const [doneSteps, setDoneSteps] = useState([]);
// //   const [insights, setInsights] = useState(null);   // InsightReport from backend
// //   const [error, setError] = useState(null);
// //   const [exportLoading, setExportLoading] = useState(false);
// //   const [exportDone, setExportDone] = useState(false);
// //   const fileRef = useRef();

// //   const docSource = file ? file.name : url || null;
// //   const canAnalyze = (file || url.trim()) && !processing;

// //   const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
// //   const onDragLeave = useCallback(() => setDragging(false), []);
// //   const onDrop = useCallback((e) => {
// //     e.preventDefault(); setDragging(false);
// //     const f = e.dataTransfer.files[0];
// //     if (f) { setFile(f); setUrl(""); }
// //   }, []);
// //   const onFileChange = (e) => {
// //     const f = e.target.files[0];
// //     if (f) { setFile(f); setUrl(""); }
// //   };

// //   // Animate step progress during actual API call
// //   const animateSteps = async (durationMs) => {
// //     const stepDelay = durationMs / STEPS.length;
// //     for (let i = 0; i < STEPS.length; i++) {
// //       setCurrentStep(i);
// //       await new Promise((r) => setTimeout(r, stepDelay));
// //       setDoneSteps((prev) => [...prev, i]);
// //     }
// //     setCurrentStep(-1);
// //   };

// //   const runAnalysis = async () => {
// //     if (!canAnalyze) return;
// //     setProcessing(true);
// //     setInsights(null);
// //     setError(null);
// //     setCurrentStep(-1);
// //     setDoneSteps([]);
// //     setExportDone(false);

// //     const token = localStorage.getItem("token");
// //     const tabKey = sessionStorage.getItem("tab_session_key") || "";

// //     try {
// //       const formData = new FormData();
// //       if (file) {
// //         formData.append("file", file);
// //       } else {
// //         formData.append("url", url.trim());
// //       }
// //       formData.append("question", question);

// //       // Start step animation in parallel (estimate ~25s for API call)
// //       const animPromise = animateSteps(25000);

// //       const response = await fetch(`${API_BASE_URL}/api/document-intelligence/analyze`, {
// //         method: "POST",
// //         headers: {
// //           Authorization: `Bearer ${token}`,
// //           "X-Tab-Session-Key": tabKey,
// //         },
// //         body: formData,
// //       });

// //       // Finish remaining steps quickly once we get the response
// //       await animPromise.catch(() => {});

// //       if (!response.ok) {
// //         const errData = await response.json().catch(() => ({}));
// //         throw new Error(errData.detail || `Server error ${response.status}`);
// //       }

// //       const data = await response.json();
// //       setInsights(data);
// //     } catch (err) {
// //       setError(err.message || "Analysis failed. Please try again.");
// //       setCurrentStep(-1);
// //       setDoneSteps([]);
// //     } finally {
// //       setProcessing(false);
// //     }
// //   };

// //   const exportPDF = async () => {
// //     if (!insights) return;
// //     setExportLoading(true);
// //     setError(null);
// //     const token = localStorage.getItem("token");
// //     const tabKey = sessionStorage.getItem("tab_session_key") || "";
// //     try {
// //       const response = await fetch(`${API_BASE_URL}/api/document-intelligence/export-pdf`, {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //           Authorization: `Bearer ${token}`,
// //           "X-Tab-Session-Key": tabKey,
// //         },
// //         body: JSON.stringify(insights),
// //       });
// //       if (!response.ok) throw new Error(`Export failed: ${response.status}`);
// //       const blob = await response.blob();
// //       const blobUrl = URL.createObjectURL(blob);
// //       const a = document.createElement("a");
// //       a.href = blobUrl;
// //       a.download = `insights_${Date.now()}.pdf`;
// //       a.click();
// //       URL.revokeObjectURL(blobUrl);
// //       setExportDone(true);
// //       setTimeout(() => setExportDone(false), 4000);
// //     } catch (err) {
// //       setError(err.message || "PDF export failed.");
// //     } finally {
// //       setExportLoading(false);
// //     }
// //   };

// //   const reset = () => {
// //     setFile(null); setUrl(""); setQuestion(""); setInsights(null);
// //     setProcessing(false); setCurrentStep(-1); setDoneSteps([]);
// //     setExportDone(false); setError(null);
// //   };

// //   return (
// //     <div style={styles.container}>
// //       <style>{`
// //         @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
// //         * { box-sizing: border-box; }
// //         @keyframes spin { to { transform: rotate(360deg); } }
// //         @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
// //         .insight-card { animation: fadeUp 0.4s ease both; }
// //         .insight-card:nth-child(1) { animation-delay: 0.05s; }
// //         .insight-card:nth-child(2) { animation-delay: 0.12s; }
// //         .insight-card:nth-child(3) { animation-delay: 0.19s; }
// //         .insight-card:nth-child(4) { animation-delay: 0.26s; }
// //         .btn-hover:hover { opacity: 0.88 !important; transform: translateY(-1px); }
// //         input:focus, textarea:focus { border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 3px ${COLORS.accentGlow}; }
// //         ::-webkit-scrollbar { width: 6px; }
// //         ::-webkit-scrollbar-track { background: transparent; }
// //         ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
// //       `}</style>

// //       {/* Header */}
// //       <div style={styles.header}>
// //         <div style={styles.headerIcon}>🧠</div>
// //         <div>
// //           <h2 style={styles.title}>Document Intelligence</h2>
// //           <p style={styles.subtitle}>Docling · Azure OpenAI · ReportLab Export</p>
// //         </div>
// //         {insights && (
// //           <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
// //             <button style={{ ...styles.btn("outline"), fontSize: "12px" }} className="btn-hover" onClick={reset}>
// //               ↺ New Analysis
// //             </button>
// //             <button style={styles.btn("success", exportLoading)} className="btn-hover" onClick={exportPDF} disabled={exportLoading}>
// //               {exportLoading
// //                 ? <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={styles.spinner} /> Generating PDF…</span>
// //                 : exportDone ? "✓ PDF Downloaded!" : "⬇ Export Insights PDF"}
// //             </button>
// //           </div>
// //         )}
// //       </div>

// //       <div style={styles.body}>
// //         {/* ── Sidebar ── */}
// //         <div style={styles.sidebar}>
// //           {/* Upload Zone */}
// //           <div>
// //             <span style={styles.label}>📁 Document Source</span>
// //             <div
// //               style={styles.dropzone(dragging)}
// //               onDragOver={onDragOver}
// //               onDragLeave={onDragLeave}
// //               onDrop={onDrop}
// //               onClick={() => fileRef.current.click()}
// //             >
// //               <div style={{ fontSize: "28px", marginBottom: "8px" }}>{dragging ? "📂" : "📤"}</div>
// //               <div style={{ fontSize: "13px", color: COLORS.textDim, lineHeight: "1.5" }}>
// //                 Drop a file here or <span style={{ color: COLORS.accent, fontWeight: "600" }}>browse</span>
// //               </div>
// //               <div style={{ marginTop: "8px", display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
// //                 {["PDF", "PPTX", "DOCX", "TXT"].map((t) => (
// //                   <span key={t} style={styles.tag("blue")}>{t}</span>
// //                 ))}
// //               </div>
// //             </div>
// //             <input ref={fileRef} type="file" accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.csv" style={{ display: "none" }} onChange={onFileChange} />
// //             {file && (
// //               <div style={styles.fileChip}>
// //                 <span style={{ fontSize: "22px" }}>{getDocIcon(file.name)}</span>
// //                 <div style={{ flex: 1, overflow: "hidden" }}>
// //                   <div style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
// //                   <div style={{ fontSize: "11px", color: COLORS.textMuted }}>{formatBytes(file.size)}</div>
// //                 </div>
// //                 <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
// //                   style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>×</button>
// //               </div>
// //             )}
// //           </div>

// //           {/* URL Input */}
// //           <div>
// //             <span style={styles.label}>🌐 Or Enter URL</span>
// //             <input
// //               style={styles.urlInput}
// //               placeholder="https://example.com/report"
// //               value={url}
// //               onChange={(e) => { setUrl(e.target.value); if (e.target.value) setFile(null); }}
// //               disabled={!!file}
// //             />
// //           </div>

// //           {/* Question */}
// //           <div>
// //             <span style={styles.label}>💬 Business Question (optional)</span>
// //             <textarea
// //               style={styles.textarea}
// //               placeholder="e.g. What are the main revenue risks? How is market share trending?"
// //               value={question}
// //               onChange={(e) => setQuestion(e.target.value)}
// //             />
// //           </div>

// //           {/* Analyze Button */}
// //           <button
// //             style={{ ...styles.btn("primary", !canAnalyze), width: "100%", padding: "14px" }}
// //             className="btn-hover"
// //             onClick={runAnalysis}
// //             disabled={!canAnalyze}
// //           >
// //             {processing
// //               ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}><span style={styles.spinner} /> Analyzing…</span>
// //               : "▶ Run Analysis"}
// //           </button>

// //           {/* Error */}
// //           {error && (
// //             <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#ef4444" }}>
// //               ❌ {error}
// //             </div>
// //           )}

// //           {/* Processing Steps */}
// //           {processing && (
// //             <div>
// //               <span style={styles.label}>Processing Pipeline</span>
// //               <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
// //                 {STEPS.map((step, i) => {
// //                   const active = currentStep === i;
// //                   const done = doneSteps.includes(i);
// //                   return (
// //                     <div key={step.id} style={{
// //                       display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px",
// //                       background: active ? COLORS.accentGlow : done ? "rgba(34,197,94,0.05)" : "transparent",
// //                       border: `1px solid ${active ? COLORS.accentDim : done ? "rgba(34,197,94,0.2)" : "transparent"}`,
// //                       transition: "all 0.3s",
// //                     }}>
// //                       <span style={{ fontSize: "14px" }}>
// //                         {done ? "✅" : active ? <span style={{ ...styles.spinner, width: "14px", height: "14px" }} /> : "○"}
// //                       </span>
// //                       <span style={{ fontSize: "12px", color: done ? COLORS.success : active ? COLORS.accent : COLORS.textMuted, fontWeight: active || done ? "600" : "400" }}>
// //                         {step.label}
// //                       </span>
// //                     </div>
// //                   );
// //                 })}
// //               </div>
// //             </div>
// //           )}

// //           {/* Source Badge */}
// //           {insights && !processing && (
// //             <div style={{ ...styles.card, padding: "14px" }}>
// //               <span style={styles.label}>Source Analyzed</span>
// //               <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// //                 <span style={{ fontSize: "22px" }}>{url ? "🌐" : getDocIcon(file?.name || "")}</span>
// //                 <div>
// //                   <div style={{ fontSize: "12px", fontWeight: "600", wordBreak: "break-all" }}>{docSource}</div>
// //                   <div style={{ fontSize: "11px", color: COLORS.textMuted }}>{insights.generated_at}</div>
// //                 </div>
// //               </div>
// //             </div>
// //           )}
// //         </div>

// //         {/* ── Main Content ── */}
// //         <div style={styles.main}>
// //           {!insights && !processing && (
// //             <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", color: COLORS.textMuted, textAlign: "center" }}>
// //               <div style={{ fontSize: "64px", opacity: 0.3 }}>🧠</div>
// //               <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.textDim }}>Upload a document to get started</div>
// //               <div style={{ fontSize: "13px", lineHeight: "1.6", maxWidth: "380px" }}>
// //                 Docling parses your PDF, PowerPoint, or web page. Azure OpenAI extracts business insights and KPIs. Export everything as a formatted PDF report.
// //               </div>
// //               <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
// //                 {[{ icon: "📄", label: "Annual reports" }, { icon: "📊", label: "Presentations" }, { icon: "🌐", label: "Web pages" }, { icon: "📝", label: "Strategic docs" }].map((item) => (
// //                   <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, fontSize: "12px" }}>
// //                     {item.icon} {item.label}
// //                   </div>
// //                 ))}
// //               </div>
// //             </div>
// //           )}

// //           {insights && (
// //             <>
// //               {/* Summary */}
// //               <div style={{ ...styles.insightCard, animation: "fadeUp 0.4s ease both" }}>
// //                 <div style={styles.insightTitle}>📋 Executive Summary</div>
// //                 <p style={{ fontSize: "14px", color: COLORS.textDim, lineHeight: "1.7", margin: 0 }}>{insights.summary}</p>
// //               </div>

// //               {/* KPIs */}
// //               {insights.kpis?.length > 0 && (
// //                 <div>
// //                   <span style={styles.label}>📈 Key Performance Indicators</span>
// //                   <div style={styles.kpiGrid}>
// //                     {insights.kpis.map((kpi, i) => (
// //                       <div key={i} className="insight-card" style={{ ...styles.kpiCard, animationDelay: `${i * 0.07}s` }}>
// //                         <div style={{ fontSize: "11px", color: COLORS.textMuted, marginBottom: "6px", letterSpacing: "0.5px" }}>{kpi.label}</div>
// //                         <div style={{ fontSize: "22px", fontWeight: "700", color: COLORS.text, marginBottom: "8px" }}>{kpi.value}</div>
// //                         <div style={styles.progressBar}>
// //                           <div style={{ height: "100%", width: `${kpi.score}%`, background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent}88)`, borderRadius: "3px", transition: "width 1s ease" }} />
// //                         </div>
// //                         <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "10px", color: COLORS.textMuted }}>
// //                           <span>{kpi.trend === "up" ? "▲ Positive" : kpi.trend === "down" ? "▼ Negative" : "▶ Stable"}</span>
// //                           <span>{kpi.score}/100</span>
// //                         </div>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 </div>
// //               )}

// //               {/* Insights */}
// //               {insights.insights?.length > 0 && (
// //                 <div>
// //                   <span style={styles.label}>🔍 Business Insights</span>
// //                   <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
// //                     {insights.insights.map((ins, i) => (
// //                       <div key={i} className="insight-card" style={{
// //                         ...styles.card,
// //                         borderLeft: `3px solid ${ins.priority === "HIGH" ? COLORS.danger : ins.priority === "MEDIUM" ? COLORS.warning : COLORS.textMuted}`,
// //                       }}>
// //                         <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
// //                           <span style={styles.tag(ins.priority === "HIGH" ? "blue" : "")}>{ins.priority}</span>
// //                           <span style={styles.tag("green")}>{ins.category}</span>
// //                           <span style={{ fontSize: "14px", fontWeight: "700", color: COLORS.text }}>{ins.title}</span>
// //                         </div>
// //                         <p style={{ fontSize: "13px", color: COLORS.textDim, lineHeight: "1.7", margin: 0 }}>{ins.body}</p>
// //                       </div>
// //                     ))}
// //                   </div>
// //                 </div>
// //               )}

// //               {/* Recommendations */}
// //               {insights.recommendations?.length > 0 && (
// //                 <div style={styles.card}>
// //                   <div style={styles.insightTitle}>✅ Strategic Recommendations</div>
// //                   <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
// //                     {insights.recommendations.map((rec, i) => (
// //                       <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", background: COLORS.bg, borderRadius: "8px", fontSize: "13px", color: COLORS.textDim, lineHeight: "1.5" }}>
// //                         <span style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>
// //                           {i + 1}
// //                         </span>
// //                         {rec}
// //                       </div>
// //                     ))}
// //                   </div>
// //                 </div>
// //               )}
// //             </>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// import { useState, useRef, useCallback } from "react";


// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";


// // ─── Color palette matching PowerBI-style dark dashboard ───────────────────
// const COLORS = {
//   bg: "#0f1117",
//   surface: "#1a1d27",
//   surfaceHover: "#22263a",
//   border: "#2a2f45",
//   accent: "#4f8ef7",
//   accentGlow: "rgba(79,142,247,0.15)",
//   accentDim: "rgba(79,142,247,0.5)",
//   success: "#22c55e",
//   warning: "#f59e0b",
//   danger: "#ef4444",
//   text: "#e2e8f0",
//   textMuted: "#64748b",
//   textDim: "#94a3b8",
// };


// const styles = {
//   container: {
//     background: COLORS.bg,
//     minHeight: "100vh",
//     fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
//     color: COLORS.text,
//     padding: "0",
//   },
//   header: {
//     background: `linear-gradient(135deg, ${COLORS.surface} 0%, #13162b 100%)`,
//     borderBottom: `1px solid ${COLORS.border}`,
//     padding: "20px 32px",
//     display: "flex",
//     alignItems: "center",
//     gap: "16px",
//   },
//   headerIcon: {
//     width: "40px",
//     height: "40px",
//     background: `linear-gradient(135deg, ${COLORS.accent}, #7c3aed)`,
//     borderRadius: "10px",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     fontSize: "20px",
//     boxShadow: `0 0 20px ${COLORS.accentGlow}`,
//   },
//   title: { fontSize: "20px", fontWeight: "600", letterSpacing: "-0.3px", margin: 0 },
//   subtitle: { fontSize: "12px", color: COLORS.textMuted, margin: "2px 0 0", letterSpacing: "0.5px", textTransform: "uppercase" },
//   body: { display: "grid", gridTemplateColumns: "380px 1fr", gap: "0", height: "calc(100vh - 81px)" },
//   sidebar: {
//     borderRight: `1px solid ${COLORS.border}`,
//     padding: "24px",
//     overflowY: "auto",
//     background: COLORS.surface,
//     display: "flex",
//     flexDirection: "column",
//     gap: "20px",
//   },
//   main: { padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" },
//   card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px" },
//   label: {
//     fontSize: "11px", fontWeight: "700", letterSpacing: "1.5px", textTransform: "uppercase",
//     color: COLORS.textMuted, marginBottom: "10px", display: "block",
//   },
//   dropzone: (dragging) => ({
//     border: `2px dashed ${dragging ? COLORS.accent : COLORS.border}`,
//     borderRadius: "10px", padding: "28px 20px", textAlign: "center",
//     cursor: "pointer", transition: "all 0.2s",
//     background: dragging ? COLORS.accentGlow : "transparent",
//   }),
//   fileChip: {
//     display: "flex", alignItems: "center", gap: "10px",
//     background: COLORS.surfaceHover, border: `1px solid ${COLORS.border}`,
//     borderRadius: "8px", padding: "10px 14px", marginTop: "10px", fontSize: "13px",
//   },
//   urlInput: {
//     width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
//     borderRadius: "8px", padding: "10px 14px", color: COLORS.text,
//     fontSize: "13px", fontFamily: "inherit", outline: "none",
//     boxSizing: "border-box", transition: "border-color 0.2s",
//   },
//   textarea: {
//     width: "100%", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
//     borderRadius: "8px", padding: "10px 14px", color: COLORS.text,
//     fontSize: "13px", fontFamily: "inherit", outline: "none",
//     boxSizing: "border-box", resize: "vertical", minHeight: "80px",
//     transition: "border-color 0.2s",
//   },
//   btn: (variant = "primary", disabled = false) => ({
//     padding: "10px 20px", borderRadius: "8px", border: "none",
//     cursor: disabled ? "not-allowed" : "pointer", fontSize: "13px",
//     fontWeight: "600", fontFamily: "inherit", letterSpacing: "0.3px",
//     transition: "all 0.2s", opacity: disabled ? 0.5 : 1,
//     ...(variant === "primary"
//       ? { background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, color: "#fff", boxShadow: disabled ? "none" : `0 4px 14px ${COLORS.accentDim}` }
//       : variant === "success"
//       ? { background: `linear-gradient(135deg, #16a34a, #059669)`, color: "#fff", boxShadow: disabled ? "none" : "0 4px 14px rgba(34,197,94,0.3)" }
//       : { background: COLORS.surfaceHover, color: COLORS.textDim, border: `1px solid ${COLORS.border}` }),
//   }),
//   tag: (color) => ({
//     display: "inline-block", padding: "3px 10px", borderRadius: "20px",
//     fontSize: "11px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase",
//     background: color === "blue" ? COLORS.accentGlow : color === "green" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
//     color: color === "blue" ? COLORS.accent : color === "green" ? COLORS.success : COLORS.warning,
//     border: `1px solid ${color === "blue" ? COLORS.accentDim : color === "green" ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
//   }),
//   insightCard: {
//     background: `linear-gradient(135deg, ${COLORS.surface} 0%, #181c2e 100%)`,
//     border: `1px solid ${COLORS.border}`, borderRadius: "12px", padding: "20px",
//     borderLeft: `3px solid ${COLORS.accent}`,
//   },
//   insightTitle: { fontSize: "13px", fontWeight: "700", color: COLORS.accent, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" },
//   kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" },
//   kpiCard: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: "10px", padding: "16px", textAlign: "center" },
//   progressBar: { height: "6px", background: COLORS.border, borderRadius: "3px", overflow: "hidden", position: "relative" },
//   spinner: {
//     width: "20px", height: "20px", border: `2px solid ${COLORS.border}`,
//     borderTop: `2px solid ${COLORS.accent}`, borderRadius: "50%",
//     animation: "spin 0.8s linear infinite", display: "inline-block",
//   },
// };


// const DOC_ICONS = { pdf: "📄", pptx: "📊", ppt: "📊", docx: "📝", doc: "📝", url: "🌐", txt: "📃", csv: "📊", xlsx: "📊", xls: "📊", default: "📎" };
// function getDocIcon(name) { const ext = name?.split(".").pop()?.toLowerCase(); return DOC_ICONS[ext] || DOC_ICONS.default; }
// function formatBytes(b) { if (b < 1024) return `${b} B`; if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`; return `${(b / (1024 * 1024)).toFixed(1)} MB`; }


// // Processing steps (shown during real API call)
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
//   const [insights, setInsights] = useState(null);   // InsightReport from backend
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


//   // Animate step progress during actual API call
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


//       // Start step animation in parallel (estimate ~25s for API call)
//       const animPromise = animateSteps(25000);


//       const response = await fetch(`${API_BASE_URL}/api/document-intelligence/analyze`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "X-Tab-Session-Key": tabKey,
//         },
//         body: formData,
//       });


//       // Finish remaining steps quickly once we get the response
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
//     <div style={styles.container}>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
//         * { box-sizing: border-box; }
//         @keyframes spin { to { transform: rotate(360deg); } }
//         @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
//         .insight-card { animation: fadeUp 0.4s ease both; }
//         .insight-card:nth-child(1) { animation-delay: 0.05s; }
//         .insight-card:nth-child(2) { animation-delay: 0.12s; }
//         .insight-card:nth-child(3) { animation-delay: 0.19s; }
//         .insight-card:nth-child(4) { animation-delay: 0.26s; }
//         .btn-hover:hover { opacity: 0.88 !important; transform: translateY(-1px); }
//         input:focus, textarea:focus { border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 3px ${COLORS.accentGlow}; }
//         ::-webkit-scrollbar { width: 6px; }
//         ::-webkit-scrollbar-track { background: transparent; }
//         ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
//       `}</style>


//       {/* Header */}
//       <div style={styles.header}>
//         <div style={styles.headerIcon}>🧠</div>
//         <div>
//           <h2 style={styles.title}>Document Intelligence</h2>
//           <p style={styles.subtitle}>Docling · Azure OpenAI · ReportLab Export</p>
//         </div>
//         {insights && (
//           <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
//             <button style={{ ...styles.btn("outline"), fontSize: "12px" }} className="btn-hover" onClick={reset}>
//               ↺ New Analysis
//             </button>
//             <button style={styles.btn("success", exportLoading)} className="btn-hover" onClick={exportPDF} disabled={exportLoading}>
//               {exportLoading
//                 ? <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={styles.spinner} /> Generating PDF…</span>
//                 : exportDone ? "✓ PDF Downloaded!" : "⬇ Export Insights PDF"}
//             </button>
//           </div>
//         )}
//       </div>


//       <div style={styles.body}>
//         {/* ── Sidebar ── */}
//         <div style={styles.sidebar}>
//           {/* Upload Zone */}
//           <div>
//             <span style={styles.label}>📁 Document Source</span>
//             <div
//               style={styles.dropzone(dragging)}
//               onDragOver={onDragOver}
//               onDragLeave={onDragLeave}
//               onDrop={onDrop}
//               onClick={() => fileRef.current.click()}
//             >
//               <div style={{ fontSize: "28px", marginBottom: "8px" }}>{dragging ? "📂" : "📤"}</div>
//               <div style={{ fontSize: "13px", color: COLORS.textDim, lineHeight: "1.5" }}>
//                 Drop a file here or <span style={{ color: COLORS.accent, fontWeight: "600" }}>browse</span>
//               </div>
//               <div style={{ marginTop: "8px", display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
//                 {["PDF", "PPTX", "DOCX", "TXT", "CSV", "XLSX"].map((t) => (
//                   <span key={t} style={styles.tag("blue")}>{t}</span>
//                 ))}
//               </div>
//             </div>
//             <input ref={fileRef} type="file" accept=".pdf,.pptx,.ppt,.docx,.doc,.txt,.csv,.xlsx,.xls" style={{ display: "none" }} onChange={onFileChange} />
//             {file && (
//               <div style={styles.fileChip}>
//                 <span style={{ fontSize: "22px" }}>{getDocIcon(file.name)}</span>
//                 <div style={{ flex: 1, overflow: "hidden" }}>
//                   <div style={{ fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
//                   <div style={{ fontSize: "11px", color: COLORS.textMuted }}>{formatBytes(file.size)}</div>
//                 </div>
//                 <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
//                   style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>×</button>
//               </div>
//             )}
//           </div>


//           {/* URL Input */}
//           <div>
//             <span style={styles.label}>🌐 Or Enter URL</span>
//             <input
//               style={styles.urlInput}
//               placeholder="https://example.com/report"
//               value={url}
//               onChange={(e) => { setUrl(e.target.value); if (e.target.value) setFile(null); }}
//               disabled={!!file}
//             />
//           </div>


//           {/* Question */}
//           <div>
//             <span style={styles.label}>💬 Business Question (optional)</span>
//             <textarea
//               style={styles.textarea}
//               placeholder="e.g. What are the main revenue risks? How is market share trending?"
//               value={question}
//               onChange={(e) => setQuestion(e.target.value)}
//             />
//           </div>


//           {/* Analyze Button */}
//           <button
//             style={{ ...styles.btn("primary", !canAnalyze), width: "100%", padding: "14px" }}
//             className="btn-hover"
//             onClick={runAnalysis}
//             disabled={!canAnalyze}
//           >
//             {processing
//               ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}><span style={styles.spinner} /> Analyzing…</span>
//               : "▶ Run Analysis"}
//           </button>


//           {/* Error */}
//           {error && (
//             <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#ef4444" }}>
//               ❌ {error}
//             </div>
//           )}


//           {/* Processing Steps */}
//           {processing && (
//             <div>
//               <span style={styles.label}>Processing Pipeline</span>
//               <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
//                 {STEPS.map((step, i) => {
//                   const active = currentStep === i;
//                   const done = doneSteps.includes(i);
//                   return (
//                     <div key={step.id} style={{
//                       display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderRadius: "8px",
//                       background: active ? COLORS.accentGlow : done ? "rgba(34,197,94,0.05)" : "transparent",
//                       border: `1px solid ${active ? COLORS.accentDim : done ? "rgba(34,197,94,0.2)" : "transparent"}`,
//                       transition: "all 0.3s",
//                     }}>
//                       <span style={{ fontSize: "14px" }}>
//                         {done ? "✅" : active ? <span style={{ ...styles.spinner, width: "14px", height: "14px" }} /> : "○"}
//                       </span>
//                       <span style={{ fontSize: "12px", color: done ? COLORS.success : active ? COLORS.accent : COLORS.textMuted, fontWeight: active || done ? "600" : "400" }}>
//                         {step.label}
//                       </span>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           )}


//           {/* Source Badge */}
//           {insights && !processing && (
//             <div style={{ ...styles.card, padding: "14px" }}>
//               <span style={styles.label}>Source Analyzed</span>
//               <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
//                 <span style={{ fontSize: "22px" }}>{url ? "🌐" : getDocIcon(file?.name || "")}</span>
//                 <div>
//                   <div style={{ fontSize: "12px", fontWeight: "600", wordBreak: "break-all" }}>{docSource}</div>
//                   <div style={{ fontSize: "11px", color: COLORS.textMuted }}>{insights.generated_at}</div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>


//         {/* ── Main Content ── */}
//         <div style={styles.main}>
//           {!insights && !processing && (
//             <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", color: COLORS.textMuted, textAlign: "center" }}>
//               <div style={{ fontSize: "64px", opacity: 0.3 }}>🧠</div>
//               <div style={{ fontSize: "16px", fontWeight: "600", color: COLORS.textDim }}>Upload a document to get started</div>
//               <div style={{ fontSize: "13px", lineHeight: "1.6", maxWidth: "380px" }}>
//                 Docling parses your PDF, PowerPoint, or web page. Azure OpenAI extracts business insights and KPIs. Export everything as a formatted PDF report.
//               </div>
//               <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
//                 {[
//                   { icon: "📄", label: "Annual reports" },
//                   { icon: "📊", label: "Presentations" },
//                   { icon: "📊", label: "CSV / Excel" },
//                   { icon: "🌐", label: "Web pages" },
//                   { icon: "📝", label: "Strategic docs" },
//                 ].map((item) => (
//                   <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, fontSize: "12px" }}>
//                     {item.icon} {item.label}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}


//           {insights && (
//             <>
//               {/* Summary */}
//               <div style={{ ...styles.insightCard, animation: "fadeUp 0.4s ease both" }}>
//                 <div style={styles.insightTitle}>📋 Executive Summary</div>
//                 <p style={{ fontSize: "14px", color: COLORS.textDim, lineHeight: "1.7", margin: 0 }}>{insights.summary}</p>
//               </div>


//               {/* KPIs */}
//               {insights.kpis?.length > 0 && (
//                 <div>
//                   <span style={styles.label}>📈 Key Performance Indicators</span>
//                   <div style={styles.kpiGrid}>
//                     {insights.kpis.map((kpi, i) => (
//                       <div key={i} className="insight-card" style={{ ...styles.kpiCard, animationDelay: `${i * 0.07}s` }}>
//                         <div style={{ fontSize: "11px", color: COLORS.textMuted, marginBottom: "6px", letterSpacing: "0.5px" }}>{kpi.label}</div>
//                         <div style={{ fontSize: "22px", fontWeight: "700", color: COLORS.text, marginBottom: "8px" }}>{kpi.value}</div>
//                         <div style={styles.progressBar}>
//                           <div style={{ height: "100%", width: `${kpi.score}%`, background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent}88)`, borderRadius: "3px", transition: "width 1s ease" }} />
//                         </div>
//                         <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "10px", color: COLORS.textMuted }}>
//                           <span>{kpi.trend === "up" ? "▲ Positive" : kpi.trend === "down" ? "▼ Negative" : "▶ Stable"}</span>
//                           <span>{kpi.score}/100</span>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}


//               {/* Insights */}
//               {insights.insights?.length > 0 && (
//                 <div>
//                   <span style={styles.label}>🔍 Business Insights</span>
//                   <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//                     {insights.insights.map((ins, i) => (
//                       <div key={i} className="insight-card" style={{
//                         ...styles.card,
//                         borderLeft: `3px solid ${ins.priority === "HIGH" ? COLORS.danger : ins.priority === "MEDIUM" ? COLORS.warning : COLORS.textMuted}`,
//                       }}>
//                         <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
//                           <span style={styles.tag(ins.priority === "HIGH" ? "blue" : "")}>{ins.priority}</span>
//                           <span style={styles.tag("green")}>{ins.category}</span>
//                           <span style={{ fontSize: "14px", fontWeight: "700", color: COLORS.text }}>{ins.title}</span>
//                         </div>
//                         <p style={{ fontSize: "13px", color: COLORS.textDim, lineHeight: "1.7", margin: 0 }}>{ins.body}</p>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}


//               {/* Recommendations */}
//               {insights.recommendations?.length > 0 && (
//                 <div style={styles.card}>
//                   <div style={styles.insightTitle}>✅ Strategic Recommendations</div>
//                   <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//                     {insights.recommendations.map((rec, i) => (
//                       <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", background: COLORS.bg, borderRadius: "8px", fontSize: "13px", color: COLORS.textDim, lineHeight: "1.5" }}>
//                         <span style={{ background: `linear-gradient(135deg, ${COLORS.accent}, #6366f1)`, color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0, marginTop: "1px" }}>
//                           {i + 1}
//                         </span>
//                         {rec}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
import { useState, useRef, useCallback } from "react";
import './DocumentIntelligence.css';

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
                  <span className="spinner"></span>
                  Generating PDF…
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
