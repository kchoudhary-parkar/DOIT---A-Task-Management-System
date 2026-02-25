// import React, { useState, useRef, useEffect } from 'react';
// import { MessageCircle, X, Send, Loader, Sparkles, TrendingUp, Calendar, CheckCircle, AlertCircle, Minimize2, BarChart3, PieChart } from 'lucide-react';

// const AIChatbot = ({ user }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [isMinimized, setIsMinimized] = useState(false);
//   const [messages, setMessages] = useState([
//     {
//       role: 'assistant',
//       content: `Hi ${user?.name || 'there'}! 👋 I'm your AI productivity assistant. Ask me anything about your tasks!`,
//       timestamp: new Date(),
//     }
//   ]);
//   const [input, setInput] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   const messagesEndRef = useRef(null);
//   const inputRef = useRef(null);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   useEffect(() => {
//     if (isOpen && !isMinimized && inputRef.current) {
//       inputRef.current.focus();
//     }
//   }, [isOpen, isMinimized]);

//   const quickPrompts = [
//     { icon: <TrendingUp size={12} />, text: "Summary", query: "Give me a summary of my tasks" },
//     { icon: <Calendar size={12} />, text: "Deadlines", query: "What are my upcoming deadlines?" },
//     { icon: <CheckCircle size={12} />, text: "Progress", query: "How is my progress?" },
//     { icon: <BarChart3 size={12} />, text: "Analytics", query: "Show me visual analytics" },
//   ];

//   const handleSend = async () => {
//     if (!input.trim() || isLoading) return;

//     const userMessage = {
//       role: 'user',
//       content: input.trim(),
//       timestamp: new Date(),
//     };

//     setMessages((prev) => [...prev, userMessage]);
//     setInput('');
//     setIsLoading(true);

//     try {
//       const tabKey = sessionStorage.getItem('tab_session_key');
//       const response = await fetch('http://localhost:8000/api/chat/ask', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${localStorage.getItem('token')}`,
//           'X-Tab-Session-Key': tabKey,
//         },
//         body: JSON.stringify({
//           message: input,
//           conversationHistory: messages.slice(-10),
//         }),
//       });

//       if (!response.ok) throw new Error('Failed to get AI response');

//       const data = await response.json();

//       setMessages((prev) => [
//         ...prev,
//         {
//           role: 'assistant',
//           content: data.response || "Here's what I found...",
//           timestamp: new Date(),
//           insights: data.insights || [],
//           data: data.data,
//           visualizations: detectVisualizationNeeds(input, data.data),
//         },
//       ]);
//     } catch (error) {
//       console.error('Chat error:', error);
//       setMessages((prev) => [
//         ...prev,
//         {
//           role: 'assistant',
//           content: 'Sorry, something went wrong. Please try again.',
//           isError: true,
//           timestamp: new Date(),
//         },
//       ]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const detectVisualizationNeeds = (query, userData) => {
//     const visualKeywords = ['show', 'visual', 'chart', 'graph', 'analytics', 'distribution', 'breakdown'];
//     const queryLower = query.toLowerCase();
    
//     const needsVisualization = visualKeywords.some(keyword => queryLower.includes(keyword));
    
//     if (!needsVisualization || !userData) return null;

//     return {
//       taskStatus: userData.stats?.tasks?.statusBreakdown,
//       taskPriority: userData.stats?.tasks?.priorityBreakdown,
//       completionTrend: {
//         week: userData.stats?.tasks?.completedWeek,
//         month: userData.stats?.tasks?.completedMonth,
//       },
//     };
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   const handleQuickPrompt = (query) => {
//     setInput(query);
//     setTimeout(() => handleSend(), 80);
//   };

//   // Compact Status Chart
//   const renderStatusChart = (statusData) => {
//     const total = Object.values(statusData).reduce((sum, val) => sum + val, 0);
//     const statuses = [
//       { key: 'To Do', color: '#94a3b8', value: statusData['To Do'] || 0 },
//       { key: 'In Progress', color: '#3b82f6', value: statusData['In Progress'] || 0 },
//       { key: 'Done', color: '#10b981', value: statusData['Done'] || 0 },
//       { key: 'Closed', color: '#8b5cf6', value: statusData['Closed'] || 0 },
//     ].filter(s => s.value > 0);

//     return (
//       <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
//         {statuses.map(status => {
//           const percentage = total > 0 ? (status.value / total) * 100 : 0;
//           return (
//             <div key={status.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
//               <div style={{ width: '65px', fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
//                 {status.key}
//               </div>
//               <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '18px', position: 'relative', overflow: 'hidden' }}>
//                 <div style={{
//                   width: `${percentage}%`,
//                   height: '100%',
//                   background: status.color,
//                   borderRadius: '6px',
//                   transition: 'width 0.5s ease',
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'flex-end',
//                   paddingRight: '6px',
//                 }}>
//                   <span style={{ fontSize: '9px', fontWeight: 700, color: 'white' }}>
//                     {status.value}
//                   </span>
//                 </div>
//               </div>
//               <div style={{ width: '32px', fontSize: '9px', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>
//                 {percentage.toFixed(0)}%
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     );
//   };

//   // Compact Priority Chart
//   const renderPriorityChart = (priorityData) => {
//     const total = Object.values(priorityData).reduce((sum, val) => sum + val, 0);
//     const priorities = [
//       { key: 'High', color: '#ef4444', emoji: '🔴', value: priorityData['High'] || 0 },
//       { key: 'Medium', color: '#f59e0b', emoji: '🟡', value: priorityData['Medium'] || 0 },
//       { key: 'Low', color: '#10b981', emoji: '🟢', value: priorityData['Low'] || 0 },
//     ].filter(p => p.value > 0);

