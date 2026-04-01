import json
from datetime import datetime, timezone
from bson import ObjectId
from database import db
from models.project import Project
from models.user import User
from utils.response import success_response, error_response, datetime_to_iso
from utils.websocket_manager import manager
import asyncio


# ======================================
# UTILITIES
# ======================================

def get_current_iso_time():
    """Get current time in ISO format"""
    return datetime_to_iso(datetime.now(timezone.utc).replace(tzinfo=None))


def verify_channel_access(channel_id: str, user_id: str):
    """Verify if user has access to a channel"""
    try:
        channel = db.chat_channels.find_one({"_id": ObjectId(channel_id)})
        if not channel:
            return {"success": False, "error": "Channel not found"}
        
        if not Project.is_member(channel["project_id"], user_id):
            return {"success": False, "error": "Access denied"}
        
        return {"success": True, "channel": channel}
    except Exception as e:
        return {"success": False, "error": str(e)}


def generate_project_color(prefix: str):
    colors = [
        "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
        "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
    ]
    val = sum(ord(c) for c in prefix) if prefix else 0
    return colors[val % len(colors)]


def generate_user_color(user_id: str):
    colors = [
        "#ec4899", "#8b5cf6", "#f59e0b", "#10b981", "#3b82f6",
        "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
    ]
    val = sum(ord(c) for c in user_id) if user_id else 0
    return colors[val % len(colors)]


# ======================================
# PROJECTS
# ======================================

def get_user_chat_projects(user_id: str):
    import sys
    sys.stdout.flush()
    print("=" * 80, flush=True)
    print(f"[TEAM CHAT] FUNCTION CALLED - user_id: {user_id}", flush=True)
    print("=" * 80, flush=True)
    
    if not user_id:
        print("[TEAM CHAT] ERROR: No user_id", flush=True)
        return error_response("Unauthorized", 401)

    try:
        # EXACT query from working backend
        print(f"[TEAM CHAT] Querying MongoDB for user: {user_id}", flush=True)
        user_projects = list(db.projects.find({
            "$or": [
                {"user_id": user_id},
                {"members.user_id": user_id}
            ]
        }, {
            "_id": 1,
            "name": 1,
            "prefix": 1,
            "user_id": 1
        }).sort("name", 1))

        print(f"[TEAM CHAT] Found {len(user_projects)} projects from MongoDB", flush=True)
        
        if len(user_projects) > 0:
            print(f"[TEAM CHAT] First project: {user_projects[0]}", flush=True)
        else:
            print(f"[TEAM CHAT] WARNING: No projects found for user {user_id}", flush=True)
        
        projects_data = []
        for project in user_projects:
            project_id = str(project["_id"])
            
            # Get channels
            channels = list(db.chat_channels.find(
                {"project_id": project_id},
                {"_id": 1, "name": 1}
            ).sort("name", 1))
            
            # Calculate unread
            total_unread = 0
            for channel in channels:
                channel_id = str(channel["_id"])
                unread_count = db.chat_messages.count_documents({
                    "channel_id": channel_id,
                    "user_id": {"$ne": user_id},
                    "read_by": {"$ne": user_id}
                })
                total_unread += unread_count

            projects_data.append({
                "id": project_id,
                "name": project["name"],
                "color": generate_project_color(project.get("prefix", project["name"])),
                "unread": total_unread,
                "is_owner": project["user_id"] == user_id
            })

        print(f"[TEAM CHAT] Returning {len(projects_data)} projects", flush=True)
        if len(projects_data) > 0:
            print(f"[TEAM CHAT] Sample project: {projects_data[0]}", flush=True)
        
        result = success_response({
            "projects": projects_data,
            "count": len(projects_data)
        })
        print(f"[TEAM CHAT] Response: {result}", flush=True)
        return result
    
    except Exception as e:
        print(f"[TEAM CHAT] EXCEPTION: {str(e)}", flush=True)
        print(f"Error getting user chat projects: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to get projects: {str(e)}", 500)


# ======================================
# CHANNELS
# ======================================

def get_project_channels(project_id: str, user_id: str):
    if not user_id:
        return error_response("Unauthorized", 401)
    
    try:
        if not Project.is_member(project_id, user_id):
            return error_response("Access denied", 403)

        channels = list(db.chat_channels.find(
            {"project_id": project_id},
            {"_id": 1, "name": 1, "description": 1, "created_at": 1}
        ).sort("name", 1))

        channels_data = []
        for ch in channels:
            ch_id = str(ch["_id"])
            unread = db.chat_messages.count_documents({
                "channel_id": ch_id,
                "user_id": {"$ne": user_id},
                "read_by": {"$ne": user_id}
            })

            last_msg = db.chat_messages.find_one(
                {"channel_id": ch_id},
                {"created_at": 1},
                sort=[("created_at", -1)]
            )

            channels_data.append({
                "id": ch_id,
                "name": ch["name"],
                "description": ch.get("description", ""),
                "unread": unread,
                "last_message_at": datetime_to_iso(last_msg["created_at"]) if last_msg else None,
                "created_at": datetime_to_iso(ch["created_at"])            })

        return success_response({
            "channels": channels_data,
            "count": len(channels_data)
        })
    
    except Exception as e:
        print(f"Error getting project channels: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to get channels: {str(e)}", 500)


