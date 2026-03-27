# DOIT Project - Complete Overview & Technical Documentation

## Project Name
**DOIT** - A comprehensive project management and task tracking system with AI-powered capabilities

## Project Description
DOIT is a modern, full-stack web application designed for agile teams to manage projects, tasks, sprints, and team collaboration efficiently. It combines traditional project management methodologies (Scrum, Kanban) with cutting-edge AI assistance, real-time collaboration tools, GitHub integration, and comprehensive analytics. Built for scalability and ease of use, DOIT serves teams of all sizes from startups to enterprises.

## Technology Stack (Detailed)

### Backend Technologies
- **Framework**: FastAPI 0.115.0+ (Python 3.9+)
  - High-performance async Python web framework
  - Automatic API documentation with Swagger UI
  - Native async/await support
  - Type hints and Pydantic validation
  
- **Database**: MongoDB Atlas (Cloud-hosted)
  - NoSQL document database
  - Cloud-based with automatic backups
  - Global CDN for low-latency access
  - Connection string with authentication
  
- **Server**: Uvicorn with auto-reload
  - ASGI server for async operations
  - Hot reload in development mode
  - Multi-worker support for production
  - Runs on 0.0.0.0:8000
  
- **Authentication & Security**:
  - JWT (JSON Web Tokens) with python-jose[cryptography]
  - Tab session key validation (prevents token theft)
  - Bcrypt password hashing (passlib[bcrypt])
  - Token versioning for forced logout
  - Role-based access control (RBAC)
  
- **API Style**: RESTful with JSON responses
  - Consistent response format: `{success: bool, data: any, message: string}`
  - HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 500 (Server Error)
  - Comprehensive error handling
  
- **Real-time Communication**: WebSocket
  - Real-time Kanban board updates
  - Live task movements
  - Team chat messaging
  - Connection pooling
  
- **AI Integration**:
  - **Azure OpenAI (GPT-5.2-chat)**: Conversational AI assistant
    - Endpoint: Azure AI Foundry
    - API Version: Configured via environment
    - Temperature: 1.0 (only supported value for GPT-5.2-chat)
    - Max tokens: 2000-4096
    - Streaming support for real-time responses
  
  - **Azure AI Foundry FLUX-1.1-pro**: AI image generation
    - Text-to-image generation
    - PNG format output
    - Generation time: 10-30 seconds
    - Limitation: n=1 (one image at a time)
  
  - **Google Gemini API**: Additional AI capabilities
    - Alternative AI processing
    - Backup AI service
  
- **GitHub Integration**:
  - GitHub API v3 with Personal Access Tokens
  - Webhook support for real-time updates
  - Repository management
  - Collaborator invitations
  - Branch and commit tracking
  - Pull request monitoring
  - Automatic ticket-branch linking
  
- **File Processing**:
  - **PyPDF2**: PDF text extraction (first 20 pages)
  - **python-docx**: Word document processing (all paragraphs)
  - **CSV parser**: Data extraction (first 50 rows)
  - **JSON parser**: Pretty-print JSON files
  - Text file support
  - File upload with content extraction for AI analysis

### Frontend Technologies
- **Framework**: React.js 19.2.3
  - Component-based architecture
  - Functional components with hooks
  - Virtual DOM for performance
  - JSX syntax
  
- **Routing**: React Router 7.11.0
  - Client-side routing
  - Protected routes with auth guards
  - Dynamic route parameters
  - Nested routes
  
- **State Management**: React Context API
  - AuthContext for user authentication
  - Global state management
  - No external state libraries needed
  
- **UI Components & Styling**:
  - Custom CSS with modern animations
  - Responsive design (mobile-first)
  - Dark/Light theme support
  - CSS Grid and Flexbox layouts
  - React Icons (version 5.5.0)
  - Lucide React icons
  
- **Data Visualization**:
  - **Recharts 3.6.0**: Charts and graphs
  - **react-chartjs-2**: Additional charting
  - **html2canvas**: Screenshot exports
  - **jsPDF**: PDF generation
  - **jsPDF-autotable**: Table exports
  - **ExcelJS**: Excel file generation
  
- **Drag and Drop**: @dnd-kit
  - Core: 6.3.1
  - Sortable: 10.0.0
  - Utilities: 3.2.2
  - Kanban board drag-and-drop functionality
  
- **HTTP Client**: Fetch API (native)
  - Axios 1.13.2 available for advanced features
  - axios-cache-interceptor for request caching
  
- **Calendar**: react-big-calendar 1.19.4
  - Task scheduling
  - Sprint timeline view
  - Due date visualization
  
- **Real-time**: WebSocket connections
  - Custom hooks: useKanbanWebSocket, useWebSocket
  - Auto-reconnection logic
  - Message queueing
  
- **Other Libraries**:
  - Moment.js (2.30.1): Date/time manipulation
  - react-toastify (11.0.5): Toast notifications
  - @clerk/clerk-react (5.59.4): Authentication UI
  - @tanstack/react-query (5.90.19): Data fetching

### Server Configuration
- **Backend Server**: 
  - URL: http://localhost:8000
  - Host: 0.0.0.0 (all interfaces)
  - Port: 8000
  - Auto-reload: Enabled in development
  - CORS: Configured for http://localhost:3000
  
- **Frontend Development Server**:
  - URL: http://localhost:3000
  - Hot Module Replacement (HMR)
  - React Scripts 5.0.1
  
- **API Documentation**:
  - Swagger UI: http://localhost:8000/docs
  - ReDoc: http://localhost:8000/redoc
  - Interactive API testing
  
- **Static Files**:
  - Uploads directory: /uploads
  - Chat attachments: /uploads/chat_attachments
  - AI attachments: /uploads/ai_attachments
  - AI images: /uploads/ai_images

## Core Features (Comprehensive)

### 1. User Management & Authentication
**Technology**: JWT tokens, Bcrypt, Tab session key validation

**Features**:
- **User Registration**: Email-based registration with password strength validation
- **Secure Authentication**: 
  - JWT tokens with 24-hour expiry
  - Tab session key prevents token theft across browser tabs
  - Token versioning for forced logout capability
  - HTTP-only cookies option
