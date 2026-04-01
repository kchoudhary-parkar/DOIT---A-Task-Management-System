from fastapi import APIRouter, Depends, Query
from schemas import UpdateUserRoleRequest
from controllers import user_controller
from dependencies import get_current_user, require_admin, require_super_admin
from utils.router_helpers import handle_controller_response
import json

router = APIRouter()

@router.get("/search")
async def search_users(email: str = Query(...), user_id: str = Depends(get_current_user)):
    """Search users by email"""
    response = user_controller.search_users_by_email(email)
    return handle_controller_response(response)

@router.get("")
async def get_all_users(user_id: str = Depends(require_admin)):
    """Get all users (admin only)"""
    response = user_controller.get_all_users(user_id)
    return handle_controller_response(response)

@router.put("/role")
async def update_role(data: UpdateUserRoleRequest, user_id: str = Depends(require_super_admin)):
    """Update user role (super-admin only)"""
    body = json.dumps(data.model_dump())
    response = user_controller.update_user_role(user_id, body)
    return handle_controller_response(response)