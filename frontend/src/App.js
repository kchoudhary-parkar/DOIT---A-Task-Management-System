import React, { useContext, useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from "react-router-dom";
import { FiActivity } from 'react-icons/fi';
import { BsStars, BsBriefcase } from 'react-icons/bs';  // For AI Assistant and PM icons
import { AuthContext } from "./context/AuthContext";
import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import { DashboardPage } from "./pages/Dashboard";
import { ProjectsPage } from "./pages/Projects";
import { TasksPage } from "./pages/Tasks";
import { MyTasksPage } from "./pages/MyTasks";
import SprintPage from "./pages/Sprints/SprintPage";
import UsersPage from "./pages/Users/UsersPage";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import SystemDashboardPage from "./pages/SystemDashboard/SystemDashboardPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import AIChatbot from "./components/Chat/AIChatbot";
import PasswordInput from "./components/Input/PasswordInput";
import AIAssistantPage from "./pages/AIAssistant/AIAssistantPage";  // NEW: AI Assistant
import "./App.css";
import TeamChat from "./components/TeamChat/TeamChat";
import DataVisualization from "./components/DataVizualization/DataVisualization";
// import AnalyticsStudio from "./components/DataVizualization/AnalyticsStudio";
// Authenticated App Component (uses navigate hook)

function AuthenticatedApp({ user, theme, toggleTheme, logout }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLinks = [
    { label: 'Dashboard', path: '/', icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    )},
    { label: 'Projects', path: '/projects', icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    )},
    { label: 'My Tasks', path: '/my-tasks', icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    )},
    { label: 'DOIT-AI', path: '/ai-assistant', icon: <BsStars size={17} /> },
    { label: 'Analytics', path: '/data-viz', icon: <FiActivity size={17} /> },
    { label: 'Profile', path: '/profile', icon: (
      <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    )},
    ...(user.role === 'super-admin' || user.role === 'admin' ? [{
      label: 'Users', path: '/users', icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    }] : []),
    ...(user.role === 'super-admin' ? [{
      label: 'System', path: '/system-dashboard', icon: (
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        </svg>
      )
    }] : []),
  ];

  return (
    <>
      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`app-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor"
              strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              className="sidebar-brand-icon" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="sidebar-brand-name">DOIT</span>
          </div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
            <div className="sidebar-user-role">
              {user.role === 'super-admin' ? 'Super Admin'
                : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="sidebar-nav-link"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-nav-icon">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={logout}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Navbar */}
      <nav className="app-navbar">
        <div className="nav-inner">

          {/* Brand — clicking opens sidebar */}
          <button className="nav-brand-btn" onClick={() => setSidebarOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor"
              strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              className="nav-brand-icon" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="nav-brand-text">DOIT</span>
          </button>

          {/* Right actions */}
          <div className="nav-actions">

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="theme-toggle"
            >
              <span className="toggle-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </span>
              <span className="toggle-track">
                <span className="toggle-thumb" />
              </span>
              <span className="toggle-icon sun">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </span>
            </button>

            {/* DOIT-AI */}
            <button onClick={() => navigate('/ai-assistant')} className="nav-link-btn">
              <BsStars size={17} />
              <span>DOIT-AI</span>
            </button>

            {/* Analytics */}
            <button onClick={() => navigate('/data-viz')} className="nav-link-btn analytics">
              <FiActivity size={17} />
              <span>Analytics</span>
            </button>

            {/* Divider */}
            <div className="nav-divider" />

            {/* Avatar */}
            <div onClick={() => navigate('/profile')} className="nav-avatar" title="Profile">
              {user.name.charAt(0).toUpperCase()}
            </div>

            {/* Name + Role */}
            <div className="nav-user-info">
              <div className="nav-user-name">{user.name}</div>
              <div className="nav-user-role">
                {user.role === 'super-admin' ? 'Super Admin'
                  : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </div>
            </div>

            {/* Logout */}
            <button type="button" onClick={logout} className="nav-logout-btn">
              Logout
              <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                strokeWidth="2" width="13" height="13" viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>

          </div>
        </div>
      </nav>

      <main style={{ minHeight: 'calc(100vh - 80px)' }}>
        <Routes>
          <Route path="/" element={user.role === 'super-admin' ? <SuperAdminDashboard /> : <DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId/tasks" element={<TasksPage />} />
          <Route path="/projects/:projectId/sprints" element={<SprintPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/system-dashboard" element={<SystemDashboardPage />} />
          <Route path="/data-viz" element={<DataVisualization />} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <AIChatbot user={user} />
      <TeamChat userId="current-user-id" apiEndpoint="/api" />
    </>
  );
}
function App() {
  const { user, loading, login, register, logout } = useContext(AuthContext);
  const { isSignedIn } = useAuth();
  const [authMode, setAuthMode] = useState("choice"); // 'choice', 'clerk', 'traditional'
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("app-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light")
      );
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (!localStorage.getItem("app-theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setErrors({});
    setSuccess("");
    setShowPassword(false);
  }, [isLogin, authMode]);

  const validateForm = () => {
    const newErrors = {};

    if (!isLogin) {
      if (!name.trim()) {
        newErrors.name = "Name is required";
      } else if (name.trim().length < 3) {
        newErrors.name = "Name must be at least 3 characters";
      }
    }

    if (!email.trim()) {
      newErrors.email = "Enter an email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Enter a password";
    }

    if (!isLogin) {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setError("");
    setErrors({});
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        setSuccess("Logged in successfully!");
      } else {
        await register(name, email, password, confirmPassword);
        setSuccess("Registered and logged in!");
      }

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Auth error:", err);

      const errorData = err.response?.data;

      if (errorData?.error) {
        if (typeof errorData.error === "object" && errorData.error.errors) {
          setError(errorData.error.message || "Validation failed");
        } else {
          setError(errorData.error);
        }
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFieldChange = (field, value) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (error) {
      setError("");
    }

    switch (field) {
      case "name":
        setName(value);
        break;
      case "email":
        setEmail(value);
        break;
      case "password":
        setPassword(value);
        break;
      case "confirmPassword":
        setConfirmPassword(value);
        break;
      default:
        break;
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Router>
      <div className="App">
        {user ? (
          <AuthenticatedApp 
            user={user} 
            theme={theme} 
            toggleTheme={toggleTheme} 
            logout={logout} 
          />
        ) : (
          <div style={{
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundImage: 'url("https://raw.githubusercontent.com/kchoudhary-parkar/task_management_system/refs/heads/main/frontend/shared%20image%20(1).jpg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  padding: '20px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
}}>
            <div style={{
              width: '100%',
              maxWidth: '480px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              padding: '48px 40px',
              position: 'relative'
            }}>
              {/* Back Button for Clerk and Traditional modes */}
              {(authMode === "clerk" || authMode === "traditional") && (
                <button
                  onClick={() => setAuthMode("choice")}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0052CC',
                    fontSize: '14px',
                    cursor: 'pointer',
                    padding: '8px 0',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.gap = '10px';
                    e.target.style.color = '#0747A6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.gap = '6px';
                    e.target.style.color = '#0052CC';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>←</span> Back
                </button>
              )}

              {/* Brand Header */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{
                  fontSize: '42px',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #0052CC 0%, #667eea 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '2px'
                }}>
                  DOIT
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#5E6C84',
                  marginTop: '8px',
                  fontWeight: '400'
                }}>
                  Modern Project Management
                </div>
              </div>

              {/* Choice Screen */}
              {authMode === "choice" && (
                <>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#172B4D',
                    textAlign: 'center',
                    marginBottom: '32px',
                    letterSpacing: '-0.02em'
                  }}>
                    Welcome! Choose how to sign in
                  </h2>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button
                      onClick={() => setAuthMode("clerk")}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'linear-gradient(135deg, #0052CC 0%, #0065FF 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,82,204,0.25)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0,82,204,0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,82,204,0.25)';
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
                      </svg>
                      Continue with Google / Microsoft
                    </button>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      margin: '8px 0',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1, height: '1px', background: '#DFE1E6' }}></div>
                      <span style={{ fontSize: '12px', color: '#5E6C84', fontWeight: '500' }}>
                        OR
                      </span>
                      <div style={{ flex: 1, height: '1px', background: '#DFE1E6' }}></div>
                    </div>

                    <button
                      onClick={() => setAuthMode("traditional")}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        background: 'white',
                        border: '2px solid #DFE1E6',
                        borderRadius: '6px',
                        fontSize: '15px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        color: '#172B4D',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#F4F5F7';
                        e.target.style.borderColor = '#B3BAC5';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'white';
                        e.target.style.borderColor = '#DFE1E6';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      Continue with Email & Password
                    </button>
                  </div>
                </>
              )}

              {/* Clerk Auth Mode */}
              {authMode === "clerk" && (
                <>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#172B4D',
                    textAlign: 'center',
                    marginBottom: '24px',
                    letterSpacing: '-0.02em'
                  }}>
                    {isLogin ? "Sign In" : "Sign Up"}
                  </h2>

                  <div style={{ marginBottom: '20px' }}>
                    {isLogin ? (
                      <SignIn
                        routing="hash"
                        signUpUrl="#"
                        appearance={{
                          elements: {
                            formButtonPrimary: "btn-primary",
                            card: "clerk-card",
                          },
                        }}
                      />
                    ) : (
                      <SignUp
                        routing="hash"
                        signInUrl="#"
                        appearance={{
                          elements: {
                            formButtonPrimary: "btn-primary",
                            card: "clerk-card",
                          },
                        }}
                      />
                    )}
                  </div>

                  <p style={{
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#5E6C84',
                    marginTop: '20px'
                  }}>
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                      onClick={() => setIsLogin(!isLogin)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0052CC',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      {isLogin ? "Sign Up" : "Sign In"}
                    </button>
                  </p>
                </>
              )}

              {/* Traditional Email/Password Mode */}
              {authMode === "traditional" && (
                <>
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '32px',
                    background: '#F4F5F7',
                    padding: '4px',
                    borderRadius: '8px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setIsLogin(true)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: isLogin ? 'white' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isLogin ? '#0052CC' : '#5E6C84',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isLogin ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: !isLogin ? 'white' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: !isLogin ? '#0052CC' : '#5E6C84',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: !isLogin ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      Register
                    </button>
                  </div>

                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#172B4D',
                    textAlign: 'center',
                    marginBottom: '32px',
                    letterSpacing: '-0.02em'
                  }}>
                    {isLogin ? "Welcome back" : "Create your account"}
                  </h2>

                  <form onSubmit={handleSubmit} noValidate>
                    {!isLogin && (
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#172B4D',
                          marginBottom: '6px'
                        }}>
                          Full Name <span style={{ color: '#DE350B' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleFieldChange("name", e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Enter your full name"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: '15px',
                            border: errors.name ? '2px solid #DE350B' : '2px solid #DFE1E6',
                            borderRadius: '6px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            backgroundColor: errors.name ? '#FFEBE6' : 'white',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => {
                            if (!errors.name) {
                              e.target.style.borderColor = '#0052CC';
                              e.target.style.boxShadow = '0 0 0 3px rgba(0,82,204,0.1)';
                            }
                          }}
                          onBlur={(e) => {
                            if (!errors.name) {
                              e.target.style.borderColor = '#DFE1E6';
                              e.target.style.boxShadow = 'none';
                            }
                          }}
                        />
                        {errors.name && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '6px',
                            fontSize: '13px',
                            color: '#DE350B'
                          }}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z"/>
                            </svg>
                            {errors.name}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#172B4D',
                        marginBottom: '6px'
                      }}>
                        Email <span style={{ color: '#DE350B' }}>*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleFieldChange("email", e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="you@example.com"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '15px',
                          border: errors.email ? '2px solid #DE350B' : '2px solid #DFE1E6',
                          borderRadius: '6px',
                          outline: 'none',
                          transition: 'all 0.2s',
                          backgroundColor: errors.email ? '#FFEBE6' : 'white',
                          boxSizing: 'border-box'
                        }}
                        onFocus={(e) => {
                          if (!errors.email) {
                            e.target.style.borderColor = '#0052CC';
                            e.target.style.boxShadow = '0 0 0 3px rgba(0,82,204,0.1)';
                          }
                        }}
                        onBlur={(e) => {
                          if (!errors.email) {
                            e.target.style.borderColor = '#DFE1E6';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                      />
                      {errors.email && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '6px',
                          fontSize: '13px',
                          color: '#DE350B'
                        }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z"/>
                          </svg>
                          {errors.email}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#172B4D',
                        marginBottom: '6px'
                      }}>
                        Password <span style={{ color: '#DE350B' }}>*</span>
                      </label>
                      {isLogin ? (
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => handleFieldChange("password", e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="••••••••"
                            style={{
                              width: '100%',
                              padding: '12px 44px 12px 14px',
                              fontSize: '15px',
                              border: errors.password ? '2px solid #DE350B' : '2px solid #DFE1E6',
                              borderRadius: '6px',
                              outline: 'none',
                              transition: 'all 0.2s',
                              backgroundColor: errors.password ? '#FFEBE6' : 'white',
                              boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                              if (!errors.password) {
                                e.target.style.borderColor = '#0052CC';
                                e.target.style.boxShadow = '0 0 0 3px rgba(0,82,204,0.1)';
                              }
                            }}
                            onBlur={(e) => {
                              if (!errors.password) {
                                e.target.style.borderColor = '#DFE1E6';
                                e.target.style.boxShadow = 'none';
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px',
                              color: '#5E6C84',
                              fontSize: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#F4F5F7'}
                            onMouseLeave={(e) => e.target.style.background = 'none'}
                          >
                            {showPassword ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      ) : (
                        <PasswordInput
                          id="password"
                          value={password}
                          onChange={(value) => handleFieldChange("password", value)}
                          placeholder="Create a strong password"
                          showStrength={true}
                          showRequirements={true}
                        />
                      )}
                      {errors.password && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '6px',
                          fontSize: '13px',
                          color: '#DE350B'
                        }}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z"/>
                          </svg>
                          {errors.password}
                        </div>
                      )}
                    </div>

                    {!isLogin && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#172B4D',
                          marginBottom: '6px'
                        }}>
                          Confirm Password <span style={{ color: '#DE350B' }}>*</span>
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => handleFieldChange("confirmPassword", e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Re-enter your password"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            fontSize: '15px',
                            border: errors.confirmPassword ? '2px solid #DE350B' : '2px solid #DFE1E6',
                            borderRadius: '6px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            backgroundColor: errors.confirmPassword ? '#FFEBE6' : 'white',
                            boxSizing: 'border-box'
                          }}
                          onFocus={(e) => {
                            if (!errors.confirmPassword) {
                              e.target.style.borderColor = '#0052CC';
                              e.target.style.boxShadow = '0 0 0 3px rgba(0,82,204,0.1)';
                            }
                          }}
                          onBlur={(e) => {
                            if (!errors.confirmPassword) {
                              e.target.style.borderColor = '#DFE1E6';
                              e.target.style.boxShadow = 'none';
                            }
                          }}
                        />
                        {errors.confirmPassword && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '6px',
                            fontSize: '13px',
                            color: '#DE350B'
                          }}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z"/>
                            </svg>
                            {errors.confirmPassword}
                          </div>
                        )}
                      </div>
                    )}

                    {isLogin && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '24px'
                      }}>
                        <input
                          type="checkbox"
                          id="remember"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                            accentColor: '#0052CC'
                          }}
                        />
                        <label htmlFor="remember" style={{
                          fontSize: '14px',
                          color: '#172B4D',
                          cursor: 'pointer'
                        }}>
                          Remember me
                        </label>
                      </div>
                    )}

                    {error && (
                      <div style={{
                        padding: '14px 16px',
                        marginBottom: '16px',
                        backgroundColor: '#FFEBE6',
                        border: '1px solid #DE350B',
                        borderRadius: '6px',
                        color: '#DE350B',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H7v-2h2v2zm0-3H7V4h2v6z"/>
                        </svg>
                        {error}
                      </div>
                    )}

                    {success && (
                      <div style={{
                        padding: '14px 16px',
                        marginBottom: '16px',
                        backgroundColor: '#E3FCEF',
                        border: '1px solid #00875A',
                        borderRadius: '6px',
                        color: '#00875A',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm6.2 5.8L7 12.9l-3.7-3.7 1.4-1.4L7 10.1l5.8-5.8 1.4 1.5z"/>
                        </svg>
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: 'linear-gradient(135deg, #0052CC 0%, #0065FF 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0,82,204,0.25)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(0,82,204,0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0,82,204,0.25)';
                      }}
                    >
                      {isLogin ? "Login" : "Register"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;