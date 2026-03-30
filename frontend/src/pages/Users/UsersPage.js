import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { memberAPI, projectAPI, userAPI } from "../../services/api";
import "../Dashboard/DashboardPage.css";
import "./UsersPage.css";
import Loader from "../../components/Loader/Loader";

const UsersPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const isSuperAdmin = user?.role === "super-admin";
  const isAdmin = user?.role === "admin";
  const canAccess = isSuperAdmin || isAdmin;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Admin mode
  const [adminProjects, setAdminProjects] = useState([]);
  const [selectedAdminProject, setSelectedAdminProject] = useState(null);
  const [selectedAdminProjectMembers, setSelectedAdminProjectMembers] = useState([]);

  // Super-admin mode
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedAdminProjects, setSelectedAdminProjects] = useState([]);
  const [selectedSuperAdminProject, setSelectedSuperAdminProject] = useState(null);
  const [selectedSuperAdminMembers, setSelectedSuperAdminMembers] = useState([]);

  useEffect(() => {
    if (!canAccess) {
      navigate("/");
      return;
    }

    if (isAdmin) {
      loadAdminView();
    } else if (isSuperAdmin) {
      loadSuperAdminView();
    }
  }, [canAccess, isAdmin, isSuperAdmin, navigate]);

  const loadAdminView = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await projectAPI.getAll();
      const projects = (data.projects || []).filter((project) => project.is_owner);
      setAdminProjects(projects);

      setSelectedAdminProject(null);
      setSelectedAdminProjectMembers([]);
    } catch (err) {
      setError(err.message || "Failed to load admin projects");
    } finally {
      setLoading(false);
    }
  };

  const loadSuperAdminView = async () => {
    try {
      setLoading(true);
      setError("");

      const usersResponse = await userAPI.getAllUsers();
      const adminUsers = (usersResponse.users || []).filter((u) => u.role === "admin");
      setAdmins(adminUsers);

      setSelectedAdmin(null);
      setSelectedAdminProjects([]);
      setSelectedSuperAdminProject(null);
      setSelectedSuperAdminMembers([]);
    } catch (err) {
      setError(err.message || "Failed to load admin list");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAdminProject = async (project) => {
    try {
      setLoading(true);
      setError("");
      setSelectedAdminProject(project);
      const membersResponse = await memberAPI.getMembers(project._id || project.id);
      setSelectedAdminProjectMembers(membersResponse.members || []);
    } catch (err) {
      setError(err.message || "Failed to load project members");
      setSelectedAdminProjectMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAdmin = async (adminUser) => {
    try {
      setLoading(true);
      setError("");
      setSelectedAdmin(adminUser);
      setSelectedSuperAdminProject(null);
      setSelectedSuperAdminMembers([]);

      const response = await userAPI.getAdminProjects(adminUser.id);
      setSelectedAdminProjects(response.projects || []);
    } catch (err) {
      setError(err.message || "Failed to load admin projects");
      setSelectedAdminProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuperAdminProject = (project) => {
    setSelectedSuperAdminProject(project);

    // Exclude selected admin from members list by requirement.
    const filtered = (project.members || []).filter(
      (member) => member.user_id !== selectedAdmin?.id
    );

    setSelectedSuperAdminMembers(filtered);
  };

  const treeTitle = useMemo(() => {
    if (isAdmin) {
      return "My Admin Projects";
    }
    return "Admin Project Hierarchy";
  }, [isAdmin]);

  if (loading && !error && ((isAdmin && adminProjects.length === 0 && !selectedAdminProject) || (isSuperAdmin && admins.length === 0 && !selectedAdmin))) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div style={{ position: "relative", minHeight: "360px" }}>
            <Loader />
          </div>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="error-message">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Users</h1>
            <p className="dashboard-subtitle">{treeTitle}</p>
          </div>
        </div>

        {isAdmin && (
          <>
            <h3 className="users-section-title">Projects Where You Are Admin</h3>
            <div className="users-card-grid">
              {adminProjects.length === 0 ? (
                <div className="users-empty">No projects found where you are the owner/admin.</div>
              ) : (
                adminProjects.map((project) => (
                  <button
                    key={project._id}
                    className={`users-node-card ${selectedAdminProject?._id === project._id ? "active" : ""}`}
                    onClick={() => handleSelectAdminProject(project)}
                  >
                    <div className="users-node-title">{project.name}</div>
                    <div className="users-node-subtitle">{project.description || "No description"}</div>
                  </button>
                ))
              )}
            </div>

            {selectedAdminProject && (
              <div className="users-tree-panel">
                <h4 className="users-tree-heading">Members in {selectedAdminProject.name}</h4>
                <div className="users-member-list">
                  {selectedAdminProjectMembers.length === 0 ? (
                    <div className="users-empty">No members found in this project.</div>
                  ) : (
                    selectedAdminProjectMembers.map((member) => (
                      <div key={`${selectedAdminProject._id}-${member.user_id}`} className="users-member-item">
                        <div className="users-member-name">{member.name}</div>
                        <div className="users-member-email">{member.email}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {isSuperAdmin && (
          <>
            <h3 className="users-section-title">Admins</h3>
            <div className="users-card-grid">
              {admins.length === 0 ? (
                <div className="users-empty">No admin users found.</div>
              ) : (
                admins.map((adminUser) => (
                  <button
                    key={adminUser.id}
                    className={`users-node-card ${selectedAdmin?.id === adminUser.id ? "active" : ""}`}
                    onClick={() => handleSelectAdmin(adminUser)}
                  >
                    <div className="users-node-title">{adminUser.name}</div>
                    <div className="users-node-subtitle">{adminUser.email}</div>
                  </button>
                ))
              )}
            </div>

            {selectedAdmin && (
              <>
                <h3 className="users-section-title">Projects Created By {selectedAdmin.name}</h3>
                <div className="users-card-grid nested">
                  {selectedAdminProjects.length === 0 ? (
                    <div className="users-empty">No projects created by this admin.</div>
                  ) : (
                    selectedAdminProjects.map((project) => (
                      <button
                        key={project.id}
                        className={`users-node-card ${selectedSuperAdminProject?.id === project.id ? "active" : ""}`}
                        onClick={() => handleSelectSuperAdminProject(project)}
                      >
                        <div className="users-node-title">{project.name}</div>
                        <div className="users-node-subtitle">{project.description || "No description"}</div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {selectedSuperAdminProject && (
              <div className="users-tree-panel">
                <h4 className="users-tree-heading">Members in {selectedSuperAdminProject.name}</h4>
                <div className="users-member-list">
                  {selectedSuperAdminMembers.length === 0 ? (
                    <div className="users-empty">No members found in this project.</div>
                  ) : (
                    selectedSuperAdminMembers.map((member) => (
                      <div key={`${selectedSuperAdminProject.id}-${member.user_id}`} className="users-member-item">
                        <div className="users-member-name">{member.name}</div>
                        <div className="users-member-email">{member.email}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
