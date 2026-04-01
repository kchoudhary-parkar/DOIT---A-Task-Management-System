from fastapi import APIRouter, Depends
from schemas import SprintCreate, SprintUpdate, AddTaskToSprintRequest
from controllers import sprint_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response
import json

router = APIRouter()

# Create sprint (matches /api/projects/{project_id}/sprints)
@router.post("/projects/{project_id}/sprints")
async def create_sprint(project_id: str, data: SprintCreate, user_id: str = Depends(get_current_user)):
    """Create sprint"""
    body = json.dumps(data.model_dump())
    response = sprint_controller.create_sprint(body, project_id, user_id)
    return handle_controller_response(response)

# Get project sprints (matches /api/projects/{project_id}/sprints)
@router.get("/projects/{project_id}/sprints")
async def get_sprints(project_id: str, user_id: str = Depends(get_current_user)):
    """Get project sprints"""
    response = sprint_controller.get_project_sprints(project_id, user_id)
    return handle_controller_response(response)

# Also support /api/sprints/project/{project_id} for backward compatibility
@router.get("/sprints/project/{project_id}")
async def get_sprints_alt(project_id: str, user_id: str = Depends(get_current_user)):
    """Get project sprints (alternate route)"""
    response = sprint_controller.get_project_sprints(project_id, user_id)
    return handle_controller_response(response)

@router.get("/projects/{project_id}/backlog")
async def get_backlog(project_id: str, user_id: str = Depends(get_current_user)):
    """Get backlog tasks"""
    response = sprint_controller.get_backlog_tasks(project_id, user_id)
    return handle_controller_response(response)

@router.get("/projects/{project_id}/available-tasks")
async def get_available_tasks(project_id: str, user_id: str = Depends(get_current_user)):
    """Get available tasks for sprint"""
    response = sprint_controller.get_available_sprint_tasks(project_id, user_id)
    return handle_controller_response(response)

@router.get("/sprints/{sprint_id}")
async def get_sprint(sprint_id: str, user_id: str = Depends(get_current_user)):
    """Get sprint by ID"""
    response = sprint_controller.get_sprint_by_id(sprint_id, user_id)
    return handle_controller_response(response)

@router.put("/sprints/{sprint_id}")
async def update_sprint(sprint_id: str, data: SprintUpdate, user_id: str = Depends(get_current_user)):
    """Update sprint"""
    body = json.dumps(data.model_dump())
    response = sprint_controller.update_sprint(body, sprint_id, user_id)
    return handle_controller_response(response)

@router.delete("/sprints/{sprint_id}")
async def delete_sprint(sprint_id: str, user_id: str = Depends(get_current_user)):
    """Delete sprint"""
    response = sprint_controller.delete_sprint(sprint_id, user_id)
    return handle_controller_response(response)

@router.post("/sprints/{sprint_id}/start")
async def start_sprint(sprint_id: str, user_id: str = Depends(get_current_user)):
    """Start sprint"""
    response = sprint_controller.start_sprint(sprint_id, user_id)
    return handle_controller_response(response)

@router.post("/sprints/{sprint_id}/complete")
async def complete_sprint(sprint_id: str, user_id: str = Depends(get_current_user)):
    """Complete sprint"""
    response = sprint_controller.complete_sprint(sprint_id, user_id)
    return handle_controller_response(response)

@router.post("/sprints/{sprint_id}/tasks")
async def add_task_to_sprint(sprint_id: str, data: AddTaskToSprintRequest, user_id: str = Depends(get_current_user)):
    """Add task to sprint"""
    body = json.dumps(data.model_dump())
    response = sprint_controller.add_task_to_sprint(sprint_id, body, user_id)
    return handle_controller_response(response)

@router.delete("/sprints/{sprint_id}/tasks/{task_id}")
async def remove_task_from_sprint(sprint_id: str, task_id: str, user_id: str = Depends(get_current_user)):
    """Remove task from sprint"""
    response = sprint_controller.remove_task_from_sprint(sprint_id, task_id, user_id)
    return handle_controller_response(response)