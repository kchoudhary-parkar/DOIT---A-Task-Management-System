import React, { useState, useEffect } from "react";
import "./ProfileSections.css";
import { Pencil, Save, BellRing, CheckCircle2, Circle, Github } from 'lucide-react';

/* ─── Brand SVG Logos ────────────────────────────────────────────── */

const DiscordLogo = () => (
  <svg viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <path
      fill="#5865F2"
      d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83
         A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09
         C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25
         a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0
         c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1
         A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07Z
         M42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Z
         m42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
    />
  </svg>
);

const TeamsLogo = () => (
  <svg viewBox="0 0 2228.833 2073.333" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <path
      fill="#5059C9"
      d="M1554.637,777.5h575.713c54.391,0,98.483,44.092,98.483,98.483v524.398
         c0,199.901-162.051,361.952-361.952,361.952h-1.711c-199.901,0.028-361.975-162.023-361.975-361.924
         c0-0.009,0-0.019,0-0.028V828.971C1503.195,800.544,1526.211,777.5,1554.637,777.5z"
    />
    <circle fill="#5059C9" cx="1943.75" cy="440.583" r="233.25" />
    <circle fill="#7B83EB" cx="1218.083" cy="336.917" r="336.917" />
    <path
      fill="#7B83EB"
      d="M1667.323,777.5H717.01c-53.743,1.33-96.257,45.931-94.927,99.675v598.105
         c-7.825,322.069,247.353,590.16,569.422,598.138c322.069-7.978,577.247-276.069,569.422-598.138
         V877.174C1762.252,823.425,1721.071,777.5,1667.323,777.5z"
    />
    <path
      opacity="0.1"
      d="M1244,777.5v838.145c-0.258,38.435-23.549,72.964-59.09,87.768
         c-11.316,4.787-23.478,7.254-35.765,7.254H667.613c-6.738-21.738-12.958-43.476-17.145-65.853
         c-13.856-65.271-20.926-131.818-21.105-198.552V877.174c-1.33-53.744,41.184-98.345,94.927-99.675H1244z"
    />
    <path
      opacity="0.2"
      d="M1192,777.5v889.668c0,12.287-2.468,24.449-7.254,35.765
         c-14.804,35.541-49.333,58.833-87.768,59.09H691.195c-8.787-21.738-17.145-43.476-23.883-65.853
         c-6.738-22.377-12.958-43.476-17.145-65.853c-13.856-65.271-20.926-131.818-21.105-198.552V877.174
         c-1.33-53.744,41.184-98.345,94.927-99.675H1192z"
    />
    <path
      opacity="0.2"
      d="M1192,777.5v786.621c-0.395,52.223-42.704,94.533-94.927,94.927H649.067
         c-13.856-65.271-20.926-131.818-21.105-198.552V877.174c-1.33-53.744,41.184-98.345,94.927-99.675H1192z"
    />
    <path
      opacity="0.2"
      d="M1140,777.5v786.621c-0.395,52.223-42.704,94.533-94.927,94.927H649.067
         c-13.856-65.271-20.926-131.818-21.105-198.552V877.174c-1.33-53.744,41.184-98.345,94.927-99.675H1140z"
    />
    <path
      fill="#4B53BC"
      d="M97.643,777.5h942.714c53.938,0,97.643,43.705,97.643,97.643v942.714
         c0,53.938-43.705,97.643-97.643,97.643H97.643C43.705,1915.5,0,1871.795,0,1817.857V875.143
         C0,821.205,43.705,777.5,97.643,777.5z"
    />
    <path
      fill="#FFFFFF"
      d="M820.211,1100.856H630.383v517.eighth H509.422v-517.eighth H320.368v-102.8h499.843
         V1100.856z"
      transform="translate(0, -50)"
    />
    <rect fill="#FFFFFF" x="320" y="997" width="499" height="103" />
    <rect fill="#FFFFFF" x="508" y="1100" width="122" height="519" />
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 2447.6 2452.5" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <g clipRule="evenodd" fillRule="evenodd">
      <path
        fill="#ECB22E"
        d="M897.4 0C762.9.1 652.8 110.3 652.9 244.8c0 134.4 110.2 244.5 244.8 244.5h244.5V244.8C1142.2 110.3 1032.1.1 897.4 0zm0 326.1H244.5c-134.5 0-244.5 110.1-244.5 244.5s110 244.5 244.5 244.5h652.8V570.6c0-134.4-110-244.5-244.4-244.5zM0 1307.7c-.1 134.5 109.9 244.7 244.5 244.7 134.5 0 244.5-110.2 244.5-244.7V1063h-244.5C109.9 1063 .1 1173.2 0 1307.7z"
      />
      <path
        fill="#2EB67D"
        d="M1551.7 0c-134.5.1-244.5 110.3-244.5 244.8v652.8h244.5c134.5 0 244.5-110.1 244.5-244.5S1686.1.1 1551.7 0zM652.9 1307.7c.1 134.5 110.3 244.5 244.8 244.5h244.5V1063H897.4c-134.4-.1-244.5 110.1-244.5 244.7z"
      />
      <path
        fill="#E01E5A"
        d="M1307.4 2452.5c134.5 0 244.5-110.1 244.5-244.5s-110-244.5-244.5-244.5h-244.5v244.5c0 134.4 110 244.5 244.5 244.5zm0-326.1h652.8c134.5 0 244.5-110.1 244.5-244.5s-110-244.5-244.5-244.5h-652.8v244.5c0 134.4 110 244.5 244.5 244.5z"
      />
      <path
        fill="#36C5F0"
        d="M2447.6 1881.9c0-134.5-110-244.5-244.5-244.5s-244.5 110-244.5 244.5v244.5h244.5c134.5 0 244.5-110.1 244.5-244.5zm-326.1 0v-652.8c0-134.5-110-244.5-244.5-244.5s-244.5 110-244.5 244.5v652.8c0 134.5 110 244.5 244.5 244.5s244.5-110 244.5-244.5z"
      />
    </g>
  </svg>
);

