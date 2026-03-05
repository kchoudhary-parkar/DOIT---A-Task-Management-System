# """
# Agent Sprint Controller
# Handles sprint creation with RBAC validation for Azure AI Agent
# """

# import json
# from fastapi import HTTPException
# from models.user import User
# from models.project import Project
# from controllers import sprint_controller


# def agent_create_sprint(
#     requesting_user: str,
#     name: str,
#     project_id: str,
#     start_date: str,
#     end_date: str,
#     user_id: str,
#     goal: str = "",
#     status: str = "Planning",
# ):
#     """
#     Create sprint with RBAC validation

#     Args:
#         requesting_user: Email of the actual user making this request
#         name: Sprint name
#         project_id: Target project ID
#         start_date: Sprint start date (ISO format)
#         end_date: Sprint end date (ISO format)
#         user_id: Service account user ID (from agent auth)
#         goal: Sprint goal (optional)
#         status: Sprint status (optional, default "Planning")
#     """
#     try:
#         # Step 1: Validate requesting user
#         actual_user = User.find_by_email(requesting_user)
#         if not actual_user:
#             raise HTTPException(
#                 status_code=404, detail=f"User with email '{requesting_user}' not found"
#             )

#         # Step 2: Check permission - ONLY Admin can create sprints
#         user_role = actual_user.get("role", "").lower()
#         if user_role != "admin":
#             raise HTTPException(
#                 status_code=403,
#                 detail=f"Only Admin users can create sprints. Your role is '{actual_user.get('role')}'",
#             )

#         # Step 3: Verify project exists
#         project = Project.find_by_id(project_id)
#         if not project:
#             raise HTTPException(
#                 status_code=404, detail=f"Project with ID '{project_id}' not found"
#             )

#         # Step 4: Build sprint data
#         sprint_data = {
#             "name": name,
#             "goal": goal,
#             "start_date": start_date,
#             "end_date": end_date,
#             "status": status,
#         }

#         # Step 5: Call existing sprint controller with actual user's ID
#         creator_id = str(actual_user["_id"])
#         body = json.dumps(sprint_data)

#         response = sprint_controller.create_sprint(body, project_id, creator_id)

#         # Step 6: Check if response contains an error status code
#         status_code = response.get("statusCode", 200)
#         if status_code >= 400:
#             # Parse error message
#             if isinstance(response.get("body"), str):
#                 error_body = json.loads(response["body"])
#             else:
#                 error_body = response.get("body", {})

#             error_message = error_body.get("error", "Sprint creation failed")
#             raise HTTPException(status_code=status_code, detail=error_message)

#         # Step 7: Parse successful response
#         if isinstance(response.get("body"), str):
#             result = json.loads(response["body"])
#         else:
#             result = response.get("body", {})

#         return result

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Sprint creation error: {str(e)}")


# def agent_create_sprint_sync(
#     requesting_user: str,
#     name: str,
#     project_id: str,
#     user_id: str,
#     start_date: Optional[str] = None,
#     end_date: Optional[str] = None,
#     goal: str = "",
# ):
#     """
#     Synchronous version of agent_create_sprint for use in LangGraph tools.
#     """
#     from controllers import sprint_controller
#     import json

#     sprint_data = {
#         "name": name,
#         "goal": goal,
#         "status": "planned",
#     }

#     if start_date:
#         sprint_data["start_date"] = start_date
#     if end_date:
#         sprint_data["end_date"] = end_date

#     body = json.dumps(sprint_data)
#     response = sprint_controller.create_sprint(body, project_id, user_id)

#     if response.get("statusCode", 200) >= 400:
#         error_body = (
#             json.loads(response["body"])
#             if isinstance(response["body"], str)
#             else response["body"]
#         )
#         raise Exception(error_body.get("error", "Failed to create sprint"))

#     result = (
#         json.loads(response["body"])
#         if isinstance(response["body"], str)
#         else response["body"]
#     )
#     return result
# backend-2/controllers/agent_sprint_controller.py
"""
Agent Sprint Controller
Handles sprint creation with RBAC validation for Azure AI Agent
"""

import json
from typing import Optional
from datetime import datetime
from fastapi import HTTPException
from models.user import User
from models.project import Project
from controllers import sprint_controller
from database import db
from bson import ObjectId


def agent_create_sprint(
    requesting_user: str,
    name: str,
    project_id: str,
    start_date: str,
    end_date: str,
    user_id: str,
    goal: str = "",
    status: str = "Planning",
):
    """
    Create sprint with RBAC validation

    Args:
        requesting_user: Email of the actual user making this request
        name: Sprint name
        project_id: Target project ID
        start_date: Sprint start date (ISO format)
        end_date: Sprint end date (ISO format)
        user_id: Service account user ID (from agent auth)
        goal: Sprint goal (optional)
        status: Sprint status (optional, default "Planning")
    """
    try:
        # Step 1: Validate requesting user
        actual_user = User.find_by_email(requesting_user)
        if not actual_user:
            raise HTTPException(
                status_code=404, detail=f"User with email '{requesting_user}' not found"
            )

        # Step 2: Check permission - ONLY Admin can create sprints
        user_role = actual_user.get("role", "").lower()
        if user_role != "admin":
            raise HTTPException(
                status_code=403,
                detail=f"Only Admin users can create sprints. Your role is '{actual_user.get('role')}'",
            )

        # Step 3: Verify project exists
        project = Project.find_by_id(project_id)
        if not project:
            raise HTTPException(
                status_code=404, detail=f"Project with ID '{project_id}' not found"
            )

        # Step 4: Build sprint data
        sprint_data = {
            "name": name,
            "goal": goal,
            "start_date": start_date,
            "end_date": end_date,
            "status": status,
        }

        # Step 5: Call existing sprint controller with actual user's ID
        creator_id = str(actual_user["_id"])
        body = json.dumps(sprint_data)

        response = sprint_controller.create_sprint(body, project_id, creator_id)

        # Step 6: Check if response contains an error status code
        status_code = response.get("statusCode", 200)
        if status_code >= 400:
            # Parse error message
            if isinstance(response.get("body"), str):
                error_body = json.loads(response["body"])
            else:
                error_body = response.get("body", {})

            error_message = error_body.get("error", "Sprint creation failed")
            raise HTTPException(status_code=status_code, detail=error_message)

        # Step 7: Parse successful response
        if isinstance(response.get("body"), str):
            result = json.loads(response["body"])
        else:
            result = response.get("body", {})

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sprint creation error: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# SYNCHRONOUS VERSION FOR LANGGRAPH TOOLS
# ─────────────────────────────────────────────────────────────────────────────
# backend-2/controllers/agent_sprint_controller.py


def agent_create_sprint_sync(
    requesting_user: str,
    name: str,
    project_id: str,
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    goal: str = "",
):
    """
    Synchronous version of agent_create_sprint for use in LangGraph tools.
    Creates sprint directly in database to avoid async/controller issues.
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

        # Create sprint document with ALL expected fields
        sprint = {
            "name": name,
            "goal": goal,
            "project_id": project_id,
            "status": "planned",
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "completed_at": None,  # Add this field
            "tasks": [],
        }

        if start_date:
            sprint["start_date"] = start_date
        else:
            sprint["start_date"] = None

        if end_date:
            sprint["end_date"] = end_date
        else:
            sprint["end_date"] = None

        # Insert sprint
        result = db.sprints.insert_one(sprint)
        sprint["_id"] = str(result.inserted_id)

        return {"success": True, "sprint": sprint}

    except Exception as e:
        raise Exception(f"Failed to create sprint: {str(e)}")
