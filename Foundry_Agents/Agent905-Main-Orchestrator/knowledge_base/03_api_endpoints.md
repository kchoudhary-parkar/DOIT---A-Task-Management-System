# DOIT Project - Complete API Endpoints Documentation

## Base URL
- **Development**: `http://localhost:8000`
- **Production**: `https://your-domain.com` (when deployed)
- **API Prefix**: `/api`
- **API Documentation**: `http://localhost:8000/docs` (FastAPI Swagger UI)
- **Alternative Docs**: `http://localhost:8000/redoc` (ReDoc UI)

## Global Headers

### Authentication Headers (Required for Protected Endpoints)
All endpoints except `/api/auth/register` and `/api/auth/login` require:

```http
Authorization: Bearer <JWT_TOKEN>
X-Tab-Session-Key: <TAB_SESSION_KEY>
```

- **`Authorization`**: JWT token obtained from login/register endpoints
- **`X-Tab-Session-Key`**: Unique session identifier per browser tab (auto-generated)
  - Used for multi-tab session management
  - Stored in `sessionStorage` on frontend
  - Format: `tab_<random>_<timestamp>`

### Content-Type Headers
- **JSON Endpoints**: `Content-Type: application/json`
- **File Upload Endpoints**: `multipart/form-data` (browser auto-sets with boundary)

## Global Response Format

All API responses follow a consistent structure:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description",
  "detail": "Additional error details (optional)"
}
```

### HTTP Status Codes
- **200 OK**: Successful GET request
- **201 Created**: Successful POST request that creates a resource
- **400 Bad Request**: Invalid request data or missing parameters
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions for the operation
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

---

## API Endpoint Categories

1. [Authentication & Session Management](#1-authentication--session-management) (10 endpoints)
2. [User Management](#2-user-management) (3 endpoints)
3. [Project Management](#3-project-management) (5 endpoints)
4. [Project Members Management](#4-project-members-management) (3 endpoints)
5. [Task Management](#5-task-management) (17 endpoints)
6. [Sprint Management](#6-sprint-management) (10 endpoints)
7. [Dashboard & Analytics](#7-dashboard--analytics) (3 endpoints)
8. [Profile Management](#8-profile-management) (5 endpoints)
9. [Team Chat](#9-team-chat) (12 endpoints + WebSocket)
10. [AI Assistant](#10-ai-assistant) (8 endpoints)
11. [Data Visualization](#11-data-visualization) (8 endpoints)
12. [GitHub Integration](#12-github-integration) (1 endpoint)
13. [WebSocket Endpoints](#13-websocket-endpoints) (2 WebSocket connections)

**Total: 85+ REST API Endpoints + 2 WebSocket Connections**

---


## 1. Authentication & Session Management

Authentication endpoints handle user registration, login, session management, and profile access.

### 1.1 POST /api/auth/register
**Description**: Register a new user account

**Authentication**: Not required

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "confirm_password": "Password123!"
}
```

**Field Validation**:
- `name`: 3-30 characters, required
- `email`: Valid email format, required, must be unique
- `password`: 8-128 characters, required
- `confirm_password`: Optional, must match password if provided

**Success Response (200)**:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "674d5e8f1234567890abcdef",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "team_member",
    "created_at": "2026-02-12T10:30:00Z",
    "token_version": 0
  }
}
```

**Error Responses**:
- `400`: Email already exists
- `400`: Invalid email format
- `400`: Password too short (minimum 8 characters)

---

### 1.2 POST /api/auth/login
**Description**: Authenticate user and get JWT token

**Authentication**: Not required

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "674d5e8f1234567890abcdef",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "team_member",
    "token_version": 0
  }
}
```

**Error Responses**:
- `401`: Invalid email or password
- `400`: Missing email or password

**JWT Token Contents**:
```json
{
  "user_id": "674d5e8f1234567890abcdef",
  "email": "john@example.com",
  "role": "team_member",
  "token_version": 0,
  "exp": 1740216600  // Expiration timestamp
}
```

---

### 1.3 POST /api/auth/clerk-sync
**Description**: Sync Clerk authentication with backend (for Clerk integration)

**Authentication**: Not required

**Request Body:**
```json
{
  "clerk_token": "clerk_jwt_token",
  "email": "john@example.com",
  "name": "John Doe",
  "clerk_user_id": "user_clerk123"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "token": "backend_jwt_token",
  "user": {
    "_id": "674d5e8f1234567890abcdef",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "team_member",
    "clerk_user_id": "user_clerk123"
  }
}
```

**Use Case**: Integrate Clerk authentication with backend user management

---

### 1.4 GET /api/auth/profile
**Description**: Get current authenticated user profile

**Authentication**: Required

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
X-Tab-Session-Key: <TAB_SESSION_KEY>
```

**Success Response (200)**:
```json
{
  "success": true,
  "user": {
    "_id": "674d5e8f1234567890abcdef",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "team_member",
    "created_at": "2026-02-12T10:30:00Z",
    "token_version": 0
  }
}
```

**Error Responses**:
- `401`: Invalid or expired token
- `404`: User not found

---

### 1.5 POST /api/auth/logout
**Description**: Logout current tab session (invalidates session key, keeps token valid)

**Authentication**: Required

**Request Body:**
```json
{
  "token_id": "tab_abc123_1740216000"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note**: Only logs out the specific tab session, not all sessions

---

### 1.6 POST /api/auth/logout-all
**Description**: Logout from ALL sessions (forced logout, invalidates all tokens)

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "message": "All sessions logged out successfully"
}
```

**Implementation**: Increments `token_version` in database, making all existing JWT tokens invalid

**Use Cases**:
- User changes password
- Security breach detected
- Admin forces user logout

---

### 1.7 POST /api/auth/refresh-session
**Description**: Create a new tab session (renew session key)

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "session_key": "tab_xyz789_1740216600",
  "message": "Session refreshed"
}
```

**Use Case**: Generate new session key for a new browser tab

---

### 1.8 GET /api/auth/sessions
**Description**: Get all active sessions for current user

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "sessions": [
    {
      "session_key": "tab_abc123_1740216000",
      "created_at": "2026-02-12T10:30:00Z",
      "last_activity": "2026-02-12T15:45:00Z",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 ..."
    }
  ]
}
```

**Use Case**: Display active sessions, allow user to revoke specific sessions

---

### 1.9 POST /api/auth/change-password
**Description**: Change user password (requires current password)

**Authentication**: Required

**Request Body:**
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!",
  "confirm_password": "NewPassword456!"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Password changed successfully. All sessions have been logged out."
}
```

**Implementation**: 
1. Verifies current password
2. Updates password hash
3. Increments `token_version` (forces logout from all devices)
4. Returns success message

**Error Responses**:
- `401`: Current password is incorrect
- `400`: New password doesn't meet requirements
- `400`: New password matches old password

---

## 2. User Management

User management endpoints (admin and super-admin only)

### 2.1 GET /api/users/search
**Description**: Search users by email (partial match)

**Authentication**: Required

**Query Parameters**:
- `email` (required): Email query string (case-insensitive)

**Example Request**:
```http
GET /api/users/search?email=john
```

**Success Response (200)**:
```json
{
  "success": true,
  "users": [
    {
      "_id": "674d5e8f1234567890abcdef",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "team_member"
    },
    {
      "_id": "674d5e8f1234567890abcdff",
      "name": "Johnny Smith",
      "email": "johnny@example.com",
      "role": "admin"
    }
  ]
}
```

**Use Case**: Add members to project by searching for users

---

### 2.2 GET /api/users
**Description**: Get all users (admin and super-admin only)

**Authentication**: Required (Admin or Super-Admin role)

**Success Response (200)**:
```json
{
  "success": true,
  "users": [
    {
      "_id": "674d5e8f1234567890abcdef",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "team_member",
      "is_active": true,
      "created_at": "2026-01-15T10:30:00Z"
    },
    {
      "_id": "674d5e8f1234567890abcdff",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-01-10T08:00:00Z"
    }
  ]
}
```

**Error Responses**:
- `403`: User doesn't have admin privileges

---

### 2.3 PUT /api/users/role
**Description**: Update user role (super-admin only)

**Authentication**: Required (Super-Admin role)

**Request Body:**
```json
{
  "user_id": "674d5e8f1234567890abcdef",
  "role": "admin"
}
```

**Available Roles**:
- `team_member`: Regular user
- `admin`: Project admin (can manage projects and users)
- `super_admin`: System admin (full access)

**Success Response (200)**:
```json
{
  "success": true,
  "message": "User role updated successfully",
  "user": {
    "_id": "674d5e8f1234567890abcdef",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin"
  }
}
```

**Error Responses**:
- `403`: Only super-admin can update roles
- `404`: User not found
- `400`: Invalid role specified

---

## 3. Project Management

Project CRUD operations

### 3.1 POST /api/projects
**Description**: Create a new project

**Authentication**: Required

**Request Body:**
```json
{
  "name": "Website Redesign",
  "description": "Complete overhaul of company website with modern design"
}
```

**Field Validation**:
- `name`: Minimum 3 characters, required
- `description`: Optional, default empty string

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Project created successfully",
  "project": {
    "_id": "674d5e8f1234567890project",
    "name": "Website Redesign",
    "description": "Complete overhaul of company website with modern design",
    "prefix": "WR",  // Auto-generated project prefix
    "owner_id": "674d5e8f1234567890abcdef",
    "owner_name": "John Doe",
    "members": [
      {
        "user_id": "674d5e8f1234567890abcdef",
        "email": "john@example.com",
        "username": "John Doe",
        "role": "admin",
        "joined_at": "2026-02-12T10:30:00Z"
      }
    ],
    "git_repo_url": null,
    "github_token": null,
    "created_at": "2026-02-12T10:30:00Z",
    "updated_at": "2026-02-12T10:30:00Z"
  }
}
```

**Implementation Details**:
- Owner is automatically added as admin member
- Project prefix is auto-generated from project name (e.g., "Website Redesign" → "WR")
- Used for task ticket IDs (e.g., "WR-001", "WR-002")

---

### 3.2 GET /api/projects
**Description**: Get all projects for current user (owned or member)

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "projects": [
    {
      "_id": "674d5e8f1234567890project",
      "name": "Website Redesign",
      "description": "Complete overhaul of company website",
      "prefix": "WR",
      "owner_id": "674d5e8f1234567890abcdef",
      "owner_name": "John Doe",
      "members": [],  // Member details in full response
      "task_count": 15,
      "completed_task_count": 8,
      "created_at": "2026-02-12T10:30:00Z"
    }
  ]
}
```