- **Role-Based Access Control (RBAC)**:
  - **Super Admin** (Level 5): Full system access, user management, system dashboard
  - **Admin** (Level 4): User management, all projects access, delete operations
  - **Manager** (Level 3): Project creation, team management, sprint planning
  - **Team Member** (Level 2): Task CRUD on assigned projects, team chat
  - **Viewer** (Level 1): Read-only access to all content
- **Profile Management**:
  - Avatar upload and display
  - Personal information (name, email, bio)
  - Education history
  - Certifications
  - Organization details
  - Profile picture storage
- **Password Management**:
  - Secure password hashing with bcrypt
  - Password change functionality
  - Strength indicators
- **Default Super Admin**:
  - Email: Set via SADMIN_EMAIL environment variable
  - Password: Set via SADMIN_PASSWORD environment variable (hashed with bcrypt)
  - Auto-created on first startup
  - ⚠️ **IMPORTANT**: Change default credentials immediately in production!

### 2. Project Management
**Models**: Project collection with members array

**Features**:
- **Project Creation**: 
  - Name, description, owner
  - Auto-generated project prefix for ticket IDs (e.g., "DOIT" project → "DT-001")
  - Timestamps (created_at, updated_at)
- **Team Member Management**:
  - Add/remove members to projects
  - Member roles and permissions
  - View all project members
- **Project Visibility**:
  - Owner sees all owned projects
  - Members see projects they're part of
  - Admins see all projects
- **Project Tracking**:
  - Progress percentage
  - Total tasks vs completed
  - Active sprint information
  - Milestone tracking
- **GitHub Integration**:
  - Link GitHub repository to project
  - Store repository URL
  - Track commits and branches by project
  - Webhook integration for real-time updates
- **Project-Specific Channels**:
  - Team chat channels per project
  - File sharing within project context
  - Message history

### 3. Task Management (Comprehensive)
**Models**: Task collection with full project lifecycle

**Features**:
- **Task Creation**:
  - Unique ticket ID (e.g., DT-001, CC-16)
  - Issue types: Bug, Task, Story, Epic
  - Title and rich description
  - Project and sprint assignment
  - Creator tracking
  
- **Task Assignment**:
  - Assign to team members
  - Store assignee details (ID, name, email)
  - Reassignment capability
  - Unassigned task tracking
  
- **Priority Levels**:
  - Low (routine tasks)
  - Medium (regular priority)
  - High (important tasks)
  - Critical (urgent, blocking tasks)
  
- **Status Workflow**:
  - **To Do**: Backlog, ready for work
  - **In Progress**: Currently being worked on
  - **In Review**: Code review, testing
  - **Done**: Completed and verified
  - **Blocked**: Waiting on dependencies
  
- **Task Details**:
  - Labels/Tags for categorization
  - Due dates with calendar view
  - Time tracking (planned vs actual)
  - Story points for estimation
  - Parent-child task relationships
  
- **File Attachments**:
  - Upload multiple files per task
  - Support: PDF, Images, Documents, CSV
  - Attachment metadata (name, URL, uploader, timestamp)
  - View/download capabilities
  
- **Activity Log**:
  - Automatic activity tracking
  - Status changes logged
  - Assignment changes
  - Comments and discussions
  - Edit history
  - User attribution
  - Timestamp for all activities
  
- **GitHub Integration per Task**:
  - Link branches to tasks (e.g., feature/DT-001-login)
  - Track commits mentioning ticket ID
  - View pull requests
  - Commit history display
  - Auto-detect ticket ID in branch names
  
- **Task Relationships**:
  - Subtasks and parent tasks
  - Linked issues (blocks, depends on, relates to)
  - Epic aggregation
  
- **Filtering & Search**:
  - By status, priority, assignee
  - By label, sprint, project
  - Text search in title/description
  - Advanced filters

### 4. Sprint Planning & Management
**Models**: Sprint collection with backlog management

**Features**:
- **Sprint Creation**:
  - Sprint name and goals
  - Start and end dates
  - Sprint capacity planning
  - Team availability consideration
  
- **Sprint Lifecycle**:
  - **Planning**: Add tasks from backlog
  - **Active**: Sprint in progress
  - **Completed**: Sprint finished, review
  - **Cancelled**: Sprint terminated early
  
- **Sprint Backlog**:
  - Add/remove tasks to sprint
  - Task prioritization within sprint
  - Story point totals
  - Capacity vs commitment
  
- **Sprint Velocity**:
  - Completed story points per sprint
  - Team velocity trends
  - Predictive planning
  
- **Burndown Charts**:
  - Daily story point burndown
  - Ideal vs actual progress
  - Scope change tracking
  
- **Sprint Reports**:
  - Completed vs planned tasks
  - Carry-over analysis
  - Team performance metrics
  - Export capabilities
  
- **Backlog Management**:
  - Unassigned tasks pool
  - Available for sprint planning
  - Exclude completed tasks
  - Sort by priority and due date

### 5. Kanban Board (Real-time)
**Technology**: @dnd-kit for drag-drop, WebSocket for live updates

**Features**:
- **Visual Board**:
  - Columns: To Do, In Progress, In Review, Done, Blocked
  - Customizable column names
  - Task cards with key information
  
- **Drag-and-Drop**:
  - Smooth animations
  - Multi-touch support
  - Keyboard shortcuts
  - Touch-friendly for tablets
  
- **Real-time Synchronization**:
  - WebSocket connection per project
  - Instant updates when tasks move
  - Multi-user collaboration
  - Conflict resolution
  
- **Task Cards Display**:
  - Ticket ID and title
  - Assignee avatar
  - Priority indicator
  - Labels/tags
  - Attachment count
  - Comment count
  
- **Board Operations**:
  - Quick add tasks
  - Inline editing
  - Archive completed
  - Filter by assignee, label, priority
  
- **Board Views**:
  - Kanban (default)
  - List view
  - Calendar view
  - Timeline view

### 6. Team Collaboration & Chat
**Models**: Channels and Messages collections

**Features**:
- **Team Chat**:
  - Project-specific channels
  - General and project channels
  - Real-time messaging
  - Message threading (planned)
  
- **File Sharing**:
  - Attach files to messages
  - Images, documents, code snippets
  - File preview
  - Download capabilities
  
- **Message Features**:
  - Rich text formatting (planned)
  - @mentions (planned)
  - Reactions/emojis (planned)
  - Message editing and deletion
  
- **Channel Management**:
  - Create project channels
  - Public and private channels
  - Channel descriptions
  - Member-only access
  
