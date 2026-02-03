from database import db
from utils.response import success_response, error_response
from models.user import User
from middleware.role_middleware import check_super_admin
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

