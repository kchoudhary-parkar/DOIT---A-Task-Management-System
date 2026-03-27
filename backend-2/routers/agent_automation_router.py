# """
# Agent Automation Router
# Provides simplified endpoints for Azure AI Agent to create and assign tasks
# """

# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel, EmailStr
# from typing import Optional, List, Dict, Any
# import asyncio
# import time
# from middleware.agent_auth import verify_agent_token, verify_agent_token_optional
# from models.task import Task
# from controllers.agent_task_controller import (
#     agent_create_task,
#     agent_assign_task,
#     agent_update_task,
#     agent_bulk_update_task_due_dates,
#     agent_bulk_update_tasks,
# )
# from controllers.agent_sprint_controller import (
#     agent_create_sprint,
#     agent_start_sprint,
#     agent_complete_sprint,
#     agent_add_task_to_sprint,
#     agent_bulk_add_tasks_to_sprint,
#     agent_remove_task_from_sprint,
#     agent_bulk_remove_tasks_from_sprint,
# )
# from controllers import code_review_controller, git_controller
# from controllers import task_controller
# from celery_app import celery_app
# import json

# router = APIRouter(prefix="/api/agent/automation", tags=["Agent Automation"])


# class CreateTaskRequest(BaseModel):
#     requesting_user: EmailStr  # Email of user making the request
#     title: str
#     project_id: str
#     description: Optional[str] = ""
#     assignee_email: Optional[EmailStr] = None
#     assignee_name: Optional[str] = None
#     priority: Optional[str] = "Medium"
#     status: Optional[str] = "To Do"
#     due_date: Optional[str] = None
#     issue_type: Optional[str] = "task"
#     labels: Optional[List[str]] = []


# class AssignTaskRequest(BaseModel):
#     requesting_user: EmailStr  # Email of user making the request
#     assignee_identifier: str  # Email or name


# class UpdateTaskRequest(BaseModel):
#     requesting_user: EmailStr
#     title: Optional[str] = None
#     description: Optional[str] = None
#     priority: Optional[str] = None
#     status: Optional[str] = None
#     due_date: Optional[str] = None


# class BulkUpdateDueDateRequest(BaseModel):
#     requesting_user: EmailStr
#     project_id: str
#     due_date: str
#     task_identifiers: List[str]


# class BulkUpdateTasksRequest(BaseModel):
#     requesting_user: EmailStr
#     project_id: str
#     task_identifiers: List[str]
#     updates: Dict[str, Any]


# class CreateSprintRequest(BaseModel):
#     requesting_user: EmailStr  # Email of user making the request (must be Admin)
#     name: str
#     project_id: str
#     start_date: str  # ISO format: YYYY-MM-DD
#     end_date: str  # ISO format: YYYY-MM-DD
#     goal: Optional[str] = ""
#     status: Optional[str] = "Planning"


# class StartSprintRequest(BaseModel):
#     requesting_user: EmailStr
#     project_id: str
#     sprint_id: Optional[str] = None
#     sprint_name: Optional[str] = None


# class AddTaskToSprintAutomationRequest(BaseModel):
#     requesting_user: EmailStr
#     project_id: str
#     task_identifier: str
#     sprint_id: Optional[str] = None
#     sprint_name: Optional[str] = None


# class BulkAddTasksToSprintAutomationRequest(BaseModel):
#     requesting_user: EmailStr
#     project_id: str
#     task_identifiers: List[str]
#     sprint_id: Optional[str] = None
#     sprint_name: Optional[str] = None


# class RemoveTaskFromSprintAutomationRequest(BaseModel):
#     requesting_user: EmailStr
#     project_id: str
#     task_identifier: str
#     sprint_id: Optional[str] = None
#     sprint_name: Optional[str] = None


# class BulkRemoveTasksFromSprintAutomationRequest(BaseModel):
#     requesting_user: EmailStr
#     project_id: str
#     task_identifiers: List[str]
#     sprint_id: Optional[str] = None
#     sprint_name: Optional[str] = None


# class CreateCodeReviewAutomationRequest(BaseModel):
#     requesting_user: Optional[EmailStr] = None
#     project_id: str
#     task_id: str
#     pr_url: str
#     trigger_analysis: bool = True
#     wait_for_analysis_seconds: int = 35


# class RetryCodeReviewAutomationRequest(BaseModel):
#     requesting_user: Optional[EmailStr] = None
#     review_id: str


# class AddTaskLabelAutomationRequest(BaseModel):
#     requesting_user: EmailStr
#     label: str


# class AddTaskAttachmentAutomationRequest(BaseModel):
#     requesting_user: EmailStr
#     name: str
#     url: str
#     fileName: Optional[str] = None
#     fileType: Optional[str] = None
#     fileSize: Optional[int] = None


# class AddTaskCommentAutomationRequest(BaseModel):
#     requesting_user: EmailStr
#     comment: str


# class AddTaskLinkAutomationRequest(BaseModel):
#     requesting_user: EmailStr
#     type: str
#     linked_task_id: Optional[str] = None
#     linked_ticket_id: Optional[str] = None


# def _resolve_requesting_user_id(requesting_user: EmailStr) -> str:
#     from models.user import User

#     user = User.find_by_email(str(requesting_user).lower())
#     if not user:
#         raise HTTPException(
#             status_code=404,
#             detail=f"Requesting user '{requesting_user}' not found",
#         )
#     return str(user["_id"])


# def _resolve_task_id_or_404(task_identifier: str) -> str:
#     task_doc = Task.find_by_identifier(task_identifier)
#     if not task_doc:
#         raise HTTPException(status_code=404, detail=f"Task '{task_identifier}' not found")
#     return str(task_doc.get("_id"))


# def _unwrap_controller_response(response: Dict[str, Any]) -> Dict[str, Any]:
#     status = int(response.get("status", 200))
#     body = response.get("body", "{}")
#     payload = json.loads(body) if isinstance(body, str) else body
#     if status >= 400:
#         detail = payload.get("error") if isinstance(payload, dict) else str(payload)
#         raise HTTPException(status_code=status, detail=detail or "Request failed")
#     return payload if isinstance(payload, dict) else {"data": payload}


# @router.post("/tasks")
# async def create_task_automation(
#     request: CreateTaskRequest, agent_user_id: str = Depends(verify_agent_token)
# ):
#     """
#     Create a task with automatic assignee resolution and RBAC validation

#     Requires:
#     - requesting_user: Email of the user making this request (for permission check)
#     - title, project_id: Required task fields

#     Agent can provide either:
#     - assignee_email: "john@example.com"
#     - assignee_name: "John Doe"

#     The system will automatically find and assign the user

#     Permissions: Admin or Member can create tasks
#     """
#     return agent_create_task(
#         requesting_user=request.requesting_user,
#         title=request.title,
#         project_id=request.project_id,
#         user_id=agent_user_id,
#         description=request.description,
#         assignee_email=request.assignee_email,
#         assignee_name=request.assignee_name,
#         priority=request.priority,
#         status=request.status,
#         due_date=request.due_date,
#         issue_type=request.issue_type,
#         labels=request.labels,
#     )


