import json
from models.sprint import Sprint
from models.project import Project
from models.task import Task
from utils.response import success_response, error_response
from utils.validators import validate_required_fields
from database import db
from bson import ObjectId


def create_sprint(body_str, project_id, user_id):
    """Create a new sprint"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)

    # Check if project exists and user has access
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)

    if not Project.is_member(project_id, user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Validate required fields
    required = ["name"]
    validation_error = validate_required_fields(data, required)
    if validation_error:
        return error_response(validation_error, 400)

    # Create sprint data
    sprint_data = {
        "name": data["name"].strip(),
        "goal": data.get("goal", "").strip(),
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "status": data.get("status", "planned"),
        "project_id": project_id,
        "created_by": user_id,
    }

    sprint = Sprint.create(sprint_data)

    # Convert ObjectId to string
    sprint["_id"] = str(sprint["_id"])
    sprint["created_at"] = sprint["created_at"].isoformat()
    sprint["updated_at"] = sprint["updated_at"].isoformat()

    return success_response(
        {"message": "Sprint created successfully", "sprint": sprint}, 201
    )


def get_project_sprints(project_id, user_id):
    """Get all sprints for a project"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Check if project exists and user has access
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)

    if not Project.is_member(project_id, user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    sprints = Sprint.find_by_project(project_id)

    # Get task counts for each sprint
    from database import db

    # Convert ObjectId and datetime to strings, add task stats
    for sprint in sprints:
        sprint["_id"] = str(sprint["_id"])
        sprint["created_at"] = sprint["created_at"].isoformat()
        sprint["updated_at"] = sprint["updated_at"].isoformat()

        # Handle optional fields safely
        if sprint.get("completed_at"):
            sprint["completed_at"] = sprint["completed_at"].isoformat()
        else:
            sprint["completed_at"] = None

        # Ensure all expected fields exist
        sprint.setdefault("status", "planned")
        sprint.setdefault("goal", "")
        sprint.setdefault("start_date", None)
        sprint.setdefault("end_date", None)

        # Calculate real-time task statistics
        sprint_id_str = str(sprint["_id"])
        total_tasks = db.tasks.count_documents({"sprint_id": sprint_id_str})
        completed_tasks = db.tasks.count_documents(
            {"sprint_id": sprint_id_str, "status": "Done"}
        )

        sprint["total_tasks"] = total_tasks
        sprint["completed_tasks"] = completed_tasks

        # Calculate completion percentage - handle division by zero
        if total_tasks > 0:
            sprint["completion_percentage"] = round(
                (completed_tasks / total_tasks) * 100, 1
            )
        else:
            sprint["completion_percentage"] = 0  # 0% when no tasks

    return success_response({"sprints": sprints, "count": len(sprints)})


def get_sprint_by_id(sprint_id, user_id):
    """Get a specific sprint by ID"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    sprint = Sprint.find_by_id(sprint_id)

    if not sprint:
        return error_response("Sprint not found", 404)

    # Check if user has access to the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Convert ObjectId and datetime to strings, handle missing fields
    sprint["_id"] = str(sprint["_id"])
    sprint["created_at"] = sprint["created_at"].isoformat()
    sprint["updated_at"] = sprint["updated_at"].isoformat()

    # Handle optional fields safely
    if sprint.get("completed_at"):
        sprint["completed_at"] = sprint["completed_at"].isoformat()
    else:
        sprint["completed_at"] = None

    # Ensure all expected fields exist
    sprint.setdefault("status", "planned")
    sprint.setdefault("goal", "")
    sprint.setdefault("start_date", None)
    sprint.setdefault("end_date", None)

    return success_response({"sprint": sprint})


def update_sprint(body_str, sprint_id, user_id):
    """Update a sprint"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)

    # Check if sprint exists
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)

    # Check if user has access to the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Prepare update data
    update_data = {}

    if "name" in data and data["name"].strip():
        update_data["name"] = data["name"].strip()

    if "goal" in data:
        update_data["goal"] = data["goal"].strip()

    if "start_date" in data:
        update_data["start_date"] = data["start_date"]

    if "end_date" in data:
        update_data["end_date"] = data["end_date"]

    if "status" in data:
        update_data["status"] = data["status"]

        # If status is completed, set completed_at timestamp
        if data["status"] == "completed":
            from datetime import datetime

            update_data["completed_at"] = datetime.utcnow()

    if not update_data:
        return error_response("No valid fields to update", 400)

    # Update sprint
    success = Sprint.update(sprint_id, update_data)

    if success:
        updated_sprint = Sprint.find_by_id(sprint_id)
        updated_sprint["_id"] = str(updated_sprint["_id"])
        updated_sprint["created_at"] = updated_sprint["created_at"].isoformat()
        updated_sprint["updated_at"] = updated_sprint["updated_at"].isoformat()

        # Handle optional fields safely
        if updated_sprint.get("completed_at"):
            updated_sprint["completed_at"] = updated_sprint["completed_at"].isoformat()
        else:
            updated_sprint["completed_at"] = None

        return success_response(
            {"message": "Sprint updated successfully", "sprint": updated_sprint}
        )
    else:
        return error_response("Failed to update sprint", 500)


