import React, { useState, useEffect } from "react";
import { dashboardAPI } from "../../services/api";
import "../Dashboard/DashboardPage.css";
import "./SystemDashboardPage.css";
import Loader from "../../components/Loader/Loader";
import { Pie } from "react-chartjs-2";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';

const ExportButtons = ({ onExportPDF, onExportExcel, onExportCSV, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    {
      id: 'pdf',
      label: 'PDF',
      icon: FileText,
      color: '#DC2626',
      action: onExportPDF,
    },
    {
      id: 'excel',
      label: 'Excel',
      icon: FileSpreadsheet,
      color: '#16A34A',
      action: onExportExcel,
    },
    {
      id: 'csv',
      label: 'CSV',
      icon: FileDown,
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
      {/* Main Export Button */}
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
        <FileDown size={18} />
        Export Report
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <path d="M6 8L2 4h8z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
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
          {/* Menu */}
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
};
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function SystemDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchSystemAnalytics();
  }, []);

  const fetchSystemAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardAPI.getSystemAnalytics();
      if (data.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error("Failed to load system analytics:", err);
      setError(err.message || "Failed to load system analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!analytics) return;
    setExportLoading(true);
    try {
      const { exportSystemToPDF } = await import('../../utils/systemExportUtils');
      exportSystemToPDF(analytics);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!analytics) return;
    setExportLoading(true);
    try {
      const { exportSystemToExcel } = await import('../../utils/systemExportUtils');
      exportSystemToExcel(analytics);
    } catch (err) {
      console.error("Failed to export Excel:", err);
      alert("Failed to export Excel: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!analytics) return;
    setExportLoading(true);
    try {
      const { exportSystemToCSV } = await import('../../utils/systemExportUtils');
      exportSystemToCSV(analytics);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      alert("Failed to export CSV: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div style={{ position: 'relative', minHeight: '400px' }}>
            <Loader />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="error-container">
            <h2>No Data Available</h2>
            <p>Unable to load system analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  // User Role Distribution (Pie Chart)
  const userRoleData = {
    labels: ['Super Admins', 'Admins', 'Members'],
    datasets: [{
      data: [
        analytics.user_stats.super_admins,
        analytics.user_stats.admins,
        analytics.user_stats.members
      ],
      backgroundColor: ['#fbbf24', '#3b82f6', '#10b981'],
      borderColor: ['#ffffff', '#ffffff', '#ffffff'],
      borderWidth: 2
    }]
  };

  // Task Status Distribution (Pie Chart)
  const taskStatusData = {
    labels: Object.keys(analytics.status_distribution),
    datasets: [{
      data: Object.values(analytics.status_distribution),
      backgroundColor: ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'],
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  };

  // Project Health (Bar Chart)
  const projectHealthData = {
    labels: analytics.project_health.map(p => p.name),
    datasets: [
      {
        label: 'Completed',
        data: analytics.project_health.map(p => p.completed),
        backgroundColor: '#10b981'
      },
      {
        label: 'Total',
        data: analytics.project_health.map(p => p.total_tasks),
        backgroundColor: '#3b82f6'
      },
      {
        label: 'Overdue',
        data: analytics.project_health.map(p => p.overdue),
        backgroundColor: '#ef4444'
      }
    ]
  };

  // User Workload (Bar Chart)
  const userWorkloadData = {
    labels: analytics.user_workload.slice(0, 10).map(u => u.name),
    datasets: [
      {
        label: 'Active Tasks',
        data: analytics.user_workload.slice(0, 10).map(u => u.active_tasks),
        backgroundColor: '#3b82f6'
      },
      {
        label: 'Completed Tasks',
        data: analytics.user_workload.slice(0, 10).map(u => u.completed_tasks),
        backgroundColor: '#10b981'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: { size: 12 }
        }
      }
    }
  };

  const barOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 }
      }
    }
  };

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
            <h1>📊 System Dashboard</h1>
            <p className="dashboard-subtitle">
              Comprehensive system-wide analytics and insights
            </p>
          </div>
        </div>

        {/* System Health Cards */}
        <div className="project-stats-cards">
          <div className="project-stat-card project-stat-card-total">
            <div className="pstat-icon pstat-icon-purple">
              👥
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{analytics.user_stats.total}</div>
              <div className="pstat-label">Total Users</div>
            </div>
          </div>

          <div className="project-stat-card project-stat-card-owned">
            <div className="pstat-icon pstat-icon-blue">
              📁
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{analytics.project_stats.total}</div>
              <div className="pstat-label">Total Projects</div>
            </div>
          </div>

          <div className="project-stat-card project-stat-card-member">
            <div className="pstat-icon pstat-icon-green">
              ✅
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{analytics.task_stats.total}</div>
              <div className="pstat-label">Total Tasks</div>
            </div>
          </div>

          <div className="project-stat-card project-stat-card-active">
            <div className="pstat-icon pstat-icon-warning">
              📈
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{analytics.system_health.overall_completion_rate}%</div>
              <div className="pstat-label">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Charts Grid - Row 1 */}
        <div className="charts-grid">
          {/* User Role Distribution */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>User Role Distribution</h3>
              <p className="chart-subtitle">System user composition</p>
            </div>
            <div className="chart-body">
              <Pie data={userRoleData} options={chartOptions} />
            </div>
          </div>

          {/* Task Status Distribution */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Task Status Distribution</h3>
              <p className="chart-subtitle">All tasks across the system</p>
            </div>
            <div className="chart-body">
              <Pie data={taskStatusData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Project Health Overview */}
        <div className="chart-card-full">
          <div className="chart-header">
            <h3>Project Health Overview</h3>
            <p className="chart-subtitle">Top 10 projects by task completion</p>
          </div>
          <div className="chart-body-tall">
            <Bar data={projectHealthData} options={barOptions} />
          </div>
        </div>

        {/* User Workload Distribution */}
        <div className="chart-card-full">
          <div className="chart-header">
            <h3>User Workload Distribution</h3>
            <p className="chart-subtitle">Top 10 users by active tasks</p>
          </div>
          <div className="chart-body-tall">
            <Bar data={userWorkloadData} options={barOptions} />
          </div>
        </div>

        {/* System Metrics Cards */}
        <div className="system-metrics-grid">
          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))', color: '#3b82f6' }}>
              📁
            </div>
            <div className="metric-content">
              <div className="metric-value">{analytics.project_stats.active}</div>
              <div className="metric-label">Active Projects</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))', color: '#10b981' }}>
              ✅
            </div>
            <div className="metric-content">
              <div className="metric-value">{analytics.task_stats.closed}</div>
              <div className="metric-label">Completed Tasks</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))', color: '#ef4444' }}>
              ⚠️
            </div>
            <div className="metric-content">
              <div className="metric-value">{analytics.system_health.overdue_tasks}</div>
              <div className="metric-label">Overdue Tasks</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.05))', color: '#8b5cf6' }}>
              🚀
            </div>
            <div className="metric-content">
              <div className="metric-value">{analytics.task_stats.in_progress}</div>
              <div className="metric-label">In Progress</div>
            </div>
          </div>
        </div>

        {/* Project User Distribution Table */}
        <div className="users-table-container">
          <div className="section-header">
            <h2>📊 Project Team Sizes</h2>
            <p style={{ color: 'var(--dash-text-tertiary)', fontSize: '14px', marginTop: '8px' }}>
              Number of team members per project
            </p>
          </div>
          <div className="project-distribution-grid">
            {Object.entries(analytics.project_user_distribution).slice(0, 12).map(([projectName, userCount]) => (
              <div key={projectName} className="project-dist-card">
                <div className="project-dist-name">{projectName}</div>
                <div className="project-dist-count">
                  <span className="project-dist-icon">👥</span>
                  {userCount} {userCount === 1 ? 'member' : 'members'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemDashboardPage;
