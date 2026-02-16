
// import React, { useState, useEffect, useRef, useContext } from 'react';
// import { 
//   Plus, Trash2, Send, Image, Paperclip, Bot, User, 
//   AlertCircle, CheckCircle2, Info, AlertTriangle,
//   Clock, TrendingUp, Users, Target
// } from 'lucide-react';
// import { AuthContext } from '../../context/AuthContext';
// import './AIAssistantPage.css';

// const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// // Get or generate tab session key for security
// const getTabSessionKey = () => {
//   let key = sessionStorage.getItem("tab_session_key");
//   if (!key) {
//     key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
//     sessionStorage.setItem("tab_session_key", key);
//   }
//   return key;
// };

// // Get auth headers with tab session key
// const getAuthHeaders = () => {
//   const token = localStorage.getItem('token');
//   return {
//     'Authorization': `Bearer ${token}`,
//     'X-Tab-Session-Key': getTabSessionKey(),
//     'Content-Type': 'application/json'
//   };
// };

// // Message formatter component for rich text rendering
// // FormattedMessage component for rich text rendering with command results
// const FormattedMessage = ({ content, insights, userDataSummary, commandResult }) => {
//   // Parse markdown-like formatting
//   const formatText = (text) => {
//     if (!text) return null;

//     // Split by code blocks first
//     const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
    
//     return parts.map((part, index) => {
//       // Code block
//       if (part.startsWith('```')) {
//         const code = part.replace(/```(\w*)\n?/g, '').replace(/```$/g, '');
//         return (
//           <pre key={index}>
//             <code>{code}</code>
//           </pre>
//         );
//       }
      
//       // Inline code
//       if (part.startsWith('`') && part.endsWith('`')) {
//         return <code key={index}>{part.slice(1, -1)}</code>;
//       }

//       // Regular text with formatting
//       let formatted = part;
      
//       // Bold
//       formatted = formatted.split(/(\*\*[^*]+\*\*)/g).map((segment, i) => {
//         if (segment.startsWith('**') && segment.endsWith('**')) {
//           return <strong key={`bold-${i}`}>{segment.slice(2, -2)}</strong>;
//         }
//         return segment;
//       });

//       return <span key={index}>{formatted}</span>;
//     });
//   };

//   // Parse lists and structure
//   const parseContent = (text) => {
//     const lines = text.split('\n');
//     const elements = [];
//     let currentList = [];
//     let listType = null;

//     lines.forEach((line, index) => {
//       // Headers
//       if (line.startsWith('## ')) {
//         if (currentList.length > 0) {
//           elements.push(
//             listType === 'ul' ? (
//               <ul key={`list-${index}`}>{currentList}</ul>
//             ) : (
//               <ol key={`list-${index}`}>{currentList}</ol>
//             )
//           );
//           currentList = [];
//           listType = null;
//         }
//         elements.push(<h2 key={index}>{formatText(line.replace('## ', ''))}</h2>);
//       } 
//       else if (line.startsWith('### ')) {
//         if (currentList.length > 0) {
//           elements.push(
//             listType === 'ul' ? (
//               <ul key={`list-${index}`}>{currentList}</ul>
//             ) : (
//               <ol key={`list-${index}`}>{currentList}</ol>
//             )
//           );
//           currentList = [];
//           listType = null;
//         }
//         elements.push(<h3 key={index}>{formatText(line.replace('### ', ''))}</h3>);
//       }
//       // Bullet points
//       else if (line.match(/^[-*]\s/)) {
//         if (listType !== 'ul' && currentList.length > 0) {
//           elements.push(<ol key={`list-${index}`}>{currentList}</ol>);
//           currentList = [];
//         }
//         listType = 'ul';
//         currentList.push(<li key={index}>{formatText(line.replace(/^[-*]\s/, ''))}</li>);
//       }
//       // Numbered lists
//       else if (line.match(/^\d+\.\s/)) {
//         if (listType !== 'ol' && currentList.length > 0) {
//           elements.push(<ul key={`list-${index}`}>{currentList}</ul>);
//           currentList = [];
//         }
//         listType = 'ol';
//         currentList.push(<li key={index}>{formatText(line.replace(/^\d+\.\s/, ''))}</li>);
//       }
//       // Horizontal rule
//       else if (line.trim() === '---') {
//         if (currentList.length > 0) {
//           elements.push(
//             listType === 'ul' ? (
//               <ul key={`list-${index}`}>{currentList}</ul>
//             ) : (
//               <ol key={`list-${index}`}>{currentList}</ol>
//             )
//           );
//           currentList = [];
//           listType = null;
//         }
//         elements.push(<hr key={index} />);
//       }
//       // Regular paragraph
//       else if (line.trim()) {
//         if (currentList.length > 0) {
//           elements.push(
//             listType === 'ul' ? (
//               <ul key={`list-${index}`}>{currentList}</ul>
//             ) : (
//               <ol key={`list-${index}`}>{currentList}</ol>
//             )
//           );
//           currentList = [];
//           listType = null;
//         }
//         elements.push(<p key={index}>{formatText(line)}</p>);
//       }
//     });

