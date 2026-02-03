from fastapi import APIRouter, Depends
from schemas import ChatAskRequest
from controllers import chat_controller
from dependencies import get_current_user
from utils.router_helpers import handle_controller_response
import json

router = APIRouter()

@router.post("/ask")
async def chat_ask(data: ChatAskRequest, user_id: str = Depends(get_current_user)):
    """Ask AI chat"""
    body = json.dumps(data.model_dump())
    response = chat_controller.chat_ask(body, user_id)
    return handle_controller_response(response)

@router.get("/suggestions")
async def get_suggestions(user_id: str = Depends(get_current_user)):
    """Get chat suggestions"""
    response = chat_controller.get_chat_suggestions(user_id)
    return handle_controller_response(response)

@router.get("/projects")
async def get_user_chat_projects(user_id: str = Depends(get_current_user)):
    """Get user's chat projects - stub implementation"""
    return {"projects": []}

@router.get("/stats")
async def get_chat_stats(user_id: str = Depends(get_current_user)):
    """Get chat statistics - stub implementation"""
    return {
        "total_messages": 0,
        "unread_count": 0,
        "active_channels": 0
    }

@router.get("/mentions")
async def get_user_mentions(user_id: str = Depends(get_current_user)):
    """Get user mentions - stub implementation"""
    return {"mentions": []}