**Query Logic**: Returns projects where user is:
- Project owner (`owner_id` matches user)
- Project member (`members` array contains user)

---

### 3.3 GET /api/projects/{project_id}
**Description**: Get specific project details

**Authentication**: Required (must be project owner or member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Example Request**:
```http
GET /api/projects/674d5e8f1234567890project
```

**Success Response (200)**:
```json
{
  "success": true,
  "project": {
    "_id": "674d5e8f1234567890project",
    "name": "Website Redesign",
    "description": "Complete overhaul of company website with modern design",
    "prefix": "WR",
    "owner_id": "674d5e8f1234567890abcdef",
    "owner_name": "John Doe",
    "members": [
      {
        "user_id": "674d5e8f1234567890abcdef",
        "email": "john@example.com",
        "username": "John Doe",
        "role": "admin",
        "joined_at": "2026-02-12T10:30:00Z"
      },
      {
        "user_id": "674d5e8f1234567890abcde0",
        "email": "jane@example.com",
        "username": "Jane Smith",
        "role": "member",
        "joined_at": "2026-02-12T11:00:00Z"
      }
    ],
    "git_repo_url": "https://github.com/company/website-redesign",
    "github_token": "ghp_encrypted_token",  // Encrypted in database
    "created_at": "2026-02-12T10:30:00Z",
    "updated_at": "2026-02-12T15:30:00Z"
  }
}
```

**Error Responses**:
- `403`: User is not a project member
- `404`: Project not found

---

### 3.4 PUT /api/projects/{project_id}
**Description**: Update project information

**Authentication**: Required (must be project owner or admin member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Request Body:**
```json
{
  "name": "Website Redesign v2",
  "description": "Updated project description with new goals"
}
```

**Updatable Fields**:
- `name`: New project name (min 3 characters)
- `description`: New project description

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Project updated successfully",
  "project": {
    "_id": "674d5e8f1234567890project",
    "name": "Website Redesign v2",
    "description": "Updated project description with new goals",
    "updated_at": "2026-02-12T16:00:00Z"
  }
}
```

**Error Responses**:
- `403`: User doesn't have permission to update project
- `404`: Project not found
- `400`: Invalid project name (too short)

---

### 3.5 DELETE /api/projects/{project_id}
**Description**: Delete project (and all associated tasks, sprints)</

**Authentication**: Required (must be project owner)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Cascade Deletion**:
- Deletes all tasks associated with the project
- Deletes all sprints associated with the project
- Deletes default chat channel
- Removes project from all members' lists

**Error Responses**:
- `403`: Only project owner can delete project
- `404`: Project not found

**Warning**: This operation is irreversible

---
```


## 4. Project Members Management

Manage team members within projects

### 4.1 POST /api/projects/{project_id}/members
**Description**: Add a member to project

**Authentication**: Required (must be project owner or admin member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Request Body:**
```json
{
  "email": "newmember@example.com"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Member added successfully",
  "member": {
    "user_id": "674d5e8f1234567890abcde1",
    "email": "newmember@example.com",
    "username": "New Member",
    "role": "member",
    "joined_at": "2026-02-12T17:00:00Z"
  }
}
```

**Implementation**:
1. Searches for user by email
2. Adds user to project's members array with denormalized data
3. New member has "member" role by default

**Error Responses**:
- `404`: User with email not found
- `400`: User is already a project member
- `403`: Insufficient permissions to add members

---

### 4.2 GET /api/projects/{project_id}/members
**Description**: Get all members of a project

**Authentication**: Required (must be project member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Success Response (200)**:
```json
{
  "success": true,
  "members": [
    {
      "user_id": "674d5e8f1234567890abcdef",
      "email": "john@example.com",
      "username": "John Doe",
      "role": "admin",
      "joined_at": "2026-02-12T10:30:00Z"
    },
    {
      "user_id": "674d5e8f1234567890abcde0",
      "email": "jane@example.com",
      "username": "Jane Smith",
      "role": "member",
      "joined_at": "2026-02-12T15:00:00Z"
    }
  ]
}
```

**Member Roles**:
- `admin`: Can add/remove members, manage project settings
- `member`: Can create/edit tasks, participate in sprints

---

### 4.3 DELETE /api/projects/{project_id}/members/{member_user_id}
**Description**: Remove a member from project

**Authentication**: Required (must be project owner or admin member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project
- `member_user_id`: MongoDB ObjectId of the user to remove

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Error Responses**:
- `403`: Cannot remove project owner
- `403`: Insufficient permissions to remove members
- `404`: Member not found in project

**Note**: Project owner cannot be removed

---

## 5. Task Management

Comprehensive task management with Kanban board support

### 5.1 POST /api/tasks
**Description**: Create a new task

**Authentication**: Required (must be project member)

**Request Body:**
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication system with refresh tokens",
  "project_id": "674d5e8f1234567890project",
  "assignee_id": "674d5e8f1234567890abcdef",
  "priority": "High",
  "status": "To Do",
  "due_date": "2026-02-20T23:59:59Z",
  "issue_type": "task",
  "labels": ["backend", "security"]
}
```

**Field Options**:
- `title`: Required, minimum 3 characters
- `description`: Optional, supports markdown
- `project_id`: Required, must be valid project
- `assignee_id`: Optional, user must be project member
- `priority`: "Low" | "Medium" | "High" | "Critical" (default: "Medium")
- `status`: "To Do" | "In Progress" | "In Review" | "Done" (default: "To Do")
- `due_date`: Optional, ISO 8601 datetime string
- `issue_type`: "task" | "bug" | "story" | "epic" (default: "task")
- `labels`: Optional array of strings

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Task created successfully",
  "task": {
    "_id": "674d5e8f1234567890task01",
    "ticket_id": "WR-001",  // Auto-generated: {project_prefix}-{number}
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication system with refresh tokens",
    "project_id": "674d5e8f1234567890project",
    "project_name": "Website Redesign",
    "assignee_id": "674d5e8f1234567890abcdef",
    "assignee_name": "John Doe",
    "assignee_email": "john@example.com",
    "priority": "High",
    "status": "To Do",
    "due_date": "2026-02-20T23:59:59Z",
    "issue_type": "task",
    "labels": ["backend", "security"],
    "sprint_id": null,
    "in_backlog": true,
    "comments": [],
    "attachments": [],
    "activities": [
      {
        "user_id": "674d5e8f1234567890abcdef",
        "username": "John Doe",
        "action": "created",
        "timestamp": "2026-02-12T17:30:00Z"
      }
    ],
    "links": [],
    "watchers": ["674d5e8f1234567890abcdef"],
    "created_by": "674d5e8f1234567890abcdef",
    "created_at": "2026-02-12T17:30:00Z",
    "updated_at": "2026-02-12T17:30:00Z"
  }
}
```

**Unique Ticket ID Generation**:
- Format: `{PROJECT_PREFIX}-{SEQUENCE}`
- Example: "WR-001", "WR-002", "WR-003"
- Sequence is auto-incremented per project

---

### 5.2 GET /api/tasks/project/{project_id}
**Description**: Get all tasks for a project (Kanban board data)

**Authentication**: Required (must be project member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Success Response (200)**:
```json
{
  "success": true,
  "tasks": [
    {
      "_id": "674d5e8f1234567890task01",
      "ticket_id": "WR-001",
      "title": "Implement user authentication",
      "description": "Add JWT-based authentication...",
      "status": "In Progress",
      "priority": "High",
      "assignee_name": "John Doe",
      "assignee_id": "674d5e8f1234567890abcdef",
      "due_date": "2026-02-20T23:59:59Z",
      "labels": ["backend", "security"],
      "comments_count": 3,
      "attachments_count": 1,
      "updated_at": "2026-02-12T18:00:00Z"
    }
  ]
}
```

**Use Case**: Load Kanban board columns (To Do, In Progress, In Review, Done)

---

### 5.3 GET /api/tasks/my
**Description**: Get all tasks assigned to current user

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "tasks": [
    {
      "_id": "674d5e8f1234567890task01",
      "ticket_id": "WR-001",
      "title": "Implement user authentication",
      "project_name": "Website Redesign",
      "priority": "High",
      "status": "In Progress",
      "due_date": "2026-02-20T23:59:59Z"
    }
  ]
}
```

**Use Case**: "My Tasks" dashboard page

---

### 5.4 GET /api/tasks/pending-approval
**Description**: Get all tasks waiting for approval (status: "Done", not yet approved)

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "tasks": [
    {
      "_id": "674d5e8f1234567890task02",
      "ticket_id": "WR-002",
      "title": "Design landing page",
      "project_name": "Website Redesign",
      "assignee_name": "Jane Smith",
      "status": "Done",
      "created_at": "2026-02-11T10:00:00Z"
    }
  ]
}
```

**Use Case**: Project managers review completed tasks before closing

---

### 5.5 GET /api/tasks/closed
**Description**: Get all closed/approved tasks

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "tasks": [
    {
      "_id": "674d5e8f1234567890task03",
      "ticket_id": "WR-003",
      "title": "Setup CI/CD pipeline",
      "project_name": "Website Redesign",
      "status": "Closed",
      "closed_at": "2026-02-10T16:00:00Z"
    }
  ]
}
```

---

### 5.6 GET /api/tasks/{task_id}
**Description**: Get detailed task information

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Success Response (200)**:
```json
{
  "success": true,
  "task": {
    "_id": "674d5e8f1234567890task01",
    "ticket_id": "WR-001",
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication system with refresh tokens\\n\\n## Requirements:\\n- JWT token generation\\n- Refresh token mechanism",
    "project_id": "674d5e8f1234567890project",
    "project_name": "Website Redesign",
    "assignee_id": "674d5e8f1234567890abcdef",
    "assignee_name": "John Doe",
    "assignee_email": "john@example.com",
    "priority": "High",
    "status": "In Progress",
    "due_date": "2026-02-20T23:59:59Z",
    "issue_type": "task",
    "labels": ["backend", "security"],
    "sprint_id": "674d5e8f1234567890sprint",
    "sprint_name": "Sprint 5",
    "comments": [
      {
        "user_id": "674d5e8f1234567890abcdef",
        "username": "John Doe",
        "comment": "Started working on this task",
        "created_at": "2026-02-12T18:00:00Z"
      }
    ],
    "attachments": [
      {
        "name": "auth-flow-diagram.png",
        "url": "/uploads/tasks/auth-flow-diagram.png",
        "uploaded_by": "674d5e8f1234567890abcdef",
        "uploaded_at": "2026-02-12T17:45:00Z",
        "size": 245678,
        "fileType": "image/png"
      }
    ],
    "activities": [
      {
        "user_id": "674d5e8f1234567890abcdef",
        "username": "John Doe",
        "action": "status_changed",
        "field_changed": "status",
        "old_value": "To Do",
        "new_value": "In Progress",
        "timestamp": "2026-02-12T18:00:00Z"
      }
    ],
    "links": [
      {
        "task_id": "674d5e8f1234567890task04",
        "ticket_id": "WR-004",
        "title": "Setup database",
        "link_type": "blocks",  // This task blocks WR-004
        "created_at": "2026-02-12T17:35:00Z"
      }
    ],
    "watchers": ["674d5e8f1234567890abcdef", "674d5e8f1234567890abcde0"],
    "created_by": "674d5e8f1234567890abcdef",
    "created_at": "2026-02-12T17:30:00Z",
    "updated_at": "2026-02-12T18:00:00Z"
  }
}
```

**Link Types**:
- `blocks`: This task blocks another task
- `is_blocked_by`: This task is blocked by another task
- `relates_to`: Related task
- `duplicates`: This is a duplicate of another task

---

### 5.7 PUT /api/tasks/{task_id}
**Description**: Update task (critical for Kanban drag-and-drop)

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Request Body (Partial Updates Allowed)**:
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "In Progress",
  "priority": "Critical",
  "assignee_id": "674d5e8f1234567890abcde0",
  "due_date": "2026-02-25T23:59:59Z",
  "comment": "Moved to In Progress column"
}
```

**Updatable Fields**:
- `title`, `description`, `status`, `priority`, `assignee_id`, `due_date`, `issue_type`, `labels`
- `comment`: Optional comment describing the change (added to activities log)

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "_id": "674d5e8f1234567890task01",
    "status": "In Progress",
    "updated_at": "2026-02-12T18:30:00Z"
  }
}
```

**WebSocket Broadcast**: Sends real-time update to all users viewing the Kanban board

**Activity Logging**: Automatically logs changes to `activities` array

---

### 5.8 DELETE /api/tasks/{task_id}
**Description**: Delete task

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

### 5.9 POST /api/tasks/{task_id}/labels
**Description**: Add label to task

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Request Body:**
```json
{
  "label": "frontend"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Label added successfully",
  "task": {
    "_id": "674d5e8f1234567890task01",
    "labels": ["backend", "security", "frontend"]
  }
}
```

---

### 5.10 DELETE /api/tasks/{task_id}/labels/{label}
**Description**: Remove label from task

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task
- `label`: Label string (URL encoded if contains special characters)

**Example**:
```http
DELETE /api/tasks/674d5e8f1234567890task01/labels/frontend
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Label removed successfully"
}
```

---

### 5.11 GET /api/tasks/labels/{project_id}
**Description**: Get all unique labels used in a project

**Authentication**: Required (must be project member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Success Response (200)**:
```json
{
  "success": true,
  "labels": ["backend", "frontend", "security", "bug", "enhancement"]
}
```

**Use Case**: Label autocomplete/suggestions when creating tasks

---

### 5.12 POST /api/tasks/{task_id}/attachments
**Description**: Add attachment to task

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Request Body:**
```json
{
  "name": "Design Mockup",
  "url": "/uploads/tasks/design-mockup.png",
  "fileName": "design-mockup.png",
  "fileType": "image/png",
  "fileSize": 1024567
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Attachment added successfully",
  "attachment": {
    "name": "Design Mockup",
    "url": "/uploads/tasks/design-mockup.png",
    "uploaded_by": "674d5e8f1234567890abcdef",
    "uploaded_at": "2026-02-12T19:00:00Z",
    "size": 1024567,
    "fileType": "image/png"
  }
}
```

**Note**: File upload must be done separately (to cloud storage or static files), this endpoint only stores metadata

---

### 5.13 DELETE /api/tasks/{task_id}/attachments
**Description**: Remove attachment from task

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Request Body:**
```json
{
  "url": "/uploads/tasks/design-mockup.png"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Attachment removed successfully"
}
```

---

### 5.14 POST /api/tasks/{task_id}/links
**Description**: Add link to another task (task relationships)

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Request Body:**
```json
{
  "linked_task_id": "674d5e8f1234567890task04",
  "linked_ticket_id": "WR-004",
  "type": "blocks"
}
```

**Link Types**:
- `blocks`: Current task blocks the linked task
- `is_blocked_by`: Current task is blocked by the linked task
- `relates_to`: Tasks are related
- `duplicates`: Current task duplicates the linked task

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Task link added successfully",
  "link": {
    "task_id": "674d5e8f1234567890task04",
    "ticket_id": "WR-004",
    "title": "Setup database",
    "link_type": "blocks",
    "created_at": "2026-02-12T19:15:00Z"
  }
}
```

