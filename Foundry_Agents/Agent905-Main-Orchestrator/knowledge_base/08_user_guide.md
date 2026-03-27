# DOIT Project - Comprehensive User Guide

## Table of Contents
1. [Getting Started & Authentication](#1-getting-started--authentication)
2. [Dashboard & Navigation](#2-dashboard--navigation)
3. [Projects Management](#3-projects-management)
4. [Tasks Management](#4-tasks-management)
5. [Kanban Board & Real-Time Updates](#5-kanban-board--real-time-updates)
6. [Sprint Planning](#6-sprint-planning)
7. [Team Chat & Collaboration](#7-team-chat--collaboration)
8. [AI Assistant Integration](#8-ai-assistant-integration)
9. [Data Visualization & Analytics](#9-data-visualization--analytics)
10. [Profile Management](#10-profile-management)
11. [Role-Based Access Control](#11-role-based-access-control)
12. [Advanced Workflows](#12-advanced-workflows)
13. [Tips, Shortcuts & Troubleshooting](#13-tips-shortcuts--troubleshooting)

---

## 1. Getting Started & Authentication

### 1.1 Registration & First-Time Setup

#### **Traditional Registration (Email/Password)**

**Step 1: Access Registration Page**
```
URL: http://localhost:3000/register
Production: https://your-domain.com/register
```

**Step 2: Complete Registration Form**
The registration form validates your input in real-time:

```javascript
// Frontend validation (AuthContext.js)
Required Fields:
- Name: 2-50 characters, letters/spaces/hyphens only
- Email: Valid email format (user@domain.com)
- Password: Minimum 8 characters
- Confirm Password: Must match password field

// Backend validation (auth_controller.py - register function)
Enhanced Password Requirements:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)
```

**Example Valid Registration:**
```json
{
  "name": "John Doe",
  "email": "john.doe@company.com",
  "password": "SecurePass123!",
  "confirm_password": "SecurePass123!",
  "role": "member"  // Auto-assigned, cannot be changed during signup
}
```

**Backend Processing Flow:**
```python
# From auth_controller.py (lines 120-200)
def register(body, ip_address=None, user_agent=None):
    1. Validate name format (validate_username)
    2. Validate email format (validate_email)
    3. Check password strength (validate_password)
    4. Check if email already exists
    5. Hash password using bcrypt
    6. Create user with role="member"
    7. Generate JWT token + tab_session_key
    8. Return token and user data
```

**Response Structure:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_id": "token_abc123_20260212",
  "tab_session_key": "tab_xyz789_20260212_153045",
  "user": {
    "id": "65f4b2c3a1b2c3d4e5f6g7h8",
    "name": "John Doe",
    "email": "john.doe@company.com",
    "role": "member"
  }
}
```

---

#### **Clerk SSO Authentication (Single Sign-On)**

DOIT supports Clerk authentication for seamless SSO integration with:
- Google
- GitHub
- Microsoft
- Other OAuth providers

**Implementation (AuthContext.js - lines 20-60):**
```javascript
// Sync Clerk user with backend database
useEffect(() => {
  const syncClerkUser = async () => {
    if (!isLoaded) return;

    if (isSignedIn && clerkUser) {
      try {
        // Get Clerk JWT token
        const clerkToken = await getToken();
        
        // Send to backend to create/sync user
        const response = await authAPI.clerkSync(
          clerkToken,
          clerkUser.primaryEmailAddress?.emailAddress,
          clerkUser.fullName || clerkUser.firstName || "User",
          clerkUser.id
        );

        const { token, user: userData, tab_session_key } = response;

        // Store our app's JWT token
        localStorage.setItem("token", token);
        localStorage.setItem("user_id", userData.id || userData._id);

        if (tab_session_key) {
          sessionStorage.setItem("tab_session_key", tab_session_key);
        }

        setUser(userData);
      } catch (error) {
        console.error("[AUTH] Clerk sync failed:", error);
      }
    }
  };

  syncClerkUser();
}, [isSignedIn, clerkUser, isLoaded, getToken]);
```

**Backend Clerk Sync (auth_controller.py - clerk_sync function):**
```python
def clerk_sync(body, ip_address=None, user_agent=None):
    """
    Sync Clerk user with our backend database
    Creates or updates user based on Clerk authentication
    """
    1. Verify Clerk JWT token
    2. Check if user exists by email or clerk_user_id
    3. If exists: Update clerk_user_id
    4. If new: Create user with role="member"
    5. Generate our app's JWT token
    6. Return token + user data
```

---

### 1.2 Login & Session Management

#### **Traditional Login**

**Login Form Validation:**
```javascript
// Frontend validation
Required:
- Email: Valid format
- Password: Not empty

// Backend authentication
Process:
1. Find user by email
2. Verify password using bcrypt
3. Check if user is active
4. Generate JWT token (includes user_id, role, token_version)
5. Create tab_session_key for this browser tab
6. Track login session (IP address, user agent, timestamp)
```

**JWT Token Structure:**
```json
{
  "user_id": "65f4b2c3a1b2c3d4e5f6g7h8",
  "role": "member",
  "token_version": 1,
  "exp": 1708012345,
  "iat": 1707925945
}
```

**Token Storage:**
```javascript
// localStorage (persistent across tabs/sessions)
localStorage.setItem("token", jwt_token);
localStorage.setItem("user_id", user_id);

// sessionStorage (unique per browser tab)
sessionStorage.setItem("tab_session_key", tab_session_key);
```

---

#### **Tab Session Management**

DOIT implements unique tab-level sessions for security:

**Why Tab Sessions?**
- Prevent token reuse across multiple devices
- Track individual browser tab activity
- Enable per-tab logout without affecting other tabs
- Detect and prevent session hijacking

**Tab Session Flow (AuthContext.js - lines 60-130):**
```javascript
// Check traditional email/password authentication
const checkTraditionalAuth = async () => {
  const token = localStorage.getItem("token");
  
  if (token) {
    // Validate token payload matches stored user_id
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const tokenUserId = tokenPayload.user_id;
      const storedUserId = localStorage.getItem("user_id");

      if (storedUserId && tokenUserId !== storedUserId) {
        // Security Alert: Token mismatch
        console.error("🚨 SECURITY ALERT: TOKEN MISMATCH!");
        localStorage.clear();
        setUser(null);
        return;
      }
    } catch (error) {
      console.error("[AUTH] Error parsing token:", error);
      localStorage.clear();
      return;
    }

    const tabSessionKey = sessionStorage.getItem("tab_session_key");

    if (!tabSessionKey) {
      // No tab session - create new one
      console.warn("[AUTH] No tab session key found - creating new tab session");
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh-session`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        
        const newTabKey = data.tab_session_key;
        if (newTabKey) {
          sessionStorage.setItem("tab_session_key", newTabKey);
        }
        
        const userData = await authAPI.getProfile();
        setUser(userData);
        localStorage.setItem("user_id", userData.id || userData._id);
      } catch (error) {
        console.error("[AUTH] Session creation failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user_id");
        setUser(null);
      }
      return;
    }

    // Validate token with existing tab session
    try {
      const userData = await authAPI.getProfile();
      setUser(userData);
      localStorage.setItem("user_id", userData.id || userData._id);
    } catch (error) {
      console.error("[AUTH] Token validation failed:", error);
      localStorage.removeItem("token");
      localStorage.removeItem("user_id");
      setUser(null);
    }
  } else {
    // Not signed in
    setUser(null);
  }
};
```

---

### 1.3 Security Features

#### **Password Security**
- **Hashing**: bcrypt with 12 rounds
- **Validation**: Real-time strength checking
- **Requirements**: 8+ chars, uppercase, lowercase, number, special char

#### **Token Security**
- **JWT**: HS256 algorithm, 24-hour expiration
- **Token Version**: Incremented on password change (invalidates old tokens)
- **Blacklisting**: Revoked tokens stored in database
- **Tab Sessions**: Per-tab tracking prevents token reuse

#### **Session Tracking**
```python
# Backend tracks all active sessions
Sessions tracked per user:
- Token ID (unique identifier)
- Tab Session Key (unique per browser tab)
- IP Address (for anomaly detection)
- User Agent (browser/device information)
- Created At (timestamp)
- Last Activity (timestamp)
```

#### **Logout Security**
```javascript
// Client-side cleanup
logout():
  1. Call /api/auth/logout endpoint (blacklists token)
  2. Clear localStorage (token, user_id)
  3. Clear sessionStorage (tab_session_key)
  4. Redirect to login page
  5. Set user state to null
```

---

## 2. Dashboard & Navigation

### 2.1 Dashboard Overview

The Dashboard is your central hub for monitoring projects, tasks, and team activity.

**Key Features:**
- Real-time analytics and charts
- Task status distribution
- Project progress tracking
- Pending approvals (for managers/admins)
- Closed tasks summary
- Export reports (PDF, Excel, CSV)

**Dashboard Loading Strategy (DashboardPage.js - lines 230-260):**
```javascript
const fetchDashboardData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    
    // ⚡ PERFORMANCE: Fetch ALL data in parallel to reduce loading time
    const [analyticsData, reportData, pendingData, closedData] = await Promise.all([
      dashboardAPI.getAnalytics(),      // General analytics
      dashboardAPI.getReport(),          // Detailed reports
      taskAPI.getAllPendingApprovalTasks(), // Pending approvals
      taskAPI.getAllClosedTasks()        // Closed tasks
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
    
    // Set counts immediately without separate API call
    setPendingCount(pendingData.count || 0);
    setClosedCount(closedData.count || 0);
  } catch (err) {
    console.error("Failed to load dashboard:", err);
    setError(err.message || "Failed to load dashboard data");
  } finally {
    setLoading(false);
  }
}, []);
```

**Why Parallel Loading?**
- Reduces total load time from ~4 seconds to ~1 second
- Improves user experience
- Prevents sequential API call delays
- All data ready before rendering

---

### 2.2 Navigation Components

#### **Header Navigation Bar**

Located at the top of every page:

```
┌─────────────────────────────────────────────────────────────────┐
│ [DOIT Logo] [Theme Toggle] [DOIT-AI] [Analytics] [Profile] [⚡] │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
1. **DOIT Logo** (left): Click to return to dashboard
2. **Theme Toggle** (🌙/☀️): Switch between dark/light mode
3. **DOIT-AI Button** (purple): Open AI Assistant sidebar
4. **DOIT Analytics Button** (blue): Open data visualization page
5. **Profile Icon/Avatar**: View profile, settings, logout
6. **Logout Icon** (⚡): Quick logout button

#### **Sidebar Menu**

Located on the left side:

```
┌─────────────────┐
│ 📊 Dashboard     │
│ 📁 Projects      │
│ ✅ Tasks         │
│ 👤 My Tasks      │
│ 🏃 Sprints       │
│ 📋 Kanban        │
│ 💬 Team Chat     │
│ 👨 Profile       │
│                  │
│ [Role-Specific]  │
│ 👥 Users         │ (Admin only)
│ 🚀 System        │ (Super Admin)
└─────────────────┘
```

**Menu Items:**
- **Dashboard** (`/dashboard`): Overview and analytics
- **Projects** (`/projects`): All projects you're part of
- **Tasks** (`/tasks`): All tasks across all projects
- **My Tasks** (`/my-tasks`): Tasks assigned to you
- **Sprints** (`/projects/:id/sprints`): Sprint planning
- **Kanban** (`/projects/:id/kanban`): Visual task board
- **Team Chat** (`/team-chat`): Communication channels
- **Profile** (`/profile`): Your profile settings

---

### 2.3 Dashboard Widgets

#### **Analytics Cards**

Four primary statistic cards at the top:

```javascript
// Card Types (from DashboardPage.js)
1. Total Tasks:
   - Icon: 📊
   - Color: Purple gradient
   - Shows: Total task count across all projects
   
2. Owned Projects:
   - Icon: 🏆
   - Color: Pink gradient
   - Shows: Projects you created
   
3. Member Projects:
   - Icon: 👥
   - Color: Blue gradient
   - Shows: Projects you're assigned to
   
4. Active Projects:
   - Icon: ⚡
   - Color: Green gradient
   - Shows: Currently active projects
```

**Example Card Structure:**
```jsx
<div className="project-stat-card project-stat-card-total">
  <div className="pstat-icon pstat-icon-purple">
    📊
  </div>
  <div className="pstat-content">
    <div className="pstat-value">42</div>
    <div className="pstat-label">Total Tasks</div>
  </div>
</div>
```

---

#### **Interactive Action Cards**

**Pending Approval Tasks:**
```javascript
// Shows tasks waiting for approval (Testing → Done)
handleShowPendingTasks = () => {
  1. Open modal with pending tasks list
  2. Show task details (title, project, assignee, created date)
  3. Provide "Approve & Close" button
  4. Update counts optimistically after approval
}

// Approval flow
handleApproveTask = async (taskId) => {
  1. Confirm approval with user
  2. Call taskAPI.approveTask(taskId)
  3. Update local counts (pending -1, closed +1)
  4. Refresh pending tasks list
  5. Show success notification
}
```

**Closed Tasks Summary:**
```javascript
// Shows recently completed tasks
handleShowClosedTasks = () => {
  1. Open modal with closed tasks
  2. Display completion date
  3. Show task metadata
  4. Allow reopening if needed
}
```

---

#### **Charts & Visualizations**

DOIT includes 4 main chart components:

**1. Task Status Chart** (TaskStatusChart.js)
```javascript
// Pie chart showing task distribution
Statuses Tracked:
- To Do (gray)
- In Progress (blue)
- Dev Complete (purple)
- Testing (yellow)
- Done (green)

Technology: Recharts library
Chart Type: PieChart with custom legend
Responsive: Yes (adjusts to container width)
```

**2. Task Priority Chart** (TaskPriorityChart.js)
```javascript
// Bar chart showing priority breakdown
Priorities:
- Low (green)
- Medium (yellow)
- High (orange)
- Critical (red)

Technology: Recharts BarChart
Features: Hover tooltips, gradient bars
```

**3. Project Progress Chart** (ProjectProgressChart.js)
```javascript
// Line chart showing project completion over time
Data Points:
- Total tasks per project
- Completed tasks per project
- Completion percentage
- Timeline (last 30 days)

Technology: Recharts LineChart
Features: Multi-line comparison, date axis
```

**4. Task Stats Card** (TaskStatsCard.js)
```javascript
// Summary card with key metrics
Metrics Displayed:
- Total tasks
- Completed tasks
- Completion rate (%)
- Average completion time

Design: Card with icon, value, label, trend indicator
```

---

### 2.4 Export Features

**Export Button Component (DashboardPage.js - lines 28-200):**

```javascript
// Multi-format export dropdown
ExportButtons Component Features:
- Dropdown menu with 3 options
- PDF, Excel, CSV formats
- Custom styling with gradients
- Loading state handling
- Hover animations

Export Options:
1. PDF: exportToPDF(analytics, userName)
2. Excel: exportToExcel(analytics, report, userName)
3. CSV: exportToCSV(analytics, userName)
```

**PDF Export (exportUtils.js):**
```javascript
export const exportToPDF = (analytics, userName) => {
  Features:
  - Company logo/header
  - Generated date and time
  - User name watermark
  - Task statistics table
  - Project breakdown
  - Status distribution
  - Priority breakdown
  - Page numbers
  - Professional formatting
  
  Libraries: jsPDF, jsPDF-AutoTable
  Filename: DOIT_Dashboard_Report_YYYYMMDD_HHMMSS.pdf
}
```

**Excel Export:**
```javascript
export const exportToExcel = (analytics, report, userName) => {
  Features:
  - Multiple sheets (Summary, Tasks, Projects, Analytics)
  - Cell formatting and colors
  - Headers with bold styling
  - Auto-width columns
  - Freeze panes on headers
  - Data validation
  
  Libraries: xlsx (SheetJS)
  Filename: DOIT_Dashboard_Report_YYYYMMDD_HHMMSS.xlsx
}
```

**CSV Export:**
```javascript
export const exportToCSV = (analytics, userName) => {
  Features:
  - Simplified data format
  - Compatible with Excel/Google Sheets
  - UTF-8 encoding
  - Comma-separated values
  - Header row included
  
  Filename: DOIT_Dashboard_Data_YYYYMMDD_HHMMSS.csv
}
```

---

---

## 3. Projects Management

### 3.1 Project Overview

Projects are the top-level containers for organizing work in DOIT. Each project has:
- **Owner**: Creator with full control
- **Members**: Team members with access
- **Tasks**: Work items within the project
- **Sprints**: Time-boxed development cycles
- **Kanban Board**: Visual workflow management
- **Chat Channel**: Dedicated communication space

---

### 3.2 Creating a Project

**Access Requirements:**
- Role: Admin or Super Admin only
- Members and Viewers **cannot** create projects

**Create Project Flow (ProjectsPage.js - lines 40-60):**

```javascript
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
```

**Project Form Fields (ProjectForm.js):**

```javascript
Required Fields:
1. Project Name *
   - Minimum 3 characters
   - Maximum 100 characters
   - Unique within organization

2. Description
   - Optional
   - Maximum 500 characters
   - Supports markdown formatting

3. Start Date *
   - Date picker
   - Cannot be in the past
   - Automatically defaults to today

4. End Date *
   - Must be after start date
   - Validates date range

5. Priority *
   - Options: Low, Medium, High, Critical
   - Dropdown selection
   - Default: Medium

6. Team Members
   - Multi-select dropdown
   - Shows all available users
   - Can add/remove members
   - Owner automatically added
```

**Example Project Creation API Request:**
```json
POST /api/projects
Authorization: Bearer <jwt_token>
X-Tab-Session-Key: <tab_session_key>

{
  "name": "Mobile App Redesign",
  "description": "Complete overhaul of mobile UI/UX",
  "start_date": "2026-02-15",
  "end_date": "2026-05-30",
  "priority": "High",
  "members": [
    "65f4b2c3a1b2c3d4e5f6g7h8",
    "75f4b2c3a1b2c3d4e5f6g7h9"
  ]
}
```

**Backend Validation (project_controller.py):**
```python
def create_project(body_str, user_id):
    Validations:
    1. Check user is logged in
    2. Check user role (admin or super-admin only)
    3. Validate project name (3-100 chars)
    4. Validate date range (end > start)
    5. Validate priority value
    6. Verify all member IDs exist
    7. Automatically add creator as owner
    8. Create chat channel for project
    
    Response:
    - 201 Created: Success with project data
    - 400 Bad Request: Validation error
    - 401 Unauthorized: Not logged in
    - 403 Forbidden: Insufficient role
```

---

### 3.3 Viewing Projects

**Projects Page Layout (ProjectsPage.js):**

```
┌─────────────────────────────────────────────────────────────┐
│ [Background Gradient]                                        │
│                                                              │
│  📁 My Projects                             [Total: 5]      │
│  Projects you own and projects you're a member of           │
│                                              [+ New Project] │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Project 1   │  │  Project 2   │  │  Project 3   │     │
│  │  📊 Progress │  │  📊 Progress │  │  📊 Progress │     │
│  │  👥 Members  │  │  👥 Members  │  │  👥 Members  │     │
│  │  [View]      │  │  [View]      │  │  [View]      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

**Project Card Component (ProjectCard.js):**

```javascript
Each card displays:
1. Project Icon (based on priority)
   - 🔥 Critical: Red flame
   - ⚡ High: Orange lightning
   - 📊 Medium: Blue chart
   - 📁 Low: Gray folder

2. Project Name
   - Truncated if too long
   - Tooltip shows full name

3. Description
   - First 100 characters
   - "Read more" link if truncated

4. Progress Bar
   - Visual completion percentage
   - Color changes based on progress
   - Green (80-100%), Yellow (50-79%), Red (<50%)

5. Team Members
   - Avatar icons (max 5 visible)
   - "+X more" badge if > 5 members
   - Hover shows member names

6. Statistics
   - Total tasks
   - Completed tasks
   - Active sprints
   - Days remaining

7. Actions
   - [View Details] button
   - [Edit] button (owner only)
   - [Delete] button (owner only)
```

**Project Card Example:**
```jsx
<div className="project-card">
  <div className="card-header">
    <div className="project-icon">🔥</div>
    <h3>Mobile App Redesign</h3>
    <span className="priority-badge badge-high">High Priority</span>
  </div>
  
  <p className="project-description">
    Complete overhaul of mobile UI/UX with focus on...
  </p>
  
  <div className="progress-section">
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: '65%' }}></div>
    </div>
    <span className="progress-text">65% Complete</span>
  </div>
  
  <div className="project-stats">
    <div className="stat">
      <FiCheckCircle /> 26/40 Tasks
    </div>
    <div className="stat">
      <FiUsers /> 8 Members
    </div>
    <div className="stat">
      <FiCalendar /> 45 days left
    </div>
  </div>
  
  <div className="card-actions">
    <button onClick={handleView}>View Details</button>
    <button onClick={handleEdit}>Edit</button>
  </div>
</div>
```

---

### 3.4 Project Details View

When clicking "View Details" on a project card:

**Sections Displayed:**

**1. Project Header**
```javascript
Displays:
- Project name
- Owner information
- Created date
- Priority badge
- Status indicator
- Quick actions (Edit, Delete if owner)
```

**2. Project Metrics**
```javascript
Cards showing:
- Total Tasks: Count of all tasks
- Completed: Tasks with status "Done"
- In Progress: Active development
- Testing: QA phase
- To Do: Backlog items
```

**3. Team Members Section**
```javascript
Shows:
- Member avatars with names
- Role badges (Owner, Admin, Member)
- Email addresses (on hover)
- [Add Members] button (owner only)
- [Remove] action (owner only)

Member Management:
- Owner can add/remove members
- Admins can add members (not remove)
- Members can view only
```

**4. Recent Activity**
```javascript
Timeline of:
- Task creations
- Status changes
- Sprint updates
- Member additions/removals
- Project edits

Format:
"[User] [Action] [Item] [Time Ago]"
Example: "John Doe created task UI-123 2 hours ago"
```

**5. Tasks Overview**
```javascript
Quick view of tasks:
- Filterable by status, priority, assignee
- Sortable by date, priority, name
- Click to view task details
- [Create Task] button
```

**6. Sprints Summary**
```javascript
Shows:
- Active sprint (if any)
- Sprint progress
- Burndown chart
- [View All Sprints] link
```

---

### 3.5 Editing Projects

**Edit Access:**
- **Owner**: Full edit access
- **Admin**: Can edit description, dates, priority
- **Member**: Read-only
- **Viewer**: No access

**Edit Flow (ProjectsPage.js):**
```javascript
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
```

**Editable Fields:**
1. Project name
2. Description
3. Start date (if not in past)
4. End date
5. Priority level
6. Team members (add/remove)

**Restrictions:**
- Cannot change created date
- Cannot change owner
- Cannot edit archived projects
- Start date cannot move to past

---

### 3.6 Deleting Projects

**Delete Access:**
- **Owner only**
- Requires confirmation
- **Permanent action** - cannot be undone

**Delete Confirmation Dialog:**
```javascript
"Are you sure you want to delete this project?"

⚠️ Warning:
- All tasks will be deleted
- All sprints will be deleted  
- Chat history will be deleted
- This action cannot be undone

Type project name to confirm: [_________]

[Cancel]  [Delete Project]
```

**Delete Flow:**
```javascript
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
```

**Backend Delete Process:**
```python
def delete_project(project_id, user_id):
    1. Verify user is owner
    2. Delete all associated tasks
    3. Delete all sprints
    4. Delete chat channel and messages
    5. Remove project from database
    6. Return success response
```

---

## 4. Tasks Management

### 4.1 Task Structure

**Task Data Model (task.py):**

```python
Task Schema:
{
  "_id": ObjectId,
  "ticket_id": str,           # Auto-generated (e.g., "PROJ-001")
  "issue_type": str,          # "task", "bug", "story", "epic"
  "title": str,               # 3-200 characters
  "description": str,         # Optional, markdown supported
  "project_id": ObjectId,     # Parent project
  "sprint_id": ObjectId,      # Optional, assigned sprint
  "priority": str,            # "Low", "Medium", "High", "Critical"
  "status": str,              # Workflow status
  "assignee_id": ObjectId,    # Assigned user
  "assignee_name": str,       # Cached for performance
  "assignee_email": str,      # Cached for performance
  "due_date": datetime,       # Optional deadline
  "labels": [str],            # Tags (e.g., "frontend", "api")
  "created_by": ObjectId,     # Creator
  "created_at": datetime,     # Timestamp
  "updated_at": datetime,     # Last modified
  "in_backlog": bool,         # Moved from completed sprint
  "moved_to_backlog_at": datetime,
  "estimated_hours": float,   # Optional estimate
  "actual_hours": float,      # Time logged
  "github_links": [str],      # Commit/PR URLs
  "attachments": [            # File uploads
    {
      "filename": str,
      "url": str,
      "uploaded_at": datetime,
      "uploaded_by": ObjectId
    }
  ]
}
```

---

### 4.2 Creating Tasks

**Task Form (TaskForm.js - lines 1-150):**

```javascript
// Form fields with real-time validation
const TaskForm = ({ onSubmit, onCancel, initialData, members, user }) => {
  Fields:
  
  1. Title * (required)
     - Minimum 3 characters
     - Maximum 200 characters
     - Real-time validation
     - Error: "Task title must be at least 3 characters"
  
  2. Description (optional)
     - Markdown supported
     - Maximum 2000 characters
     - Textarea with 4 rows
  
  3. Issue Type *
     - Options: Task, Bug, Story, Epic
     - Icons: ✓ Task, 🐛 Bug, 📖 Story, 🎯 Epic
     - Default: Task
  
  4. Priority *
     - Options: Low, Medium, High, Critical
     - Color coded badges
     - Default: Medium
  
  5. Status *
     - Options: To Do, In Progress, Dev Complete, Testing, Done
     - Follows strict workflow
     - Default: To Do
  
  6. Assignee
     - Dropdown of project members
     - Can assign to self
     - Members cannot assign to admins
     - Default: Unassigned
  
  7. Due Date
     - Date picker
     - Optional field
     - Cannot be in past
  
  8. Labels (tags)
     - Multi-value input
     - Validation: lowercase, alphanumeric, hyphens
     - Maximum 30 characters per label
     - Example: "frontend", "bug-fix", "api/v2"
     - Press Enter or click + to add
     - Click X to remove
}
```

**Label Validation (TaskForm.js - lines 40-70):**
```javascript
const handleAddLabel = (e) => {
  e.preventDefault();
  const label = labelInput.trim().toLowerCase();
  
  if (!label) return;
  
  // Check length
  if (label.length > 30) {
    setError("Label must be 30 characters or less");
    return;
  }
  
  // Check format
  if (!/^[a-z0-9\-_\/]+$/.test(label)) {
    setError("Label can only contain letters, numbers, hyphens, underscores, and slashes");
    return;
  }
  
  // Check duplicates
  if (labels.includes(label)) {
    setError("Label already added");
    return;
  }
  
  setLabels([...labels, label]);
  setLabelInput("");
  setError("");
};
```

**Assignment Restrictions:**

```javascript
// Members cannot assign to admins (TaskForm.js - lines 20-30)
const assignableMembers = React.useMemo(() => {
  if (!user || !user.role) return members;
  
  if (user.role === "member") {
    // Filter out admins and super-admins
    return members.filter(member => 
      member.role !== "admin" && member.role !== "super-admin"
    );
  }
  
  // Admins can assign to anyone
  return members;
}, [members, user]);
```

**Backend Create Task (task_controller.py - lines 1-140):**

```python
def create_task(body_str, user_id):
    """Create a new task - requires authentication"""
    
    Validation Steps:
    1. Check user authentication
    2. Validate required fields (title, project_id)
    3. Check title length (≥3 characters)
    4. Verify project exists
    5. Check user is project member
    6. Validate priority (Low/Medium/High/Critical)
    7. Validate issue type (task/bug/story/epic)
    8. Validate status (To Do/In Progress/Testing/Dev Complete/Done)
    9. Check assignee is project member
    10. Verify member not assigning to admin (role check)
    11. Generate unique ticket ID (e.g., PROJ-001)
    12. Validate and normalize labels
    13. Remove duplicate labels
    
    Process:
    1. Create task in database
    2. Convert ObjectId to string
    3. Format timestamps to ISO
    4. Broadcast to WebSocket (Kanban board updates)
    5. Return task data
    
    WebSocket Broadcast:
    {
      "type": "task_created",
      "task": { task_data },
      "user_name": "Creator Name"
    }
```

**Ticket ID Generation (ticket_utils.py):**
```python
def generate_ticket_id(project_id, issue_type):
    """
    Generate unique ticket ID
    Format: [PROJECT_CODE]-[NUMBER]
    
    Examples:
    - PROJ-001 (first task)
    - PROJ-002 (second task)
    - TEAM-015 (15th task)
    
    Process:
    1. Get project name
    2. Extract 3-4 letter code (uppercase)
    3. Count existing tasks
    4. Increment counter
    5. Format as CODE-XXX (zero-padded)
    
    Collision Handling:
    - Check if ID exists
    - Increment and retry
    - Maximum 1000 retries
    """
    project = Project.find_by_id(project_id)
    project_name = project["name"].upper()
    
    # Extract code from project name
    code = ''.join([c for c in project_name if c.isalpha()])[:4]
    
    # Get next number
    existing_tasks = Task.find_by_project(project_id)
    next_number = len(existing_tasks) + 1
    
    # Generate ID
    ticket_id = f"{code}-{next_number:03d}"
    
    return ticket_id
```

---

### 4.3 Task Detail View

**Task Detail Modal (TaskDetailModal.js):**

When clicking on a task card or table row, a detailed modal opens:

```
┌─────────────────────────────────────────────────────┐
│ [X]                                                  │
│                                                      │
│  🐛 PROJ-042  [High Priority]  [In Progress]       │
│                                                      │
│  Fix login authentication issue                     │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  📝 Description:                                     │
│  Users experiencing timeout errors when...          │
│                                                      │
│  ────────────────────────────────────────────────── │
│                                                      │
│  👤 Assignee:  John Doe                             │
│  📅 Due Date:  Feb 20, 2026                         │
│  🏷️  Labels:    [backend] [bug-fix] [security]      │
│  ⏱️  Estimate:  8 hours                             │
│  📊 Project:   Mobile App                           │
│  🏃 Sprint:    Sprint 5                             │
│                                                      │
│  ────────────────────────────────────────────────── │
│                                                      │
│  🔗 GitHub Links:                                    │
│  • https://github.com/org/repo/commit/abc123       │
│  • https://github.com/org/repo/pull/456            │
│  [+ Add Link]                                       │
│                                                      │
│  📎 Attachments:                                     │
│  • screenshot.png  [Download]                       │
│  • error_log.txt   [Download]                       │
│  [+ Upload File]                                    │
│                                                      │
│  ────────────────────────────────────────────────── │
│                                                      │
│  💬 Activity Log:                                    │
│  • John Doe moved task to In Progress  2h ago      │
│  • Jane Smith added comment           5h ago       │
│  • Task created by Admin              1d ago       │
│                                                      │
│  ────────────────────────────────────────────────── │
│                                                      │
│  [Edit Task]  [Delete Task]  [Close]                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Modal Sections:**

1. **Header**
   - Issue type icon
   - Ticket ID
   - Priority badge
   - Status badge
   - Close button

2. **Title & Description**
   - Task title (editable inline)
   - Description with markdown rendering

3. **Metadata**
   - Assignee with avatar
   - Due date with calendar icon
   - Labels as colored badges
   - Time estimate
   - Parent project link
   - Sprint assignment

4. **Development Section**
   - GitHub links list
   - Add new link button
   - Link validation (must be GitHub URL)

5. **Attachments**
   - File list with download buttons
   - Upload button
   - File size limits (10MB per file)

6. **Activity Timeline**
   - Chronological log of changes
   - User actions with timestamps
   - System events

7. **Actions**
   - Edit button (if permission)
   - Delete button (creator or admin only)
   - Close modal button

---

### 4.4 Task Workflow & Status

**Strict Workflow Order:**

```
To Do → In Progress → Dev Complete → Testing → Done
```

**Workflow Rules (KanbanBoard.js - lines 40-60):**

```javascript
const WORKFLOW_ORDER = ["To Do", "In Progress", "Dev Complete", "Testing", "Done"];

// Helper function to validate workflow transition
const isValidTransition = (fromStatus, toStatus) => {
  const fromIndex = WORKFLOW_ORDER.indexOf(fromStatus);
  const toIndex = WORKFLOW_ORDER.indexOf(toStatus);
  
  // Can always move backward
  if (toIndex < fromIndex) return true;
  
  // Can only move forward one step at a time
  return toIndex === fromIndex + 1;
};

// Get required previous status for error messages
const getRequiredPreviousStatus = (targetStatus) => {
  const index = WORKFLOW_ORDER.indexOf(targetStatus);
  if (index <= 0) return null;
  return WORKFLOW_ORDER[index - 1];
};
```

**Example Transitions:**

```
✅ Valid:
- To Do → In Progress
- In Progress → Dev Complete
- Dev Complete → Testing
- Testing → Done
- Done → Testing (backward)
- Testing → To Do (backward)

❌ Invalid:
- To Do → Testing (skips steps)
- To Do → Done (skips steps)
- In Progress → Done (skips steps)

Error Message:
"Task must be in 'Dev Complete' status before moving to 'Testing'"
```

**Status Change Validation:**

```javascript
handleDragEnd(event):
  1. Get task being dragged
  2. Get current status (from)
  3. Get target status (to)
  4. Check isValidTransition(from, to)
  5. If invalid: Show error toast
  6. If valid: Update task status
  7. Broadcast to WebSocket
  8. Show success notification
```

---

### 4.5 Task Filters & Search

**Available Filters:**

```javascript
Filter Categories:
1. Status
   - All
   - To Do
   - In Progress
   - Dev Complete
   - Testing
   - Done

2. Priority
   - All
   - Low
   - Medium
   - High
   - Critical

3. Assignee
   - All
   - Me (current user)
   - Unassigned
   - Specific team member

4. Issue Type
   - All
   - Task
   - Bug
   - Story
   - Epic

5. Labels
   - Multi-select
   - AND/OR logic
   - Custom label input

6. Due Date
   - All
   - Overdue
   - Due Today
   - Due This Week
   - Due This Month
   - No Due Date

7. Sprint
   - All
   - Current Sprint
   - Backlog
   - Specific Sprint
```

**Search Implementation:**

```javascript
// Real-time search across multiple fields
const searchTasks = (query) => {
  const lowerQuery = query.toLowerCase();
  
  return tasks.filter(task => {
    return (
      task.ticket_id.toLowerCase().includes(lowerQuery) ||
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description.toLowerCase().includes(lowerQuery) ||
      task.assignee_name.toLowerCase().includes(lowerQuery) ||
      task.labels.some(label => label.toLowerCase().includes(lowerQuery))
    );
  });
};

// Debounced search for performance
const debouncedSearch = useCallback(
  debounce((query) => searchTasks(query), 300),
  [tasks]
);
```

---

### 4.6 Task Bulk Operations

**Bulk Selection:**
```javascript
Features:
- Checkbox on each task card
- "Select All" checkbox in header
- Selected count badge
- Bulk action toolbar

Bulk Actions:
1. Change Status
   - Apply same status to all selected
   - Validates workflow rules per task
   
2. Change Priority
   - Update priority for all selected
   
3. Assign to User
   - Batch assign to single user
   
4. Add Labels
   - Add labels to all selected tasks
   
5. Move to Sprint
   - Assign multiple tasks to sprint
   
6. Delete Tasks
   - Requires confirmation
   - Shows count of tasks to delete
```

---

---

## 5. Kanban Board & Real-Time Updates

### 5.1 Kanban Board Overview

The Kanban Board provides a visual workflow management system with real-time WebSocket updates, allowing teams to see changes instantly across all connected clients.

**Key Features:**
- Real-time drag-and-drop task movement
- WebSocket-powered live updates
- Strict workflow enforcement
- Connection status indicator
- Toast notifications for team changes
- Optimistic UI updates

---

### 5.2 Kanban Board Layout

**Board Structure (KanbanBoard.js):**

```
┌────────────────────────────────────────────────────────────────────┐
│ Project: Mobile App Redesign              [🟢 Connected] [↻ Refresh]│
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌───────┐ │
│  │ TO DO   │  │IN PROGRESS│  │DEV COMPLETE│  │TESTING │  │ DONE  │ │
│  │ (7)     │  │   (3)     │  │    (2)    │  │  (1)   │  │  (12) │ │
│  ├─────────┤  ├──────────┤  ├──────────┤  ├─────────┤  ├───────┤ │
│  │ [Card]  │  │ [Card]   │  │ [Card]   │  │ [Card]  │  │ [Card]│ │
│  │ [Card]  │  │ [Card]   │  │ [Card]   │  │         │  │ [Card]│ │
│  │ [Card]  │  │ [Card]   │  │          │  │         │  │ [Card]│ │
│  │    ↓    │  │    ↓     │  │    ↓     │  │    ↓    │  │   ↓   │ │
│  └─────────┘  └──────────┘  └──────────┘  └─────────┘  └───────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**Column Configuration:**
```javascript
const COLUMNS = [
  { id: "To Do", title: "TO DO", color: "#7a869a" },
  { id: "In Progress", title: "IN PROGRESS", color: "#2684ff" },
  { id: "Dev Complete", title: "DEV COMPLETE", color: "#6554c0" },
  { id: "Testing", title: "TESTING", color: "#ffab00" },
  { id: "Done", title: "DONE", color: "#36b37e" },
];
```

---

### 5.3 Real-Time WebSocket Integration

**WebSocket Connection (KanbanBoard.js - lines 120-180):**

```javascript
// WebSocket message handler
const handleWebSocketMessage = useCallback((data) => {
  console.log('[Kanban WS] Received:', data.type);

  switch (data.type) {
    case 'connection':
      console.log('[Kanban WS] Connected to project:', data.project_id);
      break;

    case 'task_created':
      // Add new task to the board
      setTasks(prev => {
        // Avoid duplicates
        if (prev.some(t => t._id === data.task._id)) {
          return prev;
        }
        const taskTitle = data.task.title || data.task.ticket_id || 'New task';
        toast.info(`${data.user_name} created a new task: ${taskTitle}`);
        const newTasks = [...prev, data.task];
        
        // Update parent component's state
        if (onTaskUpdate) {
          onTaskUpdate(data.task._id, data.task);
        }
        return newTasks;
      });
      break;

    case 'task_updated':
      // Update existing task
      setTasks(prev => prev.map(task =>
        task._id === data.task._id ? data.task : task
      ));
      
      // Update parent component's state to keep it in sync
      if (onTaskUpdate) {
        onTaskUpdate(data.task._id, data.task);
      }
      
      // Show toast for status changes by other users
      if (data.updated_fields.includes('status') && data.user_name) {
        const currentUserId = localStorage.getItem('user_id');
        // Only show notification if the update was made by a different user
        if (data.user_id && data.user_id !== currentUserId) {
          const taskTitle = data.task.title || data.task.ticket_id || 'a task';
          toast.info(`${data.user_name} moved "${taskTitle}" to ${data.task.status}`);
        }
      }
      break;

    case 'task_deleted':
      // Remove deleted task
      setTasks(prev => prev.filter(task => task._id !== data.task_id));
      if (data.user_name) {
        toast.info(`${data.user_name} deleted a task`);
      }
      break;

    case 'pong':
      // Heartbeat response
      break;

    default:
      console.log('[Kanban WS] Unknown message type:', data.type);
  }
}, [onTaskUpdate]);

// WebSocket connection with auto-reconnect
const { connectionStatus, isConnected } = useKanbanWebSocket(
  projectId,
  handleWebSocketMessage,
  {
    enabled: Boolean(projectId),
    reconnectAttempts: 10,
    reconnectInterval: 2000
  }
);
```

**WebSocket Hook (useKanbanWebSocket.js):**

```javascript
// Custom hook for Kanban WebSocket management
export default function useKanbanWebSocket(
  projectId,
  onMessage,
  options = {}
) {
  Features:
  
  1. Automatic connection on mount
  2. Reconnection with exponential backoff
  3. Heartbeat ping/pong (30-second intervals)
  4. Connection status tracking
  5. Error handling and logging
  6. Cleanup on unmount
  
  Connection URL:
  ws://localhost:8000/api/kanban/ws/{project_id}?token={jwt_token}
  
  Message Types:
  - connection: Initial handshake
  - task_created: New task added
  - task_updated: Task modified
  - task_deleted: Task removed
  - pong: Heartbeat response
  
  Status States:
  - "connecting": Initial connection
  - "connected": Active connection
  - "disconnected": No connection
  - "reconnecting": Attempting reconnect
  - "error": Connection failed
}
```

**Connection Status Indicator:**

```jsx
<div className="connection-status">
  {isConnected ? (
    <div className="status-indicator connected">
      <FiWifi size={16} />
      <span>Connected</span>
    </div>
  ) : (
    <div className="status-indicator disconnected">
      <FiWifiOff size={16} />
      <span>Disconnected - Reconnecting...</span>
    </div>
  )}
</div>
```

---

### 5.4 Drag-and-Drop Implementation

**DnD Kit Integration (KanbanBoard.js):**

```javascript
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

// Configure sensors for drag detection
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // Minimum drag distance (prevents accidental drags)
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  }),
);

// Drag event handlers
const handleDragStart = (event) => {
  const { active } = event;
  const task = tasks.find(t => t._id === active.id);
  setActiveTask(task);
  setDragStartStatus(task.status);  // Store original status
};

const handleDragEnd = async (event) => {
  const { active, over } = event;
  
  if (!over || active.id === over.id) {
    setActiveTask(null);
    return;
  }

  const taskId = active.id;
  const newStatus = over.id;
  const task = tasks.find(t => t._id === taskId);
  
  if (!task) return;

  const oldStatus = task.status;

  // Validate workflow transition
  if (!isValidTransition(oldStatus, newStatus)) {
    const requiredStatus = getRequiredPreviousStatus(newStatus);
    toast.error(
      `Task must be in '${requiredStatus}' status before moving to '${newStatus}'`,
      { duration: 4000 }
    );
    setActiveTask(null);
    return;
  }

  // Optimistic update
  setTasks(prevTasks =>
    prevTasks.map(t =>
      t._id === taskId ? { ...t, status: newStatus } : t
    )
  );
  
  setActiveTask(null);

  // Backend update
  try {
    await taskAPI.updateStatus(taskId, newStatus);
    // WebSocket broadcast happens in backend
  } catch (error) {
    // Revert on error
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t._id === taskId ? { ...t, status: oldStatus } : t
      )
    );
    toast.error("Failed to update task status");
    console.error("Error updating task:", error);
  }
};

const handleDragCancel = () => {
  setActiveTask(null);
  setDragStartStatus(null);
};
```

**Optimistic UI Updates:**

```javascript
// Update UI immediately, then sync with backend
Workflow:
1. User drags task to new column
2. UI updates instantly (optimistic)
3. API call made to backend
4. If success: WebSocket broadcasts to other users
5. If error: Revert local change, show error toast

Benefits:
- Feels instant and responsive
- No waiting for API response
- Graceful error handling
- Consistent with other users via WebSocket
```

---

### 5.5 Kanban Task Cards

**Task Card Component (KanbanTaskCard.js):**

```jsx
<div className="kanban-task-card">
  {/* Header */}
  <div className="card-header">
    <span className="ticket-id">{task.ticket_id}</span>
    <span className={`priority-badge ${task.priority.toLowerCase()}`}>
      {task.priority}
    </span>
  </div>

  {/* Issue Type Icon */}
  <div className="issue-type">
    {task.issue_type === 'bug' && <BsBug color="#E44D26" />}
    {task.issue_type === 'task' && <BsCheckSquare color="#2684FF" />}
    {task.issue_type === 'story' && <BsBook color="#6554C0" />}
    {task.issue_type === 'epic' && <BsBullseye color="#FF5630" />}
  </div>

  {/* Title */}
  <h4 className="card-title">{task.title}</h4>

  {/* Description Preview */}
  {task.description && (
    <p className="card-description">
      {task.description.substring(0, 80)}
      {task.description.length > 80 && '...'}
    </p>
  )}

  {/* Labels */}
  {task.labels && task.labels.length > 0 && (
    <div className="card-labels">
      {task.labels.slice(0, 3).map(label => (
        <span key={label} className="label-badge">{label}</span>
      ))}
      {task.labels.length > 3 && (
        <span className="label-more">+{task.labels.length - 3}</span>
      )}
    </div>
  )}

  {/* Footer */}
  <div className="card-footer">
    {/* Assignee Avatar */}
    {task.assignee_name ? (
      <div className="assignee-avatar" title={task.assignee_name}>
        {task.assignee_name.charAt(0).toUpperCase()}
      </div>  
    ) : (
      <div className="assignee-avatar unassigned" title="Unassigned">
        ?
      </div>
    )}

    {/* Due Date */}
    {task.due_date && (
      <div className={`due-date ${isDueSoon(task.due_date) ? 'urgent' : ''}`}>
        <FiCalendar size={12} />
        <span>{formatDate(task.due_date)}</span>
      </div>
    )}

    {/* Attachments Count */}
    {task.attachments && task.attachments.length > 0 && (
      <div className="attachments-count">
        <FiPaperclip size={12} />
        <span>{task.attachments.length}</span>
      </div>
    )}
  </div>
</div>
```

**Card Styling by Priority:**

```css
/* Priority badge colors */
.priority-badge.low {
  background: #36B37E;
  color: white;
}

.priority-badge.medium {
  background: #FFAB00;
  color: white;
}

.priority-badge.high {
  background: #FF5630;
  color: white;
}

.priority-badge.critical {
  background: #DE350B;
  color: white;
  font-weight: bold;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

---

### 5.6 Kanban Workflow Validation

**Strict Workflow Enforcement:**

```javascript
// Workflow rules prevent skipping stages
const WORKFLOW_ORDER = [
  "To Do",
  "In Progress",
  "Dev Complete",
  "Testing",
  "Done"
];

// Validation function
const isValidTransition = (fromStatus, toStatus) => {
  const fromIndex = WORKFLOW_ORDER.indexOf(fromStatus);
  const toIndex = WORKFLOW_ORDER.indexOf(toStatus);
  
  if (fromIndex === -1 || toIndex === -1) return false;
  
  // Can always move backward (to fix issues)
  if (toIndex < fromIndex) return true;
  
  // Can only move forward one step at a time
  return toIndex === fromIndex + 1;
};

// Error handling
if (!isValidTransition(oldStatus, newStatus)) {
  const requiredStatus = getRequiredPreviousStatus(newStatus);
  
  toast.error(
    `⚠️ Workflow Violation\n\n` +
    `Task must be in '${requiredStatus}' status ` +
    `before moving to '${newStatus}'`,
    {
      duration: 5000,
      position: 'top-center',
      style: {
        background: '#FF5630',
        color: 'white',
        fontSize: '14px',
        padding: '16px',
      }
    }
  );
  
  return; // Prevent invalid move
}
```

**Example Scenarios:**

```
Scenario 1: Valid Forward Movement
From: To Do → To: In Progress ✅
Result: Task moves successfully

Scenario 2: Invalid Forward Movement
From: To Do → To: Testing ❌
Error: "Task must be in 'Dev Complete' status before moving to 'Testing'"
Result: Task stays in To Do

Scenario 3: Backward Movement (Bug Fix)
From: Testing → To: In Progress ✅
Result: Task moves back (allowed for rework)

Scenario 4: Skip Multiple Steps
From: In Progress → To: Done ❌
Error: "Task must be in 'Testing' status before moving to 'Done'"
Result: Task stays in In Progress
```

---

### 5.7 Kanban Notifications

**Toast Notification System:**

```javascript
// Using react-toastify library
import { toast } from "react-toastify";

// Task created by another user
toast.info(
  `${data.user_name} created a new task: ${taskTitle}`,
  {
    position: "bottom-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  }
);

// Task status changed by another user
toast.info(
  `${data.user_name} moved "${taskTitle}" to ${data.task.status}`,
  {
    position: "bottom-right",
    autoClose: 4000,
    icon: "🔄",
  }
);

// Task deleted by another user
toast.info(
  `${data.user_name} deleted a task`,
  {
    position: "bottom-right",
    autoClose: 3000,
    icon: "🗑️",
  }
);

// Workflow validation error
toast.error(
  `Task must be in '${requiredStatus}' status before moving to '${newStatus}'`,
  {
    position: "top-center",
    autoClose: 5000,
    style: {
      background: '#FF5630',
      color: 'white',
    }
  }
);

// Connection status
toast.success(
  "Connected to project board",
  {
    position: "bottom-left",
    autoClose: 2000,
    icon: "🟢",
  }
);

toast.warning(
  "Disconnected - attempting to reconnect...",
  {
    position: "bottom-left",
    autoClose: false,
    icon: "🟡",
  }
);
```

**Notification Deduplication:**

```javascript
// Prevent duplicate notifications for same user
const handleWebSocketMessage = useCallback((data) => {
  if (data.user_id && data.user_id === currentUserId) {
    // Don't show notification for own actions
    return;
  }
  
  // Show notification for others' actions
  toast.info(`${data.user_name} ${action}`);
}, [currentUserId]);
```

---

## 6. Sprint Planning

### 6.1 Sprint Overview

Sprints are time-boxed iterations (typically 1-4 weeks) where teams complete a set of tasks.

**Sprint Lifecycle:**
```
1. Planning → 2. Active → 3. Completed → 4. Backlog Management
```

**Sprint States:**
- **Not Started**: Sprint created but not begun
- **Active**: Currently in progress (can only have 1 active sprint per project)
- **Completed**: Sprint finished with retrospective

---

### 6.2 Creating a Sprint

**Sprint Form (SprintForm.js):**

```javascript
Required Fields:
1. Sprint Name *
   - Example: "Sprint 5", "Q1 2026 Sprint 2"
   - 3-50 characters
   - Unique per project

2. Project *
   - Dropdown selection
   - Shows only projects where user is member
   - Cannot be changed after creation

3. Start Date *
   - Cannot be in past (if creating new)
   - Date picker with calendar
   - Validates against other sprints

4. End Date *
   - Must be after start date
   - Typical duration: 1-4 weeks
   - Cannot overlap with active sprint

5. Sprint Goal (optional)
   - Description of sprint objective
   - Example: "Implement authentication system"
   - Maximum 500 characters

6. Team Capacity (optional)
   - Total available hours for sprint
   - Example: 160 hours (team of 4, 40hrs/week, 1 week)
   - Used for capacity planning
```

**Sprint Creation Flow (SprintPage.js - createSprint):**

```javascript
const handleCreateSprint = async (sprintData) => {
  try {
    setError("");
    
    // Validate dates
    const start = new Date(sprintData.start_date);
    const end = new Date(sprintData.end_date);
    
    if (end <= start) {
      setError("End date must be after start date");
      return;
    }
    
    // Check for overlapping sprints
    const overlapping = sprints.find(sprint => {
      const sprintStart = new Date(sprint.start_date);
      const sprintEnd = new Date(sprint.end_date);
      
      return (
        (start >= sprintStart && start <= sprintEnd) ||
        (end >= sprintStart && end <= sprintEnd) ||
        (start <= sprintStart && end >= sprintEnd)
      );
    });
    
    if (overlapping) {
      setError(`Sprint dates overlap with "${overlapping.name}"`);
      return;
    }
    
    // Create sprint
    const response = await createSprint(projectId, sprintData);
    
    setSuccess("Sprint created successfully!");
    setShowSprintForm(false);
    fetchProjectData(); // Refresh data
    
  } catch (err) {
    setError(err.message || "Failed to create sprint");
  }
};
```

**Backend Sprint Creation:**

```python
def create_sprint(body_str, user_id):
    Validations:
    1. Check user authentication
    2. Verify user is project member
    3. Validate sprint name (3-50 chars)
    4. Check start date not in past
    5. Validate end date > start date
    6. Check no overlapping sprints
    7. Validate capacity (if provided)
    
    Process:
    1. Create sprint in database
    2. Set status = "not_started"
    3. Initialize empty task list
    4. Return sprint data
```

---

### 6.3 Sprint Page Layout

**Complete Sprint View (SprintPage.js):**

```
┌─────────────────────────────────────────────────────────────────┐
│ Project: Mobile App Redesign                    [Back to Project]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏃 Sprints                                   [+ New Sprint]     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📊 Active Sprint: Sprint 5                                  ││
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ││
│  │                                                              ││
│  │ 🎯 Goal: Implement authentication system                    ││
│  │ 📅 Feb 12 - Feb 26, 2026  (5 days remaining)               ││
│  │                                                              ││
│  │ Progress: ████████████░░░░░░░░░░ 65% (13/20 tasks)         ││
│  │                                                              ││
│  │ [View Details] [Add Tasks] [Complete Sprint]                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📋 Past Sprints                                             ││
│  │                                                              ││
│  │ ✓ Sprint 4 - Completed Feb 11                              ││
│  │   20/20 tasks completed                                     ││
│  │   [View Details]                                            ││
│  │                                                              ││
│  │ ✓ Sprint 3 - Completed Jan 28                              ││
│  │   15/18 tasks completed (3 moved to backlog)               ││
│  │   [View Details]                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📦 Backlog (7 tasks)                                        ││
│  │ Tasks not assigned to any sprint                            ││
│  │                                                              ││
│  │ • PROJ-042: Fix login bug                    [High]         ││
│  │ • PROJ-038: Update documentation             [Low]          ││
│  │ • PROJ-035: Refactor database queries        [Medium]       ││
│  │   ...                                                        ││
│  │                                                              ││
│  │ [View All Backlog Tasks]                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6.4 Adding Tasks to Sprint

**Task Assignment Methods:**

**Method 1: From Sprint Details**
```javascript
// Add tasks while viewing sprint
handleAddTasksToSprint flow:
  1. Click "Add Tasks" button
  2. Modal opens showing available tasks
  3. Filter tasks by:
     - Not in any sprint
     - Not in backlog
     - Same project
  4. Multi-select tasks with checkboxes
  5. Click "Add Selected" button
  6. Tasks assigned to sprint
  7. Modal closes, sprint refreshes
```

**Method 2: From Backlog View (BacklogView.js):**

```jsx
<div className="backlog-view">
  <div className="backlog-header">
    <h3>📦 Backlog ({backlogTasks.length} tasks)</h3>
    <button onClick={handleRefresh}>
      <RefreshCw size={16} /> Refresh
    </button>
  </div>

  <div className="filter-bar">
    <input
      type="text"
      placeholder="Search backlog tasks..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
      <option value="all">All Priorities</option>
      <option value="critical">Critical</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
  </div>

  <div className="backlog-tasks">
    {filteredTasks.map(task => (
      <div key={task._id} className="backlog-task-item">
        <input
          type="checkbox"
          checked={selectedTasks.includes(task._id)}
          onChange={() => toggleTaskSelection(task._id)}
        />
        <div className="task-info">
          <span className="ticket-id">{task.ticket_id}</span>
          <span className="task-title">{task.title}</span>
          <span className={`priority-badge ${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>
        </div>
        <button onClick={() => handleQuickAddToSprint(task._id, activeSprint._id)}>
          Add to Sprint
        </button>
      </div>
    ))}
  </div>

  <div className="backlog-actions">
    <span>{selectedTasks.length} selected</span>
    <button
      onClick={handleBulkAddToSprint}
      disabled={selectedTasks.length === 0 || !activeSprint}
    >
      Add Selected to Active Sprint
    </button>
  </div>
</div>
```

**Method 3: Drag and Drop (Future Feature)**

---

### 6.5 Sprint Management

**Starting a Sprint:**

```javascript
const handleStartSprint = async (sprintId) => {
  // Validation checks
  const activeSprints = sprints.filter(s => s.status === 'active');
  
  if (activeSprints.length > 0) {
    toast.error("You can only have one active sprint at a time. Complete the current sprint first.");
    return;
  }
  
  const confirm = window.confirm(
    "Are you sure you want to start this sprint? " +
    "The start date will be set to today."
  );
  
  if (!confirm) return;
  
  try {
    await startSprint(sprintId);
    toast.success("Sprint started successfully!");
    fetchProjectData(); // Refresh all data
  } catch (error) {
    toast.error("Failed to start sprint: " + error.message);
  }
};
```

**Completing a Sprint:**

```javascript
const handleCompleteSprint = async (sprintId) => {
  const sprint = sprints.find(s => s._id === sprintId);
  const incompleteTasks = sprintTasks[sprintId]?.filter(
    task => task.status !== 'Done'
  ) || [];
  
  if (incompleteTasks.length > 0) {
    const confirm = window.confirm(
      `This sprint has ${incompleteTasks.length} incomplete task(s).\n\n` +
      `These tasks will be moved to the backlog.\n\n` +
      `Continue?`
    );
    
    if (!confirm) return;
  }
  
  try {
    await completeSprint(sprintId);
    toast.success(
      "Sprint completed! Incomplete tasks moved to backlog.",
      { duration: 5000 }
    );
    fetchProjectData();
  } catch (error) {
    toast.error("Failed to complete sprint: " + error.message);
  }
};
```

**Backend Sprint Completion:**

```python
def complete_sprint(sprint_id, user_id):
    Process:
    1. Verify user is project member
    2. Check sprint is active
    3. Get all tasks in sprint
    4. Mark sprint as completed
    5. For each incomplete task:
       - Remove sprint_id
       - Set in_backlog = True
       - Set moved_to_backlog_at = now()
    6. Calculate sprint metrics:
       - Total tasks
       - Completed tasks
       - Completion rate
       - Velocity (story points)
    7. Store metrics with sprint
    8. Return completion summary
```

---

### 6.6 Sprint Backlog Management

**Backlog Concept:**

Tasks moved to backlog when:
1. Sprint completed with incomplete tasks
2. Task removed from sprint manually
3. Task deprioritized during sprint

**Backlog View Component (BacklogView.js - lines 1-100):**

```javascript
const BacklogView = ({ projectId, backlogTasks, availableTasks, sprints }) => {
  Features:
  
  1. Two sections:
     a) Backlog (tasks from completed sprints)
     b) Available (tasks never assigned to sprint)
  
  2. Task information displayed:
     - Ticket ID
     - Title
     - Priority (with color)
     - Moved to backlog date
     - Original sprint (if applicable)
  
  3. Actions:
     - Add single task to sprint
     - Bulk add multiple tasks
     - Move back to available
     - Delete task
  
  4. Filtering:
     - Search by title/ticket ID
     - Filter by priority
     - Sort by date, priority, name
  
  5. Selection:
     - Multi-select with checkboxes
     - Select all / Deselect all
     - Count of selected tasks
}
```

**Backlog API:**

```javascript
// Get backlog tasks for a project
GET /api/sprints/backlog/{project_id}

Response:
{
  "success": true,
  "backlog_tasks": [
    {
      "_id": "65f...",
      "ticket_id": "PROJ-042",
      "title": "Fix authentication bug",
      "priority": "High",
      "in_backlog": true,
      "moved_to_backlog_at": "2026-02-11T15:30:00Z",
      "previous_sprint_name": "Sprint 4"
    }
  ]
}
```

---

### 6.7 Sprint Analytics & Burndown

**Sprint Metrics:**

```javascript
Sprint Statistics:
1. Total Tasks: Count of tasks assigned
2. Completed Tasks: Tasks with status="Done"
3. Completion Rate: (completed / total) * 100
4. Days Remaining: end_date - today
5. Daily Velocity: completed_tasks / days_elapsed
6. Estimated Completion: Based on current velocity

Burndown Chart Data:
- X-axis: Days (throughout sprint)
- Y-axis: Remaining tasks
- Ideal Line: Linear decrease to zero
- Actual Line: Real progress
- Today Marker: Current position
```

**Burndown Chart Component:**

```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SprintBurndownChart = ({ sprint, tasks }) => {
  const chartData = calculateBurndownData(sprint, tasks);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <XAxis dataKey="day" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: 'Remaining Tasks', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        
        {/* Ideal burndown line */}
        <Line
          type="monotone"
          dataKey="ideal"
          stroke="#999"
          strokeDasharray="5 5"
          name="Ideal"
          dot={false}
        />
        
        {/* Actual burndown line */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#2684FF"
          strokeWidth={2}
          name="Actual"
          dot={{ fill: '#2684FF', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

---

---

## 7. Team Chat & Collaboration

### 7.1 Team Chat Overview

Team Chat provides real-time communication channels for each project, powered by WebSocket technology.

**Key Features:**
- Real-time messaging (WebSocket)
- Project-based channels
- File attachments
- Message reactions
- Edit/delete messages
- User presence indicators
- Message history
- Emoji support

---

### 7.2 Team Chat Architecture

**Chat System Components (TeamChat.js - lines 1-150):**

```javascript
export default function TeamChat() {
  State Management:
  
  1. UI State:
     - isOpen: Chat panel visibility
     - currentProject: Selected project
     - currentChannel: Active channel ID
     - showChannelDropdown: Channel selector
     
  2. Data State:
     - projects: Available projects
     - channels: Project channels
     - messages: Channel messages
     - loading: Loading indicator
     - sending: Message send state
  
  3. Enhanced Features:
     - editingMessageId: Message being edited
     - replyingTo: Message being replied to
     - selectedFile: File to upload
     - uploadProgress: Upload percentage
     - showEmojiPicker: Emoji picker state
     - messageMenuOpen: Context menu
     
  WebSocket Connection:
  - URL: ws://localhost:8000/api/team-chat/ws/{channel_id}?token={jwt_token}
  - Auto-reconnect: 10 attempts, 2-second intervals
  - Heartbeat: ping/pong every 30 seconds
}
```

---

### 7.3 Channel Management

**Accessing Channels:**

```javascript
// Fetch projects on mount
useEffect(() => {
  if (isOpen) {
    fetchProjects();
  }
}, [isOpen]);

// Fetch channels when project changes
useEffect(() => {
  if (currentProject) {
    fetchChannels(currentProject);
  }
}, [currentProject]);

const fetchProjects = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tab-Session-Key': sessionStorage.getItem('tab_session_key') || ''
      }
    });
    const data = await response.json();
    
    if (data.success) {
      setProjects(data.projects);
      // Auto-select first project
      if (data.projects.length > 0 && !currentProject) {
        handleProjectSelect(data.projects[0]);
      }
    }
  } catch (error) {
    console.error('Failed to fetch projects:', error);
  }
};

const fetchChannels = async (projectId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/team-chat/channels/${projectId}`,
      {
        headers: getAuthHeaders()
      }
    );
    const data = await response.json();
    
    if (data.success && data.channels.length > 0) {
      setChannels(data.channels);
      // Auto-select first channel
      handleChannelSelect(data.channels[0].id);
    }
  } catch (error) {
    console.error('Failed to fetch channels:', error);
  }
};
```

**Channel Structure:**

```json
{
  "id": "65f4b2c3a1b2c3d4e5f6g7h8",
  "name": "general",
  "project_id": "75f4b2c3a1b2c3d4e5f6g7h9",
  "project_name": "Mobile App Redesign",
  "description": "General project discussions",
  "created_by": "85f4b2c3a1b2c3d4e5f6g7h0",
  "created_at": "2026-02-01T10:00:00Z",
  "member_count": 8,
  "unread_count": 3
}
```

---

### 7.4 Real-Time Messaging

**WebSocket Message Handler (TeamChat.js - lines 42-110):**

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
      
      // Scroll to bottom
      scrollToBottom();
      
      // Play notification sound (if enabled)
      if (data.message.user_id !== currentUserId) {
        playNotificationSound();
      }
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
      // Update user list
      setOnlineUsers(prev => [...new Set([...prev, data.user_id])]);
      break;
      
    case 'user_left':
      console.log('[TeamChat WS] User left:', data.user_id);
      // Remove from online users
      setOnlineUsers(prev => prev.filter(id => id !== data.user_id));
      break;
      
    case 'typing_indicator':
      // Show typing indicator
      handleTypingIndicator(data.user_id, data.user_name);
      break;
      
    case 'pong':
      // Heartbeat response
      break;
      
    default:
      console.log('[TeamChat WS] Unknown message type:', data.type);
  }
}, [currentUserId]);

// Build WebSocket URL
const wsUrl = currentChannel && isOpen
  ? `${API_BASE_URL.replace('http', 'ws')}/api/team-chat/ws/${currentChannel}?token=${localStorage.getItem('token')}`
  : null;

// WebSocket connection with auto-reconnect
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

### 7.5 Sending Messages

**Message Input Component:**

```jsx
<div className="message-input-area">
  {/* Reply Preview */}
  {replyingTo && (
    <div className="reply-preview">
      <div className="reply-content">
        <Reply size={14} />
        <span>Replying to <strong>{replyingTo.user_name}</strong></span>
        <span className="reply-text">{replyingTo.text.substring(0, 50)}...</span>
      </div>
      <button onClick={() => setReplyingTo(null)}>
        <X size={14} />
      </button>
    </div>
  )}

  {/* File Selection Preview */}
  {selectedFile && (
    <div className="file-preview">
      <FileText size={16} />
      <span className="file-name">{selectedFile.name}</span>
      <span className="file-size">{formatFileSize(selectedFile.size)}</span>
      <button onClick={() => setSelectedFile(null)}>
        <X size={14} />
      </button>
    </div>
  )}

  {/* Message Input */}
  <div className="input-wrapper">
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileSelect}
      style={{ display: 'none' }}
      accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif"
    />
    
    <button
      className="btn-icon"
      onClick={() => fileInputRef.current?.click()}
      title="Attach file"
    >
      <Paperclip size={18} />
    </button>
    
    <button
      className="btn-icon"
      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
      title="Add emoji"
    >
      <Smile size={18} />
    </button>
    
    <input
      type="text"
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      onKeyPress={handleKeyPress}
      placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
      disabled={sending || !isConnected}
    />
    
    <button
      className="btn-send"
      onClick={handleSendMessage}
      disabled={(!message.trim() && !selectedFile) || sending || !isConnected}
      title={isConnected ? "Send message" : "Disconnected"}
    >
      {sending ? (
        <Loader2 size={18} className="spin" />
      ) : (
        <Send size={18} />
      )}
    </button>
  </div>
  
  {/* Emoji Picker */}
  {showEmojiPicker && (
    <div ref={emojiPickerRef} className="emoji-picker">
      {commonEmojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleEmojiSelect(emoji)}
          className="emoji-button"
        >
          {emoji}
        </button>
      ))}
    </div>
  )}
</div>
```

**Send Message Function:**

```javascript
const handleSendMessage = async () => {
  if ((!message.trim() && !selectedFile) || sending) return;

  setSending(true);
  
  try {
    if (selectedFile) {
      // Upload file first
      await handleFileUpload();
    } else {
      // Send text message
      const payload = {
        channel_id: currentChannel,
        text: message.trim(),
        reply_to: replyingTo?.id || null
      };
      
      const response = await chatAPI.sendMessage(payload);
      
      if (response.success) {
        setMessage('');
        setReplyingTo(null);
        // WebSocket will update messages
      }
    }
  } catch (error) {
    console.error('Failed to send message:', error);
    toast.error('Failed to send message');
  } finally {
    setSending(false);
  }
};

// Handle Enter key press
const handleKeyPress = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage();
  }
};
```

---

### 7.6 File Attachments

**File Upload Implementation:**

```javascript
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    toast.error('File size must be less than 10MB');
    return;
  }
  
  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/gif'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    toast.error('File type not supported');
    return;
  }
  
  setSelectedFile(file);
};

const handleFileUpload = async () => {
  if (!selectedFile) return;
  
  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('channel_id', currentChannel);
  if (message.trim()) {
    formData.append('message', message.trim());
  }
  if (replyingTo) {
    formData.append('reply_to', replyingTo.id);
  }
  
  try {
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        setUploadProgress(percentComplete);
      }
    });
    
    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        setMessage('');
        setSelectedFile(null);
        setReplyingTo(null);
        setUploadProgress(0);
        toast.success('File uploaded successfully');
      } else {
        toast.error('Failed to upload file');
      }
    });
    
    xhr.open('POST', `${API_BASE_URL}/api/team-chat/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
    xhr.setRequestHeader('X-Tab-Session-Key', sessionStorage.getItem('tab_session_key'));
    xhr.send(formData);
    
  } catch (error) {
    console.error('File upload error:', error);
    toast.error('Failed to upload file');
    setUploadProgress(0);
  }
};
```

**Backend File Upload (team_chat_controller.py):**

```python
def upload_chat_file(file, channel_id, user_id, message_text=None, reply_to=None):
    """
    Upload file to team chat channel
    """
    # Validate file
    allowed_extensions = {'.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.gif'}
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        return error_response("File type not allowed", 400)
    
    # Check file size (10MB limit)
    max_size = 10 * 1024 * 1024
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Seek back to start
    
    if size > max_size:
        return error_response("File size exceeds 10MB limit", 400)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{secure_filename(file.filename)}"
    
    # Save file
    upload_path = os.path.join("uploads", "chat_attachments", safe_filename)
    os.makedirs(os.path.dirname(upload_path), exist_ok=True)
    file.save(upload_path)
    
    # Create message with attachment
    message_data = {
        "channel_id": channel_id,
        "user_id": user_id,
        "text": message_text or f"Uploaded {file.filename}",
        "attachment": {
            "filename": file.filename,
            "url": f"/uploads/chat_attachments/{safe_filename}",
            "size": size,
            "type": file_ext[1:]  # Remove dot
        },
        "reply_to": reply_to
    }
    
    # Save to database
    result = db.chat_messages.insert_one(message_data)
    message_data["_id"] = str(result.inserted_id)
    
    # Broadcast via WebSocket
    asyncio.create_task(manager.broadcast_to_channel({
        "type": "new_message",
        "message": message_data
    }, f"chat_{channel_id}"))
    
    return success_response({"message": message_data})
```

---

### 7.7 Message Features

**Edit Message:**

```javascript
const handleEditMessage = async (messageId) => {
  if (!editingText.trim()) {
    toast.error('Message cannot be empty');
    return;
  }
  
  try {
    await chatAPI.editMessage(messageId, editingText.trim());
    setEditingMessageId(null);
    setEditingText('');
    // WebSocket will update the message
  } catch (error) {
    toast.error('Failed to edit message');
  }
};
```

**Delete Message:**

```javascript
const handleDeleteMessage = async (messageId) => {
  if (!window.confirm('Delete this message?')) return;
  
  try {
    await chatAPI.deleteMessage(messageId);
    // WebSocket will remove the message
  } catch (error) {
    toast.error('Failed to delete message');
  }
};
```

**React to Message:**

```javascript
const handleReaction = async (messageId, emoji) => {
  try {
    await chatAPI.addReaction(messageId, emoji);
    // WebSocket will update reactions
  } catch (error) {
    toast.error('Failed to add reaction');
  }
};

// Common emojis for quick access
const commonEmojis = ['👍', '❤️', '😊', '🎉', '👏', '🔥', '✅', '👀'];
```

**Reply to Message:**

```javascript
const handleReplyClick = (message) => {
  setReplyingTo(message);
  // Focus input
  document.querySelector('.message-input input')?.focus();
};
```

---

### 7.8 Message Display

**Message Component:**

```jsx
<div className={`message ${message.user_id === currentUserId ? 'own-message' : ''}`}>
  {/* User Avatar */}
  <div className="message-avatar">
    {message.user_name?.charAt(0).toUpperCase()}
  </div>
  
  <div className="message-content">
    {/* Header */}
    <div className="message-header">
      <span className="message-author">{message.user_name}</span>
      <span className="message-time">{formatTime(message.created_at)}</span>
      {message.edited && <span className="edited-badge">(edited)</span>}
    </div>
    
    {/* Reply Reference */}
    {message.reply_to && (
      <div className="message-reply-reference">
        <Reply size={12} />
        <span>Replied to {message.reply_to.user_name}</span>
      </div>
    )}
    
    {/* Message Text */}
    {editingMessageId === message.id ? (
      <div className="message-edit">
        <input
          type="text"
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleEditMessage(message.id);
            if (e.key === 'Escape') {
              setEditingMessageId(null);
              setEditingText('');
            }
          }}
          autoFocus
        />
        <button onClick={() => handleEditMessage(message.id)}>Save</button>
        <button onClick={() => setEditingMessageId(null)}>Cancel</button>
      </div>
    ) : (
      <p className="message-text">{message.text}</p>
    )}
    
    {/* Attachment */}
    {message.attachment && (
      <div className="message-attachment">
        {message.attachment.type === 'image' ? (
          <img
            src={`${API_BASE_URL}${message.attachment.url}`}
            alt={message.attachment.filename}
            className="attachment-image"
          />
        ) : (
          <div className="attachment-file">
            <FileText size={24} />
            <div className="attachment-info">
              <span className="attachment-name">{message.attachment.filename}</span>
              <span className="attachment-size">{formatFileSize(message.attachment.size)}</span>
            </div>
            <button
              onClick={() => downloadFile(message.attachment.url)}
              className="btn-download"
            >
              <Download size={16} />
              Download
            </button>
          </div>
        )}
      </div>
    )}
    
    {/* Reactions */}
    {message.reactions && message.reactions.length > 0 && (
      <div className="message-reactions">
        {message.reactions.map(reaction => (
          <button
            key={reaction.emoji}
            className={`reaction-badge ${reaction.users.includes(currentUserId) ? 'reacted' : ''}`}
            onClick={() => handleReaction(message.id, reaction.emoji)}
          >
            {reaction.emoji} {reaction.count}
          </button>
        ))}
      </div>
    )}
    
    {/* Actions Menu */}
    {message.user_id === currentUserId && (
      <div className="message-actions">
        <button onClick={() => {
          setEditingMessageId(message.id);
          setEditingText(message.text);
        }}>
          <Edit2 size={14} /> Edit
        </button>
        <button onClick={() => handleDeleteMessage(message.id)}>
          <Trash2 size={14} /> Delete
        </button>
      </div>
    )}
    
    {/* Reply Button */}
    <button
      className="btn-reply"
      onClick={() => handleReplyClick(message)}
    >
      <Reply size={14} /> Reply
    </button>
  </div>
</div>
```

---

## 8. AI Assistant Integration

### 8.1 AI Assistant Overview

The AI Assistant (DOIT-AI) is comprehensively documented in **07_ai_integration.md**. 

**Quick Reference for Users:**

**Features:**
- **Chat with AI**: Ask questions about project management, Agile, best practices
- **File Analysis**: Upload PDF, CSV, Word, JSON, Text files for analysis
- **Image Generation**: Create images using FLUX-1.1-pro AI model
- **Conversation History**: Save and manage chat sessions
- **Context Awareness**: AI understands previous messages in conversation

**Access:**
1. Click purple "DOIT-AI" button in header
2. Or navigate to `/ai-assistant` route

**Common Use Cases:**
- Sprint planning advice
- Task prioritization guidance
- Agile methodology questions
- Data analysis from CSV files
- Document summarization
- Visual content creation

**See 07_ai_integration.md for:**
- Complete feature documentation
- Azure OpenAI GPT-5.2-chat implementation
- FLUX image generation details
- File processing capabilities
- API endpoints and usage
- Performance metrics
- Security features

---

## 9. Data Visualization & Analytics

### 9.1 Data Visualization Overview

DOIT includes a powerful data visualization tool for analyzing datasets and creating charts.

**Supported File Types:**
- CSV (.csv)
- Excel (.xlsx, .xls)

**Chart Types:**
- Scatter Plot
- Line Chart
- Bar Chart
- Histogram
- Box Plot
- Heatmap

---

### 9.2 Uploading Datasets

**Upload Process (DataVisualization.js - lines 95-130):**

```javascript
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  const validTypes = ['.csv', '.xlsx', '.xls'];
  const isValid = validTypes.some(type => file.name.toLowerCase().endsWith(type));
  
  if (!isValid) {
    alert('Please upload a CSV or Excel file');
    return;
  }

  setLoading(true);
  const formData = new FormData();
  formData.append('file', file);

  try {
    const tabKey = sessionStorage.getItem('tab_session_key') || '';
    const response = await fetch(`${API_BASE_URL}/api/data-viz/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tab-Session-Key': tabKey
      },
      body: formData
    });

    const data = await response.json();
    
    if (data.success) {
      // Dataset uploaded successfully
      fetchDatasets();  // Refresh dataset list
      setSelectedDataset(data.dataset);  // Auto-select new dataset
      setActiveTab('configure');  // Switch to configuration tab
      
      // Show success message
      toast.success(`Dataset "${data.dataset.filename}" uploaded successfully!`);
    } else {
      alert(data.error || 'Failed to upload file');
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Failed to upload file');
  } finally {
    setLoading(false);
  }
};
```

**Backend Dataset Processing (data_viz_controller.py):**

```python
def upload_dataset(file, user_id):
    """
    Upload and process dataset file
    """
    # Validate file extension
    allowed = {'.csv', '.xlsx', '.xls'}
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in allowed:
        return error_response("Only CSV and Excel files allowed", 400)
    
    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{secure_filename(file.filename)}"
    upload_path = os.path.join("uploads", "datasets", safe_filename)
    os.makedirs(os.path.dirname(upload_path), exist_ok=True)
    file.save(upload_path)
    
    # Read and analyze file
    if ext == '.csv':
        df = pd.read_csv(upload_path)
    else:
        df = pd.read_excel(upload_path)
    
    # Extract metadata
    dataset_info = {
        "filename": file.filename,
        "file_path": upload_path,
        "user_id": user_id,
        "uploaded_at": datetime.now(timezone.utc),
        "row_count": len(df),
        "column_count": len(df.columns),
        "column_names": df.columns.tolist(),
        "column_types": df.dtypes.astype(str).to_dict(),
        "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
        "categorical_columns": df.select_dtypes(include=['object']).columns.tolist(),
        "missing_values": df.isnull().sum().to_dict(),
        "file_size": os.path.getsize(upload_path)
    }
    
    # Save to database
    result = db.datasets.insert_one(dataset_info)
    dataset_info["_id"] = str(result.inserted_id)
    
    return success_response({
        "dataset": dataset_info,
        "preview": df.head(10).to_dict('records')
    })
