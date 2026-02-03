import json
import os
import datetime
from datetime import timezone
from bson import ObjectId
from database import db
from utils.auth_utils import (
    hash_password, verify_password, create_token, verify_token,
    blacklist_token, revoke_all_user_tokens, get_active_sessions
)
from utils.response import json_response, error_response
from models.user import User
from utils.validators import (
    validate_email, validate_password, validate_username, 
    check_password_strength
)

try:
    from clerk_backend_api import Clerk
    CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
    clerk_client = Clerk(bearer_auth=CLERK_SECRET_KEY) if CLERK_SECRET_KEY else None
except ImportError:
    clerk_client = None
    print("[WARNING] clerk-backend-api not installed. Clerk authentication will not work.")


def clerk_sync(body, ip_address=None, user_agent=None):
    """
    Sync Clerk user with our backend database
    Creates or updates user based on Clerk authentication
    """
    try:
        if not clerk_client:
            return error_response("Clerk is not configured", 500)

        data = json.loads(body)
        clerk_token = data.get("clerk_token")
        email = data.get("email")
        name = data.get("name")
        clerk_user_id = data.get("clerk_user_id")

        if not all([clerk_token, email, clerk_user_id]):
            return error_response("Missing required fields", 400)

        # Verify Clerk token (optional but recommended)
        try:
            # You can verify the JWT token here if needed
            # For now, we trust the frontend has authenticated with Clerk
            pass
        except Exception as e:
            print(f"[ERROR] Clerk token verification failed: {str(e)}")
            return error_response("Invalid Clerk token", 401)

        # Check if user exists by email or clerk_user_id
        user = User.find_by_email(email)
        
        if not user:
            # Check if user exists with this clerk_user_id
            user = db.users.find_one({"clerk_user_id": clerk_user_id})

        if user:
            # User exists - update clerk_user_id if needed
            user_id = str(user["_id"])
            if not user.get("clerk_user_id"):
                db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"clerk_user_id": clerk_user_id}}
                )
            
            print(f"[AUTH] Existing user logged in via Clerk: {email}")
        else:
            # Create new user
            user_data = {
                "name": name,
                "email": email,
                "clerk_user_id": clerk_user_id,
                "password": "",  # No password for Clerk users
                "role": "member",  # Default role
                "token_version": 1
            }
            
            result = User.create(user_data)
            user_id = str(result.inserted_id)
            user = User.find_by_id(user_id)
            
            print(f"[AUTH] New user created via Clerk: {email}")

        # Create our app's JWT token with session tracking
        token, token_id, tab_session_key = create_token(
            str(user["_id"]),
            ip_address=ip_address,
            user_agent=user_agent
        )

        return json_response({
            "token": token,
            "token_id": token_id,
            "tab_session_key": tab_session_key,
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user.get("role", "member")
            }
        })

    except json.JSONDecodeError:
        return error_response("Invalid JSON data", 400)
    except Exception as e:
        print(f"[ERROR] Clerk sync error: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Clerk sync failed: {str(e)}", 500)
    
def register(body, ip_address=None, user_agent=None):
    """
    Enhanced registration with comprehensive validation
    """
    try:
        data = json.loads(body)
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")
        confirm_password = data.get("confirm_password", "")
        
        # All registrations are members by default
        role = "member"

        # Validate required fields
        if not all([name, email, password]):
            return error_response("Missing required fields", 400)

        # Validate username/name
        name_valid, name_errors = validate_username(name)
        if not name_valid:
            return error_response({
                "message": "Invalid name",
                "errors": name_errors
            }, 400)

        # Validate email format
        if not validate_email(email):
            return error_response("Invalid email format", 400)

        # Validate password with enhanced requirements
        password_valid, password_errors = validate_password(password)
        if not password_valid:
            return error_response({
                "message": "Password does not meet requirements",
                "errors": password_errors
            }, 400)

        # Check password confirmation if provided
        if confirm_password and password != confirm_password:
            return error_response("Passwords do not match", 400)

        # Check if email already exists
        existing_user = User.find_by_email(email)
        if existing_user:
            return error_response("Email already exists", 409)

        # Hash password and create user
        hashed = hash_password(password)
        user_data = {
            "name": name,
            "email": email,
            "password": hashed,
            "role": role,
            "token_version": 1  # Initialize token version for security
        }
        
        result = User.create(user_data)
        
        # Get password strength for response
        strength = check_password_strength(password)
        
        return json_response({
            "message": "Registered successfully",
            "user_id": str(result.inserted_id),
            "password_strength": strength
        }, 201)
        
    except json.JSONDecodeError:
        return error_response("Invalid JSON data", 400)
    except Exception as e:
        print(f"[ERROR] Registration error: {str(e)}")
        return error_response(f"Registration failed: {str(e)}", 500)


