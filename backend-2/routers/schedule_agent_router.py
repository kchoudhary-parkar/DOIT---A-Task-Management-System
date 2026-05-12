"""
routers/schedule_agent_router.py

FastAPI router for the schedule AI agent chat endpoint.
Mirrors DOIT's mcp_agent_router.py / langgraph_agent_router.py pattern.

Register in main.py:
    from routers.schedule_agent_router import schedule_agent_router
    app.include_router(schedule_agent_router)
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from dependencies import get_current_user_obj as get_current_user   # returns full user dict

# Wrap import so any failure deep in the chain surfaces with a clear message
try:
    from controllers.schedule_agent_controller import run_schedule_agent
except Exception as _err:
    raise ImportError(
        f"schedule_agent_router: could not import run_schedule_agent — {_err}"
    ) from _err

schedule_agent_router = APIRouter(prefix="/api/schedule-agent", tags=["Schedule Agent"])


class ScheduleChatRequest(BaseModel):
    message: str


@schedule_agent_router.post("/chat")
async def schedule_agent_chat(
    req: ScheduleChatRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    user_id = str(current_user["_id"])

    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing"
        )

    # Remove "Bearer " prefix
    jwt_token = auth_header.replace("Bearer ", "").strip()

    try:
        result = run_schedule_agent(
            user_message=req.message,
            user_id=user_id,
            jwt_token=jwt_token,
        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "response": result["response"],
        "action_performed": result["action_performed"],
        "user_id": user_id,
    }