# """
# Agent Task Controller
# Simplified interface for AI Agent to create and manage tasks
# """

# from fastapi import HTTPException
# from controllers import task_controller
# from models.user import User
# from models.project import Project
# import json


# def agent_create_task(
#     requesting_user: str,
#     title: str,
#     project_id: str,
#     user_id: str,
#     assignee_email: str = None,
#     assignee_name: str = None,
#     **kwargs,
# ):
#     """
#     Agent-friendly task creation with automatic assignee resolution and RBAC

#     Args:
#         requesting_user: Email of the actual user making this request (for permission check)
#         title: Task title
#         project_id: Target project
#         user_id: Service account user ID (from agent auth)
#         assignee_email: Optional email to assign to
#         assignee_name: Optional name to search for
#         **kwargs: Additional task fields
#     """
#     try:
#         # Step 1: Validate requesting user exists and has permission
#         actual_user = User.find_by_email(requesting_user)
#         if not actual_user:
#             raise HTTPException(
#                 status_code=404, detail=f"User with email '{requesting_user}' not found"
#             )

#         # Step 2: Check if user has permission to create tasks (Admin or Member)
#         user_role = actual_user.get("role", "").lower()
#         if user_role not in ["admin", "member"]:
#             raise HTTPException(
#                 status_code=403,
#                 detail=f"Only Admin and Member users can create tasks. Your role is '{actual_user.get('role')}'",
#             )

#         # Step 3: Use actual user's ID for task creation (for audit trail)
#         creator_id = str(actual_user["_id"])

#         # Resolve assignee if email or name provided
#         assignee_id = None

#         if assignee_email:
#             assignee = User.find_by_email(assignee_email)
#             if assignee:
#                 assignee_id = str(assignee["_id"])
#             else:
#                 raise HTTPException(
#                     status_code=404,
#                     detail=f"User with email '{assignee_email}' not found",
#                 )

#         elif assignee_name:
#             # Search by name (case-insensitive)
#             from database import db

#             assignee = db.users.find_one(
#                 {"name": {"$regex": f"^{assignee_name}$", "$options": "i"}}
#             )
#             if assignee:
#                 # Verify they're a project member
#                 if Project.is_member(project_id, str(assignee["_id"])):
#                     assignee_id = str(assignee["_id"])
#                 else:
#                     raise HTTPException(
#                         status_code=403,
#                         detail=f"User '{assignee_name}' is not a member of this project",
#                     )
#             else:
#                 raise HTTPException(
#                     status_code=404, detail=f"User '{assignee_name}' not found"
#                 )

#         # Build task data
#         task_data = {
#             "title": title,
#             "project_id": project_id,
#             "assignee_id": assignee_id,
#             **kwargs,
#         }

#         # Create task using existing controller with actual user ID
#         body = json.dumps(task_data)
#         response = task_controller.create_task(body, creator_id)

#         # Check if response contains an error status code
#         status_code = response.get("statusCode", 200)
#         if status_code >= 400:
#             # Parse error message
#             if isinstance(response.get("body"), str):
#                 error_body = json.loads(response["body"])
#             else:
#                 error_body = response.get("body", {})

#             error_message = error_body.get("error", "Task creation failed")
#             raise HTTPException(status_code=status_code, detail=error_message)

#         # Parse successful response
#         if isinstance(response.get("body"), str):
#             result = json.loads(response["body"])
#         else:
#             result = response.get("body", {})

#         return result

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


# def agent_assign_task(
#     requesting_user: str, task_id: str, assignee_identifier: str, user_id: str
# ):
#     """
#     Assign task to user by email or name with RBAC validation

#     Args:
#         requesting_user: Email of the actual user making this request
#         task_id: Task to assign
#         assignee_identifier: Email or name of assignee
#         user_id: Service account user ID
#     """
#     try:
#         # Step 1: Validate requesting user
#         actual_user = User.find_by_email(requesting_user)
#         if not actual_user:
#             raise HTTPException(
#                 status_code=404, detail=f"User with email '{requesting_user}' not found"
#             )

#         # Step 2: Check permission (Admin or Member)
#         user_role = actual_user.get("role", "").lower()
#         if user_role not in ["admin", "member"]:
#             raise HTTPException(
#                 status_code=403,
#                 detail=f"Only Admin and Member users can assign tasks. Your role is '{actual_user.get('role')}'",
#             )

#         modifier_id = str(actual_user["_id"])

#         # Try email first
#         assignee = User.find_by_email(assignee_identifier)

#         # Try name if email fails
#         if not assignee:
#             from database import db

#             assignee = db.users.find_one(
#                 {"name": {"$regex": f"^{assignee_identifier}$", "$options": "i"}}
#             )

#         if not assignee:
#             raise HTTPException(
#                 status_code=404, detail=f"User '{assignee_identifier}' not found"
#             )

#         assignee_id = str(assignee["_id"])

#         # Resolve task_id - could be ticket_id (FTP-005) or MongoDB _id
#         from models.task import Task

#         task = (
#             Task.find_by_ticket_id(task_id)
#             if task_id.startswith(("FTP-", "SLS-", "TMP-", "TST-", "NP-"))
#             else Task.find_by_id(task_id)
#         )

#         if not task:
#             raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

#         actual_task_id = str(task["_id"])

#         # Update task using actual user ID
#         update_data = {"assignee_id": assignee_id}
#         body = json.dumps(update_data)

#         response = task_controller.update_task(body, actual_task_id, modifier_id)

#         # Check if response contains an error status code
#         status_code = response.get("statusCode", 200)
#         if status_code >= 400:
#             # Parse error message
#             if isinstance(response.get("body"), str):
#                 error_body = json.loads(response["body"])
#             else:
#                 error_body = response.get("body", {})

#             error_message = error_body.get("error", "Task assignment failed")
#             raise HTTPException(status_code=status_code, detail=error_message)

#         # Parse successful response
#         if isinstance(response.get("body"), str):
#             result = json.loads(response["body"])
#         else:
#             result = response.get("body", {})

#         return result

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to assign task: {str(e)}")


# def agent_create_task_sync(
#     requesting_user: str,
#     title: str,
#     project_id: str,
#     user_id: str,
#     description: str = "",
#     assignee_email: Optional[str] = None,
#     assignee_name: Optional[str] = None,
#     priority: str = "Medium",
#     status: str = "To Do",
#     due_date: Optional[str] = None,
#     issue_type: str = "task",
#     labels: Optional[list] = None,
# ):
#     """
#     Synchronous version of agent_create_task for use in LangGraph tools.
#     """
#     # All the same logic as agent_create_task but without async operations
#     # Simply don't call websocket broadcast
#     from controllers import task_controller
#     import json

#     task_data = {
#         "title": title,
#         "description": description,
#         "priority": priority,
#         "status": status,
#         "issue_type": issue_type,
#         "labels": labels or [],
#     }

#     if assignee_email:
#         task_data["assignee_email"] = assignee_email
#     if assignee_name:
#         task_data["assignee_name"] = assignee_name
#     if due_date:
#         task_data["due_date"] = due_date

#     body = json.dumps(task_data)
#     response = task_controller.create_task(body, project_id, user_id)

#     if response.get("statusCode", 200) >= 400:
#         error_body = (
#             json.loads(response["body"])
#             if isinstance(response["body"], str)
#             else response["body"]
#         )
#         raise Exception(error_body.get("error", "Failed to create task"))

#     result = (
#         json.loads(response["body"])
#         if isinstance(response["body"], str)
#         else response["body"]
#     )
#     return result


# def agent_assign_task_sync(
#     requesting_user: str,
#     task_id: str,
#     assignee_identifier: str,
#     user_id: str,
# ):
#     """
#     Synchronous version of agent_assign_task for use in LangGraph tools.
#     """
#     from controllers import task_controller
#     import json

#     # Resolve assignee
#     assignee = db.users.find_one(
#         {
#             "$or": [
#                 {"email": assignee_identifier},
#                 {"name": {"$regex": f"^{assignee_identifier}$", "$options": "i"}},
#             ]
#         }
#     )

#     if not assignee:
#         raise Exception(f"User '{assignee_identifier}' not found")

#     update_data = {
#         "assignee_email": assignee["email"],
#         "assignee_name": assignee["name"],
#     }

#     body = json.dumps(update_data)
#     response = task_controller.update_task(body, task_id, user_id)

#     if response.get("statusCode", 200) >= 400:
#         raise Exception("Failed to assign task")

#     result = (
#         json.loads(response["body"])
#         if isinstance(response["body"], str)
#         else response["body"]
#     )
#     return result
# backend-2/controllers/agent_task_controller.py
"""
Agent Task Controller
Simplified interface for AI Agent to create and manage tasks
"""

