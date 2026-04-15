"""
MCP Agent Controller
MCP-first automation chat mode for DOIT.

Flow:
1) Store conversation in existing AIConversation/AIMessage collections.
2) Parse automation intent from natural language.
3) Execute automation via dedicated MCP servers (task/sprint/project/member).
4) Return action result in chat-friendly format.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import HTTPException
from pydantic import BaseModel

from controllers.ai_assistant_controller import detect_task_command, parse_task_command
from models.ai_conversation import AIConversation, AIMessage
from models.project import Project
from models.user import User
from utils.azure_ai_utils import chat_completion
from utils.mcp_client_utils import (
    call_mcp_tool,
    get_mcp_runtime_diagnostics,
    get_mcp_servers_health,
)


ROLE_ALLOWED_ACTIONS = {
    "member": {
        "create_task",
        "assign_task",
        "update_task",
        "list_tasks",
        "list_sprints",
        "list_projects",
        "list_members",
        "generate_status_summary",
        "send_email_with_attachments",
        "send_status_summary_email",
    },
    "admin": {
        "create_task",
        "assign_task",
        "update_task",
        "list_tasks",
        "create_sprint",
        "start_sprint",
        "complete_sprint",
        "add_task_to_sprint",
        "remove_task_from_sprint",
        "list_sprints",
        "list_projects",
        "create_project",
        "add_member",
        "remove_member",
        "list_members",
        "generate_status_summary",
        "send_email_with_attachments",
        "send_status_summary_email",
    },
    "super-admin": {
        "create_task",
        "assign_task",
        "update_task",
        "list_tasks",
        "create_sprint",
        "start_sprint",
        "complete_sprint",
        "add_task_to_sprint",
        "remove_task_from_sprint",
        "list_sprints",
        "list_projects",
        "create_project",
        "add_member",
        "remove_member",
        "list_members",
        "generate_status_summary",
        "send_email_with_attachments",
        "send_status_summary_email",
    },
}

EMAIL_ATTACHMENT_PATTERN = re.compile(
    r"([\w./\\\- ]+\.(?:pdf|doc|docx|txt|csv|xls|xlsx|ppt|pptx|png|jpg|jpeg))",
    flags=re.IGNORECASE,
)
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")


class _TaskSummary(BaseModel):
    ticket_id: Optional[str] = None
    title: Optional[str] = None
    priority: Optional[str] = None


class _CreateTicketResult(BaseModel):
    message: Optional[str] = None
    task: Optional[_TaskSummary] = None


class _CreateTicketPayload(BaseModel):
    success: bool = False
    action: Optional[str] = None
    project_id: Optional[str] = None
    result: Optional[_CreateTicketResult] = None


def create_mcp_conversation(user_id: str, title: str = "MCP Chat"):
    try:
        conversation_id = AIConversation.create(user_id, title)
        conversation = AIConversation.get_by_id(conversation_id)
        if conversation:
            conversation["_id"] = str(conversation["_id"])
        return {"success": True, "conversation": conversation}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def get_mcp_conversations(user_id: str):
    try:
        conversations = AIConversation.get_user_conversations(user_id)
        for conversation in conversations:
            conversation["_id"] = str(conversation["_id"])
        return {"success": True, "conversations": conversations}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def get_mcp_conversation_messages(conversation_id: str):
    try:
        messages = AIMessage.get_conversation_messages(conversation_id)
        for message in messages:
            message["_id"] = str(message["_id"])
        return {"success": True, "messages": messages}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def delete_mcp_conversation(conversation_id: str, user_id: str):
    try:
        conversation = AIConversation.get_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conversation["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        AIConversation.delete(conversation_id)
        return {"success": True, "message": "Conversation deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


def _pick_first(params: Dict[str, Any], keys: list[str]) -> Optional[str]:
    for key in keys:
        value = params.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _detect_email_command(message: str) -> bool:
    lowered = (message or "").lower()
    if not lowered:
        return False

    email_terms = {"email", "mail", "send"}
    summary_terms = {"summary", "status", "report"}

    has_email_term = any(term in lowered for term in email_terms)
    has_summary_term = any(term in lowered for term in summary_terms)

    if has_email_term and ("attachment" in lowered or "attach" in lowered):
        return True

    if has_email_term and has_summary_term:
        return True

    if "status summary" in lowered or "project status" in lowered:
        return True

    if "analytics report" in lowered or "email it to" in lowered:
        return True

    return False


def _extract_email_command_params(command: str) -> Dict[str, Any]:
    text = command or ""

    emails = EMAIL_PATTERN.findall(text)
    cc_emails: list[str] = []
    bcc_emails: list[str] = []

    cc_match = re.search(
        r"\bcc\b\s*[:=]?\s*(.+?)(?:\bbcc\b|$)", text, flags=re.IGNORECASE
    )
    if cc_match:
        cc_emails = EMAIL_PATTERN.findall(cc_match.group(1))

    bcc_match = re.search(r"\bbcc\b\s*[:=]?\s*(.+)$", text, flags=re.IGNORECASE)
    if bcc_match:
        bcc_emails = EMAIL_PATTERN.findall(bcc_match.group(1))

    cc_set = set(cc_emails)
    bcc_set = set(bcc_emails)
    to_emails = [
        email for email in emails if email not in cc_set and email not in bcc_set
    ]

    subject = None
    subject_match = re.search(
        r"\bsubject\b\s*[:=]\s*(.+?)(?:\bbody\b\s*[:=]|$)", text, flags=re.IGNORECASE
    )
    if subject_match:
        subject = subject_match.group(1).strip(" \t\n\r\"'")

    body = None
    body_match = re.search(
        r"\b(?:body|message)\b\s*[:=]\s*(.+)$", text, flags=re.IGNORECASE | re.DOTALL
    )
    if body_match:
        body = body_match.group(1).strip()

    project_name = None
    # Pattern 1: "for Parkar project"
    project_for_match = re.search(
        r"\bfor\s+([A-Za-z0-9 _\-]{2,80}?)\s+project\b",
        text,
        flags=re.IGNORECASE,
    )
    if project_for_match:
        project_name = project_for_match.group(1).strip(" .,:;\"'")

    # Pattern 2: "project Parkar" but stop before routing keywords like "to", "with", etc.
    if not project_name:
        project_match = re.search(
            r"\bproject\s+([A-Za-z0-9 _\-]{2,80}?)(?:\s+(?:to|with|and|attach|attachment|email|cc|bcc|subject|body)\b|$)",
            text,
            flags=re.IGNORECASE,
        )
        if project_match:
            candidate = project_match.group(1).strip(" .,:;\"'")
            if candidate.lower() not in {"to", "all", "all project", "all projects"}:
                project_name = candidate

    attachments = [
        match.strip().strip("\"'") for match in EMAIL_ATTACHMENT_PATTERN.findall(text)
    ]

    params: Dict[str, Any] = {}
    if to_emails:
        params["to_emails"] = to_emails
    if cc_emails:
        params["cc_emails"] = cc_emails
    if bcc_emails:
        params["bcc_emails"] = bcc_emails
    if subject:
        params["subject"] = subject
    if body:
        params["body"] = body
    if project_name:
        params["project_name"] = project_name
    if attachments:
        params["attachment_paths"] = attachments

    return params


def _parse_email_command(command: str) -> Dict[str, Any]:
    params = _extract_email_command_params(command)
    lowered = (command or "").lower()

    wants_summary = any(
        term in lowered for term in ["summary", "status", "report", "analytics"]
    )
    wants_send = any(term in lowered for term in ["send", "email", "mail"])

    if wants_send and not params.get("to_emails"):
        return {
            "success": False,
            "error": (
                "Recipient email not detected. Include a valid recipient like "
                "'email it to name@example.com'."
            ),
        }

    if wants_summary and wants_send:
        return {
            "success": True,
            "action": "send_status_summary_email",
            "params": params,
        }

    if wants_summary:
        return {"success": True, "action": "generate_status_summary", "params": params}

    if wants_send:
        return {
            "success": True,
            "action": "send_email_with_attachments",
            "params": params,
        }

    return {
        "success": False,
        "error": "Could not infer email action. Try including 'send' or 'status summary'.",
    }


def _normalize_action_params(
    action: str,
    params: Dict[str, Any],
    raw_command: Optional[str] = None,
    user_email: Optional[str] = None,
) -> Dict[str, Any]:
    normalized = dict(params or {})

    if action == "create_task":
        title = _pick_first(
            normalized, ["title", "task_name", "task_title", "name", "task"]
        )
        if title:
            normalized["title"] = title

        assignee = _pick_first(
            normalized,
            [
                "assignee_email",
                "assignee_name",
                "assignee",
                "assigned_to",
                "assign_to",
                "assigned",
                "owner",
                "member",
                "member_name",
                "user",
            ],
        )

        if not assignee and raw_command:
            # Best-effort fallback for prompts like "assign to John" or "assigned to john@example.com".
            match = re.search(
                r"(?:assign(?:ed)?\s+to\s+)([\w.+\-@ ]{2,80})",
                raw_command,
                flags=re.IGNORECASE,
            )
            if match:
                assignee = match.group(1).strip(" .,;:!\"'")

        if assignee:
            value = str(assignee).strip()
            lowered = value.lower()
            if lowered in {"me", "myself", "self"} and user_email:
                normalized["assignee_email"] = user_email
            elif "@" in value:
                normalized["assignee_email"] = value
            else:
                normalized["assignee_name"] = value

    if action in {
        "assign_task",
        "update_task",
        "add_task_to_sprint",
        "remove_task_from_sprint",
    }:
        task_identifier = _pick_first(
            normalized,
            ["task_id", "ticket_id", "task_title", "title", "task_name", "task"],
        )
        if task_identifier:
            normalized["task_id"] = task_identifier

    if action in {
        "create_sprint",
        "start_sprint",
        "complete_sprint",
        "add_task_to_sprint",
        "remove_task_from_sprint",
    }:
        sprint_name = _pick_first(
            normalized, ["sprint_name", "name", "title", "sprint"]
        )
        if sprint_name:
            normalized["sprint_name"] = sprint_name

    if action in {"add_member", "remove_member"}:
        member_email = _pick_first(normalized, ["email", "member_email"])
        if member_email:
            normalized["email"] = member_email

    if action in {"send_email_with_attachments", "send_status_summary_email"}:
        if isinstance(normalized.get("to_email"), str) and not normalized.get(
            "to_emails"
        ):
            normalized["to_emails"] = [normalized["to_email"]]

        if isinstance(normalized.get("attachment_path"), str) and not normalized.get(
            "attachment_paths"
        ):
            normalized["attachment_paths"] = [normalized["attachment_path"]]

        for list_key in ["to_emails", "cc_emails", "bcc_emails", "attachment_paths"]:
            if isinstance(normalized.get(list_key), str):
                normalized[list_key] = [normalized[list_key]]

    return normalized


def _is_action_allowed_for_role(action: str, user_role: str) -> bool:
    allowed = ROLE_ALLOWED_ACTIONS.get(user_role.lower(), set())
    return action in allowed


def _resolve_project_name(project_id: Optional[str], params: Dict[str, Any]) -> str:
    if params.get("project_name"):
        return str(params.get("project_name"))

    if project_id:
        try:
            project = Project.find_by_id(project_id)
            if project and project.get("name"):
                return str(project.get("name"))
        except Exception:
            pass

    return "the project"


def _title_case_priority(priority: Optional[str]) -> str:
    if not priority:
        return "Medium"
    return str(priority).strip().capitalize()


def _render_create_task_result(result: Dict[str, Any], params: Dict[str, Any]) -> str:
    payload = result.get("result", {}) if isinstance(result.get("result"), dict) else {}

    try:
        parsed = _CreateTicketPayload.model_validate(payload)
        task = parsed.result.task if parsed.result else None
        ticket_id = task.ticket_id if task else None
        task_title = task.title if task else None
        priority = _title_case_priority(
            task.priority if task else params.get("priority")
        )
        project_name = _resolve_project_name(parsed.project_id, params)

        if ticket_id and task_title:
            return (
                f"✅ Ticket {ticket_id} ({task_title}) was created successfully in "
                f"{project_name} with {priority} priority."
            )

        if task_title:
            return (
                f"✅ Task '{task_title}' was created successfully in {project_name} "
                f"with {priority} priority."
            )
    except Exception:
        pass

    fallback_title = (
        _pick_first(params, ["title", "task_name", "task_title", "name"]) or "task"
    )
    fallback_priority = _title_case_priority(params.get("priority"))
    fallback_project = _resolve_project_name(params.get("project_id"), params)
    return (
        f"✅ Task '{fallback_title}' was created successfully in {fallback_project} "
        f"with {fallback_priority} priority."
    )


def _render_action_success(
    action: str, result: Dict[str, Any], params: Dict[str, Any]
) -> str:
    payload = result.get("result", {}) if isinstance(result.get("result"), dict) else {}

    if action == "create_task":
        return _render_create_task_result(result, params)

    if action == "assign_task":
        ticket = (
            _pick_first(params, ["ticket_id", "task_id", "task_title", "title"])
            or "task"
        )
        assignee = (
            _pick_first(params, ["assignee_email", "assignee_name", "assignee"])
            or "the user"
        )
        return f"✅ {ticket} was assigned to {assignee} successfully."

    if action == "create_sprint":
        sprint_name = _pick_first(params, ["name", "sprint_name"]) or "the sprint"
        project_name = _resolve_project_name(params.get("project_id"), params)
        return f"✅ Sprint '{sprint_name}' was created successfully in {project_name}."

    if action in {"start_sprint", "complete_sprint"}:
        sprint_name = (
            _pick_first(params, ["sprint_name", "sprint_id", "name"]) or "the sprint"
        )
        verb = "started" if action == "start_sprint" else "completed"
        return f"✅ Sprint '{sprint_name}' was {verb} successfully."

    if action in {"add_task_to_sprint", "remove_task_from_sprint"}:
        task_name = (
            _pick_first(params, ["task_id", "ticket_id", "task_title", "title"])
            or "task"
        )
        sprint_name = (
            _pick_first(params, ["sprint_name", "sprint_id", "name"]) or "sprint"
        )
        verb = "added to" if action == "add_task_to_sprint" else "removed from"
        return f"✅ {task_name} was {verb} {sprint_name} successfully."

    if action == "create_project":
        project_name = _pick_first(params, ["name", "project_name"]) or "project"
        return f"✅ Project '{project_name}' was created successfully."

    if action in {"add_member", "remove_member"}:
        member = (
            _pick_first(params, ["email", "member_email", "member_identifier"])
            or "member"
        )
        project_name = _resolve_project_name(params.get("project_id"), params)
        verb = "added to" if action == "add_member" else "removed from"
        return f"✅ {member} was {verb} {project_name} successfully."

    if action.startswith("list_"):
        count = payload.get("count")
        if isinstance(count, int):
            return f"✅ Found {count} item(s) for {action.replace('_', ' ')}."

    if action == "generate_status_summary":
        overall = payload.get("overall", {}) if isinstance(payload, dict) else {}
        project_count = overall.get("project_count")
        task_count = overall.get("task_count")
        if project_count is not None and task_count is not None:
            return (
                f"✅ Generated status summary across {project_count} project(s) "
                f"with {task_count} total task(s)."
            )
        return "✅ Generated status summary successfully."

    if action in {"send_email_with_attachments", "send_status_summary_email"}:
        email_payload = (
            payload.get("email", payload) if isinstance(payload, dict) else {}
        )
        subject = (
            email_payload.get("subject") or params.get("subject") or "(no subject)"
        )
        recipients = email_payload.get("to") or params.get("to_emails") or []
        attachment_count = email_payload.get("attachment_count", 0)
        return (
            f"✅ Email sent successfully to {', '.join(recipients) if recipients else 'recipient(s)'} "
            f"with subject '{subject}' and {attachment_count} attachment(s)."
        )

    return f"✅ MCP action completed: {action}."


async def _execute_mcp_action(
    action: str,
    params: Dict[str, Any],
    user_id: str,
    user_email: str,
) -> Dict[str, Any]:
    if action == "create_task":
        title = _pick_first(
            params, ["title", "task_name", "task_title", "name", "task"]
        )
        if not title:
            return {"success": False, "error": "Task title is required."}

        return await call_mcp_tool(
            "task",
            "create_ticket",
            {
                "requesting_user_id": user_id,
                "requesting_user_email": user_email,
                "title": title,
                "project_name": params.get("project_name"),
                "project_id": params.get("project_id"),
                "description": params.get("description", ""),
                "priority": params.get("priority", "Medium"),
                "issue_type": params.get("issue_type", "task"),
                "due_date": params.get("due_date"),
                "assignee_email": params.get("assignee_email"),
                "assignee_name": params.get("assignee_name"),
                "labels": params.get("labels") or [],
            },
        )

    if action == "assign_task":
        task_identifier = _pick_first(params, ["task_id", "ticket_id", "task_title"])
        assignee_identifier = _pick_first(
            params, ["assignee_email", "assignee_name", "assignee"]
        )

        if not task_identifier or not assignee_identifier:
            return {
                "success": False,
                "error": "Both task identifier and assignee are required.",
            }

        return await call_mcp_tool(
            "task",
            "assign_ticket",
            {
                "requesting_user_id": user_id,
                "requesting_user_email": user_email,
                "task_identifier": task_identifier,
                "assignee_identifier": assignee_identifier,
            },
        )

    if action == "update_task":
        task_identifier = _pick_first(params, ["task_id", "ticket_id", "task_title"])
        new_status = _pick_first(params, ["status", "new_status"])

        if not task_identifier or not new_status:
            return {
                "success": False,
                "error": "Task identifier and status are required for update_task.",
            }

        return await call_mcp_tool(
            "task",
            "update_ticket_status",
            {
                "requesting_user_id": user_id,
                "task_identifier": task_identifier,
                "new_status": new_status,
                "comment": params.get("comment"),
            },
        )

    if action == "list_tasks":
        return await call_mcp_tool(
            "task",
            "list_tasks",
            {
                "requesting_user_id": user_id,
                "project_name": params.get("project_name"),
                "status": params.get("status"),
                "priority": params.get("priority"),
            },
        )

    if action == "create_sprint":
        sprint_name = _pick_first(params, ["name", "sprint_name"])
        if not sprint_name:
            return {"success": False, "error": "Sprint name is required."}

        return await call_mcp_tool(
            "sprint",
            "create_sprint",
            {
                "requesting_user_id": user_id,
                "requesting_user_email": user_email,
                "name": sprint_name,
                "project_name": params.get("project_name"),
                "project_id": params.get("project_id"),
                "start_date": params.get("start_date"),
                "end_date": params.get("end_date"),
                "goal": params.get("goal", ""),
            },
        )

    if action == "start_sprint":
        sprint_identifier = _pick_first(params, ["sprint_id", "sprint_name"])
        if not sprint_identifier:
            return {"success": False, "error": "Sprint identifier is required."}

        return await call_mcp_tool(
            "sprint",
            "start_sprint",
            {
                "requesting_user_id": user_id,
                "sprint_identifier": sprint_identifier,
                "project_name": params.get("project_name"),
            },
        )

    if action == "complete_sprint":
        sprint_identifier = _pick_first(params, ["sprint_id", "sprint_name"])
        if not sprint_identifier:
            return {"success": False, "error": "Sprint identifier is required."}

        return await call_mcp_tool(
            "sprint",
            "complete_sprint",
            {
                "requesting_user_id": user_id,
                "sprint_identifier": sprint_identifier,
                "project_name": params.get("project_name"),
            },
        )

    if action == "add_task_to_sprint":
        task_identifier = _pick_first(params, ["task_id", "ticket_id", "task_title"])
        sprint_identifier = _pick_first(params, ["sprint_id", "sprint_name"])

        if not task_identifier or not sprint_identifier:
            return {
                "success": False,
                "error": "Task identifier and sprint identifier are required.",
            }

        return await call_mcp_tool(
            "sprint",
            "add_ticket_to_sprint",
            {
                "requesting_user_id": user_id,
                "task_identifier": task_identifier,
                "sprint_identifier": sprint_identifier,
                "project_name": params.get("project_name"),
            },
        )

    if action == "remove_task_from_sprint":
        task_identifier = _pick_first(params, ["task_id", "ticket_id", "task_title"])
        sprint_identifier = _pick_first(params, ["sprint_id", "sprint_name"])

        if not task_identifier or not sprint_identifier:
            return {
                "success": False,
                "error": "Task identifier and sprint identifier are required.",
            }

        return await call_mcp_tool(
            "sprint",
            "remove_ticket_from_sprint",
            {
                "requesting_user_id": user_id,
                "task_identifier": task_identifier,
                "sprint_identifier": sprint_identifier,
                "project_name": params.get("project_name"),
            },
        )

    if action == "list_sprints":
        return await call_mcp_tool(
            "sprint",
            "list_sprints",
            {
                "requesting_user_id": user_id,
                "project_name": params.get("project_name"),
            },
        )

    if action == "list_projects":
        return await call_mcp_tool(
            "project",
            "list_projects",
            {
                "requesting_user_id": user_id,
            },
        )

    if action == "create_project":
        name = _pick_first(params, ["name", "project_name"])
        if not name:
            return {"success": False, "error": "Project name is required."}

        return await call_mcp_tool(
            "project",
            "create_project",
            {
                "requesting_user_id": user_id,
                "name": name,
                "description": params.get("description", ""),
            },
        )

    if action == "add_member":
        member_email = _pick_first(params, ["email", "member_email"])
        if not member_email:
            return {"success": False, "error": "Member email is required."}

        return await call_mcp_tool(
            "member",
            "add_member",
            {
                "requesting_user_id": user_id,
                "member_email": member_email,
                "project_name": params.get("project_name"),
                "project_id": params.get("project_id"),
            },
        )

    if action == "remove_member":
        member_identifier = _pick_first(params, ["email", "member_email", "user_id"])
        if not member_identifier:
            return {
                "success": False,
                "error": "Member identifier (email/name/user_id) is required.",
            }

        return await call_mcp_tool(
            "member",
            "remove_member",
            {
                "requesting_user_id": user_id,
                "member_identifier": member_identifier,
                "project_name": params.get("project_name"),
                "project_id": params.get("project_id"),
            },
        )

    if action == "list_members":
        return await call_mcp_tool(
            "member",
            "list_members",
            {
                "requesting_user_id": user_id,
                "project_name": params.get("project_name"),
                "project_id": params.get("project_id"),
            },
        )

    if action == "generate_status_summary":
        return await call_mcp_tool(
            "email",
            "generate_status_summary",
            {
                "requesting_user_id": user_id,
                "project_name": params.get("project_name"),
                "include_task_samples": params.get("include_task_samples", True),
                "max_tasks_per_project": params.get("max_tasks_per_project", 5),
            },
        )

    if action == "send_email_with_attachments":
        to_emails = params.get("to_emails") or []
        if not to_emails:
            return {
                "success": False,
                "error": "At least one recipient email is required for send_email_with_attachments.",
            }

        return await call_mcp_tool(
            "email",
            "send_email_with_attachments",
            {
                "to_emails": to_emails,
                "subject": params.get("subject") or "DOIT Update",
                "body": params.get("body")
                or "Please find the latest project update from DOIT.",
                "attachment_paths": params.get("attachment_paths") or [],
                "cc_emails": params.get("cc_emails") or [],
                "bcc_emails": params.get("bcc_emails") or [],
            },
        )

    if action == "send_status_summary_email":
        to_emails = params.get("to_emails") or []
        if not to_emails:
            return {
                "success": False,
                "error": "At least one recipient email is required for send_status_summary_email.",
            }

        return await call_mcp_tool(
            "email",
            "send_status_summary_email",
            {
                "requesting_user_id": user_id,
                "to_emails": to_emails,
                "subject": params.get("subject"),
                "project_name": params.get("project_name"),
                "attachment_paths": params.get("attachment_paths") or [],
                "include_task_samples": params.get("include_task_samples", True),
                "max_tasks_per_project": params.get("max_tasks_per_project", 5),
                "cc_emails": params.get("cc_emails") or [],
                "bcc_emails": params.get("bcc_emails") or [],
            },
        )

    return {
        "success": False,
        "error": f"Action '{action}' is not mapped to MCP tools yet.",
    }


def _render_mcp_result(
    action: str, result: Dict[str, Any], params: Optional[Dict[str, Any]] = None
) -> str:
    params = params or {}
    if not result.get("success"):
        error = result.get("error") or result.get("result", {}).get("error")
        return f"❌ MCP action failed: {action}\n\nError: {error or 'Unknown error'}"

    return _render_action_success(action, result, params)


def _fallback_chat_reply(content: str, user_role: str) -> tuple[str, Dict[str, Any]]:
    """Fallback non-automation reply using base LLM guidance."""
    try:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are DOIT MCP Assistant. "
                    "When user message is not an automation command, respond briefly and guide them "
                    "to MCP automation commands for tasks, assignments, sprints, projects, and members. "
                    f"Current user role: {user_role}. "
                    "Respect role-based permissions in suggestions."
                ),
            },
            {"role": "user", "content": content},
        ]
        llm = chat_completion(messages=messages, max_tokens=500)
        return llm["content"], llm.get("tokens", {})
    except Exception:
        return (
            "I am in MCP automation mode. Try commands like: "
            "'create task Fix login bug in CDW with high priority', "
            "'assign FTP-12 to john@example.com', "
            "'create sprint Sprint 8 in CDW'.",
            {},
        )


async def send_message_to_mcp(
    conversation_id: str,
    user_id: str,
    content: str,
):
    """Parse user command and execute via MCP servers."""
    try:
        conversation = AIConversation.get_by_id(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if conversation["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        user = User.find_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user_email = user.get("email", "")
        user_role = (user.get("role", "member") or "member").lower()
        user_name = user.get("name") or user.get("full_name") or user_email

        AIMessage.create(
            conversation_id=conversation_id,
            role="user",
            content=content,
        )

        tokens: Dict[str, Any] = {}
        parsed_action: Optional[str] = None
        mcp_result: Optional[Dict[str, Any]] = None

        is_email_command = _detect_email_command(content)

        if is_email_command or detect_task_command(content):
            if is_email_command:
                parsed = _parse_email_command(content)
            else:
                parsed = parse_task_command(
                    command=content,
                    context={
                        "user_id": user_id,
                        "user_name": user_name,
                        "user_email": user_email,
                        "user_role": user_role,
                        "allowed_actions": sorted(
                            list(ROLE_ALLOWED_ACTIONS.get(user_role, set()))
                        ),
                    },
                )

            if parsed.get("success"):
                parsed_action = parsed.get("action")
                params = _normalize_action_params(
                    parsed_action,
                    parsed.get("params", {}),
                    raw_command=content,
                    user_email=user_email,
                )

                if not parsed_action:
                    ai_content = (
                        "I could not determine the requested automation action. "
                        "Please restate your command with a clear action and target."
                    )
                elif not _is_action_allowed_for_role(parsed_action, user_role):
                    mcp_result = {
                        "success": False,
                        "error": (
                            f"Action '{parsed_action}' is not allowed for your role '{user_role}'. "
                            f"Allowed actions: {', '.join(sorted(list(ROLE_ALLOWED_ACTIONS.get(user_role, set()))))}"
                        ),
                    }
                    ai_content = _render_mcp_result(parsed_action, mcp_result, params)
                else:
                    mcp_result = await _execute_mcp_action(
                        action=parsed_action,
                        params=params,
                        user_id=user_id,
                        user_email=user_email,
                    )
                    ai_content = _render_mcp_result(
                        parsed_action or "unknown", mcp_result, params
                    )
            else:
                ai_content = (
                    "I detected an automation request, but I could not parse it clearly. "
                    "Please restate with project/task details.\n\n"
                    f"Parser error: {parsed.get('error', 'Unknown parse error')}"
                )
        elif any(
            keyword in (content or "").lower()
            for keyword in [
                "email",
                "mail",
                "attachment",
                "summary",
                "report",
                "analytics",
            ]
        ):
            ai_content = (
                "I detected an email/report request but couldn't map it to a valid automation action. "
                "Try: 'email analytics report for Parkar project to name@example.com'."
            )
        else:
            ai_content, tokens = _fallback_chat_reply(content, user_role)

        ai_message_id = AIMessage.create(
            conversation_id=conversation_id,
            role="assistant",
            content=ai_content,
        )

        if tokens.get("total"):
            AIMessage.update_tokens(ai_message_id, tokens["total"])

        if conversation.get("message_count", 0) <= 2:
            title = content[:50] + ("..." if len(content) > 50 else "")
            AIConversation.update_title(conversation_id, title)

        return {
            "success": True,
            "message": {
                "_id": str(ai_message_id),
                "role": "assistant",
                "content": ai_content,
                "created_at": datetime.utcnow().isoformat(),
                "tokens_used": tokens.get("total", 0),
                "mcp_action": parsed_action,
                "mcp_success": None
                if mcp_result is None
                else bool(mcp_result.get("success")),
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


async def mcp_agent_health_check():
    server_health = await get_mcp_servers_health()
    return {
        "service": "MCP Agent",
        "healthy": server_health.get("healthy", False),
        "servers": server_health.get("servers", []),
        "runtime": get_mcp_runtime_diagnostics(),
        "mode": "MCP tool orchestration with RBAC-aware backend controllers",
    }
