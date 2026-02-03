from database import projects
from bson import ObjectId
from datetime import datetime, timezone
from utils.ticket_utils import generate_project_prefix

class Project:
    @staticmethod
    def create(project_data):
        """Create a new project with user_id, name, description, and created_at"""
        # Generate project prefix from name
        prefix = generate_project_prefix(project_data.get("name", ""))
        
        project = {
            "name": project_data.get("name"),
            "prefix": prefix,  # Store project prefix for ticket IDs
            "description": project_data.get("description", ""),
            "user_id": project_data.get("user_id"),  # Owner of the project
            "members": [],  # Project members who can be assigned tasks
            "created_at": datetime.now(timezone.utc).replace(tzinfo=None),
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
        }
        result = projects.insert_one(project)
        project["_id"] = result.inserted_id
        return project

    @staticmethod
    def find_by_id(project_id):
        """Find project by ID"""
        try:
            return projects.find_one({"_id": ObjectId(project_id)})
        except:
            return None

    @staticmethod
    def find_by_user(user_id):
        """Get all projects created by a specific user"""
        return list(projects.find({"user_id": user_id}).sort("created_at", -1))

    @staticmethod
    def find_by_user_or_member(user_id):
        """Get all projects where user is owner or member"""
        # Find projects where user is owner OR in members list
        return list(projects.find({
            "$or": [
                {"user_id": user_id},
                {"members.user_id": user_id}
            ]
        }).sort("created_at", -1))

    @staticmethod
    def update(project_id, update_data):
        """Update project details"""
        update_data["updated_at"] = datetime.now(timezone.utc).replace(tzinfo=None)
        result = projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0

    @staticmethod
    def delete(project_id):
        """Delete a project"""
        result = projects.delete_one({"_id": ObjectId(project_id)})
        return result.deleted_count > 0

    @staticmethod
    def get_all():
        """Get all projects (admin view or shared projects)"""
        return list(projects.find().sort("created_at", -1))
    
    @staticmethod
    def add_member(project_id, member_data):
        """Add a member to project"""
        result = projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$addToSet": {"members": member_data}}
        )
        return result.modified_count > 0
    
    @staticmethod
    def remove_member(project_id, user_id):
        """Remove a member from project"""
        result = projects.update_one(
            {"_id": ObjectId(project_id)},
            {"$pull": {"members": {"user_id": user_id}}}
        )
        return result.modified_count > 0
    
    @staticmethod
    def is_member(project_id, user_id):
        """Check if user is a member or owner of the project"""
        project = projects.find_one({"_id": ObjectId(project_id)})
        if not project:
            return False
        # Owner is automatically a member
        if project["user_id"] == user_id:
            return True
        # Check if user is in members list
        return any(member["user_id"] == user_id for member in project.get("members", []))
    
    @staticmethod
    def find_by_repo_url(repo_url):
        """Find project by GitHub repository URL"""
        if not repo_url:
            return None
        # Normalize URLs for comparison
        normalized_url = repo_url.strip().rstrip('/').replace('.git', '')
        return projects.find_one({"git_repo_url": {"$regex": normalized_url, "$options": "i"}})
