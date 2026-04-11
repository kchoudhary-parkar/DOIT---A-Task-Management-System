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
  const [githubWebhookUrl, setGithubWebhookUrl] = useState("");
  const [gitAccessToken, setGitAccessToken] = useState("");
  // Teams Webhook URI for integration
  const [teamsWebhook, setTeamsWebhook] = useState("");
  // Slack Workspace Bot Token (optional)
  const [slackToken, setSlackToken] = useState("");
  const [error, setError] = useState("");
useEffect(() => {
  if (initialData) {
    setName(initialData.name);
    setDescription(initialData.description || "");
    setGitRepoUrl(initialData.git_repo_url || "");
    setGithubWebhookUrl(initialData.github_webhook_url || "");
    // Don't populate token for security
    setTeamsWebhook(initialData.teams_webhook || "");
    setSlackToken(""); // Always clear slack token on edit/new
  } else {
    setGithubWebhookUrl("");
    setSlackToken(""); // Also clear on new
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

    if (githubWebhookUrl && !githubWebhookUrl.includes('/api/tasks/github/webhook')) {
      setError("Webhook URL should point to /api/tasks/github/webhook endpoint");
      return;
    }


    const projectData = { 
      name: name.trim(), 
      description: description.trim(),
      git_repo_url: gitRepoUrl.trim(),
      github_webhook_url: githubWebhookUrl.trim(),
      git_access_token: gitAccessToken.trim(),
      integrations: {}
    };
    if (slackToken.trim()) {
      projectData.integrations.slack = { workspace_token: slackToken.trim() };
    }
    if (teamsWebhook.trim()) {
      projectData.integrations.teams = { webhook_url: teamsWebhook.trim() };
    }
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span role="img" aria-label="integration">🔗</span>
              Integrations
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="slackToken" className="form-label">
              <span style={{ color: '#4A154B', fontWeight: 600, marginRight: 6 }}>Slack Workspace Bot Token</span>
              <span className="form-hint">(optional)</span>
            </label>
            <input
              type="password"
              id="slackToken"
              value={slackToken}
              onChange={e => setSlackToken(e.target.value)}
              placeholder="xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx"
              maxLength={200}
            />
            <div className="form-hint">
              <span>Provide your Slack bot token to create the channel in your workspace. Leave blank to use the default workspace.</span>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="teamsWebhook" className="form-label">
              <span style={{ color: '#7B83EB', fontWeight: 600, marginRight: 6 }}>MS Teams Webhook URI</span>
              <span className="form-hint">(optional)</span>
            </label>
            <input
              type="url"
              id="teamsWebhook"
              value={teamsWebhook}
              onChange={e => setTeamsWebhook(e.target.value)}
              placeholder="https://yourcompany.webhook.office.com/..."
              maxLength={300}
            />
            <div className="form-hint">
              <span>Slack and Discord channels will be auto-created. Enter a Teams Webhook URI to enable Teams notifications.</span>
            </div>
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

          <div className="form-group">
            <label htmlFor="githubWebhookUrl" className="form-label">
              <FiGithub size={16} className="form-label-icon" />
              GitHub Webhook URL
            </label>
            <input
              type="url"
              id="githubWebhookUrl"
              value={githubWebhookUrl}
              onChange={(e) => setGithubWebhookUrl(e.target.value)}
              placeholder="https://your-backend-domain/api/tasks/github/webhook"
              maxLength={300}
            />
            <div className="form-hint">
              <FiInfo size={12} />
              <span>Used for instant push/PR event triggers without page refresh.</span>
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