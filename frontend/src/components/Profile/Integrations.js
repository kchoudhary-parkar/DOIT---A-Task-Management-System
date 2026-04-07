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
    <path opacity="0.1" d="M1244,777.5v838.145c-0.258,38.435-23.549,72.964-59.09,87.768c-11.316,4.787-23.478,7.254-35.765,7.254H667.613c-6.738-21.738-12.958-43.476-17.145-65.853c-13.856-65.271-20.926-131.818-21.105-198.552V877.174c-1.33-53.744,41.184-98.345,94.927-99.675H1244z" />
    <path opacity="0.2" d="M1192,777.5v889.668c0,12.287-2.468,24.449-7.254,35.765c-14.804,35.541-49.333,58.833-87.768,59.09H691.195c-8.787-21.738-17.145-43.476-23.883-65.853c-6.738-22.377-12.958-43.476-17.145-65.853c-13.856-65.271-20.926-131.818-21.105-198.552V877.174c-1.33-53.744,41.184-98.345,94.927-99.675H1192z" />
    <path opacity="0.2" d="M1192,777.5v786.621c-0.395,52.223-42.704,94.533-94.927,94.927H649.067c-13.856-65.271-20.926-131.818-21.105-198.552V877.174c-1.33-53.744,41.184-98.345,94.927-99.675H1192z" />
    <path opacity="0.2" d="M1140,777.5v786.621c-0.395,52.223-42.704,94.533-94.927,94.927H649.067c-13.856-65.271-20.926-131.818-21.105-198.552V877.174c-1.33-53.744,41.184-98.345,94.927-99.675H1140z" />
    <path fill="#4B53BC" d="M97.643,777.5h942.714c53.938,0,97.643,43.705,97.643,97.643v942.714c0,53.938-43.705,97.643-97.643,97.643H97.643C43.705,1915.5,0,1871.795,0,1817.857V875.143C0,821.205,43.705,777.5,97.643,777.5z" />
    <rect fill="#FFFFFF" x="320" y="997" width="499" height="103" />
    <rect fill="#FFFFFF" x="508" y="1100" width="122" height="519" />
  </svg>
);

const SlackLogo = () => (
  <svg viewBox="0 0 2447.6 2452.5" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <g clipRule="evenodd" fillRule="evenodd">
      <path fill="#ECB22E" d="M897.4 0C762.9.1 652.8 110.3 652.9 244.8c0 134.4 110.2 244.5 244.8 244.5h244.5V244.8C1142.2 110.3 1032.1.1 897.4 0zm0 326.1H244.5c-134.5 0-244.5 110.1-244.5 244.5s110 244.5 244.5 244.5h652.8V570.6c0-134.4-110-244.5-244.4-244.5zM0 1307.7c-.1 134.5 109.9 244.7 244.5 244.7 134.5 0 244.5-110.2 244.5-244.7V1063h-244.5C109.9 1063 .1 1173.2 0 1307.7z" />
      <path fill="#2EB67D" d="M1551.7 0c-134.5.1-244.5 110.3-244.5 244.8v652.8h244.5c134.5 0 244.5-110.1 244.5-244.5S1686.1.1 1551.7 0zM652.9 1307.7c.1 134.5 110.3 244.5 244.8 244.5h244.5V1063H897.4c-134.4-.1-244.5 110.1-244.5 244.7z" />
      <path fill="#E01E5A" d="M1307.4 2452.5c134.5 0 244.5-110.1 244.5-244.5s-110-244.5-244.5-244.5h-244.5v244.5c0 134.4 110 244.5 244.5 244.5zm0-326.1h652.8c134.5 0 244.5-110.1 244.5-244.5s-110-244.5-244.5-244.5h-652.8v244.5c0 134.4 110 244.5 244.5 244.5z" />
      <path fill="#36C5F0" d="M2447.6 1881.9c0-134.5-110-244.5-244.5-244.5s-244.5 110-244.5 244.5v244.5h244.5c134.5 0 244.5-110.1 244.5-244.5zm-326.1 0v-652.8c0-134.5-110-244.5-244.5-244.5s-244.5 110-244.5 244.5v652.8c0 134.5 110 244.5 244.5 244.5s244.5-110 244.5-244.5z" />
    </g>
  </svg>
);

