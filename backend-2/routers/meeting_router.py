"""
routers/meeting_router.py

FastAPI router for meeting endpoints.
Register in main.py:  app.include_router(meeting_router)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from dependencies import get_current_user_obj as get_current_user   # returns full user dict
from controllers import meeting_controller as mc
from schemas import (
    CreateMeetingRequest,
    UpdateMeetingRequest,
    UpdateParticipantsRequest,
    AddNotesRequest,
    CheckAvailabilityRequest,
    CheckConflictsRequest,
    SuggestTimesRequest,
)

meeting_router = APIRouter(prefix="/api/meetings", tags=["Meetings"])


# ── Helper: convert controller response → FastAPI response ────────────────────
def _unwrap(result: dict):
    status = result["status"]
    body   = result["body"]
    if status >= 400:
        raise HTTPException(status_code=status, detail=body.get("message", "Error"))
    return body


# ── CRUD ──────────────────────────────────────────────────────────────────────

@meeting_router.post("")
async def create_meeting(req: CreateMeetingRequest, current_user: dict = Depends(get_current_user)):
    print("Creating meeting with data:", req)
    return _unwrap(mc.create_meeting(str(current_user["_id"]), req.model_dump()))


@meeting_router.get("")
async def list_meetings(current_user: dict = Depends(get_current_user)):
    return _unwrap(mc.get_meetings(str(current_user["_id"])))


@meeting_router.get("/upcoming")
async def upcoming_meetings(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
):
    return _unwrap(mc.get_upcoming_meetings(str(current_user["_id"]), limit))


@meeting_router.get("/range")
async def meetings_by_range(
    start_date: str = Query(..., description="ISO 8601 datetime"),
    end_date:   str = Query(..., description="ISO 8601 datetime"),
    current_user: dict = Depends(get_current_user),
):
    return _unwrap(mc.get_meetings_by_range(str(current_user["_id"]), start_date, end_date))


@meeting_router.post("/availability")
async def check_availability(req: CheckAvailabilityRequest, current_user: dict = Depends(get_current_user)):
    return _unwrap(mc.check_availability(str(current_user["_id"]), req.date, req.duration))


@meeting_router.post("/conflicts")
async def check_conflicts(req: CheckConflictsRequest, current_user: dict = Depends(get_current_user)):
    return _unwrap(mc.check_conflicts(str(current_user["_id"]), req.start_time, req.duration))


@meeting_router.post("/suggest")
async def suggest_times(req: SuggestTimesRequest, current_user: dict = Depends(get_current_user)):
    return _unwrap(mc.suggest_meeting_times(
        str(current_user["_id"]),
        req.duration,
        req.preferred_days,
        req.days_ahead,
    ))


@meeting_router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    return _unwrap(mc.get_meeting_by_id(str(current_user["_id"]), meeting_id))


@meeting_router.put("/{meeting_id}")
async def update_meeting(
    meeting_id: str,
    req: UpdateMeetingRequest,
    current_user: dict = Depends(get_current_user),
):
    return _unwrap(mc.update_meeting(str(current_user["_id"]), meeting_id, req.model_dump(exclude_none=True)))


@meeting_router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str, current_user: dict = Depends(get_current_user)):
    return _unwrap(mc.delete_meeting(str(current_user["_id"]), meeting_id))


@meeting_router.put("/{meeting_id}/participants")
async def update_participants(
    meeting_id: str,
    req: UpdateParticipantsRequest,
    current_user: dict = Depends(get_current_user),
):
    return _unwrap(mc.update_participants(str(current_user["_id"]), meeting_id, req.participants))


@meeting_router.post("/{meeting_id}/notes")
async def add_notes(
    meeting_id: str,
    req: AddNotesRequest,
    current_user: dict = Depends(get_current_user),
):
    return _unwrap(mc.add_notes(str(current_user["_id"]), meeting_id, req.notes))