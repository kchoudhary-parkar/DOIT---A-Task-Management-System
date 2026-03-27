# DOIT Project - Features Documentation

## Overview

DOIT is a comprehensive **Agile Project Management System** built with FastAPI (backend) and React (frontend), featuring real-time collaboration via WebSocket, AI-powered assistance through Azure OpenAI (GPT-5.2-chat), image generation via FLUX-1.1-pro, GitHub integration for developer activity tracking, and advanced data visualization capabilities.

### Technology Stack
- **Backend**: Python 3.10+, FastAPI 0.109+, MongoDB, WebSocket
- **Frontend**: React 18, dnd-kit (drag-and-drop), Recharts, Axios
- **AI**: Azure OpenAI (GPT-5.2-chat), Azure AI Foundry (FLUX-1.1-pro)
- **Real-time**: WebSocket connections for Kanban board and team chat
- **GitHub Integration**: Webhook-based commit tracking, branch/PR monitoring
- **Data Viz**: Plotly, Seaborn, Matplotlib for chart generation

### Core Features Summary
1. **Authentication & Authorization**: JWT-based with multi-tab session management
2. **Project Management**: Full CRUD with team member roles
3. **Task Management**: Kanban board with real-time updates, labels, attachments, GitHub activity
4. **Sprint Planning**: Agile sprint management with burndown charts
5. **Team Collaboration**: Real-time team chat with file sharing
6. **AI Assistant**: ChatGPT-like interface with file analysis and image generation
7. **Data Visualization**: Upload CSV/Excel and create interactive charts
8. **GitHub Integration**: Automatic commit tracking, branch/PR monitoring
9. **Dashboard & Analytics**: Project progress, task completion rates, team performance
10. **Calendar & Timeline**: Task due dates and sprint timelines

---

## 1. User Authentication & Authorization

### 1.1 User Registration

**Component**: `frontend/src/pages/Auth/RegisterPage.js` (implied)  
**Backend**: `POST /api/auth/register`  
**Controller**: `auth_controller.py::register_user()`

#### Features & Implementation:
- **Email-based signup** with uniqueness validation against MongoDB
- **Password validation**: 
  - Minimum 8 characters
  - Maximum 128 characters
  - Hashed using `bcrypt` with 10 salt rounds
  - Plain text never stored in database
- **Automatic role assignment**: Default role is `team_member`
- **Email format validation**: Uses Pydantic `EmailStr` for RFC 5322 compliance

#### Registration Flow with Example:

```javascript
// Frontend: services/api.js
export const authAPI = {
  register: async (userData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "John Doe",
        email: "john.doe@example.com",
        password: "SecurePass123",
        department: "Engineering"
      })
    });
    return await response.json();
  }
};
```

**Backend Processing**:
1. Validate email uniqueness: `User.find_by_email(email)` returns `None`
2. Hash password: `bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10))`
3. Create user document in MongoDB with `role: "team_member"`, `token_version: 1`
4. Generate JWT token with 24-hour expiration
5. Generate tab session key: `f"tab_{random_string}_{timestamp}"`
6. Return `{ success: true, token, user, message }`

**Example Success Response**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "674d5e8f1234567890abcdef",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "team_member",
    "department": "Engineering"
  }
}
```

---

### 1.2 User Login & Session Management

**Backend**: `POST /api/auth/login`  
**Controller**: `auth_controller.py::login_user()`

#### Features:
- **JWT token generation** with 24-hour expiration
- **Multi-tab session management** via `X-Tab-Session-Key` header
  - Each browser tab gets unique session key stored in `sessionStorage`
  - Prevents token theft across tabs
  - Session records stored in `user_sessions` collection
- **Token version tracking** for forced logout (e.g., password change)
- **Last login timestamp** tracking in user document
- **Active sessions management**: View all active sessions, logout from specific device

#### Login Flow with Code Example:

```javascript
// Frontend: AuthContext.js
const login = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token in localStorage (persistent across tabs)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', data.user._id);
      
      // Generate and store tab session key (unique per tab)
      const tabKey = `tab_${Math.random().toString(36).substr(2, 12)}_${Date.now()}`;
      sessionStorage.setItem('tab_session_key', tabKey);
      
      setUser(data.user);
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

**Backend JWT Token Structure**:
```python
# auth_utils.py::create_access_token()
payload = {
    "user_id": str(user_id),
    "email": email,
    "role": role,
    "department": department,
    "token_version": token_version,  # For forced logout
    "exp": datetime.utcnow() + timedelta(hours=24),
    "iat": datetime.utcnow()
}
token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
```

**Session Record in MongoDB**:
```json
{
  "_id": "ObjectId(...)",
  "user_id": "674d5e8f1234567890abcdef",
  "session_key": "tab_abc123_1707754800",
  "device_info": "Chrome on Windows 10",
  "ip_address": "192.168.1.100",
  "last_activity": "2026-02-12T15:30:00Z",
  "created_at": "2026-02-12T10:00:00Z",
  "expires_at": "2026-02-13T10:00:00Z"
}
```

---

### 1.3 Role-Based Access Control (RBAC)

**Middleware**: `role_middleware.py`  
**Authentication Check**: `dependencies.py::get_current_user()`

#### Role Hierarchy (5 Levels):

| Role | Code | Permissions |
|------|------|-------------|
| **Super Admin** | `super_admin` | Full system access, user management, system dashboard |
| **Admin** | `admin` | Manage projects, users (except super admins), delete resources |
| **Manager** | `manager` | Create projects, manage sprints, edit any task in their projects |
| **Team Member** | `team_member` | Create tasks, edit own tasks, participate in sprints |
| **Viewer** | `viewer` | Read-only access to assigned projects |

#### Implementation Example:

```python
# middleware/role_middleware.py
def require_role(allowed_roles: list):
    """Decorator to check user role"""
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            user = request.state.user  # Set by get_current_user dependency
            if user["role"] not in allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
                )
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# Usage in routers
@router.post("/users", dependencies=[Depends(get_current_user)])
@require_role(["admin", "super_admin"])
async def create_user(request: Request):
    # Only admins and super admins can create users
    pass
```

#### Project-Level Permissions:
In addition to global roles, projects have member-specific roles:
- **Owner**: User who created the project (full control)
- **Admin**: Can manage team members, edit project settings
- **Member**: Can create/edit tasks, participate in sprints

```python
# Example project permission check
def check_project_access(project_id, user_id, required_role="member"):
    project = Project.find_by_id(project_id)
    if project["user_id"] == user_id:  # Owner
        return True
    
    # Check if user is in members array with sufficient role
    member = next((m for m in project["members"] if m["user_id"] == user_id), None)
    if member and member["role"] in ["admin", "member"]:
        return True
    
    return False
```

---

### 1.4 Forced Logout & Session Management

**Backend**: `POST /api/auth/logout-all`, `POST /api/auth/change-password`

#### Token Version Mechanism:
When user changes password or admin forces logout, `token_version` is incremented in user document. All existing tokens become invalid immediately.

```python
# auth_controller.py::change_password()
def change_password(body_str, user_id):
    # ... validate old password ...
    
    # Hash new password
    hashed_password = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
    
    # Increment token_version to invalidate all existing tokens
    User.update(user_id, {
        "password": hashed_password,
        "token_version": user["token_version"] + 1
    })
    
    # Delete all sessions
    user_sessions.delete_many({"user_id": user_id})
    
    return success_response("Password changed. Please login again.")
```

#### Multi-Device Session Management:

```javascript
// Frontend: View active sessions
const getActiveSessions = async () => {
  const response = await fetch('/api/auth/sessions', {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  
  // Response:
  // {
  //   "sessions": [
  //     {
  //       "session_key": "tab_abc123_...",
  //       "device_info": "Chrome on Windows",
  //       "last_activity": "2026-02-12T15:30:00Z",
  //       "is_current": true
  //     },
  //     {
  //       "session_key": "tab_xyz789_...",
  //       "device_info": "Safari on iPhone",
  //       "last_activity": "2026-02-12T14:00:00Z",
  //       "is_current": false
  //     }
  //   ]
  // }
};

// Logout specific session
const logoutSession = async (sessionKey) => {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ session_key: sessionKey })
  });
};
```

---

### 1.5 Authentication Security Features

#### Password Security:
- **Hashing**: Bcrypt with 10 salt rounds (cost factor)
- **Validation**: 
  - Minimum 8 characters
  - Maximum 128 characters (prevents DoS via bcrypt)
  - No requirements for special characters (follows NIST guidelines)
- **Storage**: Only hashed passwords stored in database
- **Timing Attack Prevention**: Bcrypt's built-in constant-time comparison

#### Token Security:
- **JWT Secret**: 256-bit random key stored in environment variable
- **Token Expiration**: 24 hours (not configurable to enforce regular re-authentication)
- **Token Invalidation**: Via `token_version` increment
- **HTTPS Only**: Tokens transmitted over HTTPS in production

#### Session Security:
- **Tab Session Keys**: Unique per browser tab, stored in `sessionStorage` (cleared on tab close)
- **CSRF Protection**: Tab session keys prevent CSRF attacks
- **Session Timeout**: Inactive sessions expire after 24 hours
- **IP Tracking**: Sessions record IP address for audit log

---

---

## 2. Project Management

**Frontend**: `ProjectsPage.js`, `ProjectCard.js`, `ProjectForm.js`  
**Backend**: `POST/GET/PUT/DELETE /api/projects`  
**Controller**: `project_controller.py`

### 2.1 Project Creation & Configuration

#### Features:
- **Project naming** with automatic prefix generation (e.g., "Website Redesign" → "WR")
- **Description** with rich text support (React textarea)
- **Date range**: Start and end dates with validation (end > start)
- **Priority levels**: Low, Medium, High, Critical (color-coded in UI)
- **GitHub repository URL** integration for commit tracking
- **Tag/categorization** system for filtering
- **Team member assignment** during creation

#### Auto-Generated Project Prefix:
```python
# utils/ticket_utils.py::generate_project_prefix()
def generate_project_prefix(project_name):
    """
    Generate 2-3 letter prefix from project name
    Examples:
        "Website Redesign" → "WR"
        "Customer Dashboard" → "CD"
        "API Development" → "AD"
        "DOIT 2.0" → "DOIT"
    """
    # Remove common words
    stop_words = {"the", "a", "an", "of", "for", "to", "in", "on", "at"}
    words = [w for w in project_name.split() if w.lower() not in stop_words]
    
    # Take first letters of first 2-3 words
    if len(words) >= 2:
        prefix = ''.join([w[0].upper() for w in words[:2]])
    else:
        prefix = project_name[:3].upper()
    
    # Ensure uniqueness by checking existing prefixes
    # ... add number suffix if needed ...
    
    return prefix
```

**Usage**: Task tickets are named as `{PROJECT_PREFIX}-{NUMBER}` (e.g., "WR-001", "WR-002")

#### Project Creation Flow:

```javascript
// Frontend: ProjectsPage.js
const handleCreateProject = async (formData) => {
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: "Website Redesign",
        description: "Complete overhaul of company website with modern design",
        start_date: "2026-02-01T00:00:00Z",
        end_date: "2026-04-30T23:59:59Z",
        priority: "high",
        repo_url: "https://github.com/company/website-redesign",
        tags: ["frontend", "design", "client-facing"]
      })
    });
    
    const data = await response.json();
    // data.project includes auto-generated prefix: "WR"
  } catch (error) {
    console.error('Project creation failed:', error);
  }
};
```

**Backend Project Document**:
```json
{
  "_id": "ObjectId(...)",
  "name": "Website Redesign",
  "prefix": "WR",
  "description": "Complete overhaul of company website with modern design",
  "user_id": "674d5e8f1234567890abcdef",
  "start_date": "2026-02-01T00:00:00Z",
  "end_date": "2026-04-30T23:59:59Z",
  "priority": "high",
  "status": "active",
  "repo_url": "https://github.com/company/website-redesign",
  "github_webhook_id": null,
  "tags": ["frontend", "design", "client-facing"],
  "members": [
    {
      "user_id": "674d5e8f1234567890abcde0",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "admin",
      "added_at": "2026-02-01T10:00:00Z"
    }
  ],
  "created_at": "2026-02-01T09:00:00Z",
  "updated_at": "2026-02-01T09:00:00Z"
}
```

---

### 2.2 Project Dashboard & Filtering

**Component**: `ProjectsPage.js` with `ProjectCard.js` grid layout

#### Project Card Display:
Each project card shows:
- **Project name** and prefix badge
- **Progress bar** (completed tasks / total tasks)
- **Status badge**: Planning, Active, On Hold, Completed, Archived
- **Priority indicator**: Color-coded border (Critical=red, High=orange, Medium=yellow, Low=green)
- **Team size icon** with member count
- **Due date** with overdue warning if past end date
- **Quick actions**: View details, Edit (owners/admins only), Archive

#### Filtering & Sorting:

```javascript
// Frontend: ProjectsPage.js filtering state
const [filters, setFilters] = useState({
  status: 'all', // 'all', 'active', 'completed', 'on_hold'
  priority: 'all', // 'all', 'critical', 'high', 'medium', 'low'
  sortBy: 'updated_at', // 'name', 'created_at', 'updated_at', 'priority'
  sortOrder: 'desc' // 'asc', 'desc'
});

// Apply filters
const filteredProjects = projects
  .filter(p => filters.status === 'all' || p.status === filters.status)
  .filter(p => filters.priority === 'all' || p.priority === filters.priority)
  .sort((a, b) => {
    // Sort logic based on filters.sortBy and filters.sortOrder
  });
```

---

### 2.3 Project Details View

**Component**: `ProjectDetailsPage.js` (implied from structure)

#### Sections:
1. **Header Section**:
   - Project name, prefix, priority badge, status dropdown
   - Edit/Delete buttons (owners/admins only)
   - GitHub repo link (if configured)

2. **Overview Tab**:
   - Project description
   - Date range with progress timeline
   - Team members list with roles
   - Quick stats cards:
     - Total tasks
     - Completed tasks
     - Active sprint name
     - Team size

3. **Tasks Tab**:
   - Kanban board for this project
   - Task list view option
   - Create new task button

4. **Sprints Tab**:
   - List of all sprints (active, planned, completed)
   - Create sprint button
   - Sprint burndown charts

5. **Team Tab**:
   - Team member management
   - Add member form (search by email/name)
   - Member role assignment (admin/member)
   - Remove member action

6. **Activity Tab**:
   - Activity timeline showing:
     - Task creations/updates
     - Sprint start/completion
     - Member additions/removals
     - GitHub commits/PRs linked to project

---

### 2.4 Team Member Management

**Backend**: `POST/GET/DELETE /api/projects/{project_id}/members`  
**Controller**: `member_controller.py`

