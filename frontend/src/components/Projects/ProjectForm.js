import React, { useState, useEffect } from "react";
import {
  FiX,
  FiFolder,
  FiFileText,
  FiSave,
  FiAlertCircle,
  FiInfo,
  FiEdit3,
  FiGithub
} from "react-icons/fi";
import "./ProjectForm.css";

function ProjectForm({ onSubmit, onCancel, initialData = null }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gitRepoUrl, setGitRepoUrl] = useState("");
  const [gitAccessToken, setGitAccessToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || "");
      setGitRepoUrl(initialData.git_repo_url || "");
      // Don't populate token for security
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 3) {
      setError("Project name must be at least 3 characters");
      return;
    }

    // Validate GitHub URL if provided
    if (gitRepoUrl && !gitRepoUrl.includes('github.com')) {
      setError("Please enter a valid GitHub repository URL");
      return;
    }

    const projectData = { 
      name: name.trim(), 
      description: description.trim(),
      git_repo_url: gitRepoUrl.trim(),
      git_access_token: gitAccessToken.trim()
    };

    onSubmit(projectData);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">
            <div className="modal-icon">
              {initialData ? (
                <FiEdit3 size={18} style={{ color: '#06b6d4' }} />
              ) : (
                <FiFolder size={18} style={{ color: '#06b6d4' }} />
              )}
            </div>
            {initialData ? "Edit Project" : "Create New Project"}
          </h2>
          <button 
            type="button" 
            onClick={onCancel} 
            className="btn-close"
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              <FiFolder size={16} className="form-label-icon" />
              Project Name
              <span className="required-indicator">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Website Redesign, Mobile App"
              required
              autoFocus
              maxLength={100}
            />
            <div className="form-hint">
              <FiInfo size={12} />
              <span>A clear, descriptive name for your project</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              <FiFileText size={16} className="form-label-icon" />
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project goals, scope, and key deliverables..."
              rows="5"
              maxLength={500}
            />
            <div className="form-hint">
              <FiInfo size={12} />
              <span>Optional: Help team members understand the project context</span>
            </div>
          </div>

          <div className="form-section-divider">
            <FiGithub size={16} />
            <span>GitHub Integration (Optional)</span>
          </div>

          <div className="form-group">
            <label htmlFor="gitRepoUrl" className="form-label">
              <FiGithub size={16} className="form-label-icon" />
              Repository URL
            </label>
            <input
              type="url"
              id="gitRepoUrl"
              value={gitRepoUrl}
              onChange={(e) => setGitRepoUrl(e.target.value)}
              placeholder="https://github.com/company/project-name"
              maxLength={200}
            />
            <div className="form-hint">
              <FiInfo size={12} />
              <span>Link your project to track branches, commits, and PRs</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gitAccessToken" className="form-label">
              <FiGithub size={16} className="form-label-icon" />
              GitHub Access Token
            </label>
            <input
              type="password"
              id="gitAccessToken"
              value={gitAccessToken}
              onChange={(e) => setGitAccessToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx (optional if using default)"
              maxLength={100}
            />
            <div className="form-hint">
              <FiInfo size={12} />
              <span>Personal access token with repo and webhook permissions</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <FiAlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              onClick={onCancel} 
              className="btn btn-secondary"
            >
              <FiX size={16} />
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <FiSave size={16} />
              {initialData ? "Update Project" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectForm;