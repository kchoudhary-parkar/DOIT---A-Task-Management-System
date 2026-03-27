# DOIT Project - Complete Database Schema Documentation

## Database Provider
**MongoDB Atlas** - Cloud-hosted NoSQL Document Database

## Connection Details
- **Cluster**: `YOUR_CLUSTER.mongodb.net`
- **Database Name**: `taskdb`
- **Connection Type**: MongoDB+srv protocol (Secure TLS/SSL)
- **Authentication**: Username/Password
- **Driver**: PyMongo 4.8.0+
- **Connection String Format**: 
  ```
  mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/taskdb?retryWrites=true&w=majority&appName=YOUR_APP_NAME
  ```
- **Connection Options**:
  - `retryWrites=true`: Automatically retry write operations
  - `w=majority`: Write concern for data durability
  - Database accessible via: `client["taskdb"]`

## Database Architecture Overview
- **Type**: NoSQL Document Store
- **Total Collections**: 15
- **Relationships**: Referenced (normalized) and Embedded (denormalized) patterns
- **Indexing**: Strategic indexes on frequently queried fields
- **Data Storage**: BSON (Binary JSON) format
- **ObjectId**: 12-byte unique identifier for documents
- **Timestamps**: UTC datetime stored as naive (no timezone info)

## Collections Overview (15 Collections)

### Core Application Collections
1. **users** - User accounts and authentication
2. **projects** - Project information and team assignments
3. **tasks** - Tasks/issues with full lifecycle tracking
4. **sprints** - Sprint planning and management
5. **profiles** - Extended user profile information

### AI & Chat Collections
6. **ai_conversations** - AI Assistant conversation sessions
7. **ai_messages** - Individual AI messages with tokens
8. **chat_channels** - Team communication channels
9. **chat_messages** - Team chat messages

### GitHub Integration Collections
10. **git_branches** - GitHub branches linked to tasks
11. **git_commits** - GitHub commits linked to tasks
12. **git_pull_requests** - GitHub pull requests linked to tasks

###Data & Analytics Collections (Optional/Future)
13. **datasets** - Dataset metadata and small datasets
14. **dataset_files** - Large file chunks (GridFS alternative)
15. **visualizations** - Generated visualizations

---

## Detailed Collection Schemas

### 1. users Collection
**Purpose**: Store user accounts, authentication credentials, and role information

**Python Model**: `models/user.py` → `User` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  name: String,  // Full name
  email: String (unique, required),  // Login email
  password: String (required),  // Bcrypt hashed password
  role: String (required),  // "super-admin", "admin", "manager", "team_member", "viewer"
  token_version: Number (default: 1),  // For forced logout
  clerk_user_id: String | null,  // Clerk authentication ID (optional)
  created_at: DateTime (UTC),  // Account creation timestamp
  updated_at: DateTime (UTC) | undefined  // Last update timestamp (optional)
}
```

**Field Details**:
- **_id**: MongoDB ObjectId, 12-byte unique identifier
- **name**: User's display name (shown in UI)
- **email**: 
  - Used for login authentication
  - Must be unique across all users
  - Validated with email-validator library
- **password**: 
  - Hashed using bcrypt with 12 salt rounds
  - Never returned in API responses (excluded in queries)
  - Original password can't be recovered
- **role**: 
  - Determines system permissions
  - Values: `super-admin` (level 5), `admin` (level 4), `manager` (level 3), `team_member` (level 2), `viewer` (level 1)
- **token_version**: 
  - Incremented when user changes password or is force-logged out
  - Invalidates all existing JWT tokens
  - Used for security and session management
- **clerk_user_id**: 
  - Optional field for Clerk authentication integration
  - Null if not using Clerk
  
**Indexes**:
```javascript
{ email: 1 }  // Unique index for fast login lookup
{ role: 1 }   // For filtering by role
```

**Common Queries**:
```python
# Find by email (login)
User.find_by_email("user@example.com")

# Find by ID
User.find_by_id("507f1f77bcf86cd799439011")

# Get all users (exclude password)
User.get_all_users()  # Returns users without password field

# Count total users
User.count_users()

# Find super admins
User.find_super_admins()
```

**Model Methods**:
- `create(user_data)` - Insert new user with auto-set token_version
- `find_by_email(email)` - Find by login email
- `find_by_id(user_id)` - Find by ObjectId
- `find_by_clerk_id(clerk_user_id)` - Find by Clerk ID
- `get_all_users()` - Get all users (password excluded)
- `count_users()` - Count total users
- `update(user_id, update_data)` - Update user fields
- `update_role(user_id, new_role)` - Change user role
- `find_super_admins()` - Get all super admin users

**Security Features**:
- Password hashed before storage (never plaintext)
- Password field excluded from all query results
- Token versioning for forced logout capability
- Email uniqueness enforced

**Default Super Admin** (Created on first startup):
```javascript
{
  email: "YOUR_ADMIN_EMAIL",
  password: bcrypt("YOUR_SECURE_PASSWORD"),  // Password is hashed with bcrypt
  name: "Super Admin",
  role: "super-admin",
  token_version: 1
}
```

---

### 2. projects Collection
**Purpose**: Store project information, team membership, and GitHub integration

**Python Model**: `models/project.py` → `Project` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  name: String (required),  // Project name
  prefix: String (required),  // Auto-generated prefix for ticket IDs (e.g., "DT" for "DOIT")
  description: String,  // Project description
  user_id: String (required),  // Owner/creator user ID (references users._id)
  members: [  // Array of team members
    {
      user_id: String,  // Member's user ID
      name: String,  // Member's name
      email: String,  // Member's email
      role: String,  // Member's role in system
      added_at: DateTime  // When member was added
    }
  ],
  git_repo_url: String | null,  // GitHub repository URL
  github_token: String | null,  // Encrypted GitHub Personal Access Token
  created_at: DateTime (UTC),  // Project creation timestamp
  updated_at: DateTime (UTC)  // Last update timestamp
}
```

**Field Details**:
- **_id**: MongoDB ObjectId
- **name**: Project display name (e.g., "DOIT", "Backend API")
- **prefix**: 
  - Auto-generated from project name using `generate_project_prefix()`
  - Used for ticket ID generation (prefix + number)
  - Examples: "DOIT" → "DT", "Backend API" → "BA"
  - Format: 2-4 uppercase letters
- **description**: Project goals, overview, requirements
- **user_id**: Project owner (creator), references `users._id`
- **members**: 
  - Embedded array of team member objects
  - Members can be assigned tasks
  - Owner is automatically considered a member
  - Can add/remove members dynamically
- **git_repo_url**: 
  - Full GitHub repository URL
  - Format: `https://github.com/owner/repo`
  - Used for webhook integration
  - Optional field
- **github_token**: 
  - GitHub Personal Access Token (PAT)
  - Encrypted using Fernet before storage
  - Used for API calls (adding collaborators, etc.)
  - Decrypted only when needed
  
**Indexes**:
```javascript
{ user_id: 1 }  // Find projects by owner
{ "members.user_id": 1 }  // Find projects by member
{ prefix: 1 }  // For ticket ID generation
{ git_repo_url: 1 }  // For GitHub webhook lookups
```

**Common Queries**:
```python
# Create project (auto-generates prefix)
Project.create({
    "name": "DOIT",
    "description": "Task management system",
    "user_id": "507f1f77bcf86cd799439011"
})

# Find by ID
Project.find_by_id("507f1f77bcf86cd799439011")

# Find by owner
Project.find_by_user("507f1f77bcf86cd799439011")

# Find by owner OR member
Project.find_by_user_or_member("507f1f77bcf86cd799439011")

# Find by GitHub repo URL
Project.find_by_repo_url("https://github.com/company/doit")

# Check if user is member
Project.is_member("project_id", "user_id")
```

**Model Methods**:
- `create(project_data)` - Create project with auto-generated prefix
- `find_by_id(project_id)` - Get project by ID
- `find_by_user(user_id)` - Get projects owned by user
- `find_by_user_or_member(user_id)` - Get projects where user is owner or member
- `find_by_repo_url(repo_url)` - Find project by GitHub URL
- `get_all()` - Get all projects (admin view)
- `update(project_id, update_data)` - Update project fields
- `delete(project_id)` - Delete project
- `add_member(project_id, member_data)` - Add team member
- `remove_member(project_id, user_id)` - Remove team member
- `is_member(project_id, user_id)` - Check membership

**Project Prefix Generation**:
```python
# From utils/ticket_utils.py
"DOIT Project" → "DT"
"Backend API" → "BA"
"Customer Dashboard" → "CD"
```

**GitHub Integration**:
- Store repository URL for webhook processing
- Encrypted token for API calls
- Link projects to GitHub repos
- Track commits, branches, PRs per project

---

### 3. tasks Collection
**Purpose**: Store all tasks/issues with full lifecycle tracking, attachments, activities, and GitHub links

