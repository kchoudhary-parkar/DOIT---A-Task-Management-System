# DOIT Project - Backend Architecture

## Technology Stack

### Core Framework
- **FastAPI** `>=0.115.0` - Modern, fast Python web framework with automatic OpenAPI documentation
- **Python** `3.9+` - Programming language with type hints support
- **Uvicorn** `>=0.30.0` - Lightning-fast ASGI server with auto-reload
- **Pydantic** `>=2.9.0` - Data validation and settings management using Python type hints

**Core Dependencies:**
```python
# requirements.txt extracts
fastapi>=0.115.0
uvicorn[standard]>=0.30.0  # [standard] includes websockets, httptools, uvloop
pydantic>=2.9.0
pydantic-settings==2.7.1
python-dotenv>=1.0.1
python-multipart  # For file uploads
```

### Database
- **MongoDB** - NoSQL document database for flexible data storage
- **PyMongo** `>=4.8.0` - Official MongoDB driver for Python
- **MongoDB Atlas** - Cloud-hosted database cluster with automatic backups

**Database Dependencies:**
```python
pymongo>=4.8.0  # MongoDB driver with connection pooling
```

**Supported Collections:**
- `users` - User accounts with authentication data
- `projects` - Project definitions with members
- `tasks` - Task/issue tracking with ticket IDs
- `sprints` - Sprint planning and management
- `datasets` - Uploaded datasets for visualization
- `dataset_files` - File metadata for datasets
- `visualizations` - Generated chart configurations
- `channels` - Team chat channels
- `messages` - Chat message history
- `ai_conversations` - AI assistant chat history
- `ai_messages` - Individual AI chat messages

### Authentication & Security
- **python-jose[cryptography]** `>=3.3.0` - JWT token creation/validation with cryptographic signing
- **passlib[bcrypt]** `>=1.7.4` - Password hashing library with bcrypt support
- **bcrypt** `>=4.2.0` - Secure password hashing algorithm (resistant to rainbow tables)
- **PyJWT** `>=2.9.0` - Alternative JWT implementation for flexibility

**Security Dependencies:**
```python
python-jose[cryptography]>=3.3.0  # JWT with RSA/ECDSA support
passlib[bcrypt]>=1.7.4  # Password hashing
bcrypt>=4.2.0  # Bcrypt algorithm
PyJWT>=2.9.0  # JWT encode/decode
email-validator  # Email validation
```

**Advanced Security Features:**
- Single session enforcement (auto-logout previous sessions)
- Device fingerprinting (binds tokens to IP + User-Agent)
- Tab-specific session keys (prevents token sharing across tabs)
- Token versioning (allows mass token invalidation)
- Token blacklisting support
- Session tracking in database
- 24-hour token expiry with refresh mechanism

### AI Integration
- **OpenAI SDK** `>=1.12.0` - Azure OpenAI integration for GPT-5.2-chat deployment
- **Anthropic** `>=0.34.0` - Claude AI integration for advanced reasoning
- **Google Gemini API** - Google's multimodal AI capabilities
- **Requests** `>=2.32.0` - HTTP library for FLUX-1.1-pro image generation API

**AI Dependencies:**
```python
anthropic>=0.34.0  # Claude AI SDK
openai>=1.12.0  # Azure OpenAI SDK (GPT-5.2-chat)
requests>=2.32.0  # For FLUX-1.1-pro API calls
google-generativeai  # Google Gemini API
```

**AI Models Used:**
- **GPT-5.2-chat** (Azure OpenAI) - Primary AI assistant for code analysis, task suggestions
- **FLUX-1.1-pro** (Azure AI) - High-quality image generation from text prompts
- **Claude** (Anthropic) - Alternative AI reasoning engine
- **Gemini** (Google) - Multimodal AI for vision + text tasks

### File Processing & Data Parsing
- **PyPDF2** `>=3.0.0` - PDF text extraction for document analysis
- **python-docx** `>=1.1.0` - Word document (.docx) parsing
- **CSV module** (built-in) - CSV file parsing for dataset uploads
- **JSON module** (built-in) - JSON data handling

**File Processing Dependencies:**
```python
PyPDF2>=3.0.0  # PDF text extraction
python-docx>=1.1.0  # Word document processing
```

**Supported File Formats:**
- PDF (`.pdf`) - Text extraction for AI analysis
- Word (`.docx`) - Document content parsing
- CSV (`.csv`) - Dataset uploads for visualization
- JSON (`.json`) - API payloads and data exchange
- Images (`.png`, `.jpg`, `.jpeg`) - File attachments and AI-generated images

### Development Tools
- **pytest** - Testing framework
- **black** - Code formatter
- **flake8** - Linting tool
- **mypy** - Static type checker

**Development Dependencies:**
```python
pytest  # Unit and integration testing
pytest-asyncio  # Async test support
httpx  # Async HTTP client for testing
black  # Code formatting
flake8  # Linting
mypy  # Type checking
```

---

## Project Structure

```
backend-2/
├── main.py                 # Application entry point
├── config.py               # Configuration settings
├── database.py             # Database connection
├── dependencies.py         # Shared dependencies (auth)
├── init_db.py             # Database initialization
├── requirements.txt        # Python dependencies
├── schemas.py             # Pydantic schemas
├── .env                    # Environment variables
│
├── controllers/           # Business logic layer
│   ├── __init__.py
│   ├── auth_controller.py
│   ├── project_controller.py
│   ├── task_controller.py
│   ├── sprint_controller.py
│   ├── user_controller.py
│   ├── member_controller.py
│   ├── profile_controller.py
│   ├── dashboard_controller.py
│   ├── data_viz_controller.py
│   ├── system_dashboard_controller.py
│   ├── team_chat_controller.py
│   ├── chat_controller.py
│   ├── git_controller.py
│   └── ai_assistant_controller.py
│
├── models/                # Database models
│   ├── user.py
│   ├── project.py
│   ├── task.py
│   ├── sprint.py
│   ├── profile.py
│   ├── git_activity.py
│   └── ai_conversation.py
│
├── routers/               # API route definitions
│   ├── __init__.py
│   ├── auth_router.py
│   ├── user_router.py
│   ├── project_router.py
│   ├── task_router.py
│   ├── sprint_router.py
│   ├── member_router.py
│   ├── profile_router.py
│   ├── dashboard_router.py
│   ├── data_viz_router.py
│   ├── system_dashboard_router.py
│   ├── team_chat_router.py
│   ├── chat_router.py
│   └── ai_assistant_router.py
│
├── middleware/            # Custom middleware
│   └── role_middleware.py
│
├── utils/                 # Utility functions
│   ├── auth_utils.py
│   ├── response.py
│   ├── validators.py
│   ├── router_helpers.py
│   ├── github_utils.py
│   ├── label_utils.py
│   ├── ticket_utils.py
│   ├── azure_ai_utils.py
│   ├── file_parser.py
│   └── websocket_manager.py
│
└── uploads/               # Uploaded files storage
    ├── chat_attachments/
    ├── ai_attachments/
    └── ai_images/
```

---

## Core Application (main.py)

### Complete Application Setup

**Full main.py Implementation:**
```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import traceback

# Router imports
from routers import (
    auth_router,
    project_router,
    task_router,
    sprint_router,
    dashboard_router,
    profile_router,
    user_router,
    chat_router,
    member_router,
    system_dashboard_router,
    team_chat_router,
    data_viz_router,
)

# Utility imports
from init_db import initialize_super_admin, initialize_default_channels


# Lifespan Context Manager (Startup/Shutdown Events)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager - runs code on startup and shutdown
    
    Startup:
    - Initialize super admin account if not exists
    - Create default team chat channels
    
    Shutdown:
    - Close database connections (handled by PyMongo automatically)
    """
    print("🚀 [STARTUP] Initializing application...")
    try:
        # Initialize super admin account
        initialize_super_admin()
        print("✅ [STARTUP] Super admin initialized")
        
        # Initialize default channels for team chat
        initialize_default_channels()
        print("✅ [STARTUP] Default channels created")
        
        print("✅ [STARTUP] Application ready!")
    except Exception as e:
        print(f"❌ [STARTUP ERROR] {str(e)}")
        print(traceback.format_exc())
    
    yield  # Application runs here
    
    print("🛑 [SHUTDOWN] Closing application...")


# FastAPI Application Instance
app = FastAPI(
    title="DOIT Task Management API",
    description="Comprehensive project management system with AI integration",
    version="1.0.0",
    docs_url="/api/docs",  # Swagger UI at /api/docs
    redoc_url="/api/redoc",  # ReDoc at /api/redoc
    lifespan=lifespan  # Register lifespan events
)


# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React development server
        "http://localhost:3001",  # Alternative port
        "*"  # Allow all origins (remove in production)
    ],
    allow_credentials=True,  # Allow cookies/auth headers
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)


# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Log all incoming requests and outgoing responses
    Useful for debugging and monitoring
    """
    print(f"📥 [REQUEST] {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        print(f"📤 [RESPONSE] {request.method} {request.url.path} - Status: {response.status_code}")
        return response
    except Exception as e:
        print(f"❌ [MIDDLEWARE ERROR] {request.method} {request.url.path}")
        print(f"   Error: {str(e)}")
        raise


# Global Exception Handlers

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle FastAPI HTTP exceptions with consistent format"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "path": str(request.url.path),
            "method": request.method
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler for unexpected errors"""
    print(f"❌ [UNHANDLED EXCEPTION] {request.method} {request.url.path}")
    print(f"   Error: {str(exc)}")
    print(traceback.format_exc())
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "details": str(exc),
            "path": str(request.url.path),
            "method": request.method
        }
    )


# Router Registration (API Endpoints)

# Authentication routes (login, register, logout, refresh)
app.include_router(auth_router.router, prefix="/api/auth", tags=["Authentication"])

# Project management routes (CRUD operations)
app.include_router(project_router.router, prefix="/api/projects", tags=["Projects"])

# Task/issue tracking routes (Kanban board, task CRUD)
app.include_router(task_router.router, prefix="/api/tasks", tags=["Tasks"])

# Sprint planning routes (sprint CRUD, backlog management)
app.include_router(sprint_router.router, prefix="/api/sprints", tags=["Sprints"])

# Dashboard routes (project metrics, task statistics)
app.include_router(dashboard_router.router, prefix="/api/dashboard", tags=["Dashboard"])

# User profile routes (profile update, avatar upload)
app.include_router(profile_router.router, prefix="/api/profile", tags=["Profile"])

# User management routes (list users, admin operations)
app.include_router(user_router.router, prefix="/api/users", tags=["Users"])

# AI chatbot routes (AI assistant, code analysis)
app.include_router(chat_router.router, prefix="/api/chat", tags=["AI Chat"])

# Member management routes (add/remove members, role assignment)
app.include_router(member_router.router, prefix="/api/members", tags=["Members"])

# System dashboard routes (super admin analytics)
app.include_router(system_dashboard_router.router, prefix="/api/system-dashboard", tags=["System Admin"])

# Team chat routes (channels, messages, WebSocket)
app.include_router(team_chat_router.router, prefix="/api/team-chat", tags=["Team Chat"])

# Data visualization routes (dataset upload, chart generation)
app.include_router(data_viz_router.router, prefix="/api/data-viz", tags=["Data Visualization"])


# Static File Serving (Uploads)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# Serves files at: http://localhost:8000/uploads/chat_attachments/file.pdf
# Serves files at: http://localhost:8000/uploads/ai_images/generated_image.png


# Root Endpoint (Health Check)
@app.get("/", tags=["Root"])
async def root():
    """API health check endpoint"""
    return {
        "success": True,
        "message": "DOIT Task Management API is running",
        "version": "1.0.0",
        "docs": "/api/docs",
        "redoc": "/api/redoc"
    }


# Development Server
if __name__ == "__main__":
    import uvicorn
    
    # Run with Uvicorn ASGI server
    uvicorn.run(
        "main:app",  # Import path to FastAPI app
        host="0.0.0.0",  # Listen on all network interfaces
        port=8000,  # Port number
        reload=True,  # Auto-reload on code changes (dev only)
        log_level="info"  # Logging verbosity
    )
    
    # Production command (without reload):
    # uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Key Features:**
1. **Lifespan Events**: Initialization code runs before accepting requests
2. **CORS**: Configured for React frontend at localhost:3000
3. **Middleware**: Request/response logging for all endpoints
4. **Exception Handlers**: Consistent error responses across the API
5. **13 Routers**: Modular API endpoints grouped by feature
6. **Static Files**: Uploads directory served at `/uploads`
7. **Auto-reload**: Development mode with hot-reload on code changes
8. **OpenAPI Docs**: Automatic Swagger UI at `/api/docs`

---

## Database Connection (database.py)

### Complete MongoDB Configuration

**Full database.py Implementation:**
```python
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# MongoDB Atlas Cloud Connection String
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/taskdb?retryWrites=true&w=majority&appName=YOUR_APP_NAME"
)

# Initialize MongoDB Client
client = MongoClient(MONGO_URI)

# Database Instance (taskdb)
db = client["taskdb"]  # Explicitly specify database name

# Collection Definitions
# Core Collections
users = db["users"]  # User accounts with authentication
projects = db["projects"]  # Project definitions with members
tasks = db["tasks"]  # Task/issue tracking with tickets
sprints = db["sprints"]  # Sprint planning and management

# Data Visualization Collections
datasets = db["datasets"]  # Uploaded datasets for analysis
dataset_files = db["dataset_files"]  # File metadata for datasets
visualizations = db["visualizations"]  # Generated chart configurations

# Team Chat Collections  
channels = db["channels"]  # Chat channels per project
messages = db["messages"]  # Chat message history

# AI Assistant Collections
ai_conversations = db["ai_conversations"]  # AI chat sessions
ai_messages = db["ai_messages"]  # AI chat messages

# GitHub Integration Collections
git_activities = db["git_activities"]  # GitHub webhook events

# Backward Compatibility Aliases (for legacy code)
users_collection = users
projects_collection = projects
tasks_collection = tasks
sprints_collection = sprints
channels_collection = channels
messages_collection = messages


# Database Health Check Function
def check_db_connection():
    """
    Test database connectivity
    Returns True if connected, False otherwise
    """
    try:
        # Ping database to verify connection
        client.admin.command('ping')
        print("✅ MongoDB connection successful")
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {str(e)}")
        return False


# Collection Indexes (for performance)
def create_indexes():
    """
    Create database indexes for frequently queried fields
    Improves query performance significantly
    """
    # User indexes
    users.create_index("email", unique=True)  # Unique email constraint
    users.create_index("role")  # Fast role-based queries
    
    # Project indexes
    projects.create_index("name")
    projects.create_index("members.user_id")  # Fast member lookup
    projects.create_index("created_by")
    
    # Task indexes
    tasks.create_index("ticket_id", unique=True)  # Unique ticket IDs
    tasks.create_index("project_id")  # Fast project-based queries
    tasks.create_index("sprint_id")  # Fast sprint-based queries
    tasks.create_index("assignee_id")  # Fast user task lookup
    tasks.create_index("status")  # Fast status filtering
    tasks.create_index("priority")  # Fast priority sorting
    tasks.create_index([("project_id", 1), ("status", 1)])  # Composite index for Kanban
    
    # Sprint indexes
    sprints.create_index("project_id")
    sprints.create_index("status")
    sprints.create_index([("project_id", 1), ("status", 1)])  # Active sprint lookup
    
    # Chat indexes
    messages.create_index("channel_id")  # Fast channel message retrieval
    messages.create_index("timestamp")  # Chronological ordering
    messages.create_index([("channel_id", 1), ("timestamp", -1)])  # Latest messages first
    
    # AI indexes
    ai_conversations.create_index("user_id")
    ai_messages.create_index("conversation_id")
    
    print("✅ Database indexes created successfully")
