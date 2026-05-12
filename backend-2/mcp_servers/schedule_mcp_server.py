from __future__ import annotations

import json
import sys
import contextlib
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import os
import time

import requests
from mcp.server.fastmcp import FastMCP

try:
    from controllers import meeting_controller as mc
except Exception:
    mc = None

mcp = FastMCP("scheduleai-server")

# Allow overriding the calendar API URL via env var for deployed environments
BASE_URL = os.getenv("SCHEDULE_API_BASE_URL", "http://localhost:5000/api")
# Per-request timeout (seconds)
REQUEST_TIMEOUT = int(os.getenv("SCHEDULE_API_TIMEOUT", "90"))
# Number of retry attempts for transient errors (idempotent methods only)
REQUEST_RETRIES = int(os.getenv("SCHEDULE_API_RETRIES", "1"))
RETRY_METHODS = {"GET", "PUT", "DELETE"}
USE_LOCAL_CONTROLLER = os.getenv("SCHEDULE_API_MODE", "local").lower() == "local"


# ──────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────

def _headers(jwt_token: str) -> Dict[str, str]:
    token = jwt_token if jwt_token.startswith("Bearer ") else f"Bearer {jwt_token}"
    return {"Authorization": token, "Content-Type": "application/json"}


def _can_use_local(user_id: Optional[str]) -> bool:
    return bool(USE_LOCAL_CONTROLLER and mc is not None and user_id)


def _unwrap_local(result: Dict[str, Any]) -> Dict[str, Any]:
    status = result.get("status", 500)
    body = result.get("body", {})
    if status >= 400:
        raise RuntimeError(body.get("message", "Meeting service error"))
    return body