---

### 5.15 DELETE /api/tasks/{task_id}/links
**Description**: Remove task link

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Request Body:**
```json
{
  "linked_task_id": "674d5e8f1234567890task04",
  "type": "blocks"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Task link removed successfully"
}
```

---

### 5.16 POST /api/tasks/{task_id}/approve
**Description**: Approve and close task (moves from "Done" to "Closed")

**Authentication**: Required (must be project owner or admin)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Task approved and closed successfully",
  "task": {
    "_id": "674d5e8f1234567890task01",
    "status": "Closed",
    "closed_at": "2026-02-12T20:00:00Z"
  }
}
```

**Workflow**:
1. Developer marks task as "Done"
2. Project manager reviews task
3. Manager approves task (this endpoint)
4. Task status changes to "Closed"

---

### 5.17 POST /api/tasks/{task_id}/comments
**Description**: Add comment to task

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Request Body:**
```json
{
  "comment": "I've completed the JWT implementation. Ready for review."
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Comment added successfully",
  "comment": {
    "user_id": "674d5e8f1234567890abcdef",
    "username": "John Doe",
    "comment": "I've completed the JWT implementation. Ready for review.",
    "created_at": "2026-02-12T20:15:00Z"
  }
}
```

**Implementation**: Comment is embedded in task document's `comments` array

---

## 6. Sprint Management

Agile sprint planning and execution

### 6.1 POST /api/projects/{project_id}/sprints
**Description**: Create a new sprint

**Authentication**: Required (must be project owner or admin)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Request Body:**
```json
{
  "name": "Sprint 5",
  "goal": "Complete user authentication and profile management features",
  "start_date": "2026-02-17T00:00:00Z",
  "end_date": "2026-03-03T23:59:59Z"
}
```

**Field Requirements**:
- `name`: Required
- `goal`: Optional, sprint objective
- `start_date`: Required, ISO 8601 datetime
- `end_date`: Required, must be after start_date

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Sprint created successfully",
  "sprint": {
    "_id": "674d5e8f1234567890sprint",
    "name": "Sprint 5",
    "goal": "Complete user authentication and profile management features",
    "project_id": "674d5e8f1234567890project",
    "project_name": "Website Redesign",
    "status": "planned",
    "start_date": "2026-02-17T00:00:00Z",
    "end_date": "2026-03-03T23:59:59Z",
    "total_tasks_snapshot": 0,
    "completed_tasks_snapshot": 0,
    "created_at": "2026-02-12T20:30:00Z",
    "updated_at": "2026-02-12T20:30:00Z"
  }
}
```

**Sprint Statuses**:
- `planned`: Sprint created but not started
- `active`: Sprint is currently running
- `completed`: Sprint has ended

---

### 6.2 GET /api/projects/{project_id}/sprints
**Description**: Get all sprints for a project