**Python Model**: `models/task.py` → `Task` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  ticket_id: String (unique, required),  // Human-readable ID (e.g., "DT-001", "CC-16")
  issue_type: String (default: "task"),  // "bug", "task", "story", "epic"
  title: String (required),  // Task title/summary
  description: String,  // Detailed description (supports markdown)
  project_id: String (required, indexed),  // Parent project (references projects._id)
  sprint_id: String | null (indexed),  // Assigned sprint (references sprints._id) or null for backlog
  priority: String (default: "Medium"),  // "Low", "Medium", "High", "Critical"
  status: String (default: "To Do"),  // "To Do", "In Progress", "In Review", "Done", "Blocked"
  assignee_id: String | null (indexed),  // Assigned user (references users._id)
  assignee_name: String (default: "Unassigned"),  // Cached assignee name
  assignee_email: String,  // Cached assignee email
  due_date: String | null,  // ISO format date string (YYYY-MM-DD)
  created_by: String (required),  // Creator user ID (references users._id)
  labels: [String],  // Array of tags/labels (e.g., ["frontend", "urgent"])
  attachments: [  // Array of file attachments
    {
      name: String,  // Original filename
      url: String,  // File path/URL
      added_by: String,  // User ID who uploaded
      added_by_name: String,  // Cached uploader name
      added_at: String  // ISO timestamp
    }
  ],
  links: [  // Relationships to other tasks
    {
      type: String,  // "blocks", "blocked-by", "relates-to", "duplicates"
      linked_task_id: String,  // Target task ObjectId
      linked_ticket_id: String,  // Target task ticket_id (e.g., "DT-002")
      created_at: String  // ISO timestamp
    }
  ],
  activities: [  // Activity log (comments, status changes, edits)
    {
      user_id: String,  // Actor user ID
      user_name: String,  // Actor name
      action: String,  // "commented", "status_changed", "assigned", "updated"
      comment: String,  // Comment text (empty for non-comment actions)
      old_value: String | null,  // Previous value (for changes)
      new_value: String | null,  // New value (for changes)
      timestamp: String  // ISO timestamp
    }
  ],
  in_backlog: Boolean,  // True if moved to backlog from sprint
  moved_to_backlog_at: DateTime | null,  // Timestamp when moved to backlog
  created_at: DateTime (UTC),  // Task creation timestamp
  updated_at: DateTime (UTC)  // Last update timestamp
}
```

**Field Details**:
- **ticket_id**: 
  - Unique human-readable identifier
  - Format: `{PROJECT_PREFIX}-{NUMBER}` (e.g., "DT-001", "CC-16")
  - Auto-generated when task is created
  - Used in GitHub branch names and commit messages
  - Uppercase, unique across all tasks
- **issue_type**: 
  - Categorizes work type
  - `bug`: Defects, issues
  - `task`: Regular work items
  - `story`: User stories (Agile)
  - `epic`: Large feature (contains multiple stories)
- **status** (Kanban columns):
  - `To Do`: Not started
  - `In Progress`: Active work
  - `In Review`: Code review, QA testing
  - `Done`: Completed and verified
  - `Blocked`: Waiting on dependencies
- **priority**:
  - `Low`: Nice to have, not urgent
  - `Medium`: Regular priority
  - `High`: Important, should be done soon
  - `Critical`: Urgent, blocking, high impact
- **assignee_* fields**: 
  - Denormalized data for quick display
  - Avoids extra joins to users collection
  - Updated when assignee changes
- **labels**: 
  - Flexible tagging system
  - Examples: ["frontend", "api", "urgent", "bug"]
  - Used for filtering and organization
- **attachments**: 
  - Files uploaded to task
  - Stored in `uploads/` directory
  - Track who uploaded and when
- **links**: 
  - Task dependencies and relationships
  - Bidirectional: Creating "blocks" also creates "blocked-by" on target
- **activities**: 
  - Complete audit log
  - Every change tracked
  - Comments stored here
  - Sorted by timestamp
- **in_backlog**: 
  - True if task was moved from completed sprint to backlog
  - Used to distinguish backlog tasks from unassigned tasks

**Indexes**:
```javascript
{ ticket_id: 1 }  // Unique index for finding by ticket ID
{ project_id: 1 }  // Find all tasks in project
{ sprint_id: 1 }  // Find tasks in sprint
{ assignee_id: 1 }  // Find user's assigned tasks
{ status: 1 }  // Filter by status
{ priority: 1 }  // Filter by priority
{ "labels": 1 }  // Array index for label queries
```

**Common Queries**:
```python
# Create task with auto-generated ticket_id
Task.create({
    "title": "Implement login feature",
    "description": "Add user authentication",
    "project_id": "507f1f77bcf86cd799439011",
    "priority": "High",
    "assignee_id": "507f1f77bcf86cd799439012",
    "ticket_id": "DT-001"  # Pre-generated
})

# Find by ticket ID (e.g., from GitHub commit)
Task.find_by_ticket_id("DT-001")

# Find all tasks in project
Task.find_by_project("507f1f77bcf86cd799439011")

# Find tasks in sprint
Task.find_by_sprint("507f1f77bcf86cd799439013")

# Find user's assigned tasks
Task.find_by_assignee("507f1f77bcf86cd799439012")

# Find backlog tasks
Task.find_backlog("507f1f77bcf86cd799439011")

# Find available tasks for sprint planning
Task.find_available_for_sprint("507f1f77bcf86cd799439011")

# Find tasks by label
Task.find_by_label("507f1f77bcf86cd799439011", "frontend")
```

**Model Methods**:
- `create(task_data)` - Create task
- `find_by_id(task_id)` - Get task by ObjectId
- `find_by_ticket_id(ticket_id)` - Get by ticket ID (e.g., "DT-001")
- `find_by_project(project_id)` - All tasks in project
- `find_by_sprint(sprint_id)` - All tasks in sprint
- `find_by_assignee(user_id)` - User's assigned tasks
- `find_backlog(project_id)` - Backlog tasks (from completed sprints)
- `find_available_for_sprint(project_id)` - Unassigned tasks
- `find_by_label(project_id, label)` - Tasks with specific label
- `update(task_id, update_data)` - Update task fields
- `delete(task_id)` - Delete task
- `add_activity(task_id, activity_data)` - Add to activity log
- `add_label(task_id, label)` - Add label
- `remove_label(task_id, label)` - Remove label
- `add_attachment(task_id, attachment_data)` - Add file attachment
- `remove_attachment(task_id, attachment_url)` - Remove attachment
- `add_link(task_id, link_data)` - Link to another task
- `remove_link(task_id, linked_task_id, link_type)` - Remove link
- `delete_by_project(project_id)` - Delete all tasks in project
- `unassign_user_tasks(project_id, user_id)` - Unassign user's tasks

**GitHub Integration**:
- Task ticket_id used in branch names: `feature/DT-001-login`
- Commit messages: `DT-001: Implement login`
- Automatic linking via webhooks
- Track branches, commits, PRs per task

**Activity Types**:
- `commented`: User added comment
- `status_changed`: Status updated
- `assigned`: Assignee changed
- `priority_changed`: Priority updated
- `label_added`: Label added
- `label_removed`: Label removed
- `attachment_added`: File uploaded
- `link_added`: Task linked
- `created`: Task created

---

### 4. sprints Collection
**Purpose**: Store sprint/iteration information for Agile project management

**Python Model**: `models/sprint.py` → `Sprint` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  name: String (required),  // Sprint name (e.g., "Sprint 1", "Q1 Release")
  goal: String,  // Sprint objective/goal
  project_id: String (required, indexed),  // Parent project (references projects._id)
  start_date: String (required),  // Sprint start date (ISO format YYYY-MM-DD)
  end_date: String (required),  // Sprint end date (ISO format YYYY-MM-DD)
  status: String (default: "planned"),  // "planned", "active", "completed"
  created_by: String (required),  // Creator user ID (references users._id)
  completed_at: DateTime | null,  // When sprint was completed
  total_tasks_snapshot: Number,  // Total tasks at completion (snapshot)
  completed_tasks_snapshot: Number,  // Completed tasks at completion (snapshot)
  created_at: DateTime (UTC),  // Sprint creation timestamp
  updated_at: DateTime (UTC)  // Last update timestamp
}
```

**Field Details**:
- **name**: Sprint identifier (e.g., "Sprint 1", "March Sprint")
- **goal**: What the sprint aims to achieve
- **project_id**: Which project this sprint belongs to
- **start_date/end_date**: 
  - ISO format strings: "2026-02-10"
  - 1-4 week duration typical
  - Used for burndown calculations
- **status**:
  - `planned`: Created but not started
  - `active`: Currently running (only 1 active sprint per project)
  - `completed`: Finished, tasks moved to backlog or done
- **completed_at**: Timestamp when sprint completed
- **total_tasks_snapshot**: Task count at completion (for analytics)
- **completed_tasks_snapshot**: Completed count at completion