- **Search & History**:
  - Message history
  - Search across channels
  - Filter by user, date, keywords

### 7. AI Assistant (DOIT-AI) - Powered by Azure
**Technology**: Azure OpenAI GPT-5.2-chat, Azure FLUX-1.1-pro

**Conversational AI Features**:
- **ChatGPT-like Interface**:
  - Clean, modern chat UI
  - Conversation bubbles
  - Typing indicators
  - Conversation list sidebar
  
- **GPT-5.2-chat Integration**:
  - Natural language understanding
  - Context-aware responses
  - Multi-turn conversations
  - Conversation memory within session
  - Temperature: 1.0 (model default)
  - Max tokens: 2000-4096
  - Streaming responses for real-time output
  
- **Conversation Management**:
  - Create multiple conversations
  - Name/rename conversations
  - Conversation history saved
  - Delete old conversations
  - Switch between conversations
  - Auto-save chat history
  
- **AI Capabilities**:
  - Answer general questions
  - Provide coding assistance
  - Project management advice
  - Task breakdown suggestions
  - Sprint planning help
  - Bug troubleshooting
  - Documentation writing
  
- **File Upload & Analysis**:
  - **PDF Files**: Extract text from PDF (first 20 pages), answer questions
  - **CSV Files**: Parse data (first 50 rows), analyze, insights
  - **Word Documents (.docx)**: Extract all paragraphs, summarize
  - **Text/Markdown Files**: Full content analysis
  - **JSON Files**: Parse and explain structure
  - Content extraction via backend utils
  - AI reads actual file content for accurate responses
  
- **Image Generation**:
  - Text-to-image using FLUX-1.1-pro
  - High-quality image output
  - PNG format
  - Generation time: 10-30 seconds
  - Save generated images
  - Display in conversation
  - Download capability
  
- **Message Features**:
  - User and AI message separation
  - Timestamp display
  - Copy to clipboard
  - Message regeneration (planned)
  - Export conversation (planned)
  
- **Technical Implementation**:
  - Token management and limits
  - Context window optimization
  - Error handling and retry logic
  - Graceful degradation

### 8. Data Visualization & Analytics
**Technology**: Recharts, Chart.js, ExcelJS, jsPDF

**Dashboard Views**:
1. **User Dashboard** (Role-based):
   - My tasks overview
   - Project progress charts
   - Upcoming deadlines
   - Recent activity
   - Sprint velocity
   
2. **System Dashboard** (Super Admin):
   - Total users, projects, tasks
   - System-wide statistics
   - User registration trends
   - Project creation trends
   - Task completion rates
   - Performance metrics
   
**Chart Types**:
- **Task Status Distribution**: Pie chart showing To Do, In Progress, Done
- **Task Priority Chart**: Bar chart showing Low, Medium, High, Critical
- **Project Progress**: Line chart showing completion over time
- **Sprint Burndown**: Daily progress vs ideal
- **Team Velocity**: Sprint-by-sprint comparison
- **Task Assignment**: Who has how many tasks
- **Trend Analysis**: Task creation vs completion

**Data Export**:
- **PDF Export**: Reports with charts and tables
- **Excel Export**: Raw data with sheets (ExcelJS)
- **CSV Export**: Simple data export
- **Chart Screenshots**: html2canvas for images
- Customizable date ranges
- Filter options

### 9. GitHub Integration (Enterprise Feature)
**Technology**: GitHub API v3, Webhooks, Personal Access Tokens

**Repository Management**:
- **Link Repository to Project**:
  - Store GitHub repo URL
  - Parse owner and repo name
  - Validate repository access
  
- **Collaborator Management**:
  - Add team members as GitHub collaborators
  - Permissions: pull, push, admin, maintain, triage
  - Invite via GitHub API
  - Track invitation status
  
**Webhook Integration**:
- **Branch Events**:
  - Listen for branch creation
  - Extract ticket ID from branch name (e.g., feature/DT-001)
  - Link branch to task automatically
  - Track branch status (active, merged, deleted)
  
- **Commit Events**:
  - Push events webhook
  - Extract ticket ID from commit messages
  - Store commit SHA, message, author
  - Link commits to tasks
  - Display commit history in task details
  
- **Pull Request Events**:
  - PR opened, closed, merged
  - Link PR to task via ticket ID
  - Track PR status
  - Show PR details in task
  
**Task-Code Linking**:
- **Automatic Detection**:
  - Ticket ID in branch names (feature/CC-16-login)
  - Ticket ID in commit messages (CC-16: Add login)
  - Pattern: [A-Z]+-[0-9]+
  
- **Display in UI**:
  - Branches linked to task
  - Commits for task
  - Pull requests
  - Commit authors and timestamps
  - Time since commit (human-readable)
  
**Security**:
- **Token Encryption**:
  - GitHub PAT encrypted with Fernet
  - Stored securely in database
  - Decrypted only when needed
  
- **Webhook Validation**:
  - X-GitHub-Event header verification
  - Payload signature validation (optional)
  - Event type filtering
  
**Models**:
- **GitBranch**: task_id, project_id, branch_name, repo_url, status
- **GitCommit**: task_id, project_id, sha, message, author, timestamp
- **GitPullRequest**: task_id, project_id, pr_number, title, status

### 10. Calendar & Timeline View
**Technology**: react-big-calendar, Moment.js

**Features**:
- Task scheduling with due dates
- Sprint timelines
- Milestone visualization
- Drag to reschedule
- Month, week, day views
- Filter by project, assignee

## User Roles & Permissions (Detailed)

### Permission Hierarchy
Roles are hierarchical - higher roles inherit all permissions from lower roles.

### Super Admin (Level 5)
**Full System Access - God Mode**

**Permissions**:
- ✅ **System Management**:
  - Access System Dashboard
  - View system-wide statistics
  - Monitor all activities
  - System health monitoring
  
- ✅ **User Management**:
  - Create, read, update, delete ANY user
  - Change user roles (including making other super admins)
  - Reset user passwords
  - View all user profiles
  - Manage user permissions
  
- ✅ **Project Management**:
  - Access ALL projects (regardless of ownership)
  - Create, edit, delete any project
  - Add/remove members from any project
  - View all project statistics
  
- ✅ **Task Management**:
  - View, edit, delete ANY task
  - Reassign any task
  - Change task status/priority
  
