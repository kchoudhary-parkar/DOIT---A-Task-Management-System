from utils.response import error_response
from models.user import User

def require_role(*allowed_roles):
    """
    Decorator to check if user has required role
    Usage: @require_role("admin", "super-admin")
    """
    def decorator(func):
        def wrapper(user_id, *args, **kwargs):
            user = User.find_by_id(user_id)
            if not user:
                return error_response("User not found", 404)
            
            user_role = user.get("role", "member")
            if user_role not in allowed_roles:
                return error_response("Access denied. Insufficient permissions.", 403)
            
            return func(user_id, *args, **kwargs)
        return wrapper
    return decorator

def check_super_admin(user_id):
    """Check if user is super-admin"""
    user = User.find_by_id(user_id)
    if not user:
        return False
    return user.get("role") == "super-admin"

def check_admin_or_super_admin(user_id):
    """Check if user is admin or super-admin"""
    user = User.find_by_id(user_id)
    if not user:
        return False
    return user.get("role") in ["admin", "super-admin"]
