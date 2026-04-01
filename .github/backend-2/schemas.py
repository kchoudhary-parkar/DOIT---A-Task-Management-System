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

class ClerkSyncRequest(BaseModel):
    clerk_token: str
    email: EmailStr
    name: str
    clerk_user_id: str

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

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = None

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

# ============= USER SCHEMAS =============
class UpdateUserRoleRequest(BaseModel):
    user_id: str
    role: str

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