//     // Add remaining list items
//     if (currentList.length > 0) {
//       elements.push(
//         listType === 'ul' ? (
//           <ul key="final-list">{currentList}</ul>
//         ) : (
//           <ol key="final-list">{currentList}</ol>
//         )
//       );
//     }

//     return elements;
//   };

//   return (
//     <div>
//       {/* Command Execution Result - Show at top */}
//       {commandResult && (
//         <div className="ai-command-result">
//           <div className={`ai-command-badge ${commandResult.success ? 'success' : 'error'}`}>
//             {commandResult.success ? (
//               <>
//                 <CheckCircle2 size={14} />
//                 Command Executed
//               </>
//             ) : (
//               <>
//                 <AlertCircle size={14} />
//                 Command Failed
//               </>
//             )}
//           </div>
          
//           {/* Show Tasks if present */}
//           {commandResult.tasks && commandResult.tasks.length > 0 && (
//             <div className="ai-command-tasks">
//               <h4>
//                 <Target size={16} />
//                 Tasks ({commandResult.count})
//               </h4>
//               <ul>
//                 {commandResult.tasks.map((task, idx) => (
//                   <li key={idx}>
//                     <span className="task-ticket">[{task.ticket_id}]</span>
//                     <span className="task-title">{task.title}</span>
//                     <span className="task-status">{task.status}</span>
//                     <span className={`task-priority priority-${task.priority.toLowerCase()}`}>
//                       {task.priority}
//                     </span>
//                     {task.assignee && task.assignee !== 'Unassigned' && (
//                       <span className="task-assignee">
//                         <User size={12} />
//                         {task.assignee}
//                       </span>
//                     )}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}

//           {/* Show Projects if present */}
//           {commandResult.projects && commandResult.projects.length > 0 && (
//             <div className="ai-command-projects">
//               <h4>
//                 <Target size={16} />
//                 Projects ({commandResult.count})
//               </h4>
//               <ul>
//                 {commandResult.projects.map((project, idx) => (
//                   <li key={idx}>
//                     <span className="project-name">{project.name}</span>
//                     <span className="project-role">{project.role}</span>
//                     {project.description && (
//                       <span className="project-description">{project.description}</span>
//                     )}
//                   </li>
//                 ))}
//               </ul>
//             </div>
//           )}

//           {/* Show detailed result if present */}
//           {commandResult.result && (
//             <div className="ai-command-details">
//               <details>
//                 <summary>View Full Result</summary>
//                 <pre>
//                   <code>{JSON.stringify(commandResult.result, null, 2)}</code>
//                 </pre>
//               </details>
//             </div>
//           )}
//         </div>
//       )}

//       {/* User Data Summary Cards */}
//       {userDataSummary && (
//         <div className="ai-data-summary">
//           <div className="ai-data-card">
//             <div className="ai-data-value">{userDataSummary.tasks_total}</div>
//             <div className="ai-data-label">Total Tasks</div>
//           </div>
//           <div className="ai-data-card">
//             <div className="ai-data-value" style={{ color: userDataSummary.tasks_overdue > 0 ? '#f44336' : '#4caf50' }}>
//               {userDataSummary.tasks_overdue}
//             </div>
//             <div className="ai-data-label">Overdue</div>
//           </div>
//           <div className="ai-data-card">
//             <div className="ai-data-value">{userDataSummary.projects_total}</div>
//             <div className="ai-data-label">Projects</div>
//           </div>
//           <div className="ai-data-card">
//             <div className="ai-data-value">{userDataSummary.velocity}</div>
//             <div className="ai-data-label">Tasks/Week</div>
//           </div>
//         </div>
//       )}

//       {/* Insights Cards */}
//       {insights && insights.length > 0 && (
//         <div className="ai-insights-container">
//           {insights.slice(0, 3).map((insight, idx) => (
//             <div key={idx} className={`ai-insight-card ${insight.type}`}>
//               <div className="ai-insight-icon">
//                 {insight.type === 'warning' && <AlertTriangle size={16} />}
//                 {insight.type === 'success' && <CheckCircle2 size={16} />}
//                 {insight.type === 'info' && <Info size={16} />}
//                 {insight.type === 'critical' && <AlertCircle size={16} />}
//               </div>
//               <div className="ai-insight-content">
//                 <div className="ai-insight-title">{insight.title}</div>
//                 <div className="ai-insight-description">{insight.description}</div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Main content */}
//       <div>{parseContent(content)}</div>
//     </div>
//   );
// };

//   // Parse lists and structure
//   const lines = content.split('\n');
//   const elements = [];
//   let currentList = [];
//   let listType = null;

