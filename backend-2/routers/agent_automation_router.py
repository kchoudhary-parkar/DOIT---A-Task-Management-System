"""
Agent Automation Router
Provides simplified endpoints for Azure AI Agent to create and assign tasks
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from middleware.agent_auth import verify_agent_token
from controllers.agent_task_controller import (
    agent_create_task,
    agent_assign_task,
    agent_update_task,
    agent_bulk_update_task_due_dates,
    agent_bulk_update_tasks,
)
from controllers.agent_sprint_controller import (
    agent_create_sprint,
    agent_start_sprint,
    agent_complete_sprint,
    agent_add_task_to_sprint,
    agent_bulk_add_tasks_to_sprint,
    agent_remove_task_from_sprint,
    agent_bulk_remove_tasks_from_sprint,
)
import json

router = APIRouter(prefix="/api/agent/automation", tags=["Agent Automation"])


class CreateTaskRequest(BaseModel):
    requesting_user: EmailStr  # Email of user making the request
    title: str
    project_id: str
    description: Optional[str] = ""
    assignee_email: Optional[EmailStr] = None
    assignee_name: Optional[str] = None
    priority: Optional[str] = "Medium"
    status: Optional[str] = "To Do"
    due_date: Optional[str] = None
    issue_type: Optional[str] = "task"
    labels: Optional[List[str]] = []


class AssignTaskRequest(BaseModel):
    requesting_user: EmailStr  # Email of user making the request
    assignee_identifier: str  # Email or name


class UpdateTaskRequest(BaseModel):
    requesting_user: EmailStr
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None


class BulkUpdateDueDateRequest(BaseModel):
    requesting_user: EmailStr
    project_id: str
    due_date: str
    task_identifiers: List[str]


class BulkUpdateTasksRequest(BaseModel):
    requesting_user: EmailStr
    project_id: str
    task_identifiers: List[str]
    updates: Dict[str, Any]


class CreateSprintRequest(BaseModel):
    requesting_user: EmailStr  # Email of user making the request (must be Admin)
    name: str
    project_id: str
    start_date: str  # ISO format: YYYY-MM-DD
    end_date: str  # ISO format: YYYY-MM-DD
    goal: Optional[str] = ""
    status: Optional[str] = "Planning"


class StartSprintRequest(BaseModel):
    requesting_user: EmailStr
    project_id: str
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None


class AddTaskToSprintAutomationRequest(BaseModel):
    requesting_user: EmailStr
    project_id: str
    task_identifier: str
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None


class BulkAddTasksToSprintAutomationRequest(BaseModel):
    requesting_user: EmailStr
    project_id: str
    task_identifiers: List[str]
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None


class RemoveTaskFromSprintAutomationRequest(BaseModel):
    requesting_user: EmailStr
    project_id: str
    task_identifier: str
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None


class BulkRemoveTasksFromSprintAutomationRequest(BaseModel):
    requesting_user: EmailStr
    project_id: str
    task_identifiers: List[str]
    sprint_id: Optional[str] = None
    sprint_name: Optional[str] = None


@router.post("/tasks")
async def create_task_automation(
    request: CreateTaskRequest, agent_user_id: str = Depends(verify_agent_token)
):
    """
    Create a task with automatic assignee resolution and RBAC validation

    Requires:
    - requesting_user: Email of the user making this request (for permission check)
    - title, project_id: Required task fields

    Agent can provide either:
    - assignee_email: "john@example.com"
    - assignee_name: "John Doe"

    The system will automatically find and assign the user

    Permissions: Admin or Member can create tasks
    """
    return agent_create_task(
        requesting_user=request.requesting_user,
        title=request.title,
        project_id=request.project_id,
        user_id=agent_user_id,
        description=request.description,
        assignee_email=request.assignee_email,
        assignee_name=request.assignee_name,
        priority=request.priority,
        status=request.status,
        due_date=request.due_date,
        issue_type=request.issue_type,
        labels=request.labels,
    )


@router.put("/tasks/{task_id}/assign")
async def assign_task_automation(
    task_id: str,
    request: AssignTaskRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Assign a task to a user by email or name with RBAC validation

    Requires:
    - requesting_user: Email of the user making this request
    - assignee_identifier: Email or name of user to assign to

    Example: {"requesting_user": "admin@example.com", "assignee_identifier": "john@example.com"}
    Example: {"requesting_user": "member@example.com", "assignee_identifier": "John Doe"}

    Permissions: Admin or Member can assign tasks
    """
    return agent_assign_task(
        requesting_user=request.requesting_user,
        task_id=task_id,
        assignee_identifier=request.assignee_identifier,
        user_id=agent_user_id,
    )