def create_channel(project_id: str, user_id: str, payload: dict):
    """Create a new chat channel in a project"""
    if not user_id:
        return error_response("Unauthorized", 401)
    
    try:
        # Check if user is project member
        if not Project.is_member(project_id, user_id):
            return error_response("Access denied", 403)
        
        name = payload.get("name", "").strip()
        description = payload.get("description", "").strip()
        
        if not name:
            return error_response("Channel name is required", 400)
        
        # Check if channel with same name already exists in project
        existing = db.chat_channels.find_one({
            "project_id": project_id,
            "name": name
        })
        
        if existing:
            return error_response("Channel with this name already exists", 400)
        
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        channel = {
            "project_id": project_id,
            "name": name,
            "description": description,
            "created_by": user_id,
            "created_at": now,
            "updated_at": now
        }
        
        result = db.chat_channels.insert_one(channel)
        
        return success_response({
            "message": "Channel created successfully",
            "data": {
                "id": str(result.inserted_id),
                "name": name,
                "description": description,
                "created_at": datetime_to_iso(now)
            }
        }, 201)
    
    except Exception as e:
        print(f"Error creating channel: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to create channel: {str(e)}", 500)


def delete_channel(channel_id: str, user_id: str):
    """Delete a chat channel and all its messages"""
    if not user_id:
        return error_response("Unauthorized", 401)
    
    try:
        channel = db.chat_channels.find_one({"_id": ObjectId(channel_id)})
        if not channel:
            return error_response("Channel not found", 404)
        
        # Check if user is project member
        if not Project.is_member(channel["project_id"], user_id):
            return error_response("Access denied", 403)
        
        # Check if user is channel creator or project owner
        project = db.projects.find_one({"_id": ObjectId(channel["project_id"])})
        is_owner = project and str(project.get("user_id")) == user_id
        is_creator = channel.get("created_by") == user_id
        
        if not (is_owner or is_creator):
            return error_response("Only channel creator or project owner can delete channels", 403)
        
        # Delete all messages in the channel
        db.chat_messages.delete_many({"channel_id": channel_id})
        
        # Delete the channel
        db.chat_channels.delete_one({"_id": ObjectId(channel_id)})
        
        return success_response({"message": "Channel deleted successfully"})
    
    except Exception as e:
        print(f"Error deleting channel: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to delete channel: {str(e)}", 500)


# ======================================
# MESSAGES
# ======================================
def get_channel_messages(channel_id: str, user_id: str, query_params=None):
    if not user_id:
        return error_response("Unauthorized", 401)
    
    try:
        channel = db.chat_channels.find_one({"_id": ObjectId(channel_id)})
        if not channel:
            return error_response("Channel not found", 404)

        if not Project.is_member(channel["project_id"], user_id):
            return error_response("Access denied", 403)

        limit = int(query_params.get("limit", 50)) if query_params else 50
        before = query_params.get("before") if query_params else None

        query = {"channel_id": channel_id}
        if before:
            try:
                query["_id"] = {"$lt": ObjectId(before)}
            except:
                pass

        messages = list(db.chat_messages.find(
            query,
            {
                "_id": 1,
                "user_id": 1,
                "text": 1,
                "created_at": 1,
                "updated_at": 1,
                "edited": 1,
                "attachment": 1,
                "reply_to": 1,
                "reactions": 1
            }
        ).sort("created_at", -1).limit(limit))

        # Reverse for chronological order
        messages.reverse()

        # Enrich with user data
        user_ids = list(set([msg["user_id"] for msg in messages]))
        users = list(db.users.find(
            {"_id": {"$in": [ObjectId(uid) for uid in user_ids]}},
            {"_id": 1, "name": 1, "email": 1}
        ))
        user_map = {str(u["_id"]): u for u in users}

        messages_data = []
        for m in messages:
            user_data = user_map.get(m["user_id"], {})
            user_name = user_data.get("name", "Unknown")
            
            name_parts = user_name.split()
            avatar = "".join([part[0].upper() for part in name_parts[:2]]) if name_parts else "U"

            msg_data = {
                "id": str(m["_id"]),
                "user": user_name,
                "userId": m["user_id"],
                "avatar": avatar,
                "time": datetime_to_iso(m["created_at"]),
                "timestamp": datetime_to_iso(m["created_at"]),
                "text": m["text"],
                "color": generate_user_color(m["user_id"]),
                "edited": m.get("edited", False),
                "reactions": m.get("reactions", {})
            }
            
            if "attachment" in m and m["attachment"]:
                msg_data["attachment"] = m["attachment"]
            
            # Include reply_to information
            if "reply_to" in m and m["reply_to"]:
                try:
                    parent_msg = db.chat_messages.find_one(
                        {"_id": ObjectId(m["reply_to"])},
                        {"user_id": 1, "text": 1}
                    )
                    if parent_msg:
                        parent_user = db.users.find_one(
                            {"_id": ObjectId(parent_msg["user_id"])},
                            {"name": 1}
                        )
                        parent_user_name = parent_user.get("name", "Unknown") if parent_user else "Unknown"
                        
                        msg_data["replyTo"] = {
                            "id": m["reply_to"],
                            "userName": parent_user_name,
                            "preview": parent_msg.get("text", "")[:100],
                            "userId": parent_msg["user_id"]
                        }
                except Exception as e:
                    print(f"Error fetching reply_to data: {str(e)}")

            messages_data.append(msg_data)

        # Mark as read
        db.chat_messages.update_many(
            {
                "channel_id": channel_id,
                "user_id": {"$ne": user_id},
                "read_by": {"$ne": user_id}
            },
            {"$addToSet": {"read_by": user_id}}
        )

        return success_response({
            "messages": messages_data,
            "has_more": len(messages) == limit
        })
    
    except Exception as e:
        print(f"Error getting channel messages: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to get messages: {str(e)}", 500)