**Indexes**:
```javascript
{ project_id: 1 }  // Find sprints by project
{ status: 1 }  // Find active/completed sprints
{ start_date: 1, end_date: 1 }  // Date range queries
```

**Common Queries**:
```python
# Create sprint
Sprint.create({
    "name": "Sprint 1",
    "goal": "Implement user authentication",
    "project_id": "507f1f77bcf86cd799439011",
    "start_date": "2026-02-10",
    "end_date": "2026-02-24",
    "created_by": "507f1f77bcf86cd799439012"
})

# Find sprint by ID
Sprint.find_by_id("507f1f77bcf86cd799439013")

# Find all sprints in project
Sprint.find_by_project("507f1f77bcf86cd799439011")

# Find active sprint for project
Sprint.find_active_by_project("507f1f77bcf86cd799439011")
```

**Model Methods**:
- `create(sprint_data)` - Create new sprint
- `find_by_id(sprint_id)` - Get sprint by ID
- `find_by_project(project_id)` - All sprints in project
- `find_active_by_project(project_id)` - Get active sprint
- `update(sprint_id, update_data)` - Update sprint fields
- `delete(sprint_id)` - Delete sprint
- `delete_by_project(project_id)` - Delete all sprints in project
- `start_sprint(sprint_id)` - Mark sprint as active
- `complete_sprint(sprint_id, total_tasks, completed_tasks)` - Complete sprint with snapshots

**Sprint Lifecycle**:
1. **Planned**: Sprint created, tasks being added
2. **Active**: Sprint started, team working on tasks
3. **Completed**: Sprint finished, retrospective done

**Task Management**:
- Tasks assigned to sprint via `task.sprint_id` field
- Query tasks: `Task.find_by_sprint(sprint_id)`
- When sprint completes, incomplete tasks can be:
  - Moved to next sprint
  - Moved to backlog (`in_backlog=True`)
  - Left as-is

---

### 5. profiles Collection
**Purpose**: Store extended user profile information beyond authentication data

**Python Model**: `models/profile.py` → `Profile` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  user_id: String (unique, required, indexed),  // Owner user (references users._id)
  personal: {  // Personal information
    bio: String,
    phone: String,
    location: String,
    timezone: String,
    linkedin: String,
    github: String,
    website: String
  },
  education: [  // Education history
    {
      degree: String,  // "Bachelor's", "Master's", etc.
      field: String,  // "Computer Science"
      institution: String,  // University name
      start_year: String,  // "2018"
      end_year: String,  // "2022"
      description: String
    }
  ],
  certificates: [  // Certifications
    {
      name: String,  // Certificate name
      issuer: String,  // Issuing organization
      issue_date: String,  // "2025-06"
      expiry_date: String | null,  // Null if no expiry
      credential_id: String,
      credential_url: String
    }
  ],
  organization: {  // Current organization/job
    company: String,
    position: String,
    department: String,
    start_date: String,
    description: String
  }
}
```

**Field Details**:
- **user_id**: Links to users collection (1-to-1 relationship)
- **personal**: Flexible object for personal info
- **education**: Array of education history
- **certificates**: Array of professional certifications
- **organization**: Current employment information

**Indexes**:
```javascript
{ user_id: 1 }  // Unique index, one profile per user
```

**Common Queries**:
```python
# Get user profile
Profile.find_by_user("507f1f77bcf86cd799439011")

# Create profile for new user
Profile.create("507f1f77bcf86cd799439011")

# Update sections
Profile.update_personal(user_id, {...})
Profile.update_education(user_id, [...])
Profile.update_certificates(user_id, [...])
Profile.update_organization(user_id, {...})
```

**Model Methods**:
- `find_by_user(user_id)` - Get profile by user ID
- `create(user_id)` - Create empty profile
- `update_personal(user_id, personal_data)` - Update personal info
- `update_education(user_id, education_list)` - Update education
- `update_certificates(user_id, certificates_list)` - Update certificates
- `update_organization(user_id, organization_data)` - Update organization

**Upsert**: All update methods use `upsert=True` - creates profile if doesn't exist

---

### 6. ai_conversations Collection
**Purpose**: Store AI Assistant conversation sessions

**Python Model**: `models/ai_conversation.py` → `AIConversation` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  user_id: String (required, indexed),  // Owner user (references users._id)
  title: String (default: "New Conversation"),  // Conversation name
  message_count: Number (default: 0),  // Number of messages
  created_at: DateTime (UTC),  // Conversation creation timestamp
  updated_at: DateTime (UTC)  // Last message timestamp (for sorting)
}
```

**Field Details**:
- **user_id**: User who owns this conversation
- **title**: Display name for conversation (can be renamed)
- **message_count**: Incremented on each message
- **updated_at**: Updated on every message, used for "recent conversations"

**Indexes**:
```javascript
{ user_id: 1 }  // Find user's conversations
{ updated_at: -1 }  // Sort by most recent
```

**Common Queries**:
```python
# Create conversation
conversation_id = AIConversation.create(user_id, "My Chat")

# Get user's conversations (sorted by recent)
AIConversation.get_user_conversations(user_id, limit=50)

# Get specific conversation
AIConversation.get_by_id(conversation_id)

# Update title
AIConversation.update_title(conversation_id, "New Title")

# Update timestamp (on new message)
AIConversation.update_timestamp(conversation_id)

# Delete conversation (also deletes all messages)
AIConversation.delete(conversation_id)
```

**Model Methods**:
- `create(user_id, title)` - Create new conversation
- `get_by_id(conversation_id)` - Get conversation by ID
- `get_user_conversations(user_id, limit)` - Get user's conversations
- `update_title(conversation_id, title)` - Rename conversation
- `update_timestamp(conversation_id)` - Update last activity time
- `delete(conversation_id)` - Delete conversation and all messages

**Relationship**: 1 conversation → Many messages (ai_messages collection)

---

### 7. ai_messages Collection
**Purpose**: Store individual AI messages within conversations

**Python Model**: `models/ai_conversation.py` → `AIMessage` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  conversation_id: String (required, indexed),  // Parent conversation (as string, not ObjectId)
  role: String (required),  // "user" or "assistant"
  content: String (required),  // Message text (may include file content)
  attachments: [  // Array of uploaded files
    {
      name: String,  // Original filename
      url: String,  // File path
      type: String,  // MIME type
      size: Number,  // File size in bytes
      extracted_content: String  // Extracted text for AI analysis
    }
  ],
  image_url: String | null,  // Generated image path (for FLUX images)
  tokens_used: Number (default: 0),  // OpenAI token count
  tokens: {  // Detailed token usage
    prompt: Number,
    completion: Number,
    total: Number
  },
  created_at: DateTime (UTC),  // Message timestamp
}
```

**Field Details**:
- **conversation_id**: Parent conversation (stored as string)
- **role**: 
  - `user`: Message from human user
  - `assistant`: Response from GPT-5.2-chat
- **content**: 
  - User message or AI response
  - May include extracted file content
- **attachments**: 
  - Files uploaded by user
  - Content extracted for AI context
  - Supported: PDF, CSV, Word, JSON, Text
- **image_url**: 
  - Path to generated image (FLUX-1.1-pro)
  - Null for text-only messages
- **tokens_used**: Total tokens consumed by OpenAI API
- **tokens**: Detailed breakdown (prompt, completion, total)

**Indexes**:
```javascript
{ conversation_id: 1 }  // Get messages in conversation
{ created_at: 1 }  // Sort chronologically
```

**Common Queries**:
```python
# Create user message
message_id = AIMessage.create(
    conversation_id=conv_id,
    role="user",
    content="Hello, AI!",
    attachments=[...]
)

# Create assistant response
AIMessage.create(
    conversation_id=conv_id,
    role="assistant",
    content="Hello! How can I help?",
    image_url="/uploads/ai_images/image.png"
)

# Get conversation messages
AIMessage.get_conversation_messages(conversation_id)

# Update token usage (after API call)
AIMessage.update_tokens(message_id, tokens_dict)
```

**Model Methods**:
- `create(conversation_id, role, content, attachments, image_url)` - Create message
- `get_conversation_messages(conversation_id)` - Get all messages in conversation
- `get_by_id(message_id)` - Get message by ID
- `update_tokens(message_id, tokens)` - Update token usage

**File Processing Flow**:
1. User uploads file
2. Backend extracts content (PyPDF2, python-docx, etc.)
3. Content stored in `attachments[].extracted_content`
4. Content sent to GPT-5.2-chat as context
5. AI can answer questions about file

**Token Tracking**:
- Each API call logs token usage
- Used for cost tracking and analytics
- Prompt tokens: Input to AI
- Completion tokens: AI response
- Total = prompt + completion

---

### 8. chat_channels Collection
**Purpose**: Store team communication channels (project-specific and general)

**Used in**: `controllers/team_chat_controller.py`

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  name: String (required),  // Channel name (e.g., "general", "frontend-team")
  description: String,  // Channel purpose
  type: String,  // "general" or "project"
  project_id: String | null (indexed),  // Parent project (null for general channels)
  created_by: String (required),  // Creator user ID (references users._id)
  created_at: DateTime (UTC),  // Channel creation timestamp
  updated_at: DateTime (UTC)  // Last update timestamp
}
```