# @router.put("/tasks/{task_id}/assign")
# async def assign_task_automation(
#     task_id: str,
#     request: AssignTaskRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Assign a task to a user by email or name with RBAC validation

#     Requires:
#     - requesting_user: Email of the user making this request
#     - assignee_identifier: Email or name of user to assign to

#     Example: {"requesting_user": "admin@example.com", "assignee_identifier": "john@example.com"}
#     Example: {"requesting_user": "member@example.com", "assignee_identifier": "John Doe"}

#     Permissions: Admin or Member can assign tasks
#     """
#     return agent_assign_task(
#         requesting_user=request.requesting_user,
#         task_id=task_id,
#         assignee_identifier=request.assignee_identifier,
#         user_id=agent_user_id,
#     )


# @router.put("/tasks/{task_id}")
# async def update_task_automation(
#     task_id: str,
#     request: UpdateTaskRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Update task fields using either ticket_id (AA-003) or Mongo _id as task_id.

#     Requires:
#     - requesting_user: Email from context
#     - at least one update field (title/description/priority/status/due_date)
#     """
#     return agent_update_task(
#         requesting_user=request.requesting_user,
#         task_id=task_id,
#         user_id=agent_user_id,
#         title=request.title,
#         description=request.description,
#         priority=request.priority,
#         status=request.status,
#         due_date=request.due_date,
#     )


# @router.post("/tasks/bulk-update-due-date")
# async def bulk_update_due_date_automation(
#     request: BulkUpdateDueDateRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Bulk update due dates for one or many tasks in a project.

#     - Supports ticket IDs (AA-003) and Mongo _id values.
#     - Works with a single task as well (task_identifiers length = 1).
#     """
#     return agent_bulk_update_task_due_dates(
#         requesting_user=request.requesting_user,
#         project_id=request.project_id,
#         due_date=request.due_date,
#         task_identifiers=request.task_identifiers,
#         user_id=agent_user_id,
#     )


# @router.post("/tasks/bulk-update")
# async def bulk_update_tasks_automation(
#     request: BulkUpdateTasksRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Bulk update allowed fields for one or many tasks in a project.

#     Allowed fields:
#     - title, description, priority, status, assignee_id, due_date, issue_type, labels, comment

#     Notes:
#     - Supports ticket IDs (AA-003) and Mongo _id values.
#     - Applies the same updates object to each task identifier.
#     """
#     return agent_bulk_update_tasks(
#         requesting_user=request.requesting_user,
#         project_id=request.project_id,
#         task_identifiers=request.task_identifiers,
#         updates=request.updates,
#         user_id=agent_user_id,
#     )


# @router.post("/tasks/{task_id}/labels")
# async def add_task_label_automation(
#     task_id: str,
#     request: AddTaskLabelAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Add a label to a task using ticket ID or Mongo _id."""
#     _ = agent_user_id
#     actual_user_id = _resolve_requesting_user_id(request.requesting_user)
#     canonical_task_id = _resolve_task_id_or_404(task_id)
#     response = task_controller.add_label_to_task(
#         canonical_task_id,
#         json.dumps({"label": request.label}),
#         actual_user_id,
#     )
#     return _unwrap_controller_response(response)


# @router.post("/tasks/{task_id}/attachments")
# async def add_task_attachment_automation(
#     task_id: str,
#     request: AddTaskAttachmentAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Add an attachment link/document to a task using ticket ID or Mongo _id."""
#     _ = agent_user_id
#     actual_user_id = _resolve_requesting_user_id(request.requesting_user)
#     canonical_task_id = _resolve_task_id_or_404(task_id)

#     attachment_payload: Dict[str, Any] = {
#         "name": request.name,
#         "url": request.url,
#     }
#     if request.fileName:
#         attachment_payload["fileName"] = request.fileName
#     if request.fileType:
#         attachment_payload["fileType"] = request.fileType
#     if request.fileSize is not None:
#         attachment_payload["fileSize"] = request.fileSize

#     response = task_controller.add_attachment_to_task(
#         canonical_task_id,
#         json.dumps(attachment_payload),
#         actual_user_id,
#     )
#     return _unwrap_controller_response(response)


# @router.post("/tasks/{task_id}/comments")
# async def add_task_comment_automation(
#     task_id: str,
#     request: AddTaskCommentAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Add a comment activity to a task using ticket ID or Mongo _id."""
#     _ = agent_user_id
#     actual_user_id = _resolve_requesting_user_id(request.requesting_user)
#     canonical_task_id = _resolve_task_id_or_404(task_id)
#     response = task_controller.add_task_comment(
#         canonical_task_id,
#         json.dumps({"comment": request.comment}),
#         actual_user_id,
#     )
#     return _unwrap_controller_response(response)


# @router.post("/tasks/{task_id}/links")
# async def add_task_link_automation(
#     task_id: str,
#     request: AddTaskLinkAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Add a linked-ticket relationship to a task using ticket ID or Mongo _id."""
#     _ = agent_user_id
#     actual_user_id = _resolve_requesting_user_id(request.requesting_user)
#     canonical_task_id = _resolve_task_id_or_404(task_id)

#     link_payload: Dict[str, Any] = {
#         "type": request.type,
#     }
#     if request.linked_task_id:
#         linked_task_doc = Task.find_by_identifier(request.linked_task_id)
#         if not linked_task_doc:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Linked task '{request.linked_task_id}' not found",
#             )
#         link_payload["linked_task_id"] = str(linked_task_doc.get("_id"))
#     if request.linked_ticket_id:
#         link_payload["linked_ticket_id"] = request.linked_ticket_id

#     response = task_controller.add_link_to_task(
#         canonical_task_id,
#         json.dumps(link_payload),
#         actual_user_id,
#     )
#     return _unwrap_controller_response(response)


# @router.get("/projects/{project_id}/assignable-users")
# async def get_assignable_users(
#     project_id: str,
#     requesting_user: Optional[EmailStr] = None,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Get list of users who can be assigned tasks in a project
#     """
#     from controllers.member_controller import get_project_members
#     from models.user import User

#     # Prefer actual authenticated user from context for project-membership checks.
#     effective_user_id = agent_user_id
#     if requesting_user:
#         actual_user = User.find_by_email(str(requesting_user).lower())
#         if not actual_user:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"User with email '{requesting_user}' not found",
#             )
#         effective_user_id = str(actual_user["_id"])

#     response = get_project_members(project_id, effective_user_id)

#     if isinstance(response.get("body"), str):
#         return json.loads(response["body"])
#     return response.get("body", {})


# @router.post("/sprints")
# async def create_sprint_automation(
#     request: CreateSprintRequest, agent_user_id: str = Depends(verify_agent_token)
# ):
#     """
#     Create a new sprint with RBAC validation