- ✅ **Sprint Management**:
  - Create, edit, delete any sprint
  - Modify sprint assignments
  
- ✅ **Data & Reports**:
  - Export all data (PDF, Excel, CSV)
  - View system-wide reports
  - Access audit logs
  
- ✅ **AI & Chat**:
  - Use AI Assistant
  - Access all team chats

**Default Credentials**:
- Email: Set via SADMIN_EMAIL environment variable
- Password: Set via SADMIN_PASSWORD environment variable
- ⚠️ **IMPORTANT**: Use strong credentials and change immediately in production!

---

### Admin (Level 4)
**Project-wide Management**

**Permissions**:
- ✅ **User Management** (Limited):
  - View all users
  - Create new users (Team Members, Viewers)
  - Edit user profiles (cannot change super admin)
  - Cannot delete super admins
  
- ✅ **Project Management**:
  - Create unlimited projects
  - Edit any project
  - Delete projects they own
  - View all projects
  - Add/remove members
  
- ✅ **Task Management**:
  - Full CRUD on tasks in their projects
  - Assign tasks to any team member
  - Delete any task
  
- ✅ **Sprint Management**:
  - Create and manage sprints
  - Sprint planning
  
- ✅ **Reports**:
  - Generate project reports
  - Export project data
  
- ✅ **AI & Chat**:
  - Full AI Assistant access
  - Team chat access

**Use Case**: IT managers, department heads, project administrators

---

### Manager (Level 3)
**Team & Sprint Management**

**Permissions**:
- ✅ **Project Management**:
  - Create new projects
  - Edit projects they own
  - Add/remove team members from their projects
  - Cannot delete projects
  
- ✅ **Task Management**:
  - Create tasks in their projects
  - Edit any task in their projects
  - Assign tasks to team members
  - Update task status, priority
  - Delete tasks they created
  
- ✅ **Sprint Management**:
  - Create sprints for their projects
  - Sprint planning and backlog management
  - Add/remove tasks from sprints
  
- ✅ **Team Coordination**:
  - View team member profiles
  - See team availability
  - Track team velocity
  
- ✅ **Reports**:
  - View project dashboards
  - Generate team reports
  - Export task lists
  
- ✅ **AI & Chat**:
  - Full AI Assistant access
  - Team chat participation

**Use Case**: Scrum masters, team leads, project managers

---

### Team Member (Level 2)
**Task Execution**

**Permissions**:
- ✅ **Task Management**:
  - View all tasks in assigned projects
  - Create new tasks
  - Edit tasks assigned to them
  - Update status of their tasks (To Do → In Progress → Done)
  - Add comments and attachments to tasks
  - Cannot delete tasks
  
- ✅ **Sprint Participation**:
  - View sprint information
  - Update their task progress
  - See sprint board
  
- ✅ **Project Viewing**:
  - View projects they're assigned to
  - See project details and members
  - Cannot edit project settings
  
- ✅ **GitHub Integration**:
  - Link branches to tasks
  - View commits on their tasks
  
- ✅ **Collaboration**:
  - Participate in team chat
  - Share files
  - Comment on tasks
  
- ✅ **AI & Chat**:
  - Full AI Assistant access
  - Team chat in their projects

**Use Case**: Developers, designers, QA testers, content creators

---

### Viewer (Level 1)
**Read-Only Access**

**Permissions**:
- ✅ **View Only**:
  - View projects they're invited to
  - See tasks (no editing)
  - Read task descriptions and comments
  - View sprint boards
  - See project progress
  - Access dashboards (read-only)
  
- ✅ **AI Assistant**:
  - Use AI chatbot for questions
  - Generate images
  - Upload files for analysis
  
- ❌ **Cannot**:
  - Create, edit, or delete anything
  - Change task status
  - Add comments
  - Upload attachments
  - Participate in team chat
  - Modify project settings

**Use Case**: Stakeholders, clients, observers, auditors

---

## Role Checks (Backend Implementation)
```python
# In middleware/role_middleware.py
def require_role(required_level: int):
    # super_admin: 5, admin: 4, manager: 3, member: 2, viewer: 1
    # Users with higher level can access lower level endpoints
```

---

## Security Features (Comprehensive)

### 1. Authentication Security
- **JWT Tokens**:
  - Signed with HS256 algorithm
  - Secret key stored in environment variable
  - 24-hour expiration (configurable)
  - Refresh token support (planned)
  
- **Tab Session Key**:
  - Unique key per browser tab
  - Prevents token sharing between tabs
  - Blocks cross-tab token theft
  - Validates on every request
  
- **Token Versioning**:
  - Each user has a token_version number
  - Incremented on password change or forced logout
  - Old tokens become invalid
  - Enables forced logout across devices

### 2. Password Security
- **Bcrypt Hashing**:
  - Industry-standard password hashing
  - Salt rounds: 12 (default)
  - One-way encryption
  - Rainbow table resistant
  
- **Password Policies** (configurable):
  - Minimum length: 8 characters
  - Complexity requirements (optional)
  - Password strength indicators
  - No password history (planned)

### 3. API Security
- **CORS Configuration**:
  - Allowed origins: http://localhost:3000, http://localhost:3001
  - Credentials enabled
  - All HTTP methods allowed
  - Configurable headers
  
- **Input Validation**:
  - Pydantic models for request validation
  - Type checking
  - Required field enforcement
  - Email validation with email-validator
  - SQL injection prevention (MongoDB + validation)
  
- **Rate Limiting** (planned):
  - Requests per minute limit
  - IP-based throttling
  - User-based quotas

### 4. File Upload Security
- **File Type Validation**:
  - Whitelist of allowed extensions
  - MIME type checking
  - File size limits (configurable)
  
- **Secure Storage**:
  - Files saved with timestamp prefix
  - Random filename generation (planned)
  - Separate directories per feature
  - Access control per file
  
- **Path Traversal Prevention**:
  - No ../ in filenames
  - Sanitized paths
  - Restricted to uploads directory

### 5. GitHub Token Security
- **Encryption**:
  - Fernet symmetric encryption (cryptography library)
  - 256-bit keys
  - Tokens encrypted before storage
  - Decrypted only when needed
  
- **Key Management**:
  - Encryption key in environment variable
  - Fallback to FIXED_ENCRYPTION_KEY for development
  - Key rotation support (planned)