**Field Details**:
- **name**: Channel display name
- **description**: What the channel is for
- **type**:
  - `general`: System-wide channel (all users)
  - `project`: Project-specific channel (project members only)
- **project_id**: Links channel to project (null for general)
- **created_by**: User who created channel (or "system" for auto-created)

**Indexes**:
```javascript
{ project_id: 1 }  // Find channels by project
{ type: 1 }  // Filter by channel type
```

**Auto-Creation**:
- Default "general" channel created for each new project
- Created via `init_db.py → initialize_default_channels()`

**Common Queries**:
```python
# Find project channels
db.chat_channels.find({"project_id": project_id})

# Find general channels
db.chat_channels.find({"type": "general"})

# Get channel by ID
db.chat_channels.find_one({"_id": ObjectId(channel_id)})
```

**Access Control**:
- General channels: All users
- Project channels: Only project owner and members

---

### 9. chat_messages Collection
**Purpose**: Store team chat messages within channels

**Used in**: `controllers/team_chat_controller.py`

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  channel_id: String (required, indexed),  // Parent channel (references chat_channels._id)
  user_id: String (required),  // Message sender (references users._id)
  user_name: String (required),  // Sender's name (cached)
  user_email: String,  // Sender's email (cached)
  content: String (required),  // Message text
  attachments: [  // Array of uploaded files
    {
      filename: String,  // Original filename
      url: String,  // File path in uploads/chat_attachments/
      size: Number  // File size in bytes
    }
  ],
  reply_to: String | null,  // Message ID if replying (references chat_messages._id)
  read_by: [String],  // Array of user IDs who read the message
  edited_at: DateTime | null,  // If message was edited
  created_at: DateTime (UTC),  // Message timestamp
}
```

**Field Details**:
- **channel_id**: Which channel message belongs to
- **user_id**: Who sent the message
- **user_name, user_email**: Cached for quick display
- **content**: Message text (supports multiline)
- **attachments**: Files shared in message
- **reply_to**: Thread parent message ID (for threading)
- **read_by**: Track who has read message (for unread counts)
- **edited_at**: If user edited message after sending

**Indexes**:
```javascript
{ channel_id: 1 }  // Get messages in channel
{ created_at: 1 }  // Sort chronologically
{ user_id: 1 }  // User's messages
```

**Common Queries**:
```python
# Get channel messages (paginated, sorted)
db.chat_messages.find({"channel_id": channel_id}) \
    .sort("created_at", -1) \
    .limit(50)

# Get unread message count
db.chat_messages.count_documents({
    "channel_id": channel_id,
    "read_by": {"$ne": user_id}
})

# Mark messages as read
db.chat_messages.update_many(
    {"channel_id": channel_id},
    {"$addToSet": {"read_by": user_id}}
)
```

**Features**:
- Real-time messaging
- File attachments (images, documents)
- Message threading (reply_to)
- Read receipts (read_by array)
- Message editing (edited_at timestamp)

**File Storage**:
- Files saved in `uploads/chat_attachments/`
- Filename format: `{timestamp}_{original_name}`

---

### 10. git_branches Collection
**Purpose**: Track GitHub branches linked to tasks

**Python Model**: `models/git_activity.py` → `GitBranch` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  task_id: String (required, indexed),  // Linked task (references tasks._id)
  project_id: String (required, indexed),  // Linked project (references projects._id)
  branch_name: String (required),  // Branch name (e.g., "feature/DT-001-login")
  repo_url: String (required),  // GitHub repository URL
  status: String (default: "active"),  // "active", "merged", "deleted"
  created_at: DateTime (UTC)  // When branch was created
}
```

**Field Details**:
- **task_id**: Task this branch is for (extracted from branch name)
- **project_id**: Project this branch belongs to
- **branch_name**: Full branch name from GitHub
- **repo_url**: GitHub repository URL
- **status**:
  - `active`: Branch exists and open
  - `merged`: Branch merged into main/master
  - `deleted`: Branch deleted from repository

**Indexes**:
```javascript
{ task_id: 1 }  // Find branches for task
{ project_id: 1 }  // Find branches for project
{ branch_name: 1 }  // Find by branch name
```

**Ticket ID Extraction**:
```javascript
// Branch name patterns:
"feature/DT-001-login" → Ticket ID: "DT-001"
"bugfix/CC-16-fix-bug" → Ticket ID: "CC-16"
"DT-002-api-endpoint" → Ticket ID: "DT-002"

// Regex pattern: ([A-Z]+)-(\d+)
```

**Common Queries**:
```python
# Create branch record (from GitHub webhook)
GitBranch.create({
    "task_id": "507f1f77bcf86cd799439011",
    "project_id": "507f1f77bcf86cd799439012",
    "branch_name": "feature/DT-001-login",
    "repo_url": "https://github.com/company/doit",
    "status": "active"
})

# Find branches for task
GitBranch.find_by_task("507f1f77bcf86cd799439011")

# Find branches for project
GitBranch.find_by_project("507f1f77bcf86cd799439012")

# Update branch status (when merged/deleted)
GitBranch.update_status("feature/DT-001-login", project_id, "merged")
```

**Model Methods**:
- `create(branch_data)` - Create branch record
- `find_by_task(task_id)` - Get task's branches
- `find_by_project(project_id)` - Get project's branches
- `update_status(branch_name, project_id, status)` - Update status

**GitHub Webhook Events**:
- `create` event (ref_type=branch) → Create branch record
- `delete` event (ref_type=branch) → Update status to "deleted"
- Pull request `closed` + `merged=true` → Update status to "merged"

---

### 11. git_commits Collection
**Purpose**: Track GitHub commits linked to tasks

**Python Model**: `models/git_activity.py` → `GitCommit` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  task_id: String (required, indexed),  // Linked task (references tasks._id)
  project_id: String (required, indexed),  // Linked project (references projects._id)
  commit_sha: String (required, unique),  // Git commit SHA (40-char hex)
  message: String (required),  // Commit message
  author: String (required),  // Commit author name
  author_email: String,  // Commit author email
  branch_name: String,  // Branch where commit was pushed
  timestamp: DateTime (required),  // When commit was made (from GitHub)
  created_at: DateTime (UTC)  // When record was created in our DB
}
```

**Field Details**:
- **task_id**: Task this commit is for (extracted from commit message or branch)
- **project_id**: Project this commit belongs to
- **commit_sha**: Unique Git commit identifier
- **message**: Commit message (may contain ticket ID)
- **author**: Developer who made the commit
- **branch_name**: Which branch received the commit
- **timestamp**: Commit timestamp from GitHub
- **created_at**: When we recorded it

**Indexes**:
```javascript
{ task_id: 1 }  // Find commits for task
{ project_id: 1 }  // Find commits for project
{ commit_sha: 1 }  // Unique index, prevent duplicates
{ timestamp: -1 }  // Sort by most recent
```

**Ticket ID Extraction**:
```javascript
// Commit message patterns:
"DT-001: Add login feature" → Ticket ID: "DT-001"
"Implemented CC-16 bug fix" → Ticket ID: "CC-16"
"[DT-002] Update API endpoint" → Ticket ID: "DT-002"

// Also checks branch name if not in message
```

**Common Queries**:
```python
# Create commit record (from GitHub webhook, avoids duplicates)
GitCommit.create({
    "task_id": "507f1f77bcf86cd799439011",
    "project_id": "507f1f77bcf86cd799439012",
    "commit_sha": "a1b2c3d4e5f6...",
    "message": "DT-001: Implement login feature",
    "author": "John Doe",
    "author_email": "john@example.com",
    "branch_name": "feature/DT-001-login",
    "timestamp": "2026-02-12T10:30:00Z"
})

# Find commits for task (sorted by newest)
GitCommit.find_by_task("507f1f77bcf86cd799439011")

