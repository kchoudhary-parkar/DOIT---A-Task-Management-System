import VoiceButton from './Voicebutton';
import MicButton from './Micbutton';
import { useTTS } from './useVoiceFeatures';

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { 
  Plus, Trash2, Send, Image, Paperclip, Bot, User, 
  AlertCircle, CheckCircle2, Info, AlertTriangle,
  Clock, Target, Zap, Shield
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { foundryAgentAPI } from '../../services/foundryAgentAPI';
import { localAgentAPI }   from '../../services/localAgentAPI';
import './AIAssistantPage.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getTabSessionKey = () => {
  let key = sessionStorage.getItem("tab_session_key");
  if (!key) {
    key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
    sessionStorage.setItem("tab_session_key", key);
  }
  return key;
};

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'X-Tab-Session-Key': getTabSessionKey(),
  'Content-Type': 'application/json'
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared markdown renderer (used by Foundry + Local tabs)
// ─────────────────────────────────────────────────────────────────────────────
const MarkdownMessage = ({ content }) => {
  const formatText = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```(\w*)\n?/g, '').replace(/```$/g, '');
        return <pre key={index}><code>{code}</code></pre>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }
      const formatted = part.split(/(\*\*[^*]+\*\*)/g).map((s, i) =>
        s.startsWith('**') && s.endsWith('**')
          ? <strong key={i}>{s.slice(2, -2)}</strong>
          : s
      );
      return <span key={index}>{formatted}</span>;
    });
  };

  const lines = content.split('\n');
  const elements = [];
  let currentList = []; let listType = null;
  lines.forEach((line, index) => {
    if (line.startsWith('## ')) {
      if (currentList.length > 0) { elements.push(listType === 'ul' ? <ul key={`l${index}`}>{currentList}</ul> : <ol key={`l${index}`}>{currentList}</ol>); currentList = []; listType = null; }
      elements.push(<h2 key={index}>{formatText(line.replace('## ', ''))}</h2>);
    } else if (line.startsWith('### ')) {
      if (currentList.length > 0) { elements.push(listType === 'ul' ? <ul key={`l${index}`}>{currentList}</ul> : <ol key={`l${index}`}>{currentList}</ol>); currentList = []; listType = null; }
      elements.push(<h3 key={index}>{formatText(line.replace('### ', ''))}</h3>);
    } else if (line.match(/^[-*]\s/)) {
      if (listType !== 'ul' && currentList.length > 0) { elements.push(<ol key={`l${index}`}>{currentList}</ol>); currentList = []; }
      listType = 'ul'; currentList.push(<li key={index}>{formatText(line.replace(/^[-*]\s/, ''))}</li>);
    } else if (line.match(/^\d+\.\s/)) {
      if (listType !== 'ol' && currentList.length > 0) { elements.push(<ul key={`l${index}`}>{currentList}</ul>); currentList = []; }
      listType = 'ol'; currentList.push(<li key={index}>{formatText(line.replace(/^\d+\.\s/, ''))}</li>);
    } else if (line.trim() === '---') {
      if (currentList.length > 0) { elements.push(listType === 'ul' ? <ul key={`l${index}`}>{currentList}</ul> : <ol key={`l${index}`}>{currentList}</ol>); currentList = []; listType = null; }
      elements.push(<hr key={index} />);
    } else if (line.trim()) {
      if (currentList.length > 0) { elements.push(listType === 'ul' ? <ul key={`l${index}`}>{currentList}</ul> : <ol key={`l${index}`}>{currentList}</ol>); currentList = []; listType = null; }
      elements.push(<p key={index}>{formatText(line)}</p>);
    }
  });
  if (currentList.length > 0) elements.push(listType === 'ul' ? <ul key="fl">{currentList}</ul> : <ol key="fl">{currentList}</ol>);
  return <div>{elements}</div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// FormattedMessage — DOIT-AI rich renderer (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const FormattedMessage = ({ content, insights, userDataSummary, commandResult }) => {
  const formatText = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const code = part.replace(/```(\w*)\n?/g, '').replace(/```$/g, '');
        return <pre key={index}><code>{code}</code></pre>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index}>{part.slice(1, -1)}</code>;
      }
      let formatted = part;
      formatted = formatted.split(/(\*\*[^*]+\*\*)/g).map((segment, i) => {
        if (segment.startsWith('**') && segment.endsWith('**')) {
          return <strong key={`bold-${i}`}>{segment.slice(2, -2)}</strong>;
        }
        return segment;
      });
      return <span key={index}>{formatted}</span>;
    });
  };

  const parseContent = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null;
    lines.forEach((line, index) => {
      if (line.startsWith('## ')) {
        if (currentList.length > 0) { elements.push(listType === 'ul' ? <ul key={`list-${index}`}>{currentList}</ul> : <ol key={`list-${index}`}>{currentList}</ol>); currentList = []; listType = null; }
        elements.push(<h2 key={index}>{formatText(line.replace('## ', ''))}</h2>);
      } else if (line.startsWith('### ')) {
        if (currentList.length > 0) { elements.push(listType === 'ul' ? <ul key={`list-${index}`}>{currentList}</ul> : <ol key={`list-${index}`}>{currentList}</ol>); currentList = []; listType = null; }
        elements.push(<h3 key={index}>{formatText(line.replace('### ', ''))}</h3>);
      } else if (line.match(/^[-*]\s/)) {
        if (listType !== 'ul' && currentList.length > 0) { elements.push(<ol key={`list-${index}`}>{currentList}</ol>); currentList = []; }
        listType = 'ul';
        currentList.push(<li key={index}>{formatText(line.replace(/^[-*]\s/, ''))}</li>);
      } else if (line.match(/^\d+\.\s/)) {
        if (listType !== 'ol' && currentList.length > 0) { elements.push(<ul key={`list-${index}`}>{currentList}</ul>); currentList = []; }
        listType = 'ol';
        currentList.push(<li key={index}>{formatText(line.replace(/^\d+\.\s/, ''))}</li>);
      } else if (line.trim() === '---') {
        if (currentList.length > 0) { elements.push(listType === 'ul' ? <ul key={`list-${index}`}>{currentList}</ul> : <ol key={`list-${index}`}>{currentList}</ol>); currentList = []; listType = null; }
        elements.push(<hr key={index} />);
      } else if (line.trim()) {
        if (currentList.length > 0) { elements.push(listType === 'ul' ? <ul key={`list-${index}`}>{currentList}</ul> : <ol key={`list-${index}`}>{currentList}</ol>); currentList = []; listType = null; }
        elements.push(<p key={index}>{formatText(line)}</p>);
      }
    });
    if (currentList.length > 0) elements.push(listType === 'ul' ? <ul key="final-list">{currentList}</ul> : <ol key="final-list">{currentList}</ol>);
    return elements;
  };

  return (
    <div>
      {commandResult && (
        <div className="ai-command-result">
          <div className={`ai-command-badge ${commandResult.success ? 'success' : 'error'}`}>
            {commandResult.success ? (<><CheckCircle2 size={14} />Command Executed</>) : (<><AlertCircle size={14} />Command Failed</>)}
          </div>
          {commandResult.tasks && commandResult.tasks.length > 0 && (
            <div className="ai-command-tasks">
              <h4><Target size={16} />Tasks ({commandResult.count})</h4>
              <ul>
                {commandResult.tasks.map((task, idx) => (
                  <li key={idx}>
                    <span className="task-ticket">[{task.ticket_id}]</span>
                    <span className="task-title">{task.title}</span>
                    <span className="task-status">{task.status}</span>
                    <span className={`task-priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                    {task.assignee && task.assignee !== 'Unassigned' && (
                      <span className="task-assignee"><User size={12} />{task.assignee}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {commandResult.projects && commandResult.projects.length > 0 && (
            <div className="ai-command-projects">
              <h4><Target size={16} />Projects ({commandResult.count})</h4>
              <ul>
                {commandResult.projects.map((project, idx) => (
                  <li key={idx}>
                    <span className="project-name">{project.name}</span>
                    <span className="project-role">{project.role}</span>
                    {project.description && <span className="project-description">{project.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {commandResult.result && (
            <div className="ai-command-details">
              <details><summary>View Full Result</summary>
                <pre><code>{JSON.stringify(commandResult.result, null, 2)}</code></pre>
              </details>
            </div>
          )}
        </div>
      )}
      {userDataSummary && (
        <div className="ai-data-summary">
          <div className="ai-data-card"><div className="ai-data-value">{userDataSummary.tasks_total}</div><div className="ai-data-label">Total Tasks</div></div>
          <div className="ai-data-card"><div className="ai-data-value" style={{ color: userDataSummary.tasks_overdue > 0 ? '#f44336' : '#4caf50' }}>{userDataSummary.tasks_overdue}</div><div className="ai-data-label">Overdue</div></div>
          <div className="ai-data-card"><div className="ai-data-value">{userDataSummary.projects_total}</div><div className="ai-data-label">Projects</div></div>
          <div className="ai-data-card"><div className="ai-data-value">{userDataSummary.velocity}</div><div className="ai-data-label">Tasks/Week</div></div>
        </div>
      )}
      {insights && insights.length > 0 && (
        <div className="ai-insights-container">
          {insights.slice(0, 3).map((insight, idx) => (
            <div key={idx} className={`ai-insight-card ${insight.type}`}>
              <div className="ai-insight-icon">
                {insight.type === 'warning'  && <AlertTriangle size={16} />}
                {insight.type === 'success'  && <CheckCircle2  size={16} />}
                {insight.type === 'info'     && <Info          size={16} />}
                {insight.type === 'critical' && <AlertCircle   size={16} />}
              </div>
              <div className="ai-insight-content">
                <div className="ai-insight-title">{insight.title}</div>
                <div className="ai-insight-description">{insight.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div>{parseContent(content)}</div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────
const AIAssistantPage = () => {
  // Add TTS hook
  const tts = useTTS();
  const { user } = useContext(AuthContext);

  // ── Active tab: 'doit' | 'foundry' | 'local' ────────────────────────────
  const [activeTab, setActiveTab] = useState('doit');
  const isFoundry = activeTab === 'foundry';
  const isLocal   = activeTab === 'local';

  // ── DOIT-AI state ────────────────────────────────────────────────────────
  const [conversations,     setConversations]     = useState([]);
  const [activeConversation,setActiveConversation] = useState(null);
  const [messages,          setMessages]           = useState([]);

  // ── Foundry state ────────────────────────────────────────────────────────
  const [foundryConvs,     setFoundryConvs]     = useState([]);
  const [foundryActiveConv,setFoundryActiveConv] = useState(null);
  const [foundryMessages,  setFoundryMessages]   = useState([]);

  // ── Local Agent state ────────────────────────────────────────────────────
  const [localConvs,     setLocalConvs]     = useState([]);
  const [localActiveConv,setLocalActiveConv] = useState(null);
  const [localMessages,  setLocalMessages]   = useState([]);
  const [localHealth,    setLocalHealth]     = useState(null); // {healthy, model, error}

  // ── Shared UI state ──────────────────────────────────────────────────────
  const [inputText,    setInputText]    = useState('');
  const [isLoading,    setIsLoading]    = useState(false);
  const [isTyping,     setIsTyping]     = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const fileInputRef   = useRef(null);

  // ── Load all conversation lists on mount ─────────────────────────────────
  const loadDoitConversations = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai-assistant/conversations`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) setConversations(data.conversations);
    } catch (e) { console.error('DOIT convs:', e); }
  }, []);

  const loadFoundryConversations = useCallback(async () => {
    try {
      const data = await foundryAgentAPI.listConversations();
      if (data.success) setFoundryConvs(data.conversations || []);
    } catch (e) { console.error('Foundry convs:', e); }
  }, []);

  const loadLocalConversations = useCallback(async () => {
    try {
      const data = await localAgentAPI.listConversations();
      if (data.success) setLocalConvs(data.conversations || []);
    } catch (e) { console.error('Local convs:', e); }
  }, []);

  // Health-check local agent when tab is first opened
  const checkLocalHealth = useCallback(async () => {
    if (localHealth !== null) return;
    try {
      const data = await localAgentAPI.health();
      setLocalHealth(data);
    } catch (e) {
      setLocalHealth({ healthy: false, error: 'Cannot reach backend' });
    }
  }, [localHealth]);

  useEffect(() => {
    loadDoitConversations();
    loadFoundryConversations();
    loadLocalConversations();
  }, [loadDoitConversations, loadFoundryConversations, loadLocalConversations]);

  useEffect(() => {
    if (isLocal) checkLocalHealth();
  }, [isLocal, checkLocalHealth]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, foundryMessages, localMessages, isTyping]);

  // ── Load messages when active conversation changes ────────────────────────
  useEffect(() => {
    if (activeConversation) { 
      // 🎯 Only clear and reload if we don't have optimistic messages
      // (Prevents clearing user message that was just added)
      if (messages.length === 0 || !messages.some(m => m._id?.startsWith('temp-'))) {
        setMessages([]); 
        loadDoitMessages(activeConversation._id); 
      }
    }
    else setMessages([]);
  }, [activeConversation?._id]); // eslint-disable-line

  useEffect(() => {
    if (foundryActiveConv) { setFoundryMessages([]); loadFoundryMessages(foundryActiveConv._id); }
    else setFoundryMessages([]);
  }, [foundryActiveConv?._id]); // eslint-disable-line

  useEffect(() => {
    if (localActiveConv) { setLocalMessages([]); loadLocalMessages(localActiveConv._id); }
    else setLocalMessages([]);
  }, [localActiveConv?._id]); // eslint-disable-line

  const loadDoitMessages = async (id) => {
    try {
      const r = await fetch(`${API_BASE}/api/ai-assistant/conversations/${id}/messages`, { headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success) setMessages(d.messages);
    } catch (e) { console.error(e); }
  };

  const loadFoundryMessages = async (id) => {
    try {
      const d = await foundryAgentAPI.getMessages(id);
      if (d.success) setFoundryMessages(d.messages || []);
    } catch (e) { console.error(e); }
  };

  const loadLocalMessages = async (id) => {
    try {
      const d = await localAgentAPI.getMessages(id);
      if (d.success) setLocalMessages(d.messages || []);
    } catch (e) { console.error(e); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DOIT-AI actions
  // ─────────────────────────────────────────────────────────────────────────
  const createNewDoitConversation = async (skipClearMessages = false) => {
    try {
      const r = await fetch(`${API_BASE}/api/ai-assistant/conversations`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ title: 'New Conversation' })
      });
      const d = await r.json();
      if (d.success) {
        setConversations(p => [d.conversation, ...p]);
        setActiveConversation(d.conversation);
        // 🎯 Don't clear messages if we're about to add one (optimistic update)
        if (!skipClearMessages) setMessages([]);
        return d.conversation;
      }
    } catch (e) { console.error(e); return null; }
  };

  const sendDoitMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    const messageContent = inputText;
    
    // 🎯 OPTIMIZATION: Add user message IMMEDIATELY before any async operations
    // This ensures the UI updates instantly, hiding the welcome screen
    const optimisticUserMessage = { 
      _id: `temp-${Date.now()}`, 
      role: 'user', 
      content: messageContent, 
      created_at: new Date().toISOString() 
    };
    setMessages(p => [...p, optimisticUserMessage]);
    setInputText('');
    
    // Create conversation if needed (will not clear messages now)
    let conv = activeConversation || await createNewDoitConversation(true); // Pass flag to skip clearing
    if (!conv) {
      // Rollback optimistic message on failure
      setMessages(p => p.filter(m => m._id !== optimisticUserMessage._id));
      return;
    }
    
    setIsLoading(true); setIsTyping(true);
    try {
      const r = await fetch(`${API_BASE}/api/ai-assistant/conversations/${conv._id}/messages`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ content: messageContent, stream: false, include_user_context: true })
      });
      const d = await r.json();
      setIsTyping(false);
      if (d.success && d.message) {
        // Keep optimistic user message, just add AI response
        setMessages(p => [...p, { ...d.message, insights: d.insights, user_data_summary: d.user_data_summary, command_result: d.command_result }]);
        loadDoitConversations();
      }
    } catch (e) {
      setIsTyping(false);
      setMessages(p => [...p, { role: 'assistant', content: '❌ Error processing request. Please try again.', created_at: new Date().toISOString() }]);
    } finally { setIsLoading(false); }
  };

  const generateImage = async () => {
    if (!inputText.trim() || isLoading) return;
    const prompt = inputText;
    
    // 🎯 Show user message immediately
    const optimisticMsg = { _id: `temp-${Date.now()}`, role: 'user', content: `Generate image: ${prompt}`, created_at: new Date().toISOString() };
    setMessages(p => [...p, optimisticMsg]);
    setInputText('');
    
    let conv = activeConversation || await createNewDoitConversation(true);
    if (!conv) {
      setMessages(p => p.filter(m => m._id !== optimisticMsg._id));
      return;
    }
    
    setIsLoading(true); setIsTyping(true);
    try {
      const r = await fetch(`${API_BASE}/api/ai-assistant/conversations/${conv._id}/generate-image`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ prompt })
      });
      const d = await r.json();
      setIsTyping(false);
      if (d.success) { 
        setMessages(p => [...p.filter(m => m._id !== optimisticMsg._id), d.message]); 
        loadDoitConversations(); 
      }
    } catch (e) { console.error(e); setIsTyping(false); }
    finally { setIsLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || isLoading) return;
    
    // 🎯 Show user message immediately
    const optimisticMsg = { _id: `temp-${Date.now()}`, role: 'user', content: `Uploaded file: ${file.name}`, created_at: new Date().toISOString() };
    setMessages(p => [...p, optimisticMsg]);
    
    let conv = activeConversation || await createNewDoitConversation(true);
    if (!conv) {
      setMessages(p => p.filter(m => m._id !== optimisticMsg._id));
      return;
    }
    
    setIsLoading(true); setIsTyping(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const r = await fetch(`${API_BASE}/api/ai-assistant/conversations/${conv._id}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'X-Tab-Session-Key': getTabSessionKey() },
        body: formData
      });
      const d = await r.json();
      setIsTyping(false);
      if (d.success) {
        if (d.ai_message_id) setMessages(p => [...p.filter(m => m._id !== optimisticMsg._id), { role: 'assistant', content: d.message, created_at: new Date().toISOString() }]);
        setUploadedFile(file.name); loadDoitConversations();
      } else throw new Error(d.message || 'Upload failed');
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: `Sorry, couldn't upload file. ${e.message}`, created_at: new Date().toISOString() }]);
      setIsTyping(false);
    } finally { setIsLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const deleteDoitConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/ai-assistant/conversations/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      setConversations(p => p.filter(c => c._id !== id));
      if (activeConversation?._id === id) { setActiveConversation(null); setMessages([]); }
    } catch (e) { console.error(e); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Foundry actions
  // ─────────────────────────────────────────────────────────────────────────
  const createNewFoundryConversation = async () => {
    try {
      const d = await foundryAgentAPI.createConversation('Agent Chat');
      if (d.success && d.conversation) {
        setFoundryConvs(p => [d.conversation, ...p]);
        setFoundryActiveConv(d.conversation);
        setFoundryMessages([]);
        return d.conversation;
      }
    } catch (e) { console.error(e); return null; }
  };

  const sendFoundryMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    const messageContent = inputText;
    let conv = foundryActiveConv || await createNewFoundryConversation();
    if (!conv) return;
    const opt = { _id: `opt-${Date.now()}`, role: 'user', content: messageContent, created_at: new Date().toISOString() };
    setFoundryMessages(p => [...p, opt]);
    setInputText(''); setIsLoading(true); setIsTyping(true);
    try {
      const d = await foundryAgentAPI.sendMessage(conv._id, messageContent, true);
      setIsTyping(false);
      if (d.success && d.message) { setFoundryMessages(p => [...p, d.message]); loadFoundryConversations(); }
      else throw new Error(d.detail || d.error || 'No response');
    } catch (e) {
      setIsTyping(false);
      setFoundryMessages(p => p.filter(m => m._id !== opt._id));
      setFoundryMessages(p => [...p, { role: 'assistant', content: `❌ Agent error: ${e.message}`, created_at: new Date().toISOString() }]);
    } finally { setIsLoading(false); }
  };

  const deleteFoundryConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await foundryAgentAPI.deleteConversation(id);
      setFoundryConvs(p => p.filter(c => c._id !== id));
      if (foundryActiveConv?._id === id) { setFoundryActiveConv(null); setFoundryMessages([]); }
    } catch (e) { console.error(e); }
  };

  const resetFoundryThread = async () => {
    try { await foundryAgentAPI.resetThread(); setFoundryMessages([]); }
    catch (e) { console.error(e); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Local Agent actions
  // ─────────────────────────────────────────────────────────────────────────
  const createNewLocalConversation = async () => {
    try {
      const d = await localAgentAPI.createConversation('Local AI Chat');
      if (d.success && d.conversation) {
        setLocalConvs(p => [d.conversation, ...p]);
        setLocalActiveConv(d.conversation);
        setLocalMessages([]);
        return d.conversation;
      }
    } catch (e) { console.error(e); return null; }
  };

  const sendLocalMessage = async () => {
    if (!inputText.trim() || isLoading) return;
    const messageContent = inputText;
    let conv = localActiveConv || await createNewLocalConversation();
    if (!conv) return;
    const opt = { _id: `opt-${Date.now()}`, role: 'user', content: messageContent, created_at: new Date().toISOString() };
    setLocalMessages(p => [...p, opt]);
    setInputText(''); setIsLoading(true); setIsTyping(true);
    try {
      const d = await localAgentAPI.sendMessage(conv._id, messageContent, true);
      setIsTyping(false);
      if (d.success && d.message) {
        setLocalMessages(p => [...p, {
          ...d.message,
          rag_used: d.rag_used,
          model:    d.model,
        }]);
        loadLocalConversations();
      } else throw new Error(d.detail || d.error || 'No response');
    } catch (e) {
      setIsTyping(false);
      setLocalMessages(p => p.filter(m => m._id !== opt._id));
      setLocalMessages(p => [...p, { role: 'assistant', content: `❌ Local agent error: ${e.message}. Is Ollama running?`, created_at: new Date().toISOString() }]);
    } finally { setIsLoading(false); }
  };

  const deleteLocalConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await localAgentAPI.deleteConversation(id);
      setLocalConvs(p => p.filter(c => c._id !== id));
      if (localActiveConv?._id === id) { setLocalActiveConv(null); setLocalMessages([]); }
    } catch (e) { console.error(e); }
  };

  const resetLocalHistory = async () => {
    try { await localAgentAPI.resetHistory(); setLocalMessages([]); }
    catch (e) { console.error(e); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Unified handlers
  // ─────────────────────────────────────────────────────────────────────────
  const sendMessage = () => {
    if (isFoundry) return sendFoundryMessage();
    if (isLocal)   return sendLocalMessage();
    return sendDoitMessage();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const formatTimestamp = (ts) => {
    const date = new Date(ts); const now = new Date(); const diff = now - date;
    if (diff < 60000)    return 'Just now';
    if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // ── Derived tab values ───────────────────────────────────────────────────
  const activeConvList  = isFoundry ? foundryConvs  : isLocal ? localConvs  : conversations;
  const selectedConv    = isFoundry ? foundryActiveConv : isLocal ? localActiveConv : activeConversation;
  const activeMessages  = isFoundry ? foundryMessages : isLocal ? localMessages : messages;
  const setSelectedConv = isFoundry ? setFoundryActiveConv : isLocal ? setLocalActiveConv : setActiveConversation;
  const handleNewChat   = isFoundry ? createNewFoundryConversation : isLocal ? createNewLocalConversation : createNewDoitConversation;
  const handleDeleteConv = isFoundry ? deleteFoundryConversation : isLocal ? deleteLocalConversation : deleteDoitConversation;

  const suggestions = isFoundry ? [
    "What's the status of my projects?",
    "Which tasks are blocked or at risk?",
    "Help me plan this week's priorities",
    "Analyse my sprint velocity",
  ] : isLocal ? [
    "Summarise my current tasks",
    "What are my overdue items?",
    "Which project needs attention?",
    "What should I work on next?",
  ] : [
    "Show me my task overview and priorities",
    "Create a high priority task for login bug fix",
    "List all my overdue tasks",
    "What should I focus on today?",
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────
  const tabIcon = (tab) => {
    if (tab === 'foundry') return <Zap   size={20} />;
    if (tab === 'local')   return <Shield size={20} />;
    return <Bot size={20} />;
  };

  const tabLabel = () => {
    if (isFoundry) return 'Azure AI Foundry Agent';
    if (isLocal)   return 'Local AI (On-Premise)';
    return 'DOIT AI Assistant';
  };

  const avatarClass = (msgRole) => {
    if (msgRole !== 'assistant') return '';
    if (isFoundry) return 'foundry';
    if (isLocal)   return 'local';
    return '';
  };

  const renderAvatar = (msgRole) => {
    if (msgRole === 'user') return <User size={20} />;
    if (isFoundry) return <Zap    size={20} />;
    if (isLocal)   return <Shield size={20} />;
    return <Bot size={20} />;
  };

  const renderBubbleContent = (msg) => {
    let contentElem;
    if (isFoundry || isLocal) {
      contentElem = <MarkdownMessage content={msg.content} />;
    } else {
      contentElem = <FormattedMessage content={msg.content} insights={msg.insights} userDataSummary={msg.user_data_summary} commandResult={msg.command_result} />;
    }
    return contentElem;
  };
  // Global voice toggle state
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Auto-speak agent response when a new assistant message arrives
  useEffect(() => {
    if (!voiceEnabled) return;
    const latestAssistantMsg = activeMessages.slice().reverse().find(m => m.role === 'assistant' && m.content);
    if (latestAssistantMsg && tts && tts.isSupported) {
      if (tts.speakingMessageId !== (latestAssistantMsg._id || latestAssistantMsg.id)) {
        tts.speak(latestAssistantMsg.content, latestAssistantMsg._id || latestAssistantMsg.id);
      }
    }
  }, [activeMessages, voiceEnabled]);

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="ai-assistant-page">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div className="ai-sidebar">
        <div className="ai-sidebar-header">

          {/* Three-tab switcher */}
          <div className="ai-tab-switcher">
            <button className={`ai-tab-btn ${activeTab === 'doit' ? 'active' : ''}`} onClick={() => setActiveTab('doit')}>
              <Bot size={13} />DOIT-AI
            </button>
            <button className={`ai-tab-btn foundry ${activeTab === 'foundry' ? 'active' : ''}`} onClick={() => setActiveTab('foundry')}>
              <Zap size={13} />Foundry
            </button>
            <button className={`ai-tab-btn local ${activeTab === 'local' ? 'active' : ''}`} onClick={() => setActiveTab('local')}>
              <Shield size={13} />Local
            </button>
          </div>

          <button
            className={`new-chat-btn ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}
            onClick={handleNewChat}
          >
            <Plus size={18} />
            New {isLocal ? 'Private' : isFoundry ? 'Agent' : ''} Chat
          </button>
        </div>

        <div className="conversations-list">
          {activeConvList.length === 0 && <div className="ai-no-convs">No conversations yet</div>}
          {activeConvList.map(conv => (
            <div
              key={conv._id}
              className={`conversation-item ${selectedConv?._id === conv._id ? 'active' : ''} ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}
              onClick={() => setSelectedConv(conv)}
            >
              <div className="conversation-title">{conv.title}</div>
              <div className="conversation-date">{formatTimestamp(conv.updated_at || conv.created_at)}</div>
              <button className="conversation-delete" onClick={(e) => handleDeleteConv(conv._id, e)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="ai-sidebar-footer">
          {isFoundry ? (
            <span className="ai-engine-badge foundry"><Zap size={11} /> Azure AI Foundry</span>
          ) : isLocal ? (
            <span className="ai-engine-badge local"><Shield size={11} /> On-Premise · Ollama</span>
          ) : (
            <span className="ai-engine-badge"><Bot size={11} /> GPT-powered DOIT-AI</span>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ──────────────────────────────────────────────────── */}
      <div className="ai-chat-area">
        <div className={`ai-chat-header ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}>
          <div className="ai-chat-title">
            {tabIcon(activeTab)}
            {tabLabel()}
          </div>
          <div className="ai-header-right">
            {isFoundry && selectedConv && (
              <button className="ai-reset-btn" onClick={resetFoundryThread}>↺ Reset Thread</button>
            )}
            {isLocal && selectedConv && (
              <button className="ai-reset-btn local" onClick={resetLocalHistory}>↺ Clear History</button>
            )}
            {/* Local health pill */}
            {isLocal && localHealth && (
              <div className={`ai-status-badge ${localHealth.healthy ? '' : 'offline'}`}>
                <div className={`ai-status-dot ${localHealth.healthy ? 'local' : 'offline'}`}></div>
                {localHealth.healthy ? `${localHealth.model || 'Ollama'} ready` : 'Ollama offline'}
              </div>
            )}
            <div className="ai-status-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className={`ai-status-dot ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}></div>
              {isLocal ? (localHealth && localHealth.healthy ? `${localHealth.model || 'Ollama'} ready` : 'Ollama offline') : 'Online'}
              {/* Global voice toggle button (now always visible) */}
              <button
                className={`voice-toggle-btn${voiceEnabled ? ' enabled' : ''}`}
                style={{ marginLeft: 8, border: 'none', background: 'none', cursor: 'pointer' }}
                title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                onClick={() => {
                  setVoiceEnabled(v => {
                    const newVal = !v;
                    if (!newVal && tts && tts.isSpeaking) {
                      tts.stop(); // Instantly mute if toggled off
                    }
                    return newVal;
                  });
                }}
              >
                {voiceEnabled ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="ai-messages-container">
          {activeMessages.length === 0 ? (
            <div className="ai-empty-state">
              <div className={`ai-empty-icon ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}>
                {isFoundry ? <Zap size={52} color="#7C3AED" /> : isLocal ? <Shield size={52} color="#059669" /> : <Bot size={52} color="#667eea" />}
              </div>
              <div className="ai-empty-title">
                {isFoundry ? 'Azure AI Foundry Agent' : isLocal ? 'Local AI — 100% On-Premise' : 'Welcome to DOIT AI Assistant'}
              </div>
              <div className="ai-empty-subtitle">
                {isFoundry
                  ? 'Pre-configured with your DOIT context, Foundry tools, and full multi-turn memory. Ask about your tasks, projects, sprints, or anything else.'
                  : isLocal
                  ? `Powered by Ollama + LlamaIndex + ChromaDB. All data stays on your infrastructure — nothing is sent to external APIs. RAG retrieves relevant context from your live DOIT data.${localHealth && !localHealth.healthy ? `\n\n⚠️ ${localHealth.error}` : ''}`
                  : 'Get personalized insights, task analytics, and intelligent recommendations based on your project data and team performance. I can also help you create, assign, and manage tasks automatically!'}
              </div>
              {isLocal && localHealth && !localHealth.healthy && (
                <div className="ai-local-offline-banner">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Ollama not reachable</strong>
                    <p>Start Ollama: <code>ollama serve</code> · Pull model: <code>ollama pull llama3</code></p>
                  </div>
                </div>
              )}
              <div className="ai-suggestion-chips">
                {suggestions.map((prompt, idx) => (
                  <div
                    key={idx}
                    className={`ai-suggestion-chip ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}
                    onClick={() => setInputText(prompt)}
                  >
                    {prompt}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeMessages.map((msg, idx) => (
                <div key={msg._id || idx} className={`ai-message ${msg.role}`}>
                  <div className={`ai-message-avatar ${avatarClass(msg.role)}`}>
                    {renderAvatar(msg.role)}
                  </div>
                  <div className="ai-message-content">
                    <div className="ai-message-bubble">
                      {renderBubbleContent(msg)}
                    </div>
                    {msg.image_url && (
                      <div className="ai-message-image">
                        <img src={`${API_BASE}${msg.image_url}`} alt="Generated" />
                      </div>
                    )}
                    {/* RAG badge (Local only) */}
                    {isLocal && msg.role === 'assistant' && msg.rag_used && (
                      <div className="ai-rag-badge">
                        <Shield size={10} /> RAG · {msg.model}
                      </div>
                    )}
                    {/* Token badge */}
                    {(isFoundry || isLocal) && msg.tokens_used > 0 && (
                      <div className="ai-token-badge">{msg.tokens_used} tokens</div>
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
                  <div className={`ai-message-avatar ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}>
                    {isFoundry ? <Zap size={20} /> : isLocal ? <Shield size={20} /> : <Bot size={20} />}
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

        {/* ── Input area ────────────────────────────────────────────────────── */}
        <div className="ai-input-area">
          {/* DOIT-AI action buttons */}
          {!isFoundry && !isLocal && (
            <div className="ai-input-actions">
              <button className="ai-action-btn" onClick={generateImage} disabled={isLoading || !inputText.trim()} title="Generate an image">
                <Image size={16} /> Generate Image
              </button>
              <button className="ai-action-btn" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Upload a file">
                <Paperclip size={16} /> Upload File
              </button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload}
                accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.csv,.json" />
            </div>
          )}

          {/* Foundry info strip */}
          {isFoundry && (
            <div className="ai-foundry-strip">
              <Zap size={12} />
              Foundry Agent has live access to your tasks, projects &amp; sprints via context injection
            </div>
          )}

          {/* Local info strip */}
          {isLocal && (
            <div className="ai-local-strip">
              <Shield size={12} />
              Private &amp; on-premise · Ollama LLM · ChromaDB RAG · no data leaves your network
            </div>
          )}

          <div className="ai-input-container">
            <div className="ai-textarea-wrapper">
              <textarea
                ref={textareaRef}
                className={`ai-textarea ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}
                placeholder={
                  isFoundry ? 'Message the Foundry Agent… (Shift+Enter for newline)'
                  : isLocal  ? 'Message the local Ollama model… (Shift+Enter for newline)'
                  : uploadedFile ? `Ask about "${uploadedFile}"...`
                  : "Ask me anything or give me commands like 'Create a task for...' or 'Show my tasks'"
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                rows={1}
              />
              <MicButton inputText={inputText} setInputText={setInputText} variant="doit" disabled={isLoading} />
            </div>
            <button
              className={`ai-send-btn ${isFoundry ? 'foundry' : isLocal ? 'local' : ''}`}
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
// (intentional empty — file complete above)