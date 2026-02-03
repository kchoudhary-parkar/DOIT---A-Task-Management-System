import json
from models.sprint import Sprint
from models.task import Task
from models.project import Project
from utils.response import success_response, error_response
from utils.validators import validate_required_fields
from datetime import datetime, timezone

def create_sprint(body_str, project_id, user_id):
    """Create a new sprint - only project owner can create"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)
    
    # Check if project exists and user is owner
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)
    
    if project["user_id"] != user_id:
        return error_response("Only project owner can create sprints", 403)
    
    # Validate required fields
    required = ["name", "start_date", "end_date"]
    validation_error = validate_required_fields(data, required)
    if validation_error:
        return error_response(validation_error, 400)
    
    # Validate dates
    try:
        start_date = datetime.fromisoformat(data["start_date"].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data["end_date"].replace('Z', '+00:00'))
        
        if end_date <= start_date:
            return error_response("End date must be after start date", 400)
    except:
        return error_response("Invalid date format. Use ISO format.", 400)
    
    # Check if there's already an active sprint
    active_sprint = Sprint.find_active_by_project(project_id)
    if active_sprint:
        return error_response("Cannot create sprint. There's already an active sprint for this project.", 400)
    
    # Create sprint
    sprint_data = {
        "name": data["name"].strip(),
        "goal": data.get("goal", "").strip(),
        "project_id": project_id,
        "start_date": data["start_date"],
        "end_date": data["end_date"],
        "created_by": user_id
    }
    
    sprint = Sprint.create(sprint_data)
    
    # Convert ObjectId to string
    sprint["_id"] = str(sprint["_id"])
    sprint["created_at"] = sprint["created_at"].isoformat()
    sprint["updated_at"] = sprint["updated_at"].isoformat()
    
    return success_response({
        "message": "Sprint created successfully",
        "sprint": sprint
    }, 201)


def get_project_sprints(project_id, user_id):
    """Get all sprints for a project"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    # Check if user is member of the project
    if not Project.is_member(project_id, user_id):
        return error_response("Access denied. You are not a member of this project.", 403)
    
    sprints_list = Sprint.find_by_project(project_id)
    
    # Get all sprint IDs that need task counts
    sprint_ids_needing_counts = [str(s["_id"]) for s in sprints_list 
                                  if s["status"] != "completed" or "total_tasks_snapshot" not in s]
    
    # Batch query for task counts using aggregation
    task_counts = {}
    if sprint_ids_needing_counts:
        from database import db
        pipeline = [
            {"$match": {"sprint_id": {"$in": sprint_ids_needing_counts}}},
            {"$group": {
                "_id": "$sprint_id",
                "total": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "Done"]}, 1, 0]}}
            }}
        ]
        counts_result = list(db.tasks.aggregate(pipeline))
        task_counts = {c["_id"]: {"total": c["total"], "completed": c["completed"]} for c in counts_result}
    
    # Convert ObjectId and datetime to strings, and add task counts
    for sprint in sprints_list:
        sprint_id_str = str(sprint["_id"])
        sprint["_id"] = sprint_id_str
        sprint["created_at"] = sprint["created_at"].isoformat()
        sprint["updated_at"] = sprint["updated_at"].isoformat()
        if sprint["completed_at"]:
            sprint["completed_at"] = sprint["completed_at"].isoformat()
        
        # Add task counts
        # For completed sprints, use snapshot if available
        if sprint["status"] == "completed" and "total_tasks_snapshot" in sprint:
            sprint["total_tasks"] = sprint.get("total_tasks_snapshot", 0)
            sprint["completed_tasks"] = sprint.get("completed_tasks_snapshot", 0)
        else:
            # Use batch-fetched counts
            counts = task_counts.get(sprint_id_str, {"total": 0, "completed": 0})
            sprint["total_tasks"] = counts["total"]
            sprint["completed_tasks"] = counts["completed"]
    
    return success_response({
        "sprints": sprints_list,
        "count": len(sprints_list)
    })


