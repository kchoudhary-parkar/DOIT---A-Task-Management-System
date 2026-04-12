import { requestCache } from '../utils/requestCache';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://doit-a-task-management-system-j593.onrender.com';

const getToken = () => localStorage.getItem("token");

const getTabSessionKey = () => {
  let key = sessionStorage.getItem("tab_session_key");

  if (!key) {
    key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
    sessionStorage.setItem("tab_session_key", key);
  }

  return key;
};

const getAuthHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  headers["X-Tab-Session-Key"] = getTabSessionKey();

  return headers;
};

export const agentAPI = {
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

    requestCache.invalidatePattern('tasks:');
    requestCache.invalidatePattern('dashboard:');

    return data;
  },

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

  getProjectInsights: async (projectId) => {
    const cacheKey = `agent:insights:${projectId}`;
    const cached = requestCache.get(cacheKey);
    if (cached) return cached;

    const response = await fetch(`${API_BASE_URL}/api/agent/project-insights/${projectId}`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to get project insights');

    requestCache.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  },

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

  clearCache: (context = null) => {
    if (context) {
      requestCache.invalidatePattern(`agent:${context}:`);
    } else {
      requestCache.invalidatePattern('agent:');
    }
  }
};

export default agentAPI;