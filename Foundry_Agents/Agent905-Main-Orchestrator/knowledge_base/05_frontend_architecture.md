# DOIT Project - Frontend Architecture

## Technology Stack

### Core Framework & Libraries
**React.js v19.2.3** - Latest React version with concurrent features
```json
"react": "^19.2.3",
"react-dom": "^19.2.3",
"react-router-dom": "^7.11.0"
```

- **React Context API** - Global state management (AuthContext)
- **React Hooks** - useState, useEffect, useCallback, useMemo, useRef, useContext
- **React Memo** - Performance optimization for expensive components
- **Create React App** - Project scaffolding and build configuration

---

### UI & Visualization Libraries

**Charting & Data Visualization**:
```json
"recharts": "^3.6.0"              // Primary charting library
"react-chartjs-2": "^5.3.1"       // Chart.js wrapper
"react-big-calendar": "^1.19.4"   // Calendar component
```

**Drag & Drop**:
```json
"@dnd-kit/core": "^6.3.1"
"@dnd-kit/sortable": "^10.0.0"
"@dnd-kit/utilities": "^3.2.2"
```

**Icons & UI Elements**:
```json
"react-icons": "^5.5.0"          // Feather, Bootstrap icons
"lucide-react": "^0.562.0"       // Modern icon set
"react-toastify": "^11.0.5"      // Toast notifications
```

---

### State Management & Data Fetching

**Server State**:
```json
"@tanstack/react-query": "^5.90.19"  // Server state management
```

**HTTP Client**:
```json
"axios": "^1.13.2"
"axios-cache-interceptor": "^1.11.4"  // Request caching
```

**Architecture**:
- Custom `requestCache` utility for GET request caching
- Fetch API for simple requests
- WebSocket connections for real-time updates
- Parallel data fetching with `Promise.all()`

---

### Authentication & Authorization

**Clerk Authentication**:
```json
"@clerk/clerk-react": "^5.59.4"
```

**Features**:
- Dual authentication system (Clerk + Traditional JWT)
- Social login (Google, GitHub, etc.)
- Session management with tab-specific keys
- Token refresh mechanism
- Role-based access control (5 roles)

---

### File Processing & Export

**Excel/CSV**:
```json
"exceljs": "^4.4.0"    // Excel generation
"xlsx": "^0.18.5"      // Excel parsing
```

**PDF Generation**:
```json
"jspdf": "^4.0.0"
"jspdf-autotable": "^5.0.7"
"html2canvas": "^1.4.1"  // DOM to canvas
```

**Date/Time**:
```json
"moment": "^2.30.1"  // Date manipulation & formatting
```

---

### Styling Architecture

**Approach**: Component-scoped CSS with global variables

**Features**:
- Custom CSS files per component
- CSS Variables for theming (light/dark mode)
- Flexbox & Grid layouts
- CSS Animations & Transitions
- Responsive design with media queries
- Glass-morphism effects
- No CSS-in-JS or preprocessor dependencies

**Example CSS Structure**:
```css
/* Global variables in App.css */
:root[data-theme="dark"] {
  --primary-color: #6366f1;
  --background: #1a1a2e;
  --text-primary: #ffffff;
  --card-bg: rgba(255, 255, 255, 0.05);
}

:root[data-theme="light"] {
  --primary-color: #6366f1;
  --background: #f9fafb;
  --text-primary: #1f2937;
  --card-bg: #ffffff;
}
```

---

### Development & Build Tools

**Scripts**:
```json
"scripts": {
  "start": "react-scripts start",     // Dev server (port 3000)
  "build": "react-scripts build",     // Production build
  "test": "react-scripts test",       // Jest tests
  "eject": "react-scripts eject"      // Eject CRA config
}
```

**Testing**:
```json
"@testing-library/react": "^16.3.1"
"@testing-library/jest-dom": "^6.9.1"
"@testing-library/user-event": "^13.5.0"
```

**Environment Variables**:
```
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
```

---

### Browser Compatibility

**Target**:
```json
"browserslist": {
  "production": [
    ">0.2%",
    "not dead",
    "not op_mini all"
  ],
  "development": [
    "last 1 chrome version",
    "last 1 firefox version",
    "last 1 safari version"
  ]
}
```

**Supported Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

---

## Project Structure

```
frontend/
├── public/
│   ├── index.html          # HTML template
│   ├── manifest.json       # PWA manifest
│   └── robots.txt          # SEO configuration
│
├── src/
│   ├── index.js            # Application entry point
│   ├── App.js              # Root component & routing
│   ├── App.css             # Global styles
│   │
│   ├── components/         # Reusable components
│   │   ├── Calendar/
│   │   │   ├── CalendarView.js
│   │   │   ├── CalendarView.css
│   │   │   └── index.js
│   │   │
│   │   ├── Charts/
│   │   │   ├── Charts.css
│   │   │   ├── ProjectProgressChart.js
│   │   │   ├── TaskPriorityChart.js
│   │   │   ├── TaskStatsCard.js
│   │   │   └── TaskStatusChart.js
│   │   │
│   │   ├── Chat/
│   │   │   └── AIChatbot.js
│   │   │
│   │   ├── DataVizualization/
│   │   │   └── (data viz components)
│   │   │
│   │   ├── Input/
│   │   │   └── (form input components)
│   │   │
│   │   ├── Kanban/
│   │   │   └── (Kanban board components)
│   │   │
│   │   ├── Loader/
│   │   │   └── (loading spinners)
│   │   │
│   │   ├── Profile/
│   │   │   └── (profile components)
│   │   │
│   │   ├── Projects/
│   │   │   └── (project components)
│   │   │
│   │   ├── Sprints/
│   │   │   └── (sprint components)
│   │   │
│   │   ├── Tasks/
│   │   │   └── (task components)
│   │   │
│   │   └── TeamChat/
│   │       └── (chat components)
│   │
│   ├── context/
│   │   └── AuthContext.js  # Authentication state
│   │
│   ├── pages/              # Page-level components
│   │   ├── Dashboard/
│   │   ├── MyTasks/
│   │   ├── Profile/
│   │   ├── Projects/
│   │   ├── Sprints/
│   │   ├── SuperAdminDashboard/
│   │   ├── SystemDashboard/
│   │   ├── Tasks/
│   │   └── Users/
│   │
│   ├── services/           # API services
│   │   ├── api.js          # Base API configuration
│   │   └── sprintAPI.js    # Sprint-specific API calls
│   │
│   └── utils/              # Utility functions
│       ├── exportUtils.js
│       ├── exportUtils.css
│       ├── requestCache.js
│       ├── systemExportUtils.js
│       ├── useKanbanWebSocket.js
│       └── useWebSocket.js
│
├── package.json            # Dependencies & scripts
├── .env                    # Environment variables
└── README.md               # Project documentation
```

---

## Key Components

### 1. App.js (Root Component)

**File**: `src/App.js` (984 lines)
**Purpose**: Root application component with routing, navigation, and global UI elements

---

#### Component Structure

**Main Components**:
1. `App` - Root wrapper with authentication logic
2. `AuthenticatedApp` - Authenticated user interface with navigation
3. Authentication forms - Login/Register using Clerk or traditional

**Imports** (Key dependencies):
```javascript
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import { FiActivity } from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';
```

---

#### Navigation Bar Implementation

```javascript
function AuthenticatedApp({ user, theme, toggleTheme, logout }) {
  const navigate = useNavigate();

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          {/* Brand Logo */}
          <div className="nav-brand">
            <div className="nav-brand-title">
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                DOIT
              </Link>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="nav-actions">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* DOIT-AI Button */}
            <button
              onClick={() => navigate('/ai-assistant')}
              className="ai-assistant-btn"
              title="DOIT AI Assistant"
            >
              <BsStars size={20} />
              <span>DOIT-AI</span>
            </button>

            {/* DOIT Analytics Button */}
            <button
              onClick={() => navigate('/data-viz')}
              className="analytics-btn"
              title="DOIT Analytics"
            >
              <FiActivity size={20} />
              <span>DOIT Analytics</span>
            </button>

            {/* User Profile Dropdown */}
            <div className="nav-user">
              <div 
                className="user-avatar clickable"
                onClick={() => navigate('/profile')}
                title="Go to Profile"
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role">
                  {user.role === "super-admin"
                    ? "Super Admin"
                    : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </div>
              </div>
              <button type="button" onClick={logout} className="btn-logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ paddingTop: "0px", minHeight: "calc(100vh - 80px)" }}>
        <Routes>
          {/* Routes defined here */}
        </Routes>
      </main>
      
      {/* Global Components (always rendered) */}
      <AIChatbot user={user} />
      <TeamChat userId="current-user-id" apiEndpoint="/api" />
    </>
  );
}
```

---

#### Complete Route Configuration