//   lines.forEach((line, index) => {
//     // Headers
//     if (line.startsWith('## ')) {
//       if (currentList.length > 0) {
//         elements.push(
//           listType === 'ul' ? (
//             <ul key={`list-${index}`}>{currentList}</ul>
//           ) : (
//             <ol key={`list-${index}`}>{currentList}</ol>
//           )
//         );
//         currentList = [];
//         listType = null;
//       }
//       elements.push(<h2 key={index}>{formatText(line.replace('## ', ''))}</h2>);
//     } 
//     else if (line.startsWith('### ')) {
//       if (currentList.length > 0) {
//         elements.push(
//           listType === 'ul' ? (
//             <ul key={`list-${index}`}>{currentList}</ul>
//           ) : (
//             <ol key={`list-${index}`}>{currentList}</ol>
//           )
//         );
//         currentList = [];
//         listType = null;
//       }
//       elements.push(<h3 key={index}>{formatText(line.replace('### ', ''))}</h3>);
//     }
//     // Bullet points
//     else if (line.match(/^[-*]\s/)) {
//       if (listType !== 'ul' && currentList.length > 0) {
//         elements.push(<ol key={`list-${index}`}>{currentList}</ol>);
//         currentList = [];
//       }
//       listType = 'ul';
//       currentList.push(<li key={index}>{formatText(line.replace(/^[-*]\s/, ''))}</li>);
//     }
//     // Numbered lists
//     else if (line.match(/^\d+\.\s/)) {
//       if (listType !== 'ol' && currentList.length > 0) {
//         elements.push(<ul key={`list-${index}`}>{currentList}</ul>);
//         currentList = [];
//       }
//       listType = 'ol';
//       currentList.push(<li key={index}>{formatText(line.replace(/^\d+\.\s/, ''))}</li>);
//     }
//     // Horizontal rule
//     else if (line.trim() === '---') {
//       if (currentList.length > 0) {
//         elements.push(
//           listType === 'ul' ? (
//             <ul key={`list-${index}`}>{currentList}</ul>
//           ) : (
//             <ol key={`list-${index}`}>{currentList}</ol>
//           )
//         );
//         currentList = [];
//         listType = null;
//       }
//       elements.push(<hr key={index} />);
//     }
//     // Regular paragraph
//     else if (line.trim()) {
//       if (currentList.length > 0) {
//         elements.push(
//           listType === 'ul' ? (
//             <ul key={`list-${index}`}>{currentList}</ul>
//           ) : (
//             <ol key={`list-${index}`}>{currentList}</ol>
//           )
//         );
//         currentList = [];
//         listType = null;
//       }
//       elements.push(<p key={index}>{formatText(line)}</p>);
//     }
//   });

//   // Add remaining list items
//   if (currentList.length > 0) {
//     elements.push(
//       listType === 'ul' ? (
//         <ul key="final-list">{currentList}</ul>
//       ) : (
//         <ol key="final-list">{currentList}</ol>
//       )
//     );
//   }

//   return (
//     <div>
//       {/* User Data Summary Cards */}
//       {userDataSummary && (
//         <div className="ai-data-summary">
//           <div className="ai-data-card">
//             <div className="ai-data-value">{userDataSummary.total_tasks}</div>
//             <div className="ai-data-label">Total Tasks</div>
//           </div>
//           <div className="ai-data-card">
//             <div className="ai-data-value" style={{ color: userDataSummary.overdue_tasks > 0 ? '#f44336' : '#4caf50' }}>
//               {userDataSummary.overdue_tasks}
//             </div>
//             <div className="ai-data-label">Overdue</div>
//           </div>
//           <div className="ai-data-card">
//             <div className="ai-data-value">{userDataSummary.total_projects}</div>
//             <div className="ai-data-label">Projects</div>
//           </div>
//         </div>
//       )}

//       {/* Insights Cards */}
//       {insights && insights.length > 0 && (
//         <div className="ai-insights-container">
//           {insights.slice(0, 3).map((insight, idx) => (
//             <div key={idx} className={`ai-insight-card ${insight.type}`}>
//               <div className="ai-insight-icon">
//                 {insight.type === 'warning' && <AlertTriangle size={16} />}
//                 {insight.type === 'success' && <CheckCircle2 size={16} />}
//                 {insight.type === 'info' && <Info size={16} />}
//                 {insight.type === 'critical' && <AlertCircle size={16} />}
//               </div>
//               <div className="ai-insight-content">
//                 <div className="ai-insight-title">{insight.title}</div>
//                 <div className="ai-insight-description">{insight.description}</div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Main content */}
//       <div>{elements}</div>
//     </div>
//   );

// const AIAssistantPage = () => {
//   const { user } = useContext(AuthContext);
//   const [conversations, setConversations] = useState([]);
//   const [activeConversation, setActiveConversation] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [inputText, setInputText] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [isTyping, setIsTyping] = useState(false);
//   const [uploadedFile, setUploadedFile] = useState(null);
//   const messagesEndRef = useRef(null);
//   const textareaRef = useRef(null);
//   const fileInputRef = useRef(null);

//   // Load conversations on mount
//   useEffect(() => {
//     loadConversations();
//   }, []);

//   // Load messages when conversation changes
//   useEffect(() => {
//     if (activeConversation) {
//       setMessages([]);
//       loadMessages(activeConversation._id);
//     } else {
//       setMessages([]);
//     }
//   }, [activeConversation?._id]);

//   // Auto-scroll to bottom when new messages arrive
//   useEffect(() => {
//     scrollToBottom();
//   }, [messages, isTyping]);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   };

//   const loadConversations = async () => {
//     try {
//       const response = await fetch(`${API_BASE}/api/ai-assistant/conversations`, {
//         headers: getAuthHeaders()
//       });
//       const data = await response.json();
//       if (data.success) {
//         setConversations(data.conversations);
//       }
//     } catch (error) {
//       console.error('Error loading conversations:', error);
//     }
//   };

