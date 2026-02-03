"""
System Dashboard Controller
Provides system-wide statistics and analytics for super-admins
"""

import json
from datetime import datetime, timedelta
from database import db

def get_system_analytics(user_id):
    """
    Get comprehensive system-wide analytics
    Only accessible by super-admins
    """
    try:
        # Verify authentication and super-admin role
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
        
        if user.get("role") != "super-admin":
            return {
                "success": False,
                "status": 403,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "Access denied. Super-admin only."})
            }
        
        users_collection = db["users"]
        projects_collection = db["projects"]
        tasks_collection = db["tasks"]
        
        # === USER STATISTICS ===
        all_users = list(users_collection.find())
        user_stats = {
            "total": len(all_users),
            "super_admins": len([u for u in all_users if u.get("role") == "super-admin"]),
            "admins": len([u for u in all_users if u.get("role") == "admin"]),
            "members": len([u for u in all_users if u.get("role") == "member"]),
            "active_last_7_days": 0,  # Could track last_login if implemented
            "active_last_30_days": 0
        }
        
        # === PROJECT STATISTICS ===
        all_projects = list(projects_collection.find())
        project_stats = {
            "total": len(all_projects),
            "active": len([p for p in all_projects if p.get("status") != "Completed"]),  # All non-completed projects are active
            "completed": len([p for p in all_projects if p.get("status") == "Completed"]),
            "archived": len([p for p in all_projects if p.get("status") == "Archived"])
        }
        
        # Project distribution by user count
        project_user_distribution = {}
        for project in all_projects:
            members_count = len(project.get("members", [])) + 1  # +1 for owner
            project_user_distribution[project.get("name", "Unknown")] = members_count
        
        # === TASK STATISTICS ===
        all_tasks = list(tasks_collection.find())
        task_stats = {
            "total": len(all_tasks),
            "to_do": len([t for t in all_tasks if t.get("status") == "To Do"]),
            "in_progress": len([t for t in all_tasks if t.get("status") == "In Progress"]),
            "testing": len([t for t in all_tasks if t.get("status") == "Testing"]),
            "dev_complete": len([t for t in all_tasks if t.get("status") == "Dev Complete"]),
            "done": len([t for t in all_tasks if t.get("status") == "Done"]),
            "closed": len([t for t in all_tasks if t.get("status") == "Closed"])
        }
        
        # Task status distribution (for pie chart)
        status_distribution = {
            "To Do": task_stats["to_do"],
            "In Progress": task_stats["in_progress"],
            "Testing": task_stats["testing"],
            "Dev Complete": task_stats["dev_complete"],
            "Done": task_stats["done"],
            "Closed": task_stats["closed"]
        }
        
        # Task priority distribution
        priority_distribution = {
            "High": len([t for t in all_tasks if t.get("priority") == "High"]),
            "Medium": len([t for t in all_tasks if t.get("priority") == "Medium"]),
            "Low": len([t for t in all_tasks if t.get("priority") == "Low"])
        }
        
        # === PROJECT HEALTH METRICS ===
        now = datetime.now()
        project_health = []
        for project in all_projects[:10]:  # Top 10 projects
            project_id = str(project["_id"])
            project_tasks = [t for t in all_tasks if str(t.get("project_id")) == project_id]
            
            total_tasks = len(project_tasks)
            completed_tasks = len([t for t in project_tasks if t.get("status") in ["Done", "Closed"]])
            overdue_tasks = 0
            
            for task in project_tasks:
                if task.get("status") not in ["Done", "Closed"] and task.get("due_date"):
                    due_date = task.get("due_date")
                    if isinstance(due_date, str):
                        try:
                            due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                        except:
                            continue
                    if due_date < now:
                        overdue_tasks += 1
            
            completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            
            project_health.append({
                "name": project.get("name", "Unknown"),
                "total_tasks": total_tasks,
                "completed": completed_tasks,
                "overdue": overdue_tasks,
                "completion_rate": round(completion_rate, 1),
                "status": project.get("status", "Active")
            })
        
        # === USER WORKLOAD DISTRIBUTION ===
        user_workload = []
        for usr in all_users:
            if usr.get("role") in ["admin", "member"]:
                user_id_str = str(usr["_id"])
                assigned_tasks = [t for t in all_tasks if t.get("assignee_id") == user_id_str]
                active_tasks = [t for t in assigned_tasks if t.get("status") not in ["Done", "Closed"]]
                
                user_workload.append({
                    "name": usr.get("name", "Unknown"),
                    "role": usr.get("role", "member"),
                    "total_tasks": len(assigned_tasks),
                    "active_tasks": len(active_tasks),
                    "completed_tasks": len(assigned_tasks) - len(active_tasks)
                })
        
        # Sort by active tasks descending
        user_workload.sort(key=lambda x: x["active_tasks"], reverse=True)
        user_workload = user_workload[:15]  # Top 15 users
        
        # === TASK COMPLETION TRENDS (Last 7 days) ===
        completion_trend = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Count tasks closed on this day (would need updated_at or closed_at field)
            # For now, approximate
            completed_count = 0
            
            completion_trend.append({
                "date": day.strftime("%b %d"),
                "completed": completed_count
            })
        
        # === SYSTEM HEALTH INDICATORS ===
        total_overdue = 0
        for task in all_tasks:
            if task.get("status") not in ["Done", "Closed"] and task.get("due_date"):
                due_date = task.get("due_date")
                if isinstance(due_date, str):
                    try:
                        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    except:
                        continue
                if due_date < now:
                    total_overdue += 1
        
        system_health = {
            "overall_completion_rate": round((task_stats["closed"] / task_stats["total"] * 100) if task_stats["total"] > 0 else 0, 1),
            "overdue_tasks": total_overdue,
            "active_projects": project_stats["active"],
            "total_users": user_stats["total"]
        }
        
        # Prepare response
        analytics = {
            "user_stats": user_stats,
            "project_stats": project_stats,
            "task_stats": task_stats,
            "status_distribution": status_distribution,
            "priority_distribution": priority_distribution,
            "project_user_distribution": project_user_distribution,
            "project_health": project_health,
            "user_workload": user_workload,
            "completion_trend": completion_trend,
            "system_health": system_health
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
        print(f"Error in get_system_analytics: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "status": 500,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps({"success": False, "error": str(e)})
        }
