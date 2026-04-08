from fastapi import APIRouter, Depends
from schemas import ProjectCreate, ProjectUpdate
from controllers import project_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response
import json

router = APIRouter()


@router.post("")
async def create_project(data: ProjectCreate, user_id: str = Depends(get_current_user)):
    """
    Create new project with optional auto-provisioning of team integrations

    **Required fields:**
    - name: Project name

    **Optional fields:**
    - description: Project description
    - integrations: Platform integrations to auto-provision or configure
        - discord: {guild_id, bot_token}
        - slack: {workspace_token (xoxb-...)}
        - teams: {webhook_url} (manual Teams incoming webhook)

    **Example:**
    ```json
    {
        "name": "Marketing Campaign",
        "description": "Q1 2024 Campaign",
        "integrations": {
            "discord": {
                "guild_id": "",
                "bot_token": ""
            },
            "slack": {
                "workspace_token": "<SLACK_BOT_TOKEN>"
            },
            "teams": {
                "webhook_url": "https://outlook.office.com/webhook/..."
            }
        }
    }
    ```

    **Returns:**
    - Project object with _id
    - integrations_provisioned: Summary of created integrations

    **Notes:**
    - Only admins can create projects
    - All integrations are optional
    - If integrations provided, channels are auto-created and webhooks/bots are configured
    - Team members can join project after creation via project settings
    """
    body = json.dumps(data.model_dump())
    response = project_controller.create_project(body, user_id)
    return handle_controller_response(response)


@router.get("")
async def get_projects(user_id: str = Depends(get_current_user)):
    """Get all user projects"""
    response = project_controller.get_user_projects(user_id)
    return handle_controller_response(response)


@router.get("/{project_id}")
async def get_project(project_id: str, user_id: str = Depends(get_current_user)):
    """Get project by ID"""
    response = project_controller.get_project_by_id(project_id, user_id)
    return handle_controller_response(response)


@router.put("/{project_id}")
async def update_project(
    project_id: str, data: ProjectUpdate, user_id: str = Depends(get_current_user)
):
    """Update project"""
    body = json.dumps(data.model_dump())
    response = project_controller.update_project(body, project_id, user_id)
    return handle_controller_response(response)


@router.delete("/{project_id}")
async def delete_project(project_id: str, user_id: str = Depends(get_current_user)):
    """Delete project"""
    response = project_controller.delete_project(project_id, user_id)
    return handle_controller_response(response)
