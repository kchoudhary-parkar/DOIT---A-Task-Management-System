from fastapi import APIRouter, Depends, HTTPException
from schemas import (
    TaskCreate, TaskUpdate, AddLabelRequest, AddAttachmentRequest,
    RemoveAttachmentRequest, AddLinkRequest, RemoveLinkRequest, AddCommentRequest
)
from controllers import task_controller, git_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response
import json

router = APIRouter()

@router.post("")
async def create_task(data: TaskCreate, user_id: str = Depends(get_current_user)):
    """Create new task"""
    body = json.dumps(data.model_dump())
    response = task_controller.create_task(body, user_id)
    return handle_controller_response(response)

@router.get("/my")
async def get_my_tasks(user_id: str = Depends(get_current_user)):
    """Get tasks assigned to me"""
    response = task_controller.get_my_tasks(user_id)
    return handle_controller_response(response)

@router.get("/pending-approval")
async def get_pending_approval(user_id: str = Depends(get_current_user)):
    """Get all pending approval tasks"""
    response = task_controller.get_all_pending_approval_tasks(user_id)
    return handle_controller_response(response)

@router.get("/closed")
async def get_closed_tasks(user_id: str = Depends(get_current_user)):
    """Get all closed tasks"""
    response = task_controller.get_all_closed_tasks(user_id)
    return handle_controller_response(response)

@router.get("/project/{project_id}")
async def get_project_tasks(project_id: str, user_id: str = Depends(get_current_user)):
    """Get all tasks for a project"""
    response = task_controller.get_project_tasks(project_id, user_id)
    return handle_controller_response(response)

@router.get("/{task_id}")
async def get_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Get task by ID"""
    response = task_controller.get_task_by_id(task_id, user_id)
    return handle_controller_response(response)

@router.put("/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, user_id: str = Depends(get_current_user)):
    """Update task - CRITICAL for Kanban drag-drop"""
    body = json.dumps(data.model_dump())
    response = task_controller.update_task(body, task_id, user_id)
    return handle_controller_response(response)

@router.delete("/{task_id}")
async def delete_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Delete task"""
    response = task_controller.delete_task(task_id, user_id)
    return handle_controller_response(response)

# Labels
@router.post("/{task_id}/labels")
async def add_label(task_id: str, data: AddLabelRequest, user_id: str = Depends(get_current_user)):
    """Add label to task"""
    body = json.dumps(data.model_dump())
    response = task_controller.add_label_to_task(task_id, body, user_id)
    return handle_controller_response(response)

@router.delete("/{task_id}/labels/{label}")
async def remove_label(task_id: str, label: str, user_id: str = Depends(get_current_user)):
    """Remove label from task"""
    response = task_controller.remove_label_from_task(task_id, label, user_id)
    return handle_controller_response(response)

@router.get("/labels/{project_id}")
async def get_project_labels(project_id: str, user_id: str = Depends(get_current_user)):
    """Get all labels for project"""
    response = task_controller.get_project_labels(project_id, user_id)
    return handle_controller_response(response)

# Attachments
@router.post("/{task_id}/attachments")
async def add_attachment(task_id: str, data: AddAttachmentRequest, user_id: str = Depends(get_current_user)):
    """Add attachment to task"""
    body = json.dumps(data.model_dump())
    response = task_controller.add_attachment_to_task(task_id, body, user_id)
    return handle_controller_response(response)

@router.delete("/{task_id}/attachments")
async def remove_attachment(task_id: str, data: RemoveAttachmentRequest, user_id: str = Depends(get_current_user)):
    """Remove attachment from task"""
    body = json.dumps(data.model_dump())
    response = task_controller.remove_attachment_from_task(task_id, body, user_id)
    return handle_controller_response(response)

# Links
@router.post("/{task_id}/links")
async def add_link(task_id: str, data: AddLinkRequest, user_id: str = Depends(get_current_user)):
    """Add link to another task"""
    body = json.dumps(data.model_dump())
    response = task_controller.add_link_to_task(task_id, body, user_id)
    return handle_controller_response(response)

@router.delete("/{task_id}/links")
async def remove_link(task_id: str, data: RemoveLinkRequest, user_id: str = Depends(get_current_user)):
    """Remove link from task"""
    body = json.dumps(data.model_dump())
    response = task_controller.remove_link_from_task(task_id, body, user_id)
    return handle_controller_response(response)

# Approval
@router.post("/{task_id}/approve")
async def approve_task(task_id: str, user_id: str = Depends(get_current_user)):
    """Approve and close task"""
    response = task_controller.approve_task(task_id, user_id)
    return handle_controller_response(response)

# Comments
@router.post("/{task_id}/comments")
async def add_comment(task_id: str, data: AddCommentRequest, user_id: str = Depends(get_current_user)):
    """Add comment to task"""
    body = json.dumps(data.model_dump())
    response = task_controller.add_task_comment(task_id, body, user_id)
    return handle_controller_response(response)

# Git Activity
@router.get("/git-activity/{task_id}")
async def get_git_activity(task_id: str, user_id: str = Depends(get_current_user)):
    """Get GitHub activity for a task (branches, commits, PRs)"""
    response = git_controller.get_task_git_activity(task_id, user_id)
    return handle_controller_response(response)