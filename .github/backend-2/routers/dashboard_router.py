from fastapi import APIRouter, Depends
from controllers import dashboard_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response

router = APIRouter()

@router.get("/analytics")
async def get_analytics(user_id: str = Depends(get_current_user)):
    """Get dashboard analytics"""
    response = dashboard_controller.get_dashboard_analytics(user_id)
    return handle_controller_response(response)

@router.get("/report")
async def get_report(user_id: str = Depends(get_current_user)):
    """Get downloadable report"""
    response = dashboard_controller.get_downloadable_report(user_id)
    return handle_controller_response(response)