**Authentication**: Required (must be project member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Success Response (200)**:
```json
{
  "success": true,
  "sprints": [
    {
      "_id": "674d5e8f1234567890sprint",
      "name": "Sprint 5",
      "goal": "Complete user authentication and profile management features",
      "status": "active",
      "start_date": "2026-02-17T00:00:00Z",
      "end_date": "2026-03-03T23:59:59Z",
      "task_count": 8,
      "completed_count": 3,
      "progress_percentage": 37.5
    },
    {
      "_id": "674d5e8f1234567890sprint2",
      "name": "Sprint 4",
      "status": "completed",
      "start_date": "2026-02-03T00:00:00Z",
      "end_date": "2026-02-16T23:59:59Z",
      "total_tasks_snapshot": 12,
      "completed_tasks_snapshot": 11,
      "progress_percentage": 91.7
    }
  ]
}
```

---

### 6.3 GET /api/sprints/{sprint_id}
**Description**: Get detailed sprint information

**Authentication**: Required (must be project member)

**Path Parameters**:
- `sprint_id`: MongoDB ObjectId of the sprint

**Success Response (200)**:
```json
{
  "success": true,
  "sprint": {
    "_id": "674d5e8f1234567890sprint",
    "name": "Sprint 5",
    "goal": "Complete user authentication and profile management features",
    "project_id": "674d5e8f1234567890project",
    "status": "active",
    "start_date": "2026-02-17T00:00:00Z",
    "end_date": "2026-03-03T23:59:59Z",
    "tasks": [
      {
        "_id": "674d5e8f1234567890task01",
        "ticket_id": "WR-001",
        "title": "Implement user authentication",
        "status": "In Progress",
        "assignee_name": "John Doe"
      }
    ],
    "total_tasks_snapshot": 8,
    "completed_tasks_snapshot": 3
  }
}
```

---

### 6.4 PUT /api/sprints/{sprint_id}
**Description**: Update sprint details

**Authentication**: Required (must be project owner or admin)

**Path Parameters**:
- `sprint_id`: MongoDB ObjectId of the sprint

**Request Body (Partial Updates)**:
```json
{
  "name": "Sprint 5 - Extended",
  "goal": "Updated sprint goal",
  "end_date": "2026-03-05T23:59:59Z"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Sprint updated successfully"
}
```

---

### 6.5 DELETE /api/sprints/{sprint_id}
**Description**: Delete sprint (moves tasks back to backlog)

**Authentication**: Required (must be project owner or admin)

**Path Parameters**:
- `sprint_id`: MongoDB ObjectId of the sprint

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Sprint deleted successfully"
}
```

**Implementation**: All tasks in sprint are moved to backlog (`sprint_id` set to null, `in_backlog` set to true)

---

### 6.6 POST /api/sprints/{sprint_id}/start
**Description**: Start sprint (change status from "planned" to "active")

**Authentication**: Required (must be project owner or admin)

**Path Parameters**:
- `sprint_id`: MongoDB ObjectId of the sprint

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Sprint started successfully",
  "sprint": {
    "_id": "674d5e8f1234567890sprint",
    "name": "Sprint 5",
    "status": "active",
    "start_date": "2026-02-17T00:00:00Z"
  }
}
```

**Business Logic**:
- Only one sprint can be active per project at a time
- Previous active sprint is automatically completed
- Tasks remain assigned to the sprint

---

### 6.7 POST /api/sprints/{sprint_id}/complete
**Description**: Complete sprint (take snapshot of task completion)

**Authentication**: Required (must be project owner or admin)

**Path Parameters**:
- `sprint_id`: MongoDB ObjectId of the sprint

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Sprint completed successfully",
  "sprint": {
    "_id": "674d5e8f1234567890sprint",
    "name": "Sprint 5",
    "status": "completed",
    "end_date": "2026-03-03T23:59:59Z",
    "total_tasks_snapshot": 8,
    "completed_tasks_snapshot": 6,
    "completion_rate": 75.0
  }
}
```

**Implementation**:
1. Takes snapshot of total tasks and completed tasks
2. Calculates completion rate
3. Moves incomplete tasks back to backlog
4. Changes sprint status to "completed"

---

### 6.8 POST /api/sprints/{sprint_id}/tasks
**Description**: Add task to sprint

**Authentication**: Required (must be project member)

**Path Parameters**:
- `sprint_id`: MongoDB ObjectId of the sprint

**Request Body:**
```json
{
  "task_id": "674d5e8f1234567890task05"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Task added to sprint successfully"
}
```

**Implementation**: Updates task's `sprint_id` field and sets `in_backlog` to false

---

### 6.9 DELETE /api/sprints/{sprint_id}/tasks/{task_id}
**Description**: Remove task from sprint (move to backlog)

**Authentication**: Required (must be project member)

**Path Parameters**:
- `sprint_id`: MongoDB ObjectId of the sprint
- `task_id`: MongoDB ObjectId of the task

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Task removed from sprint successfully"
}
```

**Implementation**: Sets task's `sprint_id` to null and `in_backlog` to true

---

### 6.10 GET /api/projects/{project_id}/backlog
**Description**: Get backlog tasks (tasks not assigned to any sprint)

**Authentication**: Required (must be project member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Success Response (200)**:
```json
{
  "success": true,
  "backlog": [
    {
      "_id": "674d5e8f1234567890task06",
      "ticket_id": "WR-006",
      "title": "Design contact form",
      "priority": "Medium",
      "issue_type": "task",
      "created_at": "2026-02-12T15:00:00Z"
    }
  ]
}
```

---

### 6.11 GET /api/projects/{project_id}/available-tasks
**Description**: Get tasks available for sprint planning (backlog + unassigned)

**Authentication**: Required (must be project member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Success Response (200)**:
```json
{
  "success": true,
  "tasks": [
    {
      "_id": "674d5e8f1234567890task06",
      "ticket_id": "WR-006",
      "title": "Design contact form",
      "priority": "Medium",
      "assignee_name": "Jane Smith",
      "in_backlog": true,
      "sprint_id": null
    }
  ]
}
```

**Use Case**: Sprint planning interface - drag tasks from backlog to sprint

---

## 7. Dashboard & Analytics

Dashboard statistics and reporting

### 7.1 GET /api/dashboard/analytics
**Description**: Get dashboard analytics for current user

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "analytics": {
    "total_projects": 5,
    "active_projects": 3,
    "total_tasks": 45,
    "my_tasks": 12,
    "completed_tasks": 28,
    "in_progress_tasks": 10,
    "review_tasks": 5,
    "todo_tasks": 2,
    "upcoming_deadlines": [
      {
        "task_id": "674d5e8f1234567890task01",
        "ticket_id": "WR-001",
        "title": "Implement user authentication",
        "due_date": "2026-02-20T23:59:59Z",
        "days_remaining": 8
      }
    ],
    "task_completion_rate": 62.2,
    "tasks_by_priority": {
      "Critical": 3,
      "High": 8,
      "Medium": 15,
      "Low": 2
    },
    "tasks_by_status": {
      "To Do": 2,
      "In Progress": 10,
      "In Review": 5,
      "Done": 28
    },
    "active_sprints": [
      {
        "sprint_id": "674d5e8f1234567890sprint",
        "name": "Sprint 5",
        "project_name": "Website Redesign",
        "progress": 37.5,
        "days_remaining": 19
      }
    ]
  }
}
```

**Use Case**: Main dashboard page with statistics cards and charts

---

### 7.2 GET /api/dashboard/report
**Description**: Get downloadable report data (for export)

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "report": {
    "generated_at": "2026-02-12T21:00:00Z",
    "user": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "projects": [
      {
        "name": "Website Redesign",
        "total_tasks": 15,
        "completed_tasks": 8,
        "in_progress": 5,
        "completion_rate": 53.3
      }
    ],
    "my_tasks_summary": {
      "total": 12,
      "completed": 5,
      "in_progress": 4,
      "todo": 3
    },
    "productivity_metrics": {
      "tasks_completed_this_week": 3,
      "tasks_completed_this_month": 15,
      "average_completion_time_hours": 18.5
    }
  }
}
```

**Use Case**: Export dashboard data to PDF or CSV

---

### 7.3 GET /api/dashboard/system
**Description**: Get system-wide analytics (Super-Admin only)

**Authentication**: Required (Super-Admin role)

**Success Response (200)**:
```json
{
  "success": true,
  "system_analytics": {
    "total_users": 45,
    "active_users_last_7_days": 32,
    "total_projects": 15,
    "total_tasks": 320,
    "completed_tasks": 198,
    "tasks_created_this_month": 45,
    "average_project_completion": 61.9,
    "user_growth": {
      "this_month": 8,
      "last_month": 5
    },
    "most_active_projects": [
      {
        "project_name": "Website Redesign",
        "task_count": 45,
        "member_count": 8
      }
    ],
    "users_by_role": {
      "super_admin": 1,
      "admin": 5,
      "team_member": 39
    }
  }
}
```

**Use Case**: System dashboard for monitoring platform health

---

## 8. Profile Management

Extended user profile information management

### 8.1 GET /api/profile
**Description**: Get current user's extended profile

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "profile": {
    "_id": "674d5e8f1234567890profile",
    "user_id": "674d5e8f1234567890abcdef",
    "personal": {
      "full_name": "John Doe",
      "phone": "+1234567890",
      "date_of_birth": "1990-01-15",
      "address": "123 Main St, City, Country",
      "bio": "Software Engineer passionate about web development"
    },
    "education": [
      {
        "degree": "Bachelor of Science",
        "field": "Computer Science",
        "institution": "University of Technology",
        "start_year": "2010",
        "end_year": "2014",
        "grade": "3.8 GPA"
      }
    ],
    "certificates": [
      {
        "title": "AWS Certified Solutions Architect",
        "issuer": "Amazon Web Services",
        "issue_date": "2024-06-15",
        "credential_id": "AWS-SA-2024-12345"
      }
    ],
    "organization": {
      "company_name": "Tech Solutions Inc.",
      "position": "Senior Software Engineer",
      "department": "Engineering",
      "join_date": "2020-03-01"
    },
    "created_at": "2026-02-12T10:30:00Z",
    "updated_at": "2026-02-12T21:30:00Z"
  }
}
```

**Note**: Returns empty profile structure if profile doesn't exist

---

### 8.2 PUT /api/profile/personal
**Description**: Update personal information

**Authentication**: Required

**Request Body:**
```json
{
  "data": {
    "full_name": "John Doe",
    "phone": "+1234567890",
    "date_of_birth": "1990-01-15",
    "address": "123 Main St, City, Country",
    "bio": "Software Engineer passionate about web development and AI"
  }
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Personal information updated successfully",
  "profile": {
    "personal": {
      "full_name": "John Doe",
      "phone": "+1234567890",
      "date_of_birth": "1990-01-15",
      "address": "123 Main St, City, Country",
      "bio": "Software Engineer passionate about web development and AI"
    }
  }
}
```

**Implementation**: Uses upsert pattern (creates profile if doesn't exist)

---

### 8.3 PUT /api/profile/education
**Description**: Update education history

**Authentication**: Required

**Request Body:**
```json
{
  "education": [
    {
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "institution": "University of Technology",
      "start_year": "2010",
      "end_year": "2014",
      "grade": "3.8 GPA"
    },
    {
      "degree": "Master of Science",
      "field": "Artificial Intelligence",
      "institution": "Tech Institute",
      "start_year": "2015",
      "end_year": "2017",
      "grade": "4.0 GPA"
    }
  ]
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Education updated successfully"
}
```

**Note**: Replaces entire education array (not incremental update)

---

### 8.4 PUT /api/profile/certificates
**Description**: Update certificates/certifications

**Authentication**: Required

**Request Body:**
```json
{
  "certificates": [
    {
      "title": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "issue_date": "2024-06-15",
      "credential_id": "AWS-SA-2024-12345"
    },
    {
      "title": "Microsoft Azure Developer Associate",
      "issuer": "Microsoft",
      "issue_date": "2025-01-10",
      "credential_id": "AZ-204-2025-67890"
    }
  ]
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Certificates updated successfully"
}
```

---

### 8.5 PUT /api/profile/organization
**Description**: Update organization/employment information

**Authentication**: Required

**Request Body:**
```json
{
  "data": {
    "company_name": "Tech Solutions Inc.",
    "position": "Senior Software Engineer",
    "department": "Engineering",
    "join_date": "2020-03-01"
  }
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Organization information updated successfully"
}
```

---

## 9. Team Chat

Real-time team collaboration with chat channels

### 9.1 GET /api/team-chat/projects
**Description**: Get all projects with chat access for current user

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "projects": [
    {
      "_id": "674d5e8f1234567890project",
      "name": "Website Redesign",
      "prefix": "WR",
      "unread_count": 5,
      "last_message": {
        "text": "Let's discuss the authentication flow",
        "sender_name": "Jane Smith",
        "created_at": "2026-02-12T22:15:00Z"
      }
    }
  ]
}
```

