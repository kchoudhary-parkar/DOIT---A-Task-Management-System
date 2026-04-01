from fastapi import APIRouter, Depends
from controllers import system_dashboard_controller
from dependencies import require_super_admin
from utils.router_helpers import handle_controller_response

router = APIRouter()

@router.get("/system")
async def get_system_analytics(user_id: str = Depends(require_super_admin)):
    """Get system analytics (super-admin only)"""
    response = system_dashboard_controller.get_system_analytics(user_id)
    return handle_controller_response(response)