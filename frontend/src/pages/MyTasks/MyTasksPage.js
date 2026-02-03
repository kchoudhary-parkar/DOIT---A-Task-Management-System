import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { taskAPI } from "../../services/api";
import { TaskDetailModal } from "../../components/Tasks";
import Loader from "../../components/Loader/Loader";
import "./MyTasksPage.css";

function MyTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTask, setSelectedTask] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await taskAPI.getMyTasks();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "#f44336";
      case "Medium":
        return "#ff9800";
      case "Low":
        return "#4caf50";
      default:
        return "#999";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Done":
        return "#22c55e";
      case "In Progress":
        return "#3b82f6";
      case "Testing":
        return "#f59e0b";
      case "Incomplete":
        return "#ef4444";
      case "To Do":
        return "#94a3b8";
      default:
        return "#94a3b8";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredTasks =
    statusFilter === "All"
      ? tasks
      : tasks.filter((task) => task.status === statusFilter);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    // Fetch all tasks from the same project
    fetchProjectTasks(task.project_id);
  };

  const fetchProjectTasks = async (projectId) => {
    try {
      const data = await taskAPI.getByProject(projectId);
      setProjectTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to load project tasks:", err);
      setProjectTasks([]);
    }
  };

  const handleTaskDetailUpdate = async (taskId, updateData) => {
    try {
      // If no taskId provided, silently refresh tasks (for links, labels, etc.)
      if (!taskId) {
        // Refresh tasks in background without showing loader
        const data = await taskAPI.getMyTasks();
        setTasks(data.tasks || []);
        
        // Update selectedTask if it's currently open
        if (selectedTask) {
          const updatedSelectedTask = data.tasks.find(t => t._id === selectedTask._id);
          if (updatedSelectedTask) {
            setSelectedTask(updatedSelectedTask);
          }
          // Also refresh project tasks for the dropdown
          if (selectedTask.project_id) {
            await fetchProjectTasks(selectedTask.project_id);
          }
        }
        return;
      }
      
      await taskAPI.update(taskId, updateData);
      // Refresh the entire task list to reflect status changes
      await fetchMyTasks();
      // Close the modal after successful update
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error; // Re-throw so the modal can show the error
    }
  };

  if (loading) {
    return (
      <div className="my-tasks-page">
        <div style={{ position: 'relative', minHeight: '400px' }}>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="my-tasks-page">
      <div className="my-tasks-container">
        <div className="my-tasks-header">
          <button type="button" onClick={() => navigate("/")} className="btn-back">
            ← Back to Dashboard
          </button>
          <h1>Tasks Assigned to Me</h1>
          <p className="tasks-subtitle">All tasks assigned to you across all projects</p>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="tasks-filters">
          <div className="filter-buttons">
            {["All", "To Do", "In Progress", "Testing", "Incomplete", "Done"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`filter-btn ${
                  statusFilter === status ? "active" : ""
                }`}
              >
                {status}
                {status === "All" && ` (${tasks.length})`}
                {status !== "All" &&
                  ` (${tasks.filter((t) => t.status === status).length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="my-tasks-grid">
          {filteredTasks.length === 0 ? (
            <div className="no-tasks">
              <p>No tasks assigned to you yet</p>
              {statusFilter !== "All" && (
                <button
                  onClick={() => setStatusFilter("All")}
                  className="btn btn-secondary"
                >
                  View All Tasks
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task._id} className="my-task-card" onClick={() => handleTaskClick(task)}>
                <div className="task-card-header">
                  <h3>{task.title}</h3>
                  <div className="task-meta">
                    <span
                      className="task-priority"
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    >
                      {task.priority}
                    </span>
                    <span
                      className="task-status"
                      style={{ backgroundColor: getStatusColor(task.status) }}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>

                {task.description && (
                  <p className="task-description">{task.description}</p>
                )}

                <div className="task-details">
                  <div className="task-detail-item">
                    <span className="detail-icon">📁</span>
                    <div className="detail-content">
                      <span className="detail-label">Project</span>
                      <span className="detail-value">{task.project_name || "Unknown Project"}</span>
                    </div>
                  </div>

                  <div className="task-detail-item">
                    <span className="detail-icon">👤</span>
                    <div className="detail-content">
                      <span className="detail-label">Assigned by</span>
                      <span className="detail-value">{task.created_by_name || "Project Owner"}</span>
                    </div>
                  </div>

                  <div className="task-detail-item">
                    <span className="detail-icon">📅</span>
                    <div className="detail-content">
                      <span className="detail-label">Due Date</span>
                      <span className="detail-value">{formatDate(task.due_date)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/projects/${task.project_id}/tasks`);
                  }}
                  className="btn-view-project"
                >
                  View in Project →
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskDetailUpdate}
          isOwner={false}
          projectTasks={projectTasks}
        />
      )}
    </div>
  );
}

export default MyTasksPage;