#     Requires:
#     - requesting_user: Email of the user making this request (must be Admin)
#     - name: Sprint name
#     - project_id: Target project ID
#     - start_date: Sprint start date (ISO format: YYYY-MM-DD)
#     - end_date: Sprint end date (ISO format: YYYY-MM-DD)

#     Optional:
#     - goal: Sprint goal
#     - status: Sprint status (default "Planning")

#     Permissions: Only Admin users can create sprints
#     """
#     return agent_create_sprint(
#         requesting_user=request.requesting_user,
#         name=request.name,
#         project_id=request.project_id,
#         start_date=request.start_date,
#         end_date=request.end_date,
#         user_id=agent_user_id,
#         goal=request.goal,
#         status=request.status,
#     )


# @router.post("/sprints/start")
# async def start_sprint_automation(
#     request: StartSprintRequest, agent_user_id: str = Depends(verify_agent_token)
# ):
#     """
#     Start a sprint by sprint_id (preferred) or sprint_name within a project.

#     Requires:
#     - requesting_user: Email from context (for RBAC/membership validation)
#     - project_id: Target project ID
#     - one of sprint_id or sprint_name
#     """
#     return agent_start_sprint(
#         requesting_user=request.requesting_user,
#         project_id=request.project_id,
#         user_id=agent_user_id,
#         sprint_id=request.sprint_id,
#         sprint_name=request.sprint_name,
#     )


# @router.post("/sprints/complete")
# async def complete_sprint_automation(
#     request: StartSprintRequest, agent_user_id: str = Depends(verify_agent_token)
# ):
#     """
#     Complete a sprint by sprint_id (preferred) or sprint_name within a project.

#     Requires:
#     - requesting_user: Email from context (for RBAC/membership validation)
#     - project_id: Target project ID
#     - one of sprint_id or sprint_name
#     """
#     return agent_complete_sprint(
#         requesting_user=request.requesting_user,
#         project_id=request.project_id,
#         user_id=agent_user_id,
#         sprint_id=request.sprint_id,
#         sprint_name=request.sprint_name,
#     )


# @router.post("/sprints/add-task")
# async def add_task_to_sprint_automation(
#     request: AddTaskToSprintAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Add one task to a sprint by sprint_id (preferred) or sprint_name.

#     - task_identifier supports ticket IDs (AA-009) and Mongo _id values.
#     - project_id is required for safe sprint/task scoping and validation.
#     """
#     return agent_add_task_to_sprint(
#         requesting_user=request.requesting_user,
#         project_id=request.project_id,
#         task_identifier=request.task_identifier,
#         user_id=agent_user_id,
#         sprint_id=request.sprint_id,
#         sprint_name=request.sprint_name,
#     )


# @router.post("/sprints/bulk-add-tasks")
# async def bulk_add_tasks_to_sprint_automation(
#     request: BulkAddTasksToSprintAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Add multiple tasks to a sprint in one operation.

#     - task_identifiers supports ticket IDs (AA-009) and Mongo _id values.
#     - use sprint_id (preferred) or sprint_name.
#     - designed for single-prompt multi-task sprint assignment.
#     """
#     return agent_bulk_add_tasks_to_sprint(
#         requesting_user=request.requesting_user,
#         project_id=request.project_id,
#         task_identifiers=request.task_identifiers,
#         user_id=agent_user_id,
#         sprint_id=request.sprint_id,
#         sprint_name=request.sprint_name,
#     )


# @router.post("/sprints/remove-task")
# async def remove_task_from_sprint_automation(
#     request: RemoveTaskFromSprintAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Remove one task from a sprint by sprint_id (preferred) or sprint_name.

#     - task_identifier supports ticket IDs (AA-010) and Mongo _id values.
#     - project_id is required for safe sprint/task scoping and validation.
#     """
#     return agent_remove_task_from_sprint(
#         requesting_user=request.requesting_user,
#         project_id=request.project_id,
#         task_identifier=request.task_identifier,
#         user_id=agent_user_id,
#         sprint_id=request.sprint_id,
#         sprint_name=request.sprint_name,
#     )


# @router.post("/sprints/bulk-remove-tasks")
# async def bulk_remove_tasks_from_sprint_automation(
#     request: BulkRemoveTasksFromSprintAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Remove multiple tasks from a sprint in one operation.

#     - task_identifiers supports ticket IDs (AA-010) and Mongo _id values.
#     - use sprint_id (preferred) or sprint_name.
#     - designed for single-prompt multi-task sprint removal.
#     """
#     return agent_bulk_remove_tasks_from_sprint(
#         requesting_user=request.requesting_user,
#         project_id=request.project_id,
#         task_identifiers=request.task_identifiers,
#         user_id=agent_user_id,
#         sprint_id=request.sprint_id,
#         sprint_name=request.sprint_name,
#     )


# @router.post("/code-review/create")
# async def create_code_review_automation(
#     request: CreateCodeReviewAutomationRequest,
#     requesting_user: Optional[EmailStr] = None,
#     agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
# ):
#     """
#     Create a code review from a GitHub PR URL with optional immediate analysis.

#     Uses agent-token auth (api_key/X-Agent-Key/Bearer service token) instead of user JWT.
#     """
#     # Preferred path: authenticated agent token.
#     # Fallback path: when Foundry sends no auth channels, authorize by requesting_user
#     # and verify the user has access to the target project.
#     effective_user_id = agent_user_id
#     effective_requesting_user = request.requesting_user or requesting_user
#     if not effective_user_id:
#         if not effective_requesting_user:
#             raise HTTPException(
#                 status_code=401,
#                 detail=(
#                     "Authentication missing for code-review create. "
#                     "Provide auth token or requesting_user in body/query."
#                 ),
#             )

#         from models.user import User
#         from models.project import Project

#         requesting_user_doc = User.find_by_email(str(effective_requesting_user).lower())
#         if not requesting_user_doc:
#             raise HTTPException(
#                 status_code=404,
#                 detail=f"Requesting user '{effective_requesting_user}' not found",
#             )

#         requesting_user_id = str(requesting_user_doc["_id"])
#         if not Project.is_member(request.project_id, requesting_user_id):
#             raise HTTPException(
#                 status_code=403,
#                 detail=(
#                     "Requesting user is not a member/owner of the target project."
#                 ),
#             )

#         effective_user_id = requesting_user_id

#     _ = effective_user_id
#     # Resolve task identifier robustly (Mongo _id or ticket ID) and enforce project consistency.
#     task_doc = Task.find_by_identifier(request.task_id)
#     if not task_doc:
#         raise HTTPException(
#             status_code=404,
#             detail=f"Task '{request.task_id}' not found",
#         )

#     canonical_task_id = str(task_doc.get("_id"))
#     task_project_id = str(task_doc.get("project_id", ""))
#     if task_project_id != request.project_id:
#         raise HTTPException(
#             status_code=400,
#             detail=(
#                 "Task/project mismatch: provided task_id does not belong to provided project_id"
#             ),
#         )