//   const loadMessages = async (conversationId) => {
//     try {
//       const response = await fetch(
//         `${API_BASE}/api/ai-assistant/conversations/${conversationId}/messages`,
//         {
//           headers: getAuthHeaders()
//         }
//       );
//       const data = await response.json();
//       if (data.success) {
//         setMessages(data.messages);
//       }
//     } catch (error) {
//       console.error('Error loading messages:', error);
//     }
//   };

//   const createNewConversation = async () => {
//     try {
//       const response = await fetch(`${API_BASE}/api/ai-assistant/conversations`, {
//         method: 'POST',
//         headers: getAuthHeaders(),
//         body: JSON.stringify({ title: 'New Conversation' })
//       });
//       const data = await response.json();
//       if (data.success) {
//         setConversations([data.conversation, ...conversations]);
//         setActiveConversation(data.conversation);
//         setMessages([]);
//         return data.conversation;
//       }
//     } catch (error) {
//       console.error('Error creating conversation:', error);
//       return null;
//     }
//   };

//   const sendMessage = async () => {
//     if (!inputText.trim() || isLoading) return;

//     const messageContent = inputText;
//     let conversationToUse = activeConversation;

//     if (!conversationToUse) {
//       conversationToUse = await createNewConversation();
//       if (!conversationToUse) {
//         console.error('Failed to create conversation');
//         return;
//       }
//     }

//     const userMessage = {
//       role: 'user',
//       content: messageContent,
//       created_at: new Date().toISOString()
//     };

//     setMessages(prev => [...prev, userMessage]);
//     setInputText('');
//     setIsLoading(true);
//     setIsTyping(true);

//     try {
//       const response = await fetch(
//         `${API_BASE}/api/ai-assistant/conversations/${conversationToUse._id}/messages`,
//         {
//           method: 'POST',
//           headers: getAuthHeaders(),
//           body: JSON.stringify({
//             content: messageContent,
//             stream: false,
//             include_user_context: true // Enable user context
//           })
//         }
//       );

//       const data = await response.json();
//       setIsTyping(false);

//       if (data.success && data.message) {
//         // Add AI response with insights and user data
//         setMessages(prev => [...prev, {
//           ...data.message,
//           insights: data.insights,
//           user_data_summary: data.user_data_summary
//         }]);
        
//         loadConversations();
//       } else {
//         console.error('No AI response received:', data);
//       }
//     } catch (error) {
//       console.error('Error sending message:', error);
//       setIsTyping(false);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const generateImage = async () => {
//     if (!inputText.trim() || isLoading) return;

//     const prompt = inputText;
//     let conversationToUse = activeConversation;

//     if (!conversationToUse) {
//       conversationToUse = await createNewConversation();
//       if (!conversationToUse) {
//         console.error('Failed to create conversation');
//         return;
//       }
//     }

//     const userMessage = {
//       role: 'user',
//       content: `Generate image: ${prompt}`,
//       created_at: new Date().toISOString()
//     };

//     setMessages(prev => [...prev, userMessage]);
//     setInputText('');
//     setIsLoading(true);
//     setIsTyping(true);

//     try {
//       const response = await fetch(
//         `${API_BASE}/api/ai-assistant/conversations/${conversationToUse._id}/generate-image`,
//         {
//           method: 'POST',
//           headers: getAuthHeaders(),
//           body: JSON.stringify({ prompt })
//         }
//       );

//       const data = await response.json();
//       setIsTyping(false);

//       if (data.success) {
//         setMessages(prev => [...prev, data.message]);
//         loadConversations();
//       }
//     } catch (error) {
//       console.error('Error generating image:', error);
//       setIsTyping(false);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleFileUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file || isLoading) return;

//     let conversationToUse = activeConversation;
//     if (!conversationToUse) {
//       conversationToUse = await createNewConversation();
//       if (!conversationToUse) {
//         console.error('Failed to create conversation');
//         return;
//       }
//     }

//     const userMessage = {
//       role: 'user',
//       content: `Uploaded file: ${file.name}`,
//       created_at: new Date().toISOString()
//     };

//     setMessages(prev => [...prev, userMessage]);
//     setIsLoading(true);
//     setIsTyping(true);

//     try {
//       const formData = new FormData();
//       formData.append('file', file);

//       const response = await fetch(
//         `${API_BASE}/api/ai-assistant/conversations/${conversationToUse._id}/upload`,
//         {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${localStorage.getItem('token')}`,
//             'X-Tab-Session-Key': getTabSessionKey()
//           },
//           body: formData
//         }
//       );

//       const data = await response.json();
//       setIsTyping(false);

//       if (data.success) {
//         if (data.ai_message_id) {
//           const aiMessage = {
//             role: 'assistant',
//             content: data.message,
//             created_at: new Date().toISOString()
//           };
//           setMessages(prev => [...prev, aiMessage]);
//         }
        
//         if (data.file?.extracted) {
//           console.log('File content extracted successfully:', data.file.metadata);
//         }
        