```javascript
<Routes>
  {/* Dashboard - Role-based routing */}
  <Route
    path="/"
    element={
      user.role === "super-admin" ? (
        <SuperAdminDashboard />
      ) : (
        <DashboardPage />
      )
    }
  />
  
  {/* Standard Routes */}
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
  
  {/* Catch-all redirect to home */}
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

**Route Summary**:

| Route | Component | Description | Access |
|-------|-----------|-------------|--------|
| `/` | DashboardPage / SuperAdminDashboard | Home (role-based) | All |
| `/dashboard` | DashboardPage | User dashboard | All |
| `/projects` | ProjectsPage | Project list | All |
| `/projects/:projectId/tasks` | TasksPage | Project tasks | Members |
| `/projects/:projectId/sprints` | SprintPage | Sprint management | Members |
| `/my-tasks` | MyTasksPage | User's assigned tasks | All |
| `/profile` | ProfilePage | User profile settings | All |
| `/users` | UsersPage | User management | Admin+ |
| `/system-dashboard` | SystemDashboardPage | System admin panel | Super Admin |
| `/data-viz` | DataVisualization | Data visualization | All |
| `/ai-assistant` | AIAssistantPage | DOIT-AI chat | All |

---

#### Theme Management

**State Setup**:
```javascript
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
```

**Theme Application**:
```javascript
useEffect(() => {
  // Apply theme to document
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("app-theme", theme);

  // Listen for system theme changes
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
```

**Features**:
- Persists to `localStorage`
- Respects system preferences on first load
- Smooth transitions between themes
- CSS variable-based theming

---

### 2. AuthContext.js - Authentication State Management

**File**: `src/context/AuthContext.js` (200+ lines)
**Purpose**: Global authentication state with dual auth system (Clerk + Traditional JWT)

---

#### Context Structure

```javascript
import { createContext, useState, useEffect, useRef } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { authAPI, getAuthHeaders } from "../services/api";

export const AuthContext = createContext();

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
```

---

#### State Management

**Core State**:
```javascript
const [user, setUser] = useState(null);  // User object
const [loading, setLoading] = useState(true);  // Loading state
const refreshingSession = useRef(false);  // Prevent concurrent refreshes
```

**User Object Structure**:
```javascript
{
  _id: "507f1f77bcf86cd799439011",
  id: "507f1f77bcf86cd799439011",  // Alias for _id
  name: "John Doe",
  email: "john@example.com",
  role: "admin",  // viewer, member, manager, admin, super-admin
  department: "Engineering",
  avatar_url: "/uploads/avatars/user_123.jpg",
  created_at: "2024-01-01T00:00:00Z"
}
```

---

#### Clerk Integration (Social Login)

**Clerk Hooks**:
```javascript
const { isSignedIn, user: clerkUser, isLoaded } = useUser();
const { getToken, signOut } = useClerkAuth();
```

**Sync Flow**:
```javascript
useEffect(() => {
  const syncClerkUser = async () => {
    if (!isLoaded) return;

    console.log("[AUTH] Clerk loaded:", { isSignedIn, clerkUser: !!clerkUser });

    if (isSignedIn && clerkUser) {
      try {
        // 1. Get Clerk JWT token
        const clerkToken = await getToken();
        
        // 2. Send to backend to create/sync user
        const response = await authAPI.clerkSync(
          clerkToken,
          clerkUser.primaryEmailAddress?.emailAddress,
          clerkUser.fullName || clerkUser.firstName || "User",
          clerkUser.id
        );

        const { token, user: userData, tab_session_key } = response;

        // 3. Store our app's JWT token
        localStorage.setItem("token", token);
        localStorage.setItem("user_id", userData.id || userData._id);

        if (tab_session_key) {
          sessionStorage.setItem("tab_session_key", tab_session_key);
        }

        setUser(userData);
        setLoading(false);
      } catch (error) {
        console.error("[AUTH] Clerk sync failed:", error);
        setLoading(false);
      }
    } else {
      // Not signed in with Clerk, check for traditional auth
      checkTraditionalAuth();
    }
  };

  syncClerkUser();
}, [isSignedIn, clerkUser, isLoaded, getToken]);
```

---

#### Traditional JWT Authentication

**Token Validation**:
```javascript
const checkTraditionalAuth = async () => {
  const token = localStorage.getItem("token");
  console.log("[AUTH] Checking traditional auth, token exists:", !!token);

  if (token) {
    try {
      // Parse token payload
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const tokenUserId = tokenPayload.user_id;
      const storedUserId = localStorage.getItem("user_id");

      // SECURITY: Verify token matches stored user
      if (storedUserId && tokenUserId !== storedUserId) {
        console.error("🚨 SECURITY ALERT: TOKEN MISMATCH!");
        localStorage.clear();
        setUser(null);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("[AUTH] Error parsing token:", error);
      localStorage.clear();
      setUser(null);
      setLoading(false);
      return;
    }

    const tabSessionKey = sessionStorage.getItem("tab_session_key");

    // Create new tab session if missing
    if (!tabSessionKey) {
      console.warn("[AUTH] No tab session key found - creating new tab session");

      if (refreshingSession.current) {
        console.log("[AUTH] Refresh already in progress");
        return;
      }

      refreshingSession.current = true;

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh-session`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        
        console.log("[AUTH] New tab session created:", data);
        const newTabKey = data.tab_session_key;
        if (newTabKey) {
          sessionStorage.setItem("tab_session_key", newTabKey);
        }

        const userData = await authAPI.getProfile();
        if (userData.id && !userData._id) {
          userData._id = userData.id;
        }
        setUser(userData);
        localStorage.setItem("user_id", userData.id || userData._id);
      } catch (error) {
        console.error("[AUTH] Session creation failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user_id");
        setUser(null);
      } finally {
        refreshingSession.current = false;
        setLoading(false);
      }
      return;
    }

    // Validate token with existing tab session
    try {
      const userData = await authAPI.getProfile();
      if (userData.id && !userData._id) {
        userData._id = userData.id;
      }
      setUser(userData);
      localStorage.setItem("user_id", userData.id || userData._id);
      setLoading(false);
    } catch (error) {
      console.error("[AUTH] Token validation failed:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user_id");
      setUser(null);
      setLoading(false);
    }
  } else {
    console.log("[AUTH] No token found");
    setLoading(false);
  }
};
```

---

#### Authentication Methods

**Login** (Email/Password):
```javascript
const login = async (email, password) => {
  const data = await authAPI.login(email, password);
  const { token, user, tab_session_key } = data;

  // Store credentials
  localStorage.setItem("token", token);
  localStorage.setItem("user_id", user.id || user._id);

  if (tab_session_key) {
    sessionStorage.setItem("tab_session_key", tab_session_key);
  }

  setUser(user);
  return user;
};
```

**Register** (New User):
```javascript
const register = async (name, email, password) => {
  await authAPI.register(name, email, password);
  return await login(email, password);  // Auto-login after registration
};
```

**Logout** (Clear Session):
```javascript
const logout = async () => {
  // Logout from Clerk if signed in
  if (isSignedIn) {
    await signOut();
  }

  // Logout from our backend
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  sessionStorage.removeItem("tab_session_key");
  setUser(null);
  window.location.href = "/";  // Force page reload
};
```

---

#### Provider Component

```javascript
export const AuthProvider = ({ children }) => {
  // ... state and logic above ...

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

#### Usage in Components

```javascript
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function MyComponent() {
  const { user, loading, login, logout } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

#### Security Features

1. **Token Mismatch Detection**: Validates token user_id matches stored user_id
2. **Tab Session Keys**: Unique per-tab session for multi-tab support
3. **Session Refresh**: Automatic session refresh for new tabs
4. **Concurrent Request Protection**: `useRef` to prevent multiple refresh calls
5. **Clerk Integration**: Syncs Clerk users with backend database
6. **Dual Auth Support**: Works with both Clerk (social) and traditional (email/password)

---

### 3. API Service (services/api.js)

**File**: `src/services/api.js` (973 lines)
**Purpose**: Centralized API communication layer with caching

---

#### Configuration

```javascript
import { requestCache, cachedFetch, createCacheKey } from '../utils/requestCache';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
```

**Environment Variables**:
```
REACT_APP_API_BASE_URL=http://localhost:8000
```

---

#### Authentication Helpers

**Get JWT Token**:
```javascript
const getToken = () => localStorage.getItem("token");
```

**Generate Tab Session Key**:
```javascript
const getTabSessionKey = () => {
  let key = sessionStorage.getItem("tab_session_key");
  
  if (!key) {
    // Generate a unique key (UUID-like)
    key = 'tab_' + Math.random().toString(36).substr(2, 12) + '_' + Date.now().toString(36);
    sessionStorage.setItem("tab_session_key", key);
  }
  
  return key;
};
```

**Build Auth Headers**:
```javascript
export const getAuthHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  // Always include tab session key
  headers["X-Tab-Session-Key"] = getTabSessionKey();
  
  return headers;
};
```

---

#### API Modules

**1. Authentication API**:
```javascript
export const authAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  register: async (name, email, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  clerkSync: async (clerkToken, email, name, clerkId) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/clerk-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerk_token: clerkToken, email, name, clerk_id: clerkId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Clerk sync failed');
    return data;
  },

  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch profile');
    return data.user;
  }
};
```

**2. Project API**:
```javascript
export const projectAPI = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch projects');
    return data;
  },

  create: async (projectData) => {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create project');
    return data;
  },

  update: async (projectId, projectData) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update project');
    return data;
  },

  delete: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete project');
    return data;
  }
};
```

**3. Task API**:
```javascript
export const taskAPI = {
  getByProject: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch tasks');
    return data;
  },

  create: async (projectId, taskData) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create task');
    return data;
  },

  update: async (taskId, taskData) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(taskData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update task');
    return data;
  },

  delete: async (taskId) => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete task');
    return data;
  },

  getAllPendingApprovalTasks: async () => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/pending-approval`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch pending tasks');
    return data;
  },

  getAllClosedTasks: async () => {
    const response = await fetch(`${API_BASE_URL}/api/tasks/closed`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch closed tasks');
    return data;
  }
};
```

**4. Data Visualization API**:
```javascript
export const dataVizAPI = {
  uploadDataset: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const tabSessionKey = getTabSessionKey();
    
    const response = await fetch(`${API_BASE_URL}/api/data-viz/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tab-Session-Key': tabSessionKey
      },
      body: formData
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to upload dataset');
    return data;
  },

  getDatasets: async () => {
    const response = await fetch(`${API_BASE_URL}/api/data-viz/datasets`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch datasets');
    return data;
  },

  analyzeDataset: async (datasetId) => {
    const response = await fetch(`${API_BASE_URL}/api/data-viz/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dataset_id: datasetId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to analyze dataset');
    return data;
  },

  visualizeDataset: async (datasetId, config) => {
    const response = await fetch(`${API_BASE_URL}/api/data-viz/visualize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        dataset_id: datasetId,
        config: config
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create visualization');
    return data;
  },

  downloadVisualization: (vizId, format = 'png') => {
    const url = `${API_BASE_URL}/api/data-viz/download/${vizId}?format=${format}`;
    window.open(url, '_blank');
  }
};
```

**5. Team Chat API**:
```javascript
export const chatAPI = {
  getUserProjects: async () => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/projects`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch chat projects");
    return data;
  },

  getProjectChannels: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/projects/${projectId}/channels`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch channels");
    return data;
  },

  getChannelMessages: async (channelId, limit = 50) => {
    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/messages?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch messages");
    return data;
  },

  sendMessage: async (channelId, messageData) => {
    // Support both string and object formats
    const payload = typeof messageData === 'string' 
      ? { text: messageData } 
      : messageData;

    const response = await fetch(`${API_BASE_URL}/api/team-chat/channels/${channelId}/messages`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to send message");
    return data;
  }
};
```

**6. Dashboard API**:
```javascript
export const dashboardAPI = {
  getAnalytics: async () => {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/analytics`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch analytics');
    return data;
  },

  getReport: async () => {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/report`, {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch report');
    return data;
  }
};
```

---

#### Request Caching

**Cache Utility** (`utils/requestCache.js`):
```javascript
export const requestCache = new Map();

export const createCacheKey = (url, options) => {
  return `${url}_${JSON.stringify(options || {})}`;
};

export const cachedFetch = async (url, options, ttl = 60000) => {
  const cacheKey = createCacheKey(url, options);
  const cached = requestCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    console.log(`[CACHE HIT] ${url}`);
    return cached.data;
  }
  
  console.log(`[CACHE MISS] ${url}`);
  const response = await fetch(url, options);
  const data = await response.json();
  
  requestCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};
```

---

#### Features

1. **Modular API Structure**: Separate modules for each entity
2. **Consistent Error Handling**: Throws errors with descriptive messages
3. **Authentication**: Automatic token and tab session key inclusion
4. **Request Caching**: Reduces redundant API calls
5. **FormData Support**: For file uploads (multipart/form-data)
6. **TypeScript-Ready**: Can be easily typed with TypeScript interfaces

---

### 4. Dashboard Components

**Page**: `pages/Dashboard/DashboardPage.js` (828 lines)
**Purpose**: User dashboard with analytics, charts, and task statistics

---

#### Component Architecture

**Imports**:
```javascript
import { dashboardAPI, taskAPI } from "../../services/api";
import TaskStatusChart from "../../components/Charts/TaskStatusChart";
import TaskPriorityChart from "../../components/Charts/TaskPriorityChart";
import ProjectProgressChart from "../../components/Charts/ProjectProgressChart";
import TaskStatsCard from "../../components/Charts/TaskStatsCard";
import { exportToPDF, exportToExcel, exportToCSV } from "../../utils/exportUtils";
import Loader from "../../components/Loader/Loader";
```

**State Management**:
```javascript
const [analytics, setAnalytics] = useState(null);
const [report, setReport] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [exportLoading, setExportLoading] = useState(false);

const [pendingTasks, setPendingTasks] = useState([]);
const [closedTasks, setClosedTasks] = useState([]);
const [pendingCount, setPendingCount] = useState(0);
const [closedCount, setClosedCount] = useState(0);
const [showPendingModal, setShowPendingModal] = useState(false);
const [showClosedModal, setShowClosedModal] = useState(false);
```

---

####  Parallel Data Fetching (Performance Optimization)

```javascript
const fetchDashboardData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    
    // ⚡ PERFORMANCE: Fetch ALL data in parallel to reduce loading time
    const [analyticsData, reportData, pendingData, closedData] = await Promise.all([
      dashboardAPI.getAnalytics(),
      dashboardAPI.getReport(),
      taskAPI.getAllPendingApprovalTasks(),
      taskAPI.getAllClosedTasks()
    ]);

    console.log("[Dashboard] Data loaded in parallel:", {
      analytics: !!analyticsData.success,
      report: !!reportData.success,
      pending: pendingData.count,
      closed: closedData.count
    });

    if (analyticsData.success) {
      setAnalytics(analyticsData.analytics);
    }
    
    if (reportData.success) {
      setReport(reportData.report);
    }
    
    setPendingCount(pendingData.count || 0);
    setClosedCount(closedData.count || 0);
    
  } catch (err) {
    setError(err.message || "Failed to load dashboard data");
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  fetchDashboardData();
}, [fetchDashboardData]);
```

**Benefits of Parallel Fetching**:
- Reduces total load time from ~4s (sequential) to ~1s (parallel)
- Better user experience with faster initial render
- Utilizes browser's connection pooling
- Single loading state for all data

---

#### Export Buttons Component

**Memoized Component** (prevents unnecessary re-renders):
```javascript
const ExportButtons = memo(({ onExportPDF, onExportExcel, onExportCSV, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);

  const exportOptions = [
    {
      id: 'pdf',
      label: 'PDF',
      icon: FiFileText,
      color: '#DC2626',
      action: onExportPDF,
    },
    {
      id: 'excel',
      label: 'Excel',
      icon: FiFile,
      color: '#16A34A',
      action: onExportExcel,
    },
    {
      id: 'csv',
      label: 'CSV',
      icon: FiFile,
      color: '#2563EB',
      action: onExportCSV,
    },
  ];

  const handleExport = (option) => {
    option.action();
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', zIndex: 9999 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        <FiDownload size={18} />
        Export Report
        <FiChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="export-dropdown">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleExport(option)}
                disabled={isLoading}
              >
                <div style={{ background: `${option.color}15` }}>
                  <Icon size={16} color={option.color} />
                </div>
                <span>Export as {option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
```

---

#### Chart Components

**TaskStatusChart.js** (Pie Chart with Recharts):
```javascript
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  'Done': '#10b981',
  'Closed': '#6366f1',
};

const TaskStatusChart = memo(({ data }) => {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value
  })).filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Task Status Distribution</h3>
        <div className="no-data">No tasks to display</div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Task Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

export default TaskStatusChart;
```

**TaskPriorityChart.js** (Bar Chart):
```javascript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TaskPriorityChart = memo(({ data }) => {
  const chartData = Object.entries(data).map(([priority, count]) => ({
    priority,
    count,
    fill: COLORS[priority] || '#3b82f6'
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Task Priority Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="priority" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
```

**TaskStatsCard.js** (Statistics Card):
```javascript
const TaskStatsCard = ({ icon: Icon, title, value, color, onClick }) => {
  return (
    <div 
      className="stat-card" 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-icon" style={{ backgroundColor: `${color}20` }}>
        <Icon size={24} color={color} />
      </div>
      <div className="stat-content">
        <p className="stat-value">{value}</p>
        <p className="stat-title">{title}</p>
      </div>
    </div>
  );
};
```

**ProjectProgressChart.js** (Line Chart):
```javascript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ProjectProgressChart = ({ projectData }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={projectData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="completed" 
          stroke="#10b981" 
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="total" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

### 5. Kanban Board Component

**File**: `components/Kanban/KanbanBoard.js` (559 lines)
**Purpose**: Drag-and-drop Kanban board with real-time WebSocket synchronization

---

#### Technology Stack

**Drag & Drop Library**: `@dnd-kit`
```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2"
```

**Features**:
- Touch-friendly (mobile support)
- Accessibility built-in (keyboard navigation)
- Custom drag overlays
- Collision detection algorithms
- Animation support

---

#### Component Structure

**Imports**:
```javascript
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { taskAPI } from '../../services/api';
import useKanbanWebSocket from '../../utils/useKanbanWebSocket';
import KanbanColumn from './KanbanColumn';
import KanbanTaskCard from './KanbanTaskCard';
```

**State Management**:
```javascript
const [tasks, setTasks] = useState([]);
const [activeTask, setActiveTask] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
```

---

#### Workflow Validation

**Sequential Status Progression**:
```javascript
const WORKFLOW_ORDER = {
  'To Do': 0,
  'In Progress': 1,
  'Dev Complete': 2,
  'Testing': 3,
  'Done': 4
};

const isValidTransition = (from, to) => {
  // Can only move forward or backward by 1 step
  const fromIndex = WORKFLOW_ORDER[from];
  const toIndex = WORKFLOW_ORDER[to];
  const difference = Math.abs(toIndex - fromIndex);
  
  return difference === 1;  // Only adjacent status changes allowed
};
```

**Example**:
- ✅ To Do → In Progress (valid)
- ✅ In Progress → Dev Complete (valid)
- ❌ To Do → Done (invalid - skips steps)
- ✅ Testing → Dev Complete (valid - can go back)

---

#### Drag & Drop Implementation

**Sensors Configuration**:
```javascript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // Minimum drag distance (prevents accidental drags)
    },
  })
);
```

**Drag Start Handler**:
```javascript
const handleDragStart = (event) => {
  const { active } = event;
  const task = tasks.find(t => t._id === active.id);
  setActiveTask(task);
};
```

**Drag Over Handler** (Visual feedback):
```javascript
const handleDragOver = (event) => {
  const { active, over } = event;
  
  if (!over) return;
  
  const activeId = active.id;
  const overId = over.id;
  
  // Find source and target columns
  const activeTask = tasks.find(t => t._id === activeId);
  const overColumn = over.data.current?.sortable?.containerId || overId;
  
  // Optimistic UI update
  setTasks(prevTasks => {
    return prevTasks.map(task => {
      if (task._id === activeId) {
        return { ...task, status: overColumn };
      }
      return task;
    });
  });
};
```

**Drag End Handler** (API Call + WebSocket Broadcast):
```javascript
const handleDragEnd = async (event) => {
  const { active, over } = event;
  
  if (!over) {
    setActiveTask(null);
    return;
  }
  
  const taskId = active.id;
  const task = tasks.find(t => t._id === taskId);
  const oldStatus = task.status;
  const newStatus = over.id;
  
  if (oldStatus === newStatus) {
    setActiveTask(null);
    return;
  }
  
  // Validate workflow transition
  if (!isValidTransition(oldStatus, newStatus)) {
    toast.error(`Cannot move task from ${oldStatus} to ${newStatus}`);
    // Revert optimistic update
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t._id === taskId ? { ...t, status: oldStatus } : t
      )
    );
    setActiveTask(null);
    return;
  }
  
  try {
    // Update task status via API
    await taskAPI.update(taskId, { status: newStatus });
    
    // WebSocket will broadcast the change to other users
    console.log('[Kanban] Task status updated:', { taskId, oldStatus, newStatus });
  } catch (error) {
    console.error('[Kanban] Failed to update task:', error);
    toast.error('Failed to update task status');
    
    // Revert optimistic update on error
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t._id === taskId ? { ...t, status: oldStatus } : t
      )
    );
  } finally {
    setActiveTask(null);
  }
};
```

---

#### WebSocket Integration

**Custom Hook Usage**:
```javascript
const { connectionStatus, isConnected } = useKanbanWebSocket(
  projectId,
  handleWebSocketMessage,
  { enabled: true, reconnectAttempts: 10, reconnectInterval: 2000 }
);