def send_message(channel_id: str, user_id: str, payload: dict):
    text = payload.get("text", "").strip()
    attachment = payload.get("attachment")
    reply_to = payload.get("reply_to") or payload.get("parent_id")  # Support both field names

    if not text and not attachment:
        return error_response("Message empty", 400)

    channel = db.chat_channels.find_one({"_id": ObjectId(channel_id)})
    if not channel:
        return error_response("Channel not found", 404)

    if not Project.is_member(channel["project_id"], user_id):
        return error_response("Access denied", 403)

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    msg = {
        "channel_id": channel_id,
        "project_id": channel["project_id"],
        "user_id": user_id,
        "text": text,
        "read_by": [user_id],
        "edited": False,
        "created_at": now,
        "updated_at": now,
        "reactions": {}  # Initialize empty reactions
    }

    if attachment:
        msg["attachment"] = attachment
    
    # Handle reply to message
    reply_to_data = None
    if reply_to:
        try:
            parent_msg = db.chat_messages.find_one({"_id": ObjectId(reply_to)})
            if parent_msg:
                msg["reply_to"] = reply_to
                
                # Get parent user info
                parent_user = db.users.find_one(
                    {"_id": ObjectId(parent_msg["user_id"])},
                    {"name": 1}
                )
                parent_user_name = parent_user.get("name", "Unknown") if parent_user else "Unknown"
                
                # Store parent message preview for display
                reply_to_data = {
                    "id": reply_to,
                    "userName": parent_user_name,
                    "preview": parent_msg.get("text", "")[:100],  # First 100 chars
                    "userId": parent_msg["user_id"]
                }
        except Exception as e:
            print(f"Error processing reply_to: {str(e)}")

    res = db.chat_messages.insert_one(msg)
    message_id = str(res.inserted_id)
    
    # Get user info for WebSocket broadcast
    user = db.users.find_one({"_id": ObjectId(user_id)}, {"name": 1, "email": 1})
    user_name = user.get("name", "Unknown") if user else "Unknown"
    name_parts = user_name.split()
    avatar = "".join([part[0].upper() for part in name_parts[:2]]) if name_parts else "U"
    
    # Prepare WebSocket message
    ws_message = {
        "type": "new_message",
        "message": {
            "id": message_id,
            "user": user_name,
            "userId": user_id,
            "avatar": avatar,
            "time": datetime_to_iso(now),
            "timestamp": datetime_to_iso(now),
            "text": text,
            "color": generate_user_color(user_id),
            "edited": False,
            "reactions": {}
        }
    }
    
    if attachment:
        ws_message["message"]["attachment"] = attachment
    
    if reply_to_data:
        ws_message["message"]["replyTo"] = reply_to_data
    
    # Broadcast to WebSocket connections (don't await, run in background)
    asyncio.create_task(manager.broadcast_to_channel(ws_message, channel_id))

    return success_response({
        "message": "Message sent",
        "data": {
            "id": message_id,
            "text": text,
            "time": datetime_to_iso(now),
            "color": generate_user_color(user_id)
        }
    }, 201)


