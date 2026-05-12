# dependencies.py
from fastapi import Header, HTTPException, Request, Depends
from typing import Optional
from utils.auth_utils import verify_token
from models.user import User

# ── Paths where device-fingerprint + tab-key checks are bypassed ──────────────
# The browser User-Agent can differ between the login request and subsequent
# API calls when running behind ngrok or any reverse proxy, causing false
# "device mismatch" blocks.  Checks 1-3 (blacklist, token version, active
# session) still run in full — only the fingerprint + tab-key checks are skipped.
_SKIP_DEVICE_CHECK_PREFIXES = (
    "/api/meetings",               # meeting schedule feature
    "/api/schedule-agent/",
    "/api/chat/",
    "/api/ai/",
    "/api/mcp-agent/",
    "/api/langgraph-agent/",
    "/api/local-agent/",
    "/api/azure-agent/",
    "/api/voice-chat/",
    "/api/document-intelligence/",
    "/api/data-viz/",
    "/api/global-insights/",
)

def _should_skip_device_check(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in _SKIP_DEVICE_CHECK_PREFIXES)


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_tab_session_key: Optional[str] = Header(None, alias="X-Tab-Session-Key")
) -> str:
    """
    Dependency to get current authenticated user.
    Returns user_id (str) — unchanged interface, all existing routers work as-is.

    Device fingerprint + tab-key checks are bypassed for AI/agent/chat/meeting
    endpoints (see _SKIP_DEVICE_CHECK_PREFIXES) because the browser User-Agent
    string varies behind ngrok, causing false 401s on those routes.
    Checks 1-3 (blacklist, token version, active session) are always enforced.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized. Please login.")

    token = authorization[7:]

    # Resolve client IP
    forwarded_for = request.headers.get("X-Forwarded-For")
    ip_address = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else (request.headers.get("X-Real-IP") or (request.client.host if request.client else "unknown"))
    )
    user_agent = request.headers.get("User-Agent", "Unknown")
    path       = request.url.path

    is_refresh  = path.startswith("/api/auth/refresh-session")
    skip_device = _should_skip_device_check(path)

    if skip_device:
        # Pass ip_address=None → auth_utils skips the fingerprint block entirely.
        # skip_device_check=True is the explicit second guard in auth_utils.
        # skip_tab_validation=True because these endpoints don't use sessionStorage keys.
        user_id = verify_token(
            token,
            ip_address=None,
            user_agent=None,
            tab_session_key=None,
            skip_tab_validation=True,
            skip_device_check=True,
        )
    else:
        # Full strict validation for all auth / project / task / sprint routes
        user_id = verify_token(
            token,
            ip_address=ip_address,
            user_agent=user_agent,
            tab_session_key=x_tab_session_key,
            skip_tab_validation=is_refresh,
            skip_device_check=False,
        )

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user_id  # str — same as before, zero changes needed in existing routers


async def get_current_user_obj(
    user_id: str = Depends(get_current_user),
) -> dict:
    """
    Used ONLY by the new meeting_router and schedule_agent_router.
    Returns the full MongoDB user document so routers can access user["_id"].
    All existing routers continue to use get_current_user (returns str).
    """
    user = User.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


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