```

### Collection Schemas

**Users Collection:**
```python
{
    "_id": ObjectId,  # MongoDB unique identifier
    "name": str,  # User's full name
    "email": str,  # Unique email address (indexed)
    "password": str,  # Bcrypt hashed password
    "role": str,  # "super-admin" | "admin" | "member"
    "avatar_url": str,  # Profile picture URL
    "github_token": str,  # Optional GitHub personal access token
    "created_at": datetime,  # Account creation timestamp
    "updated_at": datetime,  # Last profile update
    "sessions": [  # Active login sessions
        {
            "session_id": str,  # UUID v4 session identifier
            "token_id": str,  # SHA256 hash of JWT token
            "tab_session_key": str,  # UUID v4 tab identifier
            "device_fingerprint": str,  # SHA256(IP:User-Agent)
            "ip_address": str,  # User's IP address
            "user_agent": str,  # Browser user agent string
            "created_at": datetime,  # Session start time
            "expires_at": datetime,  # Session expiry (24h)
            "is_active": bool  # Active/revoked flag
        }
    ],
    "token_version": int  # Incremented to invalidate all tokens
}
```

**Projects Collection:**
```python
{
    "_id": ObjectId,
    "name": str,  # Project name
    "description": str,  # Project description
    "ticket_prefix": str,  # Ticket ID prefix (e.g., "DOIT")
    "created_by": str,  # User ID of creator
    "members": [  # Project team members
        {
            "user_id": str,  # MongoDB ObjectId as string
            "name": str,  # User's name
            "email": str,  # User's email
            "role": str,  # "admin" | "member"
            "joined_at": datetime  # When added to project
        }
    ],
    "created_at": datetime,
    "updated_at": datetime,
    "ticket_counter": int  # Auto-increment for ticket IDs
}
```

**Tasks Collection:**
```python
{
    "_id": ObjectId,
    "ticket_id": str,  # Unique ticket ID (e.g., "DOIT-123")
    "issue_type": str,  # "task" | "bug" | "story" | "epic"
    "title": str,  # Task title (min 3 chars)
    "description": str,  # Task description (supports Markdown)
    "project_id": str,  # MongoDB ObjectId as string
    "sprint_id": str,  # MongoDB ObjectId as string (null if backlog)
    "priority": str,  # "Low" | "Medium" | "High"
    "status": str,  # "To Do" | "In Progress" | "Testing" | "Dev Complete" | "Done"
    "assignee_id": str,  # User ID (null if unassigned)
    "assignee_name": str,  # User's name
    "assignee_email": str,  # User's email
    "due_date": str,  # ISO date string (YYYY-MM-DD)
    "created_by": str,  # User ID of creator
    "labels": [str],  # Custom labels (e.g., ["frontend", "urgent"])
    "attachments": [  # File attachments
        {
            "name": str,  # Display name
            "url": str,  # File URL
            "fileName": str,  # Original filename
            "fileType": str,  # MIME type
            "fileSize": int  # Size in bytes
        }
    ],
    "links": [  # Linked tasks/dependencies
        {
            "linked_task_id": str,  # Related task ObjectId
            "linked_ticket_id": str,  # Related ticket ID (e.g., "DOIT-124")
            "link_type": str  # "blocks" | "blocked_by" | "related"
        }
    ],
    "activities": [  # Activity log
        {
            "user_id": str,  # Who made the change
            "user_name": str,  # User's name
            "action": str,  # "created" | "updated" | "commented" | "status_changed"
            "comment": str,  # Optional comment text
            "old_value": str,  # Previous value (for updates)
            "new_value": str,  # New value (for updates)
            "timestamp": datetime  # When action occurred
        }
    ],
    "created_at": datetime,  # Task creation timestamp
    "updated_at": datetime  # Last modification timestamp
}
```

**Sprints Collection:**
```python
{
    "_id": ObjectId,
    "name": str,  # Sprint name (e.g., "Sprint 1")
    "project_id": str,  # MongoDB ObjectId as string
    "start_date": str,  # ISO date string
    "end_date": str,  # ISO date string
    "goal": str,  # Sprint goal/objective
    "status": str,  # "active" | "completed" | "planned"
    "velocity": int,  # Story points completed (computed)
    "created_by": str,  # User ID
    "created_at": datetime,
    "updated_at": datetime
}
```

**Channels Collection (Team Chat):**
```python
{
    "_id": ObjectId,
    "name": str,  # Channel name (e.g., "#general")
    "project_id": str,  # MongoDB ObjectId as string (null for global channels)
    "type": str,  # "global" | "project"
    "members": [str],  # Array of user IDs
    "created_by": str,  # User ID
    "created_at": datetime
}
```

**Messages Collection (Team Chat):**
```python
{
    "_id": ObjectId,
    "channel_id": str,  # MongoDB ObjectId as string
    "user_id": str,  # Sender's user ID
    "user_name": str,  # Sender's name
    "message": str,  # Message text
    "attachments": [  # Optional file attachments
        {
            "name": str,
            "url": str,
            "type": str  # MIME type
        }
    ],
    "timestamp": datetime
}
```

**AI Conversations Collection:**
```python
{
    "_id": ObjectId,
    "user_id": str,  # User ID
    "title": str,  # Conversation title
    "model": str,  # "gpt-5.2-chat" | "claude" | "gemini"
    "created_at": datetime,
    "updated_at": datetime
}
```

**AI Messages Collection:**
```python
{
    "_id": ObjectId,
    "conversation_id": str,  # MongoDB ObjectId as string
    "role": str,  # "user" | "assistant"
    "content": str,  # Message text
    "timestamp": datetime,
    "tokens": {  # Token usage (for cost tracking)
        "prompt": int,
        "completion": int,
        "total": int
    }
}
```

### Database Initialization (init_db.py)

**Super Admin Initialization:**
```python
from database import users
from utils.auth_utils import hash_password
import os

def initialize_super_admin():
    """
    Create super admin account if not exists
    Runs on application startup
    """
    email = os.getenv("SADMIN_EMAIL", "admin@example.com")
    password = os.getenv("SADMIN_PASSWORD", "CHANGE_THIS_PASSWORD")
    name = os.getenv("SADMIN_NAME", "Super Administrator")
    
    # Check if super admin already exists
    existing = users.find_one({"email": email})
    if existing:
        print(f"✅ Super admin already exists: {email}")
        return
    
    # Create super admin account
    users.insert_one({
        "name": name,
        "email": email,
        "password": hash_password(password),
        "role": "super-admin",
        "created_at": datetime.utcnow(),
        "sessions": [],
        "token_version": 0
    })
    
    print(f"✅ Super admin created: {email}")


def initialize_default_channels():
    """
    Create default global chat channels
    """
    from database import channels
    
    default_channels = [
        {"name": "general", "type": "global", "project_id": None},
        {"name": "announcements", "type": "global", "project_id": None},
        {"name": "random", "type": "global", "project_id": None}
    ]
    
    for channel_data in default_channels:
        existing = channels.find_one({"name": channel_data["name"], "type": "global"})
        if not existing:
            channels.insert_one({
                **channel_data,
                "members": [],
                "created_at": datetime.utcnow()
            })
            print(f"✅ Created channel: #{channel_data['name']}")
```

### Configuration (config.py)

**Environment Configuration:**
```python
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Database Configuration
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/taskdb?retryWrites=true&w=majority&appName=YOUR_APP_NAME"
)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_THIS_IN_PRODUCTION")
JWT_EXPIRY_HOURS = 24  # Token expiry duration

# Note: In production, JWT_SECRET should be a strong random string
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Authentication System

### Advanced JWT Authentication (auth_utils.py)

The authentication system implements enterprise-grade security with advanced features to prevent token theft, session hijacking, and unauthorized access.

**Core Security Features:**
1. ✅ **Single Session Enforcement** - Auto-logout previous sessions on new login
2. ✅ **Device Fingerprinting** - Binds tokens to specific device (IP + User-Agent)
3. ✅ **Tab Session Keys** - Prevents token sharing across browser tabs
4. ✅ **Token Versioning** - Allows mass token invalidation
5. ✅ **Session Tracking** - All sessions stored in database
6. ✅ **24-Hour Token Expiry** - Automatic logout after 24 hours

### Complete auth_utils.py Implementation

**Password Hashing:**
```python
from passlib.context import CryptContext

# Password hashing context with bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Hash password using bcrypt algorithm
    Bcrypt is resistant to rainbow table attacks
    
    Args:
        password: Plain text password
    
    Returns:
        Hashed password string (60 characters)
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against bcrypt hash
    
    Args:
        plain_password: User-provided password
        hashed_password: Stored bcrypt hash
    
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)
```

**Token ID Generation:**
```python
import hashlib
import uuid

def generate_token_id(token: str) -> str:
    """
    Generate unique identifier for token tracking
    Uses SHA256 hash of JWT token
    
    Args:
        token: JWT token string
    
    Returns:
        SHA256 hash (hex string, 64 characters)
    """
    return hashlib.sha256(token.encode()).hexdigest()


def generate_session_id() -> str:
    """
    Generate unique session identifier
    Uses UUID v4 for randomness
    
    Returns:
        UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
    """
    return str(uuid.uuid4())
```

**Device Fingerprinting:**
```python
def generate_device_fingerprint(ip_address: str, user_agent: str) -> str:
    """
    Generate device fingerprint from IP address and User-Agent
    Binds token to specific device to prevent token theft
    
    If attacker steals JWT token, they cannot use it from different device
    because device fingerprint will not match
    
    Args:
        ip_address: Client IP address (from request.client.host)
        user_agent: Browser User-Agent string (from headers)
    
    Returns:
        SHA256 hash of "IP:User-Agent" (hex string, 64 characters)
    
    Example:
        IP: "192.168.1.1"
        User-Agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
        Fingerprint: SHA256("192.168.1.1:Mozilla/5.0...")
    """
    fingerprint_data = f"{ip_address}:{user_agent}"
    return hashlib.sha256(fingerprint_data.encode()).hexdigest()
```

**JWT Token Creation with Advanced Security:**
```python
from jose import jwt
from datetime import datetime, timedelta
import os
from database import users
from bson import ObjectId

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_THIS_IN_PRODUCTION")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


def create_token(
    user_id: str,
    ip_address: str,
    user_agent: str
) -> tuple[str, str, str]:
    """
    Create JWT token with advanced security features
    
    ⚠️ CRITICAL SECURITY: Automatically deactivates ALL previous sessions
    This prevents token theft - only ONE active session allowed at a time
    
    Args:
        user_id: MongoDB ObjectId as string
        ip_address: Client IP address
        user_agent: Browser User-Agent string
    
    Returns:
        Tuple of (token, token_id, tab_session_key)
        - token: JWT token string (expires in 24h)
        - token_id: SHA256 hash for server-side token tracking
        - tab_session_key: UUID v4 for tab-specific validation
    
    Token Payload contains:
        - user_id: User's MongoDB ObjectId (as "sub")
        - session_id: Unique session identifier (UUID v4)
        - tab_key: Tab-specific session key (UUID v4)
        - token_id: Token identifier (SHA256 hash)
        - token_version: User's current token version
        - device_fp: Device fingerprint (SHA256 of IP:User-Agent)
        - exp: Expiration timestamp (UTC, 24 hours from now)
        - iat: Issued at timestamp (UTC)
        - ip: Client IP address (for audit log)
        - ua_hash: SHA256 hash of User-Agent (for tracking)
    
    Database Side Effects:
        1. DEACTIVATES all existing sessions (is_active = False)
        2. SAVES new session to user.sessions array
        3. Updates user.updated_at timestamp
    
    Security Benefits:
        1. Single Session Enforcement: Only one active login allowed
           - If user logs in from laptop, previous phone session auto-logged out
           - Prevents stolen tokens from working (attacker logged out immediately)
        
        2. Device Binding: Token bound to specific device
           - Token only works from same IP + User-Agent combination
           - Cannot use stolen token from different device
        
        3. Tab Session Keys: Each browser tab has unique session key
           - Prevents token sharing across tabs
           - Each tab must provide X-Tab-Session-Key header
        
        4. Token Versioning: Allows mass invalidation
           - Increment user.token_version to invalidate ALL tokens
           - Useful for "logout from all devices" feature
        
        5. Session Tracking: All sessions saved in database
           - Can view active sessions
           - Can revoke specific sessions
    
    Example:
        token, token_id, tab_key = create_token(
            user_id="507f1f77bcf86cd799439011",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0..."
        )
        
        Response headers:
        - Authorization: Bearer <token>
        - X-Tab-Session-Key: <tab_key>
    """
    # Generate unique identifiers
    session_id = generate_session_id()  # UUID v4 for session
    tab_session_key = str(uuid.uuid4())  # UUID v4 for tab
    device_fingerprint = generate_device_fingerprint(ip_address, user_agent)
    
    # Get user's current token version
    user = users.find_one({"_id": ObjectId(user_id)})
    token_version = user.get("token_version", 0)
    
    # Calculate expiration time (24 hours)
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    
    # Create JWT payload
    payload = {
        "sub": user_id,  # Subject (user ID)
        "session_id": session_id,  # Unique session
        "tab_key": tab_session_key,  # Tab-specific key
        "token_version": token_version,  # For mass invalidation
        "device_fp": device_fingerprint,  # Device binding
        "exp": expire,  # Expiration time
        "iat": datetime.utcnow(),  # Issued at time
        "ip": ip_address,  # For audit log
        "ua_hash": hashlib.sha256(user_agent.encode()).hexdigest()  # UA tracking
    }
    
    # Encode JWT token
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Generate token ID for tracking
    token_id = generate_token_id(token)
    
    # ⚠️ CRITICAL SECURITY: Deactivate ALL previous sessions
    # This enforces single session policy - only one active login allowed
    users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "sessions.$[].is_active": False  # Deactivate all sessions
            }
        }
    )
    
    # Save new session to database
    session_data = {
        "session_id": session_id,
        "token_id": token_id,
        "tab_session_key": tab_session_key,
        "device_fingerprint": device_fingerprint,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "created_at": datetime.utcnow(),
        "expires_at": expire,
        "is_active": True
    }
    
    users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$push": {"sessions": session_data},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return token, token_id, tab_session_key
```

**Token Verification (HTTP Endpoints):**
```python
from fastapi import HTTPException

def verify_token(
    token: str,
    tab_session_key: str,
    ip_address: str,
    user_agent: str
) -> str:
    """
    Verify JWT token and validate session
    
    Validation Steps:
        1. Decode JWT token (check signature and expiration)
        2. Verify device fingerprint matches (IP + User-Agent)
        3. Verify tab session key matches
        4. Check session is active in database
        5. Verify token version matches (not invalidated)
    
    Args:
        token: JWT token string (from Authorization header)
        tab_session_key: Tab session key (from X-Tab-Session-Key header)
        ip_address: Client IP address
        user_agent: Browser User-Agent string
    
    Returns:
        user_id: MongoDB ObjectId as string
    
    Raises:
        HTTPException(401): If token invalid, expired, or session inactive
    
    Security Checks:
        - Token signature valid (not tampered)
        - Token not expired (<24 hours old)
        - Device fingerprint matches (same IP + User-Agent)
        - Tab session key matches (from same browser tab)
        - Session active in database (not revoked)
        - Token version matches (not mass-invalidated)
    """
    try:
        # Decode JWT token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Extract payload data
        user_id = payload.get("sub")
        session_id = payload.get("session_id")
        payload_tab_key = payload.get("tab_key")
        payload_device_fp = payload.get("device_fp")
        token_version = payload.get("token_version", 0)
        
        # Verify device fingerprint (IP + User-Agent)
        current_device_fp = generate_device_fingerprint(ip_address, user_agent)
        if current_device_fp != payload_device_fp:
            raise HTTPException(
                status_code=401,
                detail="Token not valid for this device"
            )
        
        # Verify tab session key
        if tab_session_key != payload_tab_key:
            raise HTTPException(
                status_code=401,
                detail="Invalid tab session key"
            )
        
        # Check session in database
        user = users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Verify token version (not mass-invalidated)
        if user.get("token_version", 0) != token_version:
            raise HTTPException(
                status_code=401,
                detail="Token has been invalidated"
            )
        
        # Find session in database
        session = next(
            (s for s in user.get("sessions", []) if s["session_id"] == session_id),
            None
        )
        
        if not session or not session.get("is_active", False):
            raise HTTPException(
                status_code=401,
                detail="Session inactive or revoked"
            )
        
        return user_id
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

**Token Verification (WebSocket):**
```python
def verify_token_for_websocket(token: str) -> str:
    """
    Simplified token verification for WebSocket connections
    
    WebSocket connections cannot send custom headers like HTTP requests,
    so we skip device fingerprint and tab session key validation.
    
    Only validates:
        - Token signature valid
        - Token not expired
        - User exists in database
    
    Args:
        token: JWT token string (from WebSocket query parameter)
    
    Returns:
        user_id: MongoDB ObjectId as string, or None if invalid
    
    Example WebSocket URL:
        ws://localhost:8000/api/tasks/ws/project/ABC123?token=eyJhbGci...
    """
    try:
        # Decode JWT token (checks signature and expiration)
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Extract user ID
        user_id = payload.get("sub")
        
        # Verify user exists
        user = users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
        
        return user_id
    
    except (jwt.ExpiredSignatureError, jwt.JWTError):
        return None