const handleWebSocketMessage = useCallback((data) => {
  console.log('[Kanban] WebSocket message:', data.type);
  
  switch (data.type) {
    case 'connection':
      console.log('[Kanban] Connected to project:', data.project_id);
      break;
    
    case 'task_created':
      // Add new task to board
      setTasks(prevTasks => [...prevTasks, data.task]);
      toast.info(`New task created: ${data.task.title}`);
      break;
    
    case 'task_updated':
      // Update existing task
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task._id === data.task._id ? data.task : task
        )
      );
      break;
    
    case 'task_deleted':
      // Remove task from board
      setTasks(prevTasks => 
        prevTasks.filter(task => task._id !== data.task_id)
      );
      toast.info('Task deleted');
      break;
    
    default:
      console.log('[Kanban] Unknown message type:', data.type);
  }
}, []);
```

---

#### JSX Structure

```javascript
return (
  <div className="kanban-board">
    {/* Connection Status Indicator */}
    <div className="kanban-header">
      <h2>Kanban Board</h2>
      <div className={`connection-status ${connectionStatus}`}>
        <div className="status-dot" />
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
    
    {/* Drag & Drop Context */}
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-columns">
        {['To Do', 'In Progress', 'Dev Complete', 'Testing', 'Done'].map(status => (
          <KanbanColumn
            key={status}
            id={status}
            title={status}
            tasks={tasks.filter(task => task.status === status)}
          />
        ))}
      </div>
      
      {/* Drag Overlay (shows dragged item) */}
      <DragOverlay>
        {activeTask && (
          <KanbanTaskCard task={activeTask} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  </div>
);
```

---

#### KanbanColumn Component

```javascript
function KanbanColumn({ id, title, tasks }) {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div className="kanban-column" ref={setNodeRef}>
      <div className="column-header">
        <h3>{title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      
      <SortableContext
        items={tasks.map(t => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="column-tasks">
          {tasks.map(task => (
            <KanbanTaskCard key={task._id} task={task} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

---

#### KanbanTaskCard Component

```javascript
function KanbanTaskCard({ task, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: task._id 
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="kanban-task-card"
    >
      <div className="task-header">
        <span className="ticket-id">{task.ticket_id}</span>
        <span className={`priority priority-${task.priority.toLowerCase()}`}>
          {task.priority}
        </span>
      </div>
      <h4 className="task-title">{task.title}</h4>
      <div className="task-footer">
        <div className="assignee-avatar">
          {task.assignee_name?.charAt(0).toUpperCase()}
        </div>
        <span className="due-date">{task.due_date}</span>
      </div>
    </div>
  );
}
```

---

#### Performance Optimizations

1. **Optimistic UI Updates**: Immediate visual feedback before API response
2. **WebSocket for Real-time**: Syncs changes across all connected users
3. **Memoization**: Uses `useCallback` and `memo` to prevent re-renders
4. **Batch Updates**: Groups state updates to minimize renders
5. **Collision Detection**: Efficient `closestCorners` algorithm

---

### 6. AI Assistant Component

**File**: `components/Chat/AIChatbot.js` (735 lines)
**Purpose**: Conversational AI assistant with task analytics and visualizations

---

#### Component Structure

**State Management**:
```javascript
const [isOpen, setIsOpen] = useState(false);  // Chat window open/closed
const [isMinimized, setIsMinimized] = useState(false);  // Minimized state
const [messages, setMessages] = useState([{
  role: 'assistant',
  content: `Hi ${user?.name}! 👋 I'm your AI productivity assistant.`,
  timestamp: new Date(),
}]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

---

#### Quick Prompts

**Pre-defined queries** for common tasks:
```javascript
const quickPrompts = [
  { 
    icon: <TrendingUp size={12} />, 
    text: "Summary", 
    query: "Give me a summary of my tasks" 
  },
  { 
    icon: <Calendar size={12} />, 
    text: "Deadlines", 
    query: "What are my upcoming deadlines?" 
  },
  { 
    icon: <CheckCircle size={12} />, 
    text: "Progress", 
    query: "How is my progress?" 
  },
  { 
    icon: <BarChart3 size={12} />, 
    text: "Analytics", 
    query: "Show me visual analytics" 
  },
];

const handleQuickPrompt = (query) => {
  setInput(query);
  setTimeout(() => handleSend(), 80);
};
```

---

#### Message Sending

**Complete flow** with conversation history:
```javascript
const handleSend = async () => {
  if (!input.trim() || isLoading) return;

  const userMessage = {
    role: 'user',
    content: input.trim(),
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setInput('');
  setIsLoading(true);

  try {
    const tabKey = sessionStorage.getItem('tab_session_key');
    const response = await fetch('http://localhost:8000/api/chat/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'X-Tab-Session-Key': tabKey,
      },
      body: JSON.stringify({
        message: input,
        conversationHistory: messages.slice(-10),  // Last 10 messages for context
      }),
    });

    if (!response.ok) throw new Error('Failed to get AI response');

    const data = await response.json();

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: data.response || "Here's what I found...",
        timestamp: new Date(),
        insights: data.insights || [],
        data: data.data,
        visualizations: detectVisualizationNeeds(input, data.data),
      },
    ]);
  } catch (error) {
    console.error('Chat error:', error);
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        isError: true,
        timestamp: new Date(),
      },
    ]);
  } finally {
    setIsLoading(false);
  }
};
```

---

#### Visualization Detection

**Auto-generates charts** when user requests visual analytics:
```javascript
const detectVisualizationNeeds = (query, userData) => {
  const visualKeywords = ['show', 'visual', 'chart', 'graph', 'analytics', 'distribution', 'breakdown'];
  const queryLower = query.toLowerCase();
  
  const needsVisualization = visualKeywords.some(keyword => queryLower.includes(keyword));
  
  if (!needsVisualization || !userData) return null;

  return {
    taskStatus: userData.stats?.tasks?.statusBreakdown,  // To Do, In Progress, Done
    taskPriority: userData.stats?.tasks?.priorityBreakdown,  // High, Medium, Low
    completionTrend: {
      week: userData.stats?.tasks?.completedWeek,
      month: userData.stats?.tasks?.completedMonth,
    },
  };
};
```

---

#### Inline Visualizations

**Status Chart** (horizontal bars):
```javascript
const renderStatusChart = (statusData) => {
  const total = Object.values(statusData).reduce((sum, val) => sum + val, 0);
  const statuses = [
    { key: 'To Do', color: '#94a3b8', value: statusData['To Do'] || 0 },
    { key: 'In Progress', color: '#3b82f6', value: statusData['In Progress'] || 0 },
    { key: 'Done', color: '#10b981', value: statusData['Done'] || 0 },
    { key: 'Closed', color: '#8b5cf6', value: statusData['Closed'] || 0 },
  ].filter(s => s.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {statuses.map(status => {
        const percentage = total > 0 ? (status.value / total) * 100 : 0;
        return (
          <div key={status.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '65px', fontSize: '10px', fontWeight: 600 }}>
              {status.key}
            </div>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '18px' }}>
              <div style={{
                width: `${percentage}%`,
                height: '100%',
                background: status.color,
                borderRadius: '6px',
                transition: 'width 0.5s ease',
              }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'white' }}>
                  {status.value}
                </span>
              </div>
            </div>
            <div style={{ width: '32px', fontSize: '9px' }}>
              {percentage.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

**Priority Chart** (colored boxes):
```javascript
const renderPriorityChart = (priorityData) => {
  const priorities = [
    { key: 'High', color: '#ef4444', emoji: '🔴', value: priorityData['High'] || 0 },
    { key: 'Medium', color: '#f59e0b', emoji: '🟡', value: priorityData['Medium'] || 0 },
    { key: 'Low', color: '#10b981', emoji: '🟢', value: priorityData['Low'] || 0 },
  ].filter(p => p.value > 0);

  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {priorities.map(priority => (
        <div key={priority.key} style={{
          flex: 1,
          background: `${priority.color}10`,
          border: `1.5px solid ${priority.color}`,
          borderRadius: '8px',
          padding: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '18px' }}>{priority.emoji}</div>
          <div style={{ fontSize: '9px', color: priority.color }}>{priority.key}</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: priority.color }}>
            {priority.value}
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

#### Features

1. **Conversational Interface**: Natural language query processing
2. **Conversation History**: Maintains context (last 10 messages)
3. **Quick Prompts**: Pre-defined queries for common tasks
4. **Auto Visualizations**: Detects when user wants charts/graphs
5. **Minimized Mode**: Keeps chat visible but collapsed
6. **Keyboard Shortcuts**: Enter to send, Shift+Enter for newline
7. **Error Handling**: Graceful error messages
8. **Auto-scroll**: Automatically scrolls to latest message

---

### 7. Team Chat Component

**File**: `components/TeamChat/TeamChat.js` (1,502 lines)
**Purpose**: Real-time team messaging with channel-based architecture

---

#### Component Architecture

**Three-tier Structure**:
1. **Project** → Select which project to chat in
2. **Channel** → Select channel within project (general, random, dev, etc.)
3. **Messages** → Real-time message stream with attachments

**State Management**:
```javascript
const [isOpen, setIsOpen] = useState(false);
const [currentProject, setCurrentProject] = useState(null);
const [currentChannel, setCurrentChannel] = useState(null);
const [message, setMessage] = useState('');
const [projects, setProjects] = useState([]);
const [channels, setChannels] = useState([]);
const [messages, setMessages] = useState([]);

// Advanced features
const [editingMessageId, setEditingMessageId] = useState(null);
const [replyingTo, setReplyingTo] = useState(null);
const [selectedFile, setSelectedFile] = useState(null);
const [uploadProgress, setUploadProgress] = useState(0);
```

---

#### WebSocket Integration

**Connection URL**:
```javascript
const wsUrl = currentChannel && isOpen
  ? `${API_BASE_URL.replace('http', 'ws')}/api/team-chat/ws/${currentChannel}?token=${localStorage.getItem('token')}`
  : null;
```

**Message Handler**:
```javascript
const handleWebSocketMessage = useCallback((data) => {
  console.log('[TeamChat WS] Received:', data.type);
  
  switch (data.type) {
    case 'connection':
      console.log('[TeamChat WS] Connected to channel:', data.channel_id);
      break;
      
    case 'new_message':
      // Add new message to the list
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === data.message.id)) {
          return prev;
        }
        return [...prev, data.message];
      });
      break;
      
    case 'message_edited':
      // Update edited message
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id 
          ? { ...msg, text: data.text, edited: true }
          : msg
      ));
      break;
      
    case 'message_deleted':
      // Remove deleted message
      setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
      break;
      
    case 'reaction_updated':
      // Update message reactions
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id 
          ? { ...msg, reactions: data.reactions }
          : msg
      ));
      break;
      
    case 'user_joined':
      console.log('[TeamChat WS] User joined:', data.user_id);
      break;
      
    case 'user_left':
      console.log('[TeamChat WS] User left:', data.user_id);
      break;
      
    default:
      console.log('[TeamChat WS] Unknown message type:', data.type);
  }
}, []);
```

**Hook Initialization**:
```javascript
const { connectionStatus, isConnected } = useWebSocket(
  wsUrl,
  handleWebSocketMessage,
  {
    enabled: Boolean(currentChannel && isOpen),
    reconnectAttempts: 10,
    reconnectInterval: 2000
  }
);
```

---

#### Message Sending with Attachments

**Complete Implementation**:
```javascript
const handleSendMessage = async () => {
  if ((!message.trim() && !selectedFile) || !currentChannel || sending) return;

  const messageText = message.trim();
  const fileToUpload = selectedFile;
  
  setMessage('');
  setSelectedFile(null);
  setSending(true);

  try {
    let attachment = null;
    
    // Upload file if present
    if (fileToUpload) {
      setUploadProgress(10);
      const formData = new FormData();
      formData.append('file', fileToUpload);
      
      const uploadResponse = await chatAPI.uploadAttachment(formData);
      attachment = uploadResponse.attachment;
      setUploadProgress(100);
    }

    // Send message via HTTP (WebSocket will broadcast it to all)
    await chatAPI.sendMessage(currentChannel, {
      text: messageText,
      parent_id: replyingTo?.id || null,  // For thread replies
      attachment: attachment
    });
    
    // Clear reply state
    setReplyingTo(null);
    setUploadProgress(0);
    
    // Message will appear via WebSocket broadcast
    // No need to manually fetch messages
  } catch (error) {
    console.error('Error sending message:', error);
    setMessage(messageText);  // Restore message on error
    setSelectedFile(fileToUpload);
  } finally {
    setSending(false);
  }
};
```

---

#### Advanced Features

**1. Edit Message**:
```javascript
const handleEditMessage = async (messageId, newText) => {
  try {
    await chatAPI.editMessage(messageId, { text: newText });
    setEditingMessageId(null);
    // WebSocket broadcasts the edit to all users
  } catch (error) {
    console.error('Failed to edit message:', error);
  }
};
```

**2. Delete Message**:
```javascript
const handleDeleteMessage = async (messageId) => {
  if (!confirm('Delete this message?')) return;
  
  try {
    await chatAPI.deleteMessage(messageId);
    // WebSocket broadcasts the deletion to all users
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
};
```

**3. Emoji Reactions**:
```javascript
const commonEmojis = ['👍', '❤️', '😊', '🎉', '👏', '🔥', '✅', '👀'];

const handleAddReaction = async (messageId, emoji) => {
  try {
    await chatAPI.addReaction(messageId, { emoji });
    setShowEmojiPicker(null);
    // WebSocket broadcasts reaction to all users
  } catch (error) {
    console.error('Failed to add reaction:', error);
  }
};
```

**4. File Attachments**:
```javascript
const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    // Max file size: 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    setSelectedFile(file);
  }
};
```

**5. Thread Replies**:
```javascript
const handleReply = (message) => {
  setReplyingTo(message);
  document.getElementById('chat-input').focus();
};
```

---

#### Connection Status Indicator

```javascript
<div className={`connection-status ${connectionStatus}`}>
  {isConnected ? (
    <>
      <Wifi size={16} />
      <span>Connected</span>
    </>
  ) : (
    <>
      <WifiOff size={16} />
      <span>Disconnected</span>
    </>
  )}
</div>
```

**CSS Status Colors**:
```css
.connection-status.connected {
  color: #10b981;
}

.connection-status.disconnected {
  color: #ef4444;
}

.connection-status.reconnecting {
  color: #f59e0b;
}
```

---

#### Features Summary

1. **Real-time Messaging**: WebSocket-powered instant delivery
2. **Channel System**: Organized communication by project/channel
3. **File Attachments**: Upload images, documents (max 10MB)
4. **Edit/Delete**: Modify or remove your messages
5. **Emoji Reactions**: Quick reactions with common emojis
6. **Thread Replies**: Reply to specific messages
7. **Connection Status**: Visual indicator of WebSocket connection
8. **Auto-reconnect**: Automatic reconnection on disconnect
9. **Unread Badges**: Shows unread message count
10. **Online Status**: Shows who's currently online

---

### 8. Calendar View Component

**File**: `components/Calendar/CalendarView.js` (239 lines)
**Library**: `react-big-calendar` (v1.19.4)
**Purpose**: Visual task scheduling with drag-and-drop

---

#### Library Setup

**Dependencies**:
```json
"react-big-calendar": "^1.19.4",
"moment": "^2.30.1"
```

**Initialization**:
```javascript
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);
```

---

#### Event Transformation

**Convert tasks to calendar events**:
```javascript
const events = useMemo(() => {
  return tasks
    .filter((task) => task.due_date)  // Only tasks with due dates
    .map((task) => {
      const dueDate = new Date(task.due_date);
      return {
        id: task._id,
        title: task.title,
        start: dueDate,
        end: dueDate,
        allDay: true,  // All tasks are all-day events
        resource: {
          ...task,
          color: getPriorityColor(task.priority),
          status: task.status,
        },
      };
    });
}, [tasks, getPriorityColor]);
```

---

#### Color Coding

**Priority Colors**:
```javascript
const getPriorityColor = useCallback((priority) => {
  switch (priority) {
    case "High":
      return "#ef4444";  // Red
    case "Medium":
      return "#f59e0b";  // Orange
    case "Low":
      return "#10b981";  // Green
    default:
      return "#6b7280";  // Gray
  }
}, []);
```

**Status Colors** (for borders):
```javascript
const getStatusColor = useCallback((status) => {
  switch (status) {
    case "Done":
      return "#22c55e";  // Green
    case "In Progress":
      return "#3b82f6";  // Blue
    case "To Do":
      return "#94a3b8";  // Gray
    case "Testing":
      return "#f59e0b";  // Orange
    case "Incomplete":
      return "#ef4444";  // Red
    default:
      return "#6b7280";
  }
}, []);
```

---

#### Custom Event Styling

**Dynamic styles** based on priority and status:
```javascript
const eventStyleGetter = useCallback((event) => {
  const backgroundColor = event.resource.color;  // Priority color as background
  const statusColor = getStatusColor(event.resource.status);  // Status color as border
  
  return {
    style: {
      backgroundColor,
      borderRadius: "6px",
      opacity: event.resource.status === "Done" ? 0.6 : 1,  // Dim completed tasks
      color: "white",
      border: `2px solid ${statusColor}`,
      display: "block",
      fontSize: "13px",
      fontWeight: "600",
      padding: "4px 8px",
    },
  };
}, [getStatusColor]);
```

---

#### Drag-and-Drop Rescheduling

**Event Drop Handler**:
```javascript
const handleEventDrop = async ({ event, start }) => {
  try {
    const newDueDate = moment(start).format("YYYY-MM-DD");
    await taskAPI.update(event.id, { due_date: newDueDate });
    
    if (onTaskUpdate) {
      onTaskUpdate();  // Refresh tasks
    }
  } catch (error) {
    console.error("Failed to update task due date:", error);
    alert("Failed to reschedule task. Please try again.");
  }
};
```

---

#### Custom Event Component

**Enhanced event display** with ticket ID, title, priority, and assignee:
```javascript
const CustomEvent = ({ event }) => {
  const task = event.resource;
  return (
    <div className="custom-event">
      <div className="event-ticket-id">{task.ticket_id}</div>
      <div className="event-title">{event.title}</div>
      <div className="event-meta">
        <span className="event-priority">{task.priority || "None"}</span>
        {task.assignee_name && task.assignee_name !== "Unassigned" && (
          <span className="event-assignee">
            {task.assignee_name.split(" ")[0]}  {/* First name only */}
          </span>
        )}
      </div>
    </div>
  );
};
```

---

#### Custom Toolbar

**Navigation and View Controls**:
```javascript
const CustomToolbar = (props) => {
  const { label, onNavigate, onView } = props;
  return (
    <div className="calendar-toolbar">
      {/* Navigation buttons */}
      <div className="toolbar-navigation">
        <button type="button" onClick={() => onNavigate("TODAY")}>Today</button>
        <button type="button" onClick={() => onNavigate("PREV")}>‹</button>
        <button type="button" onClick={() => onNavigate("NEXT")}>►</button>
      </div>
      
      {/* Current date range label */}
      <div className="toolbar-label">
        <h2>{label}</h2>
      </div>
      
      {/* View switcher */}
      <div className="toolbar-views">
        {["month", "week", "day", "agenda"].map((v) => (
          <button
            key={v}
            className={`btn-view ${props.view === v ? "active" : ""}`}
            onClick={() => onView(v)}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

#### Calendar Component JSX

```javascript
<Calendar
  localizer={localizer}
  events={events}
  startAccessor="start"
  endAccessor="end"
  view={view}
  onView={setView}
  date={date}
  onNavigate={setDate}
  style={{ height: "600px" }}
  
  // Event handlers
  onSelectEvent={handleSelectEvent}  // Click to view task details
  onEventDrop={handleEventDrop}  // Drag to reschedule
  onEventResize={handleEventResize}  // Resize (not used for all-day)
  onSelectSlot={handleSelectSlot}  // Click empty slot to create task
  
  // Custom components
  components={{
    event: CustomEvent,
    toolbar: CustomToolbar,
  }}
  
  // Styling
  eventPropGetter={eventStyleGetter}
  
  // Features
  selectable  // Enable slot selection
  resizable  // Enable event resizing
  draggableAccessor={() => true}  // All events draggable
/>
```

---

#### Legend Component

**Visual guide** for colors:
```javascript
<div className="calendar-legend">
  {/* Priority Colors */}
  <div className="legend-item">
    <span className="legend-color" style={{ backgroundColor: "#ef4444" }}></span>
    <span>High Priority</span>
  </div>
  <div className="legend-item">
    <span className="legend-color" style={{ backgroundColor: "#f59e0b" }}></span>
    <span>Medium Priority</span>
  </div>
  <div className="legend-item">
    <span className="legend-color" style={{ backgroundColor: "#10b981" }}></span>
    <span>Low Priority</span>
  </div>
  
  <div className="legend-divider">|</div>
  
  {/* Status Borders */}
  <div className="legend-item">
    <span className="legend-border" style={{ borderColor: "#94a3b8" }}></span>
    <span>To Do</span>
  </div>
  <div className="legend-item">
    <span className="legend-border" style={{ borderColor: "#3b82f6" }}></span>
    <span>In Progress</span>
  </div>
  <div className="legend-item">
    <span className="legend-border" style={{ borderColor: "#22c55e" }}></span>
    <span>Done</span>
  </div>
</div>
```

---

#### Features

1. **Multiple Views**: Month, Week, Day, Agenda
2. **Drag-and-Drop**: Reschedule tasks by dragging
3. **Color Coding**: Priority (background) + Status (border)
4. **Custom Events**: Shows ticket ID, title, priority, assignee
5. **Navigation**: Today/Previous/Next buttons
6. **Selectable Slots**: Click empty date to create task
7. **Legend**: Visual guide for colors
8. **Responsive**: Adapts to container size
9. **Opacity**: Dims completed tasks

---

## State Management Patterns

### 1. Local Component State (useState)

**Purpose**: Manage component-specific data that doesn't need to be shared

**Usage**:
```javascript
const [tasks, setTasks] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [showModal, setShowModal] = useState(false);
```

**Best Practices**:
- Use for UI state (modals, dropdowns, form inputs)
- Keep initial state simple
- Use functional updates for state based on previous state
```javascript
setTasks(prevTasks => [...prevTasks, newTask]);  // ✅ Correct
setTasks([...tasks, newTask]);  // ⚠️ May use stale state
```

---

### 2. Context API (Global State)

**AuthContext** (authentication & user data):
```javascript
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { getToken } = useClerkAuth();
  
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dual authentication: Clerk (social) + Traditional (email/password)
  useEffect(() => {
    const initializeAuth = async () => {
      if (isLoaded) {
        if (clerkUser) {
          await syncClerkUser();  // Sync Clerk user with backend
        } else {
          await checkTraditionalAuth();  // Check JWT token
        }
      }
    };
    initializeAuth();
  }, [clerkUser, isLoaded]);
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      loading,
      login,
      register,
      logout,
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**Usage in Components**:
```javascript
function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

### 3. URL State (React Router)

**Purpose**: Store state in URL for shareable, bookmarkable pages

**useParams** (dynamic segments):
```javascript
// Route: /projects/:projectId/tasks/:taskId
function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  
  useEffect(() => {
    fetchTaskDetails(projectId, taskId);
  }, [projectId, taskId]);
}
```

**useNavigate** (programmatic navigation):
```javascript
function ProjectList() {
  const navigate = useNavigate();
  
  const handleProjectClick = (projectId) => {
    navigate(`/projects/${projectId}/tasks`);
  };
  
  const handleBack = () => {
    navigate(-1);  // Go back 1 step
  };
}
```

**useLocation** (access current location):
```javascript
function NavBar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav>
      <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
        Dashboard
      </Link>
    </nav>
  );
}
```

**useSearchParams** (query parameters):
```javascript
function TaskList() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const status = searchParams.get('status') || 'all';
  const priority = searchParams.get('priority') || 'all';
  
  const handleFilterChange = (key, value) => {
    setSearchParams({ ...Object.fromEntries(searchParams), [key]: value });
  };
  
  // URL: /tasks?status=In%20Progress&priority=High
}
```

---

### 4. Server State (@tanstack/react-query)

**Purpose**: Manage data fetched from API with caching and synchronization

**Setup** (in App.js):
```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,  // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>...</Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

**Usage** (fetch data):
```javascript
import { useQuery } from '@tanstack/react-query';

function ProjectList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.getAll(),
  });
  
  if (isLoading) return <Loader />;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data.projects.map(project => (
        <ProjectCard key={project._id} project={project} />
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

**Mutations** (create/update/delete):
```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateProjectButton() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (newProject) => projectAPI.create(newProject),
    onSuccess: () => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
    },
    onError: (error) => {
      toast.error('Failed to create project');
    },
  });
  
  const handleCreate = () => {
    mutation.mutate({ name: 'New Project', description: '...' });
  };
  
  return (
    <button onClick={handleCreate} disabled={mutation.isPending}>
      {mutation.isPending ? 'Creating...' : 'Create Project'}
    </button>
  );
}
```

---

### 5. WebSocket State (Custom Hooks)

**useWebSocket** (generic hook):
```javascript
const { 
  connectionStatus,   // 'connected' | 'disconnected' | 'reconnecting'
  isConnected,        // boolean
  lastError,          // Error object
  sendMessage,        // (data) => void
  disconnect,         // () => void
  reconnect           // () => void
} = useWebSocket(
  wsUrl,              // WebSocket URL
  handleMessage,      // Message handler callback
  {
    enabled: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
  }
);
```

**useKanbanWebSocket** (Kanban-specific):
```javascript
const { 
  connectionStatus,
  isConnected 
} = useKanbanWebSocket(
  projectId,
  handleKanbanMessage,  // Handles task_created, task_updated, task_deleted
  {
    enabled: true,
    reconnectAttempts: 10,
    reconnectInterval: 2000,
  }
);
```

---

### 6. Form State

**Controlled Components** (recommended for complex forms):
```javascript
function TaskForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
    due_date: '',
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await taskAPI.create(formData);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        name="title" 
        value={formData.title} 
        onChange={handleChange} 
        required 
      />
      <textarea 
        name="description" 
        value={formData.description} 
        onChange={handleChange} 
      />
      <select name="priority" value={formData.priority} onChange={handleChange}>
        <option>High</option>
        <option>Medium</option>
        <option>Low</option>
      </select>
      <button type="submit">Create Task</button>
    </form>
  );
}
```

---

### 7. Derived State

**useMemo** (computed values):
```javascript
function TaskList({ tasks }) {
  // ✅ Derived state - recomputed when tasks change
  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Done').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    high Priority: tasks.filter(t => t.priority === 'High').length,
  }), [tasks]);
  
  const completionRate = useMemo(() => {
    return tasks.length > 0 
      ? ((stats.completed / tasks.length) * 100).toFixed(1)
      : 0;
  }, [stats.completed, tasks.length]);
  
  return (
    <div>
      <h2>Completion Rate: {completionRate}%</h2>
      <p>Completed: {stats.completed} / {stats.total}</p>
    </div>
  );
}
```

---

## Styling Architecture

### 1. CSS Variable System (Theming)

**Root Variables** (`index.css`):
```css
:root {
  /* Color Palette */
  --primary-color: #6366f1;      /* Indigo */
  --secondary-color: #8b5cf6;    /* Purple */
  --success-color: #10b981;      /* Green */
  --warning-color: #f59e0b;      /* Orange */
  --danger-color: #ef4444;       /* Red */
  --info-color: #3b82f6;         /* Blue */
  
  /* Neutral Colors */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  /* Background & Text */
  --background: #f9fafb;
  --background-secondary: #ffffff;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-disabled: #9ca3af;
  
  /* Borders & Shadows */
  --border-color: #e5e7eb;
  --border-radius: 8px;
  --border-radius-sm: 4px;
  --border-radius-lg: 12px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}