#### Adding Team Members:

```javascript
// Frontend: MemberManager.js
const addMember = async (userId, role = 'member') => {
  try {
    const response = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        user_id: userId,
        role: role // 'admin' or 'member'
      })
    });
    
    const data = await response.json();
    // Project members array is updated with denormalized user data
  } catch (error) {
    console.error('Failed to add member:', error);
  }
};
```

**Backend Processing**:
1. Verify requester is project owner or admin
2. Check if user exists: `User.find_by_id(user_id)`
3. Check if already a member (prevent duplicates)
4. Add to `members` array with denormalized data (name, email, role)
5. Return updated project

**Member Roles**:
- **Admin**: Can add/remove members, edit project settings, create sprints, delete tasks
- **Member**: Can create tasks, edit own tasks, participate in sprints

#### Removing Team Members:

```python
# member_controller.py::remove_member()
def remove_member(project_id, user_id_to_remove, current_user_id):
    # Only owner or admins can remove members
    project = Project.find_by_id(project_id)
    
    if project["user_id"] != current_user_id:
        # Check if current user is admin
        member = next((m for m in project["members"] if m["user_id"] == current_user_id), None)
        if not member or member["role"] != "admin":
            return error_response("Only project owner or admin can remove members", 403)
    
    # Cannot remove project owner
    if user_id_to_remove == project["user_id"]:
        return error_response("Cannot remove project owner", 400)
    
    Project.remove_member(project_id, user_id_to_remove)
    return success_response("Member removed successfully")
```

---

### 2.5 Project Status Workflow

#### Status Lifecycle:

```
Planning → Active → [On Hold] → Completed → Archived
```

- **Planning**: Initial requirements gathering, team assembly
- **Active**: Development in progress, sprints running
- **On Hold**: Temporarily paused (budget issues, dependencies, etc.)
- **Completed**: All tasks marked as Done, project goals achieved
- **Archived**: Historical record, no further updates allowed

#### Status Change Rules:
- Owner/Admin can change status anytime
- Completing a project requires confirmation (modal dialog)
- Archived projects become read-only
- On Hold → Active transition requires reason (optional field)

---

## 3. Task Management System

**Frontend**: `KanbanBoard.js`, `TaskCard.js`, `TaskDetailModal.js`, `TaskForm.js`  
**Backend**: `POST/GET/PUT/DELETE /api/tasks`  
**Controller**: `task_controller.py`  
**WebSocket**: `WS /api/tasks/ws/project/{project_id}`

### 3.1 Task Creation with Advanced Features

#### Task Fields:
- **ticket_id**: Auto-generated (e.g., "WR-001")
- **title**: Task title (required, 3-100 chars)
- **description**: Detailed description with markdown support
- **project_id**: Project assignment (required)
- **assignee_id**: User assignment (optional, can be auto-assigned)
- **status**: To Do, In Progress, Dev Complete, Testing, Done, Closed
- **priority**: Low, Medium, High, Critical
- **task_type**: Task, Bug, Feature, Improvement
- **due_date**: Deadline (optional)
- **estimated_hours**: Time estimation (optional)
- **actual_hours**: Time tracking (filled as work progresses)
- **story_points**: Agile estimation (1, 2, 3, 5, 8, 13, 21)
- **labels**: Color-coded tags (e.g., "frontend", "urgent", "technical-debt")
- **attachments**: Files, images, documents
- **links**: Related tasks (blocks, is blocked by, relates to)
- **sprint_id**: Sprint assignment (optional)
- **approval_required**: Flag for review workflow

#### Task Creation Example:

```javascript
// Frontend: TaskForm.js
const createTask = async (taskData) => {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title: "Implement user authentication",
      description: "## Requirements\n- JWT token generation\n- Password hashing with bcrypt\n- Session management",
      project_id: "674d5e8f1234567890project",
      assignee_id: "674d5e8f1234567890abcdef",
      status: "To Do",
      priority: "high",
      task_type: "feature",
      due_date: "2026-03-15T23:59:59Z",
      estimated_hours: 16,
      story_points: 8,
      labels: ["backend", "security", "authentication"],
      approval_required: true
    })
  });
  
  const data = await response.json();
  // data.task includes auto-generated ticket_id: "WR-001"
};
```

**Backend Ticket ID Generation**:
```python
# utils/ticket_utils.py::generate_ticket_id()
def generate_ticket_id(project):
    """
    Generate unique ticket ID for task
    Format: {PROJECT_PREFIX}-{NUMBER}
    Example: WR-001, WR-002, ..., WR-999
    """
    prefix = project["prefix"]
    
    # Find highest existing ticket number for this project
    from database import db
    last_task = db.tasks.find_one(
        {"project_id": project["_id"]},
        sort=[("ticket_number", -1)]
    )
    
    next_number = (last_task["ticket_number"] + 1) if last_task else 1
    ticket_id = f"{prefix}-{next_number:03d}"  # Zero-padded (001, 002, ...)
    
    return ticket_id, next_number
```

---

### 3.2 Kanban Board with Real-Time Sync

**Component**: `KanbanBoard.js` using `@dnd-kit/core` for drag-and-drop  
**WebSocket**: Connected via `useKanbanWebSocket` hook

#### Column Configuration:

```javascript
const COLUMNS = [
  { id: "To Do", title: "TO DO", color: "#7a869a" },
  { id: "In Progress", title: "IN PROGRESS", color: "#2684ff" },
  { id: "Dev Complete", title: "DEV COMPLETE", color: "#6554c0" },
  { id: "Testing", title: "TESTING", color: "#ffab00" },
  { id: "Done", title: "DONE", color: "#36b37e" }
];

// Strict workflow order validation
const WORKFLOW_ORDER = ["To Do", "In Progress", "Dev Complete", "Testing", "Done"];
```

#### Drag-and-Drop Workflow:

```javascript
// KanbanBoard.js - Drag handlers
const handleDragEnd = async (event) => {
  const { active, over } = event;
  
  if (!over) return;
  
  const activeTask = tasks.find(t => t._id === active.id);
  const targetStatus = over.id; // Column ID
  
  // Validate workflow transition
  if (!isValidTransition(activeTask.status, targetStatus)) {
    toast.error(`Tasks must move sequentially. Move to ${getRequiredPreviousStatus(targetStatus)} first.`);
    return; // Revert UI
  }
  
  // Optimistic UI update
  setTasks(prev => prev.map(t => 
    t._id === activeTask._id ? { ...t, status: targetStatus } : t
  ));
  
  try {
    // API call to update task status
    await taskAPI.update(activeTask._id, { status: targetStatus });
    
    // WebSocket broadcast to other users (automatic)
  } catch (error) {
    // Revert on error
    setTasks(prev => prev.map(t => 
      t._id === activeTask._id ? { ...t, status: activeTask.status } : t
    ));
    toast.error('Failed to update task status');
  }
};
```

#### Workflow Validation:
- **Sequential Movement**: Tasks must progress through columns in order
  - ✅ To Do → In Progress
  - ✅ In Progress → Dev Complete
  - ❌ To Do → Testing (skip not allowed)
- **Backward Movement**: Allowed anytime (move back to previous stages)
- **Done Restriction**: Tasks in "Done" or "Closed" status cannot be moved
- **Testing → Done**: May require approval from project owner/admin if `approval_required` flag is set

---

### 3.3 Real-Time WebSocket Synchronization

**WebSocket Endpoint**: `WS /api/tasks/ws/project/{project_id}`  
**Implementation**: `useKanbanWebSocket.js` custom hook

#### Connection Setup:

```javascript
// utils/useKanbanWebSocket.js
export default function useKanbanWebSocket(projectId, onMessage, options = {}) {
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    if (!projectId || !options.enabled) return;
    
    const token = localStorage.getItem('token');
    const wsUrl = `ws://localhost:8000/api/tasks/ws/project/${projectId}?token=${token}`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('[Kanban WS] Connected');
      setConnectionStatus('connected');
      setIsConnected(true);
      
      // Start heartbeat (ping every 30 seconds)
      heartbeatInterval = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data); // Call provided handler
    };
    
    websocket.onclose = () => {
      console.log('[Kanban WS] Disconnected');
      setConnectionStatus('disconnected');
      setIsConnected(false);
      
      // Auto-reconnect logic
      if (reconnectAttempts < options.reconnectAttempts) {
        setTimeout(connect, options.reconnectInterval);
        reconnectAttempts++;
      }
    };
    
    setWs(websocket);
    return () => websocket.close();
  }, [projectId, options.enabled]);
  
  return { connectionStatus, isConnected };
}
```

#### WebSocket Message Types:

**1. Connection Confirmation**:
```json
{
  "type": "connection",
  "channel_id": "kanban_674d5e8f1234567890project",
  "project_id": "674d5e8f1234567890project",
  "message": "Connected to Kanban board"
}
```

**2. Task Created** (broadcast to all connected users):
```json
{
  "type": "task_created",
  "task": {
    "_id": "674d5e8f1234567890task01",
    "ticket_id": "WR-001",
    "title": "Implement user authentication",
    "status": "To Do",
    "assignee_name": "John Doe",
    "priority": "high",
    "created_at": "2026-02-13T14:00:00Z"
  },
  "user_id": "674d5e8f1234567890abcdef",
  "user_name": "John Doe"
}
```

**3. Task Updated** (drag-and-drop status change):
```json
{
  "type": "task_updated",
  "task": {
    "_id": "674d5e8f1234567890task01",
    "status": "In Progress",
    "updated_at": "2026-02-13T14:05:00Z"
  },
  "user_id": "674d5e8f1234567890abcdef",
  "user_name": "John Doe",
  "updated_fields": ["status"],
  "changes": {
    "status": { "old": "To Do", "new": "In Progress" }
  }
}
```

**4. Task Deleted**:
```json
{
  "type": "task_deleted",
  "task_id": "674d5e8f1234567890task01",
  "user_id": "674d5e8f1234567890abcdef",
  "user_name": "John Doe"
}
```

#### Frontend WebSocket Handler:

```javascript
// KanbanBoard.js
const handleWebSocketMessage = useCallback((data) => {
  switch (data.type) {
    case 'task_created':
      setTasks(prev => {
        if (prev.some(t => t._id === data.task._id)) return prev; // Avoid duplicates
        toast.info(`${data.user_name} created: ${data.task.title}`);
        return [...prev, data.task];
      });
      break;
      
    case 'task_updated':
      setTasks(prev => prev.map(task =>
        task._id === data.task._id ? { ...task, ...data.task } : task
      ));
      
      // Only show notification if updated by different user
      if (data.user_id !== localStorage.getItem('user_id')) {
        toast.info(`${data.user_name} moved task to ${data.task.status}`);
      }
      break;
      
    case 'task_deleted':
      setTasks(prev => prev.filter(t => t._id !== data.task_id));
      toast.info(`${data.user_name} deleted a task`);
      break;
  }
}, []);
```

---

### 3.4 Task Detail Modal with Advanced Features

**Component**: `TaskDetailModal.js` (1253 lines - comprehensive)

#### Sections:

**1. Header**:
- Ticket ID badge (e.g., "WR-001")
- Title (editable inline)
- Status dropdown (with workflow validation)
- Priority selector
- Close button

**2. Main Content Tabs**:

**A. Details Tab**:
- **Description** (markdown editor)
- **Assignee** (dropdown search)
- **Due date** (date picker)
- **Story points** (Fibonacci sequence buttons: 1, 2, 3, 5, 8, 13, 21)
- **Estimated hours** / **Actual hours**
- **Time tracking section**: Start/stop timer (future feature)

**B. Labels Tab**:
```javascript
// Add label functionality
const addLabel = async (labelName, color) => {
  await taskAPI.addLabel(task._id, {
    name: labelName,
    color: color // hex color code
  });
  
  // Update task locally
  setTask(prev => ({
    ...prev,
    labels: [...prev.labels, { name: labelName, color }]
  }));
};

// Label display
<div className="labels">
  {task.labels.map(label => (
    <span 
      key={label.name}
      className="label"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
      <button onClick={() => removeLabel(label.name)}>×</button>
    </span>
  ))}
</div>
```

**C. Attachments Tab**:
- **File upload** (drag-and-drop or click)
- **Supported types**: Images (jpg, png, gif, svg), Documents (pdf, doc, docx), Code (txt, md, json)
- **Max size**: 10MB per file
- **Preview**: Images shown inline, documents downloadable
- **Storage**: `/uploads/task_attachments/` directory

```javascript
// Upload attachment
const handleFileUpload = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/tasks/${task._id}/attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}'
    },
    body: formData
  });
  
  const data = await response.json();
  // data.attachment: { name, url, type, size }
};
```

**D. Links Tab**:
- **Link types**:
  - **Blocks**: This task blocks another task
  - **Is Blocked By**: This task is blocked by another task
  - **Relates To**: General relationship
- **Link creation**:
  ```javascript
  const linkTask = async (linkedTicketId, linkType) => {
    await taskAPI.addLink(task._id, {
      linked_task_id: linkedTicketId,
      link_type: linkType // 'blocks', 'is_blocked_by', 'relates_to'
    });
  };
  ```
- **Visual representation**: Task cards with link type badges

**E. Comments Tab**:
- **Comment thread** with timestamps
- **@mentions** (future: notify mentioned users)
- **Markdown support** in comments
- **Edit/delete** own comments
- **Real-time updates** (comments shown to all modal viewers)

```javascript
// Add comment
const addComment = async () => {
  const response = await taskAPI.addComment(task._id, {
    text: commentText,
    user_id: user.id,
    user_name: user.name
  });
  
  setComments(prev => [...prev, response.comment]);
  setCommentText('');
};
```

**F. Development Tab** (GitHub Integration):
- **Branches** linked to this task
- **Commits** with ticket ID in message
- **Pull Requests** associated with task
- **Activity timeline** showing git events

**G. Activity Tab**:
- **Activity log** showing all changes:
  - Task created
  - Status changed
  - Assignee updated
  - Labels added/removed
  - Comments posted
  - Files attached
  - Sprint assigned
  - Approval granted
- **Filter activities**: All, Changes Only, Comments Only
- **Pagination**: 5 items per page

```javascript
// Activity filtering
const getFilteredActivities = () => {
  const activities = task.activities || [];
  
  switch (activityFilter) {
    case 'changes':
      return activities.filter(a => a.type === 'field_change');
    case 'comments':
      return activities.filter(a => a.type === 'comment');
    default:
      return activities;
  }
};

// Paginated display
const paginatedActivities = getFilteredActivities()
 .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