**Use Case**: List projects in team chat sidebar

---

### 9.2 GET /api/team-chat/projects/{project_id}/channels
**Description**: Get all channels for a project

**Authentication**: Required (must be project member)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Success Response (200)**:
```json
{
  "success": true,
  "channels": [
    {
      "_id": "674d5e8f1234567890channel1",
      "name": "general",
      "description": "General project discussions",
      "project_id": "674d5e8f1234567890project",
      "is_default": true,
      "members": ["674d5e8f1234567890abcdef", "674d5e8f1234567890abcde0"],
      "unread_count": 3,
      "last_message": {
        "text": "Meeting at 3 PM",
        "sender_name": "John Doe",
        "created_at": "2026-02-12T22:30:00Z"
      },
      "created_at": "2026-02-12T10:30:00Z"
    },
    {
      "_id": "674d5e8f1234567890channel2",
      "name": "backend-team",
      "description": "Backend development discussions",
      "is_default": false,
      "unread_count": 0,
      "created_at": "2026-02-12T15:00:00Z"
    }
  ]
}
```

**Default Channel**: Every project has a default "general" channel created automatically

---

### 9.3 POST /api/team-chat/projects/{project_id}/channels
**Description**: Create a new channel in project

**Authentication**: Required (must be project owner or admin)

**Path Parameters**:
- `project_id`: MongoDB ObjectId of the project

**Request Body:**
```json
{
  "name": "frontend-team",
  "description": "Frontend development discussions"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "message": "Channel created successfully",
  "channel": {
    "_id": "674d5e8f1234567890channel3",
    "name": "frontend-team",
    "description": "Frontend development discussions",
    "project_id": "674d5e8f1234567890project",
    "is_default": false,
    "members": [],
    "created_at": "2026-02-12T23:00:00Z"
  }
}
```

---

### 9.4 DELETE /api/team-chat/channels/{channel_id}
**Description**: Delete a channel

**Authentication**: Required (must be project owner or admin)

**Path Parameters**:
- `channel_id`: MongoDB ObjectId of the channel

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Channel deleted successfully"
}
```

**Error Responses**:
- `400`: Cannot delete default channel

---

### 9.5 GET /api/team-chat/channels/{channel_id}/messages
**Description**: Get messages from a channel (with pagination)

**Authentication**: Required (must have access to channel)

**Path Parameters**:
- `channel_id`: MongoDB ObjectId of the channel

**Query Parameters**:
- `limit`: Number of messages to retrieve (default: 50, max: 100)
- `before`: ISO 8601 timestamp - get messages before this time (for pagination)

**Example Request**:
```http
GET /api/team-chat/channels/674d5e8f1234567890channel1/messages?limit=50&before=2026-02-12T22:00:00Z
```

**Success Response (200)**:
```json
{
  "success": true,
  "messages": [
    {
      "_id": "674d5e8f1234567890message1",
      "channel_id": "674d5e8f1234567890channel1",
      "sender_id": "674d5e8f1234567890abcdef",
      "sender_name": "John Doe",
      "sender_email": "john@example.com",
      "text": "Let's discuss the authentication flow for the new feature",
      "attachments": [
        {
          "name": "auth-flow.png",
          "url": "/uploads/chat_attachments/auth-flow.png",
          "type": "image",
          "size": 125678
        }
      ],
      "reactions": [
        {
          "emoji": "👍",
          "users": ["674d5e8f1234567890abcde0", "674d5e8f1234567890abcde1"]
        }
      ],
      "thread_count": 3,
      "read_by": ["674d5e8f1234567890abcdef", "674d5e8f1234567890abcde0"],
      "edited": false,
      "created_at": "2026-02-12T22:15:00Z",
      "updated_at": "2026-02-12T22:15:00Z"
    }
  ],
  "has_more": true,
  "next_before": "2026-02-12T21:00:00Z"
}
```

**Pagination**: Use `next_before` value in subsequent requests to load older messages

---

### 9.6 POST /api/team-chat/channels/{channel_id}/messages
**Description**: Send a message to channel

**Authentication**: Required (must have access to channel)

**Path Parameters**:
- `channel_id`: MongoDB ObjectId of the channel

**Request Body:**
```json
{
  "text": "Here's the updated design mockup for review",
  "attachments": [
    {
      "name": "mockup-v2.png",
      "url": "/uploads/chat_attachments/mockup-v2.png",
      "type": "image",
      "size": 256789
    }
  ]
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "message": {
    "_id": "674d5e8f1234567890message2",
    "channel_id": "674d5e8f1234567890channel1",
    "sender_id": "674d5e8f1234567890abcdef",
    "sender_name": "John Doe",
    "text": "Here's the updated design mockup for review",
    "attachments": [
      {
        "name": "mockup-v2.png",
        "url": "/uploads/chat_attachments/mockup-v2.png",
        "type": "image",
        "size": 256789
      }
    ],
    "reactions": [],
    "thread_count": 0,
    "read_by": ["674d5e8f1234567890abcdef"],
    "created_at": "2026-02-12T23:15:00Z"
  }
}
```

**WebSocket Broadcast**: Message is broadcast to all users connected to the channel via WebSocket

---

### 9.7 PUT /api/team-chat/channels/{channel_id}/messages/{message_id}
**Description**: Edit a message (must be message sender)

**Authentication**: Required

**Path Parameters**:
- `channel_id`: MongoDB ObjectId of the channel
- `message_id`: MongoDB ObjectId of the message

**Request Body:**
```json
{
  "text": "Updated message content"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": {
    "_id": "674d5e8f1234567890message2",
    "text": "Updated message content",
    "edited": true,
    "updated_at": "2026-02-12T23:20:00Z"
  }
}
```

**Error Responses**:
- `403`: Can only edit own messages
- `400`: Cannot edit messages older than 24 hours

---

### 9.8 DELETE /api/team-chat/channels/{channel_id}/messages/{message_id}
**Description**: Delete a message

**Authentication**: Required (must be message sender or channel admin)

**Path Parameters**:
- `channel_id`: MongoDB ObjectId of the channel
- `message_id`: MongoDB ObjectId of the message

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Message deleted successfully"
}
```

**Implementation**: Message is marked as deleted, not physically removed (maintains thread integrity)

---

### 9.9 POST /api/team-chat/channels/{channel_id}/messages/{message_id}/reactions
**Description**: Add/remove reaction to message (toggle behavior)

**Authentication**: Required

**Path Parameters**:
- `channel_id`: MongoDB ObjectId of the channel
- `message_id`: MongoDB ObjectId of the message

**Request Body:**
```json
{
  "emoji": "👍"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Reaction toggled successfully",
  "reactions": [
    {
      "emoji": "👍",
      "users": ["674d5e8f1234567890abcdef", "674d5e8f1234567890abcde0", "674d5e8f1234567890abcde1"]
    }
  ]
}
```

**Behavior**:
- If user hasn't reacted with emoji: Adds reaction
- If user already reacted with emoji: Removes reaction

---

### 9.10 POST /api/team-chat/channels/{channel_id}/messages/{message_id}/replies
**Description**: Post a reply to message (threaded conversation)

**Authentication**: Required

**Path Parameters**:
- `channel_id`: MongoDB ObjectId of the channel
- `message_id`: MongoDB ObjectId of the parent message