//         setUploadedFile(file.name);
//         loadConversations();
//       } else {
//         throw new Error(data.message || 'Upload failed');
//       }
//     } catch (error) {
//       console.error('Error uploading file:', error);
//       const errorMessage = {
//         role: 'assistant',
//         content: `Sorry, I couldn't upload the file. ${error.message}`,
//         created_at: new Date().toISOString()
//       };
//       setMessages(prev => [...prev, errorMessage]);
//       setIsTyping(false);
//     } finally {
//       setIsLoading(false);
//       if (fileInputRef.current) {
//         fileInputRef.current.value = '';
//       }
//     }
//   };

//   const deleteConversation = async (conversationId, e) => {
//     e.stopPropagation();
    
//     try {
//       await fetch(`${API_BASE}/api/ai-assistant/conversations/${conversationId}`, {
//         method: 'DELETE',
//         headers: getAuthHeaders()
//       });
      
//       setConversations(prev => prev.filter(c => c._id !== conversationId));
//       if (activeConversation?._id === conversationId) {
//         setActiveConversation(null);
//         setMessages([]);
//       }
//     } catch (error) {
//       console.error('Error deleting conversation:', error);
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       sendMessage();
//     }
//   };

//   const formatTimestamp = (timestamp) => {
//     const date = new Date(timestamp);
//     const now = new Date();
//     const diff = now - date;
    
//     if (diff < 60000) return 'Just now';
//     if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
//     if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
//     return date.toLocaleDateString();
//   };

//   const suggestionPrompts = [
//     "Show me my task overview and priorities",
//     "What should I focus on today?",
//     "Analyze my team's workload distribution",
//     "Give me insights on blocked tasks"
//   ];

//   return (
//     <div className="ai-assistant-page">
//       {/* Sidebar - Conversations */}
//       <div className="ai-sidebar">
//         <div className="ai-sidebar-header">
//           <button className="new-chat-btn" onClick={createNewConversation}>
//             <Plus size={20} />
//             New Chat
//           </button>
//         </div>
        
//         <div className="conversations-list">
//           {conversations.map(conv => (
//             <div
//               key={conv._id}
//               className={`conversation-item ${activeConversation?._id === conv._id ? 'active' : ''}`}
//               onClick={() => setActiveConversation(conv)}
//             >
//               <div className="conversation-title">{conv.title}</div>
//               <div className="conversation-date">
//                 {formatTimestamp(conv.updated_at)}
//               </div>
//               <button
//                 className="conversation-delete"
//                 onClick={(e) => deleteConversation(conv._id, e)}
//               >
//                 <Trash2 size={14} />
//               </button>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* Main Chat Area */}
//       <div className="ai-chat-area">
//         <div className="ai-chat-header">
//           <div className="ai-chat-title">
//             <Bot size={20} />
//             DOIT AI Assistant
//           </div>
//           <div className="ai-status-badge">
//             <div className="ai-status-dot"></div>
//             Online
//           </div>
//         </div>

//         <div className="ai-messages-container">
//           {messages.length === 0 ? (
//             <div className="ai-empty-state">
//               <div className="ai-empty-icon">
//                 <Bot size={56} color="#667eea" />
//               </div>
//               <div className="ai-empty-title">
//                 Welcome to DOIT AI Assistant
//               </div>
//               <div className="ai-empty-subtitle">
//                 Get personalized insights, task analytics, and intelligent recommendations 
//                 based on your project data and team performance.
//               </div>
//               <div className="ai-suggestion-chips">
//                 {suggestionPrompts.map((prompt, idx) => (
//                   <div
//                     key={idx}
//                     className="ai-suggestion-chip"
//                     onClick={() => setInputText(prompt)}
//                   >
//                     {prompt}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           ) : (
//             <>
//               {messages.map((msg, idx) => (
//                 <div key={idx} className={`ai-message ${msg.role}`}>
//                   <div className="ai-message-avatar">
//                     {msg.role === 'user' ? (
//                       <User size={20} />
//                     ) : (
//                       <Bot size={20} />
//                     )}
//                   </div>
//                   <div className="ai-message-content">
//                     <div className="ai-message-bubble">
//                       <FormattedMessage 
//                         content={msg.content}
//                         insights={msg.insights}
//                         userDataSummary={msg.user_data_summary}
//                       />
//                     </div>
//                     {msg.image_url && (
//                       <div className="ai-message-image">
//                         <img src={`${API_BASE}${msg.image_url}`} alt="Generated" />
//                       </div>
//                     )}
//                     <div className="ai-message-timestamp">
//                       <Clock size={11} />
//                       {formatTimestamp(msg.created_at)}
//                     </div>
//                   </div>
//                 </div>
//               ))}
              
//               {isTyping && (
//                 <div className="ai-message assistant">
//                   <div className="ai-message-avatar">
//                     <Bot size={20} />
//                   </div>
//                   <div className="ai-message-content">
//                     <div className="ai-message-bubble">
//                       <div className="ai-loading-dots">
//                         <div className="ai-loading-dot"></div>
//                         <div className="ai-loading-dot"></div>
//                         <div className="ai-loading-dot"></div>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               )}
              
//               <div ref={messagesEndRef} />
//             </>
//           )}
//         </div>