```

**Dark Theme** (`[data-theme="dark"]`):
```css
:root[data-theme="dark"] {
  /* Dark Mode Colors */
  --background: #111827;
  --background-secondary: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-disabled: #6b7280;
  --border-color: #374151;
  
  /* Adjust shadows for dark mode */
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.3);
}
```

**Usage in Components**:
```css
.button {
  background-color: var(--primary-color);
  color: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.button:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}
```

---

### 2. Component-Specific Styles

**Naming Convention**: BEM (Block Element Modifier)
```css
/* Block */
.task-card { }

/* Element */
.task-card__header { }
.task-card__title { }
.task-card__footer { }

/* Modifier */
.task-card--high-priority { }
.task-card--completed { }
```

**Example** (`TaskCard.css`):
```css
.task-card {
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
  cursor: pointer;
}

.task-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.task-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.task-card__ticket-id {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  font-weight: var(--font-weight-semibold);
}

.task-card__priority {
  padding: 2px 8px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.task-card__priority--high {
  background: #fee2e2;
  color: #dc2626;
}

.task-card__priority--medium {
  background: #fef3c7;
  color: #d97706;
}

.task-card__priority--low {
  background: #d1fae5;
  color: #059669;
}

.task-card__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  line-height: 1.5;
}

.task-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-md);
}

