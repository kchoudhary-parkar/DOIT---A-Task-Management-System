from __future__ import annotations

import json
import sys
import contextlib
from pathlib import Path
from typing import Any, Dict, Optional

from mcp.server.fastmcp import FastMCP

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

with contextlib.redirect_stdout(sys.stderr):
    from controllers.git_controller import get_task_git_activity
    from database import db
    from utils.github_utils import calculate_time_ago
    from utils.local_agent_automation import find_task_by_title_or_id, resolve_project_id

mcp = FastMCP("doit-github-server")


def _controller_payload(response: Dict[str, Any]) -> Dict[str, Any]:
    status = response.get("status", response.get("statusCode", 500))
    body = response.get("body", {})
    if isinstance(body, str):
        try:
            body = json.loads(body)
        except Exception:
            body = {"raw": body}
    return {"success": 200 <= status < 300, "status": status, **body}


def _run_silenced(func, *args, **kwargs):
    with contextlib.redirect_stdout(sys.stderr):
        return func(*args, **kwargs)


def _format_prs(docs: list) -> list:
    result = []
    for pr in docs:
        result.append({
            "pr_number": pr.get("pr_number"),
            "title": pr.get("title"),
            "status": pr.get("status", "open"),
            "author": pr.get("author"),
            "branch_name": pr.get("branch_name"),
            "task_id": pr.get("task_id"),
            "created_at": pr.get("created_at_github"),
            "merged_at": pr.get("merged_at"),
            "time_ago": calculate_time_ago(
                pr.get("merged_at") or pr.get("closed_at") or pr.get("created_at_github")
            ),
        })
    return result


def _user_project_ids(requesting_user_id: str) -> list:
    projects = list(db.projects.find({
        "$or": [
            {"user_id": requesting_user_id},
            {"members.user_id": requesting_user_id},
        ]
    }))
    return [str(p["_id"]) for p in projects]


@mcp.tool()
def get_task_git_activity_tool(
    requesting_user_id: str,
    task_identifier: str,
) -> str:
    """Get live GitHub activity (branches, commits, pull requests) for a task ticket."""
    try:
        task = find_task_by_title_or_id(
            user_id=requesting_user_id,
            task_id=task_identifier,
            task_title=task_identifier,
            ticket_id=task_identifier,
        )
        if not task:
            return json.dumps({"success": False, "error": f"Task '{task_identifier}' not found."})

        response = _run_silenced(get_task_git_activity, str(task["_id"]), requesting_user_id)
        payload = _controller_payload(response)
        return json.dumps(payload, default=str)
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)})


@mcp.tool()
def list_project_prs(
    requesting_user_id: str,
    project_name: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 20,
) -> str:
    """List pull requests for a project. status: open | closed | merged | all."""
    try:
        limit = max(1, min(limit, 50))
        query: Dict[str, Any] = {}

        if project_name:
            project_id = resolve_project_id(requesting_user_id, project_name=project_name)
            if not project_id:
                return json.dumps({"success": False, "error": f"Project '{project_name}' not found."})
            query["project_id"] = project_id
        else:
            ids = _user_project_ids(requesting_user_id)
            if not ids:
                return json.dumps({"success": True, "count": 0, "pull_requests": []})
            query["project_id"] = {"$in": ids}

        if status and status.lower() != "all":
            query["status"] = status.lower()

        docs = list(db.git_pull_requests.find(query).sort("created_at_github", -1).limit(limit))
        prs = _format_prs(docs)
        return json.dumps({"success": True, "count": len(prs), "pull_requests": prs}, default=str)
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)})


@mcp.tool()
def list_project_commits(
    requesting_user_id: str,
    project_name: Optional[str] = None,
    limit: int = 15,
) -> str:
    """List recent git commits for a project from the database."""
    try:
        limit = max(1, min(limit, 50))
        query: Dict[str, Any] = {}

        if project_name:
            project_id = resolve_project_id(requesting_user_id, project_name=project_name)
            if not project_id:
                return json.dumps({"success": False, "error": f"Project '{project_name}' not found."})
            query["project_id"] = project_id
        else:
            ids = _user_project_ids(requesting_user_id)
            if not ids:
                return json.dumps({"success": True, "count": 0, "commits": []})
            query["project_id"] = {"$in": ids}

        docs = list(db.git_commits.find(query).sort("timestamp", -1).limit(limit))
        commits = [
            {
                "sha": (c.get("commit_sha") or "")[:7],
                "message": c.get("message"),
                "author": c.get("author"),
                "branch_name": c.get("branch_name"),
                "task_id": c.get("task_id"),
                "timestamp": c.get("timestamp"),
                "time_ago": calculate_time_ago(c.get("timestamp")),
            }
            for c in docs
        ]
        return json.dumps({"success": True, "count": len(commits), "commits": commits}, default=str)
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)})


@mcp.tool()
def list_project_branches(
    requesting_user_id: str,
    project_name: Optional[str] = None,
    status: Optional[str] = None,
) -> str:
    """List git branches for a project. status: active | merged | deleted | all."""
    try:
        query: Dict[str, Any] = {}

        if project_name:
            project_id = resolve_project_id(requesting_user_id, project_name=project_name)
            if not project_id:
                return json.dumps({"success": False, "error": f"Project '{project_name}' not found."})
            query["project_id"] = project_id
        else:
            ids = _user_project_ids(requesting_user_id)
            if not ids:
                return json.dumps({"success": True, "count": 0, "branches": []})
            query["project_id"] = {"$in": ids}

        if status and status.lower() != "all":
            query["status"] = status.lower()

        docs = list(db.git_branches.find(query).sort("created_at", -1).limit(50))
        branches = [
            {
                "branch_name": b.get("branch_name"),
                "status": b.get("status", "active"),
                "task_id": b.get("task_id"),
                "repo_url": b.get("repo_url"),
                "created_at": str(b.get("created_at", "")),
            }
            for b in docs
        ]
        return json.dumps({"success": True, "count": len(branches), "branches": branches}, default=str)
    except Exception as exc:
        return json.dumps({"success": False, "error": str(exc)})


if __name__ == "__main__":
    mcp.run(transport="stdio")
