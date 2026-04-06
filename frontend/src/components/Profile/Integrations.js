import React, { useState, useEffect } from "react";
import "./ProfileSections.css";
import { Pencil, Save, Link2, BellRing } from 'lucide-react';

const Integrations = ({ data, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    discord_webhook: "",
    teams_webhook: "",
    slack_webhook: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (data) {
      setFormData({
        discord_webhook: data.discord_webhook || "",
        teams_webhook: data.teams_webhook || "",
        slack_webhook: data.slack_webhook || ""
      });
    }
  }, [data]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await onUpdate(formData);
      setMessage({ type: "success", text: "Integration settings updated successfully!" });
      setIsEditing(false);
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update settings" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-section integrations-section">
      <div className="section-header">
        <div>
          <h2>External Integrations</h2>
          <p>Connect your AI assistant to external platforms like Discord, Teams, and Slack</p>
        </div>
        {!isEditing && (
          <button
            className="btn-edit"
            onClick={() => setIsEditing(true)}
            aria-label="Edit integration settings"
          >
            <Pencil className="btn-icon-text" size={16} />
            Edit
          </button>
        )}
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="integrations-layout">
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="integrations-grid">
            <div className="form-group full-width">
              <label htmlFor="discord_webhook">Discord Webhook URL</label>
              <div className="input-with-icon">
                <Link2 className="input-icon" size={18} />
                <input
                  id="discord_webhook"
                  type="text"
                  name="discord_webhook"
                  value={formData.discord_webhook}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="form-input"
                  placeholder="https://discord.com/api/webhooks/..."
                  aria-label="Discord Webhook URL"
                />
              </div>
              <p className="field-hint">Used for sending personal task notifications to your Discord channel.</p>
            </div>

            <div className="form-group full-width">
              <label htmlFor="teams_webhook">Microsoft Teams Webhook URL</label>
              <div className="input-with-icon">
                <Link2 className="input-icon" size={18} />
                <input
                  id="teams_webhook"
                  type="text"
                  name="teams_webhook"
                  value={formData.teams_webhook}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="form-input"
                  placeholder="https://yourcompany.webhook.office.com/..."
                  aria-label="Teams Webhook URL"
                />
              </div>
              <p className="field-hint">Connect your personal Teams workspace for AI-powered alerts.</p>
            </div>

            <div className="form-group full-width">
              <label htmlFor="slack_webhook">Slack Webhook URL</label>
              <div className="input-with-icon">
                <Link2 className="input-icon" size={18} />
                <input
                  id="slack_webhook"
                  type="text"
                  name="slack_webhook"
                  value={formData.slack_webhook}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="form-input"
                  placeholder="https://hooks.slack.com/services/..."
                  aria-label="Slack Webhook URL"
                />
              </div>
              <p className="field-hint">Post updates and task summaries to your Slack channel.</p>
            </div>
          </div>

          {!isEditing ? (
            <div className="integrations-status-pane">
              <div className="status-card highlight">
                <BellRing className="status-icon" size={24} />
                <div className="status-content">
                  <h4>How it works</h4>
                  <p>
                    Once you provide a webhook URL, the AI Assistant can send personal messages, 
                    reports, and task alerts to your private channel when you ask it to.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    discord_webhook: data.discord_webhook || "",
                    teams_webhook: data.teams_webhook || "",
                    slack_webhook: data.slack_webhook || ""
                  });
                }}
                disabled={loading}
                aria-label="Cancel editing"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-save"
                disabled={loading}
                aria-label="Save changes"
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="btn-icon-text" size={16} />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Integrations;