```

---

### 3.5 Task Approval Workflow

**Feature**: Tasks with `approval_required: true` need owner/admin approval before closing

#### Approval Process:

```javascript
// TaskDetailModal.js
const approveTask = async () => {
  if (!window.confirm('Approve and close this task?')) return;
  
  try {
    await taskAPI.approveTask(task._id);
    
    // Update task status to "Closed"
    setTask(prev => ({ ...prev, status: 'Closed', approved_at: new Date(), approved_by: user.id }));
    
    toast.success('Task approved and closed');
    onUpdate(task._id, { status: 'Closed' });
  } catch (error) {
    toast.error('Approval failed: ' + error.message);
  }
};
```

**Backend Approval**:
```python
# task_controller.py::approve_task()
def approve_task(task_id, user_id):
    task = Task.find_by_id(task_id)
    project = Project.find_by_id(task["project_id"])
    
    # Only owner or admin can approve
    if project["user_id"] != user_id:
        member = next((m for m in project["members"] if m["user_id"] == user_id), None)
        if not member or member["role"] != "admin":
            return error_response("Only project owner or admin can approve tasks", 403)
    
    # Update task status to Closed
    Task.update(task_id, {
        "status": "Closed",
        "approved_at": datetime.utcnow(),
        "approved_by": user_id
    })
    
    # Log activity
    Task.add_activity(task_id, {
        "type": "approved",
        "user_id": user_id,
        "message": "Task approved and closed"
    })
    
    return success_response("Task approved successfully")
```

---

### 3.6 Task Filtering & Search

**Component**: `MyTasksPage.js`, `TasksPage.js`

#### Filter Options:
```javascript
const [filters, setFilters] = useState({
  status: 'all', // 'all', 'to_do', 'in_progress', 'done', 'closed'
  priority: 'all', // 'all', 'critical', 'high', 'medium', 'low'
  assignee: 'all', // 'all', 'me', specific user_id
  labels: [], // array of label names
  sprint: 'all', // 'all', 'no_sprint', specific sprint_id
  searchTerm: '' // text search in title/description
});
```

#### Backend Filter Query:

```python
# task_controller.py::get_tasks()
def build_task_filter_query(params):
    query = {"project_id": params["project_id"]}
    
    if params.get("status") and params["status"] != "all":
        query["status"] = params["status"]
    
    if params.get("priority") and params["priority"] != "all":
        query["priority"] = params["priority"]
    
    if params.get("assignee_id"):
        query["assignee_id"] = params["assignee_id"]
    
    if params.get("labels"):
        query["labels"] = {"$in": params["labels"]}
    
    if params.get("sprint_id"):
        query["sprint_id"] = params["sprint_id"]
    elif params.get("no_sprint"):
        query["sprint_id"] = None
    
    if params.get("search"):
        # Text search in title and description
        query["$or"] = [
            {"title": {"$regex": params["search"], "$options": "i"}},
            {"description": {"$regex": params["search"], "$options": "i"}}
        ]
    
    return query
```

---

### 3.7 "My Tasks" View

**Page**: `MyTasksPage.js`  
**Backend**: `GET /api/tasks/my-tasks`

#### Features:
- Shows only tasks assigned to current user
- Grouped by status with counts
- Quick filters: Overdue, Due Today, Due This Week
- Priority-based sorting
- Inline status update (without opening modal)

```javascript
// MyTasksPage.js
useEffect(() => {
  const fetchMyTasks = async () => {
    const response = await taskAPI.getMyTasks();
    setTasks(response.tasks);
    
    // Calculate counts
    const counts = {
      total: response.tasks.length,
      overdue: response.tasks.filter(t => new Date(t.due_date) < new Date() && t.status !== 'Done').length,
      dueToday: response.tasks.filter(t => isToday(t.due_date) && t.status !== 'Done').length,
      dueThisWeek: response.tasks.filter(t => isThisWeek(t.due_date) && t.status !== 'Done').length
    };
    setCounts(counts);
  };
  
  fetchMyTasks();
}, []);
```

---

## 4. Sprint Planning & Management (Agile)

**Frontend**: `SprintPage.js`, `SprintForm.js`, `SprintList.js`, `BacklogView.js`  
**Backend**: `POST/GET/PUT/DELETE /api/sprints`  
**Controller**: `sprint_controller.py`

### 4.1 Sprint Creation

**Permission**: Only project owner can create sprints

#### Features:
- **Sprint naming** (e.g., "Sprint 1", "Q1 2026 Sprint")
- **Sprint goal** (optional description of what sprint aims to achieve)
- **Date range**: Start and end dates with validation
- **Auto-validation**: Cannot create if active sprint already exists for project
- **Initial status**: "planned" (not yet started)

#### Sprint Creation Flow:

```javascript
// Frontend: SprintForm.js
const createSprint = async (formData) => {
  // Validate dates
  const startDate = new Date(formData.start_date);
  const endDate = new Date(formData.end_date);
  
  if (endDate <= startDate) {
    setError("End date must be after start date");
    return;
  }
  
  // Submit to API
  const response = await fetch(`/api/projects/${projectId}/sprints`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name: "Sprint 1",
      goal: "Implement core authentication features",
      start_date: "2026-02-15T00:00:00Z",
      end_date: "2026-02-28T23:59:59Z"
    })
  });
  
  const data = await response.json();
  // data.sprint includes calculated fields like total_tasks: 0
};
```

**Backend Sprint Document**:
```json
{
  "_id": "ObjectId(...)",
  "name": "Sprint 1",
  "goal": "Implement core authentication features",
  "project_id": "674d5e8f1234567890project",
  "start_date": "2026-02-15T00:00:00Z",
  "end_date": "2026-02-28T23:59:59Z",
  "status": "planned",
  "created_by": "674d5e8f1234567890abcdef",
  "created_at": "2026-02-12T10:00:00Z",
  "updated_at": "2026-02-12T10:00:00Z",
  "started_at": null,
  "completed_at": null,
  "total_tasks_snapshot": null,
  "completed_tasks_snapshot": null
}
```

---

### 4.2 Sprint Backlog Management

**Backend**: `POST /api/sprints/{sprint_id}/tasks`, `DELETE /api/sprints/{sprint_id}/tasks/{task_id}`

#### Adding Tasks to Sprint:

```javascript
// Frontend: Task assignment
const addTaskToSprint = async (taskId, sprintId) => {
  try {
    await fetch(`/api/sprints/${sprintId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ task_id: taskId })
    });
    
    // Update task locally
    setTask(prev => ({ ...prev, sprint_id: sprintId, sprint_name: sprint.name }));
  } catch (error) {
    toast.error('Failed to add task to sprint');
  }
};
```

**Backend Processing**:
```python
# sprint_controller.py::add_task_to_sprint()
def add_task_to_sprint(sprint_id, body_str, user_id):
    data = json.loads(body_str)
    task_id = data["task_id"]
    
    # Validation
    sprint = Sprint.find_by_id(sprint_id)
    task = Task.find_by_id(task_id)
    
    # Check if task already in another sprint
    if task.get("sprint_id") and task["sprint_id"] != sprint_id:
        return error_response("Task already assigned to another sprint", 400)
    
    # Check if task's due date falls within sprint dates
    if task.get("due_date"):
        task_due = datetime.fromisoformat(task["due_date"].replace('Z', '+00:00'))
        sprint_start = datetime.fromisoformat(sprint["start_date"].replace('Z', '+00:00'))
        sprint_end = datetime.fromisoformat(sprint["end_date"].replace('Z', '+00:00'))
        
        if not (sprint_start <= task_due <= sprint_end):
            return error_response("Task due date outside sprint range", 400)
    
    # Update task
    Task.update(task_id, {
        "sprint_id": sprint_id,
        "sprint_name": sprint["name"]
    })
    
    return success_response("Task added to sprint successfully")
```

#### Removing Tasks from Sprint:

```python
# sprint_controller.py::remove_task_from_sprint()
def remove_task_from_sprint(sprint_id, task_id, user_id):
    # Only allowed if sprint is "planned" (not started)
    sprint = Sprint.find_by_id(sprint_id)
    
    if sprint["status"] != "planned":
        return error_response("Cannot remove tasks from active or completed sprints", 400)
    
    Task.update(task_id, {
        "sprint_id": None,
        "sprint_name": None
    })
    
    return success_response("Task removed from sprint")
```

---

### 4.3 Sprint Lifecycle Management

#### Sprint Statuses:

**1. Planned** (initial state):
- Sprint created but not yet started
- Tasks can be added/removed freely
- No burndown chart yet
- Edit sprint details allowed

**2. Active** (sprint in progress):
- Sprint started via `POST /api/sprints/{sprint_id}/start`
- `started_at` timestamp recorded
- Task additions/removals restricted
- Burndown chart visible
- Daily progress tracking

**3. Completed** (sprint ended):
- Sprint completed via `POST /api/sprints/{sprint_id}/complete`
- `completed_at` timestamp recorded
- Task counts snapshot saved (immutable)
- Velocity calculated
- Sprint retrospective notes can be added
- Tasks still editable but cannot change sprint assignment

#### Starting a Sprint:

```python
# sprint_controller.py::start_sprint()
def start_sprint(sprint_id, user_id):
    sprint = Sprint.find_by_id(sprint_id)
    project = Project.find_by_id(sprint["project_id"])
    
    # Only owner can start
    if project["user_id"] != user_id:
        return error_response("Only project owner can start sprints", 403)
    
    # Check if already active sprint
    active_sprint = Sprint.find_active_by_project(sprint["project_id"])
    if active_sprint and str(active_sprint["_id"]) != sprint_id:
        return error_response("Cannot start sprint. Another sprint is active.", 400)
    
    # Update sprint status
    Sprint.update(sprint_id, {
        "status": "active",
        "started_at": datetime.utcnow()
    })
    
    return success_response("Sprint started successfully")
```

#### Completing a Sprint:

```python
# sprint_controller.py::complete_sprint()
def complete_sprint(sprint_id, user_id):
    sprint = Sprint.find_by_id(sprint_id)
    
    # Count tasks (snapshot for historical data)
    sprint_tasks = Task.find_by_sprint(sprint_id)
    total_tasks = len(sprint_tasks)
    completed_tasks = len([t for t in sprint_tasks if t["status"] in ["Done", "Closed"]])
    
    # Calculate velocity (sum of story points for completed tasks)
    velocity = sum([t.get("story_points", 0) for t in sprint_tasks if t["status"] in ["Done", "Closed"]])
    
    Sprint.update(sprint_id, {
        "status": "completed",
        "completed_at": datetime.utcnow(),
        "total_tasks_snapshot": total_tasks,
        "completed_tasks_snapshot": completed_tasks,
        "velocity": velocity
    })
    
    return success_response({
        "message": "Sprint completed successfully",
        "stats": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "velocity": velocity,
            "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        }
    })
```

---

### 4.4 Sprint Backlog View

**Component**: `BacklogView.js`  
**Backend**: `GET /api/projects/{project_id}/backlog`

#### Features:
- Shows all tasks NOT assigned to any sprint (backlog tasks)
- Drag-and-drop to assign tasks to sprint
- Filter by priority, assignee, labels
- Sort by priority, due date, story points
- Batch task assignment to sprint

```javascript
// BacklogView.js
const fetchBacklog = async () => {
  const response = await fetch(`/api/projects/${projectId}/backlog`, {
    headers: getAuthHeaders()
  });
  
  const data = await response.json();
  // data.tasks: tasks with sprint_id === null
  setBacklogTasks(data.tasks);
};

// Drag task from backlog to sprint
const handleDragEnd = async (event) => {
  const { active, over } = event;
  
  if (over && over.id.startsWith('sprint-')) {
    const sprintId = over.id.replace('sprint-', '');
    await addTaskToSprint(active.id, sprintId);
  }
};
```

---

### 4.5 Sprint Burndown Chart

**Component**: `SprintBurndownChart.js` (using Recharts)  
**Data Source**: Calculate daily from task completion

#### Chart Data Structure:

```javascript
// Calculate burndown data
const calculateBurndownData = (sprint, tasks) => {
  const startDate = new Date(sprint.start_date);
  const endDate = new Date(sprint.end_date);
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Calculate total story points
  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  
  // Ideal burndown line (linear)
  const idealBurndown = [];
  for (let day = 0; day <= totalDays; day++) {
    idealBurndown.push({
      day: day,
      ideal: totalPoints - (totalPoints / totalDays) * day
    });
  }
  
  // Actual burndown (based on task completion dates)
  const actualBurndown = [];
  let remainingPoints = totalPoints;
  
  for (let day = 0; day <= totalDays; day++) {
    const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    
    // Count tasks completed by this date
    const completedTasks = tasks.filter(t => {
      if (!t.completed_at || !["Done", "Closed"].includes(t.status)) return false;
      return new Date(t.completed_at) <= currentDate;
    });
    
    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
    remainingPoints = totalPoints - completedPoints;
    
    actualBurndown.push({
      day: day,
      actual: remainingPoints,
      date: currentDate.toLocaleDateString()
    });
  }
  
  return { idealBurndown, actualBurndown };
};
```

**Chart Rendering**:
```jsx
// SprintBurndownChart.js
<LineChart width={800} height={400} data={mergedData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="day" label={{ value: "Sprint Day", position: "insideBottom", offset: -5 }} />
  <YAxis label={{ value: "Story Points Remaining", angle: -90, position: "insideLeft" }} />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="ideal" stroke="#999999" strokeDasharray="5 5" name="Ideal Burndown" />
  <Line type="monotone" dataKey="actual" stroke="#2684ff" name="Actual Burndown" />
</LineChart>
```

---

### 4.6 Sprint Available Tasks

**Backend**: `GET /api/sprints/{sprint_id}/available-tasks`

Returns tasks that are eligible for sprint assignment:
- Tasks in same project
- Tasks with due date within sprint date range (or no due date)
- Tasks not already in another sprint
- Tasks not in "Done" or "Closed" status

---

## 5. GitHub Integration

**Backend**: `utils/github_utils.py`, `models/git_activity.py`, `controllers/git_controller.py`  
**Webhook**: `POST /api/webhooks/github`  
**API**: GitHub REST API v3, GitHub Webhooks

### 5.1 GitHub Repository Connection

**Project Setup**:
1. Project owner adds GitHub repository URL during project creation/editing
2. Format: `https://github.com/company/repository-name`
3. Backend parses URL to extract `owner` and `repo_name`

```python
# utils/github_utils.py::parse_repo_url()
def parse_repo_url(repo_url):
    """
    Parse GitHub repo URL to extract owner and repo name
    Examples:
        https://github.com/company/cdw-backend → ("company", "cdw-backend")
        https://github.com/company/DOIT2.0 → ("company", "DOIT2.0")
        git@github.com:company/repo.git → ("company", "repo")
    """
    repo_url = repo_url.strip().rstrip('/').removesuffix('.git')
    
    match = re.search(r'github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?$', repo_url)
    if match:
        return match.group(1), match.group(2)
    
    raise ValueError("Invalid GitHub repository URL")
```

---

### 5.2 Webhook Setup (Automatic Task Tracking)

**Backend Endpoint**: `POST /api/webhooks/github`  
**Controller**: `git_controller.py::github_webhook()`

#### Webhook Events Tracked:

**1. Branch Creation (`create` event)**:
```python
# Webhook payload
{
  "ref": "feature/WR-001-user-auth",
  "ref_type": "branch",
  "repository": {
    "full_name": "company/website-redesign",
    "html_url": "https://github.com/company/website-redesign"
  },
  "sender": {
    "login": "john-doe"
  }
}

# Backend processing
def handle_branch_created(payload, project_id):
    branch_name = payload["ref"]
    ticket_id = extract_ticket_id(branch_name)  # "WR-001"
    
    if not ticket_id:
        return  # No ticket ID in branch name
    
    task = Task.find_by_ticket_id(ticket_id)
    if not task:
        return  # Task not found
    
    # Create branch record
    GitBranch.create({
        "task_id": str(task["_id"]),
        "project_id": project_id,
        "branch_name": branch_name,
        "repo_url": payload["repository"]["html_url"],
        "status": "active"
    })
```

**2. Push Event (Commits)**:
```python
# Webhook payload
{
  "ref": "refs/heads/feature/WR-001-user-auth",
  "commits": [
    {
      "id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      "message": "feat(WR-001): Implement JWT token generation",
      "author": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "timestamp": "2026-02-13T11:30:00Z"
    }
  ]
}

# Backend processing
def handle_push_event(payload, project_id):
    commits = payload.get("commits", [])
    branch_name = payload["ref"].replace("refs/heads/", "")
    
    for commit in commits:
        message = commit.get("message", "")
        ticket_id = extract_ticket_id(message)  # Extract from commit message
        
        if not ticket_id:
            ticket_id = extract_ticket_id(branch_name)  # Fallback to branch name
        
        if not ticket_id:
            continue
        
        task = Task.find_by_ticket_id(ticket_id)
        if not task:
            continue
        
        # Create commit record
        GitCommit.create({
            "task_id": str(task["_id"]),
            "project_id": project_id,
            "commit_sha": commit["id"],
            "message": message,
            "author": commit["author"]["name"],
            "author_email": commit["author"]["email"],
            "branch_name": branch_name,
            "timestamp": commit["timestamp"]
        })
```

**3. Pull Request Event**:
```python
# Webhook payload
{
  "action": "opened",  # or "closed", "reopened", "merged"
  "pull_request": {
    "number": 42,
    "title": "[WR-001] Add user authentication system",
    "state": "open",  # or "closed"
    "merged": false,
    "head": {"ref": "feature/WR-001-user-auth"},
    "base": {"ref": "main"},
    "user": {"login": "john-doe"},
    "created_at": "2026-02-13T13:00:00Z",
    "merged_at": null,
    "closed_at": null
  }
}

# Backend processing
def handle_pull_request_event(payload, project_id):
    pr = payload["pull_request"]
    branch_name = pr["head"]["ref"]
    pr_title = pr["title"]
    
    ticket_id = extract_ticket_id(branch_name) or extract_ticket_id(pr_title)
    if not ticket_id:
        return
    
    task = Task.find_by_ticket_id(ticket_id)
    if not task:
        return
    
    # Determine status
    status = "open"
    merged_at = None
    closed_at = None
    
    if pr.get("merged"):
        status = "merged"
        merged_at = pr.get("merged_at")
    elif pr.get("state") == "closed":
        status = "closed"
        closed_at = pr.get("closed_at")
    
    # Create or update PR record
    GitPullRequest.create({
        "task_id": str(task["_id"]),
        "project_id": project_id,
        "pr_number": pr["number"],
        "title": pr_title,
        "branch_name": branch_name,
        "status": status,
        "author": pr["user"]["login"],
        "created_at_github": pr["created_at"],
        "merged_at": merged_at,
        "closed_at": closed_at
    })
```

---

### 5.3 Ticket ID Extraction

**Function**: `utils/github_utils.py::extract_ticket_id()`

#### Supported Formats:

```python
def extract_ticket_id(text):
    """
    Extract ticket ID from branch name or commit message
    
    Examples:
        "feature/WR-001-user-auth" → "WR-001"
        "WR-001: Add authentication" → "WR-001"
        "bugfix/TASK-123-fix-bug" → "TASK-123"
        "Fix authentication (WR-001)" → "WR-001"
        "feat(WR-001): Implement login" → "WR-001"
    
    Pattern: {PROJECT_PREFIX}-{NUMBER}
    Where PROJECT_PREFIX is 2-4 uppercase letters
    """
    if not text:
        return None
    
    # Pattern: PROJECT_PREFIX-NUMBER (e.g., WR-001, DOIT-123)
    match = re.search(r'([A-Z]{2,4})-(\d+)', text)
    if match:
        return match.group(0)  # Returns full match like "WR-001"
    
    return None
```

#### Commit Message Best Practices:

Conventional commit format with ticket ID:
```bash
# Format: <type>(<ticket-id>): <description>

feat(WR-001): Implement JWT token generation
fix(WR-002): Handle token expiration edge case
docs(WR-003): Update API documentation
refactor(WR-001): Simplify authentication logic
test(WR-004): Add unit tests for login flow
```

#### Branch Naming Convention:

```bash
# Format: <type>/<ticket-id>-<description>

feature/WR-001-user-auth
bugfix/WR-002-token-expiration
hotfix/WR-003-security-patch
improvement/WR-004-performance
```

---

### 5.4 Git Activity Display in Task Detail

**Component**: `DevelopmentSection.js` (inside `TaskDetailModal.js`)  
**Backend**: `GET /api/tasks/{task_id}/git-activity`

#### Git Activity Response:

```json
{
  "success": true,
  "git_activity": {
    "task_id": "674d5e8f1234567890task01",
    "ticket_id": "WR-001",
    "branches": [
      {
        "_id": "674d5e8f1234567890branch1",
        "branch_name": "feature/WR-001-user-auth",
        "repo_url": "https://github.com/company/website-redesign",
        "status": "active",
        "created_at": "2026-02-12T17:00:00Z"
      }
    ],
    "commits": [
      {
        "_id": "674d5e8f1234567890commit1",
        "commit_sha": "a1b2c3d4e5f6g7h8i9j0",
        "message": "feat(WR-001): Implement JWT token generation",
        "author": "John Doe",
        "author_email": "john@example.com",
        "branch_name": "feature/WR-001-user-auth",
        "timestamp": "2026-02-13T11:30:00Z"
      },
      {
        "_id": "674d5e8f1234567890commit2",
        "commit_sha": "b2c3d4e5f6g7h8i9j0k1",
        "message": "fix(WR-001): Handle token expiration edge case",
        "author": "John Doe",
        "timestamp": "2026-02-13T12:15:00Z"
      }
    ],
    "pull_requests": [
      {
        "_id": "674d5e8f1234567890pr001",
        "pr_number": 42,
        "title": "[WR-001] Add user authentication system",
        "status": "open",
        "branch_name": "feature/WR-001-user-auth",
        "target_branch": "main",
        "author": "john-doe",
        "created_at_github": "2026-02-13T13:00:00Z"
      }
    ]
  }
}
```

#### UI Display:

```jsx
// DevelopmentSection.js
<div className="development-section">
  <h3>GitHub Activity</h3>
  
  {/* Branches */}
  <div className="branches-list">
    <h4>Branches ({branches.length})</h4>
    {branches.map(branch => (
      <div key={branch._id} className="branch-item">
        <FiGitBranch />
        <span>{branch.branch_name}</span>
        <span className={`status ${branch.status}`}>{branch.status}</span>
      </div>
    ))}
  </div>
  
  {/* Commits */}
  <div className="commits-list">
    <h4>Commits ({commits.length})</h4>
    {commits.map(commit => (
      <div key={commit._id} className="commit-item">
        <div className="commit-sha">{commit.commit_sha.substring(0, 7)}</div>
        <div className="commit-message">{commit.message}</div>
        <div className="commit-author">{commit.author} • {timeAgo(commit.timestamp)}</div>
      </div>
    ))}
  </div>
  
  {/* Pull Requests */}
  <div className="pr-list">
    <h4>Pull Requests ({pullRequests.length})</h4>
    {pullRequests.map(pr => (
      <div key={pr._id} className="pr-item">
        <span className="pr-number">#{pr.pr_number}</span>
        <span className="pr-title">{pr.title}</span>
        <span className={`pr-status ${pr.status}`}>{pr.status}</span>
        <a href={`https://github.com/${repoOwner}/${repoName}/pull/${pr.pr_number}`} target="_blank">
          View on GitHub
        </a>
      </div>
    ))}
  </div>