# Find commits for project
GitCommit.find_by_project("507f1f77bcf86cd799439012")
```

**Model Methods**:
- `create(commit_data)` - Create commit record (checks for duplicates)
- `find_by_task(task_id)` - Get task's commits (sorted by timestamp)
- `find_by_project(project_id)` - Get project's commits

**GitHub Webhook Events**:
- `push` event → Process commits array, extract ticket IDs, create records

**Duplicate Prevention**:
- Checks if `commit_sha` already exists before inserting
- Returns existing record if found

**Display in Task UI**:
- Task detail page shows linked commits
- Each commit shows: SHA (short), message, author, time ago

---

### 12. git_pull_requests Collection
**Purpose**: Track GitHub pull requests linked to tasks

**Python Model**: `models/git_activity.py` → `GitPullRequest` class

**Schema Structure**:
```javascript
{
  _id: ObjectId,  // Auto-generated unique identifier
  task_id: String (required, indexed),  // Linked task (references tasks._id)
  project_id: String (required, indexed),  // Linked project (references projects._id)
  pr_number: Number (required, indexed),  // Pull request number (e.g., #42)
  title: String (required),  // PR title
  branch_name: String,  // Source branch name
  status: String (default: "open"),  // "open", "closed", "merged"
  author: String (required),  // PR author GitHub username
  created_at_github: DateTime (required),  // When PR was created on GitHub
  merged_at: DateTime | null,  // When PR was merged (null if not merged)
  closed_at: DateTime | null,  // When PR was closed (null if still open)
  created_at: DateTime (UTC),  // When record was created in our DB
  updated_at: DateTime (UTC)  // Last update from GitHub webhook
}
```

**Field Details**:
- **task_id**: Task this PR is for (extracted from branch name or title)
- **project_id**: Project this PR belongs to
- **pr_number**: GitHub PR number (unique per repo)
- **title**: PR title from GitHub
- **branch_name**: Source branch being merged
- **status**:
  - `open`: PR is open, awaiting review
  - `closed`: PR was closed without merging
  - `merged`: PR was merged into target branch
- **author**: GitHub username who created PR
- **created_at_github**: Original creation time on GitHub
- **merged_at**: When PR was merged (if merged)
- **closed_at**: When PR was closed (if closed)

**Indexes**:
```javascript
{ task_id: 1 }  // Find PRs for task
{ project_id: 1 }  // Find PRs for project
{ pr_number: 1, project_id: 1 }  // Find specific PR in project
{ status: 1 }  // Filter by open/closed/merged
```

**Common Queries**:
```python
# Create or update PR (from GitHub webhook)
GitPullRequest.update_or_create({
    "task_id": "507f1f77bcf86cd799439011",
    "project_id": "507f1f77bcf86cd799439012",
    "pr_number": 42,
    "title": "DT-001: Implement login feature",
    "branch_name": "feature/DT-001-login",
    "status": "open",
    "author": "johndoe",
    "created_at_github": "2026-02-12T10:00:00Z"
})

# Find PRs for task
GitPullRequest.find_by_task("507f1f77bcf86cd799439011")

# Find PRs for project
GitPullRequest.find_by_project("507f1f77bcf86cd799439012")
```

**Model Methods**:
- `create(pr_data)` - Create PR record
- `update_or_create(pr_data)` - Create new or update existing PR
- `find_by_task(task_id)` - Get task's PRs
- `find_by_project(project_id)` - Get project's PRs

**GitHub Webhook Events**:
- `pull_request` event with action `opened` → Create PR record
- `pull_request` event with action `closed` → Update status
  - If `merged=true` → status="merged", set merged_at
  - If `merged=false` → status="closed", set closed_at
- `pull_request` event with action `reopened` → Update status to "open"

**Update Logic**:
- Uses `update_or_create()` to handle PR lifecycle
- Identifies existing PR by `pr_number` + `project_id`
- Updates status and timestamps on webhook events

**Display in Task UI**:
- Task detail page shows linked PRs
- Each PR shows: #number, title, status badge, author, created date

---

### 13-15. Data & Analytics Collections (Optional/Future)

### 13. datasets Collection
**Purpose**: Store dataset metadata and small datasets (Future/Optional)

**Schema Structure**:
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  project_id: String | null,
  user_id: String,
  data: Object | Array,  // Small datasets stored directly
  file_id: String | null,  // References dataset_files for large datasets
  type: String,  // "csv", "json", "excel", "api"
  row_count: Number,
  column_count: Number,
  size_bytes: Number,
  created_at: DateTime,
  updated_at: DateTime
}
```

**Usage**: Store datasets for analytics and visualization

---

### 14. dataset_files Collection
**Purpose**: Store large file chunks (GridFS alternative) (Future/Optional)

**Schema Structure**:
```javascript
{
  _id: ObjectId,
  dataset_id: String,  // references datasets._id
  chunk_index: Number,
  chunk_data: Binary,  // File chunk in binary format
  created_at: DateTime
}
```

**Usage**: Break large files into chunks for storage

---

### 15. visualizations Collection
**Purpose**: Store generated visualizations (Future/Optional)

**Schema Structure**:
```javascript
{
  _id: ObjectId,
  name: String,
  type: String,  // "line", "bar", "pie", "scatter", etc.
  config: Object,  // Chart configuration
  dataset_id: String,  // references datasets._id
  project_id: String | null,
  user_id: String,
  image_url: String | null,  // Saved chart image
  created_at: DateTime,
  updated_at: DateTime
}
```

**Usage**: Save chart configurations and generated visualizations

---

## Collection Relationships & Data Modeling

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE ENTITIES                                     │
└─────────────────────────────────────────────────────────────────────────────┘

users (1) ─────owns────────> (many) projects
  │                              │
  │ (profile 1:1)                │ (team many:many)
  │                              │
  v                              v
profiles                     members[] embedded in projects
  
users (many) <────member_of────> (many) projects [via members array]

projects (1) ────has────> (many) tasks
projects (1) ────has────> (many) sprints
projects (1) ────has────> (1) chat_channels [default channel]
projects (1) ────has────> (many) git_branches
projects (1) ────has────> (many) datasets

tasks (many) ────belongs_to────> (1) sprints [optional]
tasks (many) ────assigned_to────> (1) users
tasks (1) ────has────> (many) comments [embedded]
tasks (1) ────has────> (many) attachments [embedded]
tasks (1) ────has────> (many) activities [embedded audit log]
tasks (1) ────linked_to────> (many) tasks [via links array]
tasks (1) ────tracked_by────> (many) git_commits [via commit messages]

users (1) ────has────> (many) ai_conversations
ai_conversations (1) ────contains────> (many) ai_messages

chat_channels (1) ────contains────> (many) chat_messages
chat_messages (many) ────sent_by────> (1) users
chat_messages (1) ────read_by────> (many) users [via read_by array]

projects (1) ────has────> (many) git_branches
git_branches (1) ────has────> (many) git_commits
git_branches (1) ────has────> (many) git_pull_requests