```

**Token Invalidation:**
```python
def invalidate_all_tokens(user_id: str):
    """
    Invalidate all tokens for a user (logout from all devices)
    
    Increments user.token_version to make all existing tokens invalid.
    All tokens with old token_version will fail verification.
    
    Args:
        user_id: MongoDB ObjectId as string
    
    Use Cases:
        - User clicks "Logout from all devices"
        - Password changed (force re-login)
        - Security breach detected
        - Admin forces logout
    """
    users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$inc": {"token_version": 1},  # Increment version
            "$set": {"sessions.$[].is_active": False},  # Deactivate all sessions
            "$set": {"updated_at": datetime.utcnow()}
        }
    )


def revoke_session(user_id: str, session_id: str):
    """
    Revoke specific session (logout from specific device)
    
    Sets is_active = False for the specified session.
    User will be logged out from that device only.
    
    Args:
        user_id: MongoDB ObjectId as string
        session_id: Session UUID to revoke
    
    Use Case:
        - User views active sessions in settings
        - User clicks "Logout" on specific session (e.g., "iPhone - Safari")
    """
    users.update_one(
        {"_id": ObjectId(user_id), "sessions.session_id": session_id},
        {
            "$set": {
                "sessions.$.is_active": False,
                "updated_at": datetime.utcnow()
            }
        }
    )
```

### Dependency Injection (dependencies.py)

**FastAPI Authentication Dependencies:**
```python
from fastapi import Depends, HTTPException, Header, Request
from utils.auth_utils import verify_token
from models.user import User