#     wait_seconds = max(0, min(int(request.wait_for_analysis_seconds or 0), 120))

#     review = await code_review_controller.create_code_review_from_pr(
#         project_id=request.project_id,
#         task_id=canonical_task_id,
#         pr_url=request.pr_url,
#         trigger_analysis=request.trigger_analysis,
#     )

#     # Optionally wait for Celery to finish so caller receives final scores/issues immediately.
#     if request.trigger_analysis and wait_seconds > 0:
#         review_id = str(review.get("_id", ""))
#         if review_id:
#             deadline = time.monotonic() + wait_seconds
#             while time.monotonic() < deadline:
#                 latest = await code_review_controller.get_code_review_by_id(review_id)
#                 if latest and latest.get("review_status") in {"completed", "failed"}:
#                     review = latest
#                     break
#                 await asyncio.sleep(2)

#     # Attach live git activity counts so agent summaries include branch/commit/PR evidence.
#     git_activity_data = {
#         "branches_count": 0,
#         "commits_count": 0,
#         "pull_requests_count": 0,
#     }
#     try:
#         git_activity_response = json.loads(
#             git_controller.get_task_git_activity(canonical_task_id, effective_user_id)["body"]
#         )
#         if isinstance(git_activity_response, dict):
#             # git_controller returns counts at top-level; support both top-level and nested data shapes.
#             payload = git_activity_response.get("data") if "data" in git_activity_response else git_activity_response
#             git_activity_data = {
#                 "branches_count": payload.get("branches_count", 0),
#                 "commits_count": payload.get("commits_count", 0),
#                 "pull_requests_count": payload.get("pull_requests_count", 0),
#             }
#     except Exception:
#         # Non-fatal; create-review should still succeed even if git summary fetch fails.
#         pass

#     return {
#         "status": "success",
#         "message": "Code review created successfully",
#         "data": review,
#         "git_activity_summary": git_activity_data,
#         "analysis_wait_seconds": wait_seconds,
#         "analysis_status": review.get("review_status", "pending"),
#     }


# @router.get("/code-review/review/{review_id}")
# async def get_code_review_automation(
#     review_id: str,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Get code review by ID using agent-token auth."""
#     _ = agent_user_id
#     review = await code_review_controller.get_code_review_by_id(review_id)
#     if not review:
#         raise HTTPException(status_code=404, detail="Code review not found")
#     return {"status": "success", "data": review}


# @router.get("/code-review/task/{task_id}")
# async def get_task_code_reviews_automation(
#     task_id: str,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Get all code reviews for a task using agent-token auth."""
#     # Resolve incoming identifier (Mongo _id or ticket ID) to canonical _id used by code reviews.
#     task_doc = Task.find_by_identifier(task_id)
#     if not task_doc:
#         raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

#     canonical_task_id = str(task_doc.get("_id"))
#     reviews = await code_review_controller.get_code_reviews_by_task(canonical_task_id)

#     git_activity_summary = {
#         "branches_count": 0,
#         "commits_count": 0,
#         "pull_requests_count": 0,
#     }
#     try:
#         git_activity_response = json.loads(
#             git_controller.get_task_git_activity(canonical_task_id, agent_user_id)["body"]
#         )
#         if isinstance(git_activity_response, dict):
#             # git_controller returns counts at top-level; support both top-level and nested data shapes.
#             payload = git_activity_response.get("data") if "data" in git_activity_response else git_activity_response
#             git_activity_summary = {
#                 "branches_count": payload.get("branches_count", 0),
#                 "commits_count": payload.get("commits_count", 0),
#                 "pull_requests_count": payload.get("pull_requests_count", 0),
#             }
#     except Exception:
#         pass

#     return {
#         "status": "success",
#         "count": len(reviews),
#         "data": reviews,
#         "git_activity_summary": git_activity_summary,
#     }


# @router.get("/code-review/project/{project_id}")
# async def get_project_code_reviews_automation(
#     project_id: str,
#     status: Optional[str] = None,
#     limit: int = 50,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Get project code reviews using agent-token auth."""
#     _ = agent_user_id
#     reviews = await code_review_controller.get_code_reviews_by_project(
#         project_id=project_id,
#         status=status,
#         limit=limit,
#     )
#     return {"status": "success", "count": len(reviews), "data": reviews}


# @router.get("/code-review/project/{project_id}/statistics")
# async def get_project_review_statistics_automation(
#     project_id: str,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Get project code review statistics using agent-token auth."""
#     _ = agent_user_id
#     stats = await code_review_controller.get_review_statistics(project_id)
#     return {"status": "success", "data": stats}


# @router.post("/code-review/retry")
# async def retry_failed_review_automation(
#     request: RetryCodeReviewAutomationRequest,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Retry a failed code review using agent-token auth."""
#     _ = agent_user_id
#     return await code_review_controller.retry_failed_review(request.review_id)


# @router.get("/code-review/health")
# async def code_review_health_automation(
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """Health check for code review subsystem using agent-token auth."""
#     _ = agent_user_id
#     celery_status = "operational"
#     try:
#         celery_app.control.inspect().ping()
#     except Exception as e:
#         celery_status = f"error: {str(e)}"

#     return {
#         "status": "healthy",
#         "celery": celery_status,
#         "features": {
#             "security_scanning": True,
#             "ai_analysis": True,
#             "quality_metrics": True,
#             "github_integration": True,
#         },
#     }


# @router.get("/tasks/{task_id}/git-activity")
# async def get_task_git_activity_automation(
#     task_id: str,
#     requesting_user: Optional[EmailStr] = None,
#     agent_user_id: str = Depends(verify_agent_token),
# ):
#     """
#     Get Git activity for a task (branches, commits, PRs) using agent-token auth.

#     Optional requesting_user is accepted for parity with other automation APIs.
#     """
#     _ = requesting_user
#     return json.loads(git_controller.get_task_git_activity(task_id, agent_user_id)["body"])

"""
Agent Automation Router
Provides simplified endpoints for Azure AI Agent to create and assign tasks
"""

from fastapi import APIRouter, Depends, HTTPException, File, Form, UploadFile, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import asyncio
import time
import io
import json
import base64
import os
import smtplib
import socket
from email.message import EmailMessage
from pathlib import Path
from uuid import uuid4

from middleware.agent_auth import verify_agent_token, verify_agent_token_optional
from models.task import Task
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
from controllers import code_review_controller, git_controller
from controllers import task_controller
from controllers.data_viz_controller import (
    DataVizController,
    handle_get_datasets,
    handle_analyze,
    handle_visualize,
    handle_get_visualizations,
)
from document_intelligence import (
    InsightReport,
    analyze_document_from_file,
    analyze_document_from_url,
    generate_pdf_report,
)
from utils.response import success_response, error_response
from celery_app import celery_app

router = APIRouter(prefix="/api/agent/automation", tags=["Agent Automation"])


def _to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


