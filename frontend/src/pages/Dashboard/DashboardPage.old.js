import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { projectAPI, taskAPI } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import "./DashboardPage.css";
import Loader from "../../components/Loader/Loader";

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [stats, setStats] = useState({
    totalProjects: 0,
    myTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    doneTasksAwaitingApproval: 0,
  });
  
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState({
    today: [],
    thisWeek: [],
    overdue: []
  });
  
  const [loading, setLoading] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [doneTasksForApproval, setDoneTasksForApproval] = useState([]);
  const [ownedProjects, setOwnedProjects] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projectsData, tasksData] = await Promise.all([
        projectAPI.getAll(),
        taskAPI.getMyTasks(),
      ]);

      const projects = projectsData.projects || [];
      const tasks = tasksData.tasks || [];

      // Filter projects owned by the user
      const owned = projects.filter(p => p.user_id === user?.id || p.is_owner);
      setOwnedProjects(owned);

      // Count done tasks awaiting approval across owned projects
      let doneCount = 0;
      let closedTasksCount = 0;
      
      if (owned.length > 0) {
        // For admins/project owners: fetch all tasks from owned projects
        const doneTasksPromises = owned.map(p => 
          taskAPI.getDoneTasksForApproval(p._id).catch(() => ({ tasks: [] }))
        );
        const allProjectTasksPromises = owned.map(p =>
          taskAPI.getByProject(p._id).catch(() => ({ tasks: [] }))
        );
        
        const [doneTasksResults, allProjectTasksResults] = await Promise.all([
          Promise.all(doneTasksPromises),
          Promise.all(allProjectTasksPromises)
        ]);
        
        doneCount = doneTasksResults.reduce((sum, result) => sum + (result.tasks?.length || 0), 0);
        
        // Count all closed tasks from owned projects
        closedTasksCount = allProjectTasksResults.reduce((sum, result) => {
          const closedTasks = (result.tasks || []).filter(t => t.status === "Closed");
          return sum + closedTasks.length;
        }, 0);
      } else {
        // For regular members: count only their assigned closed tasks
        closedTasksCount = tasks.filter((t) => t.status === "Closed").length;
      }

      setStats({
        totalProjects: projects.length,
        myTasks: tasks.length,
        completedTasks: closedTasksCount,
        pendingTasks: tasks.filter((t) => t.status !== "Done" && t.status !== "Closed").length,
        doneTasksAwaitingApproval: doneCount,
      });

      processRecentActivities(tasks, projects);
      processUpcomingDeadlines(tasks);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const processRecentActivities = (tasks, projects) => {
    const activities = [];
    
    tasks.forEach(task => {
      const project = projects.find(p => p._id === task.project_id);
      const projectName = project ? project.name : "Unknown Project";

      if (task.status === "Done" && task.updated_at) {
        activities.push({
          id: `${task._id}-completed`,
          type: "completed",
          message: `You completed "${task.title}"`,
          project: projectName,
          time: new Date(task.updated_at).toISOString(),
          taskId: task._id,
          projectId: task.project_id
        });
      }

      if (task.assignee_id === user?.id && task.created_at) {
        activities.push({
          id: `${task._id}-assigned`,
          type: "assigned",
          message: `"${task.title}" was assigned to you`,
          project: projectName,
          time: new Date(task.created_at).toISOString(),
          taskId: task._id,
          projectId: task.project_id
        });
      }

      if (task.activities && task.activities.length > 0) {
        task.activities.slice(-3).forEach(activity => {
          const activityTime = activity.timestamp || activity.created_at || task.updated_at;
          if (activityTime) {
            activities.push({
              id: `${task._id}-activity-${activityTime}`,
              type: activity.action,
              message: activity.action === "comment"
                ? `${activity.user_name} commented on "${task.title}"`
                : `${activity.user_name} changed status of "${task.title}" to ${activity.new_value}`,
              project: projectName,
              time: new Date(activityTime).toISOString(),
              taskId: task._id,
              projectId: task.project_id
            });
          }
        });
      }
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    setRecentActivities(activities.slice(0, 10));
  };

  const processUpcomingDeadlines = (tasks) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const deadlines = {
      today: [],
      thisWeek: [],
      overdue: []
    };

    tasks.forEach(task => {
      if (task.status === "Done" || !task.due_date) return;
      
      const dueDate = new Date(task.due_date);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      if (dueDateOnly < today) {
        deadlines.overdue.push(task);
      } else if (dueDateOnly.getTime() === today.getTime()) {
        deadlines.today.push(task);
      } else if (dueDateOnly <= endOfWeek) {
        deadlines.thisWeek.push(task);
      }
    });

    Object.keys(deadlines).forEach(key => {
      deadlines[key].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    });

    setUpcomingDeadlines(deadlines);
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    
    const past = new Date(timestamp);
    const now = new Date();
    
    if (isNaN(past.getTime())) {
      return "Unknown time";
    }

    const diffMs = now.getTime() - past.getTime();
    if (diffMs < 0) return "Just now";

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 10) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w ago`;
    }

    return past.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: past.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getActivityIcon = (type) => {
    switch(type) {
      case "completed": return "✅";
      case "assigned": return "👤";
      case "comment": return "💬";
      case "status_change": return "🔄";
      default: return "📝";
    }
  };

  const getDaysUntil = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityClass = (priority) => {
    if (!priority) return "low";
    return priority.toLowerCase();
  };

  const handleOpenApprovalModal = async () => {
    try {
      setLoading(true);
      const allDoneTasks = [];
      
      for (const project of ownedProjects) {
        try {
          const result = await taskAPI.getDoneTasksForApproval(project._id);
          if (result.tasks && result.tasks.length > 0) {
            allDoneTasks.push(...result.tasks.map(task => ({
              ...task,
              project_name: project.name
            })));
          }
        } catch (err) {
          console.error(`Failed to fetch done tasks for project ${project.name}:`, err);
        }
      }
      
      setDoneTasksForApproval(allDoneTasks);
      setShowApprovalModal(true);
    } catch (err) {
      console.error("Failed to load done tasks:", err);
      alert("Failed to load tasks for approval");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId) => {
    try {
      await taskAPI.approveTask(taskId);
      // Remove from list and update count
      setDoneTasksForApproval(prev => prev.filter(t => t._id !== taskId));
      setStats(prev => ({
        ...prev,
        doneTasksAwaitingApproval: prev.doneTasksAwaitingApproval - 1
      }));
    } catch (err) {
      console.error("Failed to approve task:", err);
      alert(err.message || "Failed to approve task");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
      <Loader />
    </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1>🚀 Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back, {user?.name || "User"}! Here's your workspace overview
          </p>
        </div>

        {/* Main Stats Cards */}
        <div className="dashboard-cards">
          <div className="dashboard-card" onClick={() => navigate("/projects")}>
            <div className="card-icon">📊</div>
            <div className="card-content">
              <h2>Projects</h2>
              <div className="card-count">{stats.totalProjects}</div>
              <p className="card-description">Active projects</p>
            </div>
            <div className="card-arrow">→</div>
          </div>

          <div className="dashboard-card" onClick={() => navigate("/my-tasks")}>
            <div className="card-icon">📋</div>
            <div className="card-content">
              <h2>My Tasks</h2>
              <div className="card-count">{stats.myTasks}</div>
              <p className="card-description">Assigned to you</p>
            </div>
            <div className="card-arrow">→</div>
          </div>

          <div className="dashboard-card" onClick={() => navigate("/tasks")}>
            <div className="card-icon">🔍</div>
            <div className="card-content">
              <h2>All Tasks</h2>
              <div className="card-count">{stats.myTasks}</div>
              <p className="card-description">View all tasks</p>
            </div>
            <div className="card-arrow">→</div>
          </div>

          {user?.role === "super-admin" && (
            <div className="dashboard-card" onClick={() => navigate("/users")}>
              <div className="card-icon">👥</div>
              <div className="card-content">
                <h2>Users</h2>
                <div className="card-count">•</div>
                <p className="card-description">Manage team</p>
              </div>
              <div className="card-arrow">→</div>
            </div>
          )}

          {/* Admin: Done Tasks Awaiting Approval */}
          {ownedProjects.length > 0 && (
            <div className="dashboard-card approval-card" onClick={handleOpenApprovalModal}>
              <div className="card-icon">✅</div>
              <div className="card-content">
                <h2>Awaiting Approval</h2>
                <div className="card-count">{stats.doneTasksAwaitingApproval}</div>
                <p className="card-description">Done tasks to review</p>
              </div>
              <div className="card-arrow">→</div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="dashboard-cards2">
          <div className="dashboard-card2">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <p className="stat-label">Pending</p>
              <div className="stat-value">{stats.pendingTasks}</div>
            </div>
          </div>
        <div className="dashboard-cards2">
          <div className="dashboard-card2">
            <div className="stat-icon">✔️</div>
            <div className="stat-info">
              <p className="stat-label">Completed & Closed</p>
              <div className="stat-value">{stats.completedTasks}</div>
            </div>
          </div>
        </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="deadlines-section">
          <div className="section-header">
            <h2>📅 Upcoming Deadlines</h2>
          </div>

          {upcomingDeadlines.overdue.length === 0 &&
           upcomingDeadlines.today.length === 0 &&
           upcomingDeadlines.thisWeek.length === 0 ? (
            <div className="no-deadlines">
              <span className="no-deadlines-icon">🎉</span>
              <p>No upcoming deadlines! You're all caught up.</p>
            </div>
          ) : (
            <div className="deadlines-grid">
              {/* Overdue */}
              {upcomingDeadlines.overdue.length > 0 && (
                <div className="deadline-column overdue">
                  <h3>🚨 Overdue ({upcomingDeadlines.overdue.length})</h3>
                  <div className="deadline-cards">
                    {upcomingDeadlines.overdue.map(task => (
                      <div
                        key={task._id}
                        className="deadline-card"
                        onClick={() => navigate(`/projects/${task.project_id}`)}
                      >
                        <div className="deadline-card-header">
                          {task.priority && (
                            <span className={`task-priority ${getPriorityClass(task.priority)}`}>
                              {task.priority}
                            </span>
                          )}
                          <span className="overdue-badge">
                            {Math.abs(getDaysUntil(task.due_date))} days late
                          </span>
                        </div>
                        <h4>{task.title}</h4>
                        <p className="deadline-date">
                          📅 {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today */}
              {upcomingDeadlines.today.length > 0 && (
                <div className="deadline-column today">
                  <h3>⚡ Due Today ({upcomingDeadlines.today.length})</h3>
                  <div className="deadline-cards">
                    {upcomingDeadlines.today.map(task => (
                      <div
                        key={task._id}
                        className="deadline-card"
                        onClick={() => navigate(`/projects/${task.project_id}`)}
                      >
                        <div className="deadline-card-header">
                          {task.priority && (
                            <span className={`task-priority ${getPriorityClass(task.priority)}`}>
                              {task.priority}
                            </span>
                          )}
                          <span className="days-until">Today</span>
                        </div>
                        <h4>{task.title}</h4>
                        <p className="deadline-date">📅 Today</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* This Week */}
              {upcomingDeadlines.thisWeek.length > 0 && (
                <div className="deadline-column this-week">
                  <h3>📆 This Week ({upcomingDeadlines.thisWeek.length})</h3>
                  <div className="deadline-cards">
                    {upcomingDeadlines.thisWeek.map(task => (
                      <div
                        key={task._id}
                        className="deadline-card"
                        onClick={() => navigate(`/projects/${task.project_id}`)}
                      >
                        <div className="deadline-card-header">
                          {task.priority && (
                            <span className={`task-priority ${getPriorityClass(task.priority)}`}>
                              {task.priority}
                            </span>
                          )}
                          <span className="days-until">
                            {getDaysUntil(task.due_date)} days
                          </span>
                        </div>
                        <h4>{task.title}</h4>
                        <p className="deadline-date">
                          📅 {new Date(task.due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="activity-section">
          <div className="section-header">
            <h2>🔔 Recent Activity</h2>
          </div>

          {recentActivities.length === 0 ? (
            <div className="no-activity">
              <span className="no-activity-icon">📭</span>
              <p>No recent activity. Start working on tasks!</p>
            </div>
          ) : (
            <div className="activity-feed">
              {recentActivities.map(activity => (
                <div
                  key={activity.id}
                  className={`activity-item ${activity.type}`}
                  onClick={() => navigate(`/projects/${activity.projectId}`)}
                >
                  <div className="activity-icon">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="activity-content">
                    <p className="activity-message">{activity.message}</p>
                    <div className="activity-meta">
                      <span className="activity-project">{activity.project}</span>
                      <span className="activity-time">{getTimeAgo(activity.time)}</span>
                    </div>
                  </div>
                  <div className="activity-arrow">→</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal-overlay" onClick={() => setShowApprovalModal(false)}>
          <div className="modal-content approval-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✅ Tasks Awaiting Approval</h2>
              <button onClick={() => setShowApprovalModal(false)} className="btn-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              {doneTasksForApproval.length === 0 ? (
                <div className="no-tasks-approval">
                  <p>🎉 No tasks awaiting approval!</p>
                </div>
              ) : (
                <div className="approval-tasks-list">
                  {doneTasksForApproval.map((task) => (
                    <div key={task._id} className="approval-task-item">
                      <div className="approval-task-header">
                        <div className="task-info">
                          {task.ticket_id && (
                            <span className="task-ticket-id">{task.ticket_id}</span>
                          )}
                          <h4>{task.title}</h4>
                        </div>
                        <span className="project-badge">{task.project_name}</span>
                      </div>
                      
                      {task.description && (
                        <p className="task-description">{task.description}</p>
                      )}
                      
                      <div className="task-meta">
                        <span className="assignee">
                          👤 {task.assignee_name || "Unassigned"}
                        </span>
                        <span className="priority" style={{
                          color: task.priority === "High" ? "#ef4444" : 
                                task.priority === "Medium" ? "#f59e0b" : "#22c55e"
                        }}>
                          {task.priority}
                        </span>
                      </div>
                      
                      <div className="task-actions">
                        <button
                          className="btn-approve"
                          onClick={() => handleApproveTask(task._id)}
                        >
                          ✓ Approve & Close
                        </button>
                        <button
                          className="btn-view-task"
                          onClick={() => {
                            setShowApprovalModal(false);
                            navigate(`/projects/${task.project_id}/tasks`);
                          }}
                        >
                          View Task →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