</div>
```

---

### 5.5 GitHub Token Encryption

**Security Feature**: GitHub personal access tokens are encrypted before storage

```python
# utils/github_utils.py
from cryptography.fernet import Fernet

ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "default_fixed_key_base64")

def encrypt_token(token):
    """Encrypt GitHub token before storing in database"""
    try:
        f = Fernet(ENCRYPTION_KEY.encode())
        return f.encrypt(token.encode()).decode()
    except:
        return token  # Fallback to plaintext if encryption fails

def decrypt_token(encrypted_token):
    """Decrypt GitHub token when needed"""
    try:
        f = Fernet(ENCRYPTION_KEY.encode())
        return f.decrypt(encrypted_token.encode()).decode()
    except:
        return encrypted_token  # Return as-is if decryption fails
```

**Token Storage in Project**:
```json
{
  "_id": "ObjectId(...)",
  "name": "Website Redesign",
  "repo_url": "https://github.com/company/website-redesign",
  "github_token_encrypted": "gAAAAABhZ...",  // Encrypted token
  "github_webhook_id": "123456789"  // Webhook ID from GitHub
}
```

---

### 5.6 Manual Commit Linking

**Feature**: Manually link commits to tasks (if webhook fails or for historical commits)

```javascript
// Future feature: Manual commit linking UI
const linkCommit = async (taskId, commitSha) => {
  await fetch(`/api/tasks/${taskId}/git-activity/link-commit`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      commit_sha: commitSha,
      repo_url: project.repo_url
    })
  });
};
```

---
  - Delete conversations
  - Export conversations (planned)

#### AI Capabilities:
- **Question Answering**: General knowledge and project-specific queries
- **Code Assistance**: Programming help and debugging
- **Image Generation**: Create visuals from text descriptions
- **Document Analysis**: Extract insights from uploaded files
- **Data Interpretation**: Analyze CSV data and provide insights
- **Writing Help**: Documentation, emails, reports

---

### 8. Data Visualization & Analytics

#### Dashboard Components:

- **Task Statistics**
  - Total tasks count
  - Completed vs pending
  - By status distribution
  - By priority breakdown
  - Completion rate trends

- **Task Status Chart**
  - Pie/donut chart
  - Visual status distribution
  - Color-coded segments
  - Interactive tooltips

- **Task Priority Chart**
  - Bar chart visualization
  - Priority distribution
  - Critical task highlighting

- **Project Progress Chart**
  - Line chart over time
  - Multiple project tracking
  - Milestone markers
  - Trend analysis

- **Sprint Burndown Chart**
  - Ideal vs actual work
  - Daily progress tracking
  - Sprint scope changes
  - Completion prediction

- **Team Performance Metrics**
  - Individual contributions
  - Completion rates
  - Average task time
  - Workload distribution

- **Time Tracking Charts**
  - Estimated vs actual hours
  - Time by project
  - Time by task type
  - Overtime analysis

#### Export Capabilities:
- Export to PDF
- Export to Excel
- Export to CSV
- Print reports
- Schedule automated reports (planned)

---

### 9. Calendar & Timeline View

#### Features:
- **Calendar View**
  - Monthly calendar
  - Task due dates
  - Sprint timelines
  - Project milestones
  - Today highlighting

- **Timeline View**
  - Gantt-style visualization (planned)
  - Task dependencies (planned)
  - Critical path identification (planned)
  - Resource allocation view (planned)

---

### 10. Profile & User Settings

#### Features:
- **User Profile**
  - Profile picture upload
  - Personal information
  - Department assignment
  - Contact details
  - Bio/description

- **Account Settings**
  - Change password
  - Email preferences
  - Notification settings
  - Privacy settings
  - Theme preferences (light/dark)

- **Activity Tracking**
  - Recent tasks
  - Recent projects
  - Login history
  - Activity log

---

### 11. System Dashboard (Super Admin Only)

#### Features:
- **User Management**
  - View all users
  - Create new users
  - Edit user details
  - Deactivate/activate users
  - Delete users
  - Role assignment

- **System Statistics**
  - Total users count
---

## 6. Team Collaboration - Team Chat

**Frontend**: `TeamChat.js` (floating chat widget)  
**Backend**: `POST/GET/DELETE /api/team-chat`  
**Controller**: `team_chat_controller.py`  
**WebSocket**: `WS /api/team-chat/ws/{channel_id}`

### 6.1 Chat Architecture

#### Project-Based Organization:
- Each project automatically gets a default "general" channel
- Additional channels can be created by project owner/admin
- Channel members are synced with project members
- Channels cannot exist without a parent project

#### UI Component:
- **Floating Widget**: Click icon in bottom-right corner to open/close
- **Minimized State**: Shows unread message count badge
- **Expanded State**: Full chat interface (400px wide, 600px tall)
- **Position**: Fixed bottom-right, overlays other content

---

### 6.2 Channel Management

**Create Channel**:
```javascript
// TeamChat.js
const createChannel = async () => {
  if (!newChannelName.trim()) return;
  
  try {
    const response = await chatAPI.createChannel(currentProject, {
      name: newChannelName.trim(),
      description: newChannelDesc.trim()
    });
    
    setChannels(prev => [...prev, response.channel]);
    setCurrentChannel(response.channel.id);
    setShowNewChannelForm(false);
  } catch (error) {
    toast.error('Failed to create channel');
  }
};
```

**Backend Channel Creation**:
```python
# team_chat_controller.py::create_channel()
def create_channel(project_id, body_str, user_id):
    data = json.loads(body_str)
    
    # Verify user is project owner or admin
    project = Project.find_by_id(project_id)
    if project["user_id"] != user_id:
        member = next((m for m in project["members"] if m["user_id"] == user_id), None)
        if not member or member["role"] != "admin":
            return error_response("Only owner/admin can create channels", 403)
    
    # Check for duplicate channel name
    existing = Channel.find_by_name(project_id, data["name"])
    if existing:
        return error_response("Channel name already exists", 400)
    
    channel = Channel.create({
        "name": data["name"],
        "description": data.get("description", ""),
        "project_id": project_id,
        "is_default": False,
        "members": [m["user_id"] for m in project["members"]]
    })
    
    return success_response({"channel": channel}, 201)