from fastapi import HTTPException
from typing import Optional
from datetime import datetime
from controllers import task_controller
from models.user import User
from models.project import Project
from database import db
from bson import ObjectId
import json


def agent_create_task(
    requesting_user: str,
    title: str,
    project_id: str,
    user_id: str,
    assignee_email: str = None,
    assignee_name: str = None,
    **kwargs,
):
    """
    Agent-friendly task creation with automatic assignee resolution and RBAC

    Args:
        requesting_user: Email of the actual user making this request (for permission check)
        title: Task title
        project_id: Target project
        user_id: Service account user ID (from agent auth)
        assignee_email: Optional email to assign to
        assignee_name: Optional name to search for
        **kwargs: Additional task fields
    """
    try:
        # Step 1: Validate requesting user exists and has permission
        actual_user = User.find_by_email(requesting_user)
        if not actual_user:
            raise HTTPException(
                status_code=404, detail=f"User with email '{requesting_user}' not found"
            )

        # Step 2: Check if user has permission to create tasks (Admin or Member)
        user_role = actual_user.get("role", "").lower()
        if user_role not in ["admin", "member"]:
            raise HTTPException(
                status_code=403,
                detail=f"Only Admin and Member users can create tasks. Your role is '{actual_user.get('role')}'",
            )

        # Step 3: Use actual user's ID for task creation (for audit trail)
        creator_id = str(actual_user["_id"])

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

        # Create task using existing controller with actual user ID
        body = json.dumps(task_data)
        response = task_controller.create_task(body, creator_id)

        # Check if response contains an error status code
        status_code = response.get("statusCode", 200)
        if status_code >= 400:
            # Parse error message
            if isinstance(response.get("body"), str):
                error_body = json.loads(response["body"])
            else:
                error_body = response.get("body", {})

            error_message = error_body.get("error", "Task creation failed")
            raise HTTPException(status_code=status_code, detail=error_message)

        # Parse successful response
        if isinstance(response.get("body"), str):
            result = json.loads(response["body"])
        else:
            result = response.get("body", {})

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


def agent_assign_task(
    requesting_user: str, task_id: str, assignee_identifier: str, user_id: str
):
    """
    Assign task to user by email or name with RBAC validation

    Args:
        requesting_user: Email of the actual user making this request
        task_id: Task to assign
        assignee_identifier: Email or name of assignee
        user_id: Service account user ID
    """
    try:
        # Step 1: Validate requesting user
        actual_user = User.find_by_email(requesting_user)
        if not actual_user:
            raise HTTPException(
                status_code=404, detail=f"User with email '{requesting_user}' not found"
            )

        # Step 2: Check permission (Admin or Member)
        user_role = actual_user.get("role", "").lower()
        if user_role not in ["admin", "member"]:
            raise HTTPException(
                status_code=403,
                detail=f"Only Admin and Member users can assign tasks. Your role is '{actual_user.get('role')}'",
            )

        modifier_id = str(actual_user["_id"])

        # Try email first
        assignee = User.find_by_email(assignee_identifier)

        # Try name if email fails
        if not assignee:
            assignee = db.users.find_one(
                {"name": {"$regex": f"^{assignee_identifier}$", "$options": "i"}}
            )

        if not assignee:
            raise HTTPException(
                status_code=404, detail=f"User '{assignee_identifier}' not found"
            )

        assignee_id = str(assignee["_id"])

        # Resolve task_id - could be ticket_id (FTP-005) or MongoDB _id
        from models.task import Task

        task = (
            Task.find_by_ticket_id(task_id)
            if task_id.startswith(("FTP-", "SLS-", "TMP-", "TST-", "NP-"))
            else Task.find_by_id(task_id)
        )

        if not task:
            raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")

        actual_task_id = str(task["_id"])

        # Update task using actual user ID
        update_data = {"assignee_id": assignee_id}
        body = json.dumps(update_data)

        response = task_controller.update_task(body, actual_task_id, modifier_id)

        # Check if response contains an error status code
        status_code = response.get("statusCode", 200)
        if status_code >= 400:
            # Parse error message
            if isinstance(response.get("body"), str):
                error_body = json.loads(response["body"])
            else:
                error_body = response.get("body", {})

            error_message = error_body.get("error", "Task assignment failed")
            raise HTTPException(status_code=status_code, detail=error_message)

        # Parse successful response
        if isinstance(response.get("body"), str):
            result = json.loads(response["body"])
        else:
            result = response.get("body", {})

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign task: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# SYNCHRONOUS VERSIONS FOR LANGGRAPH TOOLS
# ─────────────────────────────────────────────────────────────────────────────