//         <div className="ai-input-area">
//           <div className="ai-input-actions">
//             <button 
//               className="ai-action-btn" 
//               onClick={generateImage} 
//               disabled={isLoading || !inputText.trim()}
//               title="Generate an image from your text description"
//             >
//               <Image size={16} /> Generate Image
//             </button>
//             <button 
//               className="ai-action-btn" 
//               onClick={() => fileInputRef.current?.click()} 
//               disabled={isLoading}
//               title="Upload a file to analyze"
//             >
//               <Paperclip size={16} /> Upload File
//             </button>
//             <input
//               ref={fileInputRef}
//               type="file"
//               style={{ display: 'none' }}
//               onChange={handleFileUpload}
//               accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.json"
//             />
//           </div>
          
//           <div className="ai-input-container">
//             <div className="ai-textarea-wrapper">
//               <textarea
//                 ref={textareaRef}
//                 className="ai-textarea"
//                 placeholder={uploadedFile ? `Ask about "${uploadedFile}"...` : "Ask me anything about your tasks, projects, or team performance..."}
//                 value={inputText}
//                 onChange={(e) => setInputText(e.target.value)}
//                 onKeyPress={handleKeyPress}
//                 disabled={isLoading}
//                 rows={1}
//               />
//             </div>
//             <button
//               className="ai-send-btn"
//               onClick={sendMessage}
//               disabled={isLoading || !inputText.trim()}
//             >
//               <Send size={18} />
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AIAssistantPage;
import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  Plus, Trash2, Send, Image, Paperclip, Bot, User, 
  AlertCircle, CheckCircle2, Info, AlertTriangle,
  Clock, TrendingUp, Users, Target
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import './AIAssistantPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Get or generate tab session key for security
const getTabSessionKey = () => {
  let key = sessionStorage.getItem("tab_session_key");
  if (!key) {
    key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
    sessionStorage.setItem("tab_session_key", key);
  }
  return key;
};

// Get auth headers with tab session key
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'X-Tab-Session-Key': getTabSessionKey(),
    'Content-Type': 'application/json'
  };
};