```

**Delete Channel**:
- Only project owner can delete channels
- Cannot delete default "general" channel
- Confirmation dialog required
- All channel messages are deleted (cascade)

---

### 6.3 Real-Time Messaging

**WebSocket Connection**:
```javascript
// useWebSocket.js custom hook
export function useWebSocket(wsUrl, onMessage, options = {}) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  
  useEffect(() => {
    if (!wsUrl || !options.enabled) return;
    
    const connect = () => {
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('[WS] Connected:', wsUrl);
        setConnectionStatus('connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send heartbeat every 30 seconds
        heartbeatInterval.current = setInterval(() => {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onMessage(data);
      };
      
      websocket.onclose = () => {
        console.log('[WS] Disconnected');
        setConnectionStatus('disconnected');
        setIsConnected(false);
        clearInterval(heartbeatInterval.current);
        
        // Auto-reconnect
        if (reconnectAttempts.current < options.reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, options.reconnectInterval);
        }
      };
      
      wsRef.current = websocket;
    };
    
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(heartbeatInterval.current);
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [wsUrl, options.enabled]);
  
  return { connectionStatus, isConnected };
}
```

**Send Message**:
```javascript
// TeamChat.js
const sendMessage = async () => {
  if (!message.trim() || sending) return;
  
  const messageData = {
    text: message.trim(),
    attachments: selectedFile ? [selectedFile] : []
  };
  
  try {
    setSending(true);
    await chatAPI.sendMessage(currentChannel, messageData);
    
    // Message will appear via WebSocket broadcast
    setMessage('');
    setSelectedFile(null);
  } catch (error) {
    toast.error('Failed to send message');
  } finally {
    setSending(false);
  }
};
```

**Backend Message Broadcasting**:
```python
# team_chat_controller.py::send_message()
async def send_message(channel_id, body_str, user_id):
    data = json.loads(body_str)
    
    # Create message in database
    message = Message.create({
        "channel_id": channel_id,
        "sender_id": user_id,
        "text": data["text"],
        "attachments": data.get("attachments", []),
        "reactions": [],
        "read_by": [user_id]
    })
    
    # Broadcast via WebSocket to all connected users in channel
    from utils.websocket_manager import manager
    await manager.broadcast_to_channel(
        channel_id,
        {
            "type": "new_message",
            "message": message
        }
    )
    
    return success_response({"message": message}, 201)
```

---

### 6.4 Message Features

#### Message Reactions (with real-time updates):
```javascript
const toggleReaction = async (messageId, emoji) => {
  try {
    await chatAPI.toggleReaction(currentChannel, messageId, emoji);
    // Update will come via WebSocket
  } catch (error) {
    toast.error('Failed to add reaction');
  }
};
```

**Backend Reaction Toggle**:
```python
# team_chat_controller.py::toggle_reaction()
def toggle_reaction(channel_id, message_id, body_str, user_id):
    data = json.loads(body_str)
    emoji = data["emoji"]
    
    message = Message.find_by_id(message_id)
    reactions = message.get("reactions", [])
    
    # Find reaction for this emoji
    reaction = next((r for r in reactions if r["emoji"] == emoji), None)
    
    if reaction:
        # User already reacted - remove
        if user_id in reaction["users"]:
            reaction["users"].remove(user_id)
            if not reaction["users"]:  # Remove reaction if no users
                reactions.remove(reaction)
        else:
            # Add user to reaction
            reaction["users"].append(user_id)
    else:
        # New reaction
        reactions.append({"emoji": emoji, "users": [user_id]})
    
    Message.update(message_id, {"reactions": reactions})
    
    # Broadcast update
    await manager.broadcast_to_channel(channel_id, {
        "type": "reaction_updated",
        "message_id": message_id,
        "reactions": reactions
    })
    
    return success_response({"reactions": reactions})
```

#### Message Editing:
```javascript
const editMessage = async (messageId, newText) => {
  try {
    await chatAPI.editMessage(currentChannel, messageId, { text: newText });
    // Update will come via WebSocket
    setEditingMessageId(null);
  } catch (error) {
    toast.error('Failed to edit message');
  }
};
```

**Backend Edit Validation**:
- Only message sender can edit
- Cannot edit messages older than 24 hours
- Edited messages marked with "edited" flag

#### Message Deletion:
- Sender or channel admin can delete
- Confirmation dialog required
- Soft delete (message marked as deleted, not physically removed)

---

### 6.5 File Sharing

**Upload Files**:
```javascript
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File size exceeds 10MB limit');
    return;
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('File type not supported');
    return;
  }
  
  // Upload file
  try {
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/team-chat/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      }
    });
    
    const data = await response.json();
    setSelectedFile(data.file);  // { name, url, type, size }
    setUploadProgress(0);
  } catch (error) {
    toast.error('File upload failed');
    setUploadProgress(0);
  }
};
```

**Backend File Storage**:
```python
# team_chat_controller.py::upload_file()
async def upload_file(file: UploadFile):
    # Validate file
    if file.size > 10 * 1024 * 1024:
        raise HTTPException status_code=400, detail="File size exceeds 10MB")
    
    # Generate unique filename
    import uuid
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}.{file_extension}"
    
    # Save file
    file_path = f"uploads/chat_attachments/{unique_filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    return success_response({
        "file": {
            "name": file.filename,
            "url": f"/{file_path}",
            "type": file.content_type,
            "size": file.size
        }
    })
```

---

### 6.6 Unread Message Tracking

**Mark Messages as Read**:
```javascript
// Automatically mark messages as read when channel is viewed
useEffect(() => {
  if (currentChannel && messages.length > 0) {
    const unreadMessageIds = messages
      .filter(m => !m.read_by.includes(user.id))
      .map(m => m.id);
    
    if (unreadMessageIds.length > 0) {
      chatAPI.markAsRead(currentChannel, unreadMessageIds);
    }
  }
}, [currentChannel, messages]);
```

**Backend Read Tracking**:
```python
# Add user_id to message.read_by array
Message.mark_as_read(message_ids, user_id)
```

**Unread Counts**:
- Badge on chat widget shows total unread messages
- Channel list shows unread count per channel
- Project list shows unread count per project

---

### 6.7 Typing Indicators

**Send Typing Event**:
```javascript
// Debounced typing indicator
const handleTyping = useCallback(
  debounce(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'typing',
        channel_id: currentChannel,
        user_id: user.id,
        user_name: user.name
      }));
    }
  }, 300),
  [ws, currentChannel]
);

// Call on input change
<textarea 
  value={message}
  onChange={(e) => {
    setMessage(e.target.value);
    handleTyping();
  }}
/>
```

**Display Typing Indicator**:
```javascript
const [typingUsers, setTypingUsers] = useState([]);

// WebSocket message handler
case 'user_typing':
  setTypingUsers(prev => {
    if (!prev.includes(data.user_name)) {
      return [...prev, data.user_name];
    }
    return prev;
  });
  
  // Remove after 3 seconds
  setTimeout(() => {
    setTypingUsers(prev => prev.filter(u => u !== data.user_name));
  }, 3000);
  break;

// Display
{typingUsers.length > 0 && (
  <div className="typing-indicator">
    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
  </div>
)}
```

---

## 7. AI Assistant (DOIT-AI)

**Frontend**: `AIAssistantPage.js`  
**Backend**: `POST/GET/DELETE /api/ai-assistant`  
**Controller**: `ai_assistant_controller.py`  
**AI Models**: Azure OpenAI GPT-5.2-chat, Azure AI FLUX-1.1-pro

### 7.1 Conversational AI Interface

#### Conversation Management:

```javascript
// AIAssistantPage.js
const [conversations, setConversations] = useState([]);
const [activeConversation, setActiveConversation] = useState(null);
const [messages, setMessages] = useState([]);

// Load conversations on mount
useEffect(() => {
  loadConversations();
}, []);

const loadConversations = async () => {
  const response = await fetch('/api/ai-assistant/conversations', {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  setConversations(data.conversations);
};

// Create new conversation
const createNewConversation = async () => {
  const response = await fetch('/api/ai-assistant/conversations', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title: 'New Conversation' })
  });
  const data = await response.json();
  setConversations([data.conversation, ...conversations]);
  setActiveConversation(data.conversation);
  setMessages([]);
};
```

---

### 7.2 Chat with GPT-5.2

**Azure OpenAI Configuration**:
```python
# utils/azure_ai_utils.py
from openai import AzureOpenAI

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")  # e.g., "gpt-52-chat"
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")  # "2024-11-01"