### 6. Database Security
- **MongoDB Atlas**:
  - Connection with authentication
  - Encrypted connections (TLS)
  - IP whitelist (optional)
  - Database user permissions
  
- **Query Security**:
  - No raw query execution
  - Parameterized queries via PyMongo
  - ObjectId validation
  - NoSQL injection prevention

### 7. Error Handling
- **Secure Error Messages**:
  - No sensitive data in error responses
  - Stack traces hidden in production
  - Generic error messages for attacks
  - Detailed logs server-side only
  
- **HTTP Exception Handling**:
  - Custom exception handlers
  - Consistent error format
  - Appropriate status codes
  - Request path logging

### 8. Environment Variables
- **Secrets Management**:
  - All secrets in .env files
  - .env files in .gitignore
  - Never hardcode credentials
  
- **Environment Variables**:
  ```bash
  # Backend .env
  MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE
  JWT_SECRET=your-generated-secret-key-use-openssl-rand
  AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
  AZURE_OPENAI_KEY=YOUR_AZURE_OPENAI_KEY
  AZURE_FLUX_ENDPOINT=https://YOUR_FLUX_ENDPOINT.azure.com/
  AZURE_FLUX_KEY=YOUR_FLUX_KEY
  GITHUB_TOKEN=YOUR_GITHUB_PAT
  ENCRYPTION_KEY=YOUR_BASE64_ENCRYPTION_KEY
  ```

---

## Database Structure (MongoDB Collections)

### 1. **users** Collection
**Purpose**: Store user accounts and authentication

**Schema**:
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (bcrypt hashed),
  name: String,
  role: String,  // super_admin, admin, manager, team_member, viewer
  token_version: Number,  // For forced logout
  clerk_user_id: String | null,  // Clerk authentication
  created_at: DateTime,
  updated_at: DateTime
}
```

**Indexes**: email (unique), role

---

### 2. **projects** Collection
**Purpose**: Store projects and team assignments

**Schema**:
```javascript
{
  _id: ObjectId,
  name: String,
  prefix: String,  // e.g., "DT" for "DOIT" project
  description: String,
  user_id: String,  // Owner/creator
  members: [
    {
      user_id: String,
      name: String,
      email: String,
      role: String,
      added_at: DateTime
    }
  ],
  git_repo_url: String | null,  // GitHub repository URL
  github_token: String | null,  // Encrypted GitHub PAT
  created_at: DateTime,
  updated_at: DateTime
}
```

**Indexes**: user_id, members.user_id, prefix

---

### 3. **tasks** Collection
**Purpose**: Store all tasks/issues

**Schema**:
```javascript
{
  _id: ObjectId,
  ticket_id: String (unique, indexed),  // e.g., "DT-001"
  issue_type: String,  // bug, task, story, epic
  title: String,
  description: String,
  project_id: String (indexed),
  sprint_id: String | null,
  priority: String,  // Low, Medium, High, Critical
  status: String,  // To Do, In Progress, In Review, Done, Blocked
  assignee_id: String | null,
  assignee_name: String,
  assignee_email: String,
  due_date: String | null,  // ISO date
  created_by: String,
  labels: [String],
  attachments: [
    {
      name: String,
      url: String,
      added_by: String,
      added_at: DateTime
    }
  ],
  links: [
    {
      type: String,  // blocks, depends_on, relates_to
      linked_task_id: String,
      linked_ticket_id: String
    }
  ],
  activities: [
    {
      user_id: String,
      user_name: String,
      action: String,
      comment: String,
      old_value: String | null,
      new_value: String | null,
      timestamp: String
    }
  ],
  in_backlog: Boolean,  // Moved to backlog from sprint
  moved_to_backlog_at: DateTime | null,
  created_at: DateTime,
  updated_at: DateTime
}
```

**Indexes**: ticket_id (unique), project_id, sprint_id, assignee_id, status

---

### 4. **sprints** Collection
**Purpose**: Store sprint information

**Schema**:
```javascript
{
  _id: ObjectId,
  name: String,
  project_id: String (indexed),
  start_date: String,  // ISO date
  end_date: String,    // ISO date
  goal: String,
  status: String,  // planning, active, completed, cancelled
  created_by: String,
  created_at: DateTime,
  updated_at: DateTime
}
```

**Indexes**: project_id, status

---

### 5. **ai_conversations** Collection
**Purpose**: Store AI chat conversations

**Schema**:
```javascript
{
  _id: ObjectId,
  user_id: String (indexed),
  title: String,
  created_at: DateTime,
  updated_at: DateTime
}
```

**Indexes**: user_id

---

### 6. **ai_messages** Collection
**Purpose**: Store individual AI messages

**Schema**:
```javascript
{
  _id: ObjectId,
  conversation_id: String (indexed),
  role: String,  // user, assistant
  content: String,
  attachments: [
    {
      name: String,
      url: String,
      type: String
    }
  ],
  image_url: String | null,  // For generated images
  tokens: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  timestamp: DateTime
}
```

**Indexes**: conversation_id, timestamp

---

### 7. **channels** Collection
**Purpose**: Team chat channels

**Schema**:
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  type: String,  // general, project
  project_id: String | null,
  created_by: String,
  created_at: DateTime
}
```

**Indexes**: project_id, type

---

### 8. **messages** Collection
**Purpose**: Team chat messages

**Schema**:
```javascript
{
  _id: ObjectId,
  channel_id: String (indexed),
  user_id: String,
  user_name: String,
  content: String,
  attachments: [
    {
      filename: String,
      url: String
    }
  ],
  timestamp: DateTime
}
```

**Indexes**: channel_id, timestamp

---

### 9. **profiles** Collection
**Purpose**: Extended user profile information

**Schema**:
```javascript
{
  _id: ObjectId,
  user_id: String (unique, indexed),
  bio: String,
  profile_picture: String | null,
  education: [
    {
      degree: String,
      institution: String,
      year: String
    }
  ],
  certifications: [
    {
      name: String,
      issuer: String,
      date: String
    }
  ],
  organization: {
    name: String,
    position: String,
    department: String
  },
  created_at: DateTime,
  updated_at: DateTime
}
```

**Indexes**: user_id (unique)

---

### 10. **git_branches** Collection
**Purpose**: Track GitHub branches linked to tasks

