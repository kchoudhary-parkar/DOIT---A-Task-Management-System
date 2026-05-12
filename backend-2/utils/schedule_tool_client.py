"""
utils/schedule_tool_client.py

Calls schedule MCP tool functions directly (no subprocess / HTTP).
Used by the schedule agent controller.

Pattern mirrors DOIT's mcp_client_utils.py but for the schedule server.
"""

from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path
from typing import Any

# ── Make mcp_servers/ importable ─────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parents[1]
MCP_DIR  = ROOT_DIR / "mcp_servers"
for p in (str(ROOT_DIR), str(MCP_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

_mcp_mod = None

def _mcp():
    global _mcp_mod
    if _mcp_mod is None:
        _mcp_mod = importlib.import_module("schedule_mcp_server")
    return _mcp_mod


# ── Tool map ──────────────────────────────────────────────────────────────────
TOOL_MAP: dict[str, str] = {
    "book_meeting":          "book_meeting",
    "list_meetings":         "list_meetings",
    "get_meeting_details":   "get_meeting_details",
    "update_meeting":        "update_meeting",
    "delete_meeting":        "delete_meeting",
    "check_availability":    "check_availability",
    "get_upcoming_meetings": "get_upcoming_meetings",
    "check_conflicts":       "check_conflicts",
    "update_participants":   "update_participants",
    "add_notes":             "add_notes",
    "suggest_meeting_times": "suggest_meeting_times",
}


def call_schedule_tool(tool_name: str, user_id: str, jwt_token: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """
    Call a schedule MCP tool function directly.

    Args:
        tool_name:  One of the keys in TOOL_MAP.
        user_id:    The authenticated user's ID string (injected as requesting_user_id).
        jwt_token:  The JWT token for authentication.
        arguments:  Dict of tool arguments (without user id — that's injected here).

    Returns:
        Parsed result dict with at least {"success": bool}.
    """
    print(f"Calling schedule tool '{tool_name}' with arguments: {arguments}")
    if tool_name not in TOOL_MAP:
        return {"success": False, "error": f"Unknown tool: '{tool_name}'"}
    print(f"Mapped tool '{tool_name}' to function '{TOOL_MAP[tool_name]}'")
    func = getattr(_mcp(), TOOL_MAP[tool_name], None)
    if func is None:
        return {"success": False, "error": f"Function '{tool_name}' missing from schedule_mcp_server"}
    print(f"Found function '{func.__name__}' for tool '{tool_name}'")
    kwargs = {"jwt_token": jwt_token, "requesting_user_id": user_id, **arguments}
    print(f"Calling function '{func.__name__}' with kwargs: {kwargs}")
    try:
        raw: str = func(**kwargs)           # MCP tools always return JSON strings
        result   = json.loads(raw)
        print(f"Tool '{tool_name}' returned: {result}")
        return result
    except Exception as exc:
        print(f"Error calling tool '{tool_name}': {exc}")
        return {"success": False, "error": str(exc)}