// Message formatter component for rich text rendering with command results
const FormattedMessage = ({ content, insights, userDataSummary, commandResult }) => {
  // Parse markdown-like formatting
  const formatText = (text) => {
    if (!text) return null;

    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
    
    return parts.map((part, index) => {
      // Code block
      if (part.startsWith('```')) {
        const code = part.replace(/```(\w*)\n?/g, '').replace(/```$/g, '');
        return (
          <pre key={index}>
            <code>{code}</code>
          </pre>
        );
      }
      
      // Inline code
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }

      // Regular text with formatting
      let formatted = part;
      
      // Bold
      formatted = formatted.split(/(\*\*[^*]+\*\*)/g).map((segment, i) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return <strong key={`bold-${i}`}>{segment.slice(2, -2)}</strong>;
        }
        return segment;
      });

      return <span key={index}>{formatted}</span>;
    });
  };

  // Parse lists and structure
  const parseContent = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null;

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        if (currentList.length > 0) {
          elements.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`}>{currentList}</ul>
            ) : (
              <ol key={`list-${index}`}>{currentList}</ol>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(<h2 key={index}>{formatText(line.replace('## ', ''))}</h2>);
      } 
      else if (line.startsWith('### ')) {
        if (currentList.length > 0) {
          elements.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`}>{currentList}</ul>
            ) : (
              <ol key={`list-${index}`}>{currentList}</ol>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(<h3 key={index}>{formatText(line.replace('### ', ''))}</h3>);
      }
      // Bullet points
      else if (line.match(/^[-*]\s/)) {
        if (listType !== 'ul' && currentList.length > 0) {
          elements.push(<ol key={`list-${index}`}>{currentList}</ol>);
          currentList = [];
        }
        listType = 'ul';
        currentList.push(<li key={index}>{formatText(line.replace(/^[-*]\s/, ''))}</li>);
      }
      // Numbered lists
      else if (line.match(/^\d+\.\s/)) {
        if (listType !== 'ol' && currentList.length > 0) {
          elements.push(<ul key={`list-${index}`}>{currentList}</ul>);
          currentList = [];
        }
        listType = 'ol';
        currentList.push(<li key={index}>{formatText(line.replace(/^\d+\.\s/, ''))}</li>);
      }
      // Horizontal rule
      else if (line.trim() === '---') {
        if (currentList.length > 0) {
          elements.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`}>{currentList}</ul>
            ) : (
              <ol key={`list-${index}`}>{currentList}</ol>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(<hr key={index} />);
      }
      // Regular paragraph
      else if (line.trim()) {
        if (currentList.length > 0) {
          elements.push(
            listType === 'ul' ? (
              <ul key={`list-${index}`}>{currentList}</ul>
            ) : (
              <ol key={`list-${index}`}>{currentList}</ol>
            )
          );
          currentList = [];
          listType = null;
        }
        elements.push(<p key={index}>{formatText(line)}</p>);
      }
    });

    // Add remaining list items
    if (currentList.length > 0) {
      elements.push(
        listType === 'ul' ? (
          <ul key="final-list">{currentList}</ul>
        ) : (
          <ol key="final-list">{currentList}</ol>
        )
      );
    }

    return elements;
  };

  return (
    <div>
      {/* Command Execution Result - Show at top */}
      {commandResult && (
        <div className="ai-command-result">
          <div className={`ai-command-badge ${commandResult.success ? 'success' : 'error'}`}>
            {commandResult.success ? (
              <>
                <CheckCircle2 size={14} />
                Command Executed
              </>
            ) : (
              <>
                <AlertCircle size={14} />
                Command Failed
              </>
            )}
          </div>
          
          {/* Show Tasks if present */}
          {commandResult.tasks && commandResult.tasks.length > 0 && (
            <div className="ai-command-tasks">
              <h4>
                <Target size={16} />
                Tasks ({commandResult.count})
              </h4>
              <ul>
                {commandResult.tasks.map((task, idx) => (
                  <li key={idx}>
                    <span className="task-ticket">[{task.ticket_id}]</span>
                    <span className="task-title">{task.title}</span>
                    <span className="task-status">{task.status}</span>
                    <span className={`task-priority priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    {task.assignee && task.assignee !== 'Unassigned' && (
                      <span className="task-assignee">
                        <User size={12} />
                        {task.assignee}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show Projects if present */}
          {commandResult.projects && commandResult.projects.length > 0 && (
            <div className="ai-command-projects">
              <h4>
                <Target size={16} />
                Projects ({commandResult.count})
              </h4>
              <ul>
                {commandResult.projects.map((project, idx) => (
                  <li key={idx}>
                    <span className="project-name">{project.name}</span>
                    <span className="project-role">{project.role}</span>
                    {project.description && (
                      <span className="project-description">{project.description}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show detailed result if present */}
          {commandResult.result && (
            <div className="ai-command-details">
              <details>
                <summary>View Full Result</summary>
                <pre>
                  <code>{JSON.stringify(commandResult.result, null, 2)}</code>
                </pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* User Data Summary Cards */}
      {userDataSummary && (
        <div className="ai-data-summary">
          <div className="ai-data-card">
            <div className="ai-data-value">{userDataSummary.tasks_total}</div>
            <div className="ai-data-label">Total Tasks</div>
          </div>
          <div className="ai-data-card">
            <div className="ai-data-value" style={{ color: userDataSummary.tasks_overdue > 0 ? '#f44336' : '#4caf50' }}>
              {userDataSummary.tasks_overdue}
            </div>
            <div className="ai-data-label">Overdue</div>
          </div>
          <div className="ai-data-card">
            <div className="ai-data-value">{userDataSummary.projects_total}</div>
            <div className="ai-data-label">Projects</div>
          </div>
          <div className="ai-data-card">
            <div className="ai-data-value">{userDataSummary.velocity}</div>
            <div className="ai-data-label">Tasks/Week</div>
          </div>
        </div>
      )}

      {/* Insights Cards */}
      {insights && insights.length > 0 && (
        <div className="ai-insights-container">
          {insights.slice(0, 3).map((insight, idx) => (
            <div key={idx} className={`ai-insight-card ${insight.type}`}>
              <div className="ai-insight-icon">
                {insight.type === 'warning' && <AlertTriangle size={16} />}
                {insight.type === 'success' && <CheckCircle2 size={16} />}
                {insight.type === 'info' && <Info size={16} />}
                {insight.type === 'critical' && <AlertCircle size={16} />}
              </div>
              <div className="ai-insight-content">
                <div className="ai-insight-title">{insight.title}</div>
                <div className="ai-insight-description">{insight.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div>{parseContent(content)}</div>
    </div>
  );
};

const AIAssistantPage = () => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      setMessages([]);
      loadMessages(activeConversation._id);
    } else {
      setMessages([]);
    }
  }, [activeConversation?._id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai-assistant/conversations`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/ai-assistant/conversations/${conversationId}/messages`,
        {
          headers: getAuthHeaders()
        }
      );
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai-assistant/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: 'New Conversation' })
      });
      const data = await response.json();
      if (data.success) {
        setConversations([data.conversation, ...conversations]);
        setActiveConversation(data.conversation);
        setMessages([]);
        return data.conversation;
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const messageContent = inputText;
    let conversationToUse = activeConversation;

    if (!conversationToUse) {
      conversationToUse = await createNewConversation();
      if (!conversationToUse) {
        console.error('Failed to create conversation');
        return;
      }
    }

    const userMessage = {
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/ai-assistant/conversations/${conversationToUse._id}/messages`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            content: messageContent,
            stream: false,
            include_user_context: true
          })
        }
      );

      const data = await response.json();
      setIsTyping(false);

      if (data.success && data.message) {
        // Add AI response with all metadata including command results
        setMessages(prev => [...prev, {
          ...data.message,
          insights: data.insights,
          user_data_summary: data.user_data_summary,
          command_result: data.command_result // NEW: Include command results
        }]);
        
        // Show success notification for commands
        if (data.command_executed && data.command_result?.success) {
          console.log('✅ Command executed successfully:', data.command_result);
        }
        
        loadConversations();
      } else {
        console.error('No AI response received:', data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      // Add error message
      const errorMessage = {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async () => {
    if (!inputText.trim() || isLoading) return;

    const prompt = inputText;
    let conversationToUse = activeConversation;

    if (!conversationToUse) {
      conversationToUse = await createNewConversation();
      if (!conversationToUse) {
        console.error('Failed to create conversation');
        return;
      }
    }

    const userMessage = {
      role: 'user',
      content: `Generate image: ${prompt}`,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(
        `${API_BASE}/api/ai-assistant/conversations/${conversationToUse._id}/generate-image`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ prompt })
        }
      );

      const data = await response.json();
      setIsTyping(false);

      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        loadConversations();
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || isLoading) return;

    let conversationToUse = activeConversation;
    if (!conversationToUse) {
      conversationToUse = await createNewConversation();
      if (!conversationToUse) {
        console.error('Failed to create conversation');
        return;
      }
    }

    const userMessage = {
      role: 'user',
      content: `Uploaded file: ${file.name}`,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${API_BASE}/api/ai-assistant/conversations/${conversationToUse._id}/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-Tab-Session-Key': getTabSessionKey()
          },
          body: formData
        }
      );

      const data = await response.json();
      setIsTyping(false);

      if (data.success) {
        if (data.ai_message_id) {
          const aiMessage = {
            role: 'assistant',
            content: data.message,
            created_at: new Date().toISOString()
          };
          setMessages(prev => [...prev, aiMessage]);
        }
        
        if (data.file?.extracted) {
          console.log('File content extracted successfully:', data.file.metadata);
        }
        
        setUploadedFile(file.name);
        loadConversations();
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Sorry, I couldn't upload the file. ${error.message}`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    
    try {
      await fetch(`${API_BASE}/api/ai-assistant/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      setConversations(prev => prev.filter(c => c._id !== conversationId));
      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const suggestionPrompts = [
    "Show me my task overview and priorities",
    "Create a high priority task for login bug fix",
    "List all my overdue tasks",
    "What should I focus on today?"
  ];

  return (
    <div className="ai-assistant-page">
      {/* Sidebar - Conversations */}
      <div className="ai-sidebar">
        <div className="ai-sidebar-header">
          <button className="new-chat-btn" onClick={createNewConversation}>
            <Plus size={20} />
            New Chat
          </button>
        </div>
        
        <div className="conversations-list">
          {conversations.map(conv => (
            <div
              key={conv._id}
              className={`conversation-item ${activeConversation?._id === conv._id ? 'active' : ''}`}
              onClick={() => setActiveConversation(conv)}
            >
              <div className="conversation-title">{conv.title}</div>
              <div className="conversation-date">
                {formatTimestamp(conv.updated_at)}
              </div>
              <button
                className="conversation-delete"
                onClick={(e) => deleteConversation(conv._id, e)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="ai-chat-area">
        <div className="ai-chat-header">
          <div className="ai-chat-title">
            <Bot size={20} />
            DOIT AI Assistant
          </div>
          <div className="ai-status-badge">
            <div className="ai-status-dot"></div>
            Online
          </div>
        </div>

        <div className="ai-messages-container">
          {messages.length === 0 ? (
            <div className="ai-empty-state">
              <div className="ai-empty-icon">
                <Bot size={56} color="#667eea" />
              </div>
              <div className="ai-empty-title">
                Welcome to DOIT AI Assistant
              </div>
              <div className="ai-empty-subtitle">
                Get personalized insights, task analytics, and intelligent recommendations 
                based on your project data and team performance. I can also help you create, 
                assign, and manage tasks automatically!
              </div>
              <div className="ai-suggestion-chips">
                {suggestionPrompts.map((prompt, idx) => (
                  <div
                    key={idx}
                    className="ai-suggestion-chip"
                    onClick={() => setInputText(prompt)}
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`ai-message ${msg.role}`}>
                  <div className="ai-message-avatar">
                    {msg.role === 'user' ? (
                      <User size={20} />
                    ) : (
                      <Bot size={20} />
                    )}
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-message-bubble">
                      <FormattedMessage 
                        content={msg.content}
                        insights={msg.insights}
                        userDataSummary={msg.user_data_summary}
                        commandResult={msg.command_result}
                      />
                    </div>
                    {msg.image_url && (
                      <div className="ai-message-image">
                        <img src={`${API_BASE}${msg.image_url}`} alt="Generated" />
                      </div>
                    )}
                    <div className="ai-message-timestamp">
                      <Clock size={11} />
                      {formatTimestamp(msg.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="ai-message assistant">
                  <div className="ai-message-avatar">
                    <Bot size={20} />
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-message-bubble">
                      <div className="ai-loading-dots">
                        <div className="ai-loading-dot"></div>
                        <div className="ai-loading-dot"></div>
                        <div className="ai-loading-dot"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="ai-input-area">
          <div className="ai-input-actions">
            <button 
              className="ai-action-btn" 
              onClick={generateImage} 
              disabled={isLoading || !inputText.trim()}
              title="Generate an image from your text description"
            >
              <Image size={16} /> Generate Image
            </button>
            <button 
              className="ai-action-btn" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isLoading}
              title="Upload a file to analyze"
            >
              <Paperclip size={16} /> Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.json"
            />
          </div>
          
          <div className="ai-input-container">
            <div className="ai-textarea-wrapper">
              <textarea
                ref={textareaRef}
                className="ai-textarea"
                placeholder={uploadedFile ? `Ask about "${uploadedFile}"...` : "Ask me anything or give me commands like 'Create a task for...' or 'Show my tasks'"}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                rows={1}
              />
            </div>
            <button
              className="ai-send-btn"
              onClick={sendMessage}
              disabled={isLoading || !inputText.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantPage;