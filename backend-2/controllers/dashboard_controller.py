"""
Dashboard Controller - Analytics and Reports (FIXED: Timezone Safe)
"""

import json
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from utils.auth_utils import verify_token
from database import db


# ✅ NEW: Central datetime normalizer
def normalize_datetime(dt):
    """
    Ensure datetime is timezone-aware (UTC)
    Handles:
    - naive datetime (Mongo)
    - ISO string
    - already aware datetime
    """
    if not dt:
        return None

    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except:
            return None

    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    return None


def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def convert_dates_to_strings(data):
    """
    Recursively convert:
    - datetime → ISO string
    - ObjectId → string
    """
    if isinstance(data, dict):
        return {key: convert_dates_to_strings(value) for key, value in data.items()}

    elif isinstance(data, list):
        return [convert_dates_to_strings(item) for item in data]

    elif isinstance(data, datetime):
        return data.isoformat()

    elif isinstance(data, ObjectId):
        return str(data)

    else:
        return data


# =========================================
# 🔹 DASHBOARD ANALYTICS
# =========================================
def get_dashboard_analytics(user_id):
    try:
        if not user_id:
            return {
                "success": False,
                "status": 401,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "Authentication required"}),
            }

        from models.user import User

        user = User.find_by_id(user_id)
        if not user:
            return {
                "success": False,
                "status": 404,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "User not found"}),
            }

        projects_collection = db["projects"]
        tasks_collection = db["tasks"]

        user_projects = list(
            projects_collection.find(
                {
                    "$or": [
                        {"user_id": user_id},
                        {"members": {"$elemMatch": {"user_id": user_id}}},
                    ]
                },
                {"_id": 1, "name": 1, "status": 1, "user_id": 1},
            )
        )

        project_ids = [p["_id"] for p in user_projects]
        project_ids_str = [str(pid) for pid in project_ids]

        print(f"[DASHBOARD] Found {len(user_projects)} projects")

        my_tasks = list(
            tasks_collection.aggregate(
                [
                    {"$match": {"assignee_id": user_id}},
                    {
                        "$project": {
                            "_id": 1,
                            "status": 1,
                            "priority": 1,
                            "due_date": 1,
                            "project_id": 1,
                            "title": 1,
                            "updated_at": 1,
                        }
                    },
                ]
            )
        )

        print(f"[DASHBOARD] Found {len(my_tasks)} tasks assigned to user")

        # ✅ ALWAYS UTC AWARE
        now = datetime.now(timezone.utc)

        overdue_count = 0
        pending_count = 0
        in_progress_count = 0
        done_count = 0
        closed_count = 0

        for task in my_tasks:
            status = task.get("status")

            if status == "In Progress":
                in_progress_count += 1
            elif status == "Done":
                done_count += 1
            elif status == "Closed":
                closed_count += 1

            if status not in ["Done", "Closed"]:
                pending_count += 1

                due_date = normalize_datetime(task.get("due_date"))

                if due_date and due_date < now:
                    overdue_count += 1

        task_stats = {
            "total": len(my_tasks),
            "pending": pending_count,
            "in_progress": in_progress_count,
            "done": done_count,
            "closed": closed_count,
            "overdue": overdue_count,
        }

        owned_count = sum(1 for p in user_projects if p.get("user_id") == user_id)
        member_count = len(user_projects) - owned_count
        active_count = sum(1 for p in user_projects if p.get("status") == "Active")
        completed_count = sum(
            1 for p in user_projects if p.get("status") == "Completed"
        )

        project_stats = {
            "total": len(user_projects),
            "owned": owned_count,
            "member_of": member_count,
            "active": active_count,
            "completed": completed_count,
        }

        priority_distribution = {"High": 0, "Medium": 0, "Low": 0}
        status_distribution = {"To Do": 0, "In Progress": 0, "Done": 0, "Closed": 0}

        for task in my_tasks:
            status = task.get("status", "To Do")

            if status not in ["Done", "Closed"]:
                priority = task.get("priority", "Low")
                if priority in priority_distribution:
                    priority_distribution[priority] += 1

            if status in status_distribution:
                status_distribution[status] += 1

        # ✅ Upcoming deadlines
        end_of_week = now + timedelta(days=7)
        upcoming_deadlines = []
        # =========================================
        # 🔥 PROJECT PROGRESS (FIXED)
        # =========================================
        project_progress = []

        # Use ObjectId list (NOT string)
        if project_ids:
            progress_pipeline = [
                {
                    "$match": {
                        "$or": [
                            {"project_id": {"$in": project_ids}},  # ObjectId match
                            {"project_id": {"$in": [str(pid) for pid in project_ids]}},  # fallback if stored as string
                        ]
                    }
                },
                {
                    "$group": {
                        "_id": "$project_id",
                        "total": {"$sum": 1},
                        "closed": {
                            "$sum": {"$cond": [{"$eq": ["$status", "Closed"]}, 1, 0]}
                        },
                    }
                },
            ]

            progress_results = list(tasks_collection.aggregate(progress_pipeline))

            # ⚠️ IMPORTANT: fix project_map for ObjectId
            project_map_obj = {p["_id"]: p.get("name", "Unknown") for p in user_projects}

            for result in progress_results:
                pid = result["_id"]

                # normalize for lookup
                if isinstance(pid, str):
                    try:
                        pid_lookup = ObjectId(pid)
                    except:
                        pid_lookup = pid
                else:
                    pid_lookup = pid

                total = result["total"]
                closed = result["closed"]

                progress_percentage = (closed / total * 100) if total > 0 else 0

                project_progress.append(
                    {
                        "project_id": str(pid),
                        "project_name": project_map_obj.get(pid_lookup, "Unknown"),
                        "total_tasks": total,
                        "completed_tasks": closed,
                        "progress_percentage": round(progress_percentage, 1),
                    }
                )

        # Sort and limit
        project_progress.sort(key=lambda x: x["progress_percentage"], reverse=True)
        project_progress = project_progress[:10]

        print(f"[DASHBOARD] Project progress calculated: {len(project_progress)}")

        project_map = {str(p["_id"]): p.get("name", "Unknown") for p in user_projects}

        for task in my_tasks:
            if task.get("status") in ["Done", "Closed"]:
                continue

            due_date = normalize_datetime(task.get("due_date"))
            if not due_date:
                continue

            if due_date <= end_of_week:
                upcoming_deadlines.append(
                    {
                        "task_id": str(task["_id"]),
                        "title": task.get("title", ""),
                        "due_date": due_date.isoformat(),
                        "priority": task.get("priority", "Low"),
                        "status": task.get("status", "To Do"),
                        "project_id": str(task.get("project_id", "")),
                        "project_name": project_map.get(
                            str(task.get("project_id")), "Unknown"
                        ),
                        "days_until": (due_date - now).days,
                        "_due_date_obj": due_date,  # for sorting
                    }
                )

        # ✅ Correct sorting
        upcoming_deadlines.sort(key=lambda x: x["_due_date_obj"])
        upcoming_deadlines = upcoming_deadlines[:15]

        # remove temp field
        for t in upcoming_deadlines:
            t.pop("_due_date_obj", None)

        # ✅ Recent activity
        recent_activities = []

        sorted_tasks = sorted(
            my_tasks,
            key=lambda x: normalize_datetime(x.get("updated_at")) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )[:10]

        for task in sorted_tasks:
            updated_at = normalize_datetime(task.get("updated_at"))

            recent_activities.append(
                {
                    "task_id": str(task["_id"]),
                    "title": task.get("title", ""),
                    "status": task.get("status", ""),
                    "priority": task.get("priority", ""),
                    "project_name": project_map.get(
                        str(task.get("project_id")), "Unknown"
                    ),
                    "project_id": str(task.get("project_id", "")),
                    "updated_at": updated_at.isoformat() if updated_at else "",
                }
            )

        analytics = {
            "task_stats": task_stats,
            "project_stats": project_stats,
            "priority_distribution": priority_distribution,
            "status_distribution": status_distribution,
            "upcoming_deadlines": upcoming_deadlines,
            "project_progress":project_progress,
            "recent_activities": recent_activities,
        }

        return {
            "success": True,
            "status": 200,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps({"success": True, "analytics": analytics}),
        }

    except Exception as e:
        print(f"Error in get_dashboard_analytics: {str(e)}")
        import traceback

        traceback.print_exc()

        return {
            "success": False,
            "status": 500,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps(
                {
                    "success": False,
                    "error": f"Failed to fetch dashboard analytics: {str(e)}",
                }
            ),
        }


# =========================================
# 🔹 DOWNLOADABLE REPORT (FIXED)
# =========================================
def get_downloadable_report(user_id):
    try:
        if not user_id:
            return {
                "success": False,
                "status": 401,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "Authentication required"}),
            }

        from models.user import User

        user = User.find_by_id(user_id)
        if not user:
            return {
                "success": False,
                "status": 404,
                "headers": [("Content-Type", "application/json")],
                "body": json.dumps({"success": False, "error": "User not found"}),
            }

        projects_collection = db["projects"]
        tasks_collection = db["tasks"]

        user_projects = list(
            projects_collection.find(
                {
                    "$or": [
                        {"user_id": user_id},
                        {"members": {"$elemMatch": {"user_id": user_id}}},
                    ]
                }
            )
        )

        my_tasks = list(tasks_collection.find({"assignee_id": user_id}))

        report_data = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "projects": convert_dates_to_strings(user_projects),
            "my_tasks": convert_dates_to_strings(my_tasks),
        }

        return {
            "success": True,
            "status": 200,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps({"success": True, "report": report_data}),
        }

    except Exception as e:
        print(f"Error in get_downloadable_report: {str(e)}")
        import traceback

        traceback.print_exc()

        return {
            "success": False,
            "status": 500,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps(
                {"success": False, "error": f"Failed to generate report: {str(e)}"}
            ),
        }


