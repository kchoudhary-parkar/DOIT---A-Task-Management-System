import React, { useState, useEffect, useContext, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardAPI, taskAPI } from "../../services/api";
import { AuthContext } from "../../context/AuthContext";
import "./DashboardPage.css";
import Loader from "../../components/Loader/Loader";
import TaskStatusChart from "../../components/Charts/TaskStatusChart";
import TaskPriorityChart from "../../components/Charts/TaskPriorityChart";
import ProjectProgressChart from "../../components/Charts/ProjectProgressChart";
import TaskStatsCard from "../../components/Charts/TaskStatsCard";
import { exportToPDF, exportToExcel, exportToCSV } from "../../utils/exportUtils";
import { 
  FiDownload,
  FiFileText, 
  FiFile,
  FiChevronDown,
  FiBarChart2,
  FiClock,
  FiLock,
  FiUsers,
  FiFolder,
  FiStar,
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiActivity,
  FiArrowRight,
  FiX,
  FiRefreshCw,
  FiCheck
} from 'react-icons/fi';

const ExportButtons = memo(({ onExportPDF, onExportExcel, onExportCSV, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    {
      id: 'pdf',
      label: 'PDF',
      icon: FiFileText,
      color: '#DC2626',
      action: onExportPDF,
    },
    {
      id: 'excel',
      label: 'Excel',
      icon: FiFile,
      color: '#16A34A',
      action: onExportExcel,
    },
    {
      id: 'csv',
      label: 'CSV',
      icon: FiFile,
      color: '#2563EB',
      action: onExportCSV,
    },
  ];

  const handleExport = (option) => {
    option.action();
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', zIndex: 9999 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: isLoading ? 0.6 : 1,
          boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        }}
      >
        <FiDownload size={18} />
        Export Report
        <FiChevronDown
          size={16}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden',
              zIndex: 10000,
              minWidth: '200px',
              animation: 'slideDown 0.2s ease-out',
            }}
          >
            {exportOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleExport(option)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'white',
                    border: 'none',
                    borderBottom: index < exportOptions.length - 1 ? '1px solid #f0f0f0' : 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    color: '#1f2937',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.paddingLeft = '20px';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.paddingLeft = '16px';
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `${option.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} color={option.color} />
                  </div>
                  <span style={{ fontWeight: '500' }}>Export as {option.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [analytics, setAnalytics] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  
  const [pendingTasks, setPendingTasks] = useState([]);
  const [closedTasks, setClosedTasks] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showClosedModal, setShowClosedModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ⚡ PERFORMANCE: Fetch ALL data in parallel to reduce loading time
      const [analyticsData, reportData, pendingData, closedData] = await Promise.all([
        dashboardAPI.getAnalytics(),
        dashboardAPI.getReport(),
        taskAPI.getAllPendingApprovalTasks(),
        taskAPI.getAllClosedTasks()
      ]);

      console.log("[Dashboard] Data loaded in parallel:", {
        analytics: !!analyticsData.success,
        report: !!reportData.success,
        pending: pendingData.count,
        closed: closedData.count
      });

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
      }
      
      if (reportData.success) {
        setReport(reportData.report);
      }
      
      // Set counts immediately without separate API call
      setPendingCount(pendingData.count || 0);
      setClosedCount(closedData.count || 0);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchPendingTasks = async () => {
    try {
      setModalLoading(true);
      const data = await taskAPI.getAllPendingApprovalTasks();
      setPendingTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch pending tasks:", err);
      alert("Failed to load pending approval tasks");
    } finally {
      setModalLoading(false);
    }
  };

  const fetchClosedTasks = async () => {
    try {
      setModalLoading(true);
      const data = await taskAPI.getAllClosedTasks();
      setClosedTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch closed tasks:", err);
      alert("Failed to load closed tasks");
    } finally {
      setModalLoading(false);
    }
  };



  const handleShowPendingTasks = useCallback(() => {
    setShowPendingModal(true);
    fetchPendingTasks();
  }, []);

  const handleShowClosedTasks = useCallback(() => {
    setShowClosedModal(true);
    fetchClosedTasks();
  }, []);

  const handleApproveTask = useCallback(async (taskId) => {
    if (!window.confirm("Are you sure you want to approve and close this task?")) {
      return;
    }

    try {
      await taskAPI.approveTask(taskId);
      alert("✅ Task approved successfully!");
      // ⚡ Optimized: Update counts locally and refresh modal only
      setPendingCount(prev => Math.max(0, prev - 1));
      setClosedCount(prev => prev + 1);
      fetchPendingTasks();
      //
    } catch (err) {
      console.error("Failed to approve task:", err);
      alert("Failed to approve task: " + err.message);
    }
  }, []);

  const handleExportPDF = useCallback(() => {
    if (!analytics) return;
    setExportLoading(true);
    try {
      exportToPDF(analytics, user?.name || "User");
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF: " + err.message);
    } finally {
      setExportLoading(false);
    }
  }, [analytics, user]);

  const handleExportExcel = useCallback(() => {
    if (!analytics) return;
    setExportLoading(true);
    try {
      exportToExcel(analytics, report, user?.name || "User");
    } catch (err) {
      console.error("Failed to export Excel:", err);
      alert("Failed to export Excel: " + err.message);
    } finally {
      setExportLoading(false);
    }
  }, [analytics, report, user]);

  const handleExportCSV = useCallback(() => {
    if (!analytics) return;
    setExportLoading(true);
    try {
      exportToCSV(analytics, user?.name || "User");
    } catch (err) {
      console.error("Failed to export CSV:", err);
      alert("Failed to export CSV: " + err.message);
    } finally {
      setExportLoading(false);
    }
  }, [analytics, user]);

  // \u26a1 Memoize helper functions to prevent recreation
  const getTimeAgo = useCallback((timestamp) => {
    if (!timestamp) return "";
    
    // Handle ISO strings properly - if no 'Z' suffix, treat as UTC
    let dateString = timestamp;
    if (typeof timestamp === 'string' && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
      dateString = timestamp + 'Z';
    }
    
    const past = new Date(dateString);
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
  }, []);

  const getPriorityClass = useCallback((priority) => {
    if (!priority) return "low";
    return priority.toLowerCase();
  }, []);

  const getDaysUntilText = useCallback((daysUntil) => {
    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)} days overdue`;
    } else if (daysUntil === 0) {
      return "Due today";
    } else if (daysUntil === 1) {
      return "Due tomorrow";
    } else {
      return `${daysUntil} days left`;
    }
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container" style={{ position: 'relative', minHeight: '400px' }}>
          <Loader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="error-container">
            <FiAlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
            <h2>Error Loading Dashboard</h2>
            <p>{error}</p>
            <button type="button" onClick={fetchDashboardData} className="btn-retry">
              <FiRefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="error-container">
            <FiAlertCircle size={48} color="#6b7280" style={{ marginBottom: '16px' }} />
            <h2>No Data Available</h2>
            <p>Unable to load dashboard data.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div style={{
          position: 'absolute',
          top: '32px',
          right: '32px',
          zIndex: 10000
        }}>
          <ExportButtons
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            isLoading={exportLoading}
          />
        </div>

        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>
              <FiBarChart2 size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
              Dashboard
            </h1>
            <p className="dashboard-subtitle">
              Welcome back, {user?.name || "User"}! Here's your workspace overview
            </p>
          </div>
        </div>

        {/* Task Statistics Cards */}
        <TaskStatsCard stats={analytics.task_stats} />

        {/* Project Statistics Cards */}
        <div className="project-stats-cards">
          <div 
            className="project-stat-card project-stat-card-total project-stat-card-clickable" 
            onClick={() => navigate("/projects")}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && navigate("/projects")}
          >
            <div className="pstat-icon pstat-icon-blue">
              <FiBarChart2 size={24} />
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{analytics.project_stats.total}</div>
              <div className="pstat-label">Total Projects</div>
              <div className="pstat-action">
                View All <FiArrowRight size={14} style={{ marginLeft: '4px' }} />
              </div>
            </div>
          </div>
          
          <div 
            className="project-stat-card project-stat-card-owned"
            role="button"
            tabIndex={0}
          >
            <div className="pstat-icon pstat-icon-green">
              <FiStar size={24} />
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{analytics.project_stats.owned}</div>
              <div className="pstat-label">Owned Projects</div>
            </div>
          </div>
          
          <div 
            className="project-stat-card project-stat-card-member"
            role="button"
            tabIndex={0}
          >
            <div className="pstat-icon pstat-icon-purple">
              <FiUsers size={24} />
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{analytics.project_stats.member_of}</div>
              <div className="pstat-label">Member Of</div>
            </div>
          </div>
          
          <div 
            className="project-stat-card project-stat-card-pending"
            onClick={handleShowPendingTasks}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleShowPendingTasks()}
          >
            <div className="pstat-icon pstat-icon-warning">
              <FiClock size={24} />
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{pendingCount}</div>
              <div className="pstat-label">Pending Approval</div>
            </div>
          </div>
          
          <div 
            className="project-stat-card project-stat-card-closed"
            onClick={handleShowClosedTasks}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleShowClosedTasks()}
          >
            <div className="pstat-icon pstat-icon-dark">
              <FiLock size={24} />
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{closedCount}</div>
              <div className="pstat-label">Closed Tickets</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          <TaskStatusChart data={analytics.status_distribution} />
          <TaskPriorityChart data={analytics.priority_distribution} />
        </div>

        {/* Project Progress Chart */}
        <ProjectProgressChart data={analytics.project_progress} />

        {/* Deadlines and Activity Grid */}
        <div className="deadlines-activity-grid">
          {/* Upcoming Deadlines */}
          <div className="deadlines-section-new">
            <div className="section-header">
              <h2>
                <FiCalendar size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Upcoming Deadlines
              </h2>
              <span className="deadline-count">{analytics.upcoming_deadlines.length} tasks</span>
            </div>

            {analytics.upcoming_deadlines.length === 0 ? (
              <div className="no-deadlines">
                <FiCheckCircle size={48} color="#10b981" style={{ marginBottom: '12px' }} />
                <p>No upcoming deadlines! You're all caught up.</p>
              </div>
            ) : (
              <div className="deadlines-list">
                {analytics.upcoming_deadlines.map((task, index) => (
                  <div
                    key={index}
                    className={`deadline-item ${task.days_until < 0 ? 'overdue' : task.days_until === 0 ? 'today' : ''}`}
                    onClick={() => navigate(`/projects/${task.project_id}/tasks`)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && navigate(`/projects/${task.project_id}/tasks`)}
                  >
                    <div className="deadline-left">
                      <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                        {task.priority}
                      </span>
                      <div className="deadline-info">
                        <h4>{task.title}</h4>
                        <p className="deadline-project">
                          <FiFolder size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                          {task.project_name}
                        </p>
                      </div>
                    </div>
                    <div className="deadline-right">
                      <div className="deadline-date">
                        <span className="date-text">
                          {new Date(task.due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className={`days-until ${task.days_until < 0 ? 'overdue' : ''}`}>
                          {getDaysUntilText(task.days_until)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="activity-section-new">
          <div className="section-header">
            <h2>
              <FiActivity size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Recent Activity
            </h2>
          </div>

          {!analytics.recent_activities || analytics.recent_activities.length === 0 ? (
            <div className="no-activity">
              <FiActivity size={48} color="#9ca3af" style={{ marginBottom: '12px' }} />
              <p>No recent activity. Start working on tasks!</p>
            </div>
          ) : (
            <div className="activity-list">
              {analytics.recent_activities.map((activity, index) => (
                <div
                  key={index}
                  className="activity-item-new"
                  onClick={() => navigate(`/projects/${activity.project_id}/tasks`)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => e.key === 'Enter' && navigate(`/projects/${activity.project_id}/tasks`)}
                >
                  <div className={`activity-status-badge ${activity.status.toLowerCase().replace(' ', '-')}`}>
                    {activity.status}
                  </div>
                  <div className="activity-content-new">
                    <h4>{activity.title}</h4>
                    <div className="activity-meta-new">
                      <span className={`priority-text ${getPriorityClass(activity.priority)}`}>
                        {activity.priority}
                      </span>
                      <span className="activity-project-new">
                        <FiFolder size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {activity.project_name}
                      </span>
                      <span className="activity-time-new">{getTimeAgo(activity.updated_at)}</span>
                    </div>
                  </div>
                  <div className="activity-arrow-new">
                    <FiArrowRight size={20} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Pending Approval Modal */}
        {showPendingModal && (
          <div className="task-modal-overlay" onClick={() => setShowPendingModal(false)}>
            <div className="task-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="task-modal-header">
                <h2>
                  <FiClock size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Tickets Pending for Approval
                </h2>
                <button type="button" className="modal-close-btn" onClick={() => setShowPendingModal(false)}>
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="task-modal-body">
                {modalLoading ? (
                  <div className="modal-loading">
                    <FiRefreshCw size={24} className="spin" />
                    Loading...
                  </div>
                ) : pendingTasks.length === 0 ? (
                  <div className="no-tasks-message">
                    <FiCheckCircle size={48} color="#10b981" style={{ marginBottom: '12px' }} />
                    <p>No tasks pending approval</p>
                  </div>
                ) : (
                  <div className="pending-tasks-list">
                    {pendingTasks.map((task) => (
                      <div key={task._id} className="pending-task-card">
                        <div className="pending-task-header">
                          <h3>{task.title}</h3>
                          <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="pending-task-info">
                          <p className="task-project">
                            <FiFolder size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {task.project_name}
                          </p>
                          <p className="task-assignee">
                            <FiUsers size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {task.assignee_name || 'Unassigned'}
                          </p>
                          <p className="task-description">{task.description}</p>
                        </div>
                        {task.can_approve && (
                          <button 
                            className="approve-btn"
                            onClick={() => handleApproveTask(task._id)}
                          >
                            <FiCheck size={18} style={{ marginRight: '6px' }} />
                            Approve & Close
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Closed Tasks Modal */}
        {showClosedModal && (
          <div className="task-modal-overlay" onClick={() => setShowClosedModal(false)}>
            <div className="task-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="task-modal-header">
                <h2>
                  <FiLock size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Closed Tickets
                </h2>
                <button type="button" className="modal-close-btn" onClick={() => setShowClosedModal(false)}>
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="task-modal-body">
                {modalLoading ? (
                  <div className="modal-loading">
                    <FiRefreshCw size={24} className="spin" />
                    Loading...
                  </div>
                ) : closedTasks.length === 0 ? (
                  <div className="no-tasks-message">
                    <FiLock size={48} color="#9ca3af" style={{ marginBottom: '12px' }} />
                    <p>No closed tickets yet</p>
                  </div>
                ) : (
                  <div className="closed-tasks-list">
                    {closedTasks.map((task) => (
                      <div key={task._id} className="closed-task-card">
                        <div className="closed-task-header">
                          <h3>{task.title}</h3>
                          <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="closed-task-info">
                          <p className="task-project">
                            <FiFolder size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {task.project_name}
                          </p>
                          <p className="task-assignee">
                            <FiUsers size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            {task.assignee_name || 'Unassigned'}
                          </p>
                          <p className="task-description">{task.description}</p>
                          {task.approved_by_name && (
                            <p className="task-approval">
                              <FiCheckCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#10b981' }} />
                              Approved by {task.approved_by_name} on{' '}
                              {task.approved_at ? new Date(task.approved_at).toLocaleDateString() : 'N/A'}
                            </p>
                          )}
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
    </div>
  );
}

export default DashboardPage;