**Schema**:
```javascript
{
  _id: ObjectId,
  task_id: String (indexed),
  project_id: String,
  branch_name: String,
  repo_url: String,
  status: String,  // active, merged, deleted
  created_at: DateTime
}
```

**Indexes**: task_id, project_id, branch_name

---

### 11. **git_commits** Collection
**Purpose**: Track GitHub commits linked to tasks

**Schema**:
```javascript
{
  _id: ObjectId,
  task_id: String (indexed),
  project_id: String,
  sha: String (unique),
  message: String,
  author: String,
  author_email: String,
  committed_at: DateTime,
  repo_url: String,
  created_at: DateTime
}
```

**Indexes**: task_id, project_id, sha (unique)

---

### 12. **git_pull_requests** Collection
**Purpose**: Track GitHub pull requests linked to tasks

**Schema**:
```javascript
{
  _id: ObjectId,
  task_id: String (indexed),
  project_id: String,
  pr_number: Number,
  title: String,
  description: String,
  status: String,  // open, closed, merged
  author: String,
  repo_url: String,
  html_url: String,
  created_at: DateTime,
  updated_at: DateTime
}
```

**Indexes**: task_id, project_id, pr_number

## API Documentation (Comprehensive)

### API Base URL
- Development: `http://localhost:8000`
- API Prefix: `/api`
- Full endpoint: `http://localhost:8000/api/<route>`

### Authentication
All endpoints (except auth endpoints) require:
```
Headers:
  Authorization: Bearer <JWT_TOKEN>
  X-Tab-Session-Key: <TAB_SESSION_KEY>
```

### Response Format
**Success Response**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

### API Endpoints by Feature

#### Authentication (`/api/auth`)
- **POST** `/api/auth/register` - Register new user
  - Body: `{ email, password, name, role }`
  - Returns: User object + JWT token
  
- **POST** `/api/auth/login` - User login
  - Body: `{ email, password }`
  - Returns: JWT token, tab_session_key, user info
  
- **GET** `/api/auth/profile` - Get current user profile
  - Headers: Authorization required
  - Returns: User profile with role

- **PUT** `/api/auth/change-password` - Change password
  - Body: `{ old_password, new_password }`
  - Returns: Success message

#### Users (`/api/users`)
- **GET** `/api/users` - Get all users (Admin+)
  - Query: `?role=admin` (optional filter)
  - Returns: Array of users (password excluded)
  
- **POST** `/api/users` - Create new user (Admin+)
  - Body: `{ email, password, name, role }`
  - Returns: Created user
  
- **GET** `/api/users/{id}` - Get user by ID
  - Returns: User details
  
- **PUT** `/api/users/{id}` - Update user (Admin+)
  - Body: `{ name, email, role }`
  - Returns: Updated user
  
- **DELETE** `/api/users/{id}` - Delete user (Super Admin only)
  - Returns: Success message

#### Projects (`/api/projects`)
- **GET** `/api/projects` - Get user's projects
  - Returns: Projects owned or member of
  
- **GET** `/api/projects/all` - Get all projects (Admin+)
  - Returns: All projects in system
  
- **POST** `/api/projects` - Create project
  - Body: `{ name, description }`
  - Returns: Created project with auto-generated prefix
  
- **GET** `/api/projects/{id}` - Get project details
  - Returns: Project with members array
  
- **PUT** `/api/projects/{id}` - Update project
  - Body: `{ name, description, git_repo_url }`
  - Returns: Updated project
  
- **DELETE** `/api/projects/{id}` - Delete project (Owner/Admin)
  - Returns: Success message

#### Project Members (`/api/projects/{id}/members`)
- **GET** `/api/projects/{id}/members` - Get project members
  - Returns: Array of members
  
- **POST** `/api/projects/{id}/members` - Add member
  - Body: `{ user_id }`
  - Returns: Updated project
  
- **DELETE** `/api/projects/{id}/members/{user_id}` - Remove member
  - Returns: Success message

#### Tasks (`/api/tasks`)
- **GET** `/api/tasks` - Get all tasks
  - Query: `?project_id=xxx&sprint_id=xxx&assignee_id=xxx&status=xxx`
  - Returns: Filtered tasks array
  
- **POST** `/api/tasks` - Create task
  - Body: `{ title, description, project_id, priority, assignee_id, due_date }`
  - Returns: Created task with auto-generated ticket_id
  
- **GET** `/api/tasks/{id}` - Get task details
  - Returns: Full task with activities
  
- **GET** `/api/tasks/ticket/{ticket_id}` - Get task by ticket ID
  - Example: `/api/tasks/ticket/DT-001`
  - Returns: Task object
  
- **PUT** `/api/tasks/{id}` - Update task
  - Body: `{ title, description, status, priority, assignee_id }`
  - Returns: Updated task
  
- **DELETE** `/api/tasks/{id}` - Delete task
  - Returns: Success message
  
- **POST** `/api/tasks/{id}/comment` - Add comment
  - Body: `{ comment }`
  - Returns: Updated task with new activity
  
- **POST** `/api/tasks/{id}/upload` - Upload attachment
  - Form-data: `file`
  - Returns: Updated task with attachment
  
- **GET** `/api/tasks/{id}/git-activity` - Get GitHub activity
  - Returns: Branches, commits, PRs for task

#### Sprints (`/api/sprints`)
- **GET** `/api/sprints` - Get sprints by project
  - Query: `?project_id=xxx`
  - Returns: Array of sprints
  
- **POST** `/api/sprints` - Create sprint
  - Body: `{ name, project_id, start_date, end_date, goal }`
  - Returns: Created sprint
  
- **GET** `/api/sprints/{id}` - Get sprint details
  - Returns: Sprint with task count
  
- **PUT** `/api/sprints/{id}` - Update sprint
  - Body: `{ name, start_date, end_date, goal, status }`
  - Returns: Updated sprint
  
- **DELETE** `/api/sprints/{id}` - Delete sprint
  - Returns: Success message
  
- **POST** `/api/sprints/{id}/add-task` - Add task to sprint
  - Body: `{ task_id }`
  - Returns: Updated task
  
- **POST** `/api/sprints/{id}/remove-task` - Remove task from sprint
  - Body: `{ task_id }`
  - Returns: Updated task

#### Dashboard (`/api/dashboard`)
- **GET** `/api/dashboard/stats` - User dashboard stats
  - Returns: Task counts, project counts, recent tasks
  