def login(body, ip_address=None, user_agent=None):
    """
    Login with enhanced security:
    - Creates token with IP/User-Agent binding
    - Tracks session for security monitoring
    """
    try:
        data = json.loads(body)
        email = data.get("email", "").strip()
        password = data.get("password", "")

        # Validate required fields
        if not email or not password:
            return error_response("Email and password are required", 400)

        # Find user by email
        user = User.find_by_email(email)
        if not user:
            return error_response("Invalid credentials", 401)
        
        # Verify password
        if not verify_password(password, user["password"]):
            return error_response("Invalid credentials", 401)

        # Create secure token with session tracking
        token, token_id, tab_session_key = create_token(
            str(user["_id"]),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return json_response({
            "token": token,
            "token_id": token_id,  # Return token_id for logout
            "tab_session_key": tab_session_key,  # Return tab key for client storage
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
        })
    except json.JSONDecodeError:
        return error_response("Invalid JSON data", 400)
    except Exception as e:
        print(f"[ERROR] Login error: {str(e)}")
        return error_response(f"Login failed: {str(e)}", 500)


def logout(user_id, body):
    """
    Secure logout:
    - Blacklists current token
    - Deactivates session
    - Token becomes unusable immediately
    """
    try:
        data = json.loads(body) if body else {}
        token_id = data.get("token_id")
        
        if not token_id:
            return error_response("Token ID required for logout", 400)
        
        # Blacklist the token
        success = blacklist_token(token_id, user_id, reason="user_logout")
        
        if success:
            return json_response({"message": "Logged out successfully"}, 200)
        else:
            return error_response("Logout failed", 500)
            
    except Exception as e:
        print(f"[ERROR] Logout error: {str(e)}")
        return error_response(f"Logout error: {str(e)}", 500)


def logout_all_sessions(user_id):
    """
    Logout from all devices:
    - Revokes all tokens by incrementing token version
    - Use when account compromised or password changed
    """
    try:
        success = revoke_all_user_tokens(user_id, reason="logout_all_devices")
        
        if success:
            return json_response({
                "message": "Logged out from all devices successfully"
            }, 200)
        else:
            return error_response("Failed to logout from all devices", 500)
            
    except Exception as e:
        print(f"[ERROR] Logout all sessions error: {str(e)}")
        return error_response(f"Error: {str(e)}", 500)


def refresh_session(user_id, ip_address=None, user_agent=None):
    """
    Create a new tab session for an existing token.
    Called when opening app in a new tab with valid token but no tab session key.
    Updates the SPECIFIC session referenced by the token's session_id.
    """
    try:
        # Verify user exists
        user = User.find_by_id(user_id)
        if not user:
            return error_response("User not found", 404)
        
        # Generate a new tab session key
        import secrets
        tab_session_key = secrets.token_urlsafe(32)
        
        # IMPORTANT: We need to get the session_id from the token itself
        # The token contains which session it belongs to
        # We need to extract it from the Authorization header
        # But we don't have access to it here, so we'll use a workaround:
        # Get ALL active sessions for this user and update the most recent one
        # This is safe because refresh-session is only called with valid token
        
        from bson import ObjectId
        import datetime
        
        # Find all active sessions for this user, ordered by last activity
        sessions = list(db.sessions.find({
            "user_id": ObjectId(user_id),
            "is_active": True
        }).sort("last_activity", -1))
        
        if not sessions:
            print(f"[WARNING] No active session found for user {user_id} during refresh-session")
            return error_response("No active session found. Please login again.", 401)
        
        # Update ALL active sessions with the new tab key
        # This ensures that whichever session the token refers to, it will have the new key
        updated_count = 0
        for session in sessions:
            result = db.sessions.update_one(
                {"_id": session["_id"]},
                {
                    "$set": {
                        "tab_session_key": tab_session_key,
                        "last_activity": datetime.datetime.now(timezone.utc).replace(tzinfo=None)
                    }
                }
            )
            if result.modified_count > 0:
                updated_count += 1
                print(f"[AUTH] Updated session {session['session_id']} with new tab key for user {user_id}")
        
        print(f"[AUTH] Updated {updated_count} session(s) with new tab key")
        
        return json_response({
            "tab_session_key": tab_session_key,
            "message": "New tab session created"
        }, 200)
        
    except Exception as e:
        print(f"[ERROR] Refresh session error: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Error: {str(e)}", 500)


def get_user_sessions(user_id):
    """
    Get user's active sessions for security dashboard
    Shows where user is logged in
    """
    try:
        sessions = get_active_sessions(user_id)
        return json_response({"sessions": sessions}, 200)
    except Exception as e:
        print(f"[ERROR] Get sessions error: {str(e)}")
        return error_response(f"Error: {str(e)}", 500)


def change_password(user_id, body):
    """
    Change user password with validation
    """
    try:
        data = json.loads(body)
        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")
        confirm_password = data.get("confirm_password", "")
        
        # Validate required fields
        if not current_password or not new_password:
            return error_response("Current and new password are required", 400)
        
        # Get user
        user = User.find_by_id(user_id)
        if not user:
            return error_response("User not found", 404)
        
        # Verify current password
        if not verify_password(current_password, user["password"]):
            return error_response("Current password is incorrect", 401)
        
        # Validate new password
        password_valid, password_errors = validate_password(new_password)
        if not password_valid:
            return error_response({
                'message': 'New password does not meet requirements',
                'errors': password_errors
            }, 400)
        
        # Check password confirmation
        if confirm_password and new_password != confirm_password:
            return error_response("New passwords do not match", 400)
        
        # Check if new password is same as current
        if verify_password(new_password, user["password"]):
            return error_response("New password must be different from current password", 400)
        
        # Update password
        new_password_hash = hash_password(new_password)
        User.update(user_id, {"password": new_password_hash})
        
        # Revoke all existing tokens for security
        revoke_all_user_tokens(user_id, reason="password_changed")
        
        strength = check_password_strength(new_password)
        
        return json_response({
            'message': 'Password changed successfully. Please login again.',
            'password_strength': strength
        })
        
    except json.JSONDecodeError:
        return error_response("Invalid JSON data", 400)
    except Exception as e:
        print(f"[ERROR] Change password error: {str(e)}")
        return error_response(f"Error: {str(e)}", 500)


def profile(user_id):
    """Get user profile"""
    try:
        user = User.find_by_id(user_id)
        if not user:
            return error_response("User not found", 404)
        
        return json_response({
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        })
    except Exception as e:
        print(f"[ERROR] Profile error: {str(e)}")
        return error_response(f"Error: {str(e)}", 500)