datasets (1) ────has────> (many) dataset_files
datasets (1) ────generates────> (many) visualizations
```

### Relationship Types

#### One-to-One Relationships
1. **User ↔ Profile**
   - **Type**: Referenced (normalized)
   - **Implementation**: `profiles.user_id` references `users._id`
   - **Query Pattern**: `db.profiles.find_one({"user_id": user_id})`
   - **Use Case**: Extended user information separate from auth data

2. **Project ↔ Default Chat Channel**
   - **Type**: Referenced
   - **Implementation**: `chat_channels.project_id` with `is_default: true`
   - **Query Pattern**: `db.chat_channels.find_one({"project_id": project_id, "is_default": true})`
   - **Use Case**: Every project has one default team chat channel

#### One-to-Many Relationships
1. **User → Projects (Owner)**
   - **Type**: Referenced
   - **Implementation**: `projects.owner_id` references `users._id`
   - **Query Pattern**: `db.projects.find({"owner_id": user_id})`
   - **Use Case**: Track project ownership for permissions

2. **Project → Tasks**
   - **Type**: Referenced
   - **Implementation**: `tasks.project_id` references `projects._id`
   - **Query Pattern**: `db.tasks.find({"project_id": project_id})`
   - **Cascade**: When project is deleted, all tasks should be archived/deleted
   - **Use Case**: All tasks belong to exactly one project

3. **Project → Sprints**
   - **Type**: Referenced
   - **Implementation**: `sprints.project_id` references `projects._id`
   - **Query Pattern**: `db.sprints.find({"project_id": project_id}).sort([("start_date", -1)])`
   - **Use Case**: Track sprint history and current sprint per project

4. **Sprint → Tasks**
   - **Type**: Referenced (optional)
   - **Implementation**: `tasks.sprint_id` references `sprints._id` (nullable)
   - **Query Pattern**: `db.tasks.find({"sprint_id": sprint_id})`
   - **Use Case**: Tasks can exist without sprint (backlog), or be assigned to active sprint

5. **User → AI Conversations**
   - **Type**: Referenced
   - **Implementation**: `ai_conversations.user_id` references `users._id`
   - **Query Pattern**: `db.ai_conversations.find({"user_id": user_id}).sort([("updated_at", -1)])`
   - **Use Case**: Track all AI chat sessions per user

6. **AI Conversation → AI Messages**
   - **Type**: Referenced
   - **Implementation**: `ai_messages.conversation_id` references `ai_conversations._id`
   - **Query Pattern**: `db.ai_messages.find({"conversation_id": conv_id}).sort([("created_at", 1)])`
   - **Cascade**: When conversation deleted, all messages deleted
   - **Use Case**: Maintain chat history with pagination support

7. **Chat Channel → Chat Messages**
   - **Type**: Referenced
   - **Implementation**: `chat_messages.channel_id` references `chat_channels._id`
   - **Query Pattern**: `db.chat_messages.find({"channel_id": channel_id}).sort([("created_at", -1)]).limit(50)`
   - **Use Case**: Real-time team chat with message history

8. **Project → GitHub Branches**
   - **Type**: Referenced
   - **Implementation**: `git_branches.project_id` references `projects._id`
   - **Query Pattern**: `db.git_branches.find({"project_id": project_id, "status": "active"})`
   - **Use Case**: Track all branches in connected GitHub repository

9. **Git Branch → Git Commits**
   - **Type**: Referenced
   - **Implementation**: `git_commits.branch_id` references `git_branches._id`
   - **Query Pattern**: `db.git_commits.find({"branch_id": branch_id}).sort([("committed_at", -1)])`
   - **Use Case**: Track commit history per branch

10. **Dataset → Dataset Files**
    - **Type**: Referenced
    - **Implementation**: `dataset_files.dataset_id` references `datasets._id`
    - **Query Pattern**: `db.dataset_files.find({"dataset_id": dataset_id})`
    - **Use Case**: Track all uploaded files for data visualization

#### Many-to-Many Relationships
1. **Users ↔ Projects (Team Members)**
   - **Type**: Embedded array (denormalized)
   - **Implementation**: `projects.members[]` contains embedded user objects:
     ```python
     {
       "user_id": ObjectId,
       "email": str,
       "username": str,
       "role": str  # "member" or "admin"
     }
     ```
   - **Query Patterns**:
     - Get user's projects: `db.projects.find({"members.user_id": user_id})`
     - Get project members: `db.projects.find_one({"_id": project_id})["members"]`
     - Check membership: `db.projects.find_one({"_id": project_id, "members.user_id": user_id})`
   - **Update Pattern**: Add member via `$push`, remove via `$pull`, update role via positional operator
   - **Trade-off**: Denormalized for fast access, requires updates when user info changes
   - **Use Case**: Quick permission checks, team lists without joins

2. **Tasks ↔ Users (Watchers/Followers)**
   - **Type**: Array of references
   - **Implementation**: `tasks.watchers[]` contains array of `user_id` ObjectIds
   - **Query Patterns**:
     - Get watched tasks: `db.tasks.find({"watchers": user_id})`
     - Get task watchers: `db.tasks.find_one({"_id": task_id})["watchers"]`
   - **Use Case**: Notify users of task updates

3. **Tasks ↔ Tasks (Task Links)**
   - **Type**: Embedded array with link types
   - **Implementation**: `tasks.links[]` contains:
     ```python
     {
       "task_id": ObjectId,
       "link_type": str  # "blocks", "is_blocked_by", "relates_to", "duplicates"
     }
     ```
   - **Query Patterns**:
     - Get linked tasks: `db.tasks.find({"links.task_id": task_id})`
     - Get blocking tasks: `db.tasks.find({"_id": task_id})["links"]` filter by "blocks"
   - **Use Case**: Track task dependencies, duplicates, related work

4. **Chat Messages ↔ Users (Read By)**
   - **Type**: Array of references
   - **Implementation**: `chat_messages.read_by[]` contains array of `user_id` ObjectIds
   - **Query Pattern**: Check unread: `db.chat_messages.find({"channel_id": channel_id, "read_by": {"$ne": user_id}})`
   - **Use Case**: Track message read status for notifications

### Data Modeling Patterns

#### 1. Embedded Documents (Denormalized)
**When to Use**:
- Data that is always accessed together
- Small, bounded data (won't grow indefinitely)
- Data that doesn't need to be queried independently

**Examples in DOIT**:
```python
# Task Comments (embedded)
tasks.comments = [{
  "user_id": ObjectId,
  "username": str,
  "comment": str,
  "created_at": datetime
}]
# ✅ Always loaded with task
# ✅ Bounded size (50-100 comments max)
# ✅ No need to query comments independently

# Task Attachments (embedded)
tasks.attachments = [{
  "filename": str,
  "url": str,
  "uploaded_by": ObjectId,
  "uploaded_at": datetime,
  "size": int
}]
# ✅ Always displayed with task
# ✅ Limited number per task

# Task Activities/Audit Log (embedded)
tasks.activities = [{
  "user_id": ObjectId,
  "username": str,
  "action": str,  # "created", "updated", "commented"
  "field_changed": str,
  "old_value": Any,
  "new_value": Any,
  "timestamp": datetime
}]
# ✅ Complete audit trail with task
# ✅ Append-only log

# Project Members (embedded)
projects.members = [{
  "user_id": ObjectId,
  "email": str,
  "username": str,
  "role": str,
  "joined_at": datetime
}]
# ✅ Fast permission checks
# ✅ Team list without joins
# ⚠️ Requires sync when user updates profile
```

#### 2. Referenced Documents (Normalized)
**When to Use**:
- Large or unbounded data
- Data shared across multiple documents
- Independent querying required
- Frequent updates to referenced data

**Examples in DOIT**:
```python
# Tasks reference Projects
tasks.project_id = ObjectId  # references projects._id
# ✅ Many tasks per project (unbounded growth)
# ✅ Query tasks by project: find({"project_id": proj_id})
# ✅ Project updates don't affect all tasks

# Tasks reference Users (assigned_to)
tasks.assigned_to = ObjectId  # references users._id
# ✅ User data changes frequently (name, email)
# ✅ Query all tasks assigned to user: find({"assigned_to": user_id})
# ✅ No duplication of user data

# AI Messages reference Conversations
ai_messages.conversation_id = ObjectId  # references ai_conversations._id
# ✅ Unbounded message history
# ✅ Paginate messages independently
# ✅ Delete conversation = cascade delete messages
```

#### 3. Hybrid Approach (Mixed)
**When to Use**: Balance between query performance and data consistency

**Example in DOIT**:
```python
# Project Members: Embedded with denormalized user info
projects.members = [{
  "user_id": ObjectId,        # ← Reference for joins if needed
  "email": str,               # ← Denormalized for fast display
  "username": str,            # ← Denormalized for fast display
  "role": str                 # ← Project-specific role
}]

# Benefits:
# ✅ Fast: No join needed to display team list
# ✅ Flexible: Can still join to users collection if needed
# ✅ Consistent: user_id ensures data integrity
# ⚠️ Trade-off: Must sync when user.username or user.email changes
```

## Data Access Patterns

### 1. Authentication & Authorization

#### User Login
```python
# Find user by email
user = db.users.find_one({"email": email})

# Verify password (hashed)
if bcrypt.checkpw(password, user["password"]):
    # Generate JWT token
    token = create_access_token(user_id=user["_id"], role=user["role"])
```

#### Check User Permissions
```python
# Check if user is project owner or admin
project = db.projects.find_one({
    "_id": ObjectId(project_id),
    "$or": [
        {"owner_id": ObjectId(user_id)},
        {"members": {"$elemMatch": {"user_id": ObjectId(user_id), "role": "admin"}}}
    ]
})

# Check if user is project member (any role)
is_member = db.projects.find_one({
    "_id": ObjectId(project_id),
    "members.user_id": ObjectId(user_id)
})
```

#### Forced Logout (Token Invalidation)
```python
# When user changes password or admin forces logout:
db.users.update_one(
    {"_id": ObjectId(user_id)},
    {"$inc": {"token_version": 1}}  # Increment token version
)
# All existing JWT tokens become invalid (checked during authentication)
```

### 2. Project Management

#### Get User's Projects
```python
# Projects where user is owner OR member
projects = db.projects.find({
    "$or": [
        {"owner_id": ObjectId(user_id)},
        {"members.user_id": ObjectId(user_id)}
    ]
}).sort([("created_at", -1)])
```

#### Get Project with Team Members
```python
# Single query, members already embedded
project = db.projects.find_one({"_id": ObjectId(project_id)})
# Access: project["members"] → List of {user_id, email, username, role}
```

#### Add Team Member to Project
```python
# Add member with denormalized user info
user = db.users.find_one({"_id": ObjectId(new_user_id)})
db.projects.update_one(
    {"_id": ObjectId(project_id)},
    {"$push": {
        "members": {
            "user_id": user["_id"],
            "email": user["email"],
            "username": user["username"],
            "role": "member",
            "joined_at": datetime.now()
        }
    }}
)
```

#### Remove Team Member
```python
db.projects.update_one(
    {"_id": ObjectId(project_id)},
    {"$pull": {"members": {"user_id": ObjectId(user_id)}}}
)
```

#### Update Member Role
```python
db.projects.update_one(
    {"_id": ObjectId(project_id), "members.user_id": ObjectId(user_id)},
    {"$set": {"members.$.role": "admin"}}  # Positional operator $
)
```

### 3. Task Management

#### Get Project Tasks (Kanban Board)
```python
# All tasks in project, grouped by status
tasks = db.tasks.find({
    "project_id": ObjectId(project_id),
    "in_backlog": False  # Exclude backlog tasks
}).sort([("created_at", -1)])