//     return (
//       <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
//         {priorities.map(priority => {
//           const percentage = total > 0 ? (priority.value / total) * 100 : 0;
//           return (
//             <div key={priority.key} style={{
//               flex: '1 1 calc(33% - 4px)',
//               background: `${priority.color}10`,
//               border: `1.5px solid ${priority.color}`,
//               borderRadius: '8px',
//               padding: '8px 6px',
//               textAlign: 'center',
//               minWidth: '70px',
//             }}>
//               <div style={{ fontSize: '18px', marginBottom: '2px' }}>{priority.emoji}</div>
//               <div style={{ fontSize: '9px', fontWeight: 600, color: priority.color, marginBottom: '1px' }}>
//                 {priority.key}
//               </div>
//               <div style={{ fontSize: '16px', fontWeight: 700, color: priority.color, marginBottom: '1px' }}>
//                 {priority.value}
//               </div>
//               <div style={{ fontSize: '8px', fontWeight: 500, color: '#64748b' }}>
//                 {percentage.toFixed(0)}%
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     );
//   };

//   // Compact Completion Trend
//   const renderCompletionTrend = (trendData) => {
//     const maxValue = Math.max(trendData.week, trendData.month, 1);
    
//     return (
//       <div style={{ display: 'flex', gap: '8px' }}>
//         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
//           <div style={{ fontSize: '9px', fontWeight: 600, color: '#10b981' }}>This Week</div>
//           <div style={{
//             width: '100%',
//             height: '80px',
//             background: '#f0fdf4',
//             borderRadius: '6px',
//             border: '1.5px solid #10b981',
//             display: 'flex',
//             flexDirection: 'column',
//             justifyContent: 'flex-end',
//             padding: '4px',
//           }}>
//             <div style={{
//               height: `${(trendData.week / maxValue) * 100}%`,
//               background: 'linear-gradient(180deg, #10b981, #059669)',
//               borderRadius: '3px',
//               transition: 'height 0.5s ease',
//               display: 'flex',
//               alignItems: 'flex-end',
//               justifyContent: 'center',
//               paddingBottom: '2px',
//               minHeight: '20px',
//             }}>
//               <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
//                 {trendData.week}
//               </span>
//             </div>
//           </div>
//           <div style={{ fontSize: '8px', color: '#64748b' }}>tasks completed</div>
//         </div>

//         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
//           <div style={{ fontSize: '9px', fontWeight: 600, color: '#3b82f6' }}>This Month</div>
//           <div style={{
//             width: '100%',
//             height: '80px',
//             background: '#eff6ff',
//             borderRadius: '6px',
//             border: '1.5px solid #3b82f6',
//             display: 'flex',
//             flexDirection: 'column',
//             justifyContent: 'flex-end',
//             padding: '4px',
//           }}>
//             <div style={{
//               height: `${(trendData.month / maxValue) * 100}%`,
//               background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
//               borderRadius: '3px',
//               transition: 'height 0.5s ease',
//               display: 'flex',
//               alignItems: 'flex-end',
//               justifyContent: 'center',
//               paddingBottom: '2px',
//               minHeight: '20px',
//             }}>
//               <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
//                 {trendData.month}
//               </span>
//             </div>
//           </div>
//           <div style={{ fontSize: '8px', color: '#64748b' }}>tasks completed</div>
//         </div>
//       </div>
//     );
//   };

//   const renderVisualizations = (visualizations) => {
//     if (!visualizations) return null;

//     return (
//       <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
//         {visualizations.taskStatus && (
//           <div style={{
//             background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(139, 92, 246, 0.04))',
//             padding: '10px',
//             borderRadius: '8px',
//             border: '1px solid rgba(99, 102, 241, 0.15)',
//           }}>
//             <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 600, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
//               📊 Task Status
//             </h4>
//             {renderStatusChart(visualizations.taskStatus)}
//           </div>
//         )}

//         {visualizations.taskPriority && (
//           <div style={{
//             background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.04), rgba(251, 146, 60, 0.04))',
//             padding: '10px',
//             borderRadius: '8px',
//             border: '1px solid rgba(239, 68, 68, 0.15)',
//           }}>
//             <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
//               🎯 Priority
//             </h4>
//             {renderPriorityChart(visualizations.taskPriority)}
//           </div>
//         )}

//         {visualizations.completionTrend && (
//           <div style={{
//             background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(5, 150, 105, 0.04))',
//             padding: '10px',
//             borderRadius: '8px',
//             border: '1px solid rgba(16, 185, 129, 0.15)',
//           }}>
//             <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
//               📈 Completion
//             </h4>
//             {renderCompletionTrend(visualizations.completionTrend)}
//           </div>
//         )}
//       </div>
//     );
//   };

//   const renderInsights = (insights) => {
//     if (!insights || insights.length === 0) return null;

//     return (
//       <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
//         {insights.map((insight, idx) => (
//           <div
//             key={idx}
//             style={{
//               padding: '8px 10px',
//               borderRadius: '6px',
//               borderLeft: '2px solid',
//               background: getInsightBg(insight.type),
//               borderLeftColor: getInsightColor(insight.type),
//               fontSize: '11px',
//               color: getInsightTextColor(insight.type),
//             }}
//           >
//             <div style={{ fontWeight: 600, marginBottom: '2px', fontSize: '10px' }}>
//               {insight.icon} {insight.title}
//             </div>
//             <div style={{ opacity: 0.9, fontSize: '10px' }}>
//               {insight.description}
//             </div>
//           </div>
//         ))}
//       </div>
//     );
//   };

//   const getInsightColor = (type) => {
//     switch(type) {
//       case 'warning': return '#ef4444';
//       case 'success': return '#10b981';
//       case 'info': return '#3b82f6';
//       default: return '#8b5cf6';
//     }
//   };

