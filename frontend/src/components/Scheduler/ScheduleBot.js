import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAuthHeaders } from '../../services/api';
import './ScheduleBot.css';

const SchedulerBot = ({ meetings, onMeetingsUpdate, selectedDate }) => {
  const [messages, setMessages] = useState([
    { 
      text: "Hi! I can help you book meetings, update schedules, or get meeting details. Try asking: 'Book a meeting tomorrow at 2 PM with John'", 
      isUser: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:5000/api/schedule-agent/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: input,
          conversationHistory: messages.slice(-10) // Send last 10 messages as history
        })
      });

      const data = await response.json();
      const normalizedResponse = (data.response || "").replace(/\n{3,}/g, "\n\n");
      const aiMessage = { text: normalizedResponse, isUser: false };
      setMessages(prev => [...prev, aiMessage]);
      
      // Refresh meetings if AI performed an action
      if (data.actionPerformed || data.action_performed) {
        onMeetingsUpdate();
      }
    } catch (error) {
      console.error('Error communicating with AI:', error);
      const errorMessage = { text: 'Sorry, I encountered an error. Please try again.', isUser: false };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="ai-avatar">🤖</div>
        <div>
          <h3>ScheduleAI Assistant</h3>
          <span>Online</span>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.isUser ? 'user' : 'ai'}`}>
            <div className="message-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noreferrer" />
                  ),
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="message ai">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask me to book a meeting, update schedule, or get details..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default SchedulerBot;