"""
controllers/schedule_agent_controller.py

Azure OpenAI agent for meeting scheduling.
Follows the same structure as DOIT's azure_agent_controller.py /
langgraph_agent_controller.py.

Calls schedule tools via schedule_tool_client (direct MCP function calls,
no HTTP).  The user_id from the FastAPI auth middleware is injected into
every tool call automatically — the LLM never sees or sets it.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Dict

from dotenv import load_dotenv
from openai import AzureOpenAI

from utils.schedule_tool_client import call_schedule_tool

load_dotenv()

# ── Azure OpenAI client (reuses DOIT's env vars) ─────────────────────────────
_client = AzureOpenAI(
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_KEY"),
)
MODEL = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")

# ── Tool definitions ──────────────────────────────────────────────────────────
# jwt_token / user_id are NEVER included here — injected by the controller.

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "book_meeting",
            "description": "Book a new meeting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title":            {"type": "string"},
                    "start_time":       {"type": "string", "description": "ISO 8601 datetime"},
                    "duration": {"type": "integer"},
                    "participants":     {"type": "array", "items": {"type": "string"}},
                    "description":      {"type": "string"},
                },
                "required": ["title", "start_time", "duration"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_meetings",
            "description": "List all meetings for the current user.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_meeting_details",
            "description": "Get full details of a meeting by ID.",
            "parameters": {
                "type": "object",
                "properties": {"meeting_id": {"type": "string"}},
                "required": ["meeting_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_meeting",
            "description": "Update a meeting's title, start time, or duration.",
            "parameters": {
                "type": "object",
                "properties": {
                    "meeting_id":       {"type": "string"},
                    "title":            {"type": "string"},
                    "start_time":       {"type": "string"},
                    "duration": {"type": "integer"},
                    "description":      {"type": "string"},
                },
                "required": ["meeting_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_meeting",
            "description": "Delete / cancel a meeting by ID.",
            "parameters": {
                "type": "object",
                "properties": {"meeting_id": {"type": "string"}},
                "required": ["meeting_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_availability",
            "description": "Find free time slots on a given date (YYYY-MM-DD).",
            "parameters": {
                "type": "object",
                "properties": {
                    "date":             {"type": "string", "description": "YYYY-MM-DD"},
                    "duration": {"type": "integer", "default": 60},
                },
                "required": ["date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_meetings",
            "description": "Fetch the next N upcoming meetings.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "default": 5}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_conflicts",
            "description": "Check whether a proposed time slot conflicts with existing meetings.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_time":       {"type": "string", "description": "ISO 8601 datetime"},
                    "duration": {"type": "integer"},
                },
                "required": ["start_time", "duration"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_participants",
            "description": "Replace the participant list of a meeting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "meeting_id":   {"type": "string"},
                    "participants": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["meeting_id", "participants"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_notes",
            "description": "Append notes to a meeting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "meeting_id": {"type": "string"},
                    "notes":      {"type": "string"},
                },
                "required": ["meeting_id", "notes"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "suggest_meeting_times",
            "description": "Suggest available meeting slots over the coming days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "duration": {"type": "integer", "default": 60},
                    "preferred_days":   {"type": "array", "items": {"type": "string"}},
                    "days_ahead":       {"type": "integer", "default": 7},
                },
            },
        },
    },
]


# ── Agent loop ────────────────────────────────────────────────────────────────

def run_schedule_agent(user_message: str, user_id: str, jwt_token: str, max_iterations: int = 10) -> Dict[str, Any]:
    """
    Run the scheduling agent for a single user turn.

    Args:
        user_message:   The chat message from the user.
        user_id:        Authenticated user ID (from FastAPI dependency).
        jwt_token:      The JWT token for authentication.
        max_iterations: Safety cap on tool-call loops.

    Returns:
        {"response": str, "action_performed": bool}
    """
    now = datetime.now()
    messages = [
        {
            "role": "system",
            "content": (
                f"You are an intelligent meeting scheduling assistant integrated into DOIT, "
                f"an AI-powered project management platform. "
                f"Today is {now.strftime('%Y-%m-%d')} (current time: {now.strftime('%Y-%m-%d %H:%M:%S')}). "
                "Help users book, manage, and organise their meetings. "
                "Tools available: book, list, update, delete meetings; check availability and conflicts; "
                "manage participants and notes; suggest optimal times. "
                "Be concise, helpful, and conversational. "
                "Work hours are 9 AM – 5 PM; avoid weekends unless asked. "
                f"Use today's date as the reference for relative terms like 'tomorrow' or 'next week'."
            ),
        },
        {"role": "user", "content": user_message},
    ]

    action_performed = False

    for iteration in range(1, max_iterations + 1):
        try:
            resp = _client.chat.completions.create(
                model=MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
            )
        except Exception as exc:
            return {"response": f"AI service error: {exc}", "action_performed": False}

        msg = resp.choices[0].message

        if not msg.tool_calls:
            return {"response": msg.content or "Done.", "action_performed": action_performed}

        # ── Process tool calls ────────────────────────────────────────────────
        messages.append(msg)
        action_performed = True

        for tc in msg.tool_calls:
            tool_name = tc.function.name
            args      = json.loads(tc.function.arguments)

            result = call_schedule_tool(tool_name, user_id, jwt_token, args)

            messages.append({
                "role":         "tool",
                "tool_call_id": tc.id,
                "content":      json.dumps(result),
            })

    return {
        "response":        "Reached the maximum number of steps. Please rephrase your request.",
        "action_performed": action_performed,
    }