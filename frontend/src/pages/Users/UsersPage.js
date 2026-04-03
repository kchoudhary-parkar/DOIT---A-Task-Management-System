import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { AuthContext } from "../../context/AuthContext";
import { memberAPI, projectAPI, userAPI } from "../../services/api";
import "../Dashboard/DashboardPage.css";
import "./UsersPage.css";
import Loader from "../../components/Loader/Loader";
import { Search, X } from "lucide-react";

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
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);

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
      setMemberSearch("");
      setIsMembersDrawerOpen(false);
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
      setMemberSearch("");
      setIsMembersDrawerOpen(false);
    } catch (err) {
      setError(err.message || "Failed to load admin list");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAdminProject = async (project) => {
    try {
      setMembersLoading(true);
      setError("");
      setSelectedAdminProject(project);
      setMemberSearch("");
      setIsMembersDrawerOpen(true);
      const membersResponse = await memberAPI.getMembers(project._id || project.id);
      setSelectedAdminProjectMembers(membersResponse.members || []);
    } catch (err) {
      setError(err.message || "Failed to load project members");
      setSelectedAdminProjectMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleSelectAdmin = async (adminUser) => {
    try {
      setLoading(true);
      setError("");
      setSelectedAdmin(adminUser);
      setSelectedSuperAdminProject(null);
      setSelectedSuperAdminMembers([]);
      setMemberSearch("");
      setIsMembersDrawerOpen(false);

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
    setMembersLoading(true);
    setSelectedSuperAdminProject(project);
    setMemberSearch("");
    setIsMembersDrawerOpen(true);

    // Exclude selected admin from members list by requirement.
    const filtered = (project.members || []).filter(
      (member) => member.user_id !== selectedAdmin?.id
    );

    setSelectedSuperAdminMembers(filtered);
    setMembersLoading(false);
  };

  /* ── Animation Observer ───────────────────────────────────────────── */
  const sectionsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("about-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    sectionsRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [loading, adminProjects, admins, selectedAdminProject, selectedAdmin]);

  const addRef = (el) => {
    if (el && !sectionsRef.current.includes(el)) sectionsRef.current.push(el);
  };

  const selectedProject = isAdmin ? selectedAdminProject : selectedSuperAdminProject;
  const selectedMembers = isAdmin ? selectedAdminProjectMembers : selectedSuperAdminMembers;

  const normalizedMembers = useMemo(
    () =>
      (selectedMembers || []).map((member) => {
        const roleLabel =
          member.role || member.user_role || member.member_role || member.project_role || "Member";

        return {
          ...member,
          roleLabel,
        };
      }),
    [selectedMembers]
  );

  const roleSummary = useMemo(() => {
    const counts = new Map();

    normalizedMembers.forEach((member) => {
      const key = member.roleLabel;
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return Array.from(counts.entries());
  }, [normalizedMembers]);

  const filteredMembers = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();
    if (!search) {
      return normalizedMembers;
    }

    return normalizedMembers.filter((member) => {
      const name = (member.name || "").toLowerCase();
      const email = (member.email || "").toLowerCase();
      const role = (member.roleLabel || "").toLowerCase();
      return name.includes(search) || email.includes(search) || role.includes(search);
    });
  }, [memberSearch, normalizedMembers]);

  const handleCloseMembersPanel = () => {
    setIsMembersDrawerOpen(false);
    setMemberSearch("");

    if (isAdmin) {
      setSelectedAdminProject(null);
      setSelectedAdminProjectMembers([]);
      return;
    }

    setSelectedSuperAdminProject(null);
    setSelectedSuperAdminMembers([]);
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

  const renderMembersPanelContent = () => {
    if (!selectedProject) {
      return null;
    }

    return (
      <>
        <div className="users-members-header">
          <div>
            <h4 className="users-tree-heading">{selectedProject.name}</h4>
            <p className="users-members-subheading">
              {normalizedMembers.length} member{normalizedMembers.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            className="users-drawer-close"
            onClick={handleCloseMembersPanel}
            aria-label="Close members panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="users-member-search-wrap">
          <Search size={16} className="users-member-search-icon" />
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="users-member-search"
            placeholder="Search members by name, email, or role"
            aria-label="Search members"
          />
        </div>

        {roleSummary.length > 0 && (
          <div className="users-role-chips">
            {roleSummary.map(([role, count]) => (
              <span key={role} className="users-role-chip">
                {role} ({count})
              </span>
            ))}
          </div>
        )}

        <div className="users-member-list users-member-list-cards">
          {membersLoading ? (
            <div className="users-empty">Loading members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="users-empty">
              {normalizedMembers.length === 0
                ? "No members found in this project."
                : "No members match your search."}
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div
                key={`${selectedProject._id || selectedProject.id}-${member.user_id}`}
                className="users-member-item users-member-card"
              >
                <div className="users-member-avatar">{(member.name || "U").charAt(0).toUpperCase()}</div>
                <div className="users-member-meta">
                  <div className="users-member-name">{member.name}</div>
                  <div className="users-member-email">{member.email}</div>
                  <span className="users-member-role-chip">{member.roleLabel}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-page">
      {/* ── Background Decoration ────────────────────────────────────── */}
      <div className="users-hero-bg" aria-hidden="true">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-grid" />
      </div>

      <div className="dashboard-container">
        <header className="dashboard-header about-fade-up" ref={addRef}>
          <div className="users-hero-badge">
            <Search size={12} />
            <span>User Intelligence Console</span>
          </div>
          <h1>Users Control</h1>
          <p className="dashboard-subtitle">{treeTitle}</p>
        </header>

        {isAdmin && (
          <section className="about-fade-up" ref={addRef}>
            <div className="users-master-detail">
              <div className="users-master-content">
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
              </div>

              {selectedProject && (
                <aside className="users-tree-panel users-detail-panel about-fade-up" ref={addRef}>
                  {renderMembersPanelContent()}
                </aside>
              )}
            </div>
          </section>
        )}

        {isSuperAdmin && (
          <section className="about-fade-up" ref={addRef}>
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
              <div className="about-fade-up" ref={addRef}>
                <div className="users-master-detail">
                  <div className="users-master-content">
                    <h3 className="users-section-title">Projects Created By {selectedAdmin.name}</h3>
                    <div className="users-card-grid">
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
                  </div>

                  {selectedProject && (
                    <aside className="users-tree-panel users-detail-panel">
                      {renderMembersPanelContent()}
                    </aside>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {selectedProject && (
          <div className="about-fade-up" ref={addRef}>
            <div
              className={`users-drawer-backdrop ${isMembersDrawerOpen ? "open" : ""}`}
              onClick={handleCloseMembersPanel}
            ></div>
            <div className={`users-mobile-drawer ${isMembersDrawerOpen ? "open" : ""}`}>
              {renderMembersPanelContent()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
