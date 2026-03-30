from database import db
from utils.response import success_response, error_response
from models.user import User
from models.project import Project
from middleware.role_middleware import check_super_admin
from bson import ObjectId
import json

def search_users_by_email(email_query):
    """Search users by email (for adding to project team)"""
    try:
        if not email_query or len(email_query.strip()) < 2:
            return error_response("Please enter at least 2 characters to search", 400)
        
        # Search for users whose email contains the query (case-insensitive)
        users = list(db.users.find(
            {"email": {"$regex": email_query, "$options": "i"}},
            {"_id": 1, "name": 1, "email": 1, "role": 1}
        ).limit(10))
        
        # Convert ObjectId to string
        for user in users:
            user["_id"] = str(user["_id"])
            user["role"] = user.get("role", "member")
        
        return success_response({"users": users}, 200)
    except Exception as e:
        return error_response(f"Error searching users: {str(e)}", 500)

def get_all_users(user_id):
    """Get all users - accessible by admins and super-admins"""
    requesting_user = User.find_by_id(user_id)
    if not requesting_user:
        return error_response("User not found", 404)
    
    user_role = requesting_user.get("role", "member")
    if user_role not in ["admin", "super-admin"]:
        return error_response("Access denied. Admin privileges required.", 403)
    
    users_list = User.get_all_users()
    users_data = []
    for user in users_list:
        users_data.append({
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "member")
        })
    
    return success_response({"users": users_data}, 200)


def get_user_management_data(user_id):
    """Get all users with project/team mapping (super-admin only)."""
    if not check_super_admin(user_id):
        return error_response("Access denied. Super-admin privileges required.", 403)

    users_list = User.get_all_users()
    projects_list = list(db.projects.find({}, {"name": 1, "user_id": 1, "members": 1}))

    rows = []
    for usr in users_list:
        uid = str(usr.get("_id"))
        user_projects = []

        for project in projects_list:
            owner_id = project.get("user_id")
            member_ids = [m.get("user_id") for m in project.get("members", [])]
            if owner_id == uid or uid in member_ids:
                user_projects.append(project.get("name", "Untitled"))

        rows.append({
            "id": uid,
            "name": usr.get("name", ""),
            "email": usr.get("email", ""),
            "role": usr.get("role", "member"),
            "projects": sorted(list(set(user_projects))),
        })

    return success_response({"users": rows}, 200)

def update_user_role(user_id, body):
    """Update user role - only super-admin can do this"""
    if not check_super_admin(user_id):
        return error_response("Access denied. Super-admin privileges required.", 403)
    
    data = json.loads(body)
    target_user_id = data.get("user_id")
    new_role = data.get("role")
    
    if not target_user_id or not new_role:
        return error_response("Missing user_id or role", 400)
    
    if new_role not in ["member", "admin", "super-admin"]:
        return error_response("Invalid role. Must be: member, admin, or super-admin", 400)
    
    # Prevent promoting to super-admin
    if new_role == "super-admin":
        return error_response("Cannot promote users to super-admin", 403)
    
    target_user = User.find_by_id(target_user_id)
    if not target_user:
        return error_response("Target user not found", 404)
    
    # Prevent modifying yourself
    if target_user_id == str(user_id):
        return error_response("Cannot change your own role", 400)
    
    # Prevent modifying super-admin roles
    if target_user.get("role") == "super-admin":
        return error_response("Cannot modify super-admin roles", 403)
    
    User.update_role(target_user_id, new_role)
    
    return success_response({
        "message": f"User role updated to {new_role}",
        "user": {
            "id": target_user_id,
            "name": target_user["name"],
            "role": new_role
        }
    }, 200)


def delete_user(requesting_user_id, target_user_id, confirmation_text):
    """Delete user (super-admin only) with explicit confirmation text."""
    if not check_super_admin(requesting_user_id):
        return error_response("Access denied. Super-admin privileges required.", 403)

    if confirmation_text != "DELETE":
        return error_response("Invalid confirmation text. Type DELETE to continue.", 400)

    if requesting_user_id == target_user_id:
        return error_response("Cannot delete your own account.", 400)

    target_user = User.find_by_id(target_user_id)
    if not target_user:
        return error_response("Target user not found", 404)

    if target_user.get("role") == "super-admin":
        return error_response("Cannot delete super-admin users.", 403)

    # Remove this user from all project member lists.
    db.projects.update_many({}, {"$pull": {"members": {"user_id": target_user_id}}})

    # Deactivate user sessions and blacklist entries cleanup.
    db.sessions.update_many(
        {"user_id": ObjectId(target_user_id), "is_active": True},
        {"$set": {"is_active": False, "end_reason": "user_deleted"}}
    )

    db.token_blacklist.delete_many({"user_id": ObjectId(target_user_id)})

    result = User.delete_by_id(target_user_id)
    if result.deleted_count == 0:
        return error_response("Failed to delete user", 500)

    return success_response({
        "message": f"User {target_user.get('name', '')} deleted successfully",
        "deleted_user_id": target_user_id
    }, 200)


def get_admin_projects(admin_user_id, requesting_user_id):
    """Get projects owned by a specific admin, including project members (super-admin only)."""
    if not check_super_admin(requesting_user_id):
        return error_response("Access denied. Super-admin privileges required.", 403)

    admin_user = User.find_by_id(admin_user_id)
    if not admin_user:
        return error_response("Admin user not found", 404)

    if admin_user.get("role") != "admin":
        return error_response("Selected user is not an admin", 400)

    projects_list = Project.find_by_user(admin_user_id)
    project_cards = []

    for project in projects_list:
        members = project.get("members", [])
        project_cards.append({
            "id": str(project.get("_id")),
            "name": project.get("name", "Untitled Project"),
            "description": project.get("description", ""),
            "owner_id": project.get("user_id"),
            "members": members,
            "member_count": len(members),
            "created_at": project.get("created_at").isoformat() if project.get("created_at") else None,
            "updated_at": project.get("updated_at").isoformat() if project.get("updated_at") else None,
        })

    return success_response({
        "admin": {
            "id": str(admin_user.get("_id")),
            "name": admin_user.get("name", ""),
            "email": admin_user.get("email", ""),
            "role": admin_user.get("role", "admin"),
        },
        "projects": project_cards,
        "count": len(project_cards)
    }, 200)