azure_client = AzureOpenAI(
    api_version=AZURE_OPENAI_API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=AZURE_OPENAI_KEY
)
```

**Send Message to AI**:
```javascript
// AIAssistantPage.js
const sendMessage = async () => {
  if (!inputText.trim() || isLoading) return;
  
  const messageContent = inputText;
  let conversationToUse = activeConversation;
  
  // Create new conversation if none exists
  if (!conversationToUse) {
    conversationToUse = await createNewConversation();
  }
  
  // Add user message to UI
  const userMessage = {
    role: 'user',
    content: messageContent,
    created_at: new Date().toISOString()
  };
  setMessages(prev => [...prev, userMessage]);
  setInputText('');
  setIsLoading(true);
  setIsTyping(true);
  
  try {
    const response = await fetch(
      `/api/ai-assistant/conversations/${conversationToUse._id}/messages`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: messageContent,
          stream: false
        })
      }
    );
    
    const data = await response.json();
    setIsTyping(false);
    
    if (data.success && data.message) {
      // Add AI response
      setMessages(prev => [...prev, data.message]);
      
      // Update conversation title if first message
      if (messages.length === 0) {
        const title = messageContent.substring(0, 50);
        updateConversationTitle(conversationToUse._id, title);
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    setIsTyping(false);
  } finally {
    setIsLoading(false);
  }
};
```

**Backend AI Processing**:
```python
# ai_assistant_controller.py::send_message()
async def send_message(conversation_id: str, user_id: str, content: str):
    # Verify conversation ownership
    conversation = AIConversation.get_by_id(conversation_id)
    if conversation["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Save user message
    user_message_id = AIMessage.create(
        conversation_id=conversation_id,
        role="user",
        content=content
    )
    
    # Get conversation history (last 20 messages for context)
    recent_messages = AIMessage.get_recent_context(conversation_id, limit=20)
    
    # Prepare messages for API (include system prompt)
    api_messages = get_context_with_system_prompt(recent_messages)
    
    # Truncate if needed (max 8000 tokens)
    api_messages = truncate_context(api_messages, max_tokens=8000)
    
    # Call Azure OpenAI
    response = chat_completion(
        messages=api_messages,
        max_tokens=2000
    )
    
    # Save AI response
    ai_message_id = AIMessage.create(
        conversation_id=conversation_id,
        role="assistant",
        content=response["content"]
    )
    
    # Update token usage
    AIMessage.update_tokens(ai_message_id, response["tokens"]["total"])
    
    return {
        "success": True,
        "message": {
            "_id": str(ai_message_id),
            "role": "assistant",
            "content": response["content"],
            "created_at": datetime.utcnow().isoformat(),
            "tokens_used": response["tokens"]["total"]
        },
        "tokens": response["tokens"]
    }
```

**System Prompt**:
```python
# utils/azure_ai_utils.py::get_context_with_system_prompt()
def get_context_with_system_prompt(messages):
    """Add system prompt to conversation context"""
    system_prompt = {
        "role": "system",
        "content": """You are DOIT-AI, an intelligent assistant for the DOIT project management system.

You help users with:
- Project management best practices
- Agile methodologies (Scrum, Kanban)
- Task organization and prioritization
- Sprint planning and execution
- Team collaboration strategies
- Code documentation and technical writing
- Data analysis and interpretation
- File content summarization

Be concise, helpful, and professional. When analyzing files, provide actionable insights.
Format responses with markdown for better readability."""
    }
    
    return [system_prompt] + messages
```

---

### 7.3 File Analysis

**Upload File to AI**:
```javascript
// AIAssistantPage.js
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file type
  const allowedTypes = ['.csv', '.pdf', '.txt', '.md', '.json', '.docx'];
  const isAllowed = allowedTypes.some(type => file.name.toLowerCase().endsWith(type));
  
  if (!isAllowed) {
    toast.error('File type not supported for analysis');
    return;
  }
  
  try {
    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message', 'Analyze this file');
    
    const response = await fetch(
      `/api/ai-assistant/conversations/${activeConversation._id}/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      // Add user message with attachment
      setMessages(prev => [...prev, data.user_message]);
      
      // Add AI analysis
      setMessages(prev => [...prev, data.assistant_message]);
    }
  } catch (error) {
    toast.error('File upload failed');
  } finally {
    setIsLoading(false);
  }
};
```

**Backend File Processing**:
```python
# ai_assistant_controller.py::upload_file()
async def upload_file(conversation_id: str, file: UploadFile, message: str):
    # Save file
    file_path = f"uploads/ai_attachments/{timestamp}_{file.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Extract file content
    from utils.file_parser import extract_file_content
    extraction = extract_file_content(file_path)
    
    if not extraction["success"]:
        raise HTTPException(status_code=400, detail=extraction["error"])
    
    # Save user message with attachment
    user_message = AIMessage.create(
        conversation_id=conversation_id,
        role="user",
        content=message or "Analyze this file",
        attachments=[{
            "filename": file.filename,
            "filepath": file_path,
            "size": file.size,
            "type": file.content_type
        }]
    )
    
    # Create prompt for AI including file content
    prompt = f"{message}\n\nFile Content:\n{extraction['content']}"
    
    # Get AI analysis
    response = chat_completion(
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000
    )
    
    # Save AI response
    ai_message = AIMessage.create(
        conversation_id=conversation_id,
        role="assistant",
        content=response["content"]
    )
    
    return {
        "success": True,
        "user_message": user_message,
        "assistant_message": ai_message
    }
```

**File Parser Utilities**:
```python
# utils/file_parser.py
import csv, PyPDF2, docx, json

def extract_file_content(filepath: str):
    """Extract text from various file types"""
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext == '.csv':
        return extract_csv_file(filepath)
    elif ext == '.pdf':
        return extract_pdf_file(filepath)
    elif ext == '.docx':
        return extract_docx_file(filepath)
    elif ext == '.json':
        return extract_json_file(filepath)
    elif ext in ['.txt', '.md', '.py', '.js']:
        return extract_text_file(filepath)
    else:
        return {"success": False, "error": f"Unsupported file type: {ext}"}

def extract_csv_file(filepath: str):
    """Format CSV data for AI understanding"""
    with open(filepath, 'r') as f:
        reader = csv.reader(f)
        rows = list(reader)
    
    if not rows:
        return {"success": False, "error": "CSV file is empty"}
    
    headers = rows[0]
    data_rows = rows[1:]
    
    content = f"CSV File Content:\n\n"
    content += f"Headers: {', '.join(headers)}\n"
    content += f"Total rows: {len(data_rows)}\n\n"
    content += "Data (first 50 rows):\n"
    
    for i, row in enumerate(data_rows[:50]):
        content += f"Row {i+1}: {', '.join(str(cell) for cell in row)}\n"
    
    if len(data_rows) > 50:
        content += f"\n... and {len(data_rows) - 50} more rows"
    
    return {
        "success": True,
        "content": content,
        "rows": len(data_rows),
        "columns": len(headers)
    }
```

---

### 7.4 Image Generation with FLUX-1.1-pro

**Generate Image**:
```javascript
// AIAssistantPage.js
const generateImage = async () => {
  if (!inputText.trim() || isLoading) return;
  
  const prompt = inputText;
  let conversationToUse = activeConversation;
  
  if (!conversationToUse) {
    conversationToUse = await createNewConversation();
  }
  
  // Add user request
  const userMessage = {
    role: 'user',
    content: `Generate image: ${prompt}`,
    created_at: new Date().toISOString()
  };
  setMessages(prev => [...prev, userMessage]);
  setInputText('');
  setIsLoading(true);
  
  try {
    const response = await fetch(
      `/api/ai-assistant/conversations/${conversationToUse._id}/generate-image`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt })
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      // Add user message
      setMessages(prev => [...prev, data.user_message]);
      
      // Add AI response with image
      setMessages(prev => [...prev, data.assistant_message]);
    }
  } catch (error) {
    toast.error('Image generation failed');
  } finally {
    setIsLoading(false);
  }
};
```

**Backend Image Generation**:
```python
# ai_assistant_controller.py::generate_image()
async def generate_image(conversation_id: str, prompt: str):
    from utils.azure_ai_utils import generate_image as generate_flux_image
    
    # Save user message
    user_message = AIMessage.create(
        conversation_id=conversation_id,
        role="user",
        content=f"Generate image: {prompt}"
    )
    
    # Generate image with FLUX-1.1-pro
    result = generate_flux_image(prompt, save_to_file=True)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    # Save AI response with image
    ai_message = AIMessage.create(
        conversation_id=conversation_id,
        role="assistant",
        content=f"I've generated an image based on your prompt: '{prompt}'",
        image_url=result["image_url"],
        image_metadata=result.get("metadata", {})
    )
    
    return {
        "success": True,
        "user_message": user_message,
        "assistant_message": ai_message
    }
```

**FLUX-1.1-pro Integration**:
```python
# utils/azure_ai_utils.py::generate_image()
def generate_image(prompt: str, save_to_file: bool = True):
    """Generate image using Azure AI FLUX-1.1-pro"""
    try:
        # Call Azure AI Foundry endpoint
        response = requests.post(
            AZURE_FLUX_ENDPOINT,
            headers={
                "Content-Type": "application/json",
                "api-key": AZURE_FLUX_KEY
            },
            json={
                "model": AZURE_FLUX_MODEL,  # "FLUX-1.1-pro"
                "prompt": prompt,
                "num_outputs": 1,
                "image_size": "1024x1024"
            }
        )
        
        if response.status_code != 200:
            return {"success": False, "error": response.json().get("error", "Unknown error")}
        
        # Get image URL or base64 data
        data = response.json()
        image_data = data["output"][0]
        
        if save_to_file:
            # Save to disk
            import base64
            from datetime import datetime
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"ai_generated_{timestamp}.png"
            filepath = f"uploads/ai_images/{filename}"
            
            # Decode and save
            with open(filepath, "wb") as f:
                f.write(base64.b64decode(image_data))
            
            return {
                "success": True,
                "image_url": f"/{filepath}",
                "metadata": {
                    "model": "FLUX-1.1-pro",
                    "prompt": prompt,
                    "resolution": "1024x1024"
                }
            }
        
        return {"success": True, "image_data": image_data}
    
    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

### 7.5 Token Tracking & Cost Management

**Token Usage Recording**:
```python
# models/ai_conversation.py
def update_token_usage(message_id, tokens):
    """Update token count for billing/analytics"""
    AIMessage.update(message_id, {"tokens": tokens})
    
    # Update conversation total
    message = AIMessage.get_by_id(message_id)
    conversation = AIConversation.get_by_id(message["conversation_id"])
    total_tokens = conversation.get("total_tokens", 0) + tokens
    
    AIConversation.update(conversation["_id"], {"total_tokens": total_tokens})
```

**Cost Calculation** (for analytics):
```python
# Pricing (example - adjust based on actual Azure prices)
GPT_52_CHAT_COST_PER_1K_TOKENS = 0.03  # $0.03 per 1K tokens
FLUX_PRO_COST_PER_IMAGE = 0.10  # $0.10 per image

def calculate_conversation_cost(conversation):
    total_tokens = conversation.get("total_tokens", 0)
    text_cost = (total_tokens / 1000) * GPT_52_CHAT_COST_PER_1K_TOKENS
    
    # Count generated images
    messages = AIMessage.get_conversation_messages(conversation["_id"])
    image_count = len([m for m in messages if m.get("image_url")])
    image_cost = image_count * FLUX_PRO_COST_PER_IMAGE
    
    return text_cost + image_cost
```

---

## 8. Data Visualization & Analytics

**Frontend**: `DataVisualization.js`  
**Backend**: `POST/GET/DELETE /api/data-viz`  
**Controller**: `data_viz_controller.py`  
**Libraries**: Plotly, Seaborn, Matplotlib, pandas

### 8.1 Dataset Upload

**Upload CSV/Excel**:
```javascript
// DataVisualization.js
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
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
    const response = await fetch('/api/data-viz/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      fetchDatasets();  // Refresh dataset list
      setSelectedDataset(data.dataset);  // Select newly uploaded dataset
    }
  } catch (error) {
    alert('Failed to upload file');
  } finally {
    setLoading(false);
  }
};
```

**Backend Dataset Processing**:
```python
# data_viz_controller.py::upload_dataset()
async def upload_dataset(file: UploadFile, user_id: str):
    import pandas as pd
    
    # Save file
    file_path = f"uploads/datasets/{timestamp}_{file.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Parse file
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        else:
            raise ValueError("Unsupported file type")
    except Exception as e:
        return error_response(f"Failed to parse file: {str(e)}", 400)
    
    # Extract metadata
    column_names = df.columns.tolist()
    rows = len(df)
    columns = len(df.columns)
    preview = df.head(5).to_dict('records')
    
    # Create dataset record
    dataset = Dataset.create({
        "user_id": user_id,
        "filename": file.filename,
        "file_path": file_path,
        "file_type": file.filename.split('.')[-1],
        "size": file.size,
        "rows": rows,
        "columns": columns,
        "column_names": column_names,
        "preview": preview
    })
    
    return success_response({"dataset": dataset}, 201)
```

---

### 8.2 Statistical Analysis

**Analyze Dataset**:
```javascript
const analyzeDataset = async (datasetId) => {
  setLoading(true);
  
  try {
    const response = await fetch('/api/data-viz/analyze', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dataset_id: datasetId })
    });
    
    const data = await response.json();
    
    if (data.success) {
      setAnalysis(data.analysis);
    }
  } catch (error) {
    toast.error('Analysis failed');
  } finally {
    setLoading(false);
  }
};
```

**Backend Analysis**:
```python
# data_viz_controller.py::analyze_dataset()
def analyze_dataset(dataset_id: str, user_id: str):
    dataset = Dataset.find_by_id(dataset_id)
    
    # Verify ownership
    if dataset["user_id"] != user_id:
        return error_response("Unauthorized", 403)
    
    # Load dataframe
    df = pd.read_csv(dataset["file_path"]) if dataset["file_type"] == "csv" else pd.read_excel(dataset["file_path"])
    
    # Basic statistics
    analysis = {
        "basic_stats": {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024:.2f} KB"
        },
        "column_analysis": {}
    }
    
    # Analyze each column
    for col in df.columns:
        col_analysis = {"type": str(df[col].dtype)}
        
        if pd.api.types.is_numeric_dtype(df[col]):
            col_analysis.update({
                "mean": float(df[col].mean()),
                "median": float(df[col].median()),
                "std": float(df[col].std()),
                "min": float(df[col].min()),
                "max": float(df[col].max()),
                "null_count": int(df[col].isnull().sum())
            })
        elif pd.api.types.is_string_dtype(df[col]):
            col_analysis.update({
                "unique_values": int(df[col].nunique()),
                "top_value": str(df[col].mode()[0]) if len(df[col].mode()) > 0 else None,
                "frequency": int(df[col].value_counts().iloc[0]) if len(df[col]) > 0 else 0,
                "null_count": int(df[col].isnull().sum())
            })
        
        analysis["column_analysis"][col] = col_analysis
    
    # Correlation matrix (numeric columns only)
    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) >= 2:
        corr_matrix = df[numeric_cols].corr()
        analysis["correlations"] = corr_matrix.to_dict()
    
    return success_response({"analysis": analysis})
