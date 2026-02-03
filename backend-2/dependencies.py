# dependencies.py
from fastapi import Header, HTTPException, Request, Depends
from typing import Optional
from utils.auth_utils import verify_token
from models.user import User

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_tab_session_key: Optional[str] = Header(None, alias="X-Tab-Session-Key")
) -> str:
    """Dependency to get current authenticated user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized. Please login.")
    
    token = authorization[7:]
    
    # Get IP and User-Agent for security
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    # Check if this is refresh-session endpoint
    skip_tab_validation = request.url.path.startswith("/api/auth/refresh-session")
    
    user_id = verify_token(token, ip_address, user_agent, x_tab_session_key, skip_tab_validation)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user_id

async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    x_tab_session_key: Optional[str] = Header(None, alias="X-Tab-Session-Key"),
    request: Request = None
) -> Optional[str]:
    """Optional authentication - returns None if not authenticated"""
    try:
        return await get_current_user(request, authorization, x_tab_session_key)
    except HTTPException:
        return None

async def require_admin(user_id: str = Depends(get_current_user)) -> str:
    """Require admin or super-admin role"""
    user = User.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") not in ["admin", "super-admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")
    
    return user_id

async def require_super_admin(user_id: str = Depends(get_current_user)) -> str:
    """Require super-admin role"""
    user = User.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("role") != "super-admin":
        raise HTTPException(status_code=403, detail="Access denied. Super-admin privileges required.")
    
    return user_id