def get_current_user(
    request: Request,
    authorization: str = Header(None, alias="Authorization"),
    x_tab_session_key: str = Header(None, alias="X-Tab-Session-Key")
) -> str:
    """
    FastAPI dependency for authentication
    
    Validates JWT token and returns user_id.
    Used in all protected endpoints with Depends(get_current_user).
    
    Args:
        request: FastAPI request object (for IP and User-Agent)
        authorization: Authorization header ("Bearer <token>")
        x_tab_session_key: Tab session key header (UUID)
    
    Returns:
        user_id: MongoDB ObjectId as string
    
    Raises:
        HTTPException(401): If authentication fails
    
    Usage:
        @router.get("/protected")
        async def protected_route(user_id: str = Depends(get_current_user)):
            # user_id is automatically injected
            return {"message": f"Hello user {user_id}"}
    
    Security:
        - Validates Authorization header exists
        - Validates X-Tab-Session-Key header exists
        - Skips tab key validation for /api/auth/refresh-session endpoint
        - Extracts IP address from request.client.host
        - Extracts User-Agent from request.headers
        - Calls verify_token() with all parameters
    """
    # Check Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing or invalid"
        )
    
    # Extract token
    token = authorization.replace("Bearer ", "")
    
    # Get IP address and User-Agent
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "")
    
    # Skip tab key validation for refresh-session endpoint
    # (refresh creates new tab key)
    if request.url.path == "/api/auth/refresh-session":
        # Verify token without tab key
        user_id = verify_token_for_websocket(token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    
    # Check X-Tab-Session-Key header
    if not x_tab_session_key:
        raise HTTPException(
            status_code=401,
            detail="X-Tab-Session-Key header missing"
        )
    
    # Verify token with all security checks
    user_id = verify_token(token, x_tab_session_key, ip_address, user_agent)
    
    return user_id


def get_current_user_optional(
    authorization: str = Header(None, alias="Authorization")
) -> str | None:
    """
    Optional authentication dependency
    
    Returns user_id if authenticated, None otherwise.
    Used for endpoints that support both authenticated and anonymous access.
    
    Args:
        authorization: Authorization header (optional)
    
    Returns:
        user_id: MongoDB ObjectId as string, or None if not authenticated
    
    Usage:
        @router.get("/public-or-private")
        async def flexible_route(user_id: str | None = Depends(get_current_user_optional)):
            if user_id:
                return {"message": "Hello authenticated user", "user_id": user_id}
            else:
                return {"message": "Hello anonymous user"}
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    try:
        token = authorization.replace("Bearer ", "")
        user_id = verify_token_for_websocket(token)  # Simplified verification
        return user_id
    except:
        return None


def require_admin(user_id: str = Depends(get_current_user)) -> str:
    """
    Require admin or super-admin role
    
    Validates that authenticated user has admin privileges.
    Used for admin-only endpoints.
    
    Args:
        user_id: User ID from get_current_user dependency
    
    Returns:
        user_id: Same user ID if admin/super-admin
    
    Raises:
        HTTPException(403): If user is not admin or super-admin
    
    Usage:
        @router.delete("/admin/delete-user/{user_id}")
        async def delete_user(
            target_user_id: str,
            admin_id: str = Depends(require_admin)
        ):
            # Only admins can reach this endpoint
            User.delete(target_user_id)
            return {"success": True}
    """
    user = User.get_by_id(user_id)
    if not user or user["role"] not in ["admin", "super-admin"]:
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    return user_id


def require_super_admin(user_id: str = Depends(get_current_user)) -> str:
    """
    Require super-admin role
    
    Validates that authenticated user is super-admin.
    Used for super-admin-only endpoints (system dashboard, user management).
    
    Args:
        user_id: User ID from get_current_user dependency
    
    Returns:
        user_id: Same user ID if super-admin
    
    Raises:
        HTTPException(403): If user is not super-admin
    
    Usage:
        @router.get("/system/dashboard")
        async def system_dashboard(admin_id: str = Depends(require_super_admin)):
            # Only super-admin can reach this endpoint
            return get_system_statistics()
    """
    user = User.get_by_id(user_id)
    if not user or user["role"] != "super-admin":
        raise HTTPException(
            status_code=403,
            detail="Super admin privileges required"
        )
    return user_id
```

### Authentication Flow

**Login Flow:**
```
1. User submits email + password
   ↓
2. Backend verifies password (bcrypt)
   ↓
3. Backend creates JWT token with create_token()
   - Deactivates ALL previous sessions (single session enforcement)
   - Generates session_id (UUID)
   - Generates tab_session_key (UUID)
   - Creates device_fingerprint (SHA256 of IP:User-Agent)
   - Stores session in database
   ↓
4. Backend returns:
   - JWT token (in response body)
   - tab_session_key (in response body)
   ↓
5. Frontend stores:
   - JWT token in localStorage
   - tab_session_key in sessionStorage (tab-specific)
   ↓
6. Frontend includes in all requests:
   - Authorization: Bearer <token>
   - X-Tab-Session-Key: <tab_session_key>
```

**Request Authentication Flow:**
```
1. Frontend sends request with:
   - Authorization: Bearer <token>
   - X-Tab-Session-Key: <tab_session_key>
   ↓
2. FastAPI calls get_current_user dependency
   ↓
3. verify_token() validates:
   - Token signature valid (not tampered)
   - Token not expired (<24h)
   - Device fingerprint matches (IP + User-Agent)
   - Tab session key matches
   - Session active in database
   - Token version matches
   ↓
4. If valid: Extract user_id and continue
   If invalid: Return 401 Unauthorized
```

**Token Invalidation Flow:**
```
Logout from Current Device:
1. Frontend sends logout request
2. Backend calls revoke_session(user_id, session_id)
3. Sets is_active = False for that session
4. Frontend clears localStorage and sessionStorage

Logout from All Devices:
1. User clicks "Logout Everywhere" button
2. Backend calls invalidate_all_tokens(user_id)
3. Increments user.token_version
4. All existing tokens fail verification (wrong version)
5. User must login again from all devices

Password Changed:
1. User changes password
2. Backend calls invalidate_all_tokens(user_id)
3. Forces re-login from all devices for security
```

---

## Router → Controller → Model Pattern

The backend follows a clean 3-layer architecture for separation of concerns:
- **Router**: FastAPI endpoint definitions (HTTP interface)
- **Controller**: Business logic, validation, orchestration
- **Model**: Database operations (Data Access Layer)

### Complete Example: Task Management

#### Layer 1: Router (task_router.py)

**Purpose**: Define HTTP endpoints with FastAPI decorators.

```python
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from schemas import (
    TaskCreate, TaskUpdate, AddLabelRequest, AddAttachmentRequest,
    RemoveAttachmentRequest, AddLinkRequest, RemoveLinkRequest, AddCommentRequest
)
from controllers import task_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response
from utils.websocket_manager import manager
from utils.auth_utils import verify_token_for_websocket
import json

router = APIRouter()


# ========== WebSocket Endpoint ========== #

@router.websocket("/ws/project/{project_id}")
async def kanban_websocket(websocket: WebSocket, project_id: str, token: str):
    """
    WebSocket for real-time Kanban board collaboration
    
    Connects user to project's Kanban channel for live updates.
    Broadcasts task changes to all connected users in project.
    
    URL: ws://localhost:8000/api/tasks/ws/project/ABC123?token=eyJhbGci...
    
    Authentication:
        - Token passed as query parameter (WebSockets can't send custom headers)
        - Verified using verify_token_for_websocket()
        - Project membership validated
    
    Message Types:
        - connection: Sent on successful connection
        - ping/pong: Heartbeat to keep connection alive
        - task_created: New task added to Kanban
        - task_updated: Task moved or modified
        - task_deleted: Task removed from board
    
    Flow:
        1. Verify JWT token
        2. Verify user is project member
        3. Connect to project's Kanban channel
        4. Send connection confirmation
        5. Listen for messages (heartbeat)
        6. Handle disconnection (cleanup)
    """
    # Verify token
    user_id = verify_token_for_websocket(token)
    if not user_id:
        await websocket.close(code=1008)  # Policy violation
        return
    
    # Verify project access
    from models.project import Project
    if not Project.is_member(project_id, user_id):
        await websocket.close(code=1008)
        return
    
    # Connect to project's Kanban channel
    channel_id = f"kanban_{project_id}"
    await manager.connect(websocket, channel_id, user_id)
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "channel_id": channel_id,
            "project_id": project_id,
            "message": "Connected to Kanban board"
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_json()
            
            # Handle heartbeat (prevents timeout)
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        manager.disconnect(channel_id, user_id)
    except Exception as e:
        print(f"[KANBAN WS] Error: {str(e)}")
        manager.disconnect(channel_id, user_id)


# ========== CRUD Endpoints ========== #

@router.post("")
async def create_task(data: TaskCreate, user_id: str = Depends(get_current_user)):
    """
    Create new task
    
    POST /api/tasks
    
    Request Body (TaskCreate schema):
        {
            "title": "Implement login page",
            "description": "Create login form with validation",
            "project_id": "507f1f77bcf86cd799439011",
            "priority": "High",
            "status": "To Do",
            "assignee_id": "507f1f77bcf86cd799439012",
            "due_date": "2024-12-31",
            "issue_type": "task",
            "labels": ["frontend", "urgent"]
        }
    
    Response:
        {
            "success": true,
            "message": "Task created successfully",
            "task": {
                "_id": "507f1f77bcf86cd799439013",
                "ticket_id": "DOIT-123",
                "title": "Implement login page",
                ...
            }
        }
    
    Security:
        - Requires authentication (Depends(get_current_user))
        - Validates project membership
        - Validates assignee is project member
        - Role-based: members can't assign to admin/super-admin
    
    Side Effects:
        - Generates unique ticket ID (e.g., "DOIT-123")
        - Broadcasts task_created event to Kanban WebSocket channel
    """
    body = json.dumps(data.model_dump())
    response = task_controller.create_task(body, user_id)
    return handle_controller_response(response)


@router.get("/my")
async def get_my_tasks(user_id: str = Depends(get_current_user)):
    """
    Get tasks assigned to me
    
    GET /api/tasks/my
    
    Response:
        {
            "success": true,
            "tasks": [
                {
                    "_id": "507f...",
                    "ticket_id": "DOIT-123",
                    "title": "Fix bug in dashboard",
                    "status": "In Progress",
                    "priority": "High",
                    "assignee_id": "507f...",
                    "project_id": "507f...",
                    ...
                },
                ...
            ]
        }
    
    Filters:
        - Only returns tasks where assignee_id matches current user
        - Sorted by created_at descending (newest first)
    """
    response = task_controller.get_my_tasks(user_id)
    return handle_controller_response(response)


@router.get("/pending-approval")
async def get_pending_approval(user_id: str = Depends(get_current_user)):
    """
    Get all pending approval tasks
    
    GET /api/tasks/pending-approval
    
    Response: List of tasks with status="Dev Complete"
    
    Use Case:
        - QA dashboard showing tasks ready for testing
        - Manager view of tasks awaiting approval
    """
    response = task_controller.get_all_pending_approval_tasks(user_id)
    return handle_controller_response(response)


@router.get("/closed")
async def get_closed_tasks(user_id: str = Depends(get_current_user)):
    """
    Get all closed tasks
    
    GET /api/tasks/closed
    
    Response: List of tasks with status="Done" or "Closed"
    
    Use Case:
        - Completed work archive
        - Sprint retrospective analysis
    """
    response = task_controller.get_all_closed_tasks(user_id)
    return handle_controller_response(response)


@router.get("/project/{project_id}")
async def get_project_tasks(project_id: str, user_id: str = Depends(get_current_user)):
    """
    Get all tasks for a project
    
    GET /api/tasks/project/507f1f77bcf86cd799439011
    
    Response: List of tasks in project
    
    Security:
        - Validates user is project member
        - Filters tasks by project_id
    
    Use Case:
        - Kanban board data
        - Project task list
    """
    response = task_controller.get_project_tasks(project_id, user_id)
    return handle_controller_response(response)


@router.get("/{task_id}")
async def get_task(task_id: str, user_id: str = Depends(get_current_user)):
    """
    Get task by ID
    
    GET /api/tasks/507f1f77bcf86cd799439013
    
    Response: Single task object with full details
    
    Use Case:
        - Task detail modal
        - Task edit form
    """
    response = task_controller.get_task_by_id(task_id, user_id)
    return handle_controller_response(response)


@router.put("/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, user_id: str = Depends(get_current_user)):
    """
    Update task - CRITICAL for Kanban drag-drop
    
    PUT /api/tasks/507f1f77bcf86cd799439013
    
    Request Body (TaskUpdate schema - all fields optional):
        {
            "status": "In Progress",
            "assignee_id": "507f...",
            "priority": "High",
            "comment": "Started working on this"
        }
    
    Response:
        {
            "success": true,
            "message": "Task updated successfully",
            "task": { ...updated task... }
        }
    
    Side Effects:
        - Adds activity log entry with old/new values
        - Updates updated_at timestamp
        - Broadcasts task_updated event to Kanban WebSocket channel
    
    Use Case:
        - Kanban drag-drop (status change)
        - Task edit form submission
        - Bulk updates
    """
    body = json.dumps(data.model_dump())
    response = task_controller.update_task(body, task_id, user_id)
    return handle_controller_response(response)


@router.delete("/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    """
    Delete task
    
    DELETE /api/tasks/507f1f77bcf86cd799439013
    
    Response:
        {
            "success": true,
            "message": "Task deleted successfully"
        }
    
    Security:
        - Requires project admin or task creator
        - Validates project membership
    
    Side Effects:
        - Broadcasts task_deleted event to Kanban WebSocket channel
    """
    response = task_controller.delete_task(task_id, user_id)
    return handle_controller_response(response)


# ========== Label Endpoints ========== #

@router.post("/{task_id}/labels")
async def add_label(task_id: str, data: AddLabelRequest, user_id: str = Depends(get_current_user)):
    """
    Add label to task
    
    POST /api/tasks/507f.../labels
    Body: {"label": "urgent"}
    
    Response: Updated task with new label
    
    Features:
        - Label validation (no special characters)
        - Label normalization (lowercase, trim)
        - Prevents duplicate labels
        - Broadcasts update to WebSocket
    """
    body = json.dumps(data.model_dump())
    response = task_controller.add_label_to_task(task_id, body, user_id)
    return handle_controller_response(response)


@router.delete("/{task_id}/labels/{label}")
async def remove_label(task_id: str, label: str, user_id: str = Depends(get_current_user)):
    """
    Remove label from task
    
    DELETE /api/tasks/507f.../labels/urgent
    
    Response: Updated task without removed label
    """
    response = task_controller.remove_label_from_task(task_id, label, user_id)
    return handle_controller_response(response)


@router.get("/labels/{project_id}")
async def get_project_labels(project_id: str, user_id: str = Depends(get_current_user)):
    """
    Get all labels used in project
    
    GET /api/tasks/labels/507f...
    
    Response:
        {
            "success": true,
            "labels": ["frontend", "backend", "urgent", "bug", ...]
        }
    
    Use Case:
        - Label autocomplete in task form
        - Filter options in Kanban board
    """
    response = task_controller.get_project_labels(project_id, user_id)
    return handle_controller_response(response)


# ========== Attachment Endpoints ========== #

@router.post("/{task_id}/attachments")
async def add_attachment(task_id: str, data: AddAttachmentRequest, user_id: str = Depends(get_current_user)):
    """
    Add attachment to task
    
    POST /api/tasks/507f.../attachments
    Body: {
        "name": "Screenshot",
        "url": "/uploads/task_attachments/file.png",
        "fileName": "screenshot.png",
        "fileType": "image/png",
        "fileSize": 102400
    }
    
    Response: Updated task with new attachment
    
    Note: File upload handled separately, this endpoint just links attachment to task
    """
    body = json.dumps(data.model_dump())
    response = task_controller.add_attachment_to_task(task_id, body, user_id)
    return handle_controller_response(response)


@router.delete("/{task_id}/attachments")
async def remove_attachment(task_id: str, data: RemoveAttachmentRequest, user_id: str = Depends(get_current_user)):
    """
    Remove attachment from task
    
    DELETE /api/tasks/507f.../attachments
    Body: {"url": "/uploads/task_attachments/file.png"}
    
    Response: Updated task without removed attachment
    """
    body = json.dumps(data.model_dump())
    response = task_controller.remove_attachment_from_task(task_id, body, user_id)
    return handle_controller_response(response)


# ========== Link Endpoints ========== #

@router.post("/{task_id}/links")
async def add_link(task_id: str, data: AddLinkRequest, user_id: str = Depends(get_current_user)):
    """
    Add link to another task
    
    POST /api/tasks/507f.../links
    Body: {
        "linked_task_id": "507f...",  # or
        "linked_ticket_id": "DOIT-124"
    }
    
    Response: Updated task with new link
    
    Use Case:
        - Task dependencies (blocks/blocked by)
        - Related tasks
        - Epic → Story relationships
    """
    body = json.dumps(data.model_dump())
    response = task_controller.add_link_to_task(task_id, body, user_id)
    return handle_controller_response(response)


@router.delete("/{task_id}/links/{linked_task_id}")
async def remove_link(task_id: str, linked_task_id: str, user_id: str = Depends(get_current_user)):
    """
    Remove link between tasks
    
    DELETE /api/tasks/507f.../links/507f...
    
    Response: Updated task without removed link
    """
    response = task_controller.remove_link_from_task(task_id, linked_task_id, user_id)
    return handle_controller_response(response)
```

#### Layer 2: Controller (task_controller.py)

**Purpose**: Business logic, validation, orchestration, WebSocket broadcasting.

```python
import json
from bson import ObjectId
from fastapi import HTTPException
from datetime import datetime
from models.task import Task
from models.project import Project
from models.user import User
from utils.response import success_response, error_response
from utils.validators import validate_object_id
from utils.ticket_utils import generate_ticket_id
from utils.label_utils import validate_label, normalize_label
from utils.websocket_manager import manager
import asyncio


def create_task(body_str: str, user_id: str):
    """
    Create new task with validation and WebSocket broadcasting
    
    Validation:
        - title (required, min 3 characters)
        - project_id (required, valid ObjectId, user must be member)
        - priority (valid: Low, Medium, High)
        - issue_type (valid: task, bug, story, epic)
        - status (valid: To Do, In Progress, Testing, Dev Complete, Done)
        - assignee_id (must be project member)
        - Role-based assignment (members can't assign to admin/super-admin)
        - labels (validate and normalize each label)
    
    Processing:
        1. Parse request body
        2. Validate required fields
        3. Validate project membership
        4. Validate assignee
        5. Generate ticket ID (e.g., "DOIT-123")
        6. Validate and normalize labels
        7. Create task in database
        8. Broadcast to Kanban WebSocket channel
        9. Return task object
    
    Args:
        body_str: JSON string from request body
        user_id: Authenticated user ID
    
    Returns:
        Success response with created task object
    
    Raises:
        HTTPException with appropriate status code
    """
    try:
        # Parse request body
        body = json.loads(body_str)
        
        # Extract fields
        title = body.get("title", "").strip()
        description = body.get("description", "").strip()
        project_id = body.get("project_id")
        priority = body.get("priority", "Medium")
        status = body.get("status", "To Do")
        assignee_id = body.get("assignee_id")
        due_date = body.get("due_date")
        issue_type = body.get("issue_type", "task")
        labels = body.get("labels", [])
        
        # ========== VALIDATION ========== #
        
        # Validate title
        if not title:
            return error_response("Title is required", 400)
        if len(title) < 3:
            return error_response("Title must be at least 3 characters", 400)
        
        # Validate project_id
        if not project_id:
            return error_response("Project ID is required", 400)
        if not validate_object_id(project_id):
            return error_response("Invalid project ID", 400)
        
        # Verify project exists and user is member
        project = Project.find_by_id(project_id)
        if not project:
            return error_response("Project not found", 404)
        
        if not Project.is_member(project_id, user_id):
            return error_response("You are not a member of this project", 403)
        
        # Validate priority
        valid_priorities = ["Low", "Medium", "High"]
        if priority not in valid_priorities:
            return error_response(
                f"Invalid priority. Must be one of: {', '.join(valid_priorities)}", 
                400
            )
        
        # Validate issue type
        valid_issue_types = ["task", "bug", "story", "epic"]
        if issue_type not in valid_issue_types:
            return error_response(
                f"Invalid issue type. Must be one of: {', '.join(valid_issue_types)}", 
                400
            )
        
        # Validate status
        valid_statuses = ["To Do", "In Progress", "Testing", "Dev Complete", "Done"]
        if status not in valid_statuses:
            return error_response(
                f"Invalid status. Must be one of: {', '.join(valid_statuses)}", 
                400
            )
        
        # Validate assignee if provided
        assignee_name = None
        assignee_email = None
        
        if assignee_id:
            if not validate_object_id(assignee_id):
                return error_response("Invalid assignee ID", 400)
            
            # Verify assignee is project member
            if not Project.is_member(project_id, assignee_id):
                return error_response("Assignee must be a project member", 400)
            
            # Get assignee details
            assignee = User.get_by_id(assignee_id)
            if not assignee:
                return error_response("Assignee not found", 404)
            
            assignee_name = assignee["name"]
            assignee_email = assignee["email"]
            
            # Role-based assignment validation
            # Members cannot assign tasks to admins or super-admins
            current_user = User.get_by_id(user_id)
            if current_user["role"] == "member":
                if assignee["role"] in ["admin", "super-admin"]:
                    return error_response(
                        "Members cannot assign tasks to admins", 
                        403
                    )
        
        # Validate and normalize labels
        validated_labels = []
        for label in labels:
            if not validate_label(label):
                return error_response(
                    f"Invalid label '{label}'. Labels must be alphanumeric with underscores/hyphens only.", 
                    400
                )
            validated_labels.append(normalize_label(label))
        
        # ========== TICKET ID GENERATION ========== #
        
        # Generate unique ticket ID (e.g., "DOIT-123")
        ticket_id = generate_ticket_id(project_id, issue_type)
        
        # ========== CREATE TASK ========== #
        
        # Get current user details for audit
        creator = User.get_by_id(user_id)
        
        # Build task object
        task_data = {
            "ticket_id": ticket_id,
            "issue_type": issue_type,
            "title": title,
            "description": description,
            "project_id": project_id,
            "sprint_id": None,  # New tasks start in backlog
            "priority": priority,
            "status": status,
            "assignee_id": assignee_id,
            "assignee_name": assignee_name,
            "assignee_email": assignee_email,
            "due_date": due_date,
            "created_by": user_id,
            "labels": validated_labels,
            "attachments": [],
            "links": [],
            "activities": [
                {
                    "user_id": user_id,
                    "user_name": creator["name"],
                    "action": "created",
                    "comment": f"Created {issue_type}",
                    "timestamp": datetime.utcnow()
                }
            ],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into database
        task_id = Task.create(task_data)
        
        # Get created task
        created_task = Task.find_by_id(str(task_id))
        
        # Convert ObjectId and datetime to strings for JSON response
        created_task["_id"] = str(created_task["_id"])
        created_task["created_at"] = created_task["created_at"].isoformat()
        created_task["updated_at"] = created_task["updated_at"].isoformat()
        for activity in created_task.get("activities", []):
            activity["timestamp"] = activity["timestamp"].isoformat()
        
        # ========== WEBSOCKET BROADCAST ========== #
        
        # Broadcast task creation to all users viewing this project's Kanban board
        channel_id = f"kanban_{project_id}"
        asyncio.create_task(
            manager.broadcast_to_channel(
                {
                    "type": "task_created",
                    "task": created_task
                },
                channel_id
            )
        )
        
        # ========== RESPONSE ========== #
        
        return success_response(
            data={"task": created_task},
            message="Task created successfully"
        )
    
    except json.JSONDecodeError:
        return error_response("Invalid JSON", 400)
    except Exception as e:
        print(f"[ERROR] create_task: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return error_response(f"Internal server error: {str(e)}", 500)


def update_task(body_str: str, task_id: str, user_id: str):
    """
    Update task with validation, activity logging, and WebSocket broadcasting
    
    CRITICAL FOR KANBAN: This endpoint handles drag-drop status changes
    
    Validation:
        - task_id (valid ObjectId, task exists)
        - User is project member
        - All field updates follow same validation as create_task
        - Assignee validation
        - Label validation
    
    Processing:
        1. Parse request body
        2. Validate task exists and user has access
        3. Compare old vs new values for activity log
        4. Update task in database
        5. Add activity log entry
        6. Broadcast to Kanban WebSocket channel
        7. Return updated task
    
    Args:
        body_str: JSON string with updates (all fields optional)
        task_id: MongoDB ObjectId as string
        user_id: Authenticated user ID
    
    Returns:
        Success response with updated task object
    """
    try:
        # Validate task_id
        if not validate_object_id(task_id):
            return error_response("Invalid task ID", 400)
        
        # Get existing task
        task = Task.find_by_id(task_id)
        if not task:
            return error_response("Task not found", 404)
        
        # Verify user is project member
        if not Project.is_member(task["project_id"], user_id):
            return error_response("You are not a member of this project", 403)
        
        # Parse request body
        body = json.loads(body_str)
        
        # Build update object
        update_data = {}
        activities = []
        
        # Get current user for activity log
        current_user = User.get_by_id(user_id)
        
        # Update title
        if "title" in body:
            new_title = body["title"].strip()
            if len(new_title) < 3:
                return error_response("Title must be at least 3 characters", 400)
            if new_title != task.get("title"):
                update_data["title"] = new_title
                activities.append({
                    "user_id": user_id,
                    "user_name": current_user["name"],
                    "action": "updated",
                    "field": "title",
                    "old_value": task.get("title"),
                    "new_value": new_title,
                    "timestamp": datetime.utcnow()
                })
        
        # Update status (IMPORTANT FOR KANBAN DRAG-DROP)
        if "status" in body:
            new_status = body["status"]
            valid_statuses = ["To Do", "In Progress", "Testing", "Dev Complete", "Done"]
            if new_status not in valid_statuses:
                return error_response(f"Invalid status", 400)
            if new_status != task.get("status"):
                update_data["status"] = new_status
                activities.append({
                    "user_id": user_id,
                    "user_name": current_user["name"],
                    "action": "status_changed",
                    "old_value": task.get("status"),
                    "new_value": new_status,
                    "timestamp": datetime.utcnow()
                })
        
        # Update priority
        if "priority" in body:
            new_priority = body["priority"]
            valid_priorities = ["Low", "Medium", "High"]
            if new_priority not in valid_priorities:
                return error_response(f"Invalid priority", 400)
            if new_priority != task.get("priority"):
                update_data["priority"] = new_priority
                activities.append({
                    "user_id": user_id,
                    "user_name": current_user["name"],
                    "action": "updated",
                    "field": "priority",
                    "old_value": task.get("priority"),
                    "new_value": new_priority,
                    "timestamp": datetime.utcnow()
                })
        
        # Update assignee
        if "assignee_id" in body:
            new_assignee_id = body["assignee_id"]
            if new_assignee_id:
                if not validate_object_id(new_assignee_id):
                    return error_response("Invalid assignee ID", 400)
                if not Project.is_member(task["project_id"], new_assignee_id):
                    return error_response("Assignee must be project member", 400)
                
                assignee = User.get_by_id(new_assignee_id)
                update_data["assignee_id"] = new_assignee_id
                update_data["assignee_name"] = assignee["name"]
                update_data["assignee_email"] = assignee["email"]
                
                activities.append({
                    "user_id": user_id,
                    "user_name": current_user["name"],
                    "action": "assigned",
                    "new_value": assignee["name"],
                    "timestamp": datetime.utcnow()
                })
            else:
                # Unassign task
                update_data["assignee_id"] = None
                update_data["assignee_name"] = None
                update_data["assignee_email"] = None
                activities.append({
                    "user_id": user_id,
                    "user_name": current_user["name"],
                    "action": "unassigned",
                    "timestamp": datetime.utcnow()
                })
        
        # Add optional comment
        if body.get("comment"):
            activities.append({
                "user_id": user_id,
                "user_name": current_user["name"],
                "action": "commented",
                "comment": body["comment"],
                "timestamp": datetime.utcnow()
            })
        
        # Update timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        # Apply updates to database
        Task.update(task_id, update_data)
        
        # Add activities to task
        for activity in activities:
            Task.add_activity(task_id, activity)
        
        # Get updated task
        updated_task = Task.find_by_id(task_id)
        
        # Convert ObjectId and datetime to strings
        updated_task["_id"] = str(updated_task["_id"])
        updated_task["created_at"] = updated_task["created_at"].isoformat()
        updated_task["updated_at"] = updated_task["updated_at"].isoformat()
        for activity in updated_task.get("activities", []):
            activity["timestamp"] = activity["timestamp"].isoformat()
        
        # Broadcast to WebSocket channel
        channel_id = f"kanban_{task['project_id']}"
        asyncio.create_task(
            manager.broadcast_to_channel(
                {
                    "type": "task_updated",
                    "task": updated_task
                },
                channel_id
            )
        )
        
        return success_response(
            data={"task": updated_task},
            message="Task updated successfully"
        )
    
    except json.JSONDecodeError:
        return error_response("Invalid JSON", 400)
    except Exception as e:
        print(f"[ERROR] update_task: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return error_response(f"Internal server error: {str(e)}", 500)


def get_my_tasks(user_id: str):
    """Get tasks assigned to current user"""
    try:
        tasks = Task.find_by_assignee(user_id)
        
        # Convert ObjectId and datetime to strings
        for task in tasks:
            task["_id"] = str(task["_id"])
            task["created_at"] = task["created_at"].isoformat()
            task["updated_at"] = task["updated_at"].isoformat()
        
        return success_response(data={"tasks": tasks})
    
    except Exception as e:
        print(f"[ERROR] get_my_tasks: {str(e)}")
        return error_response(f"Internal server error: {str(e)}", 500)


def get_project_tasks(project_id: str, user_id: str):
    """Get all tasks for a project"""
    try:
        # Verify user is project member
        if not Project.is_member(project_id, user_id):
            return error_response("You are not a member of this project", 403)
        
        tasks = Task.find_by_project(project_id)
        
        # Convert ObjectId and datetime to strings
        for task in tasks:
            task["_id"] = str(task["_id"])
            task["created_at"] = task["created_at"].isoformat()
            task["updated_at"] = task["updated_at"].isoformat()
        
        return success_response(data={"tasks": tasks})
    
    except Exception as e:
        print(f"[ERROR] get_project_tasks: {str(e)}")
        return error_response(f"Internal server error: {str(e)}", 500)
```

#### Layer 3: Model (models/task.py)

**Purpose**: Database operations (CRUD), data access layer.

```python
from database import tasks
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any, Optional


class Task:
    """Task model - Database operations for task management"""
    
    @staticmethod
    def create(task_data: dict) -> ObjectId:
        """
        Create new task in database
        
        Args:
            task_data: Task document to insert
        
        Returns:
            MongoDB ObjectId of inserted task
        
        Automatically adds:
            - created_at: Current UTC datetime
            - updated_at: Current UTC datetime
        
        Example:
            task_id = Task.create({
                "ticket_id": "DOIT-123",
                "title": "Fix bug",
                "project_id": "507f...",
                "status": "To Do",
                ...
            })
        """
        task_data["created_at"] = datetime.utcnow()
        task_data["updated_at"] = datetime.utcnow()
        result = tasks.insert_one(task_data)
        return result.inserted_id
    
    
    @staticmethod
    def find_by_id(task_id: str) -> Optional[dict]:
        """
        Find task by MongoDB ObjectId
        
        Args:
            task_id: MongoDB ObjectId as string
        
        Returns:
            Task document or None if not found
        
        Example:
            task = Task.find_by_id("507f1f77bcf86cd799439011")
            if task:
                print(task["title"])
        """
        return tasks.find_one({"_id": ObjectId(task_id)})
    
    
    @staticmethod
    def find_by_ticket_id(ticket_id: str) -> Optional[dict]:
        """
        Find task by ticket ID
        
        Args:
            ticket_id: Unique ticket identifier (e.g., "DOIT-123")
        
        Returns:
            Task document or None if not found
        
        Example:
            task = Task.find_by_ticket_id("DOIT-123")
        """
        return tasks.find_one({"ticket_id": ticket_id})
    
    
    @staticmethod
    def find_by_project(project_id: str) -> List[dict]:
        """
        Find all tasks in a project
        
        Args:
            project_id: MongoDB ObjectId as string
        
        Returns:
            List of task documents
            Sorted by created_at descending (newest first)
        
        Use Case:
            - Kanban board data
            - Project task list
        
        Example:
            tasks = Task.find_by_project("507f1f77bcf86cd799439011")
            print(f"Project has {len(tasks)} tasks")
        """
        return list(tasks.find({"project_id": project_id}).sort("created_at", -1))
    
    
    @staticmethod
    def find_by_sprint(sprint_id: str) -> List[dict]:
        """
        Find all tasks in a sprint
        
        Args:
            sprint_id: MongoDB ObjectId as string
        
        Returns:
            List of task documents
        
        Use Case:
            - Sprint board view
            - Sprint burndown chart data
        
        Example:
            sprint_tasks = Task.find_by_sprint("507f...")
            total_points = sum(t.get("story_points", 0) for t in sprint_tasks)
        """
        return list(tasks.find({"sprint_id": sprint_id}))
    
    
    @staticmethod
    def find_backlog(project_id: str) -> List[dict]:
        """
        Find all backlog tasks for a project
        
        Backlog: Tasks moved from sprint back to backlog (sprint_id changed from X to null)
        Excludes: Tasks with status "Done" or "Closed"
        
        Args:
            project_id: MongoDB ObjectId as string
        
        Returns:
            List of task documents
        
        Use Case:
            - Product backlog view
            - Sprint planning (available tasks to add to sprint)
        
        Example:
            backlog = Task.find_backlog("507f...")
            print(f"{len(backlog)} tasks in backlog")
        """
        return list(tasks.find({
            "project_id": project_id,
            "sprint_id": None,
            "status": {"$nin": ["Done", "Closed"]}
        }).sort("created_at", -1))
    
    
    @staticmethod
    def find_available_for_sprint(project_id: str) -> List[dict]:
        """
        Find tasks available to be added to a sprint
        
        Available: Tasks not assigned to any sprint (sprint_id = null)
        Excludes: Tasks with status "Done" or "Closed"
        
        Args:
            project_id: MongoDB ObjectId as string
        
        Returns:
            List of task documents
        
        Use Case:
            - Sprint planning modal (add tasks to sprint)
            - Available capacity calculation
        
        Example:
            available = Task.find_available_for_sprint("507f...")
            for task in available:
                print(f"{task['ticket_id']}: {task['title']}")
        """
        return list(tasks.find({
            "project_id": project_id,
            "sprint_id": None,
            "status": {"$nin": ["Done", "Closed"]}
        }))
    
    
    @staticmethod
    def find_by_assignee(user_id: str) -> List[dict]:
        """
        Find all tasks assigned to a user
        
        Args:
            user_id: MongoDB ObjectId as string
        
        Returns:
            List of task documents
            Sorted by created_at descending
        
        Use Case:
            - "My Tasks" page
            - User workload calculation
        
        Example:
            my_tasks = Task.find_by_assignee("507f...")
            in_progress = [t for t in my_tasks if t["status"] == "In Progress"]
        """
        return list(tasks.find({"assignee_id": user_id}).sort("created_at", -1))
    
    
    @staticmethod
    def update(task_id: str, update_data: dict) -> bool:
        """
        Update task fields
        
        Args:
            task_id: MongoDB ObjectId as string
            update_data: Dictionary of fields to update
        
        Returns:
            True if update successful, False otherwise
        
        Automatically updates:
            - updated_at: Current UTC datetime
        
        Example:
            Task.update("507f...", {
                "status": "In Progress",
                "assignee_id": "507f..."
            })
        """
        update_data["updated_at"] = datetime.utcnow()
        result = tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    
    
    @staticmethod
    def add_activity(task_id: str, activity_data: dict) -> bool:
        """
        Add activity log entry to task
        
        Activity types:
            - created: Task created
            - updated: Field updated
            - status_changed: Status changed
            - assigned: Task assigned to user
            - unassigned: Task unassigned
            - commented: Comment added
        
        Args:
            task_id: MongoDB ObjectId as string
            activity_data: Activity object
                {
                    "user_id": str,
                    "user_name": str,
                    "action": str,
                    "comment": str (optional),
                    "old_value": str (optional),
                    "new_value": str (optional),
                    "timestamp": datetime
                }
        
        Returns:
            True if activity added, False otherwise
        
        Example:
            Task.add_activity("507f...", {
                "user_id": "507f...",
                "user_name": "John Doe",
                "action": "commented",
                "comment": "This looks good!",
                "timestamp": datetime.utcnow()
            })
        """
        result = tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$push": {"activities": activity_data}}
        )
        return result.modified_count > 0
    
    
    @staticmethod
    def delete(task_id: str) -> bool:
        """
        Delete task from database
        
        Permanently removes task (not soft delete).
        
        Args:
            task_id: MongoDB ObjectId as string
        
        Returns:
            True if deleted, False otherwise
        
        Example:
            if Task.delete("507f..."):
                print("Task deleted successfully")
        """
        result = tasks.delete_one({"_id": ObjectId(task_id)})
        return result.deleted_count > 0


# Example Usage:
if __name__ == "__main__":
    # Create task
    task_id = Task.create({
        "ticket_id": "DOIT-123",
        "title": "Fix login bug",
        "project_id": "507f1f77bcf86cd799439011",
        "status": "To Do",
        "priority": "High"
    })
    
    # Find task
    task = Task.find_by_id(str(task_id))
    print(f"Created task: {task['ticket_id']} - {task['title']}")
    
    # Update task
    Task.update(str(task_id), {"status": "In Progress"})
    
    # Add activity
    Task.add_activity(str(task_id), {
        "user_id": "507f...",
        "user_name": "John Doe",
        "action": "status_changed",
        "old_value": "To Do",
        "new_value": "In Progress",
        "timestamp": datetime.utcnow()
    })
```

### Pydantic Schemas (schemas.py)

**Purpose**: Request/response validation with type hints.

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class TaskCreate(BaseModel):
    """
    Schema for task creation request
    
    All fields validated by Pydantic before reaching controller.
    Invalid requests automatically return 422 Unprocessable Entity.
    """
    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Implement login page",
                "description": "Create responsive login form with validation",
                "project_id": "507f1f77bcf86cd799439011",
                "priority": "High",
                "status": "To Do",
                "assignee_id": "507f1f77bcf86cd799439012",
                "due_date": "2024-12-31",
                "issue_type": "task",
                "labels": ["frontend", "authentication"]
            }
        }
    }
    
    title: str = Field(..., min_length=3, description="Task title (minimum 3 characters)")
    description: Optional[str] = Field("", description="Task description (supports Markdown)")
    project_id: str = Field(..., description="MongoDB ObjectId of project")
    priority: Optional[str] = Field("Medium", description="Low | Medium | High")
    status: Optional[str] = Field("To Do", description="To Do | In Progress | Testing | Dev Complete | Done")
    assignee_id: Optional[str] = Field(None, description="MongoDB ObjectId of assignee (null if unassigned)")
    due_date: Optional[str] = Field(None, description="ISO date string (YYYY-MM-DD)")
    issue_type: Optional[str] = Field("task", description="task | bug | story | epic")
    labels: Optional[List[str]] = Field([], description="Custom labels (e.g., ['frontend', 'urgent'])")


class TaskUpdate(BaseModel):
    """
    Schema for task update request
    
    All fields optional - only include fields to update
    """
    title: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None
    issue_type: Optional[str] = None
    labels: Optional[List[str]] = None
    comment: Optional[str] = Field(None, description="Optional comment for activity log")


class AddLabelRequest(BaseModel):
    """Schema for adding label to task"""
    label: str = Field(..., description="Label text (alphanumeric, underscores, hyphens)")


class AddAttachmentRequest(BaseModel):
    """Schema for adding attachment to task"""
    name: str = Field(..., description="Display name for attachment")
    url: str = Field(..., description="File URL (relative or absolute)")
    fileName: Optional[str] = Field(None, description="Original filename")
    fileType: Optional[str] = Field(None, description="MIME type (e.g., 'image/png')")
    fileSize: Optional[int] = Field(None, description="File size in bytes")


class RemoveAttachmentRequest(BaseModel):
    """Schema for removing attachment from task"""
    url: str = Field(..., description="File URL to remove")


class AddLinkRequest(BaseModel):
    """Schema for linking tasks"""
    linked_task_id: Optional[str] = Field(None, description="MongoDB ObjectId of linked task")
    linked_ticket_id: Optional[str] = Field(None, description="Ticket ID of linked task (e.g., 'DOIT-124')")
    link_type: Optional[str] = Field("related", description="blocks | blocked_by | related")
```

### Utility Functions

**Response Helper (utils/response.py):**
```python
from fastapi.responses import JSONResponse

def success_response(data: dict = None, message: str = "Success", status_code: int = 200):
    """
    Standardized success response
    
    Format:
        {
            "success": true,
            "message": "...",
            "data": {...}
        }
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": True,
            "message": message,
            **({"data": data} if data else {})
        }
    )


def error_response(message: str, status_code: int = 400):
    """
    Standardized error response
    
    Format:
        {
            "success": false,
            "error": "..."
        }
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": message
        }
    )
```

**Ticket ID Generator (utils/ticket_utils.py):**
```python
from database import projects
from bson import ObjectId

def generate_ticket_id(project_id: str, issue_type: str) -> str:
    """
    Generate unique ticket ID for task
    
    Format: <PREFIX>-<NUMBER>
    Example: "DOIT-123"
    
    Uses atomic increment on project.ticket_counter
    
    Args:
        project_id: MongoDB ObjectId as string
        issue_type: task | bug | story | epic
    
    Returns:
        Unique ticket ID string
    """
    # Increment project's ticket counter atomically
    result = projects.find_one_and_update(
        {"_id": ObjectId(project_id)},
        {"$inc": {"ticket_counter": 1}},
        return_document=True  # Return updated document
    )
    
    prefix = result.get("ticket_prefix", "TASK")
    counter = result.get("ticket_counter", 1)
    
    return f"{prefix}-{counter}"
```

**Label Validator (utils/label_utils.py):**
```python
import re

def validate_label(label: str) -> bool:
    """
    Validate label format
    
    Rules:
        - Alphanumeric characters only
        - Underscores and hyphens allowed
        - No spaces or special characters
    
    Valid: "frontend", "bug-fix", "priority_high"
    Invalid: "frontend!", "bug fix", "@urgent"
    """
    pattern = r'^[a-zA-Z0-9_-]+$'
    return bool(re.match(pattern, label))


def normalize_label(label: str) -> str:
    """
    Normalize label for consistency
    
    - Converts to lowercase
    - Trims whitespace
    - Replaces spaces with hyphens
    
    "Frontend Dev" → "frontend-dev"
    """
    return label.lower().strip().replace(" ", "-")
```

### Architecture Benefits

1. **Separation of Concerns**:
   - Router: HTTP interface (no business logic)
   - Controller: Business logic (no database code)
   - Model: Database operations (no validation)

2. **Testability**:
   - Each layer can be tested independently
   - Mock database in controller tests
   - Mock controller in router tests

3. **Reusability**:
   - Controllers can be used by multiple routers
   - Models can be used by multiple controllers
   - Utilities shared across application

4. **Maintainability**:
   - Changes to database schema only affect models
   - Changes to business logic only affect controllers
   - Changes to API contract only affect routers

5. **Type Safety**:
   - Pydantic schemas enforce types
   - FastAPI auto-generates OpenAPI docs
   - IDE autocomplete works perfectly

---

## AI Integration

### Azure AI Foundry (azure_ai_utils.py)

The backend integrates with Azure AI Foundry for advanced AI capabilities:
- **GPT-5.2-chat** (Azure OpenAI) - AI assistant for code analysis, task suggestions, project insights
- **FLUX-1.1-pro** (Azure AI) - High-quality image generation from text prompts

**Complete azure_ai_utils.py Implementation:**
```python
"""
Azure AI Foundry Integration Utilities
For GPT-5.2-chat and FLUX-1.1-pro models
"""
from openai import AzureOpenAI
import requests
import base64
from typing import List, Dict, Optional
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ========== AZURE OPENAI CONFIGURATION (GPT-5.2-chat) ========== #

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
# Example: "https://your-endpoint.openai.azure.com/"

AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
# Your Azure OpenAI API key

AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT")
# Deployment name (e.g., "gpt-5-2-chat")

AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION")
# API version (e.g., "2024-12-01-preview")


# ========== AZURE FLUX CONFIGURATION (FLUX-1.1-pro) ========== #

AZURE_FLUX_ENDPOINT = os.getenv("AZURE_FLUX_ENDPOINT")
# Example: "https://your-flux-endpoint.azure.com/v1/generate"

AZURE_FLUX_KEY = os.getenv("AZURE_FLUX_KEY")
# Your Azure AI FLUX API key

AZURE_FLUX_MODEL = os.getenv("AZURE_FLUX_MODEL")
# Model name (e.g., "FLUX-1.1-pro")


# ========== DEBUG LOGGING ========== #

print("🔍 Azure AI Configuration:")
print(f"  ENDPOINT: {AZURE_OPENAI_ENDPOINT}")
print(f"  DEPLOYMENT: {AZURE_OPENAI_DEPLOYMENT}")
print(f"  API_VERSION: {AZURE_OPENAI_API_VERSION}")
print(f"  KEY: {'✅ Loaded' if AZURE_OPENAI_KEY else '❌ Missing'}")


# ========== AZURE OPENAI CLIENT INITIALIZATION ========== #

try:
    azure_client = AzureOpenAI(
        api_version=AZURE_OPENAI_API_VERSION,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_KEY,
    )
    print("✅ Azure OpenAI client initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize Azure OpenAI client: {e}")
    azure_client = None


# ========== GPT-5.2-CHAT FUNCTIONS ========== #

def chat_completion(
    messages: List[Dict[str, str]],
    max_tokens: int = 2000,
    temperature: float = 1.0,
    stream: bool = False
) -> Dict:
    """
    Send a chat completion request to GPT-5.2-chat
    
    GPT-5.2-chat is Azure's advanced language model with:
        - Improved reasoning capabilities
        - Better code understanding
        - Enhanced context handling
        - Fixed temperature at 1.0 (model requirement)
    
    Args:
        messages: List of message dicts with 'role' and 'content'
            Example: [
                {"role": "system", "content": "You are a helpful assistant"},
                {"role": "user", "content": "Explain async/await in Python"}
            ]
        max_tokens: Maximum tokens in response (default 2000)
        temperature: Creativity level (GPT-5.2-chat only supports 1.0)
        stream: Whether to stream the response (default False)
    
    Returns:
        Response dict with content and token usage:
        {
            "content": "Response text...",
            "model": "gpt-5.2-chat",
            "tokens": {
                "prompt": 50,
                "completion": 100,
                "total": 150
            },
            "finish_reason": "stop"
        }
    
    Raises:
        Exception: If API call fails or client not initialized
    
    Example Usage:
        response = chat_completion([
            {"role": "system", "content": "You are a code reviewer"},
            {"role": "user", "content": "Review this Python code: def add(a, b): return a + b"}
        ])
        print(response["content"])
    
    Note on Temperature:
        - GPT-5.2-chat has temperature fixed at 1.0 by Azure
        - Passing temperature parameter will be ignored
        - This is a model-specific constraint
    """
    try:
        if azure_client is None:
            raise Exception("Azure OpenAI client not initialized. Check environment variables.")
        
        print(f"📤 Sending request to Azure with {len(messages)} messages...")
        
        # GPT-5.2-chat only supports temperature=1.0 (default)
        # Don't pass temperature parameter to use default
        response = azure_client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            max_completion_tokens=max_tokens,  # Note: max_completion_tokens not max_tokens
            stream=stream
        )
        
        if stream:
            return response  # Return generator for streaming
        
        print(f"📥 Received response: {response.choices[0].message.content[:100]}...")
        
        # Non-streaming response
        return {
            "content": response.choices[0].message.content,
            "model": response.model,
            "tokens": {
                "prompt": response.usage.prompt_tokens,
                "completion": response.usage.completion_tokens,
                "total": response.usage.total_tokens
            },
            "finish_reason": response.choices[0].finish_reason
        }
    
    except Exception as e:
        print(f"❌ Error in chat_completion: {str(e)}")
        print(f"   Messages sent: {messages}")
        raise


def chat_completion_streaming(
    messages: List[Dict[str, str]],
    max_tokens: int = 2000,
    temperature: float = 1.0
):
    """
    Stream chat completion responses from GPT-5.2-chat
    
    Yields chunks of response text as they arrive from the model.
    Useful for displaying responses in real-time (typewriter effect).
    
    Args:
        messages: List of message dicts
        max_tokens: Maximum tokens in response
        temperature: Creativity level (fixed at 1.0)
    
    Yields:
        String chunks of response text
    
    Example Usage:
        async def stream_response():
            for chunk in chat_completion_streaming([
                {"role": "user", "content": "Write a poem"}
            ]):
                print(chunk, end="", flush=True)
    
    Frontend Integration:
        # Backend (FastAPI)
        async def stream():
            for chunk in chat_completion_streaming(messages):
                yield f"data: {json.dumps({'text': chunk})}\\n\\n"
        
        return StreamingResponse(stream(), media_type="text/event-stream")
        
        # Frontend (React)
        const eventSource = new EventSource('/api/chat/stream');
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            appendToChat(data.text);  // Typewriter effect
        };
    """
    try:
        # GPT-5.2-chat only supports temperature=1.0 (default)
        response = azure_client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            messages=messages,
            max_completion_tokens=max_tokens,
            stream=True
        )
        
        for chunk in response:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if hasattr(delta, 'content') and delta.content:
                    yield delta.content
    
    except Exception as e:
        print(f"Error in chat_completion_streaming: {str(e)}")
        raise


# ========== FLUX-1.1-PRO IMAGE GENERATION ========== #

def generate_image(
    prompt: str,
    save_to_file: bool = True,
    output_dir: str = "uploads/ai_images"
) -> Dict:
    """
    Generate an image using FLUX-1.1-pro
    
    FLUX-1.1-pro is Azure's state-of-the-art image generation model with:
        - Photorealistic image quality
        - Excellent prompt adherence
        - Fast generation (<10 seconds)
        - High resolution (1024x1024+)
    
    Args:
        prompt: Description of image to generate
            Example: "A futuristic office with glass walls and plants"
        save_to_file: Whether to save image to disk (default True)
        output_dir: Directory to save images (default "uploads/ai_images")
    
    Returns:
        Dict with image_url, filename, and status:
        {
            "success": True,
            "image_url": "/uploads/ai_images/20240131_143022_image.png",
            "filename": "20240131_143022_image.png",
            "prompt": "A futuristic office...",
            "model": "FLUX-1.1-pro"
        }
    
    Raises:
        Exception: If API call fails
    
    Example Usage:
        result = generate_image(
            "A sleek dashboard with charts and graphs, dark theme"
        )
        print(f"Image saved to: {result['image_url']}")
    
    Use Cases:
        - Generate project mockups
        - Create presentation visuals
        - AI-assisted design ideation
        - Generate placeholder images
    
    API Details:
        - Endpoint: AZURE_FLUX_ENDPOINT
        - Method: POST
        - Authentication: API key in headers
        - Response: Base64 encoded PNG image
    """
    try:
        print(f"🎨 [FLUX] Generating image for prompt: {prompt[:50]}...")
        
        # Prepare API request
        headers = {
            "Authorization": f"Bearer {AZURE_FLUX_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "prompt": prompt,
            "model": AZURE_FLUX_MODEL,
            "num_images": 1,
            "size": "1024x1024",  # High resolution
            "quality": "standard"  # Options: draft, standard, hd
        }
        
        # Call FLUX API
        response = requests.post(
            AZURE_FLUX_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=30  # 30 second timeout
        )
        
        # Check response
        response.raise_for_status()
        result = response.json()
        
        # Extract image data (base64)
        image_base64 = result.get("data", [{}])[0].get("b64_json")
        if not image_base64:
            raise Exception("No image data in response")
        
        # Decode base64 to bytes
        image_bytes = base64.b64decode(image_base64)
        
        # Save to file if requested
        if save_to_file:
            # Create output directory if not exists
            os.makedirs(output_dir, exist_ok=True)
            
            # Generate unique filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_flux_image.png"
            filepath = os.path.join(output_dir, filename)
            
            # Write image bytes to file
            with open(filepath, "wb") as f:
                f.write(image_bytes)
            
            print(f"✅ [FLUX] Image saved to: {filepath}")
            
            # Return result with file path
            return {
                "success": True,
                "image_url": f"/{output_dir}/{filename}",  # Web-accessible URL
                "filename": filename,
                "prompt": prompt,
                "model": AZURE_FLUX_MODEL
            }
        else:
            # Return base64 data without saving
            return {
                "success": True,
                "image_base64": image_base64,
                "prompt": prompt,
                "model": AZURE_FLUX_MODEL
            }
    
    except requests.exceptions.Timeout:
        print(f"❌ [FLUX] Timeout after 30 seconds")
        raise Exception("Image generation timed out")
    except requests.exceptions.RequestException as e:
        print(f"❌ [FLUX] API request failed: {str(e)}")
        raise Exception(f"FLUX API error: {str(e)}")
    except Exception as e:
        print(f"❌ [FLUX] Unexpected error: {str(e)}")
        raise


# ========== HELPER FUNCTIONS ========== #

def estimate_tokens(text: str) -> int:
    """
    Estimate token count for text
    
    Rough estimation: 1 token ≈ 4 characters
    More accurate: Use tiktoken library
    
    Args:
        text: Input text
    
    Returns:
        Estimated token count
    
    Example:
        tokens = estimate_tokens("Hello, how are you?")
        print(f"Estimated tokens: {tokens}")
    """
    return len(text) // 4


def truncate_conversation(messages: List[Dict], max_tokens: int = 4000) -> List[Dict]:
    """
    Truncate conversation to fit within token limit
    
    Keeps system message and recent messages.
    Useful for long conversations that exceed context limit.
    
    Args:
        messages: List of message dicts
        max_tokens: Maximum total tokens
    
    Returns:
        Truncated message list
    
    Example:
        # Long conversation with 100 messages
        truncated = truncate_conversation(messages, max_tokens=4000)
        # Now only last 20 messages + system message
    """
    total_tokens = sum(estimate_tokens(m["content"]) for m in messages)
    
    if total_tokens <= max_tokens:
        return messages
    
    # Keep system message (first message)
    system_message = messages[0] if messages[0]["role"] == "system" else None
    user_messages = [m for m in messages if m["role"] != "system"]
    
    # Keep recent messages
    truncated = []
    current_tokens = 0
    
    for message in reversed(user_messages):
        msg_tokens = estimate_tokens(message["content"])
        if current_tokens + msg_tokens > max_tokens:
            break
        truncated.insert(0, message)
        current_tokens += msg_tokens
    
    # Add system message back
    if system_message:
        truncated.insert(0, system_message)
    
    print(f"⚠️  Truncated conversation: {len(messages)} → {len(truncated)} messages")
    return truncated


# ========== EXAMPLE USAGE ========== #

if __name__ == "__main__":
    # Example 1: Simple chat completion
    response = chat_completion([
        {"role": "system", "content": "You are a helpful coding assistant"},
        {"role": "user", "content": "Explain list comprehension in Python"}
    ])
    print(f"Response: {response['content']}")
    print(f"Tokens used: {response['tokens']['total']}")
    
    # Example 2: Streaming chat completion
    print("\nStreaming response:")
    for chunk in chat_completion_streaming([
        {"role": "user", "content": "Write a haiku about programming"}
    ]):
        print(chunk, end="", flush=True)
    print()
    
    # Example 3: Image generation
    result = generate_image(
        "A modern office workspace with natural lighting and plants"
    )
    print(f"\nImage generated: {result['image_url']}")
```

### AI Use Cases in DOIT

**1. AI Code Assistant:**
- Analyze project code and suggest improvements
- Generate code snippets from requirements
- Explain complex code to team members
- Identify potential bugs and security issues

**2. Task Intelligence:**
- Auto-generate task descriptions from high-level requirements
- Suggest task priorities based on dependencies
- Estimate task complexity and time
- Recommend optimal task assignments

**3. Project Insights:**
- Analyze sprint performance and suggest improvements
- Identify bottlenecks in workflow
- Generate project status reports
- Predict project timeline and risks

**4. Visual Generation:**
- Generate mockups from text descriptions
- Create presentation visuals
- Generate project diagrams
- Design placeholders and icons

### AI Integration in Controllers

**Example: AI Assistant Controller (chat_controller.py):**
```python
from utils.azure_ai_utils import chat_completion, chat_completion_streaming, generate_image
from models.ai_conversation import AIConversation
from models.ai_message import AIMessage

def chat_with_ai(user_id: str, message: str, conversation_id: str = None):
    """
    Chat with GPT-5.2-chat AI assistant
    
    Args:
        user_id: User ID
        message: User's message
        conversation_id: Existing conversation ID (or None for new)
    
    Returns:
        AI response with conversation ID
    """
    try:
        # Create or load conversation
        if conversation_id:
            conversation = AIConversation.find_by_id(conversation_id)
            messages = AIMessage.find_by_conversation(conversation_id)
        else:
            conversation_id = AIConversation.create({
                "user_id": user_id,
                "title": message[:50],  # First 50 chars as title
                "model": "gpt-5.2-chat",
                "created_at": datetime.utcnow()
            })
            messages = []
        
        # Build message history
        message_history = [
            {"role": "system", "content": "You are a helpful AI assistant for project management"}
        ]
        for msg in messages:
            message_history.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        message_history.append({
            "role": "user",
            "content": message
        })
        
        # Call Azure OpenAI
        response = chat_completion(message_history, max_tokens=1000)
        
        # Save user message
        AIMessage.create({
            "conversation_id": conversation_id,
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow()
        })
        
        # Save AI response
        AIMessage.create({
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": response["content"],
            "tokens": response["tokens"],
            "timestamp": datetime.utcnow()
        })
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "response": response["content"],
            "tokens": response["tokens"]
        }
    
    except Exception as e:
        print(f"Error in chat_with_ai: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def generate_project_visual(user_id: str, description: str):
    """
    Generate visual mockup using FLUX-1.1-pro
    
    Args:
        user_id: User ID
        description: Text description of visual
    
    Returns:
        Image URL and metadata
    """
    try:
        # Generate image
        result = generate_image(description)
        
        return {
            "success": True,
            "image_url": result["image_url"],
            "filename": result["filename"],
            "prompt": description
        }
    
    except Exception as e:
        print(f"Error in generate_project_visual: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
```

### Environment Variables (.env)

**Required AI Configuration:**
```env
# Azure OpenAI (GPT-5.2-chat)
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
AZURE_OPENAI_KEY=YOUR_AZURE_OPENAI_API_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-5-2-chat
AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Azure AI FLUX (FLUX-1.1-pro)
AZURE_FLUX_ENDPOINT=https://YOUR_FLUX_RESOURCE.azure.com/v1/generate
AZURE_FLUX_KEY=YOUR_FLUX_API_KEY
AZURE_FLUX_MODEL=FLUX-1.1-pro

# Optional: Other AI Services
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
GOOGLE_GEMINI_API_KEY=YOUR_GEMINI_KEY
```

### AI Cost Optimization

**Token Usage Tracking:**
```python
def track_ai_usage(user_id: str, model: str, tokens: dict):
    """Track AI API usage for cost monitoring"""
    usage_log = {
        "user_id": user_id,
        "model": model,
        "prompt_tokens": tokens["prompt"],
        "completion_tokens": tokens["completion"],
        "total_tokens": tokens["total"],
        "cost_estimate": calculate_cost(model, tokens["total"]),
        "timestamp": datetime.utcnow()
    }
    
    db["ai_usage"].insert_one(usage_log)


def calculate_cost(model: str, tokens: int) -> float:
    """
    Estimate API cost based on model and token count
    
    Pricing (as of 2024):
        - GPT-5.2-chat: $0.03 per 1K prompt tokens, $0.06 per 1K completion tokens
        - FLUX-1.1-pro: $0.04 per image
    """
    if model == "gpt-5.2-chat":
        # Assuming average 50/50 prompt/completion split
        return (tokens / 1000) * 0.045
    elif model == "FLUX-1.1-pro":
        return 0.04
    return 0.0
```

**Caching Strategy:**
```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def cached_ai_response(prompt_hash: str):
    """
    Cache AI responses to avoid duplicate API calls
    
    If same prompt asked multiple times, return cached result
    """
    return db["ai_cache"].find_one({"prompt_hash": prompt_hash})


def get_or_generate_response(prompt: str):
    """Get cached response or generate new one"""
    prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()
    
    # Check cache
    cached = cached_ai_response(prompt_hash)
    if cached:
        print("✅ [CACHE HIT] Returning cached AI response")
        return cached["response"]
    
    # Generate new response
    response = chat_completion([
        {"role": "user", "content": prompt}
    ])
    
    # Save to cache
    db["ai_cache"].insert_one({
        "prompt_hash": prompt_hash,
        "prompt": prompt,
        "response": response["content"],
        "timestamp": datetime.utcnow()
    })
    
    return response["content"]
```

---

## WebSocket Management

### Connection Manager (utils/websocket_manager.py)

The WebSocket manager implements a channel-based architecture for real-time communication. Multiple users can connect to the same channel (e.g., Kanban board for a project) and receive live updates.

**Complete ConnectionManager Implementation:**
```python
from fastapi import WebSocket
from typing import Dict, Set
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time communication
    
    Architecture:
        - Channel-based: Each channel has multiple users
        - User tracking: Each user can be in multiple channels
        - Automatic cleanup: Removes disconnected users
    
    Data Structures:
        active_connections: {
            "kanban_project123": {
                "user456": WebSocket,
                "user789": WebSocket
            },
            "chat_general": {
                "user456": WebSocket,
                "user012": WebSocket
            }
        }
        
        user_channels: {
            "user456": {"kanban_project123", "chat_general"},
            "user789": {"kanban_project123"},
            "user012": {"chat_general"}
        }
    
    Use Cases:
        - Kanban board real-time updates (taskchanged, task moved)
        - Team chat messaging (new messages)
        - System notifications (project updates)
        - Live collaboration (who's viewing/editing)
    """
    
    def __init__(self):
        # {channel_id: {user_id: WebSocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        
        # {user_id: Set[channel_id]} - Track which channels each user is in
        self.user_channels: Dict[str, Set[str]] = {}
        
        logger.info("✅ ConnectionManager initialized")
    
    
    async def connect(self, websocket: WebSocket, channel_id: str, user_id: str):
        """
        Connect user to a channel
        
        Steps:
            1. Accept WebSocket connection
            2. Create channel if not exists
            3. Add user to channel
            4. Track user's channels for cleanup
            5. Log connection
        
        Args:
            websocket: FastAPI WebSocket instance
            channel_id: Channel identifier (e.g., "kanban_project123")
            user_id: User's MongoDB ObjectId as string
        
        Example:
            await manager.connect(websocket, "kanban_project123", "user456")
        """
        # Accept WebSocket connection
        await websocket.accept()
        
        # Create channel if not exists
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = {}
            logger.info(f"📡 [WS] Created channel: {channel_id}")
        
        # Add user to channel
        self.active_connections[channel_id][user_id] = websocket
        
        # Track user's channels (for cleanup when user disconnects)
        if user_id not in self.user_channels:
            self.user_channels[user_id] = set()
        self.user_channels[user_id].add(channel_id)
        
        logger.info(f"✅ [WS] User {user_id} connected to {channel_id}")
        logger.info(f"   [WS] Channel {channel_id} now has {len(self.active_connections[channel_id])} users")
    
    
    def disconnect(self, channel_id: str, user_id: str):
        """
        Disconnect user from a channel
        
        Steps:
            1. Remove user from channel
            2. Remove channel from user's set
            3. Clean up empty channel
            4. Clean up user if no channels left
            5. Log disconnection
        
        Args:
            channel_id: Channel identifier
            user_id: User's MongoDB ObjectId as string
        
        Example:
            manager.disconnect("kanban_project123", "user456")
        """
        # Remove user from channel
        if channel_id in self.active_connections:
            if user_id in self.active_connections[channel_id]:
                del self.active_connections[channel_id][user_id]
                logger.info(f"🔌 [WS] User {user_id} disconnected from {channel_id}")
            
            # Clean up empty channel
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]
                logger.info(f"🗑️  [WS] Deleted empty channel: {channel_id}")
        
        # Remove channel from user's set
        if user_id in self.user_channels:
            self.user_channels[user_id].discard(channel_id)
            
            # Clean up user if no channels left
            if not self.user_channels[user_id]:
                del self.user_channels[user_id]
                logger.info(f"🗑️  [WS] Removed user from tracking: {user_id}")
    
    
    def disconnect_user(self, user_id: str):
        """
        Disconnect user from ALL channels
        
        Use Cases:
            - User logs out
            - User session expires
            - Admin forces disconnect
        
        Args:
            user_id: User's MongoDB ObjectId as string
        
        Example:
            manager.disconnect_user("user456")
            # User removed from all channels they were in
        """
        if user_id not in self.user_channels:
            return
        
        # Get copy of channel set (to avoid modification during iteration)
        channels_to_disconnect = self.user_channels[user_id].copy()
        
        # Disconnect from each channel
        for channel_id in channels_to_disconnect:
            self.disconnect(channel_id, user_id)
        
        logger.info(f"🔌 [WS] User {user_id} disconnected from all channels")
    
    
    async def send_personal_message(self, message: dict, channel_id: str, user_id: str):
        """
        Send message to specific user in channel
        
        Use Cases:
            - Private notifications
            - Direct messages
            - User-specific updates
        
        Args:
            message: Dictionary to send (will be JSON encoded)
            channel_id: Channel identifier
            user_id: Target user's MongoDB ObjectId as string
        
        Example:
            await manager.send_personal_message(
                {"type": "notification", "text": "Task assigned to you"},
                "kanban_project123",
                "user456"
            )
        """
        if channel_id in self.active_connections:
            if user_id in self.active_connections[channel_id]:
                try:
                    websocket = self.active_connections[channel_id][user_id]
                    await websocket.send_json(message)
                    logger.info(f"📤 [WS] Sent personal message to {user_id} in {channel_id}")
                except Exception as e:
                    logger.error(f"❌ [WS] Failed to send to {user_id}: {str(e)}")
                    # Disconnect broken connection
                    self.disconnect(channel_id, user_id)
    
    
    async def broadcast_to_channel(self, message: dict, channel_id: str, exclude_user: str = None):
        """
        Broadcast message to all users in channel
        
        Most common WebSocket operation for real-time updates.
        
        Use Cases:
            - Kanban: Broadcast task_created, task_updated, task_deleted
            - Chat: Broadcast new messages
            - Notifications: Broadcast system alerts
        
        Args:
            message: Dictionary to send (will be JSON encoded)
            channel_id: Channel identifier
            exclude_user: Optional user ID to exclude (e.g., sender)
        
        Example:
            # User A moves task in Kanban
            # Backend broadcasts update to User B, C, D (exclude User A)
            await manager.broadcast_to_channel(
                {
                    "type": "task_updated",
                    "task": {...updated task...}
                },
                "kanban_project123",
                exclude_user="userA"
            )
        """
        if channel_id not in self.active_connections:
            logger.warning(f"⚠️  [WS] Broadcast to non-existent channel: {channel_id}")
            return
        
        # Get all users in channel
        users = self.active_connections[channel_id].copy()  # Copy to avoid modification during iteration
        
        # Track failed sends for cleanup
        disconnected_users = []
        
        # Send to each user
        for user_id, websocket in users.items():
            # Skip excluded user (e.g., sender)
            if user_id == exclude_user:
                continue
            
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"❌ [WS] Failed to send to {user_id}: {str(e)}")
                disconnected_users.append(user_id)
        
        # Clean up disconnected users
        for user_id in disconnected_users:
            self.disconnect(channel_id, user_id)
        
        sent_count = len(users) - len(disconnected_users) - (1 if exclude_user in users else 0)
        logger.info(f"📡 [WS] Broadcast to {sent_count} users in {channel_id}")
    
    
    async def broadcast_to_all_channels(self, message: dict, project_id: str):
        """
        Broadcast message to ALL channels related to a project
        
        Use Cases:
            - Project-wide notifications
            - System updates affecting entire project
            - Admin announcements
        
        Args:
            message: Dictionary to send
            project_id: Project identifier
        
        Example:
            # Project deleted, notify all users in all project channels
            await manager.broadcast_to_all_channels(
                {"type": "project_deleted", "project_id": "project123"},
                "project123"
            )
        """
        # Find all channels related to project
        project_channels = [
            channel_id for channel_id in self.active_connections.keys()
            if project_id in channel_id
        ]
        
        # Broadcast to each channel
        for channel_id in project_channels:
            await self.broadcast_to_channel(message, channel_id)
        
        logger.info(f"📡 [WS] Broadcast to {len(project_channels)} channels for project {project_id}")
    
    
    def get_channel_users(self, channel_id: str) -> list:
        """
        Get list of user IDs connected to channel
        
        Use Cases:
            - Show "who's online" in UI
            - Check if specific user is viewing
            - Analytics (active users count)
        
        Args:
            channel_id: Channel identifier
        
        Returns:
            List of user IDs (MongoDB ObjectId strings)
        
        Example:
            users = manager.get_channel_users("kanban_project123")
            print(f"{len(users)} users viewing Kanban board")
        """
        if channel_id not in self.active_connections:
            return []
        return list(self.active_connections[channel_id].keys())
    
    
    def get_user_count(self, channel_id: str) -> int:
        """
        Get count of users in channel
        
        Args:
            channel_id: Channel identifier
        
        Returns:
            Number of connected users
        
        Example:
            count = manager.get_user_count("kanban_project123")
            if count > 5:
                print("Many users viewing board - high activity!")
        """
        if channel_id not in self.active_connections:
            return 0
        return len(self.active_connections[channel_id])
    
    
    def is_user_connected(self, channel_id: str, user_id: str) -> bool:
        """
        Check if specific user is connected to channel
        
        Use Cases:
            - Check if user is online before sending notification
            - Prevent duplicate connections
            - UI presence indicators
        
        Args:
            channel_id: Channel identifier
            user_id: User's MongoDB ObjectId as string
        
        Returns:
            True if user connected, False otherwise
        
        Example:
            if manager.is_user_connected("kanban_project123", "user456"):
                # User is viewing Kanban, updates will be real-time
            else:
                # User not viewing, send push notification instead
        """
        if channel_id not in self.active_connections:
            return False
        return user_id in self.active_connections[channel_id]