@router.put("/tasks/{task_id}")
async def update_task_automation(
    task_id: str,
    request: UpdateTaskRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Update task fields using either ticket_id (AA-003) or Mongo _id as task_id.

    Requires:
    - requesting_user: Email from context
    - at least one update field (title/description/priority/status/due_date)
    """
    return agent_update_task(
        requesting_user=request.requesting_user,
        task_id=task_id,
        user_id=agent_user_id,
        title=request.title,
        description=request.description,
        priority=request.priority,
        status=request.status,
        due_date=request.due_date,
    )


@router.post("/tasks/bulk-update-due-date")
async def bulk_update_due_date_automation(
    request: BulkUpdateDueDateRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Bulk update due dates for one or many tasks in a project.

    - Supports ticket IDs (AA-003) and Mongo _id values.
    - Works with a single task as well (task_identifiers length = 1).
    """
    return agent_bulk_update_task_due_dates(
        requesting_user=request.requesting_user,
        project_id=request.project_id,
        due_date=request.due_date,
        task_identifiers=request.task_identifiers,
        user_id=agent_user_id,
    )


@router.post("/tasks/bulk-update")
async def bulk_update_tasks_automation(
    request: BulkUpdateTasksRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Bulk update allowed fields for one or many tasks in a project.

    Allowed fields:
    - title, description, priority, status, assignee_id, due_date, issue_type, labels, comment

    Notes:
    - Supports ticket IDs (AA-003) and Mongo _id values.
    - Applies the same updates object to each task identifier.
    """
    return agent_bulk_update_tasks(
        requesting_user=request.requesting_user,
        project_id=request.project_id,
        task_identifiers=request.task_identifiers,
        updates=request.updates,
        user_id=agent_user_id,
    )


@router.get("/projects/{project_id}/assignable-users")
async def get_assignable_users(
    project_id: str,
    requesting_user: Optional[EmailStr] = None,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Get list of users who can be assigned tasks in a project
    """
    from controllers.member_controller import get_project_members
    from models.user import User

    # Prefer actual authenticated user from context for project-membership checks.
    effective_user_id = agent_user_id
    if requesting_user:
        actual_user = User.find_by_email(str(requesting_user).lower())
        if not actual_user:
            raise HTTPException(
                status_code=404,
                detail=f"User with email '{requesting_user}' not found",
            )
        effective_user_id = str(actual_user["_id"])

    response = get_project_members(project_id, effective_user_id)

    if isinstance(response.get("body"), str):
        return json.loads(response["body"])
    return response.get("body", {})


@router.post("/sprints")
async def create_sprint_automation(
    request: CreateSprintRequest, agent_user_id: str = Depends(verify_agent_token)
):
    """
    Create a new sprint with RBAC validation

    Requires:
    - requesting_user: Email of the user making this request (must be Admin)
    - name: Sprint name
    - project_id: Target project ID
    - start_date: Sprint start date (ISO format: YYYY-MM-DD)
    - end_date: Sprint end date (ISO format: YYYY-MM-DD)

    Optional:
    - goal: Sprint goal
    - status: Sprint status (default "Planning")

    Permissions: Only Admin users can create sprints
    """
    return agent_create_sprint(
        requesting_user=request.requesting_user,
        name=request.name,
        project_id=request.project_id,
        start_date=request.start_date,
        end_date=request.end_date,
        user_id=agent_user_id,
        goal=request.goal,
        status=request.status,
    )


@router.post("/sprints/start")
async def start_sprint_automation(
    request: StartSprintRequest, agent_user_id: str = Depends(verify_agent_token)
):
    """
    Start a sprint by sprint_id (preferred) or sprint_name within a project.

    Requires:
    - requesting_user: Email from context (for RBAC/membership validation)
    - project_id: Target project ID
    - one of sprint_id or sprint_name
    """
    return agent_start_sprint(
        requesting_user=request.requesting_user,
        project_id=request.project_id,
        user_id=agent_user_id,
        sprint_id=request.sprint_id,
        sprint_name=request.sprint_name,
    )


@router.post("/sprints/complete")
async def complete_sprint_automation(
    request: StartSprintRequest, agent_user_id: str = Depends(verify_agent_token)
):
    """
    Complete a sprint by sprint_id (preferred) or sprint_name within a project.

    Requires:
    - requesting_user: Email from context (for RBAC/membership validation)
    - project_id: Target project ID
    - one of sprint_id or sprint_name
    """
    return agent_complete_sprint(
        requesting_user=request.requesting_user,
        project_id=request.project_id,
        user_id=agent_user_id,
        sprint_id=request.sprint_id,
        sprint_name=request.sprint_name,
    )


@router.post("/sprints/add-task")
async def add_task_to_sprint_automation(
    request: AddTaskToSprintAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Add one task to a sprint by sprint_id (preferred) or sprint_name.

    - task_identifier supports ticket IDs (AA-009) and Mongo _id values.
    - project_id is required for safe sprint/task scoping and validation.
    """
    return agent_add_task_to_sprint(
        requesting_user=request.requesting_user,
        project_id=request.project_id,
        task_identifier=request.task_identifier,
        user_id=agent_user_id,
        sprint_id=request.sprint_id,
        sprint_name=request.sprint_name,
    )


@router.post("/sprints/bulk-add-tasks")
async def bulk_add_tasks_to_sprint_automation(
    request: BulkAddTasksToSprintAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Add multiple tasks to a sprint in one operation.

    - task_identifiers supports ticket IDs (AA-009) and Mongo _id values.
    - use sprint_id (preferred) or sprint_name.
    - designed for single-prompt multi-task sprint assignment.
    """
    return agent_bulk_add_tasks_to_sprint(
        requesting_user=request.requesting_user,
        project_id=request.project_id,
        task_identifiers=request.task_identifiers,
        user_id=agent_user_id,
        sprint_id=request.sprint_id,
        sprint_name=request.sprint_name,
    )


@router.post("/sprints/remove-task")
async def remove_task_from_sprint_automation(
    request: RemoveTaskFromSprintAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Remove one task from a sprint by sprint_id (preferred) or sprint_name.

    - task_identifier supports ticket IDs (AA-010) and Mongo _id values.
    - project_id is required for safe sprint/task scoping and validation.
    """
    return agent_remove_task_from_sprint(
        requesting_user=request.requesting_user,
        project_id=request.project_id,
        task_identifier=request.task_identifier,
        user_id=agent_user_id,
        sprint_id=request.sprint_id,
        sprint_name=request.sprint_name,
    )


@router.post("/sprints/bulk-remove-tasks")
async def bulk_remove_tasks_from_sprint_automation(
    request: BulkRemoveTasksFromSprintAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Remove multiple tasks from a sprint in one operation.

    - task_identifiers supports ticket IDs (AA-010) and Mongo _id values.
    - use sprint_id (preferred) or sprint_name.
    - designed for single-prompt multi-task sprint removal.
    """
    return agent_bulk_remove_tasks_from_sprint(
        requesting_user=request.requesting_user,
        project_id=request.project_id,
        task_identifiers=request.task_identifiers,
        user_id=agent_user_id,
        sprint_id=request.sprint_id,
        sprint_name=request.sprint_name,
    )
