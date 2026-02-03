"""
Dashboard Controller - Analytics and Reports
"""
import json
from datetime import datetime, timedelta
from bson import ObjectId
from utils.auth_utils import verify_token
from database import db

def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def convert_dates_to_strings(data):
    """Recursively convert all datetime objects in a data structure to strings"""
    if isinstance(data, dict):
        return {key: convert_dates_to_strings(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [convert_dates_to_strings(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    else:
        return data

def get_dashboard_analytics(user_id):
    """
    Get comprehensive dashboard analytics for the logged-in user
    Returns: task stats, project stats, upcoming deadlines, recent activity
    """
    try:
        # Verify authentication
        if not user_id:
            return {
                "success": False,
                "status": 401,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "Authentication required"})
            }
        
        from models.user import User
        user = User.find_by_id(user_id)
        if not user:
            return {
                "success": False,
                "status": 404,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "User not found"})
            }
        
        user_role = user.get("role")
        
        # Get user's projects (owned or member of)
        projects_collection = db["projects"]
        tasks_collection = db["tasks"]
        
        # Find projects where user is owner or member
        user_projects = list(projects_collection.find({
            "$or": [
                {"user_id": user_id},
                {"members": {"$elemMatch": {"user_id": user_id}}}
            ]
        }))
        
        project_ids = [p["_id"] for p in user_projects]
        
        # Get all tasks for these projects
        # Convert ObjectId to string for comparison since tasks store project_id as string
        project_ids_str = [str(pid) for pid in project_ids]
        all_project_tasks = list(tasks_collection.find({
            "project_id": {"$in": project_ids_str}
        }))
        
        print(f"[DASHBOARD] Found {len(all_project_tasks)} tasks for {len(user_projects)} projects")
        
        # Get tasks assigned to user
        my_tasks = list(tasks_collection.find({
            "assignee_id": user_id
        }))
        
        # Calculate task statistics
        task_stats = {
            "total": len(my_tasks),
            "pending": len([t for t in my_tasks if t.get("status") not in ["Done", "Closed"]]),
            "in_progress": len([t for t in my_tasks if t.get("status") == "In Progress"]),
            "done": len([t for t in my_tasks if t.get("status") == "Done"]),
            "closed": len([t for t in my_tasks if t.get("status") == "Closed"]),
            "overdue": 0
        }
        
        # Calculate overdue tasks
        now = datetime.now()
        for task in my_tasks:
            if task.get("status") not in ["Done", "Closed"] and task.get("due_date"):
                due_date = task.get("due_date")
                if isinstance(due_date, str):
                    try:
                        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    except:
                        continue
                if due_date < now:
                    task_stats["overdue"] += 1
        
        # Calculate project statistics
        owned_projects = [p for p in user_projects if p.get("user_id") == user_id]
        member_projects = [p for p in user_projects if p.get("user_id") != user_id]
        
        project_stats = {
            "total": len(user_projects),
            "owned": len(owned_projects),
            "member_of": len(member_projects),
            "active": len([p for p in user_projects if p.get("status") == "Active"]),
            "completed": len([p for p in user_projects if p.get("status") == "Completed"])
        }
        
        # Calculate task distribution by priority
        priority_distribution = {
            "High": 0,
            "Medium": 0,
            "Low": 0
        }
        for task in my_tasks:
            if task.get("status") not in ["Done", "Closed"]:
                priority = task.get("priority", "Low")
                if priority in priority_distribution:
                    priority_distribution[priority] += 1
        
        # Calculate task distribution by status
        status_distribution = {
            "To Do": 0,
            "In Progress": 0,
            "Done": 0,
            "Closed": 0
        }
        for task in my_tasks:
            status = task.get("status", "To Do")
            if status in status_distribution:
                status_distribution[status] += 1
        
        # Get upcoming deadlines (next 7 days)
        end_of_week = now + timedelta(days=7)
        upcoming_deadlines = []
        
        for task in my_tasks:
            if task.get("status") not in ["Done", "Closed"] and task.get("due_date"):
                due_date = task.get("due_date")
                if isinstance(due_date, str):
                    try:
                        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    except:
                        continue
                
                if due_date <= end_of_week:
                    # Find project name - ensure both IDs are compared as ObjectId or string
                    task_project_id = task.get("project_id")
                    project = next((p for p in user_projects if str(p["_id"]) == str(task_project_id)), None)
                    project_name = project.get("name", "Unknown") if project else "Unknown"
                    
                    # Convert due_date to string for JSON serialization
                    due_date_str = due_date.isoformat() if isinstance(due_date, datetime) else str(due_date)
                    
                    upcoming_deadlines.append({
                        "task_id": str(task["_id"]),
                        "title": task.get("title", ""),
                        "due_date": due_date_str,
                        "priority": task.get("priority", "Low"),
                        "status": task.get("status", "To Do"),
                        "project_id": str(task.get("project_id", "")),
                        "project_name": project_name,
                        "days_until": (due_date - now).days
                    })
        
        # Sort by due date
        upcoming_deadlines.sort(key=lambda x: x["due_date"])
        
        # Get project progress (tasks completed vs total)
        project_progress = []
        for project in user_projects:
            project_tasks = [t for t in all_project_tasks if str(t.get("project_id")) == str(project["_id"])]
            total_tasks = len(project_tasks)
            # Completed = Only Closed status (approved tickets)
            completed_tasks = len([t for t in project_tasks if t.get("status") == "Closed"])
            
            print(f"[DASHBOARD] Project: {project.get('name')}, Total: {total_tasks}, Completed: {completed_tasks}")
            
            if total_tasks > 0:
                progress_percentage = (completed_tasks / total_tasks) * 100
            else:
                progress_percentage = 0
            
            project_progress.append({
                "project_id": str(project["_id"]),
                "project_name": project.get("name", ""),
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "progress_percentage": round(progress_percentage, 1)
            })
        
        print(f"[DASHBOARD] Project progress list: {project_progress}")
        
        # Sort by progress percentage
        project_progress.sort(key=lambda x: x["progress_percentage"], reverse=True)
        
        # Get recent activity (last 10 activities)
        recent_activities = []
        for task in sorted(my_tasks, key=lambda x: x.get("updated_at", ""), reverse=True)[:10]:
            task_project_id = task.get("project_id")
            project = next((p for p in user_projects if str(p["_id"]) == str(task_project_id)), None)
            project_name = project.get("name", "Unknown") if project else "Unknown"
            
            # Convert updated_at to string
            updated_at = task.get("updated_at", "")
            if isinstance(updated_at, datetime):
                updated_at = updated_at.isoformat()
            
            recent_activities.append({
                "task_id": str(task["_id"]),
                "title": task.get("title", ""),
                "status": task.get("status", ""),
                "priority": task.get("priority", ""),
                "project_name": project_name,
                "project_id": str(task.get("project_id", "")),
                "updated_at": updated_at
            })
        
        # Prepare response
        analytics = {
            "task_stats": task_stats,
            "project_stats": project_stats,
            "priority_distribution": priority_distribution,
            "status_distribution": status_distribution,
            "upcoming_deadlines": upcoming_deadlines[:15],  # Limit to 15
            "project_progress": project_progress[:10],  # Top 10 projects
            "recent_activities": recent_activities
        }
        
        response_data = {
            "success": True,
            "analytics": analytics
        }
        
        return {
            "success": True,
            "status": 200,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps(response_data)
        }
        
    except Exception as e:
        print(f"Error in get_dashboard_analytics: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "status": 500,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps({"success": False, "error": f"Failed to fetch dashboard analytics: {str(e)}"})
        }