# Global singleton instance
manager = ConnectionManager()
```

### WebSocket Usage Examples

**Example 1: Kanban Board Real-Time Updates**
```python
# In task_router.py
@router.websocket("/ws/project/{project_id}")
async def kanban_websocket(websocket: WebSocket, project_id: str, token: str):
    """WebSocket endpoint for Kanban board"""
    # Verify authentication
    user_id = verify_token_for_websocket(token)
    if not user_id:
        await websocket.close(code=1008)
        return
    
    # Verify project membership
    if not Project.is_member(project_id, user_id):
        await websocket.close(code=1008)
        return
    
    # Connect to Kanban channel
    channel_id = f"kanban_{project_id}"
    await manager.connect(websocket, channel_id, user_id)
    
    try:
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to Kanban board",
            "online_users": manager.get_user_count(channel_id)
        })
        
        # Keep connection alive
        while True:
            data = await websocket.receive_json()
            
            # Handle heartbeat
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        manager.disconnect(channel_id, user_id)
    except Exception as e:
        print(f"Error: {str(e)}")
        manager.disconnect(channel_id, user_id)


# In task_controller.py (when task updated)
def update_task(task_id, update_data, user_id):
    # ... update task in database ...
    
    # Broadcast to WebSocket channel
    channel_id = f"kanban_{project_id}"
    asyncio.create_task(
        manager.broadcast_to_channel(
            {
                "type": "task_updated",
                "task": updated_task,
                "updated_by": user_id
            },
            channel_id,
            exclude_user=user_id  # Don't send back to sender
        )
    )