def _request(method: str, jwt_token: str, path: str, payload: Dict = None, params: Dict = None) -> Any:
    url = f"{BASE_URL}{path}"
    headers = _headers(jwt_token)
    max_attempts = REQUEST_RETRIES + 1 if method in RETRY_METHODS else 1
    for attempt in range(1, max_attempts + 1):
        try:
            resp = requests.request(method, url, headers=headers, json=payload, params=params, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            if resp.text:
                return resp.json()
            return {}
        except requests.exceptions.RequestException as exc:
            if attempt < max_attempts:
                time.sleep(0.5 * attempt)
                continue
            raise


def _get(jwt_token: str, path: str, params: Dict = None) -> Any:
    return _request("GET", jwt_token, path, payload=None, params=params)


def _post(jwt_token: str, path: str, payload: Dict) -> Any:
    print(f"POST {path} with payload: {payload}")
    return _request("POST", jwt_token, path, payload=payload)


def _put(jwt_token: str, path: str, payload: Dict) -> Any:
    return _request("PUT", jwt_token, path, payload=payload)


def _delete(jwt_token: str, path: str) -> Any:
    return _request("DELETE", jwt_token, path)


def _ok(data: Any) -> str:
    return json.dumps({"success": True, **( data if isinstance(data, dict) else {"result": data} )}, default=str)


def _err(msg: str) -> str:
    return json.dumps({"success": False, "error": msg})


# ──────────────────────────────────────────────
# Tools
# ──────────────────────────────────────────────

@mcp.tool()
def book_meeting(
    jwt_token: str,
    title: str,
    start_time: str,
    duration: int,
    requesting_user_id: Optional[str] = None,
    participants: Optional[List[str]] = None,
    description: Optional[str] = "",
) -> str:
    """Book / create a new meeting."""
    try:
        payload = {
            "requesting_user_id": None,  # injected by controller; not needed in payload
            "title": title,
            "start_time": start_time,
            "duration": duration,
            "requesting_user_id": requesting_user_id,
            "participants": participants or [],
            "description": description or "",
        }
        print(f"Booking meeting with payload: {payload}")
        if _can_use_local(requesting_user_id):
            local = _unwrap_local(mc.create_meeting(requesting_user_id, payload))
            meeting_id = local.get("meeting_id", "created")
        else:
            data = _post(jwt_token, "/meetings", payload)
            print(f"Meeting booked with data: {data}")
            meeting_id = data.get("meeting_id", "created")
        return _ok({
            "meeting_id": meeting_id,
            "details": f"{title} at {start_time} for {duration} minutes",
        })
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def list_meetings(jwt_token: str, requesting_user_id: Optional[str] = None) -> str:
    """List all meetings for the authenticated user."""
    try:
        if _can_use_local(requesting_user_id):
            local = _unwrap_local(mc.get_meetings(requesting_user_id))
            return _ok({"meetings": local.get("meetings", [])})
        data = _get(jwt_token, "/meetings")
        return _ok({"meetings": data.get("meetings", [])})
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def get_meeting_details(jwt_token: str, meeting_id: str, requesting_user_id: Optional[str] = None) -> str:
    """Get full details of a specific meeting by ID."""
    try:
        if _can_use_local(requesting_user_id):
            local = _unwrap_local(mc.get_meeting_by_id(requesting_user_id, meeting_id))
            return _ok(local)
        data = _get(jwt_token, f"/meetings/{meeting_id}")
        return _ok(data)
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def update_meeting(
    jwt_token: str,
    meeting_id: str,
    title: Optional[str] = None,
    start_time: Optional[str] = None,
    duration: Optional[int] = None,
    requesting_user_id: Optional[str] = None,
) -> str:
    """Update title, start time, or duration of an existing meeting."""
    try:
        payload: Dict[str, Any] = {}
        if title:            payload["title"]      = title
        if start_time:       payload["start_time"] = start_time
        if duration: payload["duration"]   = duration

        if _can_use_local(requesting_user_id):
            _unwrap_local(mc.update_meeting(requesting_user_id, meeting_id, payload))
        else:
            _put(jwt_token, f"/meetings/{meeting_id}", payload)
        return _ok({"message": "Meeting updated successfully!"})
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def delete_meeting(jwt_token: str, meeting_id: str, requesting_user_id: Optional[str] = None) -> str:
    """Delete / cancel a meeting by ID."""
    try:
        if _can_use_local(requesting_user_id):
            _unwrap_local(mc.delete_meeting(requesting_user_id, meeting_id))
        else:
            _delete(jwt_token, f"/meetings/{meeting_id}")
        return _ok({"message": "Meeting deleted successfully!"})
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def check_availability(
    jwt_token: str,
    date: str,
    duration: int = 60,
    requesting_user_id: Optional[str] = None,
) -> str:
    """
    Find free time slots on a given date (YYYY-MM-DD).
    Checks 9 AM–5 PM in 30-minute increments.
    """
    try:
        date_obj = datetime.fromisoformat(date)
        start_of_day = date_obj.replace(hour=9,  minute=0, second=0, microsecond=0)
        end_of_day   = date_obj.replace(hour=17, minute=0, second=0, microsecond=0)

        params = {
            "start_date": start_of_day.isoformat(),
            "end_date":   end_of_day.isoformat(),
        }
        if _can_use_local(requesting_user_id):
            local = _unwrap_local(mc.get_meetings_by_range(requesting_user_id, params["start_date"], params["end_date"]))
            meetings = local.get("meetings", [])
        else:
            meetings = _get(jwt_token, "/meetings/range", params).get("meetings", [])

        free_slots = []
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

        return _ok({
            "date": date,
            "free_slots": free_slots,
            "total_free_slots": len(free_slots),
        })
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def get_upcoming_meetings(jwt_token: str, limit: int = 5, requesting_user_id: Optional[str] = None) -> str:
    """Fetch the next N upcoming meetings for the authenticated user."""
    try:
        if _can_use_local(requesting_user_id):
            local = _unwrap_local(mc.get_upcoming_meetings(requesting_user_id, limit))
            return _ok(local)
        data = _get(jwt_token, "/meetings/upcoming", {"limit": limit})
        return _ok(data)
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def check_conflicts(
    jwt_token: str,
    start_time: str,
    duration: int,
    requesting_user_id: Optional[str] = None,
) -> str:
    """Check whether a proposed time slot conflicts with existing meetings."""
    try:
        payload = {"start_time": start_time, "duration": duration}
        if _can_use_local(requesting_user_id):
            local = _unwrap_local(mc.check_conflicts(requesting_user_id, start_time, duration))
            return _ok(local)
        data = _post(jwt_token, "/meetings/conflicts", payload)
        return _ok(data)
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def update_participants(
    jwt_token: str,
    meeting_id: str,
    participants: List[str],
    requesting_user_id: Optional[str] = None,
) -> str:
    """Replace the participant list of a meeting."""
    try:
        if _can_use_local(requesting_user_id):
            _unwrap_local(mc.update_participants(requesting_user_id, meeting_id, participants))
        else:
            _put(jwt_token, f"/meetings/{meeting_id}/participants", {"participants": participants})
        return _ok({"message": "Participants updated successfully"})
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def add_notes(jwt_token: str, meeting_id: str, notes: str, requesting_user_id: Optional[str] = None) -> str:
    """Append notes to an existing meeting."""
    try:
        if _can_use_local(requesting_user_id):
            _unwrap_local(mc.add_notes(requesting_user_id, meeting_id, notes))
        else:
            _post(jwt_token, f"/meetings/{meeting_id}/notes", {"notes": notes})
        return _ok({"message": "Notes added successfully"})
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def get_user_profile(jwt_token: str) -> str:
    """Retrieve the profile of the authenticated user."""
    try:
        data = _get(jwt_token, "/user/profile")
        return _ok(data)
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def update_preferences(jwt_token: str, preferences: Dict[str, str]) -> str:
    """Update user scheduling preferences (key-value pairs)."""
    try:
        _put(jwt_token, "/user/preferences", preferences)
        return _ok({"message": "Preferences updated successfully"})
    except Exception as exc:
        return _err(str(exc))


@mcp.tool()
def suggest_meeting_times(
    jwt_token: str,
    duration: int = 60,
    preferred_days: Optional[List[str]] = None,
    days_ahead: int = 7,
    requesting_user_id: Optional[str] = None,
) -> str:
    """
    Suggest up to 10 available meeting slots over the next N weekdays.
    Optionally filter by preferred_days (e.g. ['monday', 'wednesday']).
    """
    try:
        if _can_use_local(requesting_user_id):
            local = _unwrap_local(mc.suggest_meeting_times(requesting_user_id, duration, preferred_days, days_ahead))
            return _ok(local)

        suggestions = []
        today = datetime.now()

        for offset in range(days_ahead):
            check_date = today + timedelta(days=offset)

            # Skip weekends
            if check_date.weekday() >= 5:
                continue

            # Filter by preferred days if provided
            if preferred_days:
                if check_date.strftime("%A").lower() not in [d.lower() for d in preferred_days]:
                    continue

            date_str = check_date.date().isoformat()
            avail_raw = json.loads(check_availability(jwt_token, date_str, duration))

            if not avail_raw.get("success"):
                continue

            for slot in avail_raw.get("free_slots", [])[:3]:
                suggestions.append({
                    "date": date_str,
                    "start_time": slot["start"],
                    "end_time":   slot["end"],
                    "day_of_week": check_date.strftime("%A"),
                })

        return _ok({
            "suggestions": suggestions[:10],
            "total_suggestions": len(suggestions),
        })
    except Exception as exc:
        return _err(str(exc))


if __name__ == "__main__":
    mcp.run(transport="stdio")