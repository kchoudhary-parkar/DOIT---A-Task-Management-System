"""
controllers/meeting_controller.py

Business logic for meetings — follows DOIT controller conventions.
All functions accept user_id (str) and raw dicts; return response dicts
with {"status": int, "body": dict} so the MCP server can use them too.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from bson.errors import InvalidId

# DOIT's database module exposes collection handles
from database import db

meetings_col = db["meetings"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize(doc: dict) -> dict:
    """Convert a MongoDB meeting document to a JSON-safe dict."""
    doc = dict(doc)
    doc["_id"]   = str(doc["_id"])
    doc["start"] = doc["start_time"].isoformat()
    doc["end"]   = (doc["start_time"] + timedelta(minutes=doc.get("duration", 60))).isoformat()
    return doc


def _resp(status: int, **kwargs) -> Dict[str, Any]:
    return {"status": status, "body": kwargs}


def _oid(meeting_id: str):
    try:
        return ObjectId(meeting_id)
    except (InvalidId, TypeError):
        return None


# ── CRUD ──────────────────────────────────────────────────────────────────────

def create_meeting(user_id: str, data: dict) -> Dict[str, Any]:
    required = {"title", "start_time", "duration"}
    if missing := required - data.keys():
        return _resp(400, message=f"Missing fields: {', '.join(missing)}")

    try:
        start_time = datetime.fromisoformat(data["start_time"])
    except ValueError:
        return _resp(400, message="Invalid start_time format. Use ISO 8601.")

    doc = {
        "user_id":      user_id,
        "title":        data["title"],
        "description":  data.get("description", ""),
        "start_time":   start_time,
        "duration":     int(data["duration"]),
        "participants": data.get("participants", []),
        "notes":        [],
        "created_at":   datetime.now(timezone.utc),
        "updated_at":   None,
    }
    result    = meetings_col.insert_one(doc)
    return _resp(201, message="Meeting created successfully", meeting_id=str(result.inserted_id))


def get_meetings(user_id: str) -> Dict[str, Any]:
    docs = list(meetings_col.find({"user_id": user_id}).sort("start_time", -1))
    return _resp(200, meetings=[_serialize(d) for d in docs])


def get_meeting_by_id(user_id: str, meeting_id: str) -> Dict[str, Any]:
    oid = _oid(meeting_id)
    if not oid:
        return _resp(400, message="Invalid meeting_id")

    doc = meetings_col.find_one({"_id": oid, "user_id": user_id})
    if not doc:
        return _resp(404, message="Meeting not found or unauthorized")
    return _resp(200, meeting=_serialize(doc))


def update_meeting(user_id: str, meeting_id: str, data: dict) -> Dict[str, Any]:
    oid = _oid(meeting_id)
    if not oid:
        return _resp(400, message="Invalid meeting_id")

    update: dict = {"updated_at": datetime.now(timezone.utc)}
    if "title"            in data and data["title"]:
        update["title"]       = data["title"]
    if "description"      in data and data["description"] is not None:
        update["description"] = data["description"]
    if "start_time"       in data and data["start_time"]:
        try:
            update["start_time"] = datetime.fromisoformat(data["start_time"])
        except ValueError:
            return _resp(400, message="Invalid start_time format.")
    if "duration" in data and data["duration"]:
        update["duration"]    = int(data["duration"])
    if "participants"     in data and data["participants"] is not None:
        update["participants"] = data["participants"]

    result = meetings_col.update_one({"_id": oid, "user_id": user_id}, {"$set": update})
    if result.matched_count == 0:
        return _resp(404, message="Meeting not found or unauthorized")
    return _resp(200, message="Meeting updated successfully")


def delete_meeting(user_id: str, meeting_id: str) -> Dict[str, Any]:
    oid = _oid(meeting_id)
    if not oid:
        return _resp(400, message="Invalid meeting_id")

    result = meetings_col.delete_one({"_id": oid, "user_id": user_id})
    if result.deleted_count == 0:
        return _resp(404, message="Meeting not found or unauthorized")
    return _resp(200, message="Meeting deleted successfully")


# ── Query helpers ─────────────────────────────────────────────────────────────

def get_meetings_by_range(user_id: str, start_date: str, end_date: str) -> Dict[str, Any]:
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt   = datetime.fromisoformat(end_date)
    except ValueError:
        return _resp(400, message="Invalid date format. Use ISO 8601.")

    docs = list(meetings_col.find({
        "user_id":    user_id,
        "start_time": {"$gte": start_dt, "$lte": end_dt},
    }).sort("start_time", 1))
    return _resp(200, meetings=[_serialize(d) for d in docs])


def get_upcoming_meetings(user_id: str, limit: int = 10) -> Dict[str, Any]:
    now  = datetime.now(timezone.utc)
    docs = list(meetings_col.find(
        {"user_id": user_id, "start_time": {"$gte": now}}
    ).sort("start_time", 1).limit(limit))
    return _resp(200, meetings=[_serialize(d) for d in docs])


def check_conflicts(user_id: str, start_time: str, duration: int) -> Dict[str, Any]:
    try:
        proposed_start = datetime.fromisoformat(start_time)
    except ValueError:
        return _resp(400, message="Invalid start_time format.")

    proposed_end = proposed_start + timedelta(minutes=duration)

    # Find any meeting whose [start, start+duration) overlaps [proposed_start, proposed_end)
    docs = list(meetings_col.find({
        "user_id":    user_id,
        "start_time": {"$lt": proposed_end},
        "$expr": {
            "$gt": [
                {"$add": ["$start_time", {"$multiply": ["$duration", 60_000]}]},
                proposed_start,
            ]
        },
    }))
    return _resp(200, has_conflicts=len(docs) > 0, conflicts=[_serialize(d) for d in docs])


def check_availability(user_id: str, date: str, duration: int = 60) -> Dict[str, Any]:
    try:
        date_obj = datetime.fromisoformat(date)
    except ValueError:
        return _resp(400, message="Invalid date format. Use YYYY-MM-DD.")

    start_of_day = date_obj.replace(hour=9,  minute=0, second=0, microsecond=0)
    end_of_day   = date_obj.replace(hour=17, minute=0, second=0, microsecond=0)

    range_result = get_meetings_by_range(user_id, start_of_day.isoformat(), end_of_day.isoformat())
    meetings     = range_result["body"].get("meetings", [])

    free_slots: List[dict] = []
    current = start_of_day
    while current + timedelta(minutes=duration) <= end_of_day:
        slot_end = current + timedelta(minutes=duration)
        conflict = any(
            current < datetime.fromisoformat(m["end"]) and
            slot_end > datetime.fromisoformat(m["start"])
            for m in meetings
        )
        if not conflict:
            free_slots.append({"start": current.isoformat(), "end": slot_end.isoformat()})
        current += timedelta(minutes=30)

    return _resp(200, date=date, free_slots=free_slots, total_free_slots=len(free_slots))


def suggest_meeting_times(
    user_id: str,
    duration: int    = 60,
    preferred_days:   list   = None,
    days_ahead:       int    = 7,
) -> Dict[str, Any]:
    from datetime import date as date_type
    suggestions: List[dict] = []
    today = datetime.now()

    for offset in range(days_ahead):
        check_date = today + timedelta(days=offset)
        if check_date.weekday() >= 5:   # skip weekends
            continue
        if preferred_days:
            if check_date.strftime("%A").lower() not in [d.lower() for d in preferred_days]:
                continue

        avail = check_availability(user_id, check_date.date().isoformat(), duration)
        if avail["status"] != 200:
            continue

        for slot in avail["body"].get("free_slots", [])[:3]:
            suggestions.append({
                "date":        check_date.date().isoformat(),
                "start_time":  slot["start"],
                "end_time":    slot["end"],
                "day_of_week": check_date.strftime("%A"),
            })

    return _resp(200, suggestions=suggestions[:10], total_suggestions=len(suggestions))


# ── Participants & Notes ──────────────────────────────────────────────────────

def update_participants(user_id: str, meeting_id: str, participants: List[str]) -> Dict[str, Any]:
    oid = _oid(meeting_id)
    if not oid:
        return _resp(400, message="Invalid meeting_id")

    result = meetings_col.update_one(
        {"_id": oid, "user_id": user_id},
        {"$set": {"participants": participants, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        return _resp(404, message="Meeting not found or unauthorized")
    return _resp(200, message="Participants updated successfully")


def add_notes(user_id: str, meeting_id: str, notes: str) -> Dict[str, Any]:
    oid = _oid(meeting_id)
    if not oid:
        return _resp(400, message="Invalid meeting_id")

    note = {
        "content":    notes,
        "created_at": datetime.now(timezone.utc),
        "created_by": user_id,
    }
    result = meetings_col.update_one(
        {"_id": oid, "user_id": user_id},
        {"$push": {"notes": note}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        return _resp(404, message="Meeting not found or unauthorized")
    return _resp(200, message="Notes added successfully")