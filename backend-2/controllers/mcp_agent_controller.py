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

import json
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
    },
}


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


def _normalize_action_params(
    action: str,
    params: Dict[str, Any],
    raw_command: Optional[str] = None,
    user_email: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    normalized = dict(params or {})

    if action == "create_task":
        title = _pick_first(normalized, ["title", "task_name", "task_title", "name", "task"])
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

    if action == "list_tasks":
        assignee = _pick_first(
            normalized,
            [
                "assignee_email",
                "assignee_name",
                "assignee",
                "assigned_to",
                "owner",
                "member",
                "user",
            ],
        )
        if assignee:
            value = str(assignee).strip()
            lowered = value.lower()
            if lowered in {"me", "myself", "self", "my"} and user_email:
                normalized["assignee_email"] = user_email
                if user_id:
                    normalized["assignee_id"] = user_id
            elif "@" in value:
                normalized["assignee_email"] = value
            else:
                normalized["assignee_name"] = value

    if action in {"assign_task", "update_task", "add_task_to_sprint", "remove_task_from_sprint"}:
        task_identifier = _pick_first(
            normalized,
            ["task_id", "ticket_id", "task_title", "title", "task_name", "task"],
        )
        if task_identifier:
            normalized["task_id"] = task_identifier

    if action in {"create_sprint", "start_sprint", "complete_sprint", "add_task_to_sprint", "remove_task_from_sprint"}:
        sprint_name = _pick_first(normalized, ["sprint_name", "name", "title", "sprint"])
        if sprint_name:
            normalized["sprint_name"] = sprint_name

    if action in {"add_member", "remove_member"}:
        member_email = _pick_first(normalized, ["email", "member_email"])
        if member_email:
            normalized["email"] = member_email

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
        priority = _title_case_priority(task.priority if task else params.get("priority"))
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

    fallback_title = _pick_first(params, ["title", "task_name", "task_title", "name"]) or "task"
    fallback_priority = _title_case_priority(params.get("priority"))
    fallback_project = _resolve_project_name(params.get("project_id"), params)
    return (
        f"✅ Task '{fallback_title}' was created successfully in {fallback_project} "
        f"with {fallback_priority} priority."
    )


def _render_action_success(action: str, result: Dict[str, Any], params: Dict[str, Any]) -> str:
    payload = result.get("result", {}) if isinstance(result.get("result"), dict) else {}

    if action == "create_task":
        return _render_create_task_result(result, params)

    if action == "assign_task":
        ticket = _pick_first(params, ["ticket_id", "task_id", "task_title", "title"]) or "task"
        assignee = _pick_first(params, ["assignee_email", "assignee_name", "assignee"]) or "the user"
        return f"✅ {ticket} was assigned to {assignee} successfully."

    if action == "create_sprint":
        sprint_name = _pick_first(params, ["name", "sprint_name"]) or "the sprint"
        project_name = _resolve_project_name(params.get("project_id"), params)
        return f"✅ Sprint '{sprint_name}' was created successfully in {project_name}."

    if action in {"start_sprint", "complete_sprint"}:
        sprint_name = _pick_first(params, ["sprint_name", "sprint_id", "name"]) or "the sprint"
        verb = "started" if action == "start_sprint" else "completed"
        return f"✅ Sprint '{sprint_name}' was {verb} successfully."

    if action in {"add_task_to_sprint", "remove_task_from_sprint"}:
        task_name = _pick_first(params, ["task_id", "ticket_id", "task_title", "title"]) or "task"
        sprint_name = _pick_first(params, ["sprint_name", "sprint_id", "name"]) or "sprint"
        verb = "added to" if action == "add_task_to_sprint" else "removed from"
        return f"✅ {task_name} was {verb} {sprint_name} successfully."

    if action == "create_project":
        project_name = _pick_first(params, ["name", "project_name"]) or "project"
        return f"✅ Project '{project_name}' was created successfully."

    if action in {"add_member", "remove_member"}:
        member = _pick_first(params, ["email", "member_email", "member_identifier"]) or "member"
        project_name = _resolve_project_name(params.get("project_id"), params)
        verb = "added to" if action == "add_member" else "removed from"
        return f"✅ {member} was {verb} {project_name} successfully."

    if action == "list_tasks":
        tasks = payload.get("tasks") if isinstance(payload.get("tasks"), list) else []
        count = payload.get("count") if isinstance(payload.get("count"), int) else len(tasks)

        lines = ["## Tasks"]
        project_name = _pick_first(params, ["project_name"]) or "All accessible projects"
        lines.append(f"Project: **{project_name}**")

        filters = []
        if params.get("status"):
            filters.append(f"status={params.get('status')}")
        if params.get("priority"):
            filters.append(f"priority={params.get('priority')}")
        if filters:
            lines.append(f"Filters: {', '.join(filters)}")

        lines.append(f"Found **{count}** task(s).")

        if not tasks:
            lines.append("\nNo matching tasks found.")
            return "\n".join(lines)

        for index, task in enumerate(tasks, start=1):
            ticket = task.get("ticket_id") or task.get("task_id") or "N/A"
            title = task.get("title") or "Untitled task"
            status = task.get("status") or "Unknown"
            priority = task.get("priority") or "Unknown"
            assignee = task.get("assignee_name") or task.get("assignee_email") or "Unassigned"
            due_date = task.get("due_date") or "No due date"

            lines.append(f"\n{index}. **[{ticket}] {title}**")
            lines.append(f"- Status: {status} | Priority: {priority}")
            lines.append(f"- Assigned to: {assignee}")
            lines.append(f"- Due: {due_date}")

        return "\n".join(lines)

    if action == "list_projects":
        projects = payload.get("projects") if isinstance(payload.get("projects"), list) else []
        count = payload.get("count") if isinstance(payload.get("count"), int) else len(projects)

        lines = ["## Projects", f"Found **{count}** project(s)."]
        if not projects:
            lines.append("\nNo projects found.")
            return "\n".join(lines)

        for index, project in enumerate(projects, start=1):
            name = project.get("name") or "Unnamed project"
            role = project.get("role") or ("Owner" if project.get("is_owner") else "Member")
            description = project.get("description") or ""
            lines.append(f"\n{index}. **{name}**")
            lines.append(f"- Role: {role}")
            if description:
                lines.append(f"- Description: {description}")

        return "\n".join(lines)

    if action == "list_sprints":
        sprints = payload.get("sprints") if isinstance(payload.get("sprints"), list) else []
        count = payload.get("count") if isinstance(payload.get("count"), int) else len(sprints)

        lines = ["## Sprints", f"Found **{count}** sprint(s)."]
        if not sprints:
            lines.append("\nNo sprints found.")
            return "\n".join(lines)

        for index, sprint in enumerate(sprints, start=1):
            name = sprint.get("name") or sprint.get("sprint_id") or "Unnamed sprint"
            status = sprint.get("status") or "planned"
            total_tasks = sprint.get("total_tasks", 0)
            completed_tasks = sprint.get("completed_tasks", 0)
            start_date = sprint.get("start_date") or "N/A"
            end_date = sprint.get("end_date") or "N/A"

            lines.append(f"\n{index}. **{name}**")
            lines.append(f"- Status: {status}")
            lines.append(f"- Timeline: {start_date} -> {end_date}")
            lines.append(f"- Tasks: {completed_tasks}/{total_tasks} completed")

        return "\n".join(lines)

    if action == "list_members":
        members = payload.get("members") if isinstance(payload.get("members"), list) else []
        count = payload.get("total") if isinstance(payload.get("total"), int) else len(members)
        project_name = _resolve_project_name(params.get("project_id"), params)

        lines = ["## Project Members", f"Project: **{project_name}**", f"Found **{count}** member(s)."]
        if not members:
            lines.append("\nNo members found.")
            return "\n".join(lines)

        for index, member in enumerate(members, start=1):
            name = member.get("name") or "Unknown"
            email = member.get("email") or "No email"
            role = member.get("role") or ("Owner" if member.get("is_owner") else "Member")
            lines.append(f"\n{index}. **{name}**")
            lines.append(f"- Email: {email}")
            lines.append(f"- Role: {role}")

        return "\n".join(lines)

    if action.startswith("list_"):
        count = payload.get("count") if isinstance(payload.get("count"), int) else None
        if count is not None:
            return f"✅ Found {count} item(s) for {action.replace('_', ' ')}."

    return f"✅ MCP action completed: {action}."


async def _execute_mcp_action(
    action: str,
    params: Dict[str, Any],
    user_id: str,
    user_email: str,
) -> Dict[str, Any]:
    if action == "create_task":
        title = _pick_first(params, ["title", "task_name", "task_title", "name", "task"])
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
                "requesting_user_email": user_email,
                "project_name": params.get("project_name"),
                "status": params.get("status"),
                "priority": params.get("priority"),
                "assignee_id": params.get("assignee_id"),
                "assignee_email": params.get("assignee_email"),
                "assignee_name": params.get("assignee_name"),
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

    return {
        "success": False,
        "error": f"Action '{action}' is not mapped to MCP tools yet.",
    }


def _render_mcp_result(action: str, result: Dict[str, Any], params: Optional[Dict[str, Any]] = None) -> str:
    params = params or {}
    payload = result.get("result", {}) if isinstance(result.get("result"), dict) else {}
    action_success = bool(result.get("success", False))
    if isinstance(payload.get("success"), bool):
        action_success = action_success and bool(payload.get("success"))

    if not action_success:
        error = result.get("error") or payload.get("error") or payload.get("message")
        return (
            f"❌ MCP action failed: {action}\n\n"
            f"Error: {error or 'Unknown error'}"
        )

    return _render_action_success(action, result, params)


def _looks_like_automation_intent(content: str) -> bool:
    text = (content or "").strip().lower()
    intent_tokens = [
        "task",
        "ticket",
        "sprint",
        "project",
        "member",
        "assign",
        "create",
        "update",
        "list",
        "show",
        "remove",
        "add",
        "overdue",
        "dashboard",
        "summary",
    ]
    return any(token in text for token in intent_tokens)


def _looks_like_summary_request(content: str) -> bool:
    text = (content or "").strip().lower()
    summary_tokens = [
        "summary",
        "overall",
        "dashboard",
        "overdue",
        "assigned to me",
        "my workload",
        "my tasks",
    ]
    return any(token in text for token in summary_tokens)


def _parse_due_date(value: Any) -> Optional[datetime]:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None

    # Supports YYYY-MM-DD and ISO timestamps.
    for candidate in [text, text + "T00:00:00"]:
        try:
            return datetime.fromisoformat(candidate.replace("Z", "+00:00"))
        except Exception:
            continue
    return None


def _render_personal_task_summary(tasks: list[Dict[str, Any]], user_email: str) -> str:
    assigned = []
    user_email_norm = (user_email or "").strip().lower()

    for task in tasks:
        assignee_email = str(task.get("assignee_email") or "").strip().lower()
        if user_email_norm and assignee_email == user_email_norm:
            assigned.append(task)

    total_assigned = len(assigned)
    now = datetime.utcnow()
    overdue = []
    status_counts: Dict[str, int] = {}

    for task in assigned:
        status = str(task.get("status") or "To Do")
        status_counts[status] = status_counts.get(status, 0) + 1

        due = _parse_due_date(task.get("due_date"))
        if due and due.replace(tzinfo=None) < now and status.lower() not in {"done", "closed", "completed"}:
            overdue.append(task)

    lines = [
        "## Overall Summary",
        f"- Total Tasks Assigned to You: **{total_assigned}**",
        f"- Overdue Tasks: **{len(overdue)}**",
        "",
        "### By Status",
    ]

    if status_counts:
        for status, count in sorted(status_counts.items(), key=lambda item: item[0]):
            lines.append(f"- {status}: {count}")
    else:
        lines.append("- No assigned tasks found.")

    lines.append("")
    lines.append("### Overdue Tasks")
    if overdue:
        for index, task in enumerate(overdue[:10], start=1):
            ticket = task.get("ticket_id") or task.get("task_id") or "N/A"
            title = task.get("title") or "Untitled task"
            due = task.get("due_date") or "No due date"
            priority = task.get("priority") or "Unknown"
            lines.append(f"{index}. **[{ticket}] {title}**")
            lines.append(f"- Due: {due} | Priority: {priority}")
    else:
        lines.append("No overdue tasks. Great job staying on track.")

    return "\n".join(lines)


def _is_task_assigned_to_user(
    task: Dict[str, Any],
    user_id: str,
    user_email: str,
    user_name: str,
) -> bool:
    assignee_id = str(task.get("assignee_id") or "").strip()
    assignee_email = str(task.get("assignee_email") or "").strip().lower()
    assignee_name = str(task.get("assignee_name") or "").strip().lower()

    user_id_norm = str(user_id or "").strip()
    user_email_norm = str(user_email or "").strip().lower()
    user_name_norm = str(user_name or "").strip().lower()

    return bool(
        (user_id_norm and assignee_id == user_id_norm)
        or (user_email_norm and assignee_email == user_email_norm)
        or (user_name_norm and assignee_name == user_name_norm)
    )


def _render_personal_task_summary_for_user(
    tasks: list[Dict[str, Any]],
    user_id: str,
    user_email: str,
    user_name: str,
) -> str:
    filtered = [
        task
        for task in tasks
        if _is_task_assigned_to_user(task, user_id=user_id, user_email=user_email, user_name=user_name)
    ]
    return _render_personal_task_summary(filtered, user_email)


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

        should_try_automation = detect_task_command(content) or _looks_like_automation_intent(content)

        if should_try_automation:
            parsed = parse_task_command(
                command=content,
                context={
                    "user_id": user_id,
                    "user_name": user_name,
                    "user_email": user_email,
                    "user_role": user_role,
                    "allowed_actions": sorted(list(ROLE_ALLOWED_ACTIONS.get(user_role, set()))),
                },
            )

            if parsed.get("success"):
                parsed_action = parsed.get("action")
                params = _normalize_action_params(
                    parsed_action,
                    parsed.get("params", {}),
                    raw_command=content,
                    user_email=user_email,
                    user_id=user_id,
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
                    if parsed_action == "list_tasks" and _looks_like_summary_request(content):
                        payload = mcp_result.get("result", {}) if isinstance(mcp_result.get("result"), dict) else {}
                        tasks = payload.get("tasks") if isinstance(payload.get("tasks"), list) else []
                        ai_content = _render_personal_task_summary_for_user(
                            tasks,
                            user_id=user_id,
                            user_email=user_email,
                            user_name=user_name,
                        )
                    else:
                        ai_content = _render_mcp_result(parsed_action or "unknown", mcp_result, params)
            else:
                # Smart fallback: summary-style asks should not force rigid command words.
                if _looks_like_summary_request(content):
                    parsed_action = "list_tasks"
                    summary_params = {
                        "assignee_id": user_id,
                        "assignee_email": user_email,
                    }
                    mcp_result = await _execute_mcp_action(
                        action="list_tasks",
                        params=summary_params,
                        user_id=user_id,
                        user_email=user_email,
                    )

                    payload = mcp_result.get("result", {}) if isinstance(mcp_result.get("result"), dict) else {}
                    tasks = payload.get("tasks") if isinstance(payload.get("tasks"), list) else []
                    ai_content = _render_personal_task_summary_for_user(
                        tasks,
                        user_id=user_id,
                        user_email=user_email,
                        user_name=user_name,
                    )
                else:
                    ai_content = (
                        "I detected an automation request, but I could not parse it clearly. "
                        "Please restate with project/task details.\n\n"
                        f"Parser error: {parsed.get('error', 'Unknown parse error')}"
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
                    "mcp_success": (
                        None
                        if mcp_result is None
                        else bool(
                            mcp_result.get("success")
                            and (
                                not isinstance(mcp_result.get("result"), dict)
                                or mcp_result.get("result", {}).get("success", True)
                            )
                        )
                    ),
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