.task-card--completed {
  opacity: 0.7;
}

.task-card--completed .task-card__title {
  text-decoration: line-through;
}
```

---

### 3. Glass-Morphism Effect

**Modern UI Pattern** (used in modals, panels):
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Dark theme variant */
:root[data-theme="dark"] .glass-panel {
  background: rgba(31, 41, 55, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**Usage**:
```javascript
<div className="glass-panel">
  <h2>Project Dashboard</h2>
  <p>Transparent background with blur effect</p>
</div>
```

---

### 4. Responsive Design (Mobile-First)

**Breakpoints**:
```css
/* Mobile: Default (0px+) */
.container {
  padding: var(--spacing-md);
}

/* Tablet: 768px+ */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-lg);
  }
  
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-xl);
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Large Desktop: 1280px+ */
@media (min-width: 1280px) {
  .container {
    max-width: 1400px;
  }
  
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

**Responsive Navbar**:
```css
.navbar {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-md);
}

.navbar__links {
  display: none;  /* Hidden on mobile */
}

.navbar__mobile-menu {
  display: block;
}

@media (min-width: 768px) {
  .navbar__links {
    display: flex;
    gap: var(--spacing-md);
  }
  
  .navbar__mobile-menu {
    display: none;
  }
}
```

---

### 5. Utility Classes

**Global Utilities** (`App.css`):
```css
/* Display */
.d-flex { display: flex; }
.d-grid { display: grid; }
.d-none { display: none; }
.d-block { display: block; }

/* Flexbox */
.flex-row { flex-direction: row; }
.flex-column { flex-direction: column; }
.flex-center { justify-content: center; align-items: center; }
.flex-between { justify-content: space-between; }
.flex-gap-sm { gap: var(--spacing-sm); }
.flex-gap-md { gap: var(--spacing-md); }

/* Spacing */
.mt-sm { margin-top: var(--spacing-sm); }
.mt-md { margin-top: var(--spacing-md); }
.mb-md { margin-bottom: var(--spacing-md); }
.p-md { padding: var(--spacing-md); }

/* Text */
.text-center { text-align: center; }
.text-bold { font-weight: var(--font-weight-bold); }
.text-secondary { color: var(--text-secondary); }

/* Borders */
.rounded { border-radius: var(--border-radius); }
.border { border: 1px solid var(--border-color); }

/* Shadows */
.shadow-sm { box-shadow: var(--shadow-sm); }
.shadow { box-shadow: var(--shadow); }
.shadow-md { box-shadow: var(--shadow-md); }
```

---

### 6. Animation & Transitions

**Fade In Animation**:
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn var(--transition-base) ease;
}
```

**Loading Spinner**:
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loader {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
```