# Group by status: "todo", "in_progress", "in_review", "done"
```

#### Get Sprint Tasks
```python
# Tasks in specific sprint
sprint_tasks = db.tasks.find({
    "project_id": ObjectId(project_id),
    "sprint_id": ObjectId(sprint_id)
})

# Sprint backlog (no sprint assigned)
backlog_tasks = db.tasks.find({
    "project_id": ObjectId(project_id),
    "sprint_id": None,
    "in_backlog": True
})
```

#### Get User's Assigned Tasks
```python
# All tasks assigned to user
my_tasks = db.tasks.find({
    "assigned_to": ObjectId(user_id)
}).sort([("priority", -1), ("due_date", 1)])  # High priority first, then by due date

# Filter by status
active_tasks = db.tasks.find({
    "assigned_to": ObjectId(user_id),
    "status": {"$in": ["in_progress", "in_review"]}
})
```

#### Get Task with Full Details
```python
# Single query includes embedded comments, attachments, activities
task = db.tasks.find_one({"_id": ObjectId(task_id)})
# Access:
# - task["comments"] → List of comments
# - task["attachments"] → List of files
# - task["activities"] → Audit log
# - task["links"] → Linked tasks
```

#### Get Linked Tasks
```python
# Get task with its linked tasks
task = db.tasks.find_one({"_id": ObjectId(task_id)})
linked_task_ids = [link["task_id"] for link in task["links"]]
linked_tasks = db.tasks.find({"_id": {"$in": linked_task_ids}})
```

#### Track Task by Ticket ID
```python
# Find task by human-readable ticket ID (e.g., "DT-001")
task = db.tasks.find_one({"ticket_id": "PROJ-123"})
```

#### Update Task Status with Activity Logging
```python
# Update status and add activity log
db.tasks.update_one(
    {"_id": ObjectId(task_id)},
    {
        "$set": {
            "status": "in_progress",
            "updated_at": datetime.now()
        },
        "$push": {
            "activities": {
                "user_id": ObjectId(user_id),
                "username": "john_doe",
                "action": "status_changed",
                "field_changed": "status",
                "old_value": "todo",
                "new_value": "in_progress",
                "timestamp": datetime.now()
            }
        }
    }
)
```

### 4. Sprint Management

#### Get Active Sprint
```python
# Only one sprint can be active per project
active_sprint = db.sprints.find_one({
    "project_id": ObjectId(project_id),
    "status": "active"
})
```

#### Start Sprint
```python
# Transition from "planned" to "active"
db.sprints.update_one(
    {"_id": ObjectId(sprint_id)},
    {
        "$set": {
            "status": "active",
            "start_date": datetime.now(),
            "updated_at": datetime.now()
        }
    }
)

# Deactivate any other active sprints
db.sprints.update_many(
    {"project_id": ObjectId(project_id), "_id": {"$ne": ObjectId(sprint_id)}, "status": "active"},
    {"$set": {"status": "completed"}}
)
```

#### Complete Sprint with Snapshot
```python
# Count completed tasks
completed_count = db.tasks.count_documents({
    "sprint_id": ObjectId(sprint_id),
    "status": "done"
})

total_count = db.tasks.count_documents({
    "sprint_id": ObjectId(sprint_id)
})

# Update sprint with completion data
db.sprints.update_one(
    {"_id": ObjectId(sprint_id)},
    {
        "$set": {
            "status": "completed",
            "end_date": datetime.now(),
            "completed_tasks_snapshot": completed_count,
            "total_tasks_snapshot": total_count,
            "updated_at": datetime.now()
        }
    }
)

# Move incomplete tasks to backlog or next sprint
db.tasks.update_many(
    {"sprint_id": ObjectId(sprint_id), "status": {"$ne": "done"}},
    {"$set": {"sprint_id": None, "in_backlog": True}}
)
```

### 5. AI Assistant Integration

#### Create AI Conversation
```python
# Start new conversation
conversation = db.ai_conversations.insert_one({
    "user_id": ObjectId(user_id),
    "title": "New Chat",
    "message_count": 0,
    "created_at": datetime.now(),
    "updated_at": datetime.now()
})
```

#### Add AI Message
```python
# Add message to conversation
db.ai_messages.insert_one({
    "conversation_id": conversation_id,
    "role": "user",  # or "assistant"
    "content": message_text,
    "tokens": token_count,
    "attachments": [],  # Optional file attachments
    "created_at": datetime.now()
})

# Increment message count
db.ai_conversations.update_one(
    {"_id": ObjectId(conversation_id)},
    {
        "$inc": {"message_count": 1},
        "$set": {"updated_at": datetime.now()}
    }
)
```

#### Get Conversation History with Pagination
```python
# Get recent messages (paginated)
messages = db.ai_messages.find({
    "conversation_id": ObjectId(conversation_id)
}).sort([("created_at", -1)]).skip(offset).limit(50)

# Reverse to show oldest first
messages = list(messages)[::-1]
```

### 6. Team Chat

#### Get Channel Messages (Real-time)
```python
# Get recent 50 messages
messages = db.chat_messages.find({
    "channel_id": ObjectId(channel_id)
}).sort([("created_at", -1)]).limit(50)

# For pagination (load more)
messages = db.chat_messages.find({
    "channel_id": ObjectId(channel_id),
    "created_at": {"$lt": last_message_timestamp}
}).sort([("created_at", -1)]).limit(50)
```

#### Send Channel Message
```python
# Insert message
db.chat_messages.insert_one({
    "channel_id": ObjectId(channel_id),
    "sender_id": ObjectId(user_id),
    "sender_name": username,
    "message": message_text,
    "attachments": [],  # Optional file URLs
    "read_by": [ObjectId(user_id)],  # Sender has read it
    "created_at": datetime.now()
})
```

#### Mark Messages as Read
```python
# Mark all unread messages in channel as read
db.chat_messages.update_many(
    {
        "channel_id": ObjectId(channel_id),
        "read_by": {"$ne": ObjectId(user_id)}
    },
    {"$addToSet": {"read_by": ObjectId(user_id)}}  # Add user to read_by array
)
```

#### Get Unread Message Count
```python
# Count unread messages per channel
unread_count = db.chat_messages.count_documents({
    "channel_id": ObjectId(channel_id),
    "read_by": {"$ne": ObjectId(user_id)},
    "sender_id": {"$ne": ObjectId(user_id)}  # Exclude own messages
})
```

### 7. GitHub Integration

#### Sync GitHub Branches
```python
# Upsert branches from GitHub API
for branch in github_branches:
    db.git_branches.update_one(
        {"project_id": ObjectId(project_id), "name": branch["name"]},
        {
            "$set": {
                "commit_sha": branch["commit"]["sha"],
                "status": "active",
                "updated_at": datetime.now()
            },
            "$setOnInsert": {"created_at": datetime.now()}
        },
        upsert=True
    )
```

#### Track Commits (Avoid Duplicates)
```python
# Check if commit exists by SHA
existing = db.git_commits.find_one({
    "project_id": ObjectId(project_id),
    "commit_sha": commit_sha
})

if not existing:
    # Parse commit message for task references (e.g., "Fixes PROJ-123")
    task_ids = extract_task_ids(commit_message)
    
    db.git_commits.insert_one({
        "branch_id": ObjectId(branch_id),
        "project_id": ObjectId(project_id),
        "commit_sha": commit_sha,
        "author_name": commit["author"]["name"],
        "author_email": commit["author"]["email"],
        "message": commit["message"],
        "task_ids": task_ids,  # Links to tasks
        "committed_at": commit["author"]["date"],
        "created_at": datetime.now()
    })
```

#### Link Commits to Tasks
```python
# Get all commits that mention a task
commits = db.git_commits.find({
    "project_id": ObjectId(project_id),
    "task_ids": ticket_id  # e.g., "PROJ-123"
}).sort([("committed_at", -1)])
```

#### Track Pull Requests
```python
# Upsert PR (update existing or create new)
db.git_pull_requests.update_one(
    {"project_id": ObjectId(project_id), "pr_number": pr_number},
    {
        "$set": {
            "title": pr["title"],
            "description": pr["body"],
            "status": pr["state"],  # "open", "closed", "merged"
            "source_branch": pr["head"]["ref"],
            "target_branch": pr["base"]["ref"],
            "author": pr["user"]["login"],
            "updated_at": datetime.now()
        },
        "$setOnInsert": {
            "created_at": datetime.now(),
            "url": pr["html_url"]
        }
    },
    upsert=True
)
```

### 8. Profile Management

#### Get or Create Profile (Upsert Pattern)
```python
# Upsert profile (create if not exists, update if exists)
profile_data = {...}  # Profile fields

