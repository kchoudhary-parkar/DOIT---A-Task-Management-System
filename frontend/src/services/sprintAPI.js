import { requestCache } from '../utils/requestCache';

const API_URL = process.env.REACT_APP_API_BASE_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  const tabSessionKey = sessionStorage.getItem("tab_session_key");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
    "X-Tab-Session-Key": tabSessionKey || "",
  };
};

// Create a new sprint
export const createSprint = async (projectId, sprintData) => {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/sprints`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(sprintData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to create sprint");
  // Invalidate sprints cache
  requestCache.invalidate(`sprints:project:${projectId}`);
  return data;
};

// Get all sprints for a project
export const getProjectSprints = async (projectId) => {
  const cacheKey = `sprints:project:${projectId}`;
  const cached = requestCache.get(cacheKey);
  if (cached) return cached;

  if (requestCache.isPending(cacheKey)) {
    return requestCache.getPending(cacheKey);
  }

  const requestPromise = fetch(`${API_URL}/api/projects/${projectId}/sprints`, {
    method: "GET",
    headers: getAuthHeaders(),
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch sprints");
    requestCache.set(cacheKey, data);
    return data;
  });

  requestCache.setPending(cacheKey, requestPromise);
  return requestPromise;
};

// Get sprint by ID
export const getSprintById = async (sprintId) => {
  const cacheKey = `sprint:${sprintId}`;
  const cached = requestCache.get(cacheKey);
  if (cached) return cached;

  if (requestCache.isPending(cacheKey)) {
    return requestCache.getPending(cacheKey);
  }

  const requestPromise = fetch(`${API_URL}/api/sprints/${sprintId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch sprint");
    requestCache.set(cacheKey, data);
    return data;
  });

  requestCache.setPending(cacheKey, requestPromise);
  return requestPromise;
};

// Update sprint
export const updateSprint = async (sprintId, sprintData) => {
  const response = await fetch(`${API_URL}/api/sprints/${sprintId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(sprintData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to update sprint");
  // Invalidate sprint caches
  requestCache.invalidate(`sprint:${sprintId}`);
  requestCache.invalidatePattern('sprints:project:');
  return data;
};

// Start sprint
export const startSprint = async (sprintId) => {
  const response = await fetch(`${API_URL}/api/sprints/${sprintId}/start`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to start sprint");
  // Invalidate sprint caches
  requestCache.invalidate(`sprint:${sprintId}`);
  requestCache.invalidatePattern('sprints:project:');
  return data;
};

// Complete sprint
export const completeSprint = async (sprintId) => {
  const response = await fetch(`${API_URL}/api/sprints/${sprintId}/complete`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to complete sprint");
  // Invalidate sprint caches
  requestCache.invalidate(`sprint:${sprintId}`);
  requestCache.invalidatePattern('sprints:project:');
  return data;
};

// Delete sprint
export const deleteSprint = async (sprintId) => {
  const response = await fetch(`${API_URL}/api/sprints/${sprintId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to delete sprint");
  // Invalidate sprint caches
  requestCache.invalidate(`sprint:${sprintId}`);
  requestCache.invalidatePattern('sprints:project:');
  return data;
};

// Add task to sprint
export const addTaskToSprint = async (sprintId, taskId) => {
  const response = await fetch(`${API_URL}/api/sprints/${sprintId}/tasks`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ task_id: taskId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to add task to sprint");
  return data;
};

// Remove task from sprint
export const removeTaskFromSprint = async (sprintId, taskId) => {
  const response = await fetch(`${API_URL}/api/sprints/${sprintId}/tasks/${taskId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to remove task from sprint");
  return data;
};

// Get sprint tasks (tasks with sprint_id = sprintId)
export const getSprintTasks = async (projectId, sprintId) => {
  const response = await fetch(`${API_URL}/api/tasks/project/${projectId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to fetch tasks");
  
  // Filter tasks for this sprint
  const sprintTasks = data.tasks.filter(task => task.sprint_id === sprintId);
  return { ...data, tasks: sprintTasks };
};

// Get backlog tasks (tasks that were moved to backlog from completed sprints)
export const getBacklogTasks = async (projectId) => {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/backlog`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to fetch backlog tasks");
  
  return data;
};

// Get available tasks that can be added to sprints (all unassigned tasks)
export const getAvailableSprintTasks = async (projectId) => {
  const response = await fetch(`${API_URL}/api/projects/${projectId}/available-tasks`, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to fetch available tasks");
  
  return data;
};