**Request Body:**
```json
{
  "text": "I'll review this and get back to you by EOD"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "reply": {
    "_id": "674d5e8f1234567890reply01",
    "parent_message_id": "674d5e8f1234567890message2",
    "sender_id": "674d5e8f1234567890abcde0",
    "sender_name": "Jane Smith",
    "text": "I'll review this and get back to you by EOD",
    "created_at": "2026-02-12T23:25:00Z"
  }
}
```

**Use Case**: Organize discussions in threads to keep main channel clean

---

### 9.11 POST /api/team-chat/upload
**Description**: Upload file attachment for team chat

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: File to upload (max size: 10MB)

**Success Response (200)**:
```json
{
  "success": true,
  "file": {
    "name": "document.pdf",
    "url": "/uploads/chat_attachments/20260212_233000_document.pdf",
    "type": "application/pdf",
    "size": 1245678
  }
}
```

**Supported File Types**:
- Images: jpg, jpeg, png, gif, svg
- Documents: pdf, doc, docx, xls, xlsx, ppt, pptx
- Code: txt, md, json, xml, csv
- Archives: zip, rar

**Use Case**: Upload file first, then include URL in message

---

### 9.12 POST /api/team-chat/channels/{channel_id}/read
**Description**: Mark messages as read

**Authentication**: Required

**Path Parameters**:
- `channel_id`: MongoDB ObjectId of the channel

**Request Body:**
```json
{
  "message_ids": [
    "674d5e8f1234567890message1",
    "674d5e8f1234567890message2",
    "674d5e8f1234567890message3"
  ]
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Messages marked as read"
}
```

**Use Case**: Update read receipts when user views channel

---

## 10. AI Assistant

ChatGPT-like AI interface with Azure AI Foundry integration

### 10.1 POST /api/ai-assistant/conversations
**Description**: Create a new AI conversation

**Authentication**: Required

**Request Body:**
```json
{
  "title": "Data Analysis Discussion"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "conversation": {
    "_id": "674d5e8f1234567890conv01",
    "user_id": "674d5e8f1234567890abcdef",
    "title": "Data Analysis Discussion",
    "message_count": 0,
    "created_at": "2026-02-12T23:30:00Z",
    "updated_at": "2026-02-12T23:30:00Z"
  }
}
```

---

### 10.2 GET /api/ai-assistant/conversations
**Description**: Get all AI conversations for current user

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "conversations": [
    {
      "_id": "674d5e8f1234567890conv01",
      "title": "Data Analysis Discussion",
      "message_count": 15,
      "last_message_preview": "Based on the CSV data you provided, I can see...",
      "created_at": "2026-02-12T23:30:00Z",
      "updated_at": "2026-02-13T10:15:00Z"
    },
    {
      "_id": "674d5e8f1234567890conv02",
      "title": "Python Code Review",
      "message_count": 8,
      "last_message_preview": "Here's the refactored code with improvements...",
      "created_at": "2026-02-11T14:00:00Z",
      "updated_at": "2026-02-11T16:30:00Z"
    }
  ]
}
```

**Sorting**: Most recently updated conversations first

---

### 10.3 GET /api/ai-assistant/conversations/{conversation_id}/messages
**Description**: Get all messages in a conversation

**Authentication**: Required (must own conversation)

**Path Parameters**:
- `conversation_id`: MongoDB ObjectId of the conversation

**Success Response (200)**:
```json
{
  "success": true,
  "messages": [
    {
      "_id": "674d5e8f1234567890msg001",
      "conversation_id": "674d5e8f1234567890conv01",
      "role": "user",
      "content": "Can you analyze this sales data for me?",
      "attachments": [
        {
          "filename": "sales_data.csv",
          "filepath": "/uploads/ai_attachments/20260212_233000_sales_data.csv",
          "size": 45678,
          "type": "csv"
        }
      ],
      "tokens": 12,
      "created_at": "2026-02-12T23:30:15Z"
    },
    {
      "_id": "674d5e8f1234567890msg002",
      "conversation_id": "674d5e8f1234567890conv01",
      "role": "assistant",
      "content": "I've analyzed your sales data CSV file. Here are the key insights:\\n\\n1. **Total Revenue**: $1,234,567\\n2. **Top Product**: Widget A (35% of sales)\\n3. **Growth Trend**: +15% YoY\\n\\nWould you like me to create visualizations?",
      "tokens": 187,
      "created_at": "2026-02-12T23:30:22Z"
    }
  ]
}
```

**Message Roles**:
- `user`: Message from user
- `assistant`: Response from AI

---

### 10.4 POST /api/ai-assistant/conversations/{conversation_id}/messages
**Description**: Send message and get AI response

**Authentication**: Required (must own conversation)

**Path Parameters**:
- `conversation_id`: MongoDB ObjectId of the conversation

**Request Body:**
```json
{
  "content": "Explain how JWT authentication works in detail",
  "stream": false
}
```

**Parameters**:
- `content`: User message (required)
- `stream`: Enable streaming response (optional, default: false)

**Success Response (200)**:
```json
{
  "success": true,
  "user_message": {
    "_id": "674d5e8f1234567890msg003",
    "role": "user",
    "content": "Explain how JWT authentication works in detail",
    "tokens": 8,
    "created_at": "2026-02-13T10:00:00Z"
  },
  "assistant_message": {
    "_id": "674d5e8f1234567890msg004",
    "role": "assistant",
    "content": "JWT (JSON Web Token) authentication is a stateless authentication mechanism...\\n\\n## How JWT Works:\\n\\n1. **User Login**:\\n   - User sends credentials to server\\n   - Server validates and creates JWT token\\n   - Token contains user data + signature\\n\\n2. **Token Structure**:\\n   - Header: Algorithm info\\n   - Payload: User claims\\n   - Signature: Verification\\n\\n3. **Authentication Flow**:\\n   - Client stores token (localStorage/cookie)\\n   - Sends token in Authorization header\\n   - Server verifies signature\\n   - Grants access if valid\\n\\n## Benefits:\\n- Stateless (no server-side sessions)\\n- Scalable across multiple servers\\n- Secure with HTTPS\\n- Supports refresh tokens for security",
    "tokens": 312,
    "created_at": "2026-02-13T10:00:05Z"
  },
  "tokens": {
    "prompt_tokens": 45,
    "completion_tokens": 312,
    "total_tokens": 357
  }
}
```

**AI Model**: GPT-5.2-chat (Azure OpenAI)

**Token Tracking**: Tracks tokens for billing and analytics

---

### 10.5 POST /api/ai-assistant/conversations/{conversation_id}/generate-image
**Description**: Generate AI image using FLUX-1.1-pro

**Authentication**: Required (must own conversation)

**Path Parameters**:
- `conversation_id`: MongoDB ObjectId of the conversation

**Request Body:**
```json
{
  "prompt": "A futuristic robot playing football in a neon-lit stadium"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "user_message": {
    "_id": "674d5e8f1234567890msg005",
    "role": "user",
    "content": "Generate image: A futuristic robot playing football in a neon-lit stadium",
    "created_at": "2026-02-13T10:05:00Z"
  },
  "assistant_message": {
    "_id": "674d5e8f1234567890msg006",
    "role": "assistant",
    "content": "I've generated an image based on your prompt: 'A futuristic robot playing football in a neon-lit stadium'",
    "image_url": "/uploads/ai_images/ai_generated_20260213_100500.png",
    "image_metadata": {
      "model": "FLUX-1.1-pro",
      "resolution": "1024x1024",
      "generation_time": 3.2
    },
    "created_at": "2026-02-13T10:05:03Z"
  }
}
```

**Image Model**: FLUX-1.1-pro (Azure AI Foundry)

**Generation Time**: Typically 2-5 seconds

---

### 10.6 POST /api/ai-assistant/conversations/{conversation_id}/upload
**Description**: Upload file to AI conversation for analysis

**Authentication**: Required (must own conversation)

**Path Parameters**:
- `conversation_id`: MongoDB ObjectId of the conversation

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: File to upload
- `message`: Optional message (default: "Analyze this file")

**Supported File Types**:
- **CSV**: Data analysis, statistics, insights
- **JSON**: Structure analysis, data extraction
- **TXT/MD**: Text analysis, summarization
- **PDF**: Text extraction and analysis
- **Images**: Image description and analysis

**Success Response (200)**:
```json
{
  "success": true,
  "user_message": {
    "_id": "674d5e8f1234567890msg007",
    "role": "user",
    "content": "Analyze this file",
    "attachments": [
      {
        "filename": "sales_report_q1.csv",
        "filepath": "/uploads/ai_attachments/20260213_101000_sales_report_q1.csv",
        "size": 125678,
        "type": "csv",
        "rows": 1500,
        "columns": 8
      }
    ],
    "created_at": "2026-02-13T10:10:00Z"
  },
  "assistant_message": {
    "_id": "674d5e8f1234567890msg008",
    "role": "assistant",
    "content": "I've analyzed your CSV file 'sales_report_q1.csv'. Here's what I found:\\n\\n**File Overview:**\\n- Rows: 1,500\\n- Columns: 8\\n\\n**Columns:**\\n1. date (datetime)\\n2. product_id (string)\\n3. product_name (string)\\n4. quantity (integer)\\n5. unit_price (float)\\n6. total_price (float)\\n7. region (string)\\n8. salesperson (string)\\n\\n**Key Statistics:**\\n- Total Revenue: $2,345,678\\n- Average Order: $1,563.79\\n- Top Region: North America (45%)\\n- Best Salesperson: John Smith ($456,789)\\n\\nI can now answer questions about this data. What would you like to know?",
    "created_at": "2026-02-13T10:10:05Z"
  }
}
```

**File Processing**: 
- CSV files are parsed and analyzed
- JSON files are structured and summarized
- Text files are read and understood
- AI has full context for follow-up questions

---

### 10.7 DELETE /api/ai-assistant/conversations/{conversation_id}
**Description**: Delete AI conversation and all messages

**Authentication**: Required (must own conversation)

**Path Parameters**:
- `conversation_id`: MongoDB ObjectId of the conversation

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

**Implementation**: Cascade deletes all messages in conversation

---

### 10.8 PATCH /api/ai-assistant/conversations/{conversation_id}/title
**Description**: Update conversation title

**Authentication**: Required (must own conversation)

**Path Parameters**:
- `conversation_id`: MongoDB ObjectId of the conversation

**Request Body:**
```json
{
  "title": "Q1 2026 Sales Data Analysis"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Conversation title updated successfully",
  "conversation": {
    "_id": "674d5e8f1234567890conv01",
    "title": "Q1 2026 Sales Data Analysis",
    "updated_at": "2026-02-13T10:15:00Z"
  }
}
```

---

### 10.9 GET /api/ai-assistant/health
**Description**: Health check for AI Assistant service

**Authentication**: Not required

**Success Response (200)**:
```json
{
  "status": "healthy",
  "service": "AI Assistant",
  "models": {
    "chat": "GPT-5.2-chat (Azure OpenAI)",
    "image": "FLUX-1.1-pro (Azure AI Foundry)"
  },
  "timestamp": "2026-02-13T10:20:00Z"
}
```

**Use Case**: Monitor AI service availability

---

## 11. Data Visualization

Upload and visualize data with AI-powered insights

### 11.1 POST /api/data-viz/upload
**Description**: Upload CSV/Excel dataset for visualization

**Authentication**: Required

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: CSV, XLSX, or XLS file (max: 50MB)

**Success Response (200)**:
```json
{
  "success": true,
  "dataset": {
    "_id": "674d5e8f1234567890dataset1",
    "user_id": "674d5e8f1234567890abcdef",
    "filename": "sales_data.csv",
    "file_type": "csv",
    "size": 256789,
    "rows": 1500,
    "columns": 8,
    "column_names": ["date", "product", "quantity", "revenue", "region", "category", "discount", "profit"],
    "preview": [
      {
        "date": "2026-01-01",
        "product": "Widget A",
        "quantity": 150,
        "revenue": 15000,
        "region": "North",
        "category": "Electronics",
        "discount": 0.1,
        "profit": 4500
      }
    ],
    "uploaded_at": "2026-02-13T10:30:00Z"
  }
}
```

**Supported Formats**: CSV, XLSX, XLS

**File Processing**: Automatically parses columns, detects data types, generates preview

---

### 11.2 GET /api/data-viz/datasets
**Description**: Get all uploaded datasets for current user

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "datasets": [
    {
      "_id": "674d5e8f1234567890dataset1",
      "filename": "sales_data.csv",
      "file_type": "csv",
      "size": 256789,
      "rows": 1500,
      "columns": 8,
      "uploaded_at": "2026-02-13T10:30:00Z"
    },
    {
      "_id": "674d5e8f1234567890dataset2",
      "filename": "customer_data.xlsx",
      "file_type": "xlsx",
      "size": 512345,
      "rows": 3200,
      "columns": 12,
      "uploaded_at": "2026-02-12T15:00:00Z"
    }
  ]
}
```

