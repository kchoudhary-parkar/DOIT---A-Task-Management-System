import React, { useState, useContext } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useMsal } from "@azure/msal-react";
import { AuthContext } from "../../../src/context/AuthContext";
import PasswordInput from "../../components/Input/PasswordInput";
import "./LandingAuth.css";

/* ── tiny helpers ───────────────────────────────────────────────── */
const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z"/>
  </svg>
);
const OkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm6.2 5.8L7 12.9l-3.7-3.7 1.4-1.4L7 10.1l5.8-5.8 1.4 1.5z"/>
  </svg>
);

/* ── Feature chips data ─────────────────────────────────────────── */
const chips = [
  { label: "AI-Powered Sprints",  dot: "blue"   },
  { label: "Real-Time Chat",      dot: "green"  },
  { label: "Analytics Studio",    dot: "amber"  },
  { label: "Role Management",     dot: "purple" },
  { label: "Smart Task Tracking", dot: "blue"   },
];

/* ═══════════════════════════════════════════════════════════════════
   LandingAuth  — drop-in replacement for the unauthenticated block
   Props: { login, register }  (from AuthContext via App.js)
   ═══════════════════════════════════════════════════════════════════ */
export default function LandingAuth({ login, register }) {
  const [authMode, setAuthMode]             = useState("choice");   // 'choice' | 'clerk' | 'traditional'
  const [isLogin, setIsLogin]               = useState(true);
  const [name, setName]                     = useState("");
  const [email, setEmail]                   = useState("");
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe]         = useState(false);
  const [showPassword, setShowPassword]     = useState(false);
  const [errors, setErrors]                 = useState({});
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState("");
  const { loginWithOAuth }                  = useContext(AuthContext);
  const { instance }                        = useMsal();

  /* reset on mode/tab switch */
  const resetForm = () => {
    setName(""); setEmail(""); setPassword(""); setConfirmPassword("");
    setError(""); setErrors({}); setSuccess(""); setShowPassword(false);
  };

  const switchMode = (mode) => { resetForm(); setAuthMode(mode); };
  const switchTab  = (login) => { resetForm(); setIsLogin(login); };

  /* validation */
  const validate = () => {
    const e = {};
    if (!isLogin) {
      if (!name.trim())           e.name = "Name is required";
      else if (name.trim().length < 3) e.name = "At least 3 characters";
    }
    if (!email.trim())            e.email = "Enter an email address";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password)                e.password = "Enter a password";
    if (!isLogin) {
      if (!confirmPassword)       e.confirmPassword = "Please confirm your password";
      else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const clearFieldError = (field) => {
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setError(""); setErrors({}); setSuccess("");
    if (!validate()) return;
    try {
      if (isLogin) {
        await login(email, password);
        setSuccess("Logged in successfully!");
      } else {
        await register(name, email, password, confirmPassword);
        setSuccess("Account created!");
      }
      resetForm();
    } catch (err) {
      const d = err.response?.data;
      setError(d?.error?.message || d?.error || err.message || "Something went wrong.");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setError(""); setSuccess("");
      await loginWithOAuth("google", credentialResponse.credential);
      setSuccess("Logged in with Google successfully!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Google login failed");
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      setError(""); setSuccess("");
      const loginResponse = await instance.loginPopup({
        scopes: ["user.read"]
      });
      await loginWithOAuth("microsoft", loginResponse.idToken);
      setSuccess("Logged in with Microsoft successfully!");
    } catch (err) {
      console.error(err);
      if (err.name !== "BrowserAuthError") { // Ignore popup closed error
        setError(err.message || "Microsoft login failed");
      }
    }
  };

  /* ── JSX ──────────────────────────────────────────────────────── */
  return (
    <div className="landing-root">

      {/* ══ LEFT — brand panel ══════════════════════════════════ */}
      <div className="landing-left">
        <div className="landing-left-bg" aria-hidden="true">
          <div className="ll-orb ll-orb-1" />
          <div className="ll-orb ll-orb-2" />
          <div className="ll-orb ll-orb-3" />
          <div className="ll-grid" />
        </div>

        <div className="landing-left-content">
          {/* Logo */}
          <div className="ll-logo">
            <div className="ll-logo-icon">
              <svg fill="none" stroke="currentColor" strokeLinecap="round"
                strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="ll-logo-name">DOIT</span>
          </div>

          {/* Hero copy */}
          <div className="ll-hero">
            <div className="ll-eyebrow">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Modern Project Intelligence
            </div>
            <h1 className="ll-title">
              The platform that<br />
              <span className="ll-title-accent">gets work done</span>
            </h1>
            <p className="ll-sub">
              Tasks, sprints, AI assistance, analytics, and team
              chat — unified in one focused workspace built for
              teams that move fast.
            </p>
            <div className="ll-chips">
              {chips.map(c => (
                <div key={c.label} className="ll-chip">
                  <span className={`ll-chip-dot ${c.dot}`} />
                  {c.label}
                </div>
              ))}
            </div>
          </div>

          {/* Social proof */}
          <div className="ll-social-proof">
            <div className="ll-avatars">
              {["K","P","A","M"].map(l => (
                <div key={l} className="ll-avatar">{l}</div>
              ))}
            </div>
            <div className="ll-proof-text">
              <strong>500+ teams</strong> already shipping faster<br />
              with DOIT
            </div>
          </div>
        </div>
      </div>

      {/* ══ RIGHT — auth panel ══════════════════════════════════ */}
      <div className="landing-right">

        {/* Back button */}
        {(authMode === "clerk" || authMode === "traditional") && (
          <button className="auth-back-btn" onClick={() => switchMode("choice")}>
            <svg width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>
        )}

        {/* ── CHOICE ───────────────────────────────────────────── */}
        {authMode === "choice" && (
          <div className="auth-panel-enter">
            <div className="auth-right-header">
              <h2 className="auth-right-title">Welcome back 👋</h2>
              <p className="auth-right-sub">Sign in to your DOIT workspace or create a new account.</p>
            </div>

            <div className="auth-choice-btns">
              <button className="auth-choice-primary" onClick={() => switchMode("clerk")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4l3 3"/>
                </svg>
                Continue with Google / Microsoft
              </button>

              <div className="auth-divider">
                <div className="auth-divider-line" />
                <span className="auth-divider-text">or</span>
                <div className="auth-divider-line" />
              </div>

              <button className="auth-choice-secondary" onClick={() => switchMode("traditional")}>
                Continue with Email &amp; Password
              </button>
            </div>
          </div>
        )}

        {/* ── OAUTH ────────────────────────────────────────────── */}
        {authMode === "clerk" && (
          <div className="auth-panel-enter">
            <div className="auth-right-header">
              <h2 className="auth-right-title">Continue with providers</h2>
              <p className="auth-right-sub">
                Access your DOIT workspace securely via Google or Microsoft.
              </p>
            </div>

            <div className="oauth-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', margin: '32px 0' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google login failed")}
                theme="filled_black"
                shape="rectangular"
                width="280"
              />
              
              <button 
                onClick={handleMicrosoftLogin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  width: '280px',
                  height: '40px',
                  backgroundColor: '#2f2f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'Segoe UI, Roboto, sans-serif',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Sign in with Microsoft
              </button>
            </div>
            
            {error && (
              <div className="auth-alert error" style={{marginBottom: '16px'}}>
                <ErrorIcon />{error}
              </div>
            )}
            {success && (
              <div className="auth-alert success" style={{marginBottom: '16px'}}>
                <OkIcon />{success}
              </div>
            )}
          </div>
        )}

        {/* ── TRADITIONAL ──────────────────────────────────────── */}
        {authMode === "traditional" && (
          <div className="auth-panel-enter">
            {/* Tab toggle */}
            <div className="auth-tab-toggle">
              <button className={`auth-tab-btn${isLogin  ? " active" : ""}`} onClick={() => switchTab(true)}>
                Login
              </button>
              <button className={`auth-tab-btn${!isLogin ? " active" : ""}`} onClick={() => switchTab(false)}>
                Register
              </button>
            </div>

            <div className="auth-right-header" style={{ marginBottom: 24 }}>
              <h2 className="auth-right-title">
                {isLogin ? "Welcome back" : "Create your account"}
              </h2>
              <p className="auth-right-sub">
                {isLogin
                  ? "Enter your credentials to access your workspace."
                  : "Join your team on DOIT — free to get started."}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>

              {/* Name (register only) */}
              {!isLogin && (
                <div className="auth-field">
                  <label className="auth-field-label">
                    Full Name <span className="auth-field-required">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => { handleFieldChange("name", e.target.value); clearFieldError("name"); }}
                    placeholder="Enter your full name"
                    className={`auth-field-input${errors.name ? " error" : ""}`}
                  />
                  {errors.name && (
                    <div className="auth-field-error"><ErrorIcon />{errors.name}</div>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="auth-field">
                <label className="auth-field-label">
                  Email <span className="auth-field-required">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); clearFieldError("email"); }}
                  placeholder="you@example.com"
                  className={`auth-field-input${errors.email ? " error" : ""}`}
                />
                {errors.email && (
                  <div className="auth-field-error"><ErrorIcon />{errors.email}</div>
                )}
              </div>

              {/* Password */}
              <div className="auth-field">
                <label className="auth-field-label">
                  Password <span className="auth-field-required">*</span>
                </label>
                {isLogin ? (
                  <div className="auth-pw-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearFieldError("password"); }}
                      placeholder="••••••••"
                      className={`auth-field-input${errors.password ? " error" : ""}`}
                    />
                    <button type="button" className="auth-pw-toggle"
                      onClick={() => setShowPassword(p => !p)}>
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                ) : (
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={v => { setPassword(v); clearFieldError("password"); }}
                    placeholder="Create a strong password"
                    showStrength={true}
                    showRequirements={true}
                  />
                )}
                {errors.password && (
                  <div className="auth-field-error"><ErrorIcon />{errors.password}</div>
                )}
              </div>

              {/* Confirm password (register only) */}
              {!isLogin && (
                <div className="auth-field">
                  <label className="auth-field-label">
                    Confirm Password <span className="auth-field-required">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                    placeholder="Re-enter your password"
                    className={`auth-field-input${errors.confirmPassword ? " error" : ""}`}
                  />
                  {errors.confirmPassword && (
                    <div className="auth-field-error"><ErrorIcon />{errors.confirmPassword}</div>
                  )}
                </div>
              )}

              {/* Remember me (login only) */}
              {isLogin && (
                <div className="auth-remember">
                  <input type="checkbox" id="remember" checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)} />
                  <label htmlFor="remember">Remember me</label>
                </div>
              )}

              {/* Error / success alerts */}
              {error && (
                <div className="auth-alert error">
                  <ErrorIcon />{error}
                </div>
              )}
              {success && (
                <div className="auth-alert success">
                  <OkIcon />{success}
                </div>
              )}

              <button type="submit" className="auth-submit-btn">
                {isLogin ? "Login" : "Register"}
              </button>
            </form>

            <p className="auth-switch">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button className="auth-switch-btn" onClick={() => switchTab(!isLogin)}>
                {isLogin ? "Register" : "Login"}
              </button>
            </p>
          </div>
        )}

        <p className="auth-footer-note">
          By continuing you agree to DOIT's Terms of Service &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );

  /* helper kept inside component so it has access to state setters */
  function handleFieldChange(field, value) {
    clearFieldError(field);
    const map = { name: setName, email: setEmail, password: setPassword, confirmPassword: setConfirmPassword };
    map[field]?.(value);
  }
}