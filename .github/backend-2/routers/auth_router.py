from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from schemas import (
    RegisterRequest, LoginRequest, ClerkSyncRequest,
    LogoutRequest, ChangePasswordRequest
)
from controllers import auth_controller
from dependencies import get_current_user
import json

router = APIRouter()

def handle_controller_response(response):
    """Helper to handle controller response format"""
    status_code = response.get("status", 500)
    body = response.get("body", "{}")
    
    # Parse body if it's a string
    if isinstance(body, str):
        try:
            body_data = json.loads(body)
        except:
            body_data = {"error": body}
    else:
        body_data = body
    
    # Raise HTTPException if error
    if status_code >= 400:
        error_msg = body_data.get("error", "Unknown error")
        raise HTTPException(status_code=status_code, detail=error_msg)
    
    return body_data

@router.post("/register")
async def register(request: Request, data: RegisterRequest):
    """Register a new user"""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    body = json.dumps(data.model_dump())
    response = auth_controller.register(body, ip_address, user_agent)
    return handle_controller_response(response)

@router.post("/login")
async def login(request: Request, data: LoginRequest):
    """Login user"""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    body = json.dumps(data.model_dump())
    response = auth_controller.login(body, ip_address, user_agent)
    return handle_controller_response(response)

@router.post("/clerk-sync")
async def clerk_sync(request: Request, data: ClerkSyncRequest):
    """Sync Clerk user with backend"""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    body = json.dumps(data.model_dump())
    response = auth_controller.clerk_sync(body, ip_address, user_agent)
    return handle_controller_response(response)

@router.get("/profile")
async def get_profile(user_id: str = Depends(get_current_user)):
    """Get current user profile"""
    response = auth_controller.profile(user_id)
    return handle_controller_response(response)

@router.post("/logout")
async def logout(data: LogoutRequest, user_id: str = Depends(get_current_user)):
    """Logout current session"""
    body = json.dumps(data.model_dump())
    response = auth_controller.logout(user_id, body)
    return handle_controller_response(response)

@router.post("/logout-all")
async def logout_all(user_id: str = Depends(get_current_user)):
    """Logout all sessions"""
    response = auth_controller.logout_all_sessions(user_id)
    return handle_controller_response(response)

@router.post("/refresh-session")
async def refresh_session(request: Request, user_id: str = Depends(get_current_user)):
    """Create new tab session"""
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    response = auth_controller.refresh_session(user_id, ip_address, user_agent)
    return handle_controller_response(response)

@router.get("/sessions")
async def get_sessions(user_id: str = Depends(get_current_user)):
    """Get active sessions"""
    response = auth_controller.get_user_sessions(user_id)
    return handle_controller_response(response)

@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, user_id: str = Depends(get_current_user)):
    """Change user password"""
    body = json.dumps(data.model_dump())
    response = auth_controller.change_password(user_id, body)
    return handle_controller_response(response)