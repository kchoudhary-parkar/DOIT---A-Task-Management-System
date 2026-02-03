import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader, Sparkles, TrendingUp, Calendar, CheckCircle, AlertCircle, Minimize2, BarChart3, PieChart } from 'lucide-react';

const AIChatbot = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi ${user?.name || 'there'}! 👋 I'm your AI productivity assistant. Ask me anything about your tasks!`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const quickPrompts = [
    { icon: <TrendingUp size={12} />, text: "Summary", query: "Give me a summary of my tasks" },
    { icon: <Calendar size={12} />, text: "Deadlines", query: "What are my upcoming deadlines?" },
    { icon: <CheckCircle size={12} />, text: "Progress", query: "How is my progress?" },
    { icon: <BarChart3 size={12} />, text: "Analytics", query: "Show me visual analytics" },
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const tabKey = sessionStorage.getItem('tab_session_key');
      const response = await fetch('http://localhost:8000/api/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'X-Tab-Session-Key': tabKey,
        },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages.slice(-10),
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.response || "Here's what I found...",
          timestamp: new Date(),
          insights: data.insights || [],
          data: data.data,
          visualizations: detectVisualizationNeeds(input, data.data),
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const detectVisualizationNeeds = (query, userData) => {
    const visualKeywords = ['show', 'visual', 'chart', 'graph', 'analytics', 'distribution', 'breakdown'];
    const queryLower = query.toLowerCase();
    
    const needsVisualization = visualKeywords.some(keyword => queryLower.includes(keyword));
    
    if (!needsVisualization || !userData) return null;

    return {
      taskStatus: userData.stats?.tasks?.statusBreakdown,
      taskPriority: userData.stats?.tasks?.priorityBreakdown,
      completionTrend: {
        week: userData.stats?.tasks?.completedWeek,
        month: userData.stats?.tasks?.completedMonth,
      },
    };
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (query) => {
    setInput(query);
    setTimeout(() => handleSend(), 80);
  };

  // Compact Status Chart
  const renderStatusChart = (statusData) => {
    const total = Object.values(statusData).reduce((sum, val) => sum + val, 0);
    const statuses = [
      { key: 'To Do', color: '#94a3b8', value: statusData['To Do'] || 0 },
      { key: 'In Progress', color: '#3b82f6', value: statusData['In Progress'] || 0 },
      { key: 'Done', color: '#10b981', value: statusData['Done'] || 0 },
      { key: 'Closed', color: '#8b5cf6', value: statusData['Closed'] || 0 },
    ].filter(s => s.value > 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {statuses.map(status => {
          const percentage = total > 0 ? (status.value / total) * 100 : 0;
          return (
            <div key={status.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '65px', fontSize: '10px', fontWeight: 600, color: '#64748b' }}>
                {status.key}
              </div>
              <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  background: status.color,
                  borderRadius: '6px',
                  transition: 'width 0.5s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '6px',
                }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'white' }}>
                    {status.value}
                  </span>
                </div>
              </div>
              <div style={{ width: '32px', fontSize: '9px', fontWeight: 600, color: '#64748b', textAlign: 'right' }}>
                {percentage.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Compact Priority Chart
  const renderPriorityChart = (priorityData) => {
    const total = Object.values(priorityData).reduce((sum, val) => sum + val, 0);
    const priorities = [
      { key: 'High', color: '#ef4444', emoji: '🔴', value: priorityData['High'] || 0 },
      { key: 'Medium', color: '#f59e0b', emoji: '🟡', value: priorityData['Medium'] || 0 },
      { key: 'Low', color: '#10b981', emoji: '🟢', value: priorityData['Low'] || 0 },
    ].filter(p => p.value > 0);

    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {priorities.map(priority => {
          const percentage = total > 0 ? (priority.value / total) * 100 : 0;
          return (
            <div key={priority.key} style={{
              flex: '1 1 calc(33% - 4px)',
              background: `${priority.color}10`,
              border: `1.5px solid ${priority.color}`,
              borderRadius: '8px',
              padding: '8px 6px',
              textAlign: 'center',
              minWidth: '70px',
            }}>
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>{priority.emoji}</div>
              <div style={{ fontSize: '9px', fontWeight: 600, color: priority.color, marginBottom: '1px' }}>
                {priority.key}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: priority.color, marginBottom: '1px' }}>
                {priority.value}
              </div>
              <div style={{ fontSize: '8px', fontWeight: 500, color: '#64748b' }}>
                {percentage.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Compact Completion Trend
  const renderCompletionTrend = (trendData) => {
    const maxValue = Math.max(trendData.week, trendData.month, 1);
    
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, color: '#10b981' }}>This Week</div>
          <div style={{
            width: '100%',
            height: '80px',
            background: '#f0fdf4',
            borderRadius: '6px',
            border: '1.5px solid #10b981',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '4px',
          }}>
            <div style={{
              height: `${(trendData.week / maxValue) * 100}%`,
              background: 'linear-gradient(180deg, #10b981, #059669)',
              borderRadius: '3px',
              transition: 'height 0.5s ease',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '2px',
              minHeight: '20px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
                {trendData.week}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '8px', color: '#64748b' }}>tasks completed</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, color: '#3b82f6' }}>This Month</div>
          <div style={{
            width: '100%',
            height: '80px',
            background: '#eff6ff',
            borderRadius: '6px',
            border: '1.5px solid #3b82f6',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '4px',
          }}>
            <div style={{
              height: `${(trendData.month / maxValue) * 100}%`,
              background: 'linear-gradient(180deg, #3b82f6, #2563eb)',
              borderRadius: '3px',
              transition: 'height 0.5s ease',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '2px',
              minHeight: '20px',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
                {trendData.month}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '8px', color: '#64748b' }}>tasks completed</div>
        </div>
      </div>
    );
  };

  const renderVisualizations = (visualizations) => {
    if (!visualizations) return null;

    return (
      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {visualizations.taskStatus && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(139, 92, 246, 0.04))',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(99, 102, 241, 0.15)',
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 600, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📊 Task Status
            </h4>
            {renderStatusChart(visualizations.taskStatus)}
          </div>
        )}

        {visualizations.taskPriority && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.04), rgba(251, 146, 60, 0.04))',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🎯 Priority
            </h4>
            {renderPriorityChart(visualizations.taskPriority)}
          </div>
        )}

        {visualizations.completionTrend && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04), rgba(5, 150, 105, 0.04))',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.15)',
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📈 Completion
            </h4>
            {renderCompletionTrend(visualizations.completionTrend)}
          </div>
        )}
      </div>
    );
  };

  const renderInsights = (insights) => {
    if (!insights || insights.length === 0) return null;

    return (
      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {insights.map((insight, idx) => (
          <div
            key={idx}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              borderLeft: '2px solid',
              background: getInsightBg(insight.type),
              borderLeftColor: getInsightColor(insight.type),
              fontSize: '11px',
              color: getInsightTextColor(insight.type),
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '2px', fontSize: '10px' }}>
              {insight.icon} {insight.title}
            </div>
            <div style={{ opacity: 0.9, fontSize: '10px' }}>
              {insight.description}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getInsightColor = (type) => {
    switch(type) {
      case 'warning': return '#ef4444';
      case 'success': return '#10b981';
      case 'info': return '#3b82f6';
      default: return '#8b5cf6';
    }
  };

  const getInsightBg = (type) => {
    switch(type) {
      case 'warning': return '#fef2f2';
      case 'success': return '#f0fdf4';
      case 'info': return '#eff6ff';
      default: return '#faf5ff';
    }
  };

  const getInsightTextColor = (type) => {
    switch(type) {
      case 'warning': return '#991b1b';
      case 'success': return '#065f46';
      case 'info': return '#0c4a6e';
      default: return '#4c1d95';
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
          cursor: 'pointer',
          zIndex: 1000,
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.4)';
        }}
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Compact Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isMinimized ? '-420px' : '85px',
            right: '20px',
            width: '360px',
            maxWidth: 'calc(100vw - 40px)',
            height: '480px',
            maxHeight: 'calc(100vh - 110px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '14px',
            overflow: 'hidden',
            background: 'white',
            border: '1px solid #e5e7eb',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
            zIndex: 999,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Compact Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '10px 14px',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                AI Assistant
              </h3>
              <p style={{ margin: 0, fontSize: '10px', opacity: 0.9 }}>
                DOIT AI
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '5px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <Minimize2 size={13} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '5px',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: '#f9fafb',
                }}
              >
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '8px 11px',
                        borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : msg.isError
                          ? '#fee2e2'
                          : 'white',
                        color: msg.role === 'user' ? 'white' : msg.isError ? '#dc2626' : '#1f2937',
                        fontSize: '12px',
                        lineHeight: '1.4',
                        boxShadow: msg.role === 'assistant' && !msg.isError ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                      {msg.insights && msg.insights.length > 0 && renderInsights(msg.insights)}
                      {msg.visualizations && renderVisualizations(msg.visualizations)}
                    </div>
                    <span
                      style={{
                        fontSize: '9px',
                        color: '#9ca3af',
                        marginTop: '3px',
                        marginLeft: msg.role === 'user' ? 0 : '4px',
                        marginRight: msg.role === 'user' ? '4px' : 0,
                      }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {isLoading && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    padding: '8px 11px',
                    background: 'white',
                    borderRadius: '12px 12px 12px 2px',
                    maxWidth: '100px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                  }}>
                    <Loader size={12} style={{ animation: 'spin 1s linear infinite', color: '#667eea' }} />
                    <span style={{ fontSize: '11px', color: '#667eea', fontWeight: 500 }}>
                      Thinking...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Compact Quick Prompts */}
              {messages.length === 1 && !isLoading && (
                <div style={{
                  padding: '8px 12px',
                  borderTop: '1px solid #e5e7eb',
                  background: 'white',
                }}>
                  <p style={{ 
                    fontSize: '9px', 
                    color: '#6b7280', 
                    margin: '0 0 6px 0',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}>
                    Quick Actions
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                    {quickPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickPrompt(prompt.query)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          background: 'white',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#6b7280',
                          transition: 'all 0.2s',
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#667eea';
                          e.currentTarget.style.color = '#667eea';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.color = '#6b7280';
                        }}
                      >
                        <div style={{ color: '#667eea', display: 'flex' }}>
                          {prompt.icon}
                        </div>
                        {prompt.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Compact Input */}
              <div
                style={{
                  padding: '10px 12px',
                  borderTop: '1px solid #e5e7eb',
                  background: 'white',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'center',
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your tasks..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '8px 11px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                    outline: 'none',
                    background: '#f9fafb',
                    color: '#1f2937',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.background = 'white';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.background = '#f9fafb';
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    background: input.trim() && !isLoading
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : '#e5e7eb',
                    color: 'white',
                    cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default AIChatbot;