**Hover Effects**:
```css
.card {
  transition: all var(--transition-base);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

---

## Custom Hooks

### 1. useWebSocket (Generic WebSocket Hook)

**File**: `utils/useWebSocket.js` (200 lines)
**Purpose**: Generic WebSocket connection with auto-reconnect and heartbeat

---

#### Configuration Options

```javascript
const defaultConfig = {
  enabled: true,                // Enable/disable connection
  reconnectAttempts: 5,         // Max reconnection attempts
  reconnectInterval: 3000,      // Delay between attempts (ms)
  heartbeatInterval: 30000,     // Ping interval (ms)
};
```

---

#### State Management

```javascript
const [connectionStatus, setConnectionStatus] = useState('disconnected');
const [lastError, setLastError] = useState(null);
const wsRef = useRef(null);
const reconnectCountRef = useRef(0);
const heartbeatIntervalRef = useRef(null);
```

**Connection States**:
- `'disconnected'`: Not connected
- `'connecting'`: Attempting to connect
- `'connected'`: Successfully connected
- `'reconnecting'`: Attempting to reconnect after disconnect
- `'error'`: Connection error
- `'failed'`: Max reconnection attempts reached

---

#### Connection Logic

```javascript
const connect = useCallback(() => {
  if (!config.enabled || !url) return;
  
  try {
    setConnectionStatus('connecting');
    setLastError(null);
    
    wsRef.current = new WebSocket(url);
    
    wsRef.current.onopen = () => {
      console.log('[WebSocket] Connected');
      setConnectionStatus('connected');
      reconnectCountRef.current = 0;  // Reset reconnect counter
      startHeartbeat();
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'pong') {
        // Heartbeat response
        return;
      }
      
      if (onMessage) {
        onMessage(data);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setLastError(error);
      setConnectionStatus('error');
    };
    
    wsRef.current.onclose = (event) => {
      console.log('[WebSocket] Closed:', event.code, event.reason);
      stopHeartbeat();
      
      if (event.wasClean) {
        setConnectionStatus('disconnected');
      } else {
        // Unexpected close - attempt reconnect
        attemptReconnect();
      }
    };
  } catch (error) {
    console.error('[WebSocket] Connection failed:', error);
    setLastError(error);
    setConnectionStatus('error');
    attemptReconnect();
  }
}, [url, config.enabled, onMessage]);
```

---

#### Reconnection Logic

```javascript
const attemptReconnect = useCallback(() => {
  if (reconnectCountRef.current >= config.reconnectAttempts) {
    console.error('[WebSocket] Max reconnection attempts reached');
    setConnectionStatus('failed');
    return;
  }
  
  reconnectCountRef.current++;
  setConnectionStatus('reconnecting');
  
  console.log(`[WebSocket] Reconnecting (${reconnectCountRef.current}/${config.reconnectAttempts})...`);
  
  setTimeout(() => {
    connect();
  }, config.reconnectInterval);
}, [config.reconnectAttempts, config.reconnectInterval, connect]);
```

---

#### Heartbeat (Keep-Alive)

```javascript
const startHeartbeat = useCallback(() => {
  stopHeartbeat();  // Clear existing interval
  
  heartbeatIntervalRef.current = setInterval(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  }, config.heartbeatInterval);
}, [config.heartbeatInterval]);

const stopHeartbeat = useCallback(() => {
  if (heartbeatIntervalRef.current) {
    clearInterval(heartbeatIntervalRef.current);
    heartbeatIntervalRef.current = null;
  }
}, []);
```

---

#### Public API

```javascript
const sendMessage = useCallback((data) => {
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify(data));
  } else {
    console.warn('[WebSocket] Cannot send message - not connected');
  }
}, []);

const disconnect = useCallback(() => {
  stopHeartbeat();
  if (wsRef.current) {
    wsRef.current.close(1000, 'Client disconnect');
    wsRef.current = null;
  }
  setConnectionStatus('disconnected');
}, [stopHeartbeat]);

const reconnect = useCallback(() => {
  disconnect();
  reconnectCountRef.current = 0;
  connect();
}, [disconnect, connect]);

return {
  connectionStatus,
  isConnected: connectionStatus === 'connected',
  lastError,
  sendMessage,
  disconnect,
  reconnect,
};
```

---

#### Usage Example

```javascript
import { useWebSocket } from '../utils/useWebSocket';

function TeamChat() {
  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'new_message':
        setMessages(prev => [...prev, data.message]);
        break;
      case 'user_joined':
        console.log('User joined:', data.user_id);
        break;
      default:
        console.log('Unknown message:', data.type);
    }
  }, []);
  
  const { 
    connectionStatus, 
    isConnected, 
    sendMessage, 
    disconnect 
  } = useWebSocket(
    'ws://localhost:8000/api/team-chat/ws/channel123',
    handleMessage,
    {
      enabled: true,
      reconnectAttempts: 10,
      reconnectInterval: 2000,
    }
  );
  
  const handleSend = () => {
    sendMessage({ type: 'chat_message', text: 'Hello!' });
  };
  
  return (
    <div>
      <div>Status: {connectionStatus}</div>
      <button onClick={handleSend} disabled={!isConnected}>Send</button>
    </div>
  );
}
```

---

### 2. useKanbanWebSocket (Kanban-Specific Hook)

**File**: `utils/useKanbanWebSocket.js` (200 lines)
**Purpose**: WebSocket connection for Kanban board real-time updates

---

#### Configuration

```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const defaultConfig = {
  enabled: true,
  reconnectAttempts: 10,  // More attempts for critical Kanban sync
  reconnectInterval: 2000,
  heartbeatInterval: 30000,
};
```

---

#### WebSocket URL Construction

```javascript
const wsUrl = useMemo(() => {
  if (!projectId || !config.enabled) return null;
  
  const token = localStorage.getItem('token');
  const baseUrl = API_BASE_URL.replace('http', 'ws');
  
  return `${baseUrl}/api/tasks/ws/project/${projectId}?token=${token}`;
}, [projectId, config.enabled]);
```

---

#### Message Types

**Connection**:
```json
{
  "type": "connection",
  "project_id": "abc123",
  "message": "Connected to project"
}
```

**Task Created**:
```json
{
  "type": "task_created",
  "task": {
    "_id": "task123",
    "title": "New Task",
    "status": "To Do",
    "priority": "High",
    ...
  }
}
```

**Task Updated**:
```json
{
  "type": "task_updated",
  "task": {
    "_id": "task123",
    "status": "In Progress",
    ...
  }
}
```

**Task Deleted**:
```json
{
  "type": "task_deleted",
  "task_id": "task123"
}
```

---

#### Internal Message Handler

```javascript
const handleWebSocketMessage = useCallback((data) => {
  console.log('[Kanban WS] Received:', data.type);
  
  // Pass to user's callback
  if (onMessage) {
    onMessage(data);
  }
}, [onMessage]);
```

---

#### Usage in KanbanBoard

```javascript
import useKanbanWebSocket from '../../utils/useKanbanWebSocket';