```

**Example 2: Team Chat Real-Time Messaging**
```python
# In team_chat_router.py
@router.websocket("/ws/channel/{channel_id}")
async def chat_websocket(websocket: WebSocket, channel_id: str, token: str):
    """WebSocket endpoint for team chat"""
    # Verify authentication
    user_id = verify_token_for_websocket(token)
    if not user_id:
        await websocket.close(code=1008)
        return
    
    # Verify channel membership
    from models.channel import Channel
    if not Channel.is_member(channel_id, user_id):
        await websocket.close(code=1008)
        return
    
    # Connect to chat channel
    ws_channel_id = f"chat_{channel_id}"
    await manager.connect(websocket, ws_channel_id, user_id)
    
    try:
        # Send connection confirmation + online users
        online_users = manager.get_channel_users(ws_channel_id)
        await websocket.send_json({
            "type": "connection",
            "message": "Connected to chat",
            "online_users": online_users
        })
        
        # Notify others that user joined
        await manager.broadcast_to_channel(
            {
                "type": "user_joined",
                "user_id": user_id
            },
            ws_channel_id,
            exclude_user=user_id
        )
        
        # Listen for messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                # Save message to database
                message = Message.create({
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "message": data["message"],
                    "timestamp": datetime.utcnow()
                })
                
                # Broadcast to all users in channel
                await manager.broadcast_to_channel(
                    {
                        "type": "new_message",
                        "message": message
                    },
                    ws_channel_id
                )
    
    except WebSocketDisconnect:
        manager.disconnect(ws_channel_id, user_id)
        # Notify others that user left
        await manager.broadcast_to_channel(
            {"type": "user_left", "user_id": user_id},
            ws_channel_id
        )
