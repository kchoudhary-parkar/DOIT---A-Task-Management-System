"""
Database initialization script
Creates the hardcoded super-admin account if it doesn't exist
Initializes default chat channels for projects
"""
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from database import users, db
from utils.auth_utils import hash_password

def initialize_super_admin():
    """
    Ensure the hardcoded super-admin exists in the database
    Email: superadmin@gmail.com
    Password: superadmin
    """
    SUPER_ADMIN_EMAIL = os.getenv("SADMIN_EMAIL", "superadmin@gmail.com")
    SUPER_ADMIN_PASSWORD = os.getenv("SADMIN_PASSWORD", "superadmin")
    SUPER_ADMIN_NAME = os.getenv("SADMIN_NAME", "Super Admin")
    
    # Check if super-admin already exists
    existing_super_admin = users.find_one({"email": SUPER_ADMIN_EMAIL})
    
    if existing_super_admin:
        print(f"✓ Super-admin account already exists: {SUPER_ADMIN_EMAIL}")
        # Ensure role is set correctly (in case it was changed)
        if existing_super_admin.get("role") != "super-admin":
            users.update_one(
                {"email": SUPER_ADMIN_EMAIL},
                {"$set": {"role": "super-admin"}}
            )
            print(f"✓ Updated role to super-admin for: {SUPER_ADMIN_EMAIL}")
    else:
        # Create the super-admin account
        hashed_password = hash_password(SUPER_ADMIN_PASSWORD)
        users.insert_one({
            "name": SUPER_ADMIN_NAME,
            "email": SUPER_ADMIN_EMAIL,
            "password": hashed_password,
            "role": "super-admin"
        })
        print(f"✓ Created super-admin account: {SUPER_ADMIN_EMAIL}")
        print(f"  Password: {SUPER_ADMIN_PASSWORD}")
        print(f"  ⚠️  Please change the password after first login!")


def initialize_default_channels():
    """
    Create default 'general' channel for all projects that don't have any channels
    """
    try:
        # Find all projects
        projects = list(db.projects.find({}, {"_id": 1, "name": 1}))
        
        channels_created = 0
        for project in projects:
            project_id = str(project["_id"])
            
            # Check if project already has channels
            existing_channels = db.chat_channels.count_documents({"project_id": project_id})
            
            if existing_channels == 0:
                # Create a default 'general' channel
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                db.chat_channels.insert_one({
                    "project_id": project_id,
                    "name": "general",
                    "description": "General discussion for the team",
                    "created_by": "system",
                    "created_at": now,
                    "updated_at": now
                })
                channels_created += 1
                print(f"✓ Created 'general' channel for project: {project.get('name', 'Unknown')}")
        
        if channels_created > 0:
            print(f"✓ Created {channels_created} default channels")
        else:
            print("✓ All projects already have channels")
            
    except Exception as e:
        print(f"⚠️  Error initializing default channels: {str(e)}")


if __name__ == "__main__":
    initialize_super_admin()
    initialize_default_channels()