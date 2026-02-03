import json
from models.project import Project
from models.user import User
from utils.response import success_response, error_response
from datetime import datetime, timezone

def add_project_member(body_str, project_id, user_id):
    """Add a member to project by email - only owner can add"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)
    
    email = data.get("email", "").strip().lower()
    if not email:
        return error_response("Email is required", 400)
    
    # Check if project exists and user is owner
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)
    
    if project["user_id"] != user_id:
        return error_response("Only project owner can add members", 403)
    
    # Find user by email
    member_user = User.find_by_email(email)
    if not member_user:
        return error_response(f"No user found with email: {email}", 404)
    
    # Prevent adding super-admin to project teams
    if member_user.get("role") == "super-admin":
        return error_response("Super Admin cannot be added to project teams. Super Admin manages all users and has system-wide access.", 403)
    
    member_user_id = str(member_user["_id"])
    
    # Don't add owner as member
    if member_user_id == user_id:
        return error_response("Project owner is automatically a member", 400)
    
    # Check if already a member
    if any(m["user_id"] == member_user_id for m in project.get("members", [])):
        return error_response("User is already a member of this project", 400)
    
    # Add member
    member_data = {
        "user_id": member_user_id,
        "email": member_user["email"],
        "name": member_user["name"],
        "added_at": datetime.now(timezone.utc).replace(tzinfo=None).isoformat()
    }
    
    success = Project.add_member(project_id, member_data)
    
    if success:
        return success_response({
            "message": f"{member_user['name']} added to project successfully",
            "member": member_data
        })
    else:
        return error_response("Failed to add member", 500)


def get_project_members(project_id, user_id):
    """Get all members of a project including the owner"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)
    
    # Only project members or owner can view members
    if not Project.is_member(project_id, user_id):
        return error_response("Access denied. You are not a member of this project.", 403)
    
    # Get owner info
    owner = User.find_by_id(project["user_id"])
    owner_info = {
        "user_id": project["user_id"],
        "name": owner["name"] if owner else "Unknown",
        "email": owner["email"] if owner else "",
        "role": "Owner",
        "is_owner": True,
        "added_at": project.get("created_at", datetime.now(timezone.utc).replace(tzinfo=None)).isoformat() if isinstance(project.get("created_at"), datetime) else project.get("created_at", datetime.now(timezone.utc).replace(tzinfo=None).isoformat())
    }
    
    # Get members list
    members_list = [
        {
            **member,
            "role": "Member",
            "is_owner": False
        }
        for member in project.get("members", [])
    ]
    
    # Include owner in the members list
    all_members = [owner_info] + members_list
    
    return success_response({
        "members": all_members,
        "owner": owner_info,
        "total": len(all_members)
    })


def remove_project_member(project_id, member_user_id, user_id):
    """Remove a member from project - only owner can remove"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)
    
    if project["user_id"] != user_id:
        return error_response("Only project owner can remove members", 403)
    
    # Can't remove owner
    if member_user_id == user_id:
        return error_response("Cannot remove project owner", 400)
    
    # First, unassign all tasks assigned to this member
    from models.task import Task
    Task.unassign_user_tasks(project_id, member_user_id)
    
    # Then remove the member from the project
    success = Project.remove_member(project_id, member_user_id)
    
    if success:
        return success_response({
            "message": "Member removed from project successfully"
        })
    else:
        return error_response("Failed to remove member or member not found", 400)