//   const getInsightBg = (type) => {
//     switch(type) {
//       case 'warning': return '#fef2f2';
//       case 'success': return '#f0fdf4';
//       case 'info': return '#eff6ff';
//       default: return '#faf5ff';
//     }
//   };

//   const getInsightTextColor = (type) => {
//     switch(type) {
//       case 'warning': return '#991b1b';
//       case 'success': return '#065f46';
//       case 'info': return '#0c4a6e';
//       default: return '#4c1d95';
//     }
//   };

//   return (
//     <>
//       {/* Floating Button */}
//       <button
//         onClick={() => {
//           setIsOpen(!isOpen);
//           setIsMinimized(false);
//         }}
//         style={{
//           position: 'fixed',
//           bottom: '20px',
//           right: '20px',
//           width: '52px',
//           height: '52px',
//           borderRadius: '50%',
//           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//           border: 'none',
//           color: 'white',
//           display: 'flex',
//           alignItems: 'center',
//           justifyContent: 'center',
//           boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
//           cursor: 'pointer',
//           zIndex: 1000,
//           transition: 'all 0.3s ease',
//         }}
//         onMouseEnter={(e) => {
//           e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
//           e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
//         }}
//         onMouseLeave={(e) => {
//           e.currentTarget.style.transform = 'scale(1) translateY(0)';
//           e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
//         }}
//       >
//         {isOpen ? <X size={22} /> : <Sparkles size={22} />}
//       </button>

//       {/* Compact Chat Window */}
//       {isOpen && (
//         <div
//           style={{
//             position: 'fixed',
//             bottom: isMinimized ? '-420px' : '85px',
//             right: '20px',
//             width: '360px',
//             maxWidth: 'calc(100vw - 40px)',
//             height: '480px',
//             maxHeight: 'calc(100vh - 110px)',
//             display: 'flex',
//             flexDirection: 'column',
//             borderRadius: '14px',
//             overflow: 'hidden',
//             background: 'white',
//             border: '1px solid #e5e7eb',
//             boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
//             zIndex: 999,
//             transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
//           }}
//         >
//           {/* Compact Header */}
//           <div
//             style={{
//               background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//               padding: '10px 14px',
//               color: 'white',
//               display: 'flex',
//               alignItems: 'center',
//               gap: '10px',
//             }}
//           >
//             <div style={{
//               width: '32px',
//               height: '32px',
//               borderRadius: '50%',
//               background: 'rgba(255, 255, 255, 0.2)',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'center',
//             }}>
//               <Sparkles size={16} />
//             </div>
//             <div style={{ flex: 1 }}>
//               <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
//                 AI Assistant
//               </h3>
//               <p style={{ margin: 0, fontSize: '10px', opacity: 0.9 }}>
//                 DOIT AI
//               </p>
//             </div>
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setIsMinimized(!isMinimized);
//               }}
//               style={{
//                 background: 'rgba(255, 255, 255, 0.2)',
//                 border: 'none',
//                 borderRadius: '5px',
//                 width: '26px',
//                 height: '26px',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 cursor: 'pointer',
//                 color: 'white',
//               }}
//             >
//               <Minimize2 size={13} />
//             </button>
//             <button
//               onClick={() => setIsOpen(false)}
//               style={{
//                 background: 'rgba(255, 255, 255, 0.2)',
//                 border: 'none',
//                 borderRadius: '5px',
//                 width: '26px',
//                 height: '26px',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 cursor: 'pointer',
//                 color: 'white',
//               }}
//             >
//               <X size={13} />
//             </button>
//           </div>

//           {/* Messages */}
//           {!isMinimized && (
//             <>
//               <div
//                 style={{
//                   flex: 1,
//                   overflowY: 'auto',
//                   padding: '12px',
//                   display: 'flex',
//                   flexDirection: 'column',
//                   gap: '10px',
//                   background: '#f9fafb',
//                 }}
//               >
//                 {messages.map((msg, idx) => (
//                   <div
//                     key={idx}
//                     style={{
//                       display: 'flex',
//                       flexDirection: 'column',
//                       alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
//                     }}
//                   >
//                     <div
//                       style={{
//                         maxWidth: '85%',
//                         padding: '8px 11px',
//                         borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
//                         background: msg.role === 'user'
//                           ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
//                           : msg.isError
//                           ? '#fee2e2'
//                           : 'white',
//                         color: msg.role === 'user' ? 'white' : msg.isError ? '#dc2626' : '#1f2937',
//                         fontSize: '12px',
//                         lineHeight: '1.4',
//                         boxShadow: msg.role === 'assistant' && !msg.isError ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
//                         whiteSpace: 'pre-wrap',
//                         wordBreak: 'break-word',
//                       }}
//                     >
//                       {msg.content}
//                       {msg.insights && msg.insights.length > 0 && renderInsights(msg.insights)}
//                       {msg.visualizations && renderVisualizations(msg.visualizations)}
//                     </div>
//                     <span
//                       style={{
//                         fontSize: '9px',
//                         color: '#9ca3af',
//                         marginTop: '3px',
//                         marginLeft: msg.role === 'user' ? 0 : '4px',
//                         marginRight: msg.role === 'user' ? '4px' : 0,
//                       }}
//                     >
//                       {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                     </span>
//                   </div>
//                 ))}

//                 {isLoading && (
//                   <div style={{ 
//                     display: 'flex', 
//                     alignItems: 'center', 
//                     gap: '6px',
//                     padding: '8px 11px',
//                     background: 'white',
//                     borderRadius: '12px 12px 12px 2px',
//                     maxWidth: '100px',
//                     boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
//                   }}>
//                     <Loader size={12} style={{ animation: 'spin 1s linear infinite', color: '#667eea' }} />
//                     <span style={{ fontSize: '11px', color: '#667eea', fontWeight: 500 }}>
//                       Thinking...
//                     </span>
//                   </div>
//                 )}