- **GET** `/api/dashboard/project-progress` - Project progress
  - Query: `?project_id=xxx`
  - Returns: Completion percentage, task distribution
  
- **GET** `/api/dashboard/sprint-velocity` - Sprint velocity
  - Query: `?project_id=xxx`
  - Returns: Story points per sprint

#### System Dashboard (`/api/dashboard/system`) (Super Admin)
- **GET** `/api/dashboard/system/stats` - System statistics
  - Returns: Total users, projects, tasks, activity trends
  
- **GET** `/api/dashboard/system/user-analytics` - User analytics
  - Returns: Registration trends, role distribution
  
- **GET** `/api/dashboard/system/export` - Export system data
  - Query: `?format=pdf|excel|csv`
  - Returns: File download

#### AI Assistant (`/api/ai-assistant`)
- **GET** `/api/ai-assistant/conversations` - Get user conversations
  - Returns: Array of conversations
  
- **POST** `/api/ai-assistant/conversations` - Create conversation
  - Body: `{ title }`
  - Returns: Created conversation
  
- **GET** `/api/ai-assistant/conversations/{id}/messages` - Get messages
  - Returns: Array of messages
  
- **POST** `/api/ai-assistant/conversations/{id}/messages` - Send message
  - Body: `{ content, stream }`
  - Returns: AI response with tokens
  
- **POST** `/api/ai-assistant/conversations/{id}/generate-image` - Generate image
  - Body: `{ prompt }`
  - Returns: Image URL
  
- **POST** `/api/ai-assistant/conversations/{id}/upload` - Upload file
  - Form-data: `file`
  - Returns: Extracted content, file info
  
- **DELETE** `/api/ai-assistant/conversations/{id}` - Delete conversation
  - Returns: Success message

#### Team Chat (`/api/team-chat`)
- **GET** `/api/team-chat/channels` - Get channels
  - Query: `?project_id=xxx`
  - Returns: Array of channels
  
- **GET** `/api/team-chat/channels/{id}/messages` - Get messages
  - Returns: Array of messages
  
- **POST** `/api/team-chat/channels/{id}/messages` - Send message
  - Body: `{ content }`
  - Form-data: `file` (optional)
  - Returns: Created message

#### GitHub Integration (`/api/github`)
- **POST** `/api/github/webhook` - GitHub webhook receiver
  - Headers: `X-GitHub-Event: push|create|pull_request`
  - Body: GitHub webhook payload
  - Returns: Processing status
  
- **POST** `/api/github/link-repo` - Link repo to project
  - Body: `{ project_id, repo_url, token }`
  - Returns: Updated project
  
- **POST** `/api/github/add-collaborator` - Add collaborator
  - Body: `{ project_id, username, permission }`
  - Returns: Invitation status

### WebSocket Endpoints

#### Kanban Board WebSocket
```
ws://localhost:8000/ws/kanban/{project_id}
```

**Events**:
- `task_moved`: Task status changed
- `task_created`: New task added
- `task_updated`: Task details changed
- `task_deleted`: Task removed

**Message Format**:
```json
{
  "type": "task_moved",
  "task_id": "xxx",
  "old_status": "To Do",
  "new_status": "In Progress",
  "timestamp": "2026-02-12T10:30:00Z"
}
```

---

## Development Setup (Detailed)

### Prerequisites
- **Python**: 3.9 or higher
- **Node.js**: 14.x or higher
- **npm**: 6.x or higher
- **MongoDB**: Atlas account (cloud) or local instance
- **Git**: For version control
- **Code Editor**: VS Code recommended

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend-2
   ```

2. **Create virtual environment** (recommended):
   ```bash
   python -m venv venv
   
   # Activate (Windows)
   venv\Scripts\activate
   
   # Activate (Mac/Linux)
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Create .env file**:
   ```bash
   # Copy from .env.example
   cp .env.example .env
   
   # Edit .env with your values
   ```

5. **Environment variables** (.env):
   ```bash
   # MongoDB
   MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE
   
   # JWT Secret (generate with: openssl rand -base64 32)
   JWT_SECRET=YOUR_GENERATED_JWT_SECRET_KEY
   
   # Azure OpenAI (GPT-5.2-chat)
   AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
   AZURE_OPENAI_KEY=YOUR_AZURE_OPENAI_KEY
   AZURE_OPENAI_DEPLOYMENT=gpt-52-chat
   AZURE_OPENAI_API_VERSION=2024-02-01
   
   # Azure AI Foundry (FLUX-1.1-pro)
   AZURE_FLUX_ENDPOINT=https://YOUR_FLUX_ENDPOINT.azure.com/
   AZURE_FLUX_KEY=YOUR_FLUX_KEY
   AZURE_FLUX_MODEL=FLUX-1.1-pro
   
   # GitHub (Personal Access Token)
   GITHUB_TOKEN=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
   
   # Encryption (for GitHub tokens - generate with: openssl rand -base64 32)
   ENCRYPTION_KEY=YOUR_BASE64_ENCRYPTION_KEY
   
   # Super Admin (created on startup - USE STRONG CREDENTIALS!)
   SADMIN_EMAIL=YOUR_ADMIN_EMAIL
   SADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD
   ```

6. **Run backend server**:
   ```bash
   python main.py
   ```
   
   Server will start on: http://localhost:8000
   API docs: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create .env file**:
   ```bash
   # Copy from .env.example
   cp .env.example .env
   
   # Edit .env
   ```

4. **Environment variables** (.env):
   ```bash
   REACT_APP_API_URL=http://localhost:8000
   REACT_APP_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
   REACT_APP_GITHUB_TOKEN=YOUR_GITHUB_TOKEN_IF_NEEDED
   ```

5. **Run frontend development server**:
   ```bash
   npm start
   ```
   
   App will open: http://localhost:3000

### Database Initialization

**Auto-Initialization** (on first backend startup):
- Super Admin user created
- Default channels created (General)
- Database collections created
- Indexes applied

**Manual Database Setup** (if needed):
```bash
cd backend-2
python init_db.py
```

### GitHub Webhook Setup

1. **Expose local server** (for development):
   ```bash
   # Using ngrok
   ngrok http 8000
   ```