def agent_create_task_sync(
    requesting_user: str,
    title: str,
    project_id: str,
    user_id: str,
    description: str = "",
    assignee_email: Optional[str] = None,
    assignee_name: Optional[str] = None,
    priority: str = "Medium",
    status: str = "To Do",
    due_date: Optional[str] = None,
    issue_type: str = "task",
    labels: Optional[list] = None,
):
    """
    Synchronous version of agent_create_task for use in LangGraph tools.
    Creates task directly in database to avoid async/controller issues.
    """
    try:
        # Validate project exists and user has access
        project = db.projects.find_one(
            {
                "_id": ObjectId(project_id),
                "$or": [{"user_id": user_id}, {"members.user_id": user_id}],
            }
        )

        if not project:
            raise Exception("Project not found or access denied")

        # Generate ticket ID
        project_prefix = "".join(
            [c.upper() for c in project.get("name", "TASK") if c.isalnum()]
        )[:4]
        task_count = db.tasks.count_documents({"project_id": project_id})
        ticket_id = f"{project_prefix}-{task_count + 1}"

        # Resolve assignee if provided
        assignee_data = {}
        if assignee_email:
            assignee = db.users.find_one({"email": assignee_email})
            if assignee:
                assignee_data = {
                    "assignee_email": assignee["email"],
                    "assignee_name": assignee.get("name", assignee_email),
                    "assignee_id": str(assignee["_id"]),
                }
            else:
                print(
                    f"⚠️ Assignee {assignee_email} not found, creating unassigned task"
                )
        elif assignee_name:
            assignee = db.users.find_one(
                {"name": {"$regex": f"^{assignee_name}$", "$options": "i"}}
            )
            if assignee:
                assignee_data = {
                    "assignee_email": assignee.get("email", ""),
                    "assignee_name": assignee.get("name", assignee_name),
                    "assignee_id": str(assignee["_id"]),
                }

        # Create task document
        task = {
            "title": title,
            "description": description,
            "project_id": project_id,
            "status": status,
            "priority": priority,
            "issue_type": issue_type,
            "ticket_id": ticket_id,
            "labels": labels or [],
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            **assignee_data,
        }

        if due_date:
            task["due_date"] = due_date

        # Insert task
        result = db.tasks.insert_one(task)
        task["_id"] = str(result.inserted_id)

        # Update project task count
        db.projects.update_one(
            {"_id": ObjectId(project_id)}, {"$inc": {"task_count": 1}}
        )

        return {"success": True, "task": task, "ticket_id": ticket_id}

    except Exception as e:
        raise Exception(f"Failed to create task: {str(e)}")


def agent_assign_task_sync(
    requesting_user: str,
    task_id: str,
    assignee_identifier: str,
    user_id: str,
):
    """
    Synchronous version of agent_assign_task for use in LangGraph tools.
    Assigns task directly in database to avoid async/controller issues.
    """
    try:
        # Find task
        task = db.tasks.find_one({"_id": ObjectId(task_id)})

        if not task:
            raise Exception("Task not found")

        # Check user has access to project
        project = db.projects.find_one(
            {
                "_id": ObjectId(task["project_id"]),
                "$or": [{"user_id": user_id}, {"members.user_id": user_id}],
            }
        )

        if not project:
            raise Exception("Access denied")

        # Resolve assignee
        assignee = db.users.find_one(
            {
                "$or": [
                    {"email": assignee_identifier},
                    {"name": {"$regex": f"^{assignee_identifier}$", "$options": "i"}},
                ]
            }
        )

        if not assignee:
            raise Exception(f"User '{assignee_identifier}' not found")

        # Update task
        db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "assignee_email": assignee["email"],
                    "assignee_name": assignee.get("name", assignee["email"]),
                    "assignee_id": str(assignee["_id"]),
                    "updated_at": datetime.utcnow(),
                }
            },
        )

        # Get updated task
        updated_task = db.tasks.find_one({"_id": ObjectId(task_id)})
        updated_task["_id"] = str(updated_task["_id"])

        return {"success": True, "task": updated_task}

    except Exception as e:
        raise Exception(f"Failed to assign task: {str(e)}")