//                 <div ref={messagesEndRef} />
//               </div>

//               {/* Compact Quick Prompts */}
//               {messages.length === 1 && !isLoading && (
//                 <div style={{
//                   padding: '8px 12px',
//                   borderTop: '1px solid #e5e7eb',
//                   background: 'white',
//                 }}>
//                   <p style={{ 
//                     fontSize: '9px', 
//                     color: '#6b7280', 
//                     margin: '0 0 6px 0',
//                     fontWeight: 600,
//                     textTransform: 'uppercase',
//                   }}>
//                     Quick Actions
//                   </p>
//                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
//                     {quickPrompts.map((prompt, idx) => (
//                       <button
//                         key={idx}
//                         onClick={() => handleQuickPrompt(prompt.query)}
//                         style={{
//                           padding: '6px 8px',
//                           borderRadius: '6px',
//                           border: '1px solid #e5e7eb',
//                           background: 'white',
//                           fontSize: '10px',
//                           cursor: 'pointer',
//                           display: 'flex',
//                           alignItems: 'center',
//                           gap: '5px',
//                           color: '#6b7280',
//                           transition: 'all 0.2s',
//                           fontWeight: 500,
//                         }}
//                         onMouseEnter={(e) => {
//                           e.currentTarget.style.background = '#f3f4f6';
//                           e.currentTarget.style.borderColor = '#667eea';
//                           e.currentTarget.style.color = '#667eea';
//                         }}
//                         onMouseLeave={(e) => {
//                           e.currentTarget.style.background = 'white';
//                           e.currentTarget.style.borderColor = '#e5e7eb';
//                           e.currentTarget.style.color = '#6b7280';
//                         }}
//                       >
//                         <div style={{ color: '#667eea', display: 'flex' }}>
//                           {prompt.icon}
//                         </div>
//                         {prompt.text}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Compact Input */}
//               <div
//                 style={{
//                   padding: '10px 12px',
//                   borderTop: '1px solid #e5e7eb',
//                   background: 'white',
//                   display: 'flex',
//                   gap: '6px',
//                   alignItems: 'center',
//                 }}
//               >
//                 <input
//                   ref={inputRef}
//                   type="text"
//                   value={input}
//                   onChange={(e) => setInput(e.target.value)}
//                   onKeyPress={handleKeyPress}
//                   placeholder="Ask about your tasks..."
//                   disabled={isLoading}
//                   style={{
//                     flex: 1,
//                     padding: '8px 11px',
//                     borderRadius: '8px',
//                     border: '1px solid #e5e7eb',
//                     fontSize: '12px',
//                     outline: 'none',
//                     background: '#f9fafb',
//                     color: '#1f2937',
//                   }}
//                   onFocus={(e) => {
//                     e.target.style.borderColor = '#667eea';
//                     e.target.style.background = 'white';
//                   }}
//                   onBlur={(e) => {
//                     e.target.style.borderColor = '#e5e7eb';
//                     e.target.style.background = '#f9fafb';
//                   }}
//                 />
//                 <button
//                   onClick={handleSend}
//                   disabled={!input.trim() || isLoading}
//                   style={{
//                     width: '36px',
//                     height: '36px',
//                     borderRadius: '8px',
//                     border: 'none',
//                     background: input.trim() && !isLoading
//                       ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
//                       : '#e5e7eb',
//                     color: 'white',
//                     cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     transition: 'all 0.2s',
//                   }}
//                 >
//                   <Send size={16} />
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       )}

//       <style>{`
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
//       `}</style>
//     </>
//   );
// };

// export default AIChatbot;
import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   DOIT-BOT  ·  Voice-Only AI Agent Interface
   Glass Sphere LED Robot → Click to activate → Speak → Agent replies in voice
   Connects to Azure AI Foundry Agent via /api/agent/* endpoints
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── LED dot-matrix definitions ──────────────────────────────────────────── */
const GAP = 10;  // grid spacing px
const OX  = 22;  // x-origin
const OY  = 52;  // y-origin
const DOT = 4.2; // dot radius

const EXPRESSIONS = {
  idle: {
    leftEye:  [[2,1],[3,0],[4,0],[5,0],[6,1]],
    rightEye: [[10,1],[11,0],[12,0],[13,0],[14,1]],
    mouth:    [[4,3],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,3]],
  },
  listening: {
    leftEye:  [[2,0],[3,0],[4,0],[5,0],[6,0]],
    rightEye: [[10,0],[11,0],[12,0],[13,0],[14,0]],
    mouth:    [[6,3],[7,3],[8,3],[9,3],[10,3]],
  },
  thinking: {
    leftEye:  [[2,0],[3,1],[4,0],[5,1],[6,0]],
    rightEye: [[10,0],[11,1],[12,0],[13,1],[14,0]],
    mouth:    [[5,3],[6,3],[7,3],[9,3],[10,3],[11,3]],
  },
  speaking: {
    leftEye:  [[2,1],[3,0],[4,0],[5,0],[6,1]],
    rightEye: [[10,1],[11,0],[12,0],[13,0],[14,1]],
    mouth:    [[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],
               [4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4]],
  },
  happy: {
    leftEye:  [[2,1],[3,0],[4,0],[5,0],[6,1]],
    rightEye: [[10,1],[11,0],[12,0],[13,0],[14,1]],
    mouth:    [[3,3],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,3]],
  },
  error: {
    leftEye:  [[2,0],[3,0],[4,1],[5,0],[6,0]],
    rightEye: [[10,0],[11,0],[12,1],[13,0],[14,0]],
    mouth:    [[4,4],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,4]],
  },
};