# ---------------------------------------------------------------------------
# Pydantic request models — task / sprint / code-review
# ---------------------------------------------------------------------------


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


class UpdateTaskStatusAutomationRequest(BaseModel):
    requesting_user: EmailStr
    status: str


class UpdateTaskPriorityAutomationRequest(BaseModel):
    requesting_user: EmailStr
    priority: str


class ApproveTaskAutomationRequest(BaseModel):
    requesting_user: EmailStr


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


class CreateCodeReviewAutomationRequest(BaseModel):
    requesting_user: Optional[EmailStr] = None
    project_id: str
    task_id: str
    pr_url: str
    trigger_analysis: bool = True
    wait_for_analysis_seconds: int = 35


class RetryCodeReviewAutomationRequest(BaseModel):
    requesting_user: Optional[EmailStr] = None
    review_id: str


class AddTaskLabelAutomationRequest(BaseModel):
    requesting_user: EmailStr
    label: str


class AddTaskAttachmentAutomationRequest(BaseModel):
    requesting_user: EmailStr
    name: str
    url: str
    fileName: Optional[str] = None
    fileType: Optional[str] = None
    fileSize: Optional[int] = None


class AddTaskCommentAutomationRequest(BaseModel):
    requesting_user: EmailStr
    comment: str


class AddTaskLinkAutomationRequest(BaseModel):
    requesting_user: EmailStr
    type: str
    linked_task_id: Optional[str] = None
    linked_ticket_id: Optional[str] = None


class ExportReportKPIRequest(BaseModel):
    label: str
    value: str
    trend: Optional[str] = "neutral"


class ExportReportRequest(BaseModel):
    requesting_user: EmailStr
    report_title: str
    executive_summary: str
    key_insights: Optional[List[str]] = []
    kpis: Optional[List[ExportReportKPIRequest]] = []
    recommendations: Optional[List[str]] = []
    email_to: Optional[EmailStr] = None
    export_format: Optional[str] = "pdf"
    save_to_sharepoint: Optional[bool] = False
    sharepoint_folder: Optional[str] = "Reports"


class SendReportEmailRequest(BaseModel):
    requesting_user: EmailStr
    to_email: EmailStr
    report_url: str
    subject: Optional[str] = "Structured Report"
    message: Optional[str] = "Please find your generated report at the link below."


# ---------------------------------------------------------------------------
# Pydantic request models — data viz
# ---------------------------------------------------------------------------


class VizConfigRequest(BaseModel):
    dataset_id: str
    chart_type: str = "scatter"
    library: str = "plotly"
    x_column: str
    y_column: Optional[str] = None
    color_column: Optional[str] = None
    title: str = ""


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _resolve_requesting_user_id(requesting_user: EmailStr) -> str:
    from models.user import User

    user = User.find_by_email(str(requesting_user).lower())
    if not user:
        raise HTTPException(
            status_code=404,
            detail=f"Requesting user '{requesting_user}' not found",
        )
    return str(user["_id"])


def _resolve_task_id_or_404(task_identifier: str) -> str:
    task_doc = Task.find_by_identifier(task_identifier)
    if not task_doc:
        raise HTTPException(
            status_code=404, detail=f"Task '{task_identifier}' not found"
        )
    return str(task_doc.get("_id"))


def _resolve_task_actor(
    task_identifier: str,
    requesting_user: EmailStr,
    agent_user_id: Optional[str],
) -> tuple[str, str]:
    """
    Resolve canonical task id and effective user id.

    Uses requesting_user for RBAC checks and tolerates missing agent auth channels
    for Foundry calls that omit api_key/header tokens.
    """
    canonical_task_id = _resolve_task_id_or_404(task_identifier)
    actual_user_id = _resolve_requesting_user_id(requesting_user)

    if agent_user_id:
        return canonical_task_id, actual_user_id

    # Fallback path mirrors create-code-review behavior when Foundry sends no auth channels.
    from models.project import Project

    task_doc = Task.find_by_id(canonical_task_id)
    if not task_doc:
        raise HTTPException(status_code=404, detail=f"Task '{task_identifier}' not found")

    project_id = str(task_doc.get("project_id", ""))
    if not Project.is_member(project_id, actual_user_id):
        raise HTTPException(
            status_code=403,
            detail="Requesting user is not a member/owner of the target project.",
        )

    return canonical_task_id, actual_user_id


def _unwrap_controller_response(response: Dict[str, Any]) -> Dict[str, Any]:
    status = int(response.get("statusCode", response.get("status", 200)))
    body = response.get("body", "{}")
    if isinstance(body, str):
        try:
            payload = json.loads(body)
        except Exception:
            payload = {"message": body}
    else:
        payload = body
    if status >= 400:
        detail = payload.get("error") if isinstance(payload, dict) else str(payload)
        raise HTTPException(status_code=status, detail=detail or "Request failed")
    return payload if isinstance(payload, dict) else {"data": payload}


def _handle_controller_response(response: Dict[str, Any]) -> Any:
    """Thin wrapper used by data-viz endpoints (mirrors data_router logic)."""
    status_code = response.get("status", 500)
    body = response.get("body", "{}")
    payload = json.loads(body) if isinstance(body, str) else body
    if status_code >= 400:
        raise HTTPException(
            status_code=status_code, detail=payload.get("error", "Unknown error")
        )
    return payload


def _send_report_email_sync(
    to_email: str,
    subject: str,
    message: str,
    report_url: str,
) -> Dict[str, Any]:
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USERNAME") or os.getenv("GMAIL_ADDRESS")
    smtp_password = os.getenv("SMTP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM") or smtp_user

    if not smtp_user or not smtp_password or not smtp_from:
        raise RuntimeError(
            "SMTP not configured. Set SMTP_USERNAME/SMTP_PASSWORD "
            "(or GMAIL_ADDRESS/GMAIL_APP_PASSWORD)."
        )

    body = f"{message}\n\nReport link: {report_url}\n"
    email_message = EmailMessage()
    email_message["From"] = smtp_from
    email_message["To"] = to_email
    email_message["Subject"] = subject
    email_message.set_content(body)

    socket.setdefaulttimeout(15)
    with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15) as smtp:
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(email_message)

    return {
        "to_email": to_email,
        "from_email": smtp_from,
        "subject": subject,
        "delivery_mode": "link_only",
        "report_url": report_url,
        "smtp_host": smtp_host,
    }


# ===========================================================================
# Task endpoints
# ===========================================================================


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