```

**Example 3: System Notifications**
```python
# In notification service
async def send_system_notification(user_id: str, notification: dict):
    """
    Send notification to user if they're online
    Otherwise save to database for later retrieval
    """
    # Check if user is connected to any channel
    is_online = user_id in manager.user_channels and len(manager.user_channels[user_id]) > 0
    
    if is_online:
        # Send real-time notification to all user's channels
        for channel_id in manager.user_channels[user_id]:
            await manager.send_personal_message(
                {
                    "type": "notification",
                    "notification": notification
                },
                channel_id,
                user_id
            )
    else:
        # User offline, save to database
        Notification.create({
            "user_id": user_id,
            "notification": notification,
            "read": False,
            "created_at": datetime.utcnow()
        })
```

### WebSocket Security

**Authentication:**
- Token passed as query parameter (WebSocket can't send custom headers)
- Token verified using `verify_token_for_websocket()`
- Channel membership validated before connection
- Invalid connections closed with code 1008 (Policy Violation)

**Connection Lifecycle:**
```
1. Client initiates WebSocket connection
   - ws://localhost:8000/api/tasks/ws/project/ABC123?token=eyJhbGci...
   ↓
2. Server verifies JWT token
   - Decodes token, checks expiration
   ↓
3. Server verifies project membership
   - Checks if user is project member
   ↓
4. Server calls manager.connect()
   - Accepts WebSocket connection
   - Adds user to channel
   ↓
5. Server sends connection confirmation
   - {"type": "connection", "message": "Connected"}
   ↓
6. Connection stays open (bidirectional)
   - Client → Server: ping, data
   - Server → Client: pong, broadcasts
   ↓
7. Connection closes
   - User closes tab/browser
   - Network error
   - Token expires
   ↓
8. Server calls manager.disconnect()
   - Removes user from channel
   - Cleans up empty channels
```

**Error Handling:**
- Broken connections automatically detected during send
- Failed sends trigger disconnection cleanup
- Exceptions logged but don't crash server
- Heartbeat (ping/pong) prevents timeout

### WebSocket vs HTTP

**When to use WebSocket:**
- Real-time updates (Kanban board, chat)
- Live collaboration (multiple users editing)
- High-frequency updates (stock ticker, live dashboard)
- Bi-directional communication (server push + client send)

**When to use HTTP:**
- One-time data fetch (get task details)
- CRUD operations with no real-time needs
- File uploads
- Authentication (initial login)

**Performance Comparison:**
```
HTTP Request:
- Client opens connection
- Client sends request (headers + body)
- Server processes
- Server sends response (headers + body)
- Client closes connection
Total: ~100-500ms per request

WebSocket (after initial connection):
- Server pushes update (payload only)
Total: ~10-50ms per update
- No connection overhead
- No HTTP headers waste
- Persistent connection

---

## Middleware

### Role-Based Access Control (role_middleware.py)

```python
from fastapi import HTTPException
from models.user import User

# Role hierarchy for permission checking
ROLE_HIERARCHY = {
    "super-admin": 5,
    "admin": 4,
    "manager": 3,
    "member": 2,
    "viewer": 1
}

def require_role(required_role: str):
    """
    Decorator to require minimum role level
    
    Args:
        required_role: Minimum required role
    
    Example:
        @require_role("admin")
        def delete_project(project_id, user_id):
            # Only admin and super-admin can execute
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user_id = kwargs.get("user_id") or kwargs.get("current_user")
            user = User.get_by_id(current_user_id)
            
            user_level = ROLE_HIERARCHY.get(user["role"], 0)
            required_level = ROLE_HIERARCHY.get(required_role, 0)
            
            if user_level < required_level:
                raise HTTPException(
                    status_code=403,
                    detail=f"Requires {required_role} role or higher"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

---

## File Processing

### PDF Text Extraction (PyPDF2)

**Extract text from PDF for AI analysis:**
```python
from PyPDF2 import PdfReader
from typing import List, Dict

def extract_text_from_pdf(file_path: str) -> Dict:
    """
    Extract text from PDF file
    
    Args:
        file_path: Path to PDF file
    
    Returns:
        {
            "success": True,
            "text": "Extracted text...",
            "pages": 5,
            "metadata": {...}
        }
    
    Use Cases:
        - Extract requirements from PDF documents
        - Parse project specifications
        - Analyze uploaded documentation
        - Feed to AI for summarization
    
    Example:
        result = extract_text_from_pdf("uploads/requirements.pdf")
        # Send to AI for analysis
        ai_response = chat_completion([
            {"role": "user", "content": f"Summarize this document: {result['text']}"}
        ])
    """
    try:
        reader = PdfReader(file_path)
        
        # Extract text from all pages
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n\n"
        
        # Extract metadata
        metadata = {
            "title": reader.metadata.get("/Title", "Unknown"),
            "author": reader.metadata.get("/Author", "Unknown"),
            "pages": len(reader.pages)
        }
        
        return {
            "success": True,
            "text": text.strip(),
            "pages": len(reader.pages),
            "metadata": metadata
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

### Word Document Processing (python-docx)

**Extract content from .docx files:**
```python
from docx import Document
from typing import List

def extract_text_from_docx(file_path: str) -> Dict:
    """
    Extract text from Word document
    
    Args:
        file_path: Path to .docx file
    
    Returns:
        {
            "success": True,
            "text": "Document text...",
            "paragraphs": 20,
            "tables": 3
        }
    
    Use Cases:
        - Parse project proposals
        - Extract requirements from specifications
        - Import documentation
    
    Example:
        result = extract_text_from_docx("uploads/project_spec.docx")
        # Generate tasks from document
        tasks = generate_tasks_from_text(result['text'])
    """
    try:
        doc = Document(file_path)
        
        # Extract paragraphs
        paragraphs = []
        for para in doc.paragraphs:
            if para.text.strip():
                paragraphs.append(para.text)
        
        # Extract tables
        tables = []
        for table in doc.tables:
            table_data = []
            for row in table.rows:
                row_data = [cell.text for cell in row.cells]
                table_data.append(row_data)
            tables.append(table_data)
        
        return {
            "success": True,
            "text": "\n\n".join(paragraphs),
            "paragraphs": len(paragraphs),
            "tables": len(tables),
            "table_data": tables
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

### CSV Data Processing

**Parse CSV for data visualization:**
```python
import csv
from typing import List, Dict

def parse_csv(file_path: str) -> Dict:
    """
    Parse CSV file for data visualization
    
    Args:
        file_path: Path to CSV file
    
    Returns:
        {
            "success": True,
            "headers": ["Name", "Age", "Department"],
            "rows": [["John", "30", "Engineering"], ...],
            "row_count": 100
        }
    
    Use Cases:
        - Import task lists
        - Parse dataset for visualization
        - Bulk task creation from CSV
    
    Example:
        result = parse_csv("uploads/tasks.csv")
        # Create tasks from CSV rows
        for row in result['rows']:
            create_task({
                "title": row[0],
                "description": row[1],
                "assignee": row[2]
            })
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames
            rows = list(reader)
        
        return {
            "success": True,
            "headers": headers,
            "rows": rows,
            "row_count": len(rows)
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
```

---

## Pydantic Schemas (Complete Reference)

### Authentication Schemas

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterRequest(BaseModel):
    """User registration request"""
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "password": "Password123!",
                "confirm_password": "Password123!"
            }
        }
    }
    
    name: str = Field(..., min_length=3, max_length=30, description="Full name")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password")
    confirm_password: Optional[str] = Field(None, description="Password confirmation")


class LoginRequest(BaseModel):
    """User login request"""
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "john@example.com",
                "password": "Password123!"
            }
        }
    }
    
    email: EmailStr
    password: str


class ClerkSyncRequest(BaseModel):
    """Clerk authentication sync"""
    clerk_token: str
    email: EmailStr
    name: str
    clerk_user_id: str


class LogoutRequest(BaseModel):
    """Logout request"""
    token_id: str = Field(..., description="Token ID to revoke")


class ChangePasswordRequest(BaseModel):
    """Change password request"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")
    confirm_password: Optional[str] = Field(None, description="Confirm new password")