/* ─── SVG LED Face ────────────────────────────────────────────────────────── */
function LedFace({ expression = 'idle', glowColor = '#38bdf8' }) {
  const expr = EXPRESSIONS[expression] || EXPRESSIONS.idle;
  const dots = [...expr.leftEye, ...expr.rightEye, ...expr.mouth];
  return (
    <>
      {dots.map(([gx, gy], i) => (
        <circle
          key={i}
          cx={OX + gx * GAP}
          cy={OY + gy * GAP}
          r={DOT}
          fill={glowColor}
          style={{
            filter: `drop-shadow(0 0 5px ${glowColor}) drop-shadow(0 0 10px ${glowColor}88)`,
            transition: 'all 0.12s ease',
          }}
        />
      ))}
    </>
  );
}

/* ─── Glass Sphere Robot SVG ─────────────────────────────────────────────── */
function RobotSphere({ expression, size = 80, glowColor = '#38bdf8', pulsing = false }) {
  const uid = `rs_${size}`;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 180 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'block',
        filter: pulsing
          ? `drop-shadow(0 0 18px ${glowColor}) drop-shadow(0 8px 24px ${glowColor}66)`
          : `drop-shadow(0 8px 24px ${glowColor}44) drop-shadow(0 2px 8px rgba(0,0,0,0.5))`,
        transition: 'filter 0.35s ease',
      }}
    >
      <defs>
        <linearGradient id={`chrome_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#9ca3af" />
          <stop offset="30%"  stopColor="#e5e7eb" />
          <stop offset="60%"  stopColor="#6b7280" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
        <radialGradient id={`sphere_${uid}`} cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#1e293b" stopOpacity="0.7" />
          <stop offset="60%"  stopColor="#0f172a" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <radialGradient id={`sheen_${uid}`} cx="30%" cy="22%" r="50%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`glow_${uid}`} cx="50%" cy="90%" r="50%">
          <stop offset="0%"   stopColor={glowColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`cap_${uid}`} cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor={glowColor} />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id={`ear_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>

      {/* Antenna */}
      <line x1="108" y1="8" x2="120" y2="30" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="120" cy="28" r="5" fill={`url(#cap_${uid})`}
        style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }} />

      {/* Chrome ring */}
      <circle cx="90" cy="98" r="76" fill={`url(#chrome_${uid})`} />

      {/* Dark face plate */}
      <circle cx="90" cy="98" r="68" fill={`url(#sphere_${uid})`} />

      {/* LED face */}
      <LedFace expression={expression} glowColor={glowColor} />

      {/* Glass sheen highlight */}
      <ellipse cx="72" cy="72" rx="46" ry="36" fill={`url(#sheen_${uid})`} />

      {/* Bottom colour glow */}
      <circle cx="90" cy="98" r="68" fill={`url(#glow_${uid})`} />

      {/* Left ear */}
      <ellipse cx="16"  cy="98" rx="10" ry="14" fill={`url(#ear_${uid})`} stroke="#4b5563" strokeWidth="1"/>
      <ellipse cx="16"  cy="98" rx="5"  ry="8"  fill={glowColor} opacity="0.25" />

      {/* Right ear */}
      <ellipse cx="164" cy="98" rx="10" ry="14" fill={`url(#ear_${uid})`} stroke="#4b5563" strokeWidth="1"/>
      <ellipse cx="164" cy="98" rx="5"  ry="8"  fill={glowColor} opacity="0.25" />

      {/* Bow tie */}
      <polygon points="74,170 88,163 88,177" fill="#1e293b" stroke="#374151" strokeWidth="1"/>
      <polygon points="106,170 92,163 92,177" fill="#1e293b" stroke="#374151" strokeWidth="1"/>
      <ellipse cx="90" cy="170" rx="6" ry="5" fill="#374151" stroke="#4b5563" strokeWidth="1"/>
    </svg>
  );
}

/* ─── Expanding voice rings ──────────────────────────────────────────────── */
function VoiceRings({ active, color }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: `${90 + i * 38}px`, height: `${90 + i * 38}px`,
          borderRadius: '50%',
          border: `1.5px solid ${color}`,
          opacity: 0,
          animation: `ringExpand 2.2s ease-out ${i * 0.55}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─── Equalizer bars ─────────────────────────────────────────────────────── */
function EqualizerBars({ active, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '3px', height: '36px',
      opacity: active ? 1 : 0.12,
      transition: 'opacity 0.4s ease',
    }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          width: '3px', borderRadius: '2px',
          background: color,
          boxShadow: active ? `0 0 6px ${color}88` : 'none',
          height: '6px',
          animation: active ? `eqBar 0.${4 + (i % 5)}s ease-in-out ${i * 0.04}s infinite alternate` : 'none',
        }} />
      ))}
    </div>
  );
}

/* ─── Mic waveform (user speaking) ──────────────────────────────────────── */
function MicWave({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '30px' }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} style={{
          width: '3px', borderRadius: '2px',
          background: '#f43f5e',
          boxShadow: active ? '0 0 6px #f43f5e88' : 'none',
          height: active ? `${6 + (i % 5) * 5}px` : '5px',
          animation: active ? `eqBar 0.${3 + (i % 4)}s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
          opacity: active ? 1 : 0.18,
          transition: 'all 0.2s',
        }} />
      ))}
    </div>
  );
}

/* ─── Status pill ────────────────────────────────────────────────────────── */
function StatusPill({ label, color, pulse }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '7px',
      padding: '5px 16px', borderRadius: '100px',
      background: `${color}12`, border: `1px solid ${color}35`,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px', fontWeight: 600, color, letterSpacing: '0.07em',
    }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: color, boxShadow: `0 0 8px ${color}`,
        animation: pulse ? 'dotPulse 1s ease-in-out infinite' : 'none',
      }} />
      {label}
    </div>
  );
}