def get_sprint_by_id(sprint_id, user_id):
    """Get a specific sprint by ID"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    sprint = Sprint.find_by_id(sprint_id)
    
    if not sprint:
        return error_response("Sprint not found", 404)
    
    # Check if user is member of the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response("Access denied. You are not a member of this project.", 403)
    
    # Convert ObjectId and datetime to strings
    sprint["_id"] = str(sprint["_id"])
    sprint["created_at"] = sprint["created_at"].isoformat()
    sprint["updated_at"] = sprint["updated_at"].isoformat()
    if sprint["completed_at"]:
        sprint["completed_at"] = sprint["completed_at"].isoformat()
    
    # Add task counts
    # For completed sprints, use snapshot if available
    if sprint["status"] == "completed" and "total_tasks_snapshot" in sprint:
        sprint["total_tasks"] = sprint.get("total_tasks_snapshot", 0)
        sprint["completed_tasks"] = sprint.get("completed_tasks_snapshot", 0)
    else:
        # For active/planned sprints, count current tasks
        sprint_tasks = Task.find_by_sprint(sprint_id)
        sprint["total_tasks"] = len(sprint_tasks)
        sprint["completed_tasks"] = len([t for t in sprint_tasks if t["status"] == "Done"])
    
    return success_response({"sprint": sprint})


def update_sprint(body_str, sprint_id, user_id):
    """Update a sprint - only owner can update"""
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
    
    # Check if user is project owner
    project = Project.find_by_id(sprint["project_id"])
    if project["user_id"] != user_id:
        return error_response("Only project owner can update sprints", 403)
    
    # Cannot update completed sprint
    if sprint["status"] == "completed":
        return error_response("Cannot update a completed sprint", 400)
    
    # Prepare update data
    update_data = {}
    
    if "name" in data and data["name"] and data["name"].strip():
        update_data["name"] = data["name"].strip()
    
    if "goal" in data:
        update_data["goal"] = data["goal"].strip() if data["goal"] else ""
    
    if "start_date" in data or "end_date" in data:
        try:
            start_date = datetime.fromisoformat(data.get("start_date", sprint["start_date"]).replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data.get("end_date", sprint["end_date"]).replace('Z', '+00:00'))
            
            if end_date <= start_date:
                return error_response("End date must be after start date", 400)
            
            if "start_date" in data:
                update_data["start_date"] = data["start_date"]
            if "end_date" in data:
                update_data["end_date"] = data["end_date"]
        except:
            return error_response("Invalid date format. Use ISO format.", 400)
    
    if not update_data:
        return error_response("No valid fields to update", 400)
    
    # Update sprint
    success = Sprint.update(sprint_id, update_data)
    
    if success:
        updated_sprint = Sprint.find_by_id(sprint_id)
        updated_sprint["_id"] = str(updated_sprint["_id"])
        updated_sprint["created_at"] = updated_sprint["created_at"].isoformat()
        updated_sprint["updated_at"] = updated_sprint["updated_at"].isoformat()
        if updated_sprint["completed_at"]:
            updated_sprint["completed_at"] = updated_sprint["completed_at"].isoformat()
        
        return success_response({
            "message": "Sprint updated successfully",
            "sprint": updated_sprint
        })
    else:
        return error_response("Failed to update sprint", 500)


def start_sprint(sprint_id, user_id):
    """Start a sprint - makes it active"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)
    
    # Check if user is project owner
    project = Project.find_by_id(sprint["project_id"])
    if project["user_id"] != user_id:
        return error_response("Only project owner can start sprints", 403)
    
    if sprint["status"] != "planned":
        return error_response(f"Cannot start a sprint that is {sprint['status']}", 400)
    
    # Check if there's already an active sprint
    active_sprint = Sprint.find_active_by_project(sprint["project_id"])
    if active_sprint:
        return error_response("Cannot start sprint. There's already an active sprint for this project.", 400)
    
    # Start the sprint
    success = Sprint.start_sprint(sprint_id)
    
    if success:
        return success_response({
            "message": "Sprint started successfully"
        })
    else:
        return error_response("Failed to start sprint", 500)