def _parse_controller_body(response_obj):
    """Safely parse standard controller response body payload."""
    body = response_obj.get("body", "{}")
    if isinstance(body, dict):
        return body
    try:
        return json.loads(body)
    except Exception:
        return {}


def get_dashboard_bootstrap(user_id):
    """
    Aggregate dashboard startup data in a single endpoint.
    This reduces client roundtrips on first page load.
    """
    try:
        analytics_response = get_dashboard_analytics(user_id)
        if analytics_response.get("status", 500) >= 400:
            return analytics_response

        report_response = get_downloadable_report(user_id)
        if report_response.get("status", 500) >= 400:
            return report_response

        from controllers import task_controller

        pending_response = task_controller.get_all_pending_approval_tasks(user_id)
        pending_status = pending_response.get("status", 500)
        if pending_status >= 400:
            return pending_response

        closed_response = task_controller.get_all_closed_tasks(user_id)
        closed_status = closed_response.get("status", 500)
        if closed_status >= 400:
            return closed_response

        analytics_body = _parse_controller_body(analytics_response)
        report_body = _parse_controller_body(report_response)
        pending_body = _parse_controller_body(pending_response)
        closed_body = _parse_controller_body(closed_response)

        payload = {
            "success": True,
            "analytics": analytics_body.get("analytics", {}),
            "report": report_body.get("report", {}),
            "pending_approval": {
                "tasks": pending_body.get("tasks", []),
                "count": pending_body.get("count", 0),
                "user_role": pending_body.get("user_role"),
            },
            "closed_tasks": {
                "tasks": closed_body.get("tasks", []),
                "count": closed_body.get("count", 0),
                "user_role": closed_body.get("user_role"),
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

        return {
            "success": True,
            "status": 200,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps(payload),
        }

    except Exception as e:
        print(f"Error in get_dashboard_bootstrap: {str(e)}")
        import traceback

        traceback.print_exc()
        return {
            "success": False,
            "status": 500,
            "headers": [("Content-Type", "application/json")],
            "body": json.dumps(
                {
                    "success": False,
                    "error": f"Failed to fetch dashboard bootstrap: {str(e)}",
                }
            ),
        }