const WhatsAppLogo = () => (
  <svg viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
    <path
      fill="#25D366"
      d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.7 17.8 69.4 27.2 106.1 27.2h.1c122.3 0 222-99.6 222-222 0-59.3-23-115.1-65-157.2zM223.9 445.3c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 365.4l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 54 81.2 54 130.5 0 101.8-82.7 184.6-184.5 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.4-8.6-44.6-27.4-16.4-14.6-27.5-32.7-30.7-38.2-3.2-5.6-.3-8.6 2.5-11.3 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.2 3.7-5.5 5.5-9.2 1.9-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"
    />
  </svg>
);

const GitHubLogo = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
    <Github size={24} color="#e2e8f0" strokeWidth={2.2} />
  </div>
);

/* ─── Platform config ────────────────────────────────────────────── */

const PLATFORMS = [
  {
    key: "discord_webhook",
    name: "Discord",
    Logo: DiscordLogo,
    accentColor: "#5865F2",
    glowColor: "rgba(88,101,242,0.18)",
    fieldLabel: "Webhook URL",
    inputType: "text",
    placeholder: "https://discord.com/api/webhooks/...",
    hint: "Send personal task notifications to your Discord channel.",
  },
  {
    key: "teams_webhook",
    name: "Microsoft Teams",
    Logo: TeamsLogo,
    accentColor: "#7B83EB",
    glowColor: "rgba(123,131,235,0.18)",
    fieldLabel: "Webhook URL",
    inputType: "text",
    placeholder: "https://yourcompany.webhook.office.com/...",
    hint: "Connect your Teams workspace for AI-powered alerts.",
  },
  {
    key: "slack_webhook",
    name: "Slack",
    Logo: SlackLogo,
    accentColor: "#2EB67D",
    glowColor: "rgba(46,182,125,0.18)",
    fieldLabel: "Webhook URL",
    inputType: "text",
    placeholder: "https://hooks.slack.com/services/...",
    hint: "Post updates and task summaries to your Slack channel.",
  },
  {
    key: "whatsapp_number",
    name: "WhatsApp",
    Logo: WhatsAppLogo,
    accentColor: "#25D366",
    glowColor: "rgba(37,211,102,0.18)",
    fieldLabel: "Phone Number",
    inputType: "text",
    placeholder: "+919028341603",
    hint: "Enter your phone number to receive AI alerts on WhatsApp.",
  },
  {
    key: "github_token",
    name: "GitHub",
    Logo: GitHubLogo,
    accentColor: "#6e7681",
    glowColor: "rgba(110,118,129,0.18)",
    fieldLabel: "Access Token",
    inputType: "password",
    placeholder: "github_pat_xxxxxxxxxxxxxxxxx",
    hint: "Used by LangGraph AI to read commits, pull requests, branches, and latest changes.",
    isSecret: true,
  },
];

/* ─── Main Component ─────────────────────────────────────────────── */

const Integrations = ({ data, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    discord_webhook: "",
    teams_webhook: "",
    slack_webhook: "",
    whatsapp_number: "",
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
        whatsapp_number: data.whatsapp_number || "",
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
      whatsapp_number: data?.whatsapp_number || "",
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
          {PLATFORMS.map(({ key, name, Logo, accentColor, glowColor, placeholder, hint, fieldLabel, inputType, isSecret }) => {
            const isConnected = isSecret ? githubConfigured : !!formData[key];
            return (
              <div
                key={key}
                className={`integration-card${isConnected ? " is-connected" : ""}`}
                style={{
                  "--card-accent": accentColor,
                  "--card-glow": glowColor,
                  "--card-glow-hover": glowColor.replace("0.18", "0.28"),
                  "--input-focus-color": accentColor,
                }}
              >
                {/* Card header */}
                <div className="integration-card-header">
                  <div className="integration-logo-wrap">
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

                {/* Field */}
                <div className="integration-field">
                  <label htmlFor={key} className="integration-label">
                    {fieldLabel}
                  </label>
                  <input
                    id={key}
                    type={inputType}
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="integration-input"
                    placeholder={isSecret && isConnected && !isEditing ? "••••••••••••••••••••" : placeholder}
                    aria-label={`${name} ${fieldLabel}`}
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
                  Once you provide a webhook URL or phone number, the AI Assistant can send personal
                  messages, reports, and task alerts to your preferred channel. Connect GitHub with
                  a personal access token to enable repository intelligence commands.
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
                <><span className="btn-spinner"></span> Saving...</>
              ) : (
                <><Save className="btn-icon-text" size={16} /> Save Settings</>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Integrations;