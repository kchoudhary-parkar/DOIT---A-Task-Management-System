from fastapi import APIRouter, Depends
from schemas import AddMemberRequest
from controllers import member_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response
import json

router = APIRouter()

@router.post("/{project_id}/members")
async def add_member(project_id: str, data: AddMemberRequest, user_id: str = Depends(get_current_user)):
    """Add member to project"""
    body = json.dumps(data.model_dump())
    response = member_controller.add_project_member(body, project_id, user_id)
    return handle_controller_response(response)

@router.get("/{project_id}/members")
async def get_members(project_id: str, user_id: str = Depends(get_current_user)):
    """Get project members"""
    response = member_controller.get_project_members(project_id, user_id)
    return handle_controller_response(response)

@router.delete("/{project_id}/members/{member_user_id}")
async def remove_member(project_id: str, member_user_id: str, user_id: str = Depends(get_current_user)):
    """Remove member from project"""
    response = member_controller.remove_project_member(project_id, member_user_id, user_id)
    return handle_controller_response(response)