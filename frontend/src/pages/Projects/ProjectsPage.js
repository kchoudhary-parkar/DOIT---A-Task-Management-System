import React, { useState, useEffect, useContext } from "react";
import { projectAPI } from "../../services/api";
import { ProjectCard, ProjectForm } from "../../components/Projects";
import { AuthContext } from "../../context/AuthContext";
import "./ProjectsPage.css";
import Loader from "../../components/Loader/Loader";
import {
  FiPlus,
  FiAlertCircle,
  FiCheckCircle,
  FiLayers,
  FiGrid,
  FiInbox
} from "react-icons/fi";

function ProjectsPage() {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const canCreateProject = user?.role === "admin" || user?.role === "super-admin";

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await projectAPI.getAll();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      setError("");
      setSuccess("");
      await projectAPI.create(projectData);
      setSuccess("Project created successfully!");
      setShowForm(false);
      fetchProjects();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to create project");
    }
  };

  const handleUpdateProject = async (projectData) => {
    try {
      setError("");
      setSuccess("");
      await projectAPI.update(editingProject._id, projectData);
      setSuccess("Project updated successfully!");
      setShowForm(false);
      setEditingProject(null);
      fetchProjects();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update project");
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      await projectAPI.delete(projectId);
      setSuccess("Project deleted successfully!");
      fetchProjects();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to delete project");
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  if (loading) {
    return (
      <div className="projects-page projects-page-center">
        <div style={{ position: 'relative', minHeight: '400px', width: '100%' }}>
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="projects-bg" />

      <header className="projects-header">
        <div className="projects-title-block">
          <h1>
            <FiLayers size={28} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
            My Projects
          </h1>
          <p>
            {canCreateProject 
              ? "Projects you own and projects you're a member of." 
              : "Projects you're a member of and working on"}
          </p>
        </div>

        <div className="projects-header-actions">
          <div className="projects-stat-chip">
            <FiGrid size={16} style={{ color: 'var(--dark-text-secondary, var(--light-text-secondary))' }} />
            <span className="stat-label">Total</span>
            <span className="stat-value">{projects.length}</span>
          </div>
          {canCreateProject && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary btn-create"
            >
              <FiPlus size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              New Project
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <FiCheckCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {success}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="empty-state glass-panel">
          <div style={{ marginBottom: '16px' }}>
            <FiInbox size={64} style={{ 
              color: 'var(--dark-text-muted, var(--light-text-muted))',
              opacity: 0.5
            }} />
          </div>
          <h2>
            {canCreateProject ? "No Projects Yet" : "You are not working on any project"}
          </h2>
          {canCreateProject && (
            <>
              <p>Create your first project to get started.</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
              >
                <FiPlus size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Create Project
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="projects-layout">
          <section className="projects-list glass-panel">
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onDelete={handleDeleteProject}
                onEdit={handleEditProject}
              />
            ))}
          </section>
        </div>
      )}

      {showForm && (
        <ProjectForm
          onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
          onCancel={handleCloseForm}
          initialData={editingProject}
        />
      )}
    </div>
  );
}

export default ProjectsPage;