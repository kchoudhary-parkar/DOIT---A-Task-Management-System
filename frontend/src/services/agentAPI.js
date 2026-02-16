// frontend/src/services/agentAPI.js
import { requestCache } from '../utils/requestCache';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Get token from localStorage
const getToken = () => localStorage.getItem("token");

// Generate or get unique per-tab session key
const getTabSessionKey = () => {
  let key = sessionStorage.getItem("tab_session_key");
  
  if (!key) {
    key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
    sessionStorage.setItem("tab_session_key", key);
  }
  
  return key;
};

// Helper to get auth headers
const getAuthHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  headers["X-Tab-Session-Key"] = getTabSessionKey();
  
  return headers;
};

// Azure AI Agent API
export const agentAPI = {
  /**
   * Send a message to the AI agent
   * @param {string} message - User message
   * @param {string} threadId - Optional thread ID for conversation continuity
   * @param {string} userEmail - User's email for RBAC
   * @returns {Promise} Agent response with threadId
   */
  chat: async (message, threadId = null, userEmail = null) => {
    const response = await fetch(`${API_BASE_URL}/api/agent/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        threadId,
        userEmail
      })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to send message to agent');
    return data;
  },

  /**
   * Get conversation history for a thread
   * @param {string} threadId - Thread ID
   * @returns {Promise} Array of messages
   */
  getHistory: async (threadId) => {
    const response = await fetch(
      `${API_BASE_URL}/api/agent/history?threadId=${threadId}`,
      {
        headers: getAuthHeaders()
      }
    );
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch conversation history');
    return data;
  },

  /**
   * Create a task using natural language
   * @param {string} prompt - Natural language task description
   * @param {string} userEmail - User's email
   * @returns {Promise} Created task data
   */
  createTaskNL: async (prompt, userEmail) => {
    const response = await fetch(`${API_BASE_URL}/api/agent/create-task-nl`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        prompt,
        userEmail
      })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create task via AI');
    
    // Invalidate task caches
    requestCache.invalidatePattern('tasks:');
    requestCache.invalidatePattern('dashboard:');
    
    return data;
  },

  /**
   * Get AI suggestions for task assignment
   * @param {string} taskDescription - Task description
   * @param {string} projectId - Project ID
   * @returns {Promise} Suggested assignees
   */
  suggestAssignee: async (taskDescription, projectId) => {
    const response = await fetch(`${API_BASE_URL}/api/agent/suggest-assignee`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        taskDescription,
        projectId
      })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get assignee suggestions');
    return data;
  },

  /**
   * Get AI-powered project insights
   * @param {string} projectId - Project ID
   * @returns {Promise} Project insights and recommendations
   */
  getProjectInsights: async (projectId) => {
    const cacheKey = `agent:insights:${projectId}`;
    const cached = requestCache.get(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/api/agent/project-insights/${projectId}`, {
      headers: getAuthHeaders()
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get project insights');
    
    // Cache for 5 minutes
    requestCache.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  },

  /**
   * Stream AI responses (for real-time chat)
   * @param {string} message - User message
   * @param {string} threadId - Thread ID
   * @param {string} userEmail - User's email
   * @param {function} onChunk - Callback for each chunk
   * @returns {Promise} Final response
   */
  streamChat: async (message, threadId, userEmail, onChunk) => {
    const response = await fetch(`${API_BASE_URL}/api/agent/stream`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        threadId,
        userEmail
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to stream chat');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          if (data.status) {
            onChunk({ type: 'status', status: data.status });
          }
          
          if (data.response) {
            result = data.response;
            onChunk({ type: 'response', response: data.response, threadId: data.threadId });
          }
        }
      }
    }

    return result;
  },

  /**
   * Clear agent cache for a specific context
   * @param {string} context - Context to clear (e.g., 'insights', 'suggestions')
   */
  clearCache: (context = null) => {
    if (context) {
      requestCache.invalidatePattern(`agent:${context}:`);
    } else {
      requestCache.invalidatePattern('agent:');
    }
  }
};

export default agentAPI;