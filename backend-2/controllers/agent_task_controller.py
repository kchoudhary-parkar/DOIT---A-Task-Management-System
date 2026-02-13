"""
Agent Task Controller
Simplified interface for AI Agent to create and manage tasks
"""

from fastapi import HTTPException
from controllers import task_controller
from models.user import User
from models.project import Project
import json


def agent_create_task(
    title: str,
    project_id: str,
    user_id: str,
    assignee_email: str = None,
    assignee_name: str = None,
    **kwargs,
):
    """
    Agent-friendly task creation with automatic assignee resolution

    Args:
        title: Task title
        project_id: Target project
        user_id: Creator user ID (from agent auth)
        assignee_email: Optional email to assign to
        assignee_name: Optional name to search for
        **kwargs: Additional task fields
    """
    try:
        # Resolve assignee if email or name provided
        assignee_id = None

        if assignee_email:
            assignee = User.find_by_email(assignee_email)
            if assignee:
                assignee_id = str(assignee["_id"])
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"User with email '{assignee_email}' not found",
                )

        elif assignee_name:
            # Search by name (case-insensitive)
            from database import db

            assignee = db.users.find_one(
                {"name": {"$regex": f"^{assignee_name}$", "$options": "i"}}
            )
            if assignee:
                # Verify they're a project member
                if Project.is_member(project_id, str(assignee["_id"])):
                    assignee_id = str(assignee["_id"])
                else:
                    raise HTTPException(
                        status_code=403,
                        detail=f"User '{assignee_name}' is not a member of this project",
                    )
            else:
                raise HTTPException(
                    status_code=404, detail=f"User '{assignee_name}' not found"
                )

        # Build task data
        task_data = {
            "title": title,
            "project_id": project_id,
            "assignee_id": assignee_id,
            **kwargs,
        }

        # Create task using existing controller
        body = json.dumps(task_data)
        response = task_controller.create_task(body, user_id)

        # Parse response
        if isinstance(response.get("body"), str):
            result = json.loads(response["body"])
        else:
            result = response.get("body", {})

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


def agent_assign_task(task_id: str, assignee_identifier: str, user_id: str):
    """
    Assign task to user by email or name

    Args:
        task_id: Task to assign
        assignee_identifier: Email or name of assignee
        user_id: User performing the action
    """
    # Try email first
    assignee = User.find_by_email(assignee_identifier)

    # Try name if email fails
    if not assignee:
        from database import db

        assignee = db.users.find_one(
            {"name": {"$regex": f"^{assignee_identifier}$", "$options": "i"}}
        )

    if not assignee:
        raise HTTPException(
            status_code=404, detail=f"User '{assignee_identifier}' not found"
        )

    assignee_id = str(assignee["_id"])

    # Update task
    update_data = {"assignee_id": assignee_id}
    body = json.dumps(update_data)

    return task_controller.update_task(body, task_id, user_id)
