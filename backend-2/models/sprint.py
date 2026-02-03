from database import sprints
from bson import ObjectId
from datetime import datetime, timezone

class Sprint:
    @staticmethod
    def create(sprint_data):
        """Create a new sprint"""
        sprint = {
            "name": sprint_data.get("name"),
            "goal": sprint_data.get("goal", ""),
            "project_id": sprint_data.get("project_id"),
            "start_date": sprint_data.get("start_date"),  # ISO format date string
            "end_date": sprint_data.get("end_date"),  # ISO format date string
            "status": "planned",  # planned, active, completed
            "created_by": sprint_data.get("created_by"),  # User ID of creator
            "completed_at": None,
            "created_at": datetime.now(timezone.utc).replace(tzinfo=None),
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
        }
        result = sprints.insert_one(sprint)
        sprint["_id"] = result.inserted_id
        return sprint

    @staticmethod
    def find_by_id(sprint_id):
        """Find sprint by ID"""
        try:
            return sprints.find_one({"_id": ObjectId(sprint_id)})
        except:
            return None

    @staticmethod
    def find_by_project(project_id):
        """Get all sprints for a project"""
        return list(sprints.find({"project_id": project_id}).sort("created_at", -1))

    @staticmethod
    def find_active_by_project(project_id):
        """Get active sprint for a project"""
        return sprints.find_one({"project_id": project_id, "status": "active"})

    @staticmethod
    def update(sprint_id, update_data):
        """Update sprint details"""
        update_data["updated_at"] = datetime.now(timezone.utc).replace(tzinfo=None)
        result = sprints.update_one(
            {"_id": ObjectId(sprint_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    @staticmethod
    def delete(sprint_id):
        """Delete a sprint"""
        result = sprints.delete_one({"_id": ObjectId(sprint_id)})
        return result.deleted_count > 0

    @staticmethod
    def delete_by_project(project_id):
        """Delete all sprints for a project"""
        result = sprints.delete_many({"project_id": project_id})
        return result.deleted_count

    @staticmethod
    def start_sprint(sprint_id):
        """Start a sprint - make it active"""
        update_data = {
            "status": "active",
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
        }
        result = sprints.update_one(
            {"_id": ObjectId(sprint_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    @staticmethod
    def complete_sprint(sprint_id, total_tasks=0, completed_tasks=0):
        """Complete a sprint and snapshot task counts"""
        update_data = {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).replace(tzinfo=None),
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None),
            "total_tasks_snapshot": total_tasks,
            "completed_tasks_snapshot": completed_tasks
        }
        result = sprints.update_one(
            {"_id": ObjectId(sprint_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