```

### Project Schemas

```python
class ProjectCreate(BaseModel):
    """Create project request"""
    name: str = Field(..., min_length=3, description="Project name")
    description: Optional[str] = Field("", description="Project description")
    ticket_prefix: Optional[str] = Field(None, description="Ticket prefix (e.g., DOIT)")


class ProjectUpdate(BaseModel):
    """Update project request"""
    name: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = None


class AddMemberRequest(BaseModel):
    """Add member to project"""
    email: EmailStr = Field(..., description="Member email address")
    role: Optional[str] = Field("member", description="admin | member")
```

### Sprint Schemas

```python
from datetime import date

class SprintCreate(BaseModel):
    """Create sprint request"""
    name: str = Field(..., min_length=3, description="Sprint name")
    project_id: str = Field(..., description="Project ID")
    start_date: str = Field(..., description="ISO date (YYYY-MM-DD)")
    end_date: str = Field(..., description="ISO date (YYYY-MM-DD)")
    goal: Optional[str] = Field("", description="Sprint goal")


class SprintUpdate(BaseModel):
    """Update sprint request"""
    name: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    goal: Optional[str] = None
    status: Optional[str] = Field(None, description="active | completed | planned")


class AddTaskToSprintRequest(BaseModel):
    """Add task to sprint"""
    task_id: str = Field(..., description="Task ObjectId")
```

---

## Validation & Utilities

### Validators (utils/validators.py)

```python
from bson import ObjectId
from bson.errors import InvalidId
import re

def validate_object_id(id_string: str) -> bool:
    """
    Validate MongoDB ObjectId format
    
    Args:
        id_string: String to validate
    
    Returns:
        True if valid ObjectId, False otherwise
    
    Example:
        if validate_object_id("507f1f77bcf86cd799439011"):
            # Valid ObjectId
        else:
            # Invalid
    """
    try:
        ObjectId(id_string)
        return True
    except (InvalidId, TypeError):
        return False


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength
    
    Requirements:
        - Minimum 8 characters
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special character
    
    Returns:
        (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain digit"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain special character"
    
    return True, ""


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename for safe storage
    
    Removes special characters and spaces
    
    Example:
        sanitize_filename("My File (1).pdf")
        # Returns: "My_File_1.pdf"
    """
    # Remove special characters except dots, underscores, hyphens
    filename = re.sub(r'[^\w\s.-]', '', filename)
    # Replace spaces with underscores
    filename = filename.replace(' ', '_')
    # Remove consecutive dots
    filename = re.sub(r'\.+', '.', filename)
    return filename
```

---

## Error Handling & Logging

### Global Exception Handlers

```python
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import traceback
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/backend.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Handle FastAPI HTTP exceptions
    
    Returns consistent JSON error format
    """
    logger.warning(f"HTTP Exception: {exc.status_code} - {exc.detail} - {request.url.path}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path),
            "method": request.method
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler for unexpected errors
    
    Logs full traceback for debugging
    Returns generic error to client (hide internal details)
    """
    logger.error(f"Unhandled Exception: {str(exc)}")
    logger.error(f"Path: {request.url.path}")
    logger.error(f"Method: {request.method}")
    logger.error(traceback.format_exc())
    
    # Send alert for critical errors (email, Slack, etc.)
    if should_alert(exc):
        send_error_alert(exc, request)
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "details": str(exc) if app.debug else "An unexpected error occurred",
            "path": str(request.url.path),
            "method": request.method
        }
    )


def should_alert(exc: Exception) -> bool:
    """Determine if error should trigger alert"""
    critical_errors = [
        "DatabaseError",
        "ConnectionError",
        "SecurityError"
    ]
    return any(error in str(type(exc)) for error in critical_errors)


def send_error_alert(exc: Exception, request: Request):
    """Send error alert to admin (email, Slack, etc.)"""
    # Implementation: Send email, Slack message, etc.
    pass
```

### Request/Response Logging Middleware

```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Log all incoming requests and outgoing responses
    
    Logs:
        - Request method and path
        - Request body (if present)
        - Response status code
        - Request duration
    """
    import time
    
    start_time = time.time()
    
    # Log request
    logger.info(f"📥 {request.method} {request.url.path}")
    
    # Log request body for POST/PUT (truncate if large)
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if len(body) > 0:
                body_str = body.decode()[:200]  # First 200 chars
                logger.info(f"   Body: {body_str}...")
        except:
            pass
    
    # Process request
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        # Log response
        logger.info(f"📤 {request.method} {request.url.path} - {response.status_code} ({duration:.2f}s)")
        
        return response
    
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"❌ {request.method} {request.url.path} - ERROR ({duration:.2f}s)")
        logger.error(f"   Error: {str(e)}")
        raise
```

---

## Performance Optimizations

### Database Indexing

```python
from database import users, projects, tasks, sprints, messages

def create_database_indexes():
    """
    Create indexes for frequently queried fields
    
    Run this during application startup or as migration script
    
    Performance Impact:
        - Without indexes: O(n) full collection scan
        - With indexes: O(log n) index lookup
        - 10-100x faster queries on large collections
    """
    print("📊 Creating database indexes...")
    
    # User indexes
    users.create_index("email", unique=True)  # Unique constraint + fast lookup
    users.create_index("role")  # Role-based queries
    users.create_index([("email", 1), ("role", 1)])  # Composite index
    
    # Project indexes
    projects.create_index("name")
    projects.create_index("created_by")
    projects.create_index("members.user_id")  # Nested field index
    projects.create_index([("created_by", 1), ("name", 1)])  # Composite
    
    # Task indexes (CRITICAL for Kanban performance)
    tasks.create_index("ticket_id", unique=True)  # Unique ticket IDs
    tasks.create_index("project_id")  # Project-based queries
    tasks.create_index("sprint_id")  # Sprint-based queries
    tasks.create_index("assignee_id")  # User task queries
    tasks.create_index("status")  # Status filtering
    tasks.create_index("priority")  # Priority sorting
    # Composite indexes for common query patterns
    tasks.create_index([("project_id", 1), ("status", 1)])  # Kanban board
    tasks.create_index([("project_id", 1), ("sprint_id", 1)])  # Sprint board
    tasks.create_index([("assignee_id", 1), ("status", 1)])  # My tasks
    
    # Sprint indexes
    sprints.create_index("project_id")
    sprints.create_index("status")
    sprints.create_index([("project_id", 1), ("status", 1)])  # Active sprint
    
    # Message indexes (for team chat)
    messages.create_index("channel_id")
    messages.create_index("timestamp")
    messages.create_index([("channel_id", 1), ("timestamp", -1)])  # Latest messages
    
    print("✅ Database indexes created")


# Run during application startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_database_indexes()  # Create indexes on startup
    yield
```

### Response Caching

```python
from functools import lru_cache
from datetime import datetime, timedelta

# In-memory cache for frequently accessed data
_cache = {}
_cache_expiry = {}

def cache_response(key: str, data: any, ttl_seconds: int = 60):
    """
    Cache response data in memory
    
    Args:
        key: Cache key
        data: Data to cache
        ttl_seconds: Time to live in seconds
    """
    _cache[key] = data
    _cache_expiry[key] = datetime.utcnow() + timedelta(seconds=ttl_seconds)


def get_cached_response(key: str) -> any:
    """
    Get cached response
    
    Returns:
        Cached data or None if expired/not found
    """
    if key not in _cache:
        return None
    
    # Check expiry
    if datetime.utcnow() > _cache_expiry.get(key, datetime.utcnow()):
        # Expired, remove from cache
        del _cache[key]
        del _cache_expiry[key]
        return None
    
    return _cache[key]


def clear_cache(pattern: str = None):
    """Clear cache entries matching pattern"""
    if pattern is None:
        _cache.clear()
        _cache_expiry.clear()
    else:
        keys_to_delete = [k for k in _cache.keys() if pattern in k]
        for key in keys_to_delete:
            del _cache[key]
            del _cache_expiry[key]


# Example usage in controller
def get_project_dashboard(project_id: str, user_id: str):
    """Get project dashboard with caching"""
    cache_key = f"dashboard_{project_id}"
    
    # Check cache
    cached = get_cached_response(cache_key)
    if cached:
        logger.info(f"✅ [CACHE HIT] Dashboard for project {project_id}")
        return cached
    
    # Generate dashboard data
    logger.info(f"🔄 [CACHE MISS] Generating dashboard for project {project_id}")
    dashboard_data = {
        "tasks": Task.find_by_project(project_id),
        "sprints": Sprint.find_by_project(project_id),
        "members": Project.get_members(project_id),
        "statistics": calculate_project_statistics(project_id)
    }
    
    # Cache for 60 seconds
    cache_response(cache_key, dashboard_data, ttl_seconds=60)
    
    return dashboard_data
```

### Pagination

```python
from fastapi import Query
from typing import List, Dict

def paginate_results(
    collection: any,
    filters: dict,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "created_at",
    sort_order: int = -1  # -1 for descending, 1 for ascending
) -> Dict:
    """
    Paginate database results
    
    Args:
        collection: MongoDB collection
        filters: Query filters
        page: Page number (1-indexed)
        limit: Items per page
        sort_by: Field to sort by
        sort_order: Sort direction
    
    Returns:
        {
            "items": [...],
            "total": 100,
            "page": 1,
            "pages": 5,
            "has_next": True,
            "has_prev": False
        }
    
    Example:
        @router.get("/tasks")
        async def get_tasks(
            page: int = Query(1, ge=1),
            limit: int = Query(20, ge=1, le=100)
        ):
            return paginate_results(tasks, {}, page, limit)
    """
    # Calculate skip
    skip = (page - 1) * limit
    
    # Get total count
    total = collection.count_documents(filters)
    
    # Get paginated results
    items = list(
        collection.find(filters)
        .sort(sort_by, sort_order)
        .skip(skip)
        .limit(limit)
    )
    
    # Calculate pagination metadata
    total_pages = (total + limit - 1) // limit  # Ceiling division
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
```

---

## Testing

### Unit Tests (pytest)

```python
import pytest
from controllers import task_controller
from models.task import Task

def test_create_task():
    """Test task creation"""
    task_data = {
        "title": "Test Task",
        "project_id": "507f1f77bcf86cd799439011",
        "status": "To Do",
        "priority": "Medium"
    }
    
    result = task_controller.create_task(
        json.dumps(task_data),
        user_id="507f1f77bcf86cd799439012"
    )
    
    assert result["success"] == True
    assert "task" in result
    assert result["task"]["title"] == "Test Task"


def test_validate_object_id():
    """Test ObjectId validation"""
    assert validate_object_id("507f1f77bcf86cd799439011") == True
    assert validate_object_id("invalid") == False
    assert validate_object_id("") == False


@pytest.mark.asyncio
async def test_websocket_connection():
    """Test WebSocket connection"""
    from utils.websocket_manager import manager
    
    # Mock WebSocket
    class MockWebSocket:
        async def accept(self):
            pass
        async def send_json(self, data):
            self.last_message = data
    
    ws = MockWebSocket()
    await manager.connect(ws, "test_channel", "user123")
    
    assert manager.is_user_connected("test_channel", "user123") == True
    assert manager.get_user_count("test_channel") == 1
```

### Integration Tests

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login():
    """Test login endpoint"""
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "Password123!"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "tab_session_key" in data


def test_create_task_authenticated():
    """Test task creation with authentication"""
    # Login first
    login_response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "Password123!"
    })
    token = login_response.json()["token"]
    tab_key = login_response.json()["tab_session_key"]
    
    # Create task
    response = client.post(
        "/api/tasks",
        json={
            "title": "Test Task",
            "project_id": "507f1f77bcf86cd799439011"
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tab-Session-Key": tab_key
        }
    )
    
    assert response.status_code == 200
    assert response.json()["success"] == True
```

---

## Deployment

### Production Configuration

**Uvicorn with Multiple Workers:**
```bash
# Production command
uvicorn main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 4 \
    --log-level info \
    --access-log \
    --no-reload
```

**Gunicorn with Uvicorn Workers:**
```bash
gunicorn main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile /var/log/gunicorn-access.log \
    --error-logfile /var/log/gunicorn-error.log
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/chat_attachments uploads/ai_images

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend-2
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=${MONGO_URI}
      - JWT_SECRET=${JWT_SECRET}
      - AZURE_OPENAI_KEY=${AZURE_OPENAI_KEY}
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    restart: unless-stopped
```

### Environment Variables Setup

**Production .env file:**
```env
# Database
MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_PROD_DB

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=YOUR_GENERATED_JWT_SECRET

# Azure AI
AZURE_OPENAI_ENDPOINT=https://YOUR_PROD_RESOURCE.openai.azure.com/
AZURE_OPENAI_KEY=YOUR_PROD_OPENAI_KEY
AZURE_OPENAI_DEPLOYMENT=gpt-5-2-chat
AZURE_OPENAI_API_VERSION=2024-12-01-preview

AZURE_FLUX_ENDPOINT=https://YOUR_PROD_FLUX.azure.com/
AZURE_FLUX_KEY=YOUR_PROD_FLUX_KEY
AZURE_FLUX_MODEL=FLUX-1.1-pro

# Admin (Use strong credentials!)
SADMIN_EMAIL=YOUR_ADMIN_EMAIL
SADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD
SADMIN_NAME=System Administrator

# CORS (production frontend URL)
ALLOWED_ORIGINS=https://app.company.com,https://www.company.com
```

### Monitoring & Health Checks

**Health Check Endpoint:**
```python
@app.get("/health")
async def health_check():
    """
    Health check endpoint for load balancers
    
    Checks:
        - API is running
        - Database connection
        - AI services status
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Check database
    try:
        db.command('ping')
        health_status["services"]["database"] = "healthy"
    except:
        health_status["services"]["database"] = "unhealthy"
        health_status["status"] = "degraded"
    
    # Check Azure OpenAI
    try:
        if azure_client:
            health_status["services"]["azure_ai"] = "healthy"
        else:
            health_status["services"]["azure_ai"] = "unavailable"
    except:
        health_status["services"]["azure_ai"] = "unhealthy"
    
    return health_status
```

---

## Summary

The DOIT backend architecture follows enterprise-grade best practices:

**✅ Scalable**: Clean 3-layer architecture (Router → Controller → Model)
**✅ Secure**: Advanced JWT authentication with device fingerprinting
**✅ Real-time**: WebSocket support for live collaboration
**✅ AI-Powered**: Azure OpenAI GPT-5.2-chat + FLUX-1.1-pro integration
**✅ Type-Safe**: Pydantic schemas for validation
**✅ Performant**: MongoDB indexing + response caching
**✅ Testable**: Comprehensive unit and integration tests
**✅ Production-Ready**: Docker support + monitoring

**Key Technologies:**
- FastAPI + Uvicorn ASGI
- MongoDB Atlas Cloud
- JWT + bcrypt authentication
- Azure AI Foundry (GPT-5.2-chat, FLUX-1.1-pro)
- WebSocket for real-time updates
- PyPDF2, python-docx for file processing

**Total Lines**: ~4,500+ lines of production-ready Python code