```

---

### 9.3 Data Analysis

**Automatic Analysis on Upload:**

```javascript
const handleDatasetSelect = async (dataset) => {
  setSelectedDataset(dataset);
  setVizConfig({
    ...vizConfig,
    x_column: dataset.column_names[0] || '',
    y_column: dataset.column_names[1] || '',
    title: `${dataset.filename} Visualization`
  });
  setActiveTab('configure');

  setLoading(true);
  try {
    const tabKey = sessionStorage.getItem('tab_session_key') || '';
    const response = await fetch(`${API_BASE_URL}/api/data-viz/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'X-Tab-Session-Key': tabKey
      },
      body: JSON.stringify({ dataset_id: dataset.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      setAnalysis(data.analysis);
      // Analysis includes:
      // - Summary statistics
      // - Correlations
      // - Outliers
      // - Recommended charts
    }
  } catch (error) {
    console.error('Analysis error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Analysis Results:**

```json
{
  "success": true,
  "analysis": {
    "summary_stats": {
      "column_name": {
        "count": 1000,
        "mean": 45.2,
        "std": 12.5,
        "min": 10.0,
        "25%": 35.0,
        "50%": 44.0,
        "75%": 55.0,
        "max": 95.0
      }
    },
    "correlations": {
      "col1_col2": 0.85,
      "col1_col3": -0.42
    },
    "outliers": {
      "column_name": [123, 456, 789]
    },
    "recommended_charts": [
      {
        "type": "scatter",
        "x": "age",
        "y": "salary",
        "reason": "Strong correlation detected"
      },
      {
        "type": "histogram",
        "x": "score",
        "reason": "Distribution analysis"
      }
    ]
  }
}
```

---

### 9.4 Creating Visualizations

**Visualization Configuration:**

```jsx
<div className="viz-config-panel">
  <h3>Create Visualization</h3>
  
  {/* Chart Type Selection */}
  <div className="form-group">
    <label>Chart Type</label>
    <select
      value={vizConfig.chart_type}
      onChange={(e) => setVizConfig({...vizConfig, chart_type: e.target.value})}
    >
      <option value="scatter">Scatter Plot</option>
      <option value="line">Line Chart</option>
      <option value="bar">Bar Chart</option>
      <option value="histogram">Histogram</option>
      <option value="box">Box Plot</option>
      <option value="heatmap">Heatmap</option>
    </select>
  </div>
  
  {/* X-Axis Column */}
  <div className="form-group">
    <label>X-Axis Column</label>
    <select
      value={vizConfig.x_column}
      onChange={(e) => setVizConfig({...vizConfig, x_column: e.target.value})}
    >
      {selectedDataset.column_names.map(col => (
        <option key={col} value={col}>{col}</option>
      ))}
    </select>
  </div>
  
  {/* Y-Axis Column */}
  <div className="form-group">
    <label>Y-Axis Column</label>
    <select
      value={vizConfig.y_column}
      onChange={(e) => setVizConfig({...vizConfig, y_column: e.target.value})}
    >
      {selectedDataset.column_names.map(col => (
        <option key={col} value={col}>{col}</option>
      ))}
    </select>
  </div>
  
  {/* Color Column (optional) */}
  <div className="form-group">
    <label>Color By (optional)</label>
    <select
      value={vizConfig.color_column}
      onChange={(e) => setVizConfig({...vizConfig, color_column: e.target.value})}
    >
      <option value="">None</option>
      {selectedDataset.categorical_columns.map(col => (
        <option key={col} value={col}>{col}</option>
      ))}
    </select>
  </div>
  
  {/* Chart Title */}
  <div className="form-group">
    <label>Chart Title</label>
    <input
      type="text"
      value={vizConfig.title}
      onChange={(e) => setVizConfig({...vizConfig, title: e.target.value})}
      placeholder="Enter chart title"
    />
  </div>
  
  {/* Library Selection */}
  <div className="form-group">
    <label>Visualization Library</label>
    <select
      value={vizConfig.library}
      onChange={(e) => setVizConfig({...vizConfig, library: e.target.value})}
    >
      <option value="plotly">Plotly (Interactive)</option>
      <option value="matplotlib">Matplotlib (Static)</option>
      <option value="seaborn">Seaborn (Statistical)</option>
    </select>
  </div>
  
  <button
    onClick={handleGenerateVisualization}
    disabled={!vizConfig.x_column || !vizConfig.y_column || loading}
    className="btn-primary"
  >
    {loading ? 'Generating...' : 'Generate Visualization'}
  </button>
</div>
```

**Generate Visualization:**

```javascript
const handleGenerateVisualization = async () => {
  if (!selectedDataset || !vizConfig.x_column || !vizConfig.y_column) {
    toast.error('Please select columns for visualization');
    return;
  }
  
  setLoading(true);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/data-viz/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
        'X-Tab-Session-Key': sessionStorage.getItem('tab_session_key')
      },
      body: JSON.stringify({
        dataset_id: selectedDataset.id,
        chart_type: vizConfig.chart_type,
        x_column: vizConfig.x_column,
        y_column: vizConfig.y_column,
        color_column: vizConfig.color_column || null,
        title: vizConfig.title,
        library: vizConfig.library
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast.success('Visualization created successfully!');
      fetchVisualizations();  // Refresh visualization list
      setActiveTab('visualizations');  // Switch to view tab
    } else {
      toast.error(data.error || 'Failed to create visualization');
    }
  } catch (error) {
    console.error('Visualization error:', error);
    toast.error('Failed to create visualization');
  } finally {
    setLoading(false);
  }
};
```

**Backend Visualization Generation (using Plotly):**

```python
def create_visualization(data):
    """
    Generate interactive chart using Plotly
    """
    dataset = Dataset.find_by_id(data['dataset_id'])
    df = pd.read_csv(dataset['file_path']) if dataset['filename'].endswith('.csv') else pd.read_excel(dataset['file_path'])
    
    chart_type = data['chart_type']
    x_col = data['x_column']
    y_col = data['y_column']
    color_col = data.get('color_column')
    title = data.get('title', 'Data Visualization')
    
    # Create Plotly figure based on chart type
    if chart_type == 'scatter':
        fig = px.scatter(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == 'line':
        fig = px.line(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == 'bar':
        fig = px.bar(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == 'histogram':
        fig = px.histogram(df, x=x_col, color=color_col, title=title)
    elif chart_type == 'box':
        fig = px.box(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == 'heatmap':
        # Correlation heatmap
        corr = df.select_dtypes(include=[np.number]).corr()
        fig = px.imshow(corr, title=title)
    
    # Customize layout
    fig.update_layout(
        template='plotly_white',
        hovermode='closest',
        font=dict(size=12)
    )
    
    # Save as HTML
    html_str = fig.to_html(include_plotlyjs='cdn')
    
    # Save visualization metadata
    viz_data = {
        "dataset_id": data['dataset_id'],
        "chart_type": chart_type,
        "title": title,
        "config": data,
        "html": html_str,
        "created_at": datetime.now(timezone.utc),
        "user_id": user_id
    }
    
    result = db.visualizations.insert_one(viz_data)
    
    return success_response({"visualization_id": str(result.inserted_id)})
```

---

## 10. Profile Management

### 10.1 Profile Overview

User profiles contain personal information, professional details, and system settings.

**Profile Sections:**
1. Personal Information
2. Education
3. Certificates
4. Organization Details
5. Skills & Expertise

---

### 10.2 Personal Information

**PersonalInfo Component (PersonalInfo.js - lines 1-150):**

```javascript
const PersonalInfo = ({ data, user, onUpdate }) => {
  Editable Fields:
  
  1. Mobile Number *
     - Format: +1 234 567 8900
     - Validation: Phone number format
     
  2. Address *
     - Textarea (3 rows)
     - Example: "123 Main St, Apt 4B"
     
  3. City *
     - Text input
     - Example: "New York"
     
  4. Country *
     - Text input
     - Example: "United States"
  
  Read-Only Fields:
  - Name (from user account)
  - Email (from user account)
  
  Edit Process:
  1. Click "Edit" button (Pencil icon)
  2. Fields become editable
  3. Make changes
  4. Click "Save" button
  5. Validation occurs
  6. Success message displays
  7. Edit mode exits
}
```

**Save Personal Info:**

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setMessage({ type: "", text: "" });

  try {
    await onUpdate(formData);  // Call parent update function
    setMessage({ type: "success", text: "Personal information updated successfully!" });
    setIsEditing(false);
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  } catch (err) {
    setMessage({ type: "error", text: err.message || "Failed to update information" });
  } finally {
    setLoading(false);
  }
};
```

---

### 10.3 Education Section

**Education Component (Education.js):**

```jsx
<div className="profile-section">
  <div className="section-header">
    <h2>Education</h2>
    <button onClick={() => setShowForm(true)}>
      <Plus size={16} /> Add Education
    </button>
  </div>

  {/* Education List */}
  <div className="education-list">
    {education.map(edu => (
      <div key={edu._id} className="education-item">
        <div className="edu-icon">🎓</div>
        <div className="edu-details">
          <h3>{edu.degree}</h3>
          <p className="institution">{edu.institution}</p>
          <p className="field">{edu.field_of_study}</p>
          <p className="dates">
            {formatDate(edu.start_date)} - {edu.end_date ? formatDate(edu.end_date) : 'Present'}
          </p>
          {edu.grade && <p className="grade">Grade: {edu.grade}</p>}
          {edu.description && <p className="description">{edu.description}</p>}
        </div>
        <div className="edu-actions">
          <button onClick={() => handleEdit(edu)}>
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={() => handleDelete(edu._id)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    ))}
  </div>

  {/* Add/Edit Form Modal */}
  {showForm && (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{editingId ? 'Edit Education' : 'Add Education'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            name="degree"
            placeholder="Degree (e.g., Bachelor of Science)"
            value={formData.degree}
            onChange={handleChange}
            required
          />
          <input
            name="institution"
            placeholder="Institution"
            value={formData.institution}
            onChange={handleChange}
            required
          />
          <input
            name="field_of_study"
            placeholder="Field of Study"
            value={formData.field_of_study}
            onChange={handleChange}
            required
          />
          <input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            required
          />
          <input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
          />
          <input
            name="grade"
            placeholder="Grade/GPA (optional)"
            value={formData.grade}
            onChange={handleChange}
          />
          <textarea
            name="description"
            placeholder="Description (optional)"
            value={formData.description}
            onChange={handleChange}
            rows="3"
          />
          <div className="form-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )}
</div>
```

---

### 10.4 Certificates Section

**Certificates Component (Certificates.js):**

Similar structure to Education, with fields:
- Certificate Name
- Issuing Organization
- Issue Date
- Expiration Date (optional)
- Credential ID (optional)
- Credential URL (optional)
- Description

**Features:**
- Add multiple certificates
- Edit existing certificates
- Delete certificates
- Verify credential links
- Display expiration warnings

---

### 10.5 Organization Details

**Organization Component (Organization.js):**

```javascript
Fields:
1. Company Name
   - Current employer
   
2. Job Title
   - Current position
   
3. Department
   - Team or division
   
4. Start Date
   - Employment start date
   
5. Manager
   - Reporting manager (selected from users)
   
6. Employee ID
   - Company employee identifier
   
7. Work Location
   - Office location
   
8. Work Type
   - Options: Remote, Hybrid, On-site
```

--- Keep project descriptions updated
- ✅ Assign appropriate team members
- ✅ Set clear milestones
- ✅ Review progress weekly

### Team Collaboration
- ✅ Use team chat for quick questions
- ✅ Keep conversations in relevant channels
- ✅ Share important files in chat
- ✅ Update tasks when status changes

### AI Assistant
- ✅ Be specific in your questions
- ✅ Upload files for detailed analysis
- ✅ Use clear image descriptions
- ✅ Keep conversations organized by topic
- ✅ Review AI suggestions carefully

---

## Common Tasks Quick Reference

| Task | How To |
|------|--------|
| Create Task | Projects → + New Task |
| Update Status | Drag in Kanban or edit task |
| Assign Task | Edit task → Change "Assigned To" |
| Add to Sprint | Sprint Details → Add Tasks |
| Send Message | Team Chat → Type & Send |
| Generate Image | AI Assistant → Describe → Generate Image |
| View Reports | DOIT Analytics → Select Chart |
| Upload File | Task/Chat/AI → Upload Button |
| Change Priority | Edit Task → Change Priority |
| View My Tasks | Click "My Tasks" in menu |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Send message/Submit form |
| Shift+Enter | New line in message |
| Esc | Close modal/dialog |
| Ctrl+K | Quick search (planned) |

---

## Mobile Usage

### Mobile Browser
- DOIT works on mobile browsers
- Responsive design adapts to screen size
- All features available
- Touch-friendly controls

### Mobile Tips
- Use landscape mode for Kanban board
- Pinch to zoom on charts
- Swipe to navigate (where available)
- Tap and hold for quick actions

---

## Getting Help

### In-App Help
- Look for (?) icons for tooltips
- Hover over elements for hints
- Error messages provide guidance

### AI Assistant Help
- Ask DOIT-AI any question about using the system
- Examples:
  - "How do I create a project?"
  - "What do the different task statuses mean?"
  - "How can I export a report?"

### Common Issues

**Can't Login:**
- Check email and password
- Ensure Caps Lock is off
- Contact admin if forgotten password

**Tasks Not Updating:**
- Refresh page (F5)
- Check internet connection
- Verify you have permission

**Kanban Not Loading:**
- Check if you're assigned to project
- Refresh browser
- Clear browser cache

**AI Not Responding:**
- Check internet connection
- Verify backend server is running
- Check browser console for errors

---

## Role-Specific Features

### Viewer
- Can view projects, tasks, sprints
- Cannot create or edit
- Can use AI Assistant
- Can participate in team chat

### Team Member
- Everything Viewer can do
- Create and edit own tasks
- Update task status
- Complete tasks
- Upload files

### Manager
- Everything Team Member can do
- Create and edit any task
- Create projects
- Manage sprints
- Assign team members

### Admin
- Everything Manager can do
- Delete projects and tasks
- Manage users
- Access all projects
- System configuration

### Super Admin
- Full system access
- User management
- System dashboard
- All data export
- System settings

---

## What to Do Next

### New Team Member
1. ✅ Complete your profile
2. ✅ Browse existing projects
3. ✅ Check "My Tasks"
4. ✅ Join team chat channels
5. ✅ Try the AI Assistant

### Project Manager
1. ✅ Create your first project
2. ✅ Add team members
3. ✅ Create initial tasks
4. ✅ Set up first sprint
5. ✅ Monitor dashboard

### Admin
1. ✅ Review system dashboard
2. ✅ Set up users and roles
3. ✅ Create project templates
4. ✅ Configure team structure
5. ✅ Set up analytics

---

## Support & Resources

### Documentation
- Read all knowledge base articles
- Check API documentation at /docs
- Review this quick start guide

### AI Assistant
- Your personal help assistant
- Available 24/7
- Ask any question about DOIT

### Contact
- Reach out to your system administrator
- Report bugs to development team
- Suggest features via feedback form
