import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { userAPI } from "../../services/api";
import "../Dashboard/DashboardPage.css";
import "./SuperAdminDashboard.css";
import Loader from "../../components/Loader/Loader";

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    superAdmins: 0,
    admins: 0,
    members: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getAllUsers();
      const users = data.users || [];

      setStats({
        totalUsers: users.length,
        superAdmins: users.filter((u) => u.role === "super-admin").length,
        admins: users.filter((u) => u.role === "admin").length,
        members: users.filter((u) => u.role === "member").length,
      });
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="super-admin-dashboard">
        <div className="dashboard-container">
          <p className="loading-text">⚡ Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page super-admin-dashboard-page">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>🚀 Super Admin Dashboard</h1>
            <p className="dashboard-subtitle">
              System-wide control and user management
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="project-stats-row superadmin-stats-row">
          <div className="project-stat-card project-stat-card-total">
            <div className="pstat-icon pstat-icon-purple">
              👥
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{stats.totalUsers}</div>
              <div className="pstat-label">Total Users</div>
            </div>
          </div>

          <div className="project-stat-card project-stat-card-owned">
            <div className="pstat-icon pstat-icon-pink">
              ⭐
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{stats.superAdmins}</div>
              <div className="pstat-label">Super Admins</div>
            </div>
          </div>

          <div className="project-stat-card project-stat-card-member">
            <div className="pstat-icon pstat-icon-blue">
              🛡️
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{stats.admins}</div>
              <div className="pstat-label">Admins</div>
            </div>
          </div>

          <div className="project-stat-card project-stat-card-active">
            <div className="pstat-icon pstat-icon-green">
              👤
            </div>
            <div className="pstat-content">
              <div className="pstat-value">{stats.members}</div>
              <div className="pstat-label">Members</div>
            </div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="management-section">
          <div className="section-header">
            <h2>System Management</h2>
          </div>
          <div className="management-cards">
            <div
              className="management-card user-management"
              onClick={() => navigate("/user-management")}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && navigate("/user-management")}
            >
              <div className="card-icon">👥</div>
              <div className="card-content">
                <h3>User Management</h3>
                <p>Manage user roles, permissions, and access control</p>
                <div className="card-stats">
                  <span className="badge">{stats.totalUsers} Users</span>
                </div>
              </div>
              <div className="card-arrow">→</div>
            </div>

            <div
              className="management-card system-info"
              onClick={() => navigate("/system-dashboard")}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && navigate("/system-dashboard")}
            >
              <div className="card-icon">📊</div>
              <div className="card-content">
                <h3>System Dashboard</h3>
                <p>View overall system statistics and activity</p>
              </div>
              <div className="card-arrow">→</div>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="info-section">
          <div className="info-card">
            <div className="info-icon">ℹ️</div>
            <div className="info-content">
              <h4>About This Dashboard</h4>
              <p>
                As a Super Administrator, you have full control over the system.
                You can manage users, assign roles, and oversee all projects and tasks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