def get_downloadable_report(user_id):
    """
    Get detailed report data for download (CSV/PDF)
    Returns comprehensive data about user's tasks and projects
    """
    try:
        # Verify authentication
        if not user_id:
            return {
                "success": False,
                "status": 401,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "Authentication required"})
            }
        
        from models.user import User
        user = User.find_by_id(user_id)
        if not user:
            return {
                "success": False,
                "status": 404,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "User not found"})
            }
        
        # Get user's projects and tasks
        projects_collection = db["projects"]
        tasks_collection = db["tasks"]
        users_collection = db["users"]
        
        # Find projects where user is owner or member
        user_projects = list(projects_collection.find({
            "$or": [
                {"user_id": user_id},
                {"members": {"$elemMatch": {"user_id": user_id}}}
            ]
        }))
        
        project_ids = [p["_id"] for p in user_projects]
        
        # Get all tasks for these projects
        # Convert ObjectId to string for comparison since tasks store project_id as string
        project_ids_str = [str(pid) for pid in project_ids]
        all_project_tasks = list(tasks_collection.find({
            "project_id": {"$in": project_ids_str}
        }))
        
        # Get tasks assigned to user
        my_tasks = list(tasks_collection.find({
            "assignee_id": user_id
        }))
        
        # Prepare detailed report data
        report_data = {
            "generated_at": datetime.now().isoformat(),
            "user_info": {
                "user_id": user_id,
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "role": user.get("role", "")
            },
            "projects": [],
            "my_tasks": [],
            "summary": {
                "total_projects": len(user_projects),
                "total_tasks": len(my_tasks),
                "pending_tasks": len([t for t in my_tasks if t.get("status") not in ["Done", "Closed"]]),
                "completed_tasks": len([t for t in my_tasks if t.get("status") in ["Done", "Closed"]])
            }
        }
        
        # Add project details
        for project in user_projects:
            project_tasks = [t for t in all_project_tasks if t.get("project_id") == project["_id"]]
            
            # Convert datetime to string
            created_at = project.get("created_at", "")
            if isinstance(created_at, datetime):
                created_at = created_at.isoformat()
            
            report_data["projects"].append({
                "project_id": str(project["_id"]),
                "name": project.get("name", ""),
                "description": project.get("description", ""),
                "status": project.get("status", ""),
                "created_at": created_at,
                "total_tasks": len(project_tasks),
                "completed_tasks": len([t for t in project_tasks if t.get("status") in ["Done", "Closed"]])
            })
        
        # Add task details
        for task in my_tasks:
            project = next((p for p in user_projects if p["_id"] == task.get("project_id")), None)
            
            # Convert datetime fields to strings
            created_at = task.get("created_at", "")
            if isinstance(created_at, datetime):
                created_at = created_at.isoformat()
            
            updated_at = task.get("updated_at", "")
            if isinstance(updated_at, datetime):
                updated_at = updated_at.isoformat()
            
            due_date = task.get("due_date", "")
            if isinstance(due_date, datetime):
                due_date = due_date.isoformat()
            
            report_data["my_tasks"].append({
                "task_id": str(task["_id"]),
                "ticket_id": task.get("ticket_id", ""),
                "title": task.get("title", ""),
                "description": task.get("description", ""),
                "status": task.get("status", ""),
                "priority": task.get("priority", ""),
                "due_date": due_date,
                "project_name": project.get("name", "") if project else "",
                "created_at": created_at,
                "updated_at": updated_at
            })
        
        response_data = {
            "success": True,
            "report": report_data
        }
        
        return {
            "success": True,
            "status": 200,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps(response_data)
        }
        
    except Exception as e:
        print(f"Error in get_downloadable_report: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "status": 500,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps({"success": False, "error": f"Failed to generate report: {str(e)}"})
        }