def complete_sprint(sprint_id, user_id):
    """Complete a sprint - moves incomplete tasks back to backlog"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)
    
    # Check if user is project owner
    project = Project.find_by_id(sprint["project_id"])
    if project["user_id"] != user_id:
        return error_response("Only project owner can complete sprints", 403)
    
    if sprint["status"] != "active":
        return error_response(f"Cannot complete a sprint that is {sprint['status']}", 400)
    
    # Move incomplete tasks back to backlog
    sprint_tasks = Task.find_by_sprint(sprint_id)
    moved_count = 0
    completed_count = 0
    total_count = len(sprint_tasks)
    
    for task in sprint_tasks:
        if task["status"] == "Done":
            completed_count += 1
        else:
            # Mark task as moved to backlog from completed sprint
            Task.update(str(task["_id"]), {
                "sprint_id": None,
                "in_backlog": True,
                "moved_to_backlog_at": datetime.now(timezone.utc).replace(tzinfo=None)
            })
            moved_count += 1
    
    # Complete the sprint with task count snapshot
    success = Sprint.complete_sprint(sprint_id, total_count, completed_count)
    
    if success:
        return success_response({
            "message": f"Sprint completed successfully. {moved_count} incomplete task(s) moved to backlog."
        })
    else:
        return error_response("Failed to complete sprint", 500)


def delete_sprint(sprint_id, user_id):
    """Delete a sprint - only if it's planned (not started)"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)
    
    # Check if user is project owner
    project = Project.find_by_id(sprint["project_id"])
    if project["user_id"] != user_id:
        return error_response("Only project owner can delete sprints", 403)
    
    # Can only delete planned sprints
    if sprint["status"] != "planned":
        return error_response("Can only delete planned sprints. Complete active sprints first.", 400)
    
    # Move all tasks in this sprint back to backlog using bulk update
    from database import db
    db.tasks.update_many(
        {"sprint_id": sprint_id},
        {"$set": {
            "sprint_id": None,
            "in_backlog": True,
            "moved_to_backlog_at": datetime.now(timezone.utc).replace(tzinfo=None),
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
        }}
    )
    
    # Delete sprint
    success = Sprint.delete(sprint_id)
    
    if success:
        return success_response({
            "message": "Sprint deleted successfully"
        })
    else:
        return error_response("Failed to delete sprint", 500)


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
    
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)
    
    task = Task.find_by_id(task_id)
    if not task:
        return error_response("Task not found", 404)
    
    # Check if user is member of the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response("Access denied", 403)
    
    # Task must belong to same project
    if task["project_id"] != sprint["project_id"]:
        return error_response("Task must belong to the same project as the sprint", 400)
    
    # Cannot add to completed sprint
    if sprint["status"] == "completed":
        return error_response("Cannot add tasks to a completed sprint", 400)
    
    # Get user name for activity logging
    from models.user import User
    user = User.find_by_id(user_id)
    user_name = user["name"] if user else "Unknown"
    
    # Add activity to task
    Task.add_activity(task_id, {
        "user_id": user_id,
        "user_name": user_name,
        "action": "sprint_add",
        "sprint_id": sprint_id,
        "sprint_name": sprint["name"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Update task with sprint_id and remove from backlog
    success = Task.update(task_id, {
        "sprint_id": sprint_id,
        "in_backlog": False,
        "moved_to_backlog_at": None
    })
    
    if success:
        return success_response({
            "message": "Task added to sprint successfully"
        })
    else:
        return error_response("Failed to add task to sprint", 500)


def remove_task_from_sprint(sprint_id, task_id, user_id):
    """Remove a task from a sprint (move to backlog)"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    sprint = Sprint.find_by_id(sprint_id)
    if not sprint:
        return error_response("Sprint not found", 404)
    
    task = Task.find_by_id(task_id)
    if not task:
        return error_response("Task not found", 404)
    
    # Check if user is member of the project
    if not Project.is_member(sprint["project_id"], user_id):
        return error_response("Access denied", 403)
    
    # Verify task is in this sprint
    if task.get("sprint_id") != sprint_id:
        return error_response("Task is not in this sprint", 400)
    
    # Cannot remove from completed sprint
    if sprint["status"] == "completed":
        return error_response("Cannot remove tasks from a completed sprint", 400)
    
    # Get user name for activity logging
    from models.user import User
    user = User.find_by_id(user_id)
    user_name = user["name"] if user else "Unknown"
    
    # Add activity to task
    Task.add_activity(task_id, {
        "user_id": user_id,
        "user_name": user_name,
        "action": "sprint_remove",
        "sprint_id": sprint_id,
        "sprint_name": sprint["name"],
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    # Remove sprint_id from task (move to backlog)
    success = Task.update(task_id, {
        "sprint_id": None,
        "in_backlog": True,
        "moved_to_backlog_at": datetime.now(timezone.utc).replace(tzinfo=None)
    })
    
    if success:
        return success_response({
            "message": "Task moved to backlog successfully"
        })
    else:
        return error_response("Failed to remove task from sprint", 500)


def get_backlog_tasks(project_id, user_id):
    """Get backlog tasks - tasks that were moved to backlog from completed sprints"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    # Check if user is member of the project
    if not Project.is_member(project_id, user_id):
        return error_response("Access denied. You are not a member of this project.", 403)
    
    # Get backlog tasks using the Task model method
    from utils.response import datetime_to_iso
    backlog_tasks = Task.find_backlog(project_id)
    
    # Convert ObjectId and datetime to strings
    for task in backlog_tasks:
        task["_id"] = str(task["_id"])
        task["created_at"] = datetime_to_iso(task["created_at"])
        task["updated_at"] = datetime_to_iso(task["updated_at"])
        if "moved_to_backlog_at" in task and task["moved_to_backlog_at"]:
            task["moved_to_backlog_at"] = datetime_to_iso(task["moved_to_backlog_at"])
    
    return success_response({
        "tasks": backlog_tasks,
        "count": len(backlog_tasks)
    })

def get_available_sprint_tasks(project_id, user_id):
    """Get available tasks that can be added to sprints - all unassigned tasks"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    # Check if user is member of the project
    if not Project.is_member(project_id, user_id):
        return error_response("Access denied. You are not a member of this project.", 403)
    
    # Get available tasks using the Task model method
    from utils.response import datetime_to_iso
    available_tasks = Task.find_available_for_sprint(project_id)
    
    # Convert ObjectId and datetime to strings
    for task in available_tasks:
        task["_id"] = str(task["_id"])
        if "created_at" in task and task["created_at"]:
            task["created_at"] = datetime_to_iso(task["created_at"])
        if "updated_at" in task and task["updated_at"]:
            task["updated_at"] = datetime_to_iso(task["updated_at"])
        if "due_date" in task and task["due_date"]:
            task["due_date"] = datetime_to_iso(task["due_date"])
        if "moved_to_backlog_at" in task and task["moved_to_backlog_at"]:
            task["moved_to_backlog_at"] = datetime_to_iso(task["moved_to_backlog_at"])
    
    return success_response({
        "tasks": available_tasks,
        "count": len(available_tasks)
    })