```

---

### 8.3 Chart Generation

**Generate Visualization**:
```javascript
const generateVisualization = async () => {
  if (!selectedDataset || !vizConfig.x_column) {
    alert('Please select a dataset and configure chart');
    return;
  }
  
  setLoading(true);
  
  try {
    const response = await fetch('/api/data-viz/visualize', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        dataset_id: selectedDataset.dataset_id,
        config: {
          chart_type: vizConfig.chart_type,  // 'scatter', 'line', 'bar', etc.
          library: vizConfig.library,  // 'plotly', 'seaborn', 'matplotlib'
          x_column: vizConfig.x_column,
          y_column: vizConfig.y_column,
          color_column: vizConfig.color_column,
          title: vizConfig.title || 'Data Visualization'
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast.success('Visualization created!');
      fetchVisualizations();  // Refresh visualization list
      setActiveTab('visualizations');  // Switch to visualizations tab
    }
  } catch (error) {
    toast.error('Visualization generation failed');
  } finally {
    setLoading(false);
  }
};
```

**Backend Chart Generation**:
```python
# data_viz_controller.py::generate_visualization()
def generate_visualization(body_str, user_id):
    data = json.loads(body_str)
    dataset_id = data["dataset_id"]
    config = data["config"]
    
    dataset = Dataset.find_by_id(dataset_id)
    
    # Load dataframe
    df = pd.read_csv(dataset["file_path"]) if dataset["file_type"] == "csv" else pd.read_excel(dataset["file_path"])
    
    # Generate chart based on library and type
    if config["library"] == "plotly":
        chart_html = generate_plotly_chart(df, config)
        image_path = generate_plotly_image(df, config)
    elif config["library"] == "seaborn":
        image_path = generate_seaborn_chart(df, config)
        chart_html = None
    elif config["library"] == "matplotlib":
        image_path = generate_matplotlib_chart(df, config)
        chart_html = None
    
    # Save visualization record
    viz = Visualization.create({
        "user_id": user_id,
        "dataset_id": dataset_id,
        "chart_type": config["chart_type"],
        "library": config["library"],
        "config": config,
        "image_path": image_path,
        "html_path": chart_html
    })
    
    return success_response({"visualization": viz}, 201)

def generate_plotly_chart(df, config):
    """Generate interactive Plotly chart"""
    import plotly.express as px
    
    chart_type = config["chart_type"]
    x_col = config["x_column"]
    y_col = config.get("y_column")
    color_col = config.get("color_column")
    title = config.get("title", "Visualization")
    
    # Create chart based on type
    if chart_type == "scatter":
        fig = px.scatter(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == "line":
        fig = px.line(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == "bar":
        fig = px.bar(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == "histogram":
        fig = px.histogram(df, x=x_col, color=color_col, title=title)
    elif chart_type == "box":
        fig = px.box(df, x=x_col, y=y_col, color=color_col, title=title)
    elif chart_type == "pie":
        fig = px.pie(df, names=x_col, values=y_col, title=title)
    
    # Save as HTML (interactive)
    html_path = f"uploads/visualizations/viz_{viz_id}.html"
    fig.write_html(html_path)
    
    # Save as PNG (static)
    image_path = f"uploads/visualizations/viz_{viz_id}.png"
    fig.write_image(image_path)
    
    return html_path, image_path
```

**Supported Chart Types**:
- **Scatter**: Relationship between two numeric variables
- **Line**: Trends over time or continuous variable
- **Bar**: Comparison of categories
- **Histogram**: Distribution of single variable
- **Box**: Distribution and outliers
- **Violin**: Distribution density
- **Heatmap**: Correlation matrix
- **Pie**: Proportions of categories
- **Area**: Cumulative trends

---

### 8.4 Visualization Download

**Download Chart**:
```javascript
const downloadVisualization = (vizId, format = 'png') => {
  const url = `/api/data-viz/download/${vizId}?format=${format}`;
  window.open(url, '_blank');
};
```

**Backend Download**:
```python
# data_viz_controller.py::download_visualization()
def download_visualization(viz_id: str, format: str = "png"):
    viz = Visualization.find_by_id(viz_id)
    
    if format == "png":
        file_path = viz["image_path"]
        return FileResponse(file_path, media_type="image/png", filename=f"viz_{viz_id}.png")
    elif format == "html":
        file_path = viz["html_path"]
        return FileResponse(file_path, media_type="text/html")
    else:
        return error_response("Invalid format. Use 'png' or 'html'", 400)
```

---

## 9. Dashboard & Analytics

**Frontend**: `Dashboard.js`, `SystemDashboard.js`  
**Backend**: `GET /api/dashboard/analytics`, `GET /api/system-dashboard/analytics`  
**Controllers**: `dashboard_controller.py`, `system_dashboard_controller.py`

### 9.1 User Dashboard (My Dashboard)

#### Task Statistics:
```javascript
// Dashboard.js - TaskStatsCard component
const loadTaskStats = async () => {
  try {
    const response = await fetch('/api/dashboard/task-stats', {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    
    setTaskStats(data.stats);
    // stats structure:
    // {
    //   total: 45,
    //   by_status: { to_do: 12, in_progress: 8, done: 25 },
    //   by_priority: { low: 10, medium: 20, high: 15 },
    //   overdue: 3,
    //   due_today: 5,
    //   due_this_week: 12,
    //   completion_rate: 55.6
    // }
  } catch (error) {
    console.error('Failed to load task stats:', error);
  }
};
```

**Backend Task Stats Calculation**:
```python
# dashboard_controller.py::get_task_stats()
def get_task_stats(user_id: str):
    # Get all tasks assigned to user
    all_tasks = Task.find_by_assignee(user_id)
    
    total = len(all_tasks)
    
    # Count by status
    by_status = {
        "to_do": len([t for t in all_tasks if t["status"] == "To Do"]),
        "in_progress": len([t for t in all_tasks if t["status"] == "In Progress"]),
        "dev_complete": len([t for t in all_tasks if t["status"] == "Dev Complete"]),
        "testing": len([t for t in all_tasks if t["status"] == "Testing"]),
        "done": len([t for t in all_tasks if t["status"] == "Done"])
    }
    
    # Count by priority
    by_priority = {
        "low": len([t for t in all_tasks if t["priority"] == "Low"]),
        "medium": len([t for t in all_tasks if t["priority"] == "Medium"]),
        "high": len([t for t in all_tasks if t["priority"] == "High"]),
        "critical": len([t for t in all_tasks if t["priority"] == "Critical"])
    }
    
    # Calculate completion rate
    completion_rate = (by_status["done"] / total * 100) if total > 0 else 0
    
    # Find overdue tasks
    from datetime import datetime
    today = datetime.utcnow()
    overdue = [
        t for t in all_tasks
        if t.get("due_date") and datetime.fromisoformat(t["due_date"]) < today
        and t["status"] != "Done"
    ]
    
    return success_response({
        "stats": {
            "total": total,
            "by_status": by_status,
            "by_priority": by_priority,
            "overdue": len(overdue),
            "completion_rate": round(completion_rate, 1)
        }
    })
```

#### Chart Components:

**Task Status Chart** (Pie Chart):
```javascript
// Charts/TaskStatusChart.js
import { PieChart, Pie, Cell, ResponesiveContainer, Legend, Tooltip } from 'recharts';

export function TaskStatusChart({ stats }) {
  const data = [
    { name: 'To Do', value: stats.by_status.to_do, color: '#gray' },
    { name: 'In Progress', value: stats.by_status.in_progress, color: '#blue' },
    { name: 'Dev Complete', value: stats.by_status.dev_complete, color: '#purple' },
    { name: 'Testing', value: stats.by_status.testing, color: '#orange' },
    { name: 'Done', value: stats.by_status.done, color: '#green' }
  ];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

**Task Priority Chart** (Bar Chart):
```javascript
// Charts/TaskPriorityChart.js
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function TaskPriorityChart({ stats }) {
  const data = [
    { priority: 'Low', count: stats.by_priority.low, color: '#10b981' },
    { priority: 'Medium', count: stats.by_priority.medium, color: '#f59e0b' },
    { priority: 'High', count: stats.by_priority.high, color: '#ef4444' },
    { priority: 'Critical', count: stats.by_priority.critical, color: '#991b1b' }
  ];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="priority" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

**Project Progress Chart** (Line Chart):
```javascript
// Charts/ProjectProgressChart.js
const loadProjectProgress = async (projectId) => {
  const response = await fetch(`/api/dashboard/project-progress/${projectId}`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  
  // data.progress: [
  //   { date: '2024-01-01', completed: 5, total: 20 },
  //   { date: '2024-01-02', completed: 8, total: 20 },
  //   ...
  // ]
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.progress}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" />
        <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

**Backend Project Progress Tracking**:
```python
# dashboard_controller.py::get_project_progress()
def get_project_progress(project_id: str, user_id: str):
    from datetime import datetime, timedelta
    
    # Verify user access to project
    project = Project.find_by_id(project_id)
    if not Project.user_has_access(project, user_id):
        return error_response("Unauthorized", 403)
    
    # Get task activities for last 30 days
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    # Query activity log (task status changes to "Done")
    activities = Activity.find({
        "project_id": project_id,
        "type": "task_status_changed",
        "new_value": "Done",
        "created_at": {"$gte": start_date, "$lte": end_date}
    })
    
    # Group by date
    progress_by_date = {}
    
    for day in range(31):
        date = (start_date + timedelta(days=day)).strftime("%Y-%m-%d")
        
        # Count tasks completed on or before this date
        completed = len([
            a for a in activities
            if datetime.fromisoformat(a["created_at"]).strftime("%Y-%m-%d") <= date
        ])
        
        # Total tasks on this date
        total = Task.count_by_project(project_id, date)
        
        progress_by_date[date] = {
            "date": date,
            "completed": completed,
            "total": total,
            "percentage": (completed / total * 100) if total > 0 else 0
        }
    
    return success_response({
        "progress": list(progress_by_date.values())
    })
```

---

### 9.2 Team Performance Analytics

**Team Velocity** (average story points per sprint):
```python
# dashboard_controller.py::get_team_velocity()
def get_team_velocity(project_id: str):
    # Get all completed sprints
    sprints = Sprint.find({
        "project_id": project_id,
        "status": "Completed"
    })
    
    if not sprints:
        return success_response({"velocity": [], "average": 0})
    
    velocity_data = []
    total_velocity = 0
    
    for sprint in sprints:
        velocity = sprint.get("velocity", 0)
        velocity_data.append({
            "sprint_name": sprint["name"],
            "velocity": velocity,
            "start_date": sprint["start_date"],
            "end_date": sprint["end_date"]
        })
        total_velocity += velocity
    
    average_velocity = total_velocity / len(sprints) if sprints else 0
    
    return success_response({
        "velocity": velocity_data,
        "average": round(average_velocity, 1),
        "total_sprints": len(sprints)
    })
```

**Individual Contribution** (tasks completed per user):
```python
# dashboard_controller.py::get_individual_contributions()
def get_individual_contributions(project_id: str, start_date: str, end_date: str):
    # Get all tasks completed in date range
    completed_tasks = Task.find({
        "project_id": project_id,
        "status": "Done",
        "completed_at": {
            "$gte": datetime.fromisoformat(start_date),
            "$lte": datetime.fromisoformat(end_date)
        }
    })
    
    # Group by assignee
    contributions = {}
    
    for task in completed_tasks:
        assignee_id = task.get("assignee_id")
        if assignee_id:
            if assignee_id not in contributions:
                assignee = User.find_by_id(assignee_id)
                contributions[assignee_id] = {
                    "user_id": assignee_id,
                    "user_name": assignee["name"],
                    "tasks_completed": 0,
                    "story_points": 0
                }
            
            contributions[assignee_id]["tasks_completed"] += 1
            contributions[assignee_id]["story_points"] += task.get("story_points", 0)
    
    return success_response({
        "contributions": list(contributions.values())
    })
```

---

### 9.3 Export Capabilities

**Export to CSV**:
```javascript
// utils/exportUtils.js
export const exportTasksToCSV = async (projectId) => {
  try {
    const response = await fetch(`/api/projects/${projectId}/tasks/export?format=csv`, {
      headers: getAuthHeaders()
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_${projectId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

**Backend CSV Export**:
```python
# project_controller.py::export_tasks()
def export_tasks(project_id: str, format: str = "csv"):
    import csv
    from io import StringIO
    
    # Get all tasks
    tasks = Task.find_by_project(project_id)
    
    if format == "csv":
        # Create CSV
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "ticket_id", "title", "status", "priority", "assignee",
            "due_date", "story_points", "created_at"
        ])
        writer.writeheader()
        
        for task in tasks:
            assignee = User.find_by_id(task["assignee_id"]) if task.get("assignee_id") else None
            writer.writerow({
                "ticket_id": task["ticket_id"],
                "title": task["title"],
                "status": task["status"],
                "priority": task["priority"],
                "assignee": assignee["name"] if assignee else "Unassigned",
                "due_date": task.get("due_date", ""),
                "story_points": task.get("story_points", ""),
                "created_at": task["created_at"]
            })
        
        # Return as file response
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=tasks_{project_id}.csv"}
        )
```

**Export to Excel**:
```python
# project_controller.py::export_tasks_excel()
def export_tasks_excel(project_id: str):
    import pandas as pd
    from io import BytesIO
    
    tasks = Task.find_by_project(project_id)
    
    # Convert to DataFrame
    df = pd.DataFrame([
        {
            "Ticket ID": t["ticket_id"],
            "Title": t["title"],
            "Status": t["status"],
            "Priority": t["priority"],
            "Assignee": User.find_by_id(t["assignee_id"])["name"] if t.get("assignee_id") else "Unassigned",
            "Due Date": t.get("due_date", ""),
            "Story Points": t.get("story_points", ""),
            "Created At": t["created_at"]
        }
        for t in tasks
    ])
    
    # Save to Excel
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Tasks')
    
    output.seek(0)
    
    return Response(
        content=output.read(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=tasks_{project_id}.xlsx"}
    )
```

---

### 9.4 Activity Timeline

**Activity Feed**:
```javascript
// Dashboard.js
const loadRecentActivities = async (projectId) => {
  const response = await fetch(`/api/projects/${projectId}/activities?limit=50`, {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  
  // data.activities: [
  //   {
  //     type: 'task_created',
  //     user_name: 'John Doe',
  //     task_title: 'Implement login',
  //     created_at: '2024-01-15T10:30:00Z'
  //   },
  //   ...
  // ]
  
  return (
    <div className="activity-feed">
      {data.activities.map(activity => (
        <ActivityItem key={activity._id} activity={activity} />
      ))}
    </div>
  );
};
```

**Backend Activity Tracking**:
```python
# utils/activity_logger.py
def log_activity(project_id: str, user_id: str, activity_type: str, details: dict):
    """Log user activity for timeline"""
    Activity.create({
        "project_id": project_id,
        "user_id": user_id,
        "type": activity_type,  # task_created, task_updated, comment_added, etc.
        "details": details,
        "created_at": datetime.utcnow().isoformat()
    })

# Usage in task_controller.py::create_task()
log_activity(
    project_id=task["project_id"],
    user_id=user_id,
    activity_type="task_created",
    details={
        "task_id": str(task["_id"]),
        "task_title": task["title"],
        "ticket_id": task["ticket_id"]
    }
)
```

---

## 10. Calendar & Timeline View

**Frontend**: `CalendarView.js`  
**Backend**: `GET /api/calendar/events`  
**Library**: `react-big-calendar`

### 10.1 Calendar Display

**Calendar Component**:
```javascript
// Calendar/CalendarView.js
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

export function CalendarView() {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('month'); // 'month', 'week', 'day', 'agenda'
  
  useEffect(() => {
    loadCalendarEvents();
  }, []);
  
  const loadCalendarEvents = async () => {
    const response = await fetch('/api/calendar/events', {
      headers: getAuthHeaders()
    });
    const data = await response.json();
    
    // Transform tasks to calendar events
    const calendarEvents = data.events.map(event => ({
      id: event._id,
      title: event.type === 'task' ? event.ticket_id + ': ' + event.title : event.title,
      start: new Date(event.start_date),
      end: new Date(event.end_date || event.start_date),
      resource: event,
      type: event.type  // 'task', 'sprint', 'deadline'
    }));
    
    setEvents(calendarEvents);
  };
  
  const handleSelectEvent = (event) => {
    if (event.type === 'task') {
      openTaskDetailModal(event.id);
    } else if (event.type === 'sprint') {
      navigateToSprintDetail(event.id);
    }
  };
  
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6';  // default blue
    
    if (event.type === 'task') {
      // Color by priority
      const priority = event.resource.priority;
      backgroundColor = {
        'Low': '#10b981',
        'Medium': '#f59e0b',
        'High': '#ef4444',
        'Critical': '#991b1b'
      }[priority] || '#3b82f6';
    } else if (event.type === 'sprint') {
      backgroundColor = '#8b5cf6';  // purple
    } else if (event.type === 'deadline') {
      backgroundColor = '#dc2626';  // red
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };
  
  return (
    <div className="calendar-container" style={{ height: '700px' }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day', 'agenda']}
        popup
      />
    </div>
  );
}
```

**Backend Calendar Events**:
```python
# calendar_controller.py::get_calendar_events()
def get_calendar_events(user_id: str, start_date: str = None, end_date: str = None):
    from datetime import datetime, timedelta
    
    # Default date range: current month
    if not start_date:
        start_date = datetime.utcnow().replace(day=1).isoformat()
    if not end_date:
        # Last day of month
        end_date = (datetime.utcnow().replace(day=1) + timedelta(days=32)).replace(day=1).isoformat()
    
    events = []
    
    # 1. Get tasks with due dates
    tasks = Task.find({
        "assignee_id": user_id,
        "due_date": {
            "$gte": start_date,
            "$lte": end_date
        }
    })
    
    for task in tasks:
        events.append({
            "_id": str(task["_id"]),
            "type": "task",
            "ticket_id": task["ticket_id"],
            "title": task["title"],
            "start_date": task["due_date"],
            "end_date": task["due_date"],
            "priority": task["priority"],
            "status": task["status"]
        })
    
    # 2. Get sprints in date range
    projects = Project.find_by_user(user_id)
    project_ids = [str(p["_id"]) for p in projects]
    
    sprints = Sprint.find({
        "project_id": {"$in": project_ids},
        "$or": [
            {"start_date": {"$gte": start_date, "$lte": end_date}},
            {"end_date": {"$gte": start_date, "$lte": end_date}}
        ]
    })
    
    for sprint in sprints:
        events.append({
            "_id": str(sprint["_id"]),
            "type": "sprint",
            "title": sprint["name"],
            "start_date": sprint["start_date"],
            "end_date": sprint["end_date"],
            "status": sprint["status"]
        })
    
    return success_response({"events": events})
```

---

### 10.2 Timeline View (Gantt Chart Style)

**Timeline Display**:
```javascript
// Display tasks as horizontal bars in timeline
const TimelineView = ({ tasks }) => {
  const sortedTasks = tasks.sort((a, b) => 
    new Date(a.due_date) - new Date(b.due_date)
  );
  
  return (
    <div className="timeline-view">
      {sortedTasks.map(task => (
        <div key={task.id} className="timeline-row">
          <div className="task-info">
            <span className="ticket-id">{task.ticket_id}</span>
            <span className="task-title">{task.title}</span>
          </div>
          
          <div className="timeline-bar-container">
            <div 
              className="timeline-bar"
              style={{
                left: `${calculatePosition(task.created_at)}%`,
                width: `${calculateDuration(task.created_at, task.due_date)}%`,
                backgroundColor: getPriorityColor(task.priority)
              }}
            >
              <span className="duration-label">
                {calculateDays(task.created_at, task.due_date)} days
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 11. Profile & User Settings

**Frontend**: `ProfilePage.js`  
**Backend**: `GET/PUT /api/profile`, `PUT /api/profile/password`  
**Controller**: `profile_controller.py`

### 11.1 Profile Information

**View/Edit Profile**:
```javascript
// Profile/ProfilePage.js
const [profile, setProfile] = useState({
  name: '',
  email: '',
  department: '',
  bio: '',
  avatar_url: ''
});
const [isEditing, setIsEditing] = useState(false);

const loadProfile = async () => {
  const response = await fetch('/api/profile', {
    headers: getAuthHeaders()
  });
  const data = await response.json();
  setProfile(data.profile);
};

const updateProfile = async () => {
  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: profile.name,
        department: profile.department,
        bio: profile.bio
      })
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('Profile updated successfully');
      setIsEditing(false);
    }
  } catch (error) {
    toast.error('Failed to update profile');
  }
};
```

**Backend Profile Update**:
```python
# profile_controller.py::update_profile()
def update_profile(user_id: str, body_str: str):
    data = json.loads(body_str)
    
    # Validate fields
    if "name" in data and not data["name"].strip():
        return error_response("Name cannot be empty", 400)
    
    if "email" in data:
        # Check if email already exists (for other users)
        existing = User.find_by_email(data["email"])
        if existing and str(existing["_id"]) != user_id:
            return error_response("Email already in use", 400)
    
    # Update allowed fields only
    allowed_fields = ["name", "email", "department", "bio"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    User.update(user_id, update_data)
    updated_user = User.find_by_id(user_id)
    
    return success_response({"profile": updated_user})
```

---

### 11.2 Avatar Upload

**Upload Avatar**:
```javascript
const uploadAvatar = async (file) => {
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    toast.error('Please upload an image file');
    return;
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.error('Image size must be less than 5MB');
    return;
  }
  
  const formData = new FormData();
  formData.append('avatar', file);
  
  try {
    const response = await fetch('/api/profile/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    
    const data = await response.json();
    if (data.success) {
      setProfile(prev => ({ ...prev, avatar_url: data.avatar_url }));
      toast.success('Avatar updated');
    }
  } catch (error) {
    toast.error('Failed to upload avatar');
  }
};
```

**Backend Avatar Processing**:
```python
# profile_controller.py::upload_avatar()
async def upload_avatar(user_id: str, file: UploadFile):
    from PIL import Image
    import uuid
    
    # Validate image
    try:
        image = Image.open(file.file)
        image.verify()
    except:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Resize to 200x200 (profile picture size)
    image = Image.open(file.file)  # Re-open after verify
    image = image.resize((200, 200), Image.LANCZOS)
    
    # Generate unique filename
    filename = f"avatar_{user_id}_{uuid.uuid4().hex[:8]}.jpg"
    filepath = f"uploads/avatars/{filename}"
    
    # Save
    image.save(filepath, "JPEG", quality=85)
    
    # Delete old avatar if exists
    user = User.find_by_id(user_id)
    if user.get("avatar_url"):
        old_path = user["avatar_url"].lstrip('/')
        if os.path.exists(old_path):
            os.remove(old_path)
    
    # Update user record
    avatar_url = f"/{filepath}"
    User.update(user_id, {"avatar_url": avatar_url})
    
    return success_response({"avatar_url": avatar_url})
```

---

### 11.3 Password Change

**Change Password Form**:
```javascript
const changePassword = async () => {
  if (!passwordData.current_password || !passwordData.new_password) {
    toast.error('All fields are required');
    return;
  }
  
  if (passwordData.new_password !== passwordData.confirm_password) {
    toast.error('New passwords do not match');
    return;
  }
  
  if (passwordData.new_password.length < 8) {
    toast.error('Password must be at least 8 characters');
    return;
  }
  
  try {
    const response = await fetch('/api/profile/password', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      })
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('Password changed successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error('Failed to change password');
  }
};
```

**Backend Password Change**:
```python
# profile_controller.py::change_password()
def change_password(user_id: str, body_str: str):
    from utils.auth_utils import hash_password, verify_password
    
    data = json.loads(body_str)
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    
    # Validate
    if not current_password or not new_password:
        return error_response("Both passwords are required", 400)
    
    if len(new_password) < 8:
        return error_response("New password must be at least 8 characters", 400)
    
    # Verify current password
    user = User.find_by_id(user_id)
    if not verify_password(current_password, user["password"]):
        return error_response("Current password is incorrect", 400)
    
    # Hash new password
    hashed = hash_password(new_password)
    
    # Update password
    User.update(user_id, {"password": hashed})
    
    return success_response({"message": "Password changed successfully"})
```

---

### 11.4 Notification Preferences

**Settings UI**:
```javascript
const [notificationSettings, setNotificationSettings] = useState({
  email_task_assigned: true,
  email_task_completed: false,
  email_comment_mention: true,
  email_daily_digest: true,
  push_task_assigned: true,
  push_comment_mention: true
});

const saveNotificationSettings = async () => {
  try {
    const response = await fetch('/api/profile/notification-settings', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(notificationSettings)
    });
    
    const data = await response.json();
    if (data.success) {
      toast.success('Settings saved');
    }
  } catch (error) {
    toast.error('Failed to save settings');
  }
};
```

---

### 11. System Dashboard (Super Admin Only)

**Page**: `SuperAdminDashboard.js`  
**Backend**: `GET /api/system-dashboard/analytics`  
**Permission**: Only users with `super_admin` role

#### Features:
- **User Management**
  - View all users with pagination
  - Create new users (bypass registration)
  - Edit user details (name, email, department, role)
  - Deactivate/activate users
  - Delete users (soft delete)
  - Role assignment (including promoting to admin/super_admin)

- **System Statistics**
  - Total users count (active/inactive breakdown)
  - Active projects count
  - Total tasks count (by status distribution)
  - System health metrics (CPU, memory, disk usage)
  - Storage usage (uploads folder size)
  - Database size

- **Activity Monitoring**
  - Recent logins (last 50)
  - Recent activities across all projects
  - Error logs (from application)
  - System alerts (failed logins, API errors)

- **Data Management**
  - Database backups (manual trigger)
  - Data export (CSV/JSON for all entities)
  - Bulk operations (bulk user creation, task migration)
  - Data cleanup (delete old sessions, orphaned files)

---

### 12. Search Functionality

#### Features:
- **Global Search**
  - Search across all entities (tasks, projects, users)
  - Real-time results as you type (debounced)
  - Result categorization by entity type
  - Click result to navigate to detail view

- **Advanced Search**
  - Multiple filters (date range, status, priority, assignee)
  - Boolean operators (AND, OR, NOT)
  - Save search queries for reuse
  - Export search results to CSV

---

### 13. Notifications System (Planned)

#### Planned Features:
- **In-app Notifications**
  - Task assignments
  - Task status updates
  - @mentions in comments
  - Project updates
  - Sprint start/complete

- **Email Notifications**
  - Daily digest (tasks due today)
  - Weekly summary (project progress)
  - Custom alerts (overdue tasks)
  - Reminder emails (upcoming deadlines)

---

### 14. Mobile Responsiveness

#### Features:
- **Responsive Design**
  - Mobile-friendly layouts (breakpoints at 768px, 480px)
  - Touch-optimized controls (larger tap targets)
  - Adaptive navigation (hamburger menu on mobile)
  - Optimized performance (lazy loading, image compression)

- **Mobile Gestures**
  - Swipe actions (swipe task card to delete)
  - Pull to refresh (task list, project list)
  - Touch drag-and-drop (Kanban board)

---

### 15. Security Features

#### Features:
- **Authentication Security**
  - JWT token encryption (HS256 algorithm)
  - Tab session key validation (CSRF protection)
  - Token expiration (24 hours)
  - Secure password storage (bcrypt hashing)

- **Authorization**
  - Role-based access control (5 roles)
  - Resource-level permissions (project membership)
  - Action-level controls (can edit own tasks only)

- **Data Protection**
  - HTTPS in production (SSL/TLS encryption)
  - CORS configuration (allowed origins)
  - Input validation (Pydantic schemas)
  - SQL injection prevention (MongoDB parameterized queries)
  - XSS protection (HTML escaping in frontend)

- **File Upload Security**
  - File type validation (whitelist)
  - File size limits (10MB for chat, 50MB for data viz)
  - Virus scanning (planned integration with ClamAV)
  - Secure storage (uploads outside web root)

---

## Feature Access by Role

This table summarizes which features are accessible to each role in the DOIT system.

### Complete Feature Access Matrix

| Feature | Viewer | Team Member | Manager | Admin | Super Admin |
|---------|--------|-------------|---------|-------|-------------|
| **Authentication & Authorization** |
| Login/Logout | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change Password | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Project Management** |
| View Projects | ✅ (assigned) | ✅ (assigned) | ✅ (all) | ✅ (all) | ✅ (all) |
| Create Projects | ❌ | ❌ | ✅ | ✅ | ✅ |
| Edit Projects | ❌ | ❌ | ✅ (own) | ✅ | ✅ |
| Delete Projects | ❌ | ❌ | ❌ | ✅ (own) | ✅ |
| Add Team Members | ❌ | ❌ | ✅ (own) | ✅ | ✅ |
| Remove Team Members | ❌ | ❌ | ✅ (own) | ✅ | ✅ |
| Archive Projects | ❌ | ❌ | ✅ (own) | ✅ | ✅ |
| **Task Management** |
| View Tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Tasks | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit Own Tasks | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit Any Task | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete Tasks | ❌ | ❌ | ✅ | ✅ | ✅ |
| Assign Tasks | ❌ | ✅ (limit) | ✅ | ✅ | ✅ |
| Change Task Status | ❌ | ✅ (own) | ✅ | ✅ | ✅ |
| Approve Task Completion | ❌ | ❌ | ✅ | ✅ | ✅ |
| Add Comments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Own Comments | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete Any Comment | ❌ | ❌ | ✅ | ✅ | ✅ |
| Upload Attachments | ❌ | ✅ | ✅ | ✅ | ✅ |
| View Activity Log | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Kanban Board** |
| View Kanban Board | ✅ | ✅ | ✅ | ✅ | ✅ |
| Drag & Drop Tasks | ❌ | ✅ (own) | ✅ | ✅ | ✅ |
| Filter Tasks | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sprint Management** |
| View Sprints | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Sprints | ❌ | ❌ | ✅ | ✅ | ✅ |
| Start/Complete Sprints | ❌ | ❌ | ✅ | ✅ | ✅ |
| Add Tasks to Sprint | ❌ | ❌ | ✅ | ✅ | ✅ |
| Remove Tasks from Sprint | ❌ | ❌ | ✅ | ✅ | ✅ |
| View Burndown Chart | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GitHub Integration** |
| Connect Repository | ❌ | ❌ | ✅ (own) | ✅ | ✅ |
| View Git Activity | ✅ | ✅ | ✅ | ✅ | ✅ |
| Webhook Configuration | ❌ | ❌ | ✅ (own) | ✅ | ✅ |
| **Team Chat** |
| View Channels | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send Messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Own Messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete Any Message | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create Channels | ❌ | ❌ | ❌ | ✅ (own project) | ✅ |
| Delete Channels | ❌ | ❌ | ❌ | ✅ (own project) | ✅ |
| Upload Files | ✅ | ✅ | ✅ | ✅ | ✅ |
| React to Messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AI Assistant (DOIT-AI)** |
| Access AI Chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Conversations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send Messages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload Files for Analysis | ✅ | ✅ | ✅ | ✅ | ✅ |
| Generate Images | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete Conversations | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | ✅ |
| **Data Visualization** |
| Upload Datasets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analyze Datasets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Generate Charts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Download Visualizations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete Datasets | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | ✅ |
| **Dashboard & Analytics** |
| View My Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Task Statistics | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Project Progress | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Team Velocity | ❌ | ❌ | ✅ | ✅ | ✅ |
| Export Reports (CSV/Excel) | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Calendar & Timeline** |
| View Calendar | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Timeline | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User Management** |
| View All Users | ❌ | ❌ | ❌ | ✅ | ✅ |
| Create Users | ❌ | ❌ | ❌ | ❌ | ✅ |
| Edit User Roles | ❌ | ❌ | ❌ | ❌ | ✅ |
| Deactivate Users | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete Users | ❌ | ❌ | ❌ | ❌ | ✅ |
| **System Dashboard** |
| View System Stats | ❌ | ❌ | ❌ | ❌ | ✅ |
| View All Activities | ❌ | ❌ | ❌ | ❌ | ✅ |
| Database Backup | ❌ | ❌ | ❌ | ❌ | ✅ |
| System Export | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Error Logs | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Search** |
| Global Search | ✅ | ✅ | ✅ | ✅ | ✅ |
| Advanced Search | ✅ | ✅ | ✅ | ✅ | ✅ |
| Save Search Queries | ❌ | ✅ | ✅ | ✅ | ✅ |

### Role Descriptions

**Viewer**: Read-only access to assigned projects and tasks. Can participate in discussions and use AI features but cannot create or modify any content.

**Team Member**: Basic contributor role. Can create and edit own tasks, participate in team chat, use all AI and visualization features. Limited to projects they are assigned to.

**Manager**: Project management role. Can create projects, manage sprints, assign tasks, and oversee team activities. Has edit access to all tasks within their projects.

**Admin**: Organization administrator. Full access to all projects and features except system-wide administration. Can manage users within projects and configure integrations.

**Super Admin**: System-wide administrator. Complete access to all features including user management, system dashboard, and system configuration. Can perform critical operations like backups and data exports.

### Permission Notes

1. **Project Membership**: All features require the user to be a member of the relevant project (except Super Admin who has access to all projects).

2. **Task Ownership**: "Own tasks" refers to tasks where the user is the assignee or creator.

3. **Dynamic Permissions**: Some permissions may be further restricted based on project-specific settings (e.g., approval_required flag on tasks).

4. **Feature Flags**: Certain features may be disabled at the system level, overriding role-based permissions.

---

## Summary

The DOIT Project Management System provides a comprehensive suite of features designed for modern Agile software teams:

- **15 Major Feature Areas**: Authentication, Project Management, Task Management, Sprint Management, GitHub Integration, Team Chat, AI Assistant, Data Visualization, Dashboard & Analytics, Calendar, Profile Settings, System Dashboard, Search, Mobile Support, and Security.

- **5 User Roles**: Flexible role-based access control with granular permissions from Viewer to Super Admin.

- **Real-time Collaboration**: WebSocket-powered Kanban board and team chat for instant updates across the team.

- **AI Integration**: GPT-5.2-chat powered assistant and FLUX-1.1-pro image generation for enhanced productivity.

- **Developer-Friendly**: GitHub integration with automatic ticket tracking from commit messages and branch names.

- **Data-Driven**: Advanced analytics, burndown charts, velocity tracking, and customizable data visualizations.

- **Enterprise-Ready**: Multi-project support, comprehensive security, audit logging, and system administration features.

This documentation serves as the complete technical reference for the DOIT system, providing Azure AI Agent with detailed knowledge of all features, implementation patterns, and usage examples.