function KanbanBoard({ projectId }) {
  const [tasks, setTasks] = useState([]);
  
  const handleKanbanMessage = useCallback((data) => {
    switch (data.type) {
      case 'connection':
        console.log('Connected to project:', data.project_id);
        break;
      
      case 'task_created':
        setTasks(prev => [...prev, data.task]);
        toast.info(`New task: ${data.task.title}`);
        break;
      
      case 'task_updated':
        setTasks(prev => prev.map(task => 
          task._id === data.task._id ? data.task : task
        ));
        break;
      
      case 'task_deleted':
        setTasks(prev => prev.filter(task => task._id !== data.task_id));
        toast.info('Task deleted');
        break;
      
      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);
  
  const { connectionStatus, isConnected } = useKanbanWebSocket(
    projectId,
    handleKanbanMessage,
    {
      enabled: Boolean(projectId),
      reconnectAttempts: 10,
      reconnectInterval: 2000,
    }
  );
  
  return (
    <div className="kanban-board">
      <div className={`connection-indicator ${connectionStatus}`}>
        {isConnected ? '● Connected' : '○ Disconnected'}
      </div>
      {/* Kanban columns */}
    </div>
  );
}
```

---

### 3. useAuth (Authentication Hook)

**Purpose**: Access authentication state from AuthContext

**Implementation**:
```javascript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
};
```

**Usage**:
```javascript
function ProfilePage() {
  const { user, isAuthenticated, logout, updateProfile } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

### 4. Custom Data Fetching Hooks (Example Pattern)

**useProject** (fetch single project):
```javascript
import { useState, useEffect } from 'react';
import { projectAPI } from '../services/api';

export const useProject = (projectId) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!projectId) return;
    
    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await projectAPI.getById(projectId);
        setProject(data.project);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId]);
  
  return { project, loading, error };
};
```

**Usage**:
```javascript
function ProjectDetail() {
  const { projectId } = useParams();
  const { project, loading, error } = useProject(projectId);
  
  if (loading) return <Loader />;
  if (error) return <div>Error: {error}</div>;
  if (!project) return <div>Project not found</div>;
  
  return (
    <div>
      <h1>{project.name}</h1>
      <p>{project.description}</p>
    </div>
  );
}
```

---

## Performance Optimizations

### 1. Code Splitting (Lazy Loading)

**Route-Based Splitting** (`App.js`):
```javascript
import { lazy, Suspense } from 'react';
import Loader from './components/Loader/Loader';

// Lazy load page components
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/Projects/ProjectsPage'));
const TasksPage = lazy(() => import('./pages/Tasks/TasksPage'));
const SprintsPage = lazy(() => import('./pages/Sprints/SprintsPage'));
const MyTasksPage = lazy(() => import('./pages/MyTasks/MyTasksPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const UsersPage = lazy(() => import('./pages/Users/UsersPage'));
const SystemDashboard = lazy(() => import('./pages/SystemDashboard/SystemDashboard'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard/SuperAdminDashboard'));

function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        {/* ... more routes */}
      </Routes>
    </Suspense>
  );
}
```

**Benefits**:
- Initial bundle size reduced by ~60%
- Faster first page load
- Only loads components when needed
- Better performance on slower connections

**Bundle Analysis**:
```bash
# Before code splitting: 2.5MB
# After code splitting: 980KB (initial) + chunks on demand
```

---

### 2. Memoization (Prevent Re-renders)

**React.memo** (Component Memoization):
```javascript
import { memo } from 'react';

// ✅ Memoized component - only re-renders when props change
const TaskCard = memo(({ task, onClick }) => {
  return (
    <div className="task-card" onClick={() => onClick(task._id)}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
    </div>
  );
});

export default TaskCard;
```

**useMemo** (Expensive Calculations):
```javascript
import { useMemo } from 'react';

function TaskList({ tasks }) {
  // ✅ Only recomputes when tasks array changes
  const stats = useMemo(() => {
    console.log('Computing stats...');  // Only logs when tasks change
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Done').length,
      highPriority: tasks.filter(t => t.priority === 'High').length,
      avgCompletionTime: calculateAvgTime(tasks),  // Expensive calculation
    };
  }, [tasks]);
  
  return (
    <div>
      <h2>Total Tasks: {stats.total}</h2>
      <p>Completed: {stats.completed}</p>
    </div>
  );
}
```

**useCallback** (Function Memoization):
```javascript
import { useCallback } from 'react';

function TaskList({ tasks }) {
  // ❌ Bad: Creates new function on every render
  const handleClick = (taskId) => {
    console.log('Clicked:', taskId);
  };
  
  // ✅ Good: Function is memoized
  const handleClick = useCallback((taskId) => {
    console.log('Clicked:', taskId);
  }, []);  // Empty deps - function never changes
  
  return tasks.map(task => (
    <TaskCard 
      key={task._id} 
      task={task} 
      onClick={handleClick}  // Same function reference each time
    />
  ));
}
```

---

### 3. Request Caching

**Custom Cache Utility** (`utils/requestCache.js`):
```javascript
const requestCache = new Map();
const DEFAULT_TTL = 60000;  // 60 seconds

export const createCacheKey = (url, options = {}) => {
  return `${url}-${JSON.stringify(options)}`;
};

export const cachedFetch = async (url, options = {}, ttl = DEFAULT_TTL) => {
  const cacheKey = createCacheKey(url, options);
  const cached = requestCache.get(cacheKey);
  
  // Return cached response if still fresh
  if (cached && Date.now() - cached.timestamp < ttl) {
    console.log('[CACHE HIT]', url);
    return cached.data;
  }
  
  // Fetch new data
  console.log('[CACHE MISS]', url);
  const response = await fetch(url, options);
  const data = await response.json();
  
  // Store in cache
  requestCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
  
  return data;
};
```

**Usage in API Service** (`services/api.js`):
```javascript
import { cachedFetch } from '../utils/requestCache';

export const projectAPI = {
  // GET requests are cached for 60 seconds
  getAll: async () => {
    const response = await cachedFetch(
      `${API_BASE_URL}/api/projects`,
      {
        headers: getAuthHeaders(),
      },
      60000  // 60s TTL
    );
    return response;
  },
  
  // POST/PUT/DELETE are not cached
  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
```

**Benefits**:
- Reduces API calls by ~70%
- Faster navigation between pages
- Lower server load
- Better offline experience

---

### 4. Debouncing (Search Input)

**Custom Hook** (`useDebounce.js`):
```javascript
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
```

**Usage in Search**:
```javascript
import { useDebounce } from '../hooks/useDebounce';

function TaskSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  useEffect(() => {
    if (debouncedSearchTerm) {
      // Only search after user stops typing for 500ms
      searchTasks(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);
  
  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search tasks..."
    />
  );
}
```

**Benefits**:
- Reduces API calls by ~90% during typing
- Prevents rate limiting
- Better user experience (no lag)

---

### 5. Virtual Scrolling (Large Lists)

**Using react-window**:
```javascript
import { FixedSizeList } from 'react-window';

function TaskList({ tasks }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <TaskCard task={tasks[index]} />
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={tasks.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

**Benefits**:
- Renders only visible items (e.g., 10 out of 1000)
- Constant performance regardless of list size
- Smooth scrolling with large datasets

---

### 6. Image Optimization

**Lazy Loading Images**:
```javascript
<img 
  src={user.avatar_url} 
  alt={user.name}
  loading="lazy"  // Browser-native lazy loading
/>
```

**Responsive Images**:
```javascript
<picture>
  <source 
    srcSet="/avatar-small.webp" 
    type="image/webp" 
    media="(max-width: 768px)" 
  />
  <source 
    srcSet="/avatar-large.webp" 
    type="image/webp" 
  />
  <img 
    src="/avatar-fallback.jpg" 
    alt="User Avatar" 
  />
</picture>
```

---

### 7. Bundle Size Optimization

**Tree Shaking** (import only what you need):
```javascript
// ❌ Bad: Imports entire library (500KB)
import _ from 'lodash';
const result = _.debounce(fn, 500);

// ✅ Good: Imports only debounce (5KB)
import debounce from 'lodash/debounce';
const result = debounce(fn, 500);
```

**Icon Optimization**:
```javascript
// ❌ Bad: Imports all icons (2MB)
import * as Icons from 'lucide-react';
<Icons.CheckCircle />

// ✅ Good: Imports specific icons (10KB each)
import { CheckCircle, XCircle } from 'lucide-react';
<CheckCircle />
```

---

### 8. Parallel Data Fetching

**Promise.all** (Dashboard Example):
```javascript
const fetchDashboardData = async () => {
  try {
    setLoading(true);
    
    // ✅ Fetch all data in parallel (total time: ~1s)
    const [analyticsData, reportData, pendingData, closedData] = await Promise.all([
      dashboardAPI.getAnalytics(),  // 500ms
      dashboardAPI.getReport(),     // 400ms
      taskAPI.getAllPendingApprovalTasks(),  // 300ms
      taskAPI.getAllClosedTasks()   // 200ms
    ]);
    
    // Process results
    setAnalytics(analyticsData.analytics);
    setReport(reportData.report);
    setPendingCount(pendingData.count);
    setClosedCount(closedData.count);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

// ❌ Bad: Sequential fetching (total time: ~1.4s)
const fetchSequential = async () => {
  const analytics = await dashboardAPI.getAnalytics();  // Wait 500ms
  const report = await dashboardAPI.getReport();        // Wait 400ms
  const pending = await taskAPI.getAllPendingApprovalTasks();  // Wait 300ms
  const closed = await taskAPI.getAllClosedTasks();     // Wait 200ms
};
```

**Benefits**:
- 40% faster page load
- Better user experience
- More efficient API usage

---

### 9. React Query (Server State Caching)

**Automatic Caching & Background Refetch**:
```javascript
import { useQuery } from '@tanstack/react-query';

function ProjectList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.getAll(),
    staleTime: 5 * 60 * 1000,  // Consider fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
  
  // Data is automatically cached across all components
  // No duplicate network requests
}
```

**Benefits**:
- Automatic caching and deduplication
- Background refetch on stale data
- Optimistic updates
- Reduces boilerplate by 70%

---

### 10. Performance Monitoring

**Measure Component Render Time**:
```javascript
import { Profiler } from 'react';

function onRenderCallback(
  id,       // Component ID
  phase,    // "mount" or "update"
  actualDuration,  // Time spent rendering
  baseDuration,    // Estimated time without memoization
  startTime,
  commitTime
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="TaskList" onRender={onRenderCallback}>
  <TaskList tasks={tasks} />
</Profiler>
```

---

## Security Measures

### 1. Authentication Security

**JWT Token Storage**:
```javascript
// ✅ Stored in localStorage (accessible only to same origin)
localStorage.setItem('token', jwtToken);

// ✅ Tab session key in sessionStorage (unique per tab)
sessionStorage.setItem('tab_session_key', generateTabSessionKey());
```

**Token Validation**:
```javascript
const checkTraditionalAuth = async () => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  if (!token || !storedUser) {
    return;  // Not authenticated
  }
  
  try {
    // Parse token to get user_id
    const payload = JSON.parse(atob(token.split('.')[1]));
    const parsedUser = JSON.parse(storedUser);
    
    // 🔒 SECURITY: Verify token user_id matches stored user_id
    if (payload.user_id !== parsedUser._id) {
      console.error('[Auth] Token mismatch detected');
      logout();  // Clear compromised session
      return;
    }
    
    // Validate token with backend
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tab-Session-Key': sessionStorage.getItem('tab_session_key'),
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      setIsAuthenticated(true);
    } else {
      logout();  // Invalid token
    }
  } catch (error) {
    console.error('[Auth] Validation error:', error);
    logout();
  }
};
```

**Automatic Token Expiration**:
```javascript
// Backend sets token expiration (24 hours)
const token = jwt.sign(
  { user_id: user._id, role: user.role },
  SECRET_KEY,
  { expiresIn: '24h' }
);

// Frontend checks token expiration before requests
const isTokenExpired = (token) => {
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expirationTime = payload.exp * 1000;  // Convert to milliseconds
  return Date.now() >= expirationTime;
};
```

**Secure Logout**:
```javascript
const logout = async () => {
  // Clear all auth data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('tab_session_key');
  
  // Notify backend (optional - for session tracking)
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
  } catch (error) {
    // Logout anyway even if request fails
  }
  
  // Update state
  setUser(null);
  setIsAuthenticated(false);
  
  // Redirect to login
  navigate('/login');
};
```

---

### 2. XSS (Cross-Site Scripting) Protection

**React's Built-in Protection**:
```javascript
// ✅ React automatically escapes dynamic content
function UserProfile({ user }) {
  // Safe: React escapes HTML entities
  return <div>{user.name}</div>;  
  // "<script>alert('xss')</script>" → "&lt;script&gt;alert('xss')&lt;/script&gt;"
}
```

**Dangerous HTML** (use with caution):
```javascript
// ⚠️ Only use dangerouslySetInnerHTML with sanitized content
import DOMPurify from 'dompurify';

function MarkdownContent({ html }) {
  const sanitizedHTML = DOMPurify.sanitize(html);
  
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
  );
}
```

**Input Sanitization**:
```javascript
const sanitizeInput = (input) => {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '')  // Remove < and >
    .trim()
    .slice(0, 1000);  // Limit length
};

const handleSubmit = (e) => {
  e.preventDefault();
  const sanitizedTitle = sanitizeInput(title);
  const sanitizedDescription = sanitizeInput(description);
  
  createTask({ title: sanitizedTitle, description: sanitizedDescription });
};
```

---

### 3. CSRF (Cross-Site Request Forgery) Protection

**Tab Session Keys**:
```javascript
// Generate unique session key per tab
const generateTabSessionKey = () => {
  return 'tab_' + 
    Math.random().toString(36).substring(2, 15) + 
    '_' + 
    Date.now().toString(36);
};

