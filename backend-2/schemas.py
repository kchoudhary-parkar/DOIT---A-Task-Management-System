from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ============= AUTH SCHEMAS =============
class RegisterRequest(BaseModel):
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
    
    name: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: Optional[str] = None

class LoginRequest(BaseModel):
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

class OAuthSyncRequest(BaseModel):
    provider: str
    id_token: str

class LogoutRequest(BaseModel):
    token_id: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: Optional[str] = None

# ============= PROJECT SCHEMAS =============
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=3)
    description: Optional[str] = ""
    integrations: Optional[Dict[str, Any]] = None
    git_repo_url: Optional[str] = ""
    git_access_token: Optional[str] = ""
    github_webhook_url: Optional[str] = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = None
    git_repo_url: Optional[str] = None
    git_access_token: Optional[str] = None
    github_webhook_url: Optional[str] = None

class AddMemberRequest(BaseModel):
    email: EmailStr

# ============= TASK SCHEMAS =============
class TaskCreate(BaseModel):
    title: str = Field(..., min_length=3)
    description: Optional[str] = ""
    project_id: str
    priority: Optional[str] = "Medium"
    status: Optional[str] = "To Do"
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None
    issue_type: Optional[str] = "task"
    labels: Optional[List[str]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None
    issue_type: Optional[str] = None
    labels: Optional[List[str]] = None
    comment: Optional[str] = None

class AddLabelRequest(BaseModel):
    label: str

class AddAttachmentRequest(BaseModel):
    name: str
    url: str
    fileName: Optional[str] = None
    fileType: Optional[str] = None
    fileSize: Optional[int] = None

class RemoveAttachmentRequest(BaseModel):
    url: str

class AddLinkRequest(BaseModel):
    linked_task_id: Optional[str] = None
    linked_ticket_id: Optional[str] = None
    type: str

class RemoveLinkRequest(BaseModel):
    linked_task_id: str
    type: str

class AddCommentRequest(BaseModel):
    comment: str

# ============= SPRINT SCHEMAS =============
class SprintCreate(BaseModel):
    name: str
    goal: Optional[str] = ""
    start_date: str
    end_date: str

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class AddTaskToSprintRequest(BaseModel):
    task_id: str

# ============= PROFILE SCHEMAS =============
class PersonalInfoUpdate(BaseModel):
    data: Dict[str, Any]

class EducationUpdate(BaseModel):
    education: List[Dict[str, Any]]

class CertificatesUpdate(BaseModel):
    certificates: List[Dict[str, Any]]

class OrganizationUpdate(BaseModel):
    data: Dict[str, Any]

class IntegrationsUpdate(BaseModel):
    discord_webhook: Optional[str] = ""
    teams_webhook: Optional[str] = ""
    slack_webhook: Optional[str] = ""
    github_token: Optional[str] = ""
    whatsapp_instance_id: Optional[str] = ""
    whatsapp_token: Optional[str] = ""
    whatsapp_number: Optional[str] = ""

# ============= USER SCHEMAS =============
class UpdateUserRoleRequest(BaseModel):
    user_id: str
    role: str


class DeleteUserRequest(BaseModel):
    confirmation_text: str

# ============= CHAT SCHEMAS =============
class ChatAskRequest(BaseModel):
    message: str
    conversationHistory: Optional[List[Dict[str, str]]] = []

# ============= RESPONSE SCHEMAS =============
class SuccessResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: str

# ── Requests ──────────────────────────────────────────────────────────────────

class CreateMeetingRequest(BaseModel):
    title:            str
    start_time:       str           # ISO 8601 string; controller converts to datetime
    duration: int
    participants:     List[str]     = []
    description:      str           = ""


class UpdateMeetingRequest(BaseModel):
    title:            Optional[str] = None
    start_time:       Optional[str] = None
    duration: Optional[int] = None
    description:      Optional[str] = None
    participants:     Optional[List[str]] = None


class UpdateParticipantsRequest(BaseModel):
    participants: List[str]


class AddNotesRequest(BaseModel):
    notes: str


class UpdatePreferencesRequest(BaseModel):
    preferences: dict


class CheckAvailabilityRequest(BaseModel):
    date:             str           # YYYY-MM-DD
    duration: int           = 60


class CheckConflictsRequest(BaseModel):
    start_time:       str           # ISO 8601
    duration: int


class SuggestTimesRequest(BaseModel):
    duration: int           = 60
    preferred_days:   List[str]     = []   # ["monday", "wednesday"]
    days_ahead:       int           = 7