def edit_message(channel_id, message_id, user_id, payload):
    text = payload.get("text", "").strip()

    msg = db.chat_messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        return error_response("Message not found", 404)

    if msg["user_id"] != user_id:
        return error_response("Forbidden", 403)

    db.chat_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"text": text, "edited": True}}
    )
    
    # Broadcast edit via WebSocket
    asyncio.create_task(manager.broadcast_to_channel({
        "type": "message_edited",
        "message_id": message_id,
        "text": text,
        "edited": True,
        "timestamp": get_current_iso_time()
    }, channel_id))

    return success_response({"message": "Message updated"})


def delete_message(channel_id, message_id, user_id):
    msg = db.chat_messages.find_one({"_id": ObjectId(message_id)})
    if not msg:
        return error_response("Message not found", 404)

    if msg["user_id"] != user_id:
        return error_response("Forbidden", 403)

    db.chat_messages.delete_one({"_id": ObjectId(message_id)})
    
    # Broadcast deletion via WebSocket
    asyncio.create_task(manager.broadcast_to_channel({
        "type": "message_deleted",
        "message_id": message_id,
        "timestamp": get_current_iso_time()
    }, channel_id))
    
    return success_response({"message": "Message deleted"})


# ======================================
# REACTIONS
# ======================================

def add_reaction(channel_id: str, message_id: str, user_id: str, payload: dict):
    """Add or toggle reaction to a message"""
    if not user_id:
        return error_response("Unauthorized", 401)
    
    try:
        emoji = payload.get("emoji", "").strip()
        if not emoji:
            return error_response("Emoji is required", 400)
        
        # Get message
        msg = db.chat_messages.find_one({"_id": ObjectId(message_id)})
        if not msg:
            return error_response("Message not found", 404)
        
        # Check channel access
        channel = db.chat_channels.find_one({"_id": ObjectId(channel_id)})
        if not channel or not Project.is_member(channel["project_id"], user_id):
            return error_response("Access denied", 403)
        
        # Get or initialize reactions
        reactions = msg.get("reactions", {})
        
        # Check if user already reacted with this emoji
        if emoji in reactions:
            if user_id in reactions[emoji]:
                # Remove reaction (toggle off)
                reactions[emoji].remove(user_id)
                if len(reactions[emoji]) == 0:
                    del reactions[emoji]
                action = "removed"
            else:
                # Add reaction
                reactions[emoji].append(user_id)
                action = "added"
        else:
            # First reaction with this emoji
            reactions[emoji] = [user_id]
            action = "added"
        
        # Update message
        db.chat_messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"reactions": reactions}}
        )
        
        # Broadcast reaction via WebSocket
        asyncio.create_task(manager.broadcast_to_channel({
            "type": "reaction_updated",
            "message_id": message_id,
            "reactions": reactions,
            "user_id": user_id,
            "emoji": emoji,
            "action": action,
            "timestamp": get_current_iso_time()
        }, channel_id))
        
        return success_response({
            "message": f"Reaction {action}",
            "reactions": reactions
        })
        
    except Exception as e:
        print(f"Error adding reaction: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to add reaction: {str(e)}", 500)


# ======================================
# THREADS & UPLOAD
# ======================================

def post_thread_reply(channel_id, message_id, user_id, payload):
    payload["reply_to"] = message_id
    return send_message(channel_id, user_id, payload)


async def upload_attachment(file, user_id):
    """Upload file attachment and return metadata"""
    import os
    from pathlib import Path
    
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("uploads/chat_attachments")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = upload_dir / filename
        
        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Determine file type
        file_ext = file.filename.split('.')[-1].lower() if '.' in file.filename else 'unknown'
        
        file_type = "other"
        if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']:
            file_type = "image"
        elif file_ext in ['pdf']:
            file_type = "pdf"
        elif file_ext in ['doc', 'docx']:
            file_type = "document"
        elif file_ext in ['xls', 'xlsx']:
            file_type = "spreadsheet"
        elif file_ext in ['mp4', 'avi', 'mov', 'wmv']:
            file_type = "video"
        elif file_ext in ['mp3', 'wav', 'ogg']:
            file_type = "audio"
        
        # Return attachment metadata
        attachment_data = {
            "filename": file.filename,
            "size": len(content),
            "type": file_type,
            "url": f"/uploads/chat_attachments/{filename}",
            "uploaded_at": datetime_to_iso(datetime.now(timezone.utc).replace(tzinfo=None))
        }
        
        return success_response({
            "message": "File uploaded successfully",
            "attachment": attachment_data
        })
        
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        import traceback
        traceback.print_exc()
        return error_response(f"Failed to upload file: {str(e)}", 500)