/* ─── Transcript bubble ──────────────────────────────────────────────────── */
function TranscriptBubble({ text, role }) {
  if (!text) return null;
  const isUser = role === 'user';
  return (
    <div style={{
      padding: '9px 13px',
      borderRadius: isUser ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
      background: isUser ? 'rgba(244,63,94,0.1)' : 'rgba(56,189,248,0.07)',
      border: `1px solid ${isUser ? 'rgba(244,63,94,0.22)' : 'rgba(56,189,248,0.18)'}`,
      color: isUser ? '#fda4af' : '#bae6fd',
      fontSize: '12.5px', lineHeight: '1.6',
      fontFamily: "'Syne', sans-serif",
      wordBreak: 'break-word',
      animation: 'fadeSlideIn 0.25s ease',
    }}>
      <span style={{ fontSize: '9px', opacity: 0.5, display: 'block', marginBottom: '3px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
        {isUser ? '👤 YOU' : '🤖 DOIT-AI'}
      </span>
      {text}
    </div>
  );
}

/* ─── Conversation scroll log ────────────────────────────────────────────── */
function ConversationLog({ turns }) {
  const logRef = useRef(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);
  if (!turns.length) return null;
  return (
    <div ref={logRef} style={{
      width: '100%', maxHeight: '150px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '0 1px',
      scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent',
    }}>
      {turns.slice(-5).map((t, i) => (
        <TranscriptBubble key={i} text={t.text} role={t.role} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const AIChatbot = ({ user }) => {
  const [isOpen,      setIsOpen]      = useState(false);
  const [mode,        setMode]        = useState('idle');
  // mode: 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
  const [expression,  setExpression]  = useState('idle');
  const [statusLabel, setStatusLabel] = useState('Tap mic to speak');
  const [transcript,  setTranscript]  = useState('');
  const [botText,     setBotText]     = useState('');
  const [turns,       setTurns]       = useState([]);
  const [convId,      setConvId]      = useState(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [hasUnread,   setHasUnread]   = useState(false);

  const sttRef       = useRef(null);
  const exprTimer    = useRef(null);
  const listeningRef = useRef(false);

  /* ── Color per mode ──────────────────────────────────────────────── */
  const modeColor = {
    idle:       '#38bdf8',
    listening:  '#f43f5e',
    processing: '#f59e0b',
    speaking:   '#10b981',
    error:      '#ef4444',
  }[mode] || '#38bdf8';

  /* ── Expression helper ──────────────────────────────────────────── */
  const setExpr = useCallback((expr, ttl) => {
    clearTimeout(exprTimer.current);
    setExpression(expr);
    if (ttl) exprTimer.current = setTimeout(() => setExpression('idle'), ttl);
  }, []);

  /* ── Ensure a Foundry conversation exists ───────────────────────── */
  const ensureConversation = useCallback(async () => {
    if (convId) return convId;
    try {
      const res = await fetch('http://localhost:8000/api/agent/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title: `Voice Session — ${new Date().toLocaleTimeString()}` }),
      });
      const data = await res.json();
      const id = data.conversation?._id;
      if (id) { setConvId(id); return id; }
    } catch (e) { console.error('Failed to create conversation:', e); }
    return null;
  }, [convId]);

  /* ── TTS: speak the agent reply ─────────────────────────────────── */
  const speakReply = useCallback((text) => {
    window.speechSynthesis?.cancel();
    setMode('speaking');
    setExpr('speaking');
    setStatusLabel('Speaking…');
    setBotText(text);

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = 0.94;
    utter.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Samantha') || v.name.includes('Google') ||
       v.name.includes('Neural') || v.name.includes('Natural') || v.name.includes('Zira'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    utter.onend = () => {
      setMode('idle');
      setExpr('happy', 2500);
      setStatusLabel('Tap mic to speak');
      setBotText('');
      if (!isOpen) setHasUnread(true);
    };
    utter.onerror = () => {
      setMode('idle');
      setExpr('idle');
      setStatusLabel('Tap mic to speak');
      setBotText('');
    };

    window.speechSynthesis.speak(utter);
  }, [isOpen, setExpr]);

  /* ── Send transcript → Azure Foundry Agent ──────────────────────── */
  const sendToAgent = useCallback(async (text) => {
    setMode('processing');
    setExpr('thinking');
    setStatusLabel('Thinking…');

    try {
      const id = await ensureConversation();
      if (!id) throw new Error('Could not create session');

      const tabKey = sessionStorage.getItem('tab_session_key');
      const res = await fetch(`http://localhost:8000/api/agent/conversations/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'X-Tab-Session-Key': tabKey || '',
        },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) throw new Error(`Agent returned ${res.status}`);
      const data = await res.json();
      const reply = data.message?.content || 'I encountered an issue. Please try again.';

      setTurns(prev => [...prev, { role: 'bot', text: reply }]);
      speakReply(reply);
    } catch (err) {
      console.error('[DOIT-AI] Agent error:', err);
      setErrorMsg(err.message || 'Agent unreachable');
      setMode('error');
      setExpr('error', 3500);
      setStatusLabel('Error — tap to retry');
      setTimeout(() => {
        setMode('idle');
        setStatusLabel('Tap mic to speak');
        setErrorMsg('');
      }, 4500);
    }
  }, [ensureConversation, speakReply, setExpr]);

  /* ── STT: start recognition ─────────────────────────────────────── */
  const startListening = useCallback(() => {
    if (mode === 'listening' || mode === 'processing') return;

    // Stop any ongoing speech
    if (mode === 'speaking') window.speechSynthesis?.cancel();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Speech recognition requires Chrome or Edge browser.');
      setMode('error');
      setExpr('error', 4000);
      setStatusLabel('Browser not supported');
      setTimeout(() => { setMode('idle'); setStatusLabel('Tap mic to speak'); }, 4500);
      return;
    }

    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;
    sttRef.current = rec;
    listeningRef.current = true;

    let finalText = '';

    rec.onstart = () => {
      setMode('listening');
      setExpr('listening');
      setStatusLabel('Listening… speak now');
      setTranscript('');
      finalText = '';
    };

    rec.onresult = (e) => {
      let interim = '';
      for (const r of e.results) {
        if (r.isFinal) finalText += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      setTranscript(finalText || interim);
    };

    rec.onend = () => {
      listeningRef.current = false;
      const cleaned = finalText.trim();
      setTranscript('');
      if (cleaned) {
        setTurns(prev => [...prev, { role: 'user', text: cleaned }]);
        sendToAgent(cleaned);
      } else {
        setMode('idle');
        setExpr('idle');
        setStatusLabel('No speech detected — tap to retry');
        setTimeout(() => setStatusLabel('Tap mic to speak'), 2500);
      }
    };

    rec.onerror = (e) => {
      listeningRef.current = false;
      if (e.error === 'no-speech') {
        setMode('idle');
        setExpr('idle');
        setStatusLabel('No speech — tap to retry');
        setTimeout(() => setStatusLabel('Tap mic to speak'), 2500);
        return;
      }
      if (e.error === 'aborted') return; // user stopped
      setMode('error');
      setExpr('error', 3000);
      setStatusLabel(`Mic: ${e.error}`);
      setTimeout(() => { setMode('idle'); setStatusLabel('Tap mic to speak'); }, 3500);
    };

    rec.start();
  }, [mode, sendToAgent, setExpr]);

  /* ── Stop listening ──────────────────────────────────────────────── */
  const stopListening = useCallback(() => {
    if (sttRef.current && listeningRef.current) sttRef.current.stop();
  }, []);

  /* ── Stop everything ─────────────────────────────────────────────── */
  const stopAll = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (sttRef.current) { try { sttRef.current.abort(); } catch(e){} sttRef.current = null; }
    listeningRef.current = false;
    clearTimeout(exprTimer.current);
    setMode('idle');
    setExpression('idle');
    setStatusLabel('Tap mic to speak');
    setTranscript('');
    setBotText('');
  }, []);

  /* ── Toggle popup ────────────────────────────────────────────────── */
  const toggleOpen = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        setHasUnread(false);
        setExpr('happy', 1800);
        setStatusLabel('Tap mic to speak');
      } else {
        stopAll();
      }
      return next;
    });
  }, [stopAll, setExpr]);

  /* ── Mic button handler ──────────────────────────────────────────── */
  const handleMicPress = () => {
    if (mode === 'listening')  { stopListening(); return; }
    if (mode === 'speaking')   { stopAll(); return; }
    if (mode === 'processing') return;
    startListening();
  };

  /* ── Cleanup ─────────────────────────────────────────────────────── */
  useEffect(() => () => stopAll(), []);

  /* ── Mic button appearance per mode ─────────────────────────────── */
  const MicIconSVG = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
  const StopIconSVG = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="3"/>
    </svg>
  );
  const SpinnerSVG = () => (
    <div style={{ width: '22px', height: '22px', border: '2px solid transparent', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  );

  const micCfg = {
    idle:       { icon: <MicIconSVG  />, label: 'SPEAK',    color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.3)' },
    listening:  { icon: <StopIconSVG />, label: 'STOP',     color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.35)' },
    processing: { icon: <SpinnerSVG  />, label: 'WAIT',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    speaking:   { icon: <StopIconSVG />, label: 'STOP',     color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)' },
    error:      { icon: <MicIconSVG  />, label: 'RETRY',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
  }[mode];

  /* ─────────────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Global keyframes + font ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        @keyframes robotFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes ringExpand {
          0%   { transform: scale(0.45); opacity: 0.8; }
          100% { transform: scale(1.7);  opacity: 0; }
        }
        @keyframes eqBar {
          0%   { height: 5px; }
          100% { height: 30px; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 10px currentColor; }
          50%       { opacity: 0.4; box-shadow: 0 0 3px  currentColor; }
        }
        @keyframes ping {
          0%   { transform: scale(1);   opacity: 0.9; }
          80%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(18px) scale(0.93); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes processPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.96); }
          50%       { opacity: 1;   transform: scale(1.04); }
        }

        .doit-log-scroll::-webkit-scrollbar { width: 3px; }
        .doit-log-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

        .doit-mic-btn {
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease !important;
        }
        .doit-mic-btn:hover:not(:disabled) {
          transform: scale(1.07) !important;
          filter: brightness(1.18) !important;
        }
        .doit-mic-btn:active:not(:disabled) {
          transform: scale(0.95) !important;
        }

        .doit-float-btn:hover { filter: brightness(1.1); }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          FLOATING ROBOT ICON
      ══════════════════════════════════════════════════════════════ */}
      <button
        className="doit-float-btn"
        onClick={toggleOpen}
        title="DOIT-AI Voice Assistant"
        aria-label="Open DOIT AI Voice Assistant"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '84px', height: '84px',
          borderRadius: '50%', border: 'none',
          background: 'transparent', cursor: 'pointer',
          padding: 0, zIndex: 1001, outline: 'none',
          animation: 'robotFloat 3.8s ease-in-out infinite',
          transition: 'filter 0.2s ease',
        }}
      >
        <RobotSphere
          expression={isOpen ? 'happy' : expression}
          size={84}
          glowColor={modeColor}
          pulsing={mode === 'listening' || mode === 'speaking'}
        />
        {hasUnread && !isOpen && (
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '13px', height: '13px',
            background: '#f43f5e', borderRadius: '50%',
            border: '2px solid #0c0f1a',
            animation: 'ping 1.3s ease infinite',
          }} />
        )}
      </button>

      {/* ══════════════════════════════════════════════════════════════
          VOICE POPUP
      ══════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '120px', right: '20px',
          width: '340px',
          maxWidth: 'calc(100vw - 40px)',
          borderRadius: '24px',
          overflow: 'hidden',
          background: 'linear-gradient(165deg, #08101f 0%, #0d1529 40%, #111e38 100%)',
          border: '1px solid rgba(56,189,248,0.15)',
          boxShadow: `
            0 40px 90px rgba(0,0,0,0.75),
            0 0 0 1px rgba(255,255,255,0.04),
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 0 80px ${modeColor}0a
          `,
          zIndex: 1000,
          animation: 'popupIn 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          fontFamily: "'Syne', sans-serif",
          transition: 'box-shadow 0.5s ease',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.045)',
            background: 'rgba(0,0,0,0.2)',
          }}>
            <RobotSphere expression={expression} size={38} glowColor={modeColor} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                DOIT-AI
              </div>
              <div style={{ fontSize: '9.5px', color: '#334155', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginTop: '1px' }}>
                AZURE FOUNDRY · VOICE AGENT
              </div>
            </div>
            {/* Close */}
            <button
              onClick={toggleOpen}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '9px', width: '30px', height: '30px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#475569', fontSize: '15px',
                transition: 'all 0.15s', outline: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#94a3b8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#475569'; }}
            >✕</button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '22px 18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>

            {/* ── Large Robot with rings ── */}
            <div style={{ position: 'relative', width: '158px', height: '158px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VoiceRings active={mode === 'listening'} color="#f43f5e" />
              <VoiceRings active={mode === 'speaking'}  color="#10b981" />
              <RobotSphere
                expression={expression}
                size={148}
                glowColor={modeColor}
                pulsing={mode === 'listening' || mode === 'processing' || mode === 'speaking'}
              />
              {/* Processing spinner */}
              {mode === 'processing' && (
                <div style={{
                  position: 'absolute', inset: '4px', borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: '#f59e0b',
                  borderRightColor: '#f59e0b33',
                  animation: 'spin 1.1s linear infinite',
                  pointerEvents: 'none',
                }} />
              )}
            </div>

            {/* ── Status pill ── */}
            <StatusPill
              label={statusLabel}
              color={modeColor}
              pulse={mode !== 'idle'}
            />

            {/* ── Bot speaking equalizer ── */}
            <EqualizerBars active={mode === 'speaking'} color="#10b981" />

            {/* ── Mic waveform + live transcript (listening) ── */}
            {mode === 'listening' && (
              <div style={{ width: '100%', animation: 'fadeSlideIn 0.2s ease' }}>
                <MicWave active />
                {transcript && (
                  <div style={{
                    marginTop: '10px', padding: '8px 12px', borderRadius: '10px',
                    background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.18)',
                    color: '#fda4af', fontSize: '12px', fontStyle: 'italic', lineHeight: '1.55',
                  }}>
                    {transcript}
                  </div>
                )}
              </div>
            )}

            {/* ── Bot text while speaking ── */}
            {mode === 'speaking' && botText && (
              <div style={{
                width: '100%', padding: '10px 14px', borderRadius: '12px',
                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)',
                color: '#6ee7b7', fontSize: '12.5px', lineHeight: '1.65',
                maxHeight: '82px', overflowY: 'auto',
                animation: 'fadeSlideIn 0.3s ease',
              }}>
                {botText}
              </div>
            )}

            {/* ── Error ── */}
            {mode === 'error' && errorMsg && (
              <div style={{
                width: '100%', padding: '8px 12px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)',
                color: '#fca5a5', fontSize: '12px',
                animation: 'fadeSlideIn 0.2s ease',
              }}>
                ⚠ {errorMsg}
              </div>
            )}

            {/* ── Conversation log (idle with history) ── */}
            {turns.length > 0 && mode === 'idle' && (
              <div className="doit-log-scroll" style={{ width: '100%', animation: 'fadeSlideIn 0.3s ease' }}>
                <div style={{
                  fontSize: '9px', fontFamily: "'JetBrains Mono', monospace",
                  color: '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase',
                  marginBottom: '8px',
                }}>
                  Conversation
                </div>
                <ConversationLog turns={turns} />
              </div>
            )}

            {/* ── BIG MIC BUTTON ── */}
            <button
              className="doit-mic-btn"
              onClick={handleMicPress}
              disabled={mode === 'processing'}
              aria-label={micCfg.label}
              style={{
                width: '76px', height: '76px', borderRadius: '50%',
                border: `2px solid ${micCfg.border}`,
                background: micCfg.bg, color: micCfg.color,
                cursor: mode === 'processing' ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '4px',
                boxShadow: `0 0 28px ${micCfg.color}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
                outline: 'none',
                animation: mode === 'listening' ? 'dotPulse 1.2s ease infinite' : 'none',
              }}
            >
              {micCfg.icon}
              <span style={{
                fontSize: '8.5px', fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700, letterSpacing: '0.1em',
              }}>
                {micCfg.label}
              </span>
            </button>

            {/* ── Reset conversation ── */}
            {turns.length > 0 && (
              <button
                onClick={() => { stopAll(); setTurns([]); setConvId(null); setErrorMsg(''); }}
                style={{
                  background: 'none', border: 'none',
                  color: '#1e3a5f', fontSize: '10.5px',
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer', letterSpacing: '0.04em',
                  padding: '3px 8px', borderRadius: '6px',
                  transition: 'color 0.15s', outline: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                onMouseLeave={e => e.currentTarget.style.color = '#1e3a5f'}
              >
                ↺ New conversation
              </button>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '7px 16px 10px',
            borderTop: '1px solid rgba(255,255,255,0.035)',
            textAlign: 'center',
            fontSize: '9px', fontFamily: "'JetBrains Mono', monospace",
            color: '#0f2035', letterSpacing: '0.07em',
          }}>
            DOIT-AI · Azure AI Foundry · Voice Only Interface
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;