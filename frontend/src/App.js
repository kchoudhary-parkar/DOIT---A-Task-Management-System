import React, { useContext, useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import AboutPage from "./pages/About/AboutPage";
import LandingAuth from "./pages/Auth/LandingAuth";  // adjust path
import LandingPage from "./pages/Landing/LandingPage";
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
import UserManagementPage from "./pages/UserManagement/UserManagementPage";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import SystemDashboardPage from "./pages/SystemDashboard/SystemDashboardPage";
import ProfilePage from "./pages/Profile/ProfilePage";
import AIChatbot from "./components/Chat/AIChatbot";
import PasswordInput from "./components/Input/PasswordInput";
import AIAssistantPage from "./pages/AIAssistant/AIAssistantPage";  // NEW: AI Assistant
import "./App.css";
import TeamChat from "./components/TeamChat/TeamChat";
import DataVisualization from "./components/DataVizualization/DataVisualization";
import AppSidebar from "./components/Layout/AppSidebar";
// import AnalyticsStudio from "./components/DataVizualization/AnalyticsStudio";
// Authenticated App Component (uses navigate hook)

function AuthenticatedApp({ user, theme, toggleTheme, logout }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 992px)");

    const handleScreenChange = (e) => {
      if (e.matches) {
        setSidebarOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setSidebarOpen(false);
    }

    mediaQuery.addEventListener("change", handleScreenChange);
    return () => mediaQuery.removeEventListener("change", handleScreenChange);
  }, []);

  const isSuperAdmin = user.role === 'super-admin';

  const navLinks = isSuperAdmin
    ? [
        {
          label: 'User Management',
          path: '/user-management',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          )
        },
        {
          label: 'Dashboard',
          path: '/',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          )
        },
        { label: 'DOIT-AI', path: '/ai-assistant', icon: <BsStars size={17} /> },
        { label: 'Analytics', path: '/data-viz', icon: <FiActivity size={17} /> },
        {
          label: 'Profile',
          path: '/profile',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          )
        },
        {
          label: 'Users',
          path: '/users',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          )
        },
        {
          label: 'About DOIT',
          path: '/about',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )
        }
      ]
    : [
        {
          label: 'Dashboard',
          path: '/',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          )
        },
        {
          label: 'Projects',
          path: '/projects',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          )
        },
        {
          label: 'My Tasks',
          path: '/my-tasks',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          )
        },
        { label: 'DOIT-AI', path: '/ai-assistant', icon: <BsStars size={17} /> },
        { label: 'Analytics', path: '/data-viz', icon: <FiActivity size={17} /> },
        {
          label: 'Profile',
          path: '/profile',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          )
        },
        ...(user.role === 'admin'
          ? [
              {
                label: 'Users',
                path: '/users',
                icon: (
                  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                )
              }
            ]
          : []),
        {
          label: 'About DOIT',
          path: '/about',
          icon: (
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )
        }
      ];

  return (
    <>
      <AppSidebar
        user={user}
        navLinks={navLinks}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        logout={logout}
      />

      <div className={`app-shell ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}>
        {/* Navbar */}
        <nav className="app-navbar">
          <div className="nav-inner">

            {/* Brand — clicking toggles sidebar */}
            <button className="nav-brand-btn" onClick={() => setSidebarOpen((prev) => !prev)}>
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
            <Route path="/user-management" element={<UserManagementPage />} />
            <Route path="/system-dashboard" element={<SystemDashboardPage />} />
            <Route path="/data-viz" element={<DataVisualization />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/about" element={<AboutPage />} />

          </Routes>
        </main>
      </div>

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
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LandingAuth login={login} register={register} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;