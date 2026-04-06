import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiArrowRight, FiCalendar, FiCheckCircle, FiUser } from "react-icons/fi";
import { BsBug, BsBullseye, BsCheckSquare, BsBook } from "react-icons/bs";
import { taskAPI } from "../../services/api";
import { TaskDetailModal } from "../../components/Tasks";
import "./MyTasksPage.css";

function MyTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTask, setSelectedTask] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const cachedTasks = taskAPI.peekMyTasks?.();

    if (cachedTasks?.tasks) {
      setTasks(cachedTasks.tasks || []);
      setLoading(false);
      fetchMyTasks({ background: true, forceRefresh: true });
      return;
    }

    fetchMyTasks();
  }, []);

  const fetchMyTasks = async (options = {}) => {
    const { background = false, forceRefresh = false } = options;
    try {
      if (!background) {
        setLoading(true);
      }
      setError("");
      const data = await taskAPI.getMyTasks({ forceRefresh });
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message || "Failed to load tasks");
    } finally {
      if (!background) {
        setLoading(false);
      }
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

  const getIssueTypeIcon = (issueType) => {
    switch (issueType) {
      case "bug":
        return <BsBug />;
      case "task":
        return <BsCheckSquare />;
      case "story":
        return <BsBook />;
      case "epic":
        return <BsBullseye />;
      default:
        return <BsCheckSquare />;
    }
  };

  const getIssueTypeColor = (issueType) => {
    switch (issueType) {
      case "bug":
        return "#ef4444";
      case "task":
        return "#3b82f6";
      case "story":
        return "#8b5cf6";
      case "epic":
        return "#f97316";
      default:
        return "#3b82f6";
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "High":
        return <FiAlertCircle />;
      case "Low":
        return <FiCheckCircle />;
      default:
        return <FiAlertCircle />;
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
        const data = await taskAPI.getMyTasks({ forceRefresh: true });
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
      await fetchMyTasks({ forceRefresh: true });
      // Close the modal after successful update
      setSelectedTask(null);
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error; // Re-throw so the modal can show the error
    }
  };

  return (
    <div className={`my-tasks-page page-transition ${entered ? 'is-entered' : ''}`}>
      <div className="my-tasks-container">
        <div className="my-tasks-header">
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
          {loading && tasks.length === 0 ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={`task-skeleton-${index}`} className="my-task-skeleton-card" />
            ))
          ) : filteredTasks.length === 0 ? (
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
              <div key={task._id} className="my-task-card task-card" onClick={() => handleTaskClick(task)}>
                <div className="task-card-header">
                  <div className="task-header-left">
                    {task.ticket_id && (
                      <span className="task-ticket-id">{task.ticket_id}</span>
                    )}
                    <h3 className="task-title">{task.title}</h3>
                  </div>
                  <div className="task-meta">
                    <span
                      className="task-issue-type"
                      style={{ backgroundColor: getIssueTypeColor(task.issue_type || "task") }}
                    >
                      {getIssueTypeIcon(task.issue_type || "task")}
                      <span className="badge-text">{(task.issue_type || "task").charAt(0).toUpperCase() + (task.issue_type || "task").slice(1)}</span>
                    </span>
                    <span
                      className="task-priority"
                      style={{ backgroundColor: getPriorityColor(task.priority) }}
                    >
                      {getPriorityIcon(task.priority)}
                      <span className="badge-text">{task.priority || "Medium"}</span>
                    </span>
                    <span
                      className="task-status"
                      style={{ backgroundColor: getStatusColor(task.status) }}
                    >
                      {task.status || "Unknown"}
                    </span>
                  </div>
                </div>

                {task.description && (
                  <p className="task-description">{task.description}</p>
                )}

                <div className="task-footer">
                  <div className="task-assignee">
                    <FiUser size={14} />
                    <span>{task.assignee_name || "Unassigned"}</span>
                  </div>
                  <div className="task-creator">
                    <FiUser size={14} />
                    <span>By: {task.created_by_name || "Unknown"}</span>
                  </div>
                  <div className="task-due-date">
                    <FiCalendar size={14} />
                    <span>{formatDate(task.due_date)}</span>
                  </div>
                </div>

                <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/projects/${task.project_id}/tasks`)}
                    className="btn-view-project"
                  >
                    View in Project
                    <FiArrowRight size={16} />
                  </button>
                </div>
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