2. **Add webhook in GitHub**:
   - Go to Repository → Settings → Webhooks
   - Payload URL: `https://your-ngrok-url.ngrok.io/api/github/webhook`
   - Content type: `application/json`
   - Events: `push`, `create`, `pull_request`, `delete`

3. **Test webhook**:
   - Make a commit with ticket ID in message
   - Check backend logs for webhook event

---

## Deployment Considerations

### Backend Deployment

**Platforms**:
- AWS EC2, ECS, Lambda
- Azure App Service, Azure Functions
- Google Cloud Run, Compute Engine
- Heroku, DigitalOcean App Platform
- Render, Railway

**Requirements**:
- Python 3.9+ runtime
- Environment variables configured
- MongoDB Atlas connection (already cloud)
- HTTPS enabled
- Domain with SSL certificate

**Production Changes**:
```python
# main.py
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable in production
        workers=4,     # Multiple workers
        log_level="warning"
    )
```

**CORS Update**:
```python
allow_origins=["https://yourdomain.com"]  # Production frontend URL
```

### Frontend Deployment

**Platforms**:
- Vercel (recommended for React)
- Netlify
- AWS S3 + CloudFront
- Azure Static Web Apps
- GitHub Pages

**Build Command**:
```bash
npm run build
```

**Deployment Steps** (Vercel):
1. Connect GitHub repo
2. Set environment variables
3. Deploy
4. Custom domain (optional)

### Environment Variables (Production)

**Backend** (.env):
```bash
MONGO_URI=YOUR_PRODUCTION_MONGO_URI
JWT_SECRET=YOUR_GENERATED_256BIT_SECRET
AZURE_OPENAI_ENDPOINT=https://YOUR_PRODUCTION_RESOURCE.openai.azure.com/
AZURE_OPENAI_KEY=YOUR_PRODUCTION_KEY
# ... all other production keys with secure values
```

**Frontend** (.env.production):
```bash
REACT_APP_API_URL=https://api.yourdomain.com
```

### Security Checklist for Production
- [ ] Change super admin password
- [ ] Use strong JWT secret (256-bit random)
- [ ] Enable HTTPS only
- [ ] Update CORS to specific domains
- [ ] Remove console.log statements
- [ ] Enable rate limiting
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Configure backups
- [ ] Use environment-specific configs
- [ ] Enable MongoDB IP whitelist

---

## Recent Updates & Changelog

### Version 1.0.0 (February 2026)

**Major Features**:
- ✅ AI Assistant with GPT-5.2-chat integration
- ✅ FLUX-1.1-pro image generation
- ✅ File upload with content extraction (PDF, CSV, Word, JSON, Text)
- ✅ GitHub integration with webhooks
- ✅ Real-time Kanban board with WebSockets
- ✅ Comprehensive data visualization
- ✅ Sprint planning and management
- ✅ Team chat with file sharing

**Bug Fixes**:
- Fixed GPT-5.2-chat temperature parameter issue (now uses default 1.0)
- Fixed file upload not extracting content for AI analysis
- Fixed chat history not loading when switching conversations
- Fixed null conversation error in message sending

**Performance**:
- Added request caching for frontend
- Optimized database queries with proper indexing
- WebSocket connection pooling
- Async/await for all I/O operations

---

## Future Roadmap

### Short-term (Next 3 months)
- [ ] Mobile app (React Native)
- [ ] Advanced AI analytics
- [ ] Gantt chart visualization
- [ ] Email notifications
- [ ] Slack integration
- [ ] Advanced reporting
- [ ] Custom dashboard widgets

### Mid-term (Next 6 months)
- [ ] Multi-language support (i18n)
- [ ] Voice commands for AI
- [ ] Automated testing suite (pytest, Jest)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] API rate limiting
- [ ] Notification center

### Long-term (Next year)
- [ ] Jira/Trello import
- [ ] Microsoft Teams integration
- [ ] GitLab/Bitbucket support
- [ ] Time tracking improvements
- [ ] Resource management
- [ ] Budget tracking
- [ ] Custom workflows
- [ ] White-labeling options
- [ ] Enterprise SSO (SAML, LDAP)
- [ ] Advanced analytics with ML

---

## Known Issues & Limitations

### AI Limitations
- **GPT-5.2-chat**: Only supports temperature=1.0 (cannot adjust creativity)
- **FLUX Image Generation**: Only generates 1 image at a time (n=1 limitation)
- **File Analysis**: 
  - PDF extraction limited to first 20 pages
  - CSV parsing limited to first 50 rows
  - Large files may timeout

### Feature Limitations
- No mobile native app yet
- No multi-language support
- No email notifications
- No Gantt chart view
- WebSocket reconnection requires page refresh (planned: auto-reconnect)

### Browser Compatibility
- Best on Chrome, Firefox, Edge (latest versions)
- Safari has minor CSS issues (in progress)
- IE not supported

---

## Support & Contact

### Documentation
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Knowledge Base: `/agent_knowledge` folder

### Development Team
- **Project**: DOIT v1.0.0
- **License**: Proprietary
- **Created**: 2026
- **Technology Stack**: FastAPI + React + MongoDB + Azure AI

### Getting Help
1. Check API documentation
2. Review knowledge base files
3. Check GitHub issues (if applicable)
4. Contact system administrator

---

## Tech Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend Framework | FastAPI | 0.115.0+ |
| Frontend Framework | React | 19.2.3 |
| Database | MongoDB Atlas | 4.4+ |
| AI Chat | Azure OpenAI GPT-5.2-chat | Latest |
| AI Image | Azure FLUX-1.1-pro | Latest |
| Authentication | JWT + Bcrypt | - |
| Real-time | WebSocket | - |
| Charts | Recharts | 3.6.0 |
| Drag-Drop | @dnd-kit | 6.3.1+ |
| Calendar | react-big-calendar | 1.19.4 |
| Icons | React Icons | 5.5.0 |
| HTTP Server | Uvicorn | 0.30.0+ |
| File Processing | PyPDF2, python-docx | Latest |
| GitHub | GitHub API v3 | - |

---

## Project Statistics
- **Total Lines of Code**: ~50,000+
- **Backend Files**: 60+
- **Frontend Components**: 40+
- **API Endpoints**: 80+
- **Database Collections**: 12
- **Features**: 10 major features
- **User Roles**: 5 levels
- **Supported File Types**: 6 (PDF, CSV, Word, Text, JSON, MD)