const GitHubLogo = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Github size={24} color="#181717" strokeWidth={2.2} />
  </div>
);

/* ─── Integration Card ───────────────────────────────────────────── */

const PLATFORMS = [
  {
    key: "discord_webhook",
    name: "Discord",
    Logo: DiscordLogo,
    accentColor: "#5865F2",
    glowColor: "rgba(88,101,242,0.18)",
    placeholder: "https://discord.com/api/webhooks/...",
    hint: "Send personal task notifications to your Discord channel.",
  },
  {
    key: "teams_webhook",
    name: "Microsoft Teams",
    Logo: TeamsLogo,
    accentColor: "#7B83EB",
    glowColor: "rgba(123,131,235,0.18)",
    placeholder: "https://yourcompany.webhook.office.com/...",
    hint: "Connect your Teams workspace for AI-powered alerts.",
  },
  {
    key: "slack_webhook",
    name: "Slack",
    Logo: SlackLogo,
    accentColor: "#2EB67D",
    glowColor: "rgba(46,182,125,0.18)",
    placeholder: "https://hooks.slack.com/services/...",
    hint: "Post updates and task summaries to your Slack channel.",
  },
  {
    key: "github_token",
    name: "GitHub",
    Logo: GitHubLogo,
    accentColor: "#181717",
    glowColor: "rgba(24,23,23,0.12)",
    fieldLabel: "Access Token",
    inputType: "password",
    placeholder: "github_pat_xxxxxxxxxxxxxxxxx",
    hint: "Used by LangGraph AI to read commits, pull requests, branches, and latest changes.",
  },
];

/* ─── Main Component ─────────────────────────────────────────────── */

const Integrations = ({ data, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    discord_webhook: "",
    teams_webhook: "",
    slack_webhook: "",
    github_token: "",
  });
  const [githubConfigured, setGithubConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (data) {
      setFormData({
        discord_webhook: data.discord_webhook || "",
        teams_webhook: data.teams_webhook || "",
        slack_webhook: data.slack_webhook || "",
        github_token: "",
      });
      setGithubConfigured(!!data.github_token_configured);
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

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      discord_webhook: data?.discord_webhook || "",
      teams_webhook: data?.teams_webhook || "",
      slack_webhook: data?.slack_webhook || "",
      github_token: "",
    });
    setGithubConfigured(!!data?.github_token_configured);
  };

  return (
    <div className="profile-section integrations-section">
      {/* ── Header ── */}
      <div className="section-header">
        <div>
          <h2>External Integrations</h2>
          <p>Connect your AI assistant to external platforms for notifications and alerts</p>
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

      {/* ── Toast message ── */}
      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="integrations-cards-grid">
          {PLATFORMS.map(({ key, name, Logo, accentColor, glowColor, placeholder, hint, fieldLabel, inputType }) => {
            const isConnected = key === "github_token" ? githubConfigured : !!formData[key];
            return (
              <div
                key={key}
                className="integration-card"
                style={{
                  "--accent": accentColor,
                  "--glow": glowColor,
                  borderColor: isConnected ? accentColor : undefined,
                }}
              >
                {/* Card header */}
                <div className="integration-card-header">
                  <div
                    className="integration-logo-wrap"
                    style={{ background: glowColor }}
                  >
                    <Logo />
                  </div>
                  <div className="integration-meta">
                    <span className="integration-name">{name}</span>
                    <span
                      className={`integration-badge ${isConnected ? "connected" : "not-connected"}`}
                      style={isConnected ? { color: accentColor, borderColor: accentColor, background: glowColor } : {}}
                    >
                      {isConnected ? (
                        <><CheckCircle2 size={11} /> Connected</>
                      ) : (
                        <><Circle size={11} /> Not connected</>
                      )}
                    </span>
                  </div>
                </div>

                {/* Webhook URL field */}
                <div className="integration-field">
                  <label htmlFor={key} className="integration-label">
                    {fieldLabel || "Webhook URL"}
                  </label>
                  <input
                    id={key}
                    type={inputType || "text"}
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="integration-input"
                    placeholder={placeholder}
                    style={isEditing ? { "--focus-color": accentColor } : {}}
                    aria-label={`${name} ${fieldLabel || "Webhook URL"}`}
                  />
                  <p className="field-hint">{hint}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── How it works / Actions ── */}
        {!isEditing ? (
          <div className="integrations-status-pane">
            <div className="status-card highlight">
              <BellRing className="status-icon" size={22} />
              <div className="status-content">
                <h4>How it works</h4>
                <p>
                  Once you provide a webhook URL, the AI Assistant can send personal messages,
                  reports, and task alerts to your private channel when you ask it to. You can also
                  connect GitHub with a token for repository intelligence commands.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
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
  );
};

export default Integrations;