// /**
//  * localAgentAPI.js
//  * Frontend service layer for the Local AI Agent (Ollama + LlamaIndex + ChromaDB)
//  * Deploy to: frontend/src/services/localAgentAPI.js
//  */

// const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// const getTabSessionKey = () => {
//   let key = sessionStorage.getItem('tab_session_key');
//   if (!key) {
//     key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
//     sessionStorage.setItem('tab_session_key', key);
//   }
//   return key;
// };

// const getHeaders = () => ({
//   Authorization: `Bearer ${localStorage.getItem('token')}`,
//   'X-Tab-Session-Key': getTabSessionKey(),
//   'Content-Type': 'application/json',
// });

// const BASE = `${API_BASE}/api/local-agent`;

// export const localAgentAPI = {
//   // ── Conversations ──────────────────────────────────────────────────────────
//   createConversation: (title = 'Local AI Chat') =>
//     fetch(`${BASE}/conversations`, {
//       method: 'POST',
//       headers: getHeaders(),
//       body: JSON.stringify({ title }),
//     }).then(r => r.json()),

//   listConversations: () =>
//     fetch(`${BASE}/conversations`, { headers: getHeaders() }).then(r => r.json()),

//   getMessages: (conversationId) =>
//     fetch(`${BASE}/conversations/${conversationId}/messages`, {
//       headers: getHeaders(),
//     }).then(r => r.json()),

//   deleteConversation: (conversationId) =>
//     fetch(`${BASE}/conversations/${conversationId}`, {
//       method: 'DELETE',
//       headers: getHeaders(),
//     }).then(r => r.json()),

//   // ── Send message ───────────────────────────────────────────────────────────
//   sendMessage: (conversationId, content, includeUserContext = true) =>
//     fetch(`${BASE}/conversations/${conversationId}/messages`, {
//       method: 'POST',
//       headers: getHeaders(),
//       body: JSON.stringify({ content, include_user_context: includeUserContext }),
//     }).then(r => r.json()),

//   // ── History management ─────────────────────────────────────────────────────
//   resetHistory: () =>
//     fetch(`${BASE}/reset-history`, {
//       method: 'POST',
//       headers: getHeaders(),
//     }).then(r => r.json()),

//   getHistory: () =>
//     fetch(`${BASE}/history`, { headers: getHeaders() }).then(r => r.json()),

//   // ── Health ─────────────────────────────────────────────────────────────────
//   health: () =>
//     fetch(`${BASE}/health`, { headers: getHeaders() }).then(r => r.json()),
// };
// frontend/src/services/localAgentAPI.js
/**
 * Frontend service layer for the Local AI Agent (Ollama + LlamaIndex + ChromaDB)
 */

const API_BASE = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getTabSessionKey = () => {
  let key = sessionStorage.getItem('tab_session_key');
  if (!key) {
    key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
    sessionStorage.setItem('tab_session_key', key);
  }
  return key;
};

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'X-Tab-Session-Key': getTabSessionKey(),
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
});

const BASE = `${API_BASE}/api/local-agent`;

export const localAgentAPI = {

  createConversation: async (title = 'Local AI Chat') => {
    const res = await fetch(`${BASE}/conversations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Failed to create conversation');
    return data;
  },

  listConversations: async () => {
    const res = await fetch(`${BASE}/conversations`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Failed to list conversations');
    return data;
  },

  getMessages: async (conversationId) => {
    const res = await fetch(`${BASE}/conversations/${conversationId}/messages`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Failed to get messages');
    return data;
  },

  deleteConversation: async (conversationId) => {
    const res = await fetch(`${BASE}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Failed to delete conversation');
    return data;
  },

  sendMessage: async (conversationId, content, includeUserContext = true) => {
    const res = await fetch(`${BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content, include_user_context: includeUserContext }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Failed to send message');
    return data;
  },

  resetHistory: async () => {
    const res = await fetch(`${BASE}/reset-history`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Failed to reset history');
    return data;
  },

  getHistory: async () => {
    const res = await fetch(`${BASE}/history`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Failed to get history');
    return data;
  },

  health: async () => {
    const res = await fetch(`${BASE}/health`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Health check failed');
    return data;
  },
};

export default localAgentAPI;