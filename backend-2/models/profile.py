from database import db
from bson import ObjectId
from utils.github_utils import encrypt_token

profiles = db.profiles

class Profile:
    @staticmethod
    def find_by_user(user_id):
        """Find profile by user ID"""
        return profiles.find_one({"user_id": user_id})
    
    @staticmethod
    def create(user_id):
        """Create new profile for user"""
        profile = {
            "user_id": user_id,
            "personal": {},
            "education": [],
            "certificates": [],
            "organization": {},
            "integrations": {
                "discord_webhook": "",
                "teams_webhook": "",
                "slack_webhook": "",
                "github_token_encrypted": "",
                "whatsapp_instance_id": "",
                "whatsapp_token": "",
                "whatsapp_number": ""
            }
        }
        result = profiles.insert_one(profile)
        profile["_id"] = str(result.inserted_id)
        return profile
    
    @staticmethod
    def update_personal(user_id, personal_data):
        """Update personal information"""
        result = profiles.update_one(
            {"user_id": user_id},
            {"$set": {"personal": personal_data}},
            upsert=True
        )
        return True  # Always return True if no exception occurred
    
    @staticmethod
    def update_education(user_id, education_list):
        """Update education list"""
        result = profiles.update_one(
            {"user_id": user_id},
            {"$set": {"education": education_list}},
            upsert=True
        )
        return True  # Always return True if no exception occurred
    
    @staticmethod
    def update_certificates(user_id, certificates_list):
        """Update certificates list"""
        result = profiles.update_one(
            {"user_id": user_id},
            {"$set": {"certificates": certificates_list}},
            upsert=True
        )
        return True  # Always return True if no exception occurred
    
    @staticmethod
    def update_organization(user_id, organization_data):
        """Update organization information"""
        result = profiles.update_one(
            {"user_id": user_id},
            {"$set": {"organization": organization_data}},
            upsert=True
        )
        return True  # Always return True if no exception occurred

    @staticmethod
    def update_integrations(user_id, integration_data):
        """Update integration settings (webhooks + GitHub token)."""
        existing_profile = profiles.find_one({"user_id": user_id}) or {}
        existing_integrations = existing_profile.get("integrations", {}) or {}

        merged_integrations = dict(existing_integrations)

        # Allow direct updates/clears for webhook-style fields.
        for key in ["discord_webhook", "teams_webhook", "slack_webhook"]:
            if key in integration_data:
                merged_integrations[key] = (integration_data.get(key) or "").strip()

        # Never store plaintext GitHub token.
        incoming_github_token = (integration_data.get("github_token") or "").strip()
        if incoming_github_token:
            merged_integrations["github_token_encrypted"] = encrypt_token(incoming_github_token)
        elif "github_token_encrypted" not in merged_integrations:
            merged_integrations["github_token_encrypted"] = ""

        merged_integrations.pop("github_token", None)

        db.profiles.update_one(
            {"user_id": user_id},
            {"$set": {"integrations": merged_integrations}},
            upsert=True,
        )
        return True
