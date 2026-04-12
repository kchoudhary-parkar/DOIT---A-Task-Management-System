import { requestCache, cachedFetch, createCacheKey } from '../utils/requestCache';
import { agentAPI } from './agentAPI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://doit-a-task-management-system-j593.onrender.com';

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

// Helper to get auth headers (always includes tab key + ngrok bypass)
export const getAuthHeaders = () => {
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

// Helper for multipart/file upload headers (no Content-Type for FormData)
const getUploadHeaders = () => {
  const token = getToken();
  const headers = {
    "ngrok-skip-browser-warning": "true",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  headers["X-Tab-Session-Key"] = getTabSessionKey();
  return headers;
};

export const documentIntelligenceAPI = {
  analyzeFile: async (file, question = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (question) formData.append('question', question);

    const response = await fetch(`${API_BASE_URL}/api/document-intelligence/analyze`, {
      method: 'POST',
      headers: getUploadHeaders(),
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error || 'Analysis failed');
    return data;
  },

  analyzeUrl: async (url, question = '') => {
    const formData = new FormData();
    formData.append('url', url);
    if (question) formData.append('question', question);

    const response = await fetch(`${API_BASE_URL}/api/document-intelligence/analyze`, {
      method: 'POST',
      headers: getUploadHeaders(),
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error || 'Analysis failed');
    return data;
  },

  exportPdf: async (report) => {
    const response = await fetch(`${API_BASE_URL}/api/document-intelligence/export-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(report)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'PDF export failed');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insights_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true };
  },

  checkHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/api/document-intelligence/health`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Health check failed');
    return data;
  }
};

// Data Visualization API
export const dataVizAPI = {
  uploadDataset: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/data-viz/upload`, {
      method: 'POST',
      headers: getUploadHeaders(),
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to upload dataset');
    return data;
  },

  getDatasets: async () => {
    const response = await fetch(`${API_BASE_URL}/api/data-viz/datasets`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch datasets');
    return data;
  },

  analyzeDataset: async (datasetId) => {
    const response = await fetch(`${API_BASE_URL}/api/data-viz/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dataset_id: datasetId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to analyze dataset');
    return data;
  },

  visualizeDataset: async (datasetId, config) => {
    const response = await fetch(`${API_BASE_URL}/api/data-viz/visualize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        dataset_id: datasetId,
        config: config
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create visualization');
    return data;
  },

  downloadVisualization: (vizId, format = 'png') => {
    const url = `${API_BASE_URL}/api/data-viz/download/${vizId}?format=${format}`;
    window.open(url, '_blank');
  }
};

export const chatAPI = {
  getUserProjects: async () => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/projects`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch chat projects");
    return data;
  },

  getProjectChannels: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/projects/${projectId}/channels`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch channels");
    return data;
  },

  getChannelMessages: async (channelId, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/messages?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch messages");
    return data;
  },

  sendMessage: async (channelId, messageData) => {
    const payload = typeof messageData === 'string'
      ? { text: messageData }
      : messageData;

    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to send message");
    return data;
  },

  createChannel: async (projectId, channelData) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/projects/${projectId}/channels`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(channelData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create channel");
    return data;
  },

  deleteChannel: async (channelId) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to delete channel");
    return data;
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/stats`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch chat stats");
    return data;
  },

  addReaction: async (channelId, messageId, emojiData) => {
    const payload = typeof emojiData === 'string'
      ? { emoji: emojiData }
      : emojiData;

    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add reaction');
    }

    return await response.json();
  },

  removeReaction: async (channelId, messageId, emoji) => {
    return chatAPI.addReaction(channelId, messageId, emoji);
  },

  editMessage: async (channelId, messageId, messageData) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/messages/${messageId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to edit message');
    }

    return await response.json();
  },

  updateMessage: async (channelId, messageId, messageData) => {
    return chatAPI.editMessage(channelId, messageId, messageData);
  },

  deleteMessage: async (channelId, messageId) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete message');
    }

    return await response.json();
  },

  getThreadReplies: async (channelId, messageId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/api/team-chat/channels/${channelId}/messages/${messageId}/replies${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch thread replies');
    }

    return await response.json();
  },

  getMessageThread: async (channelId, messageId) => {
    return chatAPI.getThreadReplies(channelId, messageId);
  },

  postThreadReply: async (channelId, messageId, replyData) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/messages/${messageId}/replies`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(replyData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to post thread reply');
    }

    return await response.json();
  },

  uploadAttachment: async (fileOrFormData) => {
    let formData;

    if (fileOrFormData instanceof FormData) {
      formData = fileOrFormData;
    } else {
      formData = new FormData();
      formData.append('file', fileOrFormData);
    }

    const response = await fetch(`${API_BASE_URL}/api/team-chat/upload`, {
      method: 'POST',
      headers: getUploadHeaders(),
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    return await response.json();
  },

  getMentions: async () => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/mentions`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch mentions');
    }

    return await response.json();
  },

  getUserMentions: async () => {
    return chatAPI.getMentions();
  },

  searchMessages: async (channelId, query) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/search/${channelId}?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search messages');
    }

    return await response.json();
  },

  markAsRead: async (channelId, messageIds) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message_ids: messageIds })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark as read');
    }

    return await response.json();
  }
};

// Auth API calls
export const authAPI = {
  register: async (name, email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Registration failed");
    return data;
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  oauthSync: async (provider, idToken) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/oauth-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({
        provider: provider,
        id_token: idToken,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "OAuth sync failed");
    return data;
  },

  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to get profile");
    return data;
  },
};

// Dashboard API calls with caching
export const dashboardAPI = {
  getBootstrap: async (options = {}) => {
    const { forceRefresh = false } = options;
    const cacheKey = 'dashboard:bootstrap';

    if (!forceRefresh) {
      const cached = requestCache.get(cacheKey);
      if (cached) return cached;

      if (requestCache.isPending(cacheKey)) {
        return requestCache.getPending(cacheKey);
      }
    } else {
      requestCache.invalidate(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/dashboard/bootstrap`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch dashboard bootstrap");

      requestCache.set(cacheKey, data);

      if (data.analytics) {
        requestCache.set('dashboard:analytics', { success: true, analytics: data.analytics });
      }
      if (data.report) {
        requestCache.set('dashboard:report', { success: true, report: data.report });
      }
      if (data.pending_approval) {
        requestCache.set('tasks:pending-approval', data.pending_approval);
      }
      if (data.closed_tasks) {
        requestCache.set('tasks:closed', data.closed_tasks);
      }

      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  peekBootstrap: () => requestCache.get('dashboard:bootstrap'),

  getAnalytics: async () => {
    const cacheKey = 'dashboard:analytics';
    const cached = requestCache.get(cacheKey);
    if (cached) return cached;

    if (requestCache.isPending(cacheKey)) {
      return requestCache.getPending(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/dashboard/analytics`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch analytics");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  getReport: async () => {
    const cacheKey = 'dashboard:report';
    const cached = requestCache.get(cacheKey);
    if (cached) return cached;

    if (requestCache.isPending(cacheKey)) {
      return requestCache.getPending(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/dashboard/report`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch report");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  getSystemAnalytics: async () => {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/system`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch system analytics");
    return data;
  },

  clearCache: () => {
    requestCache.invalidatePattern('dashboard:');
    requestCache.invalidate('dashboard:bootstrap');
  }
};

// User API calls
export const userAPI = {
  searchByEmail: async (emailQuery) => {
    const response = await fetch(
      `${API_BASE_URL}/api/users/search?email=${encodeURIComponent(emailQuery)}`,
      {
        headers: getAuthHeaders(),
      }
    );
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to search users");
    return data;
  },

  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch users");
    return data;
  },

  getUserManagementData: async () => {
    const response = await fetch(`${API_BASE_URL}/api/users/management`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch user management data");
    return data;
  },

  updateUserRole: async (userId, role) => {
    const response = await fetch(`${API_BASE_URL}/api/users/role`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, role }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update user role");
    return data;
  },

  deleteUser: async (userId, confirmationText) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ confirmation_text: confirmationText }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to delete user");
    return data;
  },

  getAdminProjects: async (adminUserId) => {
    const response = await fetch(`${API_BASE_URL}/api/users/admins/${adminUserId}/projects`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch admin projects");
    return data;
  },
};

// Project API calls
export const projectAPI = {
  getAll: async (options = {}) => {
    const { forceRefresh = false } = options;
    const cacheKey = 'projects:all';

    if (!forceRefresh) {
      const cached = requestCache.get(cacheKey);
      if (cached) return cached;

      if (requestCache.isPending(cacheKey)) {
        return requestCache.getPending(cacheKey);
      }
    } else {
      requestCache.invalidate(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/projects`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch projects");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  peekAll: () => requestCache.get('projects:all'),

  getById: async (projectId) => {
    const cacheKey = `project:${projectId}`;
    const cached = requestCache.get(cacheKey);
    if (cached) return cached;

    if (requestCache.isPending(cacheKey)) {
      return requestCache.getPending(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch project");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  create: async (projectData) => {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create project");
    requestCache.invalidate('projects:all');
    requestCache.invalidatePattern('dashboard:');
    return data;
  },

  update: async (projectId, projectData) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update project");
    requestCache.invalidate('projects:all');
    requestCache.invalidate(`project:${projectId}`);
    requestCache.invalidatePattern('dashboard:');
    return data;
  },

  delete: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to delete project");
    requestCache.invalidate('projects:all');
    requestCache.invalidate(`project:${projectId}`);
    requestCache.invalidate(`tasks:project:${projectId}`);
    requestCache.invalidatePattern('dashboard:');
    return data;
  },
};

// Member API calls
export const memberAPI = {
  addMember: async (projectId, email) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/members`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to add member");
    requestCache.invalidate(`members:project:${projectId}`);
    return data;
  },

  getMembers: async (projectId, options = {}) => {
    const { forceRefresh = false } = options;
    const cacheKey = `members:project:${projectId}`;
    if (!forceRefresh) {
      const cached = requestCache.get(cacheKey);
      if (cached) return cached;

      if (requestCache.isPending(cacheKey)) {
        return requestCache.getPending(cacheKey);
      }
    } else {
      requestCache.invalidate(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/projects/${projectId}/members`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch members");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  peekMembers: (projectId) => requestCache.get(`members:project:${projectId}`),

  prefetchMembers: (projectId) => memberAPI.getMembers(projectId).catch(() => null),

  removeMember: async (projectId, userId) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to remove member");
    requestCache.invalidate(`members:project:${projectId}`);
    return data;
  },
};

// Task API calls
export const taskAPI = {
  create: async (projectId, taskData) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...taskData,
        project_id: projectId,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create task");
    requestCache.invalidate(`tasks:project:${projectId}`);
    requestCache.invalidatePattern('dashboard:');
    requestCache.invalidatePattern('tasks:');
    return data;
  },

  getByProject: async (projectId) => {
    const cacheKey = `tasks:project:${projectId}`;
    const cached = requestCache.get(cacheKey);
    if (cached) return cached;

    if (requestCache.isPending(cacheKey)) {
      return requestCache.getPending(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/tasks/project/${projectId}`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch tasks");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  getById: async (taskId) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch task");
    return data;
  },

  getMyTasks: async (options = {}) => {
    const { forceRefresh = false } = options;
    const cacheKey = 'tasks:my';

    if (!forceRefresh) {
      const cached = requestCache.get(cacheKey);
      if (cached) return cached;

      if (requestCache.isPending(cacheKey)) {
        return requestCache.getPending(cacheKey);
      }
    } else {
      requestCache.invalidate(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/tasks/my`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch tasks");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  peekMyTasks: () => requestCache.get('tasks:my'),

  update: async (taskId, taskData) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData),
    });

    let data = null;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      // Some proxies/servers can return non-JSON on success.
      data = {};
    }

    if (!response.ok) {
      const errorMessage =
        data?.error || data?.detail || data?.message || "Failed to update task";
      throw new Error(errorMessage);
    }

    requestCache.invalidatePattern('tasks:');
    requestCache.invalidatePattern('dashboard:');
    return data;
  },

  delete: async (taskId) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to delete task");
    requestCache.invalidatePattern('tasks:');
    requestCache.invalidatePattern('dashboard:');
    return data;
  },

  addLabel: async (taskId, label) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/labels`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ label }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to add label");
    return data;
  },

  removeLabel: async (taskId, label) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/labels/${encodeURIComponent(label)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to remove label");
    return data;
  },

  addAttachment: async (taskId, attachmentData) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/attachments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(attachmentData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to add attachment");
    return data;
  },

  removeAttachment: async (taskId, attachmentUrl) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/attachments`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({ url: attachmentUrl }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to remove attachment");
    return data;
  },

  addLink: async (taskId, linkData) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/links`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(linkData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to add link");
    return data;
  },

  removeLink: async (taskId, linkedTicketId, linkType) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/links`, {
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        linked_task_id: linkedTicketId,
        type: linkType
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to remove link");
    return data;
  },

  approveTask: async (taskId) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/approve`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to approve task");
    requestCache.invalidate('tasks:pending-approval');
    requestCache.invalidate('tasks:closed');
    requestCache.invalidatePattern('dashboard:');
    return data;
  },

  getDoneTasksForApproval: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks/done`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch done tasks");
    return data;
  },

  getAllPendingApprovalTasks: async () => {
    const cacheKey = 'tasks:pending-approval';
    const cached = requestCache.get(cacheKey);
    if (cached) return cached;

    if (requestCache.isPending(cacheKey)) {
      return requestCache.getPending(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/tasks/pending-approval`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch pending approval tasks");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  getAllClosedTasks: async () => {
    const cacheKey = 'tasks:closed';
    const cached = requestCache.get(cacheKey);
    if (cached) return cached;

    if (requestCache.isPending(cacheKey)) {
      return requestCache.getPending(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/tasks/closed`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch closed tasks");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  addComment: async (taskId, comment) => {
    if (!comment?.trim()) {
      throw new Error("Comment cannot be empty");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ comment: comment.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error("addComment failed:", err);
      throw err;
    }
  },

  getGitActivity: async (taskId) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/git-activity/${taskId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch git activity");
    return data;
  },
};

// Profile API
export const profileAPI = {
  getProfile: async (options = {}) => {
    const { forceRefresh = false } = options;
    const cacheKey = 'profile:data';

    if (!forceRefresh) {
      const cached = requestCache.get(cacheKey);
      if (cached) return cached;

      if (requestCache.isPending(cacheKey)) {
        return requestCache.getPending(cacheKey);
      }
    } else {
      requestCache.invalidate(cacheKey);
    }

    const requestPromise = fetch(`${API_BASE_URL}/api/profile`, {
      headers: getAuthHeaders(),
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch profile");
      requestCache.set(cacheKey, data);
      return data;
    });

    requestCache.setPending(cacheKey, requestPromise);
    return requestPromise;
  },

  peekProfile: () => requestCache.get('profile:data'),

  updatePersonal: async (personalData) => {
    const response = await fetch(`${API_BASE_URL}/api/profile/personal`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ data: personalData }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update personal info");
    requestCache.invalidate('profile:data');
    return data;
  },

  updateEducation: async (educationData) => {
    const response = await fetch(`${API_BASE_URL}/api/profile/education`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ education: educationData }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update education");
    requestCache.invalidate('profile:data');
    return data;
  },

  updateCertificates: async (certificatesData) => {
    const response = await fetch(`${API_BASE_URL}/api/profile/certificates`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ certificates: certificatesData }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update certificates");
    requestCache.invalidate('profile:data');
    return data;
  },

  updateOrganization: async (organizationData) => {
    const response = await fetch(`${API_BASE_URL}/api/profile/organization`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ data: organizationData }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update organization");
    requestCache.invalidate('profile:data');
    return data;
  },
  
  updateIntegrations: async (integrationData) => {
    const response = await fetch(`${API_BASE_URL}/api/profile/integrations`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(integrationData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update integration settings");
    requestCache.invalidate('profile:data');
    return data;
  },
};

export { agentAPI };

export const globalInsightsAPI = {
  analyzeYoutubeVideo: async (youtubeUrl, question = '') => {
    const response = await fetch(`${API_BASE_URL}/api/global-insights/analyze-youtube`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        youtube_url: youtubeUrl,
        question: question
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || 'Failed to analyze YouTube video');
    }

    return data;
  },

  exportYoutubePdf: async (youtubeUrl, question = '') => {
    const response = await fetch(`${API_BASE_URL}/api/global-insights/export-youtube-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        youtube_url: youtubeUrl,
        question: question
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to export PDF');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube_insights_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, message: 'PDF downloaded successfully' };
  },

  checkHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/api/global-insights/health`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Health check failed');
    }

    return data;
  },

  isValidYoutubeUrl: (url) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return pattern.test(url);
  },

  extractVideoId: (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
};

export const voiceChatAPI = {
  checkHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/api/voice-chat/voice/health`, {
      headers: getAuthHeaders()
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Voice chat health check failed');
    }

    return data;
  },

  transcribe: async (audioFile) => {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await fetch(`${API_BASE_URL}/api/voice-chat/voice/transcribe`, {
      method: 'POST',
      headers: getUploadHeaders(),
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || 'Transcription failed');
    }

    return data;
  },

  synthesize: async (text, persona = 'friendly') => {
    const response = await fetch(`${API_BASE_URL}/api/voice-chat/voice/synthesize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text, persona })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Text-to-speech failed');
    }

    return await response.blob();
  },

  chat: async (audioFile, persona = 'friendly', conversationHistory = []) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('persona', persona);
    formData.append('conversation_history', JSON.stringify(conversationHistory));

    const response = await fetch(`${API_BASE_URL}/api/voice-chat/voice/chat`, {
      method: 'POST',
      headers: getUploadHeaders(),
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || error.error || 'Voice chat failed');
    }

    const transcript = response.headers.get('X-Transcript') || 'Voice input';
    const responseText = response.headers.get('X-Response-Text') || '';
    const audioBlob = await response.blob();

    return {
      audioBlob,
      transcript,
      responseText
    };
  },

  personas: ['friendly', 'professional', 'direct', 'assistant']
};