db.profiles.update_one(
    {"user_id": ObjectId(user_id)},
    {"$set": profile_data},
    upsert=True
)
```

#### Get User with Profile
```python
# Two queries (can be combined with aggregation)
user = db.users.find_one({"_id": ObjectId(user_id)})
profile = db.profiles.find_one({"user_id": ObjectId(user_id)})

# Or use aggregation pipeline for single query
user_with_profile = db.users.aggregate([
    {"$match": {"_id": ObjectId(user_id)}},
    {"$lookup": {
        "from": "profiles",
        "localField": "_id",
        "foreignField": "user_id",
        "as": "profile"
    }},
    {"$unwind": {"path": "$profile", "preserveNullAndEmptyArrays": True}}
])
```

## Database Indexing Strategy

### Purpose of Indexes
- **Speed up queries**: Avoid full collection scans
- **Enforce uniqueness**: Prevent duplicate data
- **Support sorting**: Efficient ORDER BY operations
- **Enable compound queries**: Multi-field search optimization

### Index Types Used

#### 1. Single Field Indexes
```python
# Unique indexes (enforce data integrity)
db.users.create_index([("email", 1)], unique=True)
db.tasks.create_index([("ticket_id", 1)], unique=True)
db.git_commits.create_index([("commit_sha", 1)], unique=True)

# Non-unique indexes (query optimization)
db.tasks.create_index([("assigned_to", 1)])  # Get user's tasks
db.tasks.create_index([("project_id", 1)])   # Get project tasks
db.sprints.create_index([("project_id", 1)]) # Get project sprints
```

#### 2. Compound Indexes
```python
# Project + Status queries (active sprint per project)
db.sprints.create_index([("project_id", 1), ("status", 1)])

# Channel + Timestamp (chat message pagination)
db.chat_messages.create_index([("channel_id", 1), ("created_at", -1)])

# Conversation + Timestamp (AI message history)
db.ai_messages.create_index([("conversation_id", 1), ("created_at", 1)])

# Project + Unique PR number
db.git_pull_requests.create_index([("project_id", 1), ("pr_number", 1)], unique=True)

# Project + Unique commit SHA (avoid duplicates)
db.git_commits.create_index([("project_id", 1), ("commit_sha", 1)], unique=True)
```

#### 3. Array Indexes
```python
# Query embedded arrays
db.projects.create_index([("members.user_id", 1)])  # Find user's projects
db.tasks.create_index([("watchers", 1)])            # Find watched tasks
db.chat_messages.create_index([("read_by", 1)])     # Find read messages
```

#### 4. Text Indexes (Full-Text Search)
```python
# Search tasks by title/description
db.tasks.create_index([("title", "text"), ("description", "text")])

# Search projects by name/description
db.projects.create_index([("name", "text"), ("description", "text")])

# Usage:
db.tasks.find({"$text": {"$search": "authentication bug"}})
```

### Recommended Indexes by Collection

#### users
```python
db.users.create_index([("email", 1)], unique=True)           # Login
db.users.create_index([("role", 1)])                         # Filter by role
db.users.create_index([("created_at", -1)])                  # Sort users
```

#### projects
```python
db.projects.create_index([("owner_id", 1)])                  # Owner's projects
db.projects.create_index([("members.user_id", 1)])           # Member's projects
db.projects.create_index([("prefix", 1)], unique=True)       # Unique prefix
db.projects.create_index([("name", "text")])                 # Search projects
db.projects.create_index([("created_at", -1)])               # Recent projects
```

#### tasks
```python
db.tasks.create_index([("ticket_id", 1)], unique=True)       # Find by ticket ID
db.tasks.create_index([("project_id", 1), ("status", 1)])    # Kanban board
db.tasks.create_index([("project_id", 1), ("sprint_id", 1)]) # Sprint tasks
db.tasks.create_index([("assigned_to", 1)])                  # User's tasks
db.tasks.create_index([("assigned_to", 1), ("status", 1)])   # Active tasks
db.tasks.create_index([("due_date", 1)])                     # Upcoming deadlines
db.tasks.create_index([("priority", -1)])                    # High priority
db.tasks.create_index([("watchers", 1)])                     # Watched tasks
db.tasks.create_index([("title", "text"), ("description", "text")])  # Search
```

#### sprints
```python
db.sprints.create_index([("project_id", 1), ("status", 1)])  # Active sprint
db.sprints.create_index([("project_id", 1), ("start_date", -1)])  # Recent sprints
```

#### ai_conversations
```python
db.ai_conversations.create_index([("user_id", 1), ("updated_at", -1)])  # Recent chats
```

#### ai_messages
```python
db.ai_messages.create_index([("conversation_id", 1), ("created_at", 1)])  # Chat history
```

#### chat_channels
```python
db.chat_channels.create_index([("project_id", 1)])           # Project channels
db.chat_channels.create_index([("project_id", 1), ("is_default", 1)])  # Default channel
```

#### chat_messages
```python
db.chat_messages.create_index([("channel_id", 1), ("created_at", -1)])  # Recent messages
db.chat_messages.create_index([("sender_id", 1)])            # User's messages
db.chat_messages.create_index([("read_by", 1)])              # Unread messages
```

#### git_branches
```python
db.git_branches.create_index([("project_id", 1), ("status", 1)])  # Active branches
```

#### git_commits
```python
db.git_commits.create_index([("project_id", 1), ("commit_sha", 1)], unique=True)  # No duplicates
db.git_commits.create_index([("branch_id", 1), ("committed_at", -1)])  # Branch history
db.git_commits.create_index([("task_ids", 1)])               # Commits per task
```

#### git_pull_requests
```python
db.git_pull_requests.create_index([("project_id", 1), ("pr_number", 1)], unique=True)
db.git_pull_requests.create_index([("project_id", 1), ("status", 1)])  # Open PRs
```

#### profiles
```python
db.profiles.create_index([("user_id", 1)], unique=True)      # One profile per user
```

### Index Performance Tips

1. **Index Selectivity**: Index fields with high cardinality (many unique values)
   - ✅ Good: `email`, `ticket_id`, `commit_sha` (unique)
   - ⚠️ Moderate: `status`, `priority` (few values, but frequently queried)
   - ❌ Poor: `is_active` (boolean, low selectivity)

2. **Compound Index Order**: Most selective field first
   ```python
   # ✅ Good: project_id (high cardinality) → status (low cardinality)
   db.tasks.create_index([("project_id", 1), ("status", 1)])
   
   # ❌ Bad: status first
   db.tasks.create_index([("status", 1), ("project_id", 1)])
   ```

3. **Index Size**: Monitor index size vs collection size
   ```python
   db.tasks.stats()["indexSizes"]  # Check index sizes
   # Indexes should be < 50% of collection size
   ```

4. **Query Analysis**: Use explain() to verify index usage
   ```python
   db.tasks.find({"project_id": project_id}).explain("executionStats")
   # Check: "executionStats.executionStages.stage" should be "IXSCAN" (index scan)
   #        "executionStats.totalDocsExamined" should be close to "nReturned"
   ```

5. **Avoid Over-Indexing**: Each index adds write overhead
   - Indexes slow down INSERT, UPDATE, DELETE operations
   - Only index fields that are frequently queried
   - Remove unused indexes

## Database Best Practices Used

1. **ObjectId for Primary Keys**
   - Automatic indexing on `_id` field
   - Embedded creation timestamp
   - Globally unique across distributed systems

2. **Timestamps for All Records**
   - `created_at`: Record creation time
   - `updated_at`: Last modification time
   - Enables audit trails and temporal queries

3. **Embedded Documents for Related Data**
   - Comments, attachments, activities embedded in tasks
   - Reduces query count (no JOINs needed)
   - Atomic updates within single document

4. **References for Relationships**
   - Use ObjectId references for 1-to-many relationships
   - Enables independent querying and updates
   - Prevents data duplication

5. **Array Fields for Many-to-Many**
   - `members[]` in projects for team membership
   - `watchers[]` in tasks for followers
   - `read_by[]` in messages for read status

6. **Denormalization for Performance**
   - Embed frequently accessed data (username, email in project members)
   - Trade-off: Faster reads, slower writes, requires data sync

7. **Unique Constraints**
   - Enforce data integrity at database level
   - Prevent duplicate emails, ticket IDs, commit SHAs

8. **Cascading Patterns**
   - Delete conversations → delete all messages
   - Complete sprint → move incomplete tasks to backlog

9. **Idempotency**
   - Use upsert for GitHub sync (branches, PRs)
   - Check commit SHA before inserting (avoid duplicates)

10. **Audit Logging**
    - Activities array in tasks tracks all changes
    - Includes user, action, old/new values, timestamp

---

**End of Database Schema Documentation**