---

### 11.3 POST /api/data-viz/analyze
**Description**: Analyze dataset to get statistical insights

**Authentication**: Required (must own dataset)

**Request Body:**
```json
{
  "dataset_id": "674d5e8f1234567890dataset1"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "analysis": {
    "dataset_id": "674d5e8f1234567890dataset1",
    "basic_stats": {
      "total_rows": 1500,
      "total_columns": 8,
      "memory_usage": "234 KB"
    },
    "column_analysis": {
      "date": {
        "type": "datetime",
        "non_null": 1500,
        "null_count": 0
      },
      "product": {
        "type": "string",
        "unique_values": 25,
        "top_value": "Widget A",
        "frequency": 120
      },
      "quantity": {
        "type": "numeric",
        "mean": 125.5,
        "median": 115,
        "std": 45.2,
        "min": 10,
        "max": 500
      },
      "revenue": {
        "type": "numeric",
        "mean": 12550,
        "median": 11500,
        "std": 4520,
        "min": 1000,
        "max": 50000,
        "total": 18825000
      }
    },
    "correlations": {
      "quantity_revenue": 0.95,
      "discount_profit": -0.65
    },
    "missing_data": {
      "discount": 25
    }
  }
}
```

**Analysis Includes**:
- Basic statistics (mean, median, std, min, max)
- Data types detection
- Unique values count
- Null/missing data identification
- Correlation analysis

---

### 11.4 POST /api/data-viz/visualize
**Description**: Generate visualization from dataset

**Authentication**: Required (must own dataset)

**Request Body:**
```json
{
  "dataset_id": "674d5e8f1234567890dataset1",
  "config": {
    "chart_type": "scatter",
    "library": "plotly",
    "x_column": "quantity",
    "y_column": "revenue",
    "color_column": "region",
    "title": "Quantity vs Revenue by Region",
    "theme": "dark"
  }
}
```

**Configuration Options**:
- **chart_type**: `scatter`, `line`, `bar`, `histogram`, `box`, `violin`, `heatmap`, `pie`, `area`
- **library**: `plotly`, `seaborn`, `matplotlib`
- **x_column**: Column for X-axis
- **y_column**: Column for Y-axis (not required for histogram/pie)
- **color_column**: Column for color grouping (optional)
- **title**: Chart title (optional)
- **theme**: `light`, `dark` (default: light)

**Success Response (200)**:
```json
{
  "success": true,
  "visualization": {
    "_id": "674d5e8f1234567890viz001",
    "dataset_id": "674d5e8f1234567890dataset1",
    "user_id": "674d5e8f1234567890abcdef",
    "chart_type": "scatter",
    "library": "plotly",
    "config": {
      "x_column": "quantity",
      "y_column": "revenue",
      "color_column": "region",
      "title": "Quantity vs Revenue by Region"
    },
    "image_url": "/uploads/visualizations/viz_674d5e8f1234567890viz001.png",
    "html_url": "/api/data-viz/download/674d5e8f1234567890viz001?format=html",
    "created_at": "2026-02-13T11:00:00Z"
  }
}
```

**Generated Formats**:
- PNG image (static)
- HTML (interactive, Plotly only)

---

### 11.5 GET /api/data-viz/visualizations
**Description**: Get all visualizations created by current user

**Authentication**: Required

**Success Response (200)**:
```json
{
  "success": true,
  "visualizations": [
    {
      "_id": "674d5e8f1234567890viz001",
      "dataset_id": "674d5e8f1234567890dataset1",
      "dataset_name": "sales_data.csv",
      "chart_type": "scatter",
      "title": "Quantity vs Revenue by Region",
      "image_url": "/uploads/visualizations/viz_674d5e8f1234567890viz001.png",
      "created_at": "2026-02-13T11:00:00Z"
    }
  ]
}
```

**Sorting**: Most recently created first

---

### 11.6 GET /api/data-viz/download/{viz_id}
**Description**: Download or view visualization

**Authentication**: Not required (public access via URL)

**Path Parameters**:
- `viz_id`: MongoDB ObjectId of the visualization

**Query Parameters**:
- `format`: `png` (download) or `html` (view inline, Plotly only)

**Example Requests**:
```http
GET /api/data-viz/download/674d5e8f1234567890viz001?format=png
GET /api/data-viz/download/674d5e8f1234567890viz001?format=html
```

**Response (PNG)**:
- Content-Type: `image/png`
- Content-Disposition: `attachment; filename="viz_674d5e8f1234567890viz001.png"`

**Response (HTML)**:
- Content-Type: `text/html`
- Inline display (for iframe embedding)

**Use Case**: 
- Download PNG for presentations
- Embed HTML in dashboards (interactive charts)

---

### 11.7 DELETE /api/data-viz/datasets/{dataset_id}
**Description**: Delete dataset and associated visualizations

**Authentication**: Required (must own dataset)

**Path Parameters**:
- `dataset_id`: MongoDB ObjectId of the dataset

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Dataset and associated visualizations deleted successfully"
}
```

**Cascade Deletion**: Deletes all visualizations created from this dataset

---

### 11.8 DELETE /api/data-viz/visualizations/{viz_id}
**Description**: Delete specific visualization

**Authentication**: Required (must own visualization)

**Path Parameters**:
- `viz_id`: MongoDB ObjectId of the visualization

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Visualization deleted successfully"
}
```

---

### 11.9 GET /api/data-viz/dataset/{dataset_id}/info
**Description**: Get detailed dataset information

**Authentication**: Required (must own dataset)

**Path Parameters**:
- `dataset_id`: MongoDB ObjectId of the dataset

**Success Response (200)**:
```json
{
  "success": true,
  "dataset": {
    "_id": "674d5e8f1234567890dataset1",
    "filename": "sales_data.csv",
    "file_type": "csv",
    "size": 256789,
    "rows": 1500,
    "columns": 8,
    "column_details": [
      {
        "name": "date",
        "type": "datetime",
        "sample_values": ["2026-01-01", "2026-01-02", "2026-01-03"]
      },
      {
        "name": "product",
        "type": "string",
        "unique_count": 25,
        "sample_values": ["Widget A", "Widget B", "Gadget X"]
      },
      {
        "name": "revenue",
        "type": "numeric",
        "min": 1000,
        "max": 50000,
        "mean": 12550
      }
    ],
    "uploaded_at": "2026-02-13T10:30:00Z"
  }
}
```

---

## 12. GitHub Integration

Track GitHub activity linked to tasks

### 12.1 GET /api/tasks/git-activity/{task_id}
**Description**: Get GitHub activity for a task (branches, commits, PRs)

**Authentication**: Required (must be project member)

**Path Parameters**:
- `task_id`: MongoDB ObjectId of the task

