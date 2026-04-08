"""
Team Integration Model - Project-level communication integrations
Supports Discord, Slack, and Microsoft Teams with auto-provisioned channels
"""

from database import db
from bson import ObjectId
from datetime import datetime, timezone
from enum import Enum

team_integrations = db.team_integrations


class PlatformType(str, Enum):
    """Platform types"""

    DISCORD = "discord"
    SLACK = "slack"
    TEAMS = "teams"


class IntegrationType(str, Enum):
    """Integration types: webhook-based or bot-based"""

    WEBHOOK = "webhook"  # Discord, legacy Slack
    BOT = "bot"  # Slack bot token, Teams bot


class TeamIntegration:
    """Team/Project-level communication integration"""

    @staticmethod
    def create(
        project_id: str,
        created_by: str,
        platform: str,
        integration_type: str,
        credentials: dict,
    ):
        """
        Create a new team integration

        Args:
            project_id: Project ID
            created_by: User ID who created/set up the integration
            platform: Platform type (discord|slack|teams)
            integration_type: Type of integration (webhook|bot)
            credentials: Platform-specific credentials dict

        Returns:
            Integration document with _id
        """
        integration = {
            "project_id": project_id,
            "platform": platform,
            "type": integration_type,
            "created_by": created_by,
            "credentials": credentials,  # Platform-specific (webhook_url, bot_token, channel_id, etc.)
            "auto_provisioned": credentials.get("auto_provisioned", False),
            "channel_id": credentials.get("channel_id"),
            "channel_name": credentials.get("channel_name"),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).replace(tzinfo=None),
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None),
        }

        result = team_integrations.insert_one(integration)
        integration["_id"] = result.inserted_id
        return integration

    @staticmethod
    def find_by_project_and_platform(project_id: str, platform: str):
        """Find integration for a project and platform"""
        try:
            return team_integrations.find_one(
                {"project_id": project_id, "platform": platform, "is_active": True}
            )
        except Exception:
            return None

    @staticmethod
    def find_by_project(project_id: str):
        """Find all integrations for a project"""
        try:
            return list(
                team_integrations.find({"project_id": project_id, "is_active": True})
            )
        except Exception:
            return []

    @staticmethod
    def find_by_id(integration_id):
        """Find integration by ID"""
        try:
            return team_integrations.find_one({"_id": ObjectId(integration_id)})
        except Exception:
            return None

    @staticmethod
    def update_credentials(integration_id: str, credentials: dict):
        """Update integration credentials"""
        try:
            result = team_integrations.update_one(
                {"_id": ObjectId(integration_id)},
                {
                    "$set": {
                        "credentials": credentials,
                        "updated_at": datetime.now(timezone.utc).replace(tzinfo=None),
                    }
                },
            )
            return result.modified_count > 0
        except Exception:
            return False

    @staticmethod
    def update_channel_info(integration_id: str, channel_id: str, channel_name: str):
        """Update channel information after provisioning"""
        try:
            result = team_integrations.update_one(
                {"_id": ObjectId(integration_id)},
                {
                    "$set": {
                        "channel_id": channel_id,
                        "channel_name": channel_name,
                        "updated_at": datetime.now(timezone.utc).replace(tzinfo=None),
                    }
                },
            )
            return result.modified_count > 0
        except Exception:
            return False

    @staticmethod
    def deactivate(integration_id: str):
        """Deactivate an integration"""
        try:
            result = team_integrations.update_one(
                {"_id": ObjectId(integration_id)},
                {
                    "$set": {
                        "is_active": False,
                        "updated_at": datetime.now(timezone.utc).replace(tzinfo=None),
                    }
                },
            )
            return result.modified_count > 0
        except Exception:
            return False

    @staticmethod
    def delete(integration_id: str):
        """Delete an integration"""
        try:
            result = team_integrations.delete_one({"_id": ObjectId(integration_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    @staticmethod
    def get_project_integrations_summary(project_id: str):
        """Get summary of all integrations for a project"""
        integrations = TeamIntegration.find_by_project(project_id)
        summary = {}
        for integration in integrations:
            platform = integration.get("platform")
            summary[platform] = {
                "id": str(integration.get("_id")),
                "type": integration.get("type"),
                "channel_name": integration.get("channel_name"),
                "is_active": integration.get("is_active"),
                "auto_provisioned": integration.get("auto_provisioned", False),
            }
        return summary