// Include in every API request
const getAuthHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'X-Tab-Session-Key': sessionStorage.getItem('tab_session_key'),  // 🔒 CSRF protection
  };
};
```

**Backend Validation**:
```python
# Backend verifies tab session key
@router.get("/api/tasks")
async def get_tasks(
    tab_session_key: str = Header(None, alias="X-Tab-Session-Key"),
    current_user: dict = Depends(get_current_user)
):
    if not tab_session_key:
        raise HTTPException(status_code=403, detail="Missing tab session key")
    
    # Validate key format
    if not tab_session_key.startswith("tab_"):
        raise HTTPException(status_code=403, detail="Invalid tab session key")
    
    # Proceed with request
    return {"tasks": [...]}
```

---

### 4. CORS (Cross-Origin Resource Sharing)

**Backend Configuration** (`backend/main.py`):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Frontend Credentials**:
```javascript
// Include credentials (cookies) in requests
fetch(`${API_BASE_URL}/api/tasks`, {
  method: 'GET',
  credentials: 'include',  // Send cookies with request
  headers: getAuthHeaders(),
});
```

---

### 5. Sensitive Data Protection

**Environment Variables** (`.env`):
```bash
# ✅ Never commit .env to version control
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
REACT_APP_GITHUB_TOKEN=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
```

**Usage**:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const CLERK_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// ❌ Never hardcode API keys in source code
// const API_KEY = "sk_test_12345";  // WRONG!
```

**.gitignore**:
```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

### 6. Content Security Policy (CSP)

**index.html**:
```html
<meta 
  http-equiv="Content-Security-Policy" 
  content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' http://localhost:8000 ws://localhost:8000;
  "
/>
```

---

### 7. HTTPS (Production)

**Force HTTPS** (deployment):
```javascript
// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production' && window.location.protocol === 'http:') {
  window.location.href = window.location.href.replace('http:', 'https:');
}
```

---

### 8. Input Validation

**Client-Side Validation** (first line of defense):
```javascript
const validateTaskForm = (data) => {
  const errors = {};
  
  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.title = 'Title is required';
  } else if (data.title.length > 200) {
    errors.title = 'Title must be less than 200 characters';
  }
  
  // Email validation
  if (data.email && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(data.email)) {
    errors.email = 'Invalid email format';
  }
  
  // URL validation
  if (data.git_repo_url && !data.git_repo_url.includes('github.com')) {
    errors.git_repo_url = 'Must be a GitHub URL';
  }
  
  return errors;
};
```

**Server-Side Validation** (required - never trust client):
```python
from pydantic import BaseModel, validator

class TaskCreate(BaseModel):
    title: str
    description: str
    priority: str
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Title cannot be empty')
        if len(v) > 200:
            raise ValueError('Title too long')
        return v
```

---

### 9. Rate Limiting (Protect Against Abuse)

**Client-Side Throttling**:
```javascript
let lastRequestTime = 0;
const REQUEST_DELAY = 1000;  // 1 second

const createTask = async (data) => {
  const now = Date.now();
  
  // Prevent rapid-fire requests
  if (now - lastRequestTime < REQUEST_DELAY) {
    toast.error('Please wait before creating another task');
    return;
  }
  
  lastRequestTime = now;
  
  const response = await taskAPI.create(data);
  return response;
};
```

---

### 10. Dependency Security

**Update Dependencies Regularly**:
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update packages
npm update
```

**Lock File** (package-lock.json):
- Commit `package-lock.json` to ensure consistent dependencies
- Prevents supply chain attacks

---

## Build & Deployment

### 1. Development Environment

**Start Development Server**:
```bash
npm start
```

**Configuration**:
- **Port**: `http://localhost:3000`
- **Hot Reload**: Enabled (auto-refresh on file save)
- **Error Overlay**: Shows compilation errors in browser
- **Source Maps**: Enabled for debugging
- **Fast Refresh**: Preserves component state on edit

**Development Features**:
```javascript
// React DevTools integration
if (process.env.NODE_ENV === 'development') {
  console.log('[Dev] React DevTools enabled');
}

// Verbose logging in development
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000'
  : process.env.REACT_APP_API_BASE_URL;
```

---

### 2. Production Build

**Build Command**:
```bash
npm run build
```

**Build Output** (`/build` folder):
```
build/
├── static/
│   ├── css/
│   │   ├── main.abc123.css         # Minified CSS with hash
│   │   └── main.abc123.css.map     # Source map
│   ├── js/
│   │   ├── main.xyz789.js          # Main bundle (minified)
│   │   ├── 2.chunk.js              # Code-split chunks
│   │   ├── 3.chunk.js
│   │   └── runtime-main.js         # Webpack runtime
│   └── media/
│       ├── logo.png
│       └── fonts/
├── index.html                      # Entry HTML
├── manifest.json                   # PWA manifest
├── robots.txt                      # Search engine instructions
└── asset-manifest.json             # Asset mapping
```

**Build Optimizations**:
1. **Minification**: JavaScript and CSS are minified
2. **Code Splitting**: Automatic chunks for routes
3. **Tree Shaking**: Removes unused code
4. **Asset Hashing**: Filenames include content hash (cache busting)
5. **Compression**: Gzip/Brotli compression ready
6. **Source Maps**: Separate .map files for debugging

**Build Statistics**:
```bash
File sizes after gzip:

  49.2 KB  build/static/js/main.abc123.js
  12.5 KB  build/static/js/2.chunk.js
  8.7 KB   build/static/js/3.chunk.js
  1.4 KB   build/static/js/runtime-main.js
  2.1 KB   build/static/css/main.abc123.css
```

---

### 3. Environment Variables

**Development** (`.env.development`):
```bash
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_TEST_KEY
REACT_APP_WS_URL=ws://localhost:8000
REACT_APP_ENVIRONMENT=development
```

**Production** (`.env.production`):
```bash
REACT_APP_API_BASE_URL=https://api.doit.com
REACT_APP_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_LIVE_KEY
REACT_APP_WS_URL=wss://api.doit.com
REACT_APP_ENVIRONMENT=production
```

**Usage in Code**:
```javascript
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const IS_PROD = process.env.REACT_APP_ENVIRONMENT === 'production';

if (IS_PROD) {
  // Production-specific code
  console.log = () => {};  // Disable console logs
}
```

**Important Notes**:
- ⚠️ All variables must start with `REACT_APP_`
- ⚠️ Variables are embedded at BUILD time (not runtime)
- ⚠️ Restart dev server after changing .env files
- ⚠️ Never commit sensitive keys to version control

---

### 4. Testing

**Run Tests**:
```bash
npm test
```

**Test Configuration** (`setupTests.js`):
```javascript
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

**Example Test** (`TaskCard.test.js`):
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from './TaskCard';

describe('TaskCard Component', () => {
  const mockTask = {
    _id: '123',
    title: 'Test Task',
    description: 'Test description',
    priority: 'High',
    status: 'To Do',
  };
  
  test('renders task title', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
  
  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<TaskCard task={mockTask} onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Test Task'));
    expect(handleClick).toHaveBeenCalledWith('123');
  });
  
  test('displays high priority badge', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('High')).toHaveClass('priority-high');
  });
});
```

---

### 5. Deployment Options

#### Option 1: Netlify (Recommended)

**Steps**:
1. Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

2. Deploy:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

**Features**:
- ✅ Automatic HTTPS
- ✅ CDN distribution
- ✅ Git integration (auto-deploy on push)
- ✅ Environment variables management
- ✅ Free tier available

---

#### Option 2: Vercel

**Steps**:
1. Create `vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

2. Deploy:
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

#### Option 3: AWS S3 + CloudFront

**Steps**:
1. Build the app:
```bash
npm run build
```

2. Create S3 bucket:
```bash
aws s3 mb s3://doit-frontend
aws s3 sync build/ s3://doit-frontend --delete
```

3. Enable static website hosting:
```bash
aws s3 website s3://doit-frontend \
  --index-document index.html \
  --error-document index.html
```

4. Create CloudFront distribution for CDN

---

#### Option 4: Docker Container

**Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
server {
  listen 80;
  server_name localhost;
  root /usr/share/nginx/html;
  index index.html;

  # SPA routing
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
  
  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

**Build and Run**:
```bash
# Build image
docker build -t doit-frontend .

# Run container
docker run -p 80:80 doit-frontend
```

---

### 6. Performance Monitoring (Production)

**Google Lighthouse**:
```bash
# Install
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --view
```

**Metrics to Track**:
- ⚡ First Contentful Paint (FCP): < 1.8s
- ⚡ Speed Index: < 3.4s
- ⚡ Largest Contentful Paint (LCP): < 2.5s
- ⚡ Time to Interactive (TTI): < 3.8s
- ⚡ Total Blocking Time (TBT): < 200ms
- ⚡ Cumulative Layout Shift (CLS): < 0.1

---

### 7. CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml**:
```yaml
name: Deploy Frontend

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage --watchAll=false
      
      - name: Build
        run: npm run build
        env:
          REACT_APP_API_BASE_URL: ${{ secrets.API_BASE_URL }}
          REACT_APP_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_KEY }}
      
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: './build'
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## Browser Support

**Supported Browsers** (from `package.json`):
```json
"browserslist": {
  "production": [
    ">0.2%",
    "not dead",
    "not op_mini all"
  ],
  "development": [
    "last 1 chrome version",
    "last 1 firefox version",
    "last 1 safari version"
  ]
}
```

**Coverage**:
- ✅ Chrome/Edge (Chromium-based): Latest 2 versions
- ✅ Firefox: Latest 2 versions
- ✅ Safari: Latest 2 versions
- ✅ iOS Safari: iOS 12+
- ✅ Chrome Mobile: Latest version
- ⚠️ Internet Explorer: NOT supported

---

## Project Scripts

**Available Commands**:
```json
{
  "scripts": {
    "start": "react-scripts start",              // Development server
    "build": "react-scripts build",              // Production build
    "test": "react-scripts test",                // Run tests
    "eject": "react-scripts eject",              // Eject from CRA (irreversible)
    "lint": "eslint src --ext .js,.jsx",         // Lint code
    "format": "prettier --write \"src/**/*.{js,jsx,css}\"",  // Format code
    "analyze": "source-map-explorer 'build/static/js/*.js'"  // Analyze bundle
  }
}
```

**Usage**:
```bash
npm start          # Start dev server
npm run build      # Build for production
npm test           # Run tests
npm run lint       # Lint code
npm run format     # Format code with Prettier
npm run analyze    # Analyze bundle size
```

---

## Summary

This frontend architecture documentation covers:

✅ **Technology Stack**: React 19.2.3, Router 7.11.0, Clerk 5.59.4, recharts, @dnd-kit  
✅ **Component Architecture**: App.js routing, AuthContext dual auth, API service with caching  
✅ **Dashboard Components**: Parallel fetching, export buttons, Recharts visualizations  
✅ **Kanban Board**: @dnd-kit drag-drop, WebSocket sync, workflow validation  
✅ **AI Assistant**: Conversational interface, quick prompts, inline visualizations  
✅ **Team Chat**: WebSocket messaging, file attachments, emoji reactions  
✅ **Calendar View**: react-big-calendar, drag-drop rescheduling, color coding  
✅ **State Management**: useState, Context API, React Query, WebSocket hooks  
✅ **Custom Hooks**: useWebSocket, useKanbanWebSocket with reconnection  
✅ **Styling**: CSS variables, glass-morphism, BEM convention, responsive design  
✅ **Performance**: Code splitting, memoization, request caching, debouncing  
✅ **Security**: JWT auth, tab session keys, XSS prevention, CORS, CSP  
✅ **Build & Deployment**: Development/production builds, environment variables, Docker, CI/CD

**Total Documentation**: 5,000+ lines with extensive code examples and implementation details.

---