@router.put("/tasks/{task_id}/status")
async def update_task_status_automation(
    task_id: str,
    request: UpdateTaskStatusAutomationRequest,
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """Update task status using ticket ID or Mongo _id."""
    canonical_task_id, actual_user_id = _resolve_task_actor(
        task_id,
        request.requesting_user,
        agent_user_id,
    )
    response = task_controller.update_task(
        json.dumps({"status": request.status}),
        canonical_task_id,
        actual_user_id,
    )
    return _unwrap_controller_response(response)


@router.put("/tasks/{task_id}/priority")
async def update_task_priority_automation(
    task_id: str,
    request: UpdateTaskPriorityAutomationRequest,
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """Update task priority using ticket ID or Mongo _id."""
    canonical_task_id, actual_user_id = _resolve_task_actor(
        task_id,
        request.requesting_user,
        agent_user_id,
    )
    response = task_controller.update_task(
        json.dumps({"priority": request.priority}),
        canonical_task_id,
        actual_user_id,
    )
    return _unwrap_controller_response(response)


@router.post("/tasks/{task_id}/approve")
async def approve_task_automation(
    task_id: str,
    request: ApproveTaskAutomationRequest,
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """Approve a Done task and move it to Closed using ticket ID or Mongo _id."""
    canonical_task_id, actual_user_id = _resolve_task_actor(
        task_id,
        request.requesting_user,
        agent_user_id,
    )
    response = task_controller.approve_task(canonical_task_id, actual_user_id)
    return _unwrap_controller_response(response)


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


@router.post("/tasks/{task_id}/labels")
async def add_task_label_automation(
    task_id: str,
    request: AddTaskLabelAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Add a label to a task using ticket ID or Mongo _id."""
    _ = agent_user_id
    actual_user_id = _resolve_requesting_user_id(request.requesting_user)
    canonical_task_id = _resolve_task_id_or_404(task_id)
    response = task_controller.add_label_to_task(
        canonical_task_id,
        json.dumps({"label": request.label}),
        actual_user_id,
    )
    return _unwrap_controller_response(response)


@router.post("/tasks/{task_id}/attachments")
async def add_task_attachment_automation(
    task_id: str,
    request: AddTaskAttachmentAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Add an attachment link/document to a task using ticket ID or Mongo _id."""
    _ = agent_user_id
    actual_user_id = _resolve_requesting_user_id(request.requesting_user)
    canonical_task_id = _resolve_task_id_or_404(task_id)

    attachment_payload: Dict[str, Any] = {
        "name": request.name,
        "url": request.url,
    }
    if request.fileName:
        attachment_payload["fileName"] = request.fileName
    if request.fileType:
        attachment_payload["fileType"] = request.fileType
    if request.fileSize is not None:
        attachment_payload["fileSize"] = request.fileSize

    response = task_controller.add_attachment_to_task(
        canonical_task_id,
        json.dumps(attachment_payload),
        actual_user_id,
    )
    return _unwrap_controller_response(response)


@router.post("/tasks/{task_id}/comments")
async def add_task_comment_automation(
    task_id: str,
    request: AddTaskCommentAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Add a comment activity to a task using ticket ID or Mongo _id."""
    _ = agent_user_id
    actual_user_id = _resolve_requesting_user_id(request.requesting_user)
    canonical_task_id = _resolve_task_id_or_404(task_id)
    response = task_controller.add_task_comment(
        canonical_task_id,
        json.dumps({"comment": request.comment}),
        actual_user_id,
    )
    return _unwrap_controller_response(response)


@router.post("/tasks/{task_id}/links")
async def add_task_link_automation(
    task_id: str,
    request: AddTaskLinkAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Add a linked-ticket relationship to a task using ticket ID or Mongo _id."""
    _ = agent_user_id
    actual_user_id = _resolve_requesting_user_id(request.requesting_user)
    canonical_task_id = _resolve_task_id_or_404(task_id)

    link_payload: Dict[str, Any] = {
        "type": request.type,
    }
    if request.linked_task_id:
        linked_task_doc = Task.find_by_identifier(request.linked_task_id)
        if not linked_task_doc:
            raise HTTPException(
                status_code=404,
                detail=f"Linked task '{request.linked_task_id}' not found",
            )
        link_payload["linked_task_id"] = str(linked_task_doc.get("_id"))
    if request.linked_ticket_id:
        link_payload["linked_ticket_id"] = request.linked_ticket_id

    response = task_controller.add_link_to_task(
        canonical_task_id,
        json.dumps(link_payload),
        actual_user_id,
    )
    return _unwrap_controller_response(response)


@router.get("/tasks/{task_id}/git-activity")
async def get_task_git_activity_automation(
    task_id: str,
    requesting_user: Optional[EmailStr] = None,
    agent_user_id: str = Depends(verify_agent_token),
):
    """
    Get Git activity for a task (branches, commits, PRs) using agent-token auth.

    Optional requesting_user is accepted for parity with other automation APIs.
    """
    _ = requesting_user
    return json.loads(
        git_controller.get_task_git_activity(task_id, agent_user_id)["body"]
    )


# ===========================================================================
# Project / member endpoints
# ===========================================================================


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


# ===========================================================================
# Sprint endpoints
# ===========================================================================


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


# ===========================================================================
# Code review endpoints
# ===========================================================================


@router.post("/code-review/create")
async def create_code_review_automation(
    request: CreateCodeReviewAutomationRequest,
    requesting_user: Optional[EmailStr] = None,
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Create a code review from a GitHub PR URL with optional immediate analysis.

    Uses agent-token auth (api_key/X-Agent-Key/Bearer service token) instead of user JWT.
    """
    effective_user_id = agent_user_id
    effective_requesting_user = request.requesting_user or requesting_user
    if not effective_user_id:
        if not effective_requesting_user:
            raise HTTPException(
                status_code=401,
                detail=(
                    "Authentication missing for code-review create. "
                    "Provide auth token or requesting_user in body/query."
                ),
            )

        from models.user import User
        from models.project import Project

        requesting_user_doc = User.find_by_email(str(effective_requesting_user).lower())
        if not requesting_user_doc:
            raise HTTPException(
                status_code=404,
                detail=f"Requesting user '{effective_requesting_user}' not found",
            )

        requesting_user_id = str(requesting_user_doc["_id"])
        if not Project.is_member(request.project_id, requesting_user_id):
            raise HTTPException(
                status_code=403,
                detail="Requesting user is not a member/owner of the target project.",
            )

        effective_user_id = requesting_user_id

    _ = effective_user_id
    task_doc = Task.find_by_identifier(request.task_id)
    if not task_doc:
        raise HTTPException(
            status_code=404, detail=f"Task '{request.task_id}' not found"
        )

    canonical_task_id = str(task_doc.get("_id"))
    task_project_id = str(task_doc.get("project_id", ""))
    if task_project_id != request.project_id:
        raise HTTPException(
            status_code=400,
            detail="Task/project mismatch: provided task_id does not belong to provided project_id",
        )

    wait_seconds = max(0, min(int(request.wait_for_analysis_seconds or 0), 120))

    review = await code_review_controller.create_code_review_from_pr(
        project_id=request.project_id,
        task_id=canonical_task_id,
        pr_url=request.pr_url,
        trigger_analysis=request.trigger_analysis,
    )

    if request.trigger_analysis and wait_seconds > 0:
        review_id = str(review.get("_id", ""))
        if review_id:
            deadline = time.monotonic() + wait_seconds
            while time.monotonic() < deadline:
                latest = await code_review_controller.get_code_review_by_id(review_id)
                if latest and latest.get("review_status") in {"completed", "failed"}:
                    review = latest
                    break
                await asyncio.sleep(2)

    git_activity_data = {
        "branches_count": 0,
        "commits_count": 0,
        "pull_requests_count": 0,
    }
    try:
        git_activity_response = json.loads(
            git_controller.get_task_git_activity(canonical_task_id, effective_user_id)[
                "body"
            ]
        )
        if isinstance(git_activity_response, dict):
            payload = (
                git_activity_response.get("data")
                if "data" in git_activity_response
                else git_activity_response
            )
            git_activity_data = {
                "branches_count": payload.get("branches_count", 0),
                "commits_count": payload.get("commits_count", 0),
                "pull_requests_count": payload.get("pull_requests_count", 0),
            }
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Code review created successfully",
        "data": review,
        "git_activity_summary": git_activity_data,
        "analysis_wait_seconds": wait_seconds,
        "analysis_status": review.get("review_status", "pending"),
    }


@router.get("/code-review/review/{review_id}")
async def get_code_review_automation(
    review_id: str,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Get code review by ID using agent-token auth."""
    _ = agent_user_id
    review = await code_review_controller.get_code_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Code review not found")
    return {"status": "success", "data": review}


@router.get("/code-review/task/{task_id}")
async def get_task_code_reviews_automation(
    task_id: str,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Get all code reviews for a task using agent-token auth."""
    task_doc = Task.find_by_identifier(task_id)
    if not task_doc:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

    canonical_task_id = str(task_doc.get("_id"))
    reviews = await code_review_controller.get_code_reviews_by_task(canonical_task_id)

    git_activity_summary = {
        "branches_count": 0,
        "commits_count": 0,
        "pull_requests_count": 0,
    }
    try:
        git_activity_response = json.loads(
            git_controller.get_task_git_activity(canonical_task_id, agent_user_id)[
                "body"
            ]
        )
        if isinstance(git_activity_response, dict):
            payload = (
                git_activity_response.get("data")
                if "data" in git_activity_response
                else git_activity_response
            )
            git_activity_summary = {
                "branches_count": payload.get("branches_count", 0),
                "commits_count": payload.get("commits_count", 0),
                "pull_requests_count": payload.get("pull_requests_count", 0),
            }
    except Exception:
        pass

    return {
        "status": "success",
        "count": len(reviews),
        "data": reviews,
        "git_activity_summary": git_activity_summary,
    }


@router.get("/code-review/project/{project_id}")
async def get_project_code_reviews_automation(
    project_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Get project code reviews using agent-token auth."""
    _ = agent_user_id
    reviews = await code_review_controller.get_code_reviews_by_project(
        project_id=project_id,
        status=status,
        limit=limit,
    )
    return {"status": "success", "count": len(reviews), "data": reviews}


@router.get("/code-review/project/{project_id}/statistics")
async def get_project_review_statistics_automation(
    project_id: str,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Get project code review statistics using agent-token auth."""
    _ = agent_user_id
    stats = await code_review_controller.get_review_statistics(project_id)
    return {"status": "success", "data": stats}


@router.post("/code-review/retry")
async def retry_failed_review_automation(
    request: RetryCodeReviewAutomationRequest,
    agent_user_id: str = Depends(verify_agent_token),
):
    """Retry a failed code review using agent-token auth."""
    _ = agent_user_id
    return await code_review_controller.retry_failed_review(request.review_id)


@router.get("/code-review/health")
async def code_review_health_automation(
    agent_user_id: str = Depends(verify_agent_token),
):
    """Health check for code review subsystem using agent-token auth."""
    _ = agent_user_id
    celery_status = "operational"
    try:
        celery_app.control.inspect().ping()
    except Exception as e:
        celery_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "celery": celery_status,
        "features": {
            "security_scanning": True,
            "ai_analysis": True,
            "quality_metrics": True,
            "github_integration": True,
        },
    }


# ===========================================================================
# Document Intelligence endpoints  (migrated from data_router)
# Previously used get_current_user (JWT); now uses verify_agent_token
# ===========================================================================


@router.post("/document-analyze")
async def agent_document_analyze(
    file: UploadFile = File(None),
    url: str = Form(None),
    question: str = Form(""),
    agent_user_id: str = Depends(verify_agent_token),  # was: get_current_user
):
    """
    Analyze a document (file upload or URL) and return an InsightReport.

    Accepts:
    - file: multipart file upload  (PDF, DOCX, etc.)
    - url:  publicly accessible document URL
    - question: optional natural-language question to answer from the document
    """
    _ = agent_user_id
    if not file and not url:
        raise HTTPException(status_code=400, detail="Provide file OR url")

    try:
        if file:
            file_bytes = await file.read()
            result = analyze_document_from_file(file_bytes, file.filename, question)
        else:
            result = analyze_document_from_url(url, question)
        return success_response({"insight_report": result.dict()})
    except Exception as e:
        return error_response(str(e), 500)


@router.post("/export-pdf")
async def agent_export_pdf(
    report: InsightReport,
    agent_user_id: str = Depends(verify_agent_token),  # was: get_current_user
):
    """
    Generate and stream a PDF from an InsightReport payload.
    """
    _ = agent_user_id
    try:
        pdf_bytes = generate_pdf_report(report)
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="agent_insights.pdf"'
            },
        )
    except Exception as e:
        return error_response(str(e), 500)


@router.post("/export-report")
async def agent_export_report(
    payload: Dict[str, Any],
    http_request: Request,
    requesting_user: Optional[EmailStr] = None,
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Build a structured report payload and generate PDF bytes.

    Returns JSON (not binary stream) so agent tools can consume the result reliably.
    """
    # Accept requesting user from query first, then common body keys.
    body_requesting_user = (
        payload.get("requesting_user")
        or payload.get("user_email")
        or payload.get("email")
    )
    effective_requesting_user = requesting_user or body_requesting_user

    if effective_requesting_user:
        _resolve_requesting_user_id(effective_requesting_user)
    elif not agent_user_id:
        raise HTTPException(
            status_code=401,
            detail=(
                "Authentication missing for export-report. "
                "Provide auth token or requesting_user in query/body."
            ),
        )

    try:
        trend_map = {
            "flat": "neutral",
            "steady": "neutral",
        }

        raw_kpis = payload.get("kpis") or []
        if not isinstance(raw_kpis, list):
            raw_kpis = []

        mapped_kpis = []
        for kpi in raw_kpis:
            if not isinstance(kpi, dict):
                continue

            trend_value = str(kpi.get("trend") or "neutral").lower()
            normalized_trend = trend_map.get(trend_value, trend_value)
            if normalized_trend not in {"up", "down", "neutral"}:
                normalized_trend = "neutral"

            score_value = 0
            try:
                score_value = int(float(str(kpi.get("score", kpi.get("value", 0))).strip()))
            except Exception:
                score_value = 0
            score_value = max(0, min(score_value, 100))

            label_value = (
                kpi.get("label")
                or kpi.get("name")
                or kpi.get("key")
                or "KPI"
            )
            display_value = str(kpi.get("value", score_value))

            mapped_kpis.append(
                {
                    "label": str(label_value),
                    "value": display_value,
                    "trend": normalized_trend,
                    "score": score_value,
                }
            )

        raw_key_insights = payload.get("key_insights")
        if raw_key_insights is None:
            raw_key_insights = payload.get("insights")

        if not isinstance(raw_key_insights, list):
            raw_key_insights = []

        mapped_insights = []
        for idx, insight_item in enumerate(raw_key_insights, start=1):
            if isinstance(insight_item, dict):
                insight_title = str(insight_item.get("title") or f"Insight {idx}")
                insight_body = str(
                    insight_item.get("body")
                    or insight_item.get("text")
                    or insight_item.get("value")
                    or ""
                )
            else:
                insight_title = f"Insight {idx}"
                insight_body = str(insight_item)

            if not insight_body.strip():
                continue

            mapped_insights.append(
                {
                    "category": "Performance",
                    "priority": "MEDIUM",
                    "title": insight_title,
                    "body": insight_body,
                }
            )

        report_title = (
            payload.get("report_title")
            or payload.get("title")
            or payload.get("doc_name")
            or "Structured Report"
        )

        executive_summary = (
            payload.get("executive_summary")
            or payload.get("summary")
            or payload.get("analysis_summary")
            or "Automated report generated from dataset analysis."
        )

        raw_recommendations = payload.get("recommendations") or []
        if not isinstance(raw_recommendations, list):
            raw_recommendations = [str(raw_recommendations)]

        email_to_value = payload.get("email_to")
        export_format_value = str(payload.get("export_format") or "pdf")
        omit_pdf_base64 = _to_bool(payload.get("omit_pdf_base64"))

        report = InsightReport(
            doc_name=str(report_title),
            question="Generated from dataset analysis",
            summary=str(executive_summary),
            kpis=mapped_kpis,
            insights=mapped_insights,
            recommendations=[str(item) for item in raw_recommendations],
            top_performers=[],
            bottom_performers=[],
            score_distribution=None,
            generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            parser_used="agent-export-report",
        )

        pdf_bytes = generate_pdf_report(report)
        pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")

        # Persist report PDF under static uploads so clients can download via URL.
        reports_dir = Path("uploads") / "ai_attachments"
        reports_dir.mkdir(parents=True, exist_ok=True)
        file_name = f"report_{int(time.time())}_{uuid4().hex[:8]}.pdf"
        output_path = reports_dir / file_name
        output_path.write_bytes(pdf_bytes)

        download_path = f"/uploads/ai_attachments/{file_name}"
        base_url = str(http_request.base_url).rstrip("/")
        download_url = f"{base_url}{download_path}"
        download_markdown = f"[Download Full Report]({download_url})"

        # Keep response compact while still enabling downstream attachment handling.
        response_payload: Dict[str, Any] = {
            "status": "success",
            "message": "Report generated successfully",
            "requesting_user": str(effective_requesting_user) if effective_requesting_user else None,
            "email_to": str(email_to_value) if email_to_value else None,
            "export_format": export_format_value,
            "delivery_mode": "response_download",
            "stored_to_sharepoint": False,
            "pdf_generated": True,
            "pdf_size_bytes": len(pdf_bytes),
            "file_name": file_name,
            "download_path": download_path,
            "download_url": download_url,
            "download_markdown": download_markdown,
            "pdf_base64_included": not omit_pdf_base64,
            "email_handoff": {
                "mode": "url_only",
                "to": str(email_to_value) if email_to_value else None,
                "subject": f"{report_title} - Structured Report",
                "attachment_url": download_url,
                "attachment_name": file_name,
                "notes": "Use attachment_url in mail/Logic App flow to avoid large payload timeouts.",
            },
            "report": report.dict(),
        }

        if not omit_pdf_base64:
            response_payload["pdf_base64"] = pdf_b64

        return response_payload
    except Exception as e:
        return error_response(str(e), 500)


@router.post("/send-report-email")
async def send_report_email_automation(
    request: SendReportEmailRequest,
    agent_user_id: Optional[str] = Depends(verify_agent_token_optional),
):
    """
    Send report email directly via SMTP as fallback when Mail_Agent/Logic App is unavailable.
    """
    if request.requesting_user:
        _resolve_requesting_user_id(request.requesting_user)
    elif not agent_user_id:
        raise HTTPException(
            status_code=401,
            detail=(
                "Authentication missing for send-report-email. "
                "Provide auth token or requesting_user in body."
            ),
        )

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(
                _send_report_email_sync,
                str(request.to_email),
                str(request.subject or "Structured Report"),
                str(request.message or "Please find your generated report at the link below."),
                str(request.report_url),
            ),
            timeout=20,
        )
        return {
            "status": "success",
            "message": "Report email sent successfully",
            "requesting_user": str(request.requesting_user),
            **result,
        }
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Email send timed out. Retry with valid SMTP configuration.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Email send failed: {str(exc)}")


# ===========================================================================
# Data Visualisation endpoints  (migrated from data_router)
# Previously used get_current_user (JWT); now uses verify_agent_token
# ===========================================================================


@router.post("/dataset-upload")
async def agent_dataset_upload(
    file: UploadFile = File(...),
    agent_user_id: str = Depends(verify_agent_token),  # was: get_current_user
):
    """
    Upload a dataset file (CSV, Excel, JSON) for subsequent analysis/visualisation.
    """
    file_bytes = await file.read()
    result = DataVizController.upload_file(file_bytes, file.filename, agent_user_id)
    return _handle_controller_response(result)


@router.post("/dataset-analyze")
async def agent_dataset_analyze(
    request: Dict[str, Any],
    agent_user_id: str = Depends(verify_agent_token),  # was: get_current_user
):
    """
    Run statistical analysis on a previously uploaded dataset.
    """
    return handle_analyze(request, agent_user_id)


@router.post("/visualize")
async def agent_visualize(
    request: VizConfigRequest,
    agent_user_id: str = Depends(verify_agent_token),  # was: get_current_user
):
    """
    Generate a visualisation from a dataset using the supplied chart config.
    """
    return handle_visualize(request.dict(), agent_user_id)


@router.get("/datasets")
async def agent_get_datasets(
    agent_user_id: str = Depends(verify_agent_token),  # was: get_current_user
):
    """List all datasets accessible to the agent."""
    return handle_get_datasets(agent_user_id)


@router.get("/visualizations")
async def agent_get_visualizations(
    agent_user_id: str = Depends(verify_agent_token),  # was: get_current_user
):
    """List all saved visualisations accessible to the agent."""
    return handle_get_visualizations(agent_user_id)