**Success Response (200)**:
```json
{
  "success": true,
  "git_activity": {
    "task_id": "674d5e8f1234567890task01",
    "ticket_id": "WR-001",
    "branches": [
      {
        "_id": "674d5e8f1234567890branch1",
        "name": "feature/WR-001-user-auth",
        "project_id": "674d5e8f1234567890project",
        "commit_sha": "a1b2c3d4e5f6g7h8i9j0",
        "status": "active",
        "created_at": "2026-02-12T17:00:00Z",
        "updated_at": "2026-02-13T11:30:00Z"
      }
    ],
    "commits": [
      {
        "_id": "674d5e8f1234567890commit1",
        "commit_sha": "a1b2c3d4e5f6g7h8i9j0",
        "branch_id": "674d5e8f1234567890branch1",
        "author_name": "John Doe",
        "author_email": "john@example.com",
        "message": "feat(WR-001): Implement JWT token generation",
        "task_ids": ["WR-001"],
        "committed_at": "2026-02-13T11:30:00Z"
      },
      {
        "_id": "674d5e8f1234567890commit2",
        "commit_sha": "b2c3d4e5f6g7h8i9j0k1",
        "message": "fix(WR-001): Handle token expiration edge case",
        "author_name": "John Doe",
        "committed_at": "2026-02-13T12:15:00Z"
      }
    ],
    "pull_requests": [
      {
        "_id": "674d5e8f1234567890pr001",
        "pr_number": 42,
        "title": "[WR-001] Add user authentication system",
        "description": "Implements JWT-based authentication\\n\\nCloses WR-001",
        "status": "open",
        "source_branch": "feature/WR-001-user-auth",
        "target_branch": "main",
        "author": "john-doe",
        "url": "https://github.com/company/project/pull/42",
        "created_at": "2026-02-13T13:00:00Z",
        "updated_at": "2026-02-13T13:00:00Z"
      }
    ]
  }
}
```

**Task-Commit Linking**:
- Automatic: Commit messages with ticket ID (e.g., "WR-001", "Fixes WR-001")
- Manual: Can be linked via API

**Use Case**: Track development progress directly from task detail view

---

## 13. WebSocket Endpoints

Real-time communication channels

### 13.1 WS /api/tasks/ws/project/{project_id}
**Description**: Kanban board real-time updates

**Protocol**: WebSocket

**Authentication**: Via query parameter `?token=<JWT_TOKEN>`

**Connection URL**:
```
ws://localhost:8000/api/tasks/ws/project/674d5e8f1234567890project?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Authentication Flow**:
1. Client connects with JWT token in query string
2. Server verifies token
3. Server checks project membership
4. Connection established with unique channel ID: `kanban_{project_id}`

**Connection Confirmation**:
```json
{
  "type": "connection",
  "channel_id": "kanban_674d5e8f1234567890project",
  "project_id": "674d5e8f1234567890project",
  "message": "Connected to Kanban board"
}
```

**Message Types (Server → Client)**:

#### Task Created
```json
{
  "type": "task_created",
  "task": {
    "_id": "674d5e8f1234567890task01",
    "ticket_id": "WR-001",
    "title": "Implement user authentication",
    "status": "To Do",
    "assignee_name": "John Doe",
    "created_at": "2026-02-13T14:00:00Z"
  },
  "created_by": {
    "user_id": "674d5e8f1234567890abcdef",
    "username": "John Doe"
  }
}
```

#### Task Updated (Drag & Drop)
```json
{
  "type": "task_updated",
  "task": {
    "_id": "674d5e8f1234567890task01",
    "status": "In Progress",
    "updated_at": "2026-02-13T14:05:00Z"
  },
  "updated_by": {
    "user_id": "674d5e8f1234567890abcdef",
    "username": "John Doe"
  },
  "changes": {
    "status": {
      "old": "To Do",
      "new": "In Progress"
    }
  }
}
```

#### Task Deleted
```json
{
  "type": "task_deleted",
  "task_id": "674d5e8f1234567890task01",
  "deleted_by": {
    "user_id": "674d5e8f1234567890abcdef",
    "username": "John Doe"
  }
}
```

**Client → Server Messages**:

#### Heartbeat (Keep-Alive)
```json
{
  "type": "ping"
}
```

**Server Response**:
```json
{
  "type": "pong"
}
```

**Disconnection**: Server automatically handles disconnects and removes user from channel

**Use Case**: Real-time Kanban board collaboration - multiple users see changes instantly

---

### 13.2 WS /api/team-chat/ws/{channel_id}
**Description**: Team chat real-time messaging

**Protocol**: WebSocket

**Authentication**: Via query parameter `?token=<JWT_TOKEN>`

**Connection URL**:
```
ws://localhost:8000/api/team-chat/ws/674d5e8f1234567890channel1?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Authentication Flow**:
1. Client connects with JWT token
2. Server verifies token
3. Server checks channel access permissions
4. Connection established

**Connection Confirmation**:
```json
{
  "type": "connection",
  "status": "connected",
  "channel_id": "674d5e8f1234567890channel1",
  "user_id": "674d5e8f1234567890abcdef",
  "timestamp": "2026-02-13T15:00:00Z"
}
```

**User Joined Broadcast** (to other users):
```json
{
  "type": "user_joined",
  "user_id": "674d5e8f1234567890abcdef",
  "channel_id": "674d5e8f1234567890channel1",
  "timestamp": "2026-02-13T15:00:00Z"
}
```

**Message Types (Server → Client)**:

#### New Message
```json
{
  "type": "new_message",
  "message": {
    "_id": "674d5e8f1234567890message1",
    "channel_id": "674d5e8f1234567890channel1",
    "sender_id": "674d5e8f1234567890abcde0",
    "sender_name": "Jane Smith",
    "text": "Meeting in 5 minutes!",
    "created_at": "2026-02-13T15:05:00Z"
  }
}
```

#### Message Edited
```json
{
  "type": "message_edited",
  "message": {
    "_id": "674d5e8f1234567890message1",
    "text": "Meeting in 10 minutes! (Updated)",
    "edited": true,
    "updated_at": "2026-02-13T15:06:00Z"
  }
}
```

#### Message Deleted
```json
{
  "type": "message_deleted",
  "message_id": "674d5e8f1234567890message1",
  "channel_id": "674d5e8f1234567890channel1"
}
```

#### Reaction Added
```json
{
  "type": "reaction_added",
  "message_id": "674d5e8f1234567890message1",
  "emoji": "👍",
  "user_id": "674d5e8f1234567890abcdef",
  "username": "John Doe"
}
```

#### User Typing Indicator
```json
{
  "type": "user_typing",
  "user_id": "674d5e8f1234567890abcdef",
  "username": "John Doe",
  "channel_id": "674d5e8f1234567890channel1"
}
```

**Client → Server Messages**:

#### Typing Indicator
```json
{
  "type": "typing",
  "channel_id": "674d5e8f1234567890channel1"
}
```

#### Heartbeat
```json
{
  "type": "ping"
}
```

**Server Response**:
```json
{
  "type": "pong",
  "timestamp": "2026-02-13T15:10:00Z"
}
```

**User Left Broadcast** (on disconnect):
```json
{
  "type": "user_left",
  "user_id": "674d5e8f1234567890abcdef",
  "channel_id": "674d5e8f1234567890channel1",
  "timestamp": "2026-02-13T15:30:00Z"
}
```

**Use Case**: Real-time team chat - messages, reactions, and typing indicators appear instantly

---

## Additional Information

### Rate Limiting
**Development**: No rate limits
**Production Recommendations**:
- Standard endpoints: 100 requests/minute per user
- AI endpoints: 20 requests/minute per user (due to Azure AI costs)
- WebSocket connections: 5 concurrent connections per user
- File uploads: 10 files/hour per user

### Caching Strategy (Frontend)
**Request Cache** (client-side):
- Dashboard analytics: 5 minutes
- Projects list: 5 minutes
- User list: 10 minutes
- Tasks: No cache (real-time via WebSocket)
- Chat messages: No cache (real-time via WebSocket)

**Cache Invalidation**:
- On CREATE/UPDATE/DELETE operations
- Pattern-based invalidation (e.g., all project-related caches)

### Error Handling Best Practices

**Client Side**:
```javascript
try {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(taskData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.detail || 'Unknown error');
  }
  
  return await response.json();
} catch (error) {
  console.error('Task creation failed:', error);
  // Show user-friendly message
}
```

**Common Error Scenarios**:
1. **401 Unauthorized**: Token expired → Redirect to login
2. **403 Forbidden**: Insufficient permissions → Show error message
3. **404 Not Found**: Resource doesn't exist → Show not found page
4. **500 Internal Server Error**: Server issue → Retry or show error

### Security Considerations

**Authentication**:
- JWT tokens expire after 24 hours
- Refresh tokens not implemented (user must re-login)
- Token version for forced logout (password change, security breach)

**Authorization**:
- Project-level: Owner, Admin, Member roles
- Task-level: Must be project member
- User management: Admin and Super-Admin only

**File Uploads**:
- Max file size: 10MB (team chat), 50MB (data viz)
- Allowed file types: Whitelist validation
- Virus scanning: Recommended for production

**WebSocket Security**:
- Token-based authentication
- Channel access verification
- Rate limiting on messages

### API Versioning
**Current**: No versioning (v1 implied)
**Future**: Prefix with `/api/v2/` for breaking changes

### Pagination
**Standard Pagination**:
- Cursor-based for real-time data (chat messages)
- Offset-based for static data (not implemented yet)

**Example**:
```http
GET /api/team-chat/channels/{channel_id}/messages?limit=50&before=2026-02-13T15:00:00Z
```

---

**Last Updated**: February 13, 2026  
**API Version**: 1.0  
**Total Endpoints**: 85+ REST APIs + 2 WebSocket connections  
**Backend Framework**: FastAPI 0.109+  
**Python Version**: 3.10+

---