def delete_sprint(sprint_id, user_id):
    """Delete a sprint"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Check if sprint exists
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)

    # Check if user has access to the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Delete sprint
    success = Sprint.delete(sprint_id)

    if success:
        return success_response({"message": "Sprint deleted successfully"})
    else:
        return error_response("Failed to delete sprint", 500)


def start_sprint(sprint_id, user_id):
    """Start a sprint (change status to active)"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)

    # Check if user has access to the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Start the sprint
    success = Sprint.start_sprint(sprint_id)

    if success:
        return success_response({"message": "Sprint started successfully"})
    else:
        return error_response("Failed to start sprint", 500)


def complete_sprint(sprint_id, user_id):
    """Complete a sprint"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)

    # Check if user has access to the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Get task counts for snapshot
    sprint_id_str = str(sprint_id)
    total_tasks = db.tasks.count_documents({"sprint_id": sprint_id_str})
    completed_tasks = db.tasks.count_documents(
        {"sprint_id": sprint_id_str, "status": "Done"}
    )

    # Complete the sprint with snapshot
    success = Sprint.complete_sprint(sprint_id, total_tasks, completed_tasks)

    if success:
        # Move incomplete tasks to backlog
        db.tasks.update_many(
            {"sprint_id": sprint_id_str, "status": {"$ne": "Done"}},
            {"$unset": {"sprint_id": ""}, "$set": {"in_backlog": True}},
        )

        return success_response({"message": "Sprint completed successfully"})
    else:
        return error_response("Failed to complete sprint", 500)


def add_task_to_sprint(sprint_id, body_str, user_id):
    """Add a task to a sprint"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)

    task_id = data.get("task_id")
    if not task_id:
        return error_response("task_id is required", 400)

    # Check if sprint exists
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)

    # Check if user has access to the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Check if task exists
    task = Task.find_by_id(task_id)
    if not task:
        return error_response("Task not found", 404)

    # Verify task belongs to the same project
    if task["project_id"] != sprint["project_id"]:
        return error_response("Task must belong to the same project as the sprint", 400)

    # Add task to sprint
    from datetime import datetime

    result = db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {"sprint_id": str(sprint_id), "updated_at": datetime.utcnow()},
            "$unset": {"in_backlog": ""},  # Remove from backlog if it was there
        },
    )

    if result.modified_count > 0:
        return success_response({"message": "Task added to sprint successfully"})
    else:
        return error_response("Failed to add task to sprint", 500)


def remove_task_from_sprint(sprint_id, task_id, user_id):
    """Remove a task from a sprint"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Check if sprint exists
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)

    # Check if user has access to the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Remove task from sprint
    from datetime import datetime

    result = db.tasks.update_one(
        {"_id": ObjectId(task_id), "sprint_id": str(sprint_id)},
        {"$unset": {"sprint_id": ""}, "$set": {"updated_at": datetime.utcnow()}},
    )

    if result.modified_count > 0:
        return success_response({"message": "Task removed from sprint successfully"})
    else:
        return error_response("Task not found in sprint", 404)


def get_sprint_tasks(sprint_id, user_id):
    """Get all tasks in a sprint"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Check if sprint exists
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)

    # Check if user has access to the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Get tasks in this sprint
    tasks = Sprint.get_sprint_tasks(sprint_id)

    # Convert ObjectId and datetime to strings
    for task in tasks:
        task["_id"] = str(task["_id"])
        if "created_at" in task:
            task["created_at"] = task["created_at"].isoformat()
        if "updated_at" in task:
            task["updated_at"] = task["updated_at"].isoformat()

    return success_response({"tasks": tasks, "count": len(tasks)})


def get_backlog_tasks(project_id, user_id):
    """Get all backlog tasks for a project (tasks moved from completed sprints)"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Check if project exists and user has access
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)

    if not Project.is_member(project_id, user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Get tasks that are in backlog
    tasks = list(
        db.tasks.find({"project_id": project_id, "in_backlog": True}).sort(
            "created_at", -1
        )
    )

    # Convert ObjectId and datetime to strings
    for task in tasks:
        task["_id"] = str(task["_id"])
        if "created_at" in task:
            task["created_at"] = task["created_at"].isoformat()
        if "updated_at" in task:
            task["updated_at"] = task["updated_at"].isoformat()

    return success_response({"tasks": tasks, "count": len(tasks)})


def get_available_sprint_tasks(project_id, user_id):
    """Get all available tasks that can be added to sprints (not in any sprint, not in backlog)"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Check if project exists and user has access
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)

    if not Project.is_member(project_id, user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Get tasks that are not in any sprint and not in backlog
    tasks = list(
        db.tasks.find(
            {
                "project_id": project_id,
                "$or": [{"sprint_id": {"$exists": False}}, {"sprint_id": None}],
                "$or": [
                    {"in_backlog": {"$exists": False}},
                    {"in_backlog": False},
                    {"in_backlog": None},
                ],
            }
        ).sort("created_at", -1)
    )

    # Convert ObjectId and datetime to strings
    for task in tasks:
        task["_id"] = str(task["_id"])
        if "created_at" in task:
            task["created_at"] = task["created_at"].isoformat()
        if "updated_at" in task:
            task["updated_at"] = task["updated_at"].isoformat()

    return success_response({"tasks": tasks, "count": len(tasks)})
