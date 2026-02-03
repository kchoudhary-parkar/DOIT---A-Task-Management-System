from database import users
from bson import ObjectId
import datetime
from datetime import timezone

class User:
    @staticmethod
    def find_by_email(email):
        return users.find_one({"email": email})

    @staticmethod
    def find_by_id(user_id):
        return users.find_one({"_id": ObjectId(user_id)})
    
    @staticmethod
    def find_by_clerk_id(clerk_user_id):
        """Find user by Clerk user ID"""
        return users.find_one({"clerk_user_id": clerk_user_id})

    @staticmethod
    def create(user_data):
        # Ensure token_version exists for new users
        if "token_version" not in user_data:
            user_data["token_version"] = 1
        if "created_at" not in user_data:
            user_data["created_at"] = datetime.datetime.now(timezone.utc).replace(tzinfo=None)
        # Add clerk_user_id field if not present
        if "clerk_user_id" not in user_data:
            user_data["clerk_user_id"] = None
        return users.insert_one(user_data)
    
    @staticmethod
    def count_users():
        return users.count_documents({})
    
    @staticmethod
    def get_all_users():
        return list(users.find({}, {"password": 0}))
    
    @staticmethod
    def update_role(user_id, new_role):
        return users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"role": new_role}}
        )
    
    @staticmethod
    def update(user_id, update_data):
        """Update user data"""
        return users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
    
    @staticmethod
    def find_super_admins():
        return list(users.find({"role": "super-admin"}))