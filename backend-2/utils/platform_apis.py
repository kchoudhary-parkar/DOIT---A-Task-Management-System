"""
Platform API utilities - Handle Discord, Slack, and Teams API calls
Supports channel creation, webhook generation, and bot integration
"""

import requests
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Platform API endpoints and configurations
DISCORD_API_BASE = "https://discord.com/api/v10"
SLACK_API_BASE = "https://slack.com/api"
TEAMS_GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"

# ============================================================================
# DISCORD INTEGRATION
# ============================================================================


class DiscordAPI:
    """Discord API operations for channel creation and webhook management"""

    @staticmethod
    def create_channel(
        guild_id: str, bot_token: str, channel_name: str
    ) -> Dict[str, Any]:
        """
        Create a Discord channel in a server

        Args:
            guild_id: Discord server (guild) ID
            bot_token: Discord bot token
            channel_name: Name of channel to create

        Returns:
            dict with channel_id, channel_name, or error
        """
        if not all([guild_id, bot_token, channel_name]):
            return {"error": "Missing required parameters"}

        headers = {
            "Authorization": f"Bot {bot_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "name": channel_name.lower().replace(" ", "-"),
            "type": 0,  # 0 = text channel
        }

        try:
            response = requests.post(
                f"{DISCORD_API_BASE}/guilds/{guild_id}/channels",
                json=payload,
                headers=headers,
                timeout=10,
            )

            if response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "channel_id": data.get("id"),
                    "channel_name": data.get("name"),
                    "message": f"✅ Discord channel created: #{data.get('name')}",
                }
            else:
                logger.error(f"Discord channel creation failed: {response.text}")
                return {"error": f"Failed to create channel: {response.text}"}

        except Exception as e:
            logger.error(f"Error creating Discord channel: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def create_webhook(
        channel_id: str, bot_token: str, webhook_name: str = "DOIT Agent"
    ) -> Dict[str, Any]:
        """
        Create a Discord webhook for a channel

        Args:
            channel_id: Discord channel ID
            bot_token: Discord bot token
            webhook_name: Name for the webhook

        Returns:
            dict with webhook_url or error
        """
        if not all([channel_id, bot_token]):
            return {"error": "Missing required parameters"}

        headers = {
            "Authorization": f"Bot {bot_token}",
            "Content-Type": "application/json",
        }

        payload = {"name": webhook_name}

        try:
            response = requests.post(
                f"{DISCORD_API_BASE}/channels/{channel_id}/webhooks",
                json=payload,
                headers=headers,
                timeout=10,
            )

            if response.status_code == 201:
                data = response.json()
                webhook_url = f"https://discord.com/api/webhooks/{data.get('id')}/{data.get('token')}"
                return {
                    "success": True,
                    "webhook_url": webhook_url,
                    "webhook_id": data.get("id"),
                    "message": "✅ Discord webhook created",
                }
            else:
                logger.error(f"Discord webhook creation failed: {response.text}")
                return {"error": f"Failed to create webhook: {response.text}"}

        except Exception as e:
            logger.error(f"Error creating Discord webhook: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def provision_channel_and_webhook(
        guild_id: str, bot_token: str, project_name: str
    ) -> Dict[str, Any]:
        """
        Complete Discord setup: create channel + webhook

        Args:
            guild_id: Discord guild ID
            bot_token: Discord bot token
            project_name: Project name for channel naming

        Returns:
            dict with channel_id, webhook_url, or error
        """
        # Create channel
        channel_result = DiscordAPI.create_channel(
            guild_id, bot_token, f"project-{project_name}"
        )

        if "error" in channel_result:
            return channel_result

        channel_id = channel_result["channel_id"]

        # Create webhook
        webhook_result = DiscordAPI.create_webhook(channel_id, bot_token)

        if "error" in webhook_result:
            return webhook_result

        return {
            "success": True,
            "channel_id": channel_id,
            "channel_name": channel_result["channel_name"],
            "webhook_url": webhook_result["webhook_url"],
            "message": "✅ Discord channel and webhook created",
        }


# ============================================================================
# SLACK INTEGRATION
# ============================================================================


class SlackAPI:
    """Slack API operations for channel creation and bot integration"""

    @staticmethod
    def get_user_id_by_email(workspace_token: str, email: str) -> Dict[str, Any]:
        """Resolve a Slack user ID from email."""
        if not all([workspace_token, email]):
            return {"error": "Missing required parameters"}

        headers = {"Authorization": f"Bearer {workspace_token}"}

        try:
            response = requests.get(
                f"{SLACK_API_BASE}/users.lookupByEmail",
                params={"email": email},
                headers=headers,
                timeout=10,
            )
            data = response.json()

            if data.get("ok"):
                user_id = data.get("user", {}).get("id")
                if user_id:
                    return {"success": True, "user_id": user_id}
                return {"error": "Slack user id not found in response"}

            error = data.get("error", "Unknown error")
            return {"error": f"Failed to lookup Slack user: {error}"}

        except Exception as e:
            logger.error(f"Error looking up Slack user by email: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def invite_user_to_channel(
        workspace_token: str, channel_id: str, user_id: str
    ) -> Dict[str, Any]:
        """Invite a Slack user ID to a channel."""
        if not all([workspace_token, channel_id, user_id]):
            return {"error": "Missing required parameters"}

        headers = {
            "Authorization": f"Bearer {workspace_token}",
            "Content-Type": "application/json",
        }
        payload = {"channel": channel_id, "users": user_id}

        try:
            response = requests.post(
                f"{SLACK_API_BASE}/conversations.invite",
                json=payload,
                headers=headers,
                timeout=10,
            )
            data = response.json()

            if data.get("ok"):
                return {"success": True, "message": "✅ User invited to Slack channel"}

            error = data.get("error", "Unknown error")
            if error in ["already_in_channel", "cant_invite_self"]:
                return {"success": True, "message": "✅ User already in Slack channel"}

            logger.error(f"Slack channel invite failed: {error}")
            return {"error": f"Failed to invite user: {error}"}

        except Exception as e:
            logger.error(f"Error inviting user to Slack channel: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def invite_user_to_project_channel(
        workspace_token: str,
        channel_id: str,
        email: str,
        lookup_token: str = None,
    ) -> Dict[str, Any]:
        """Invite a user to project Slack channel by email."""
        effective_lookup_token = lookup_token or workspace_token
        lookup = SlackAPI.get_user_id_by_email(effective_lookup_token, email)
        if "error" in lookup:
            return lookup

        # Best effort: join channel first (important for public channels).
        headers = {
            "Authorization": f"Bearer {workspace_token}",
            "Content-Type": "application/json",
        }
        try:
            requests.post(
                f"{SLACK_API_BASE}/conversations.join",
                json={"channel": channel_id},
                headers=headers,
                timeout=10,
            )
        except Exception:
            # Ignore join failures here; invite call below is the authoritative result.
            pass

        return SlackAPI.invite_user_to_channel(
            workspace_token, channel_id, lookup.get("user_id")
        )

    @staticmethod
    def create_channel(
        workspace_token: str, channel_name: str, is_private: bool = False
    ) -> Dict[str, Any]:
        """
        Create a Slack channel

        Args:
            workspace_token: Slack workspace token (xoxb-...)
            channel_name: Channel name
            is_private: Whether to create a private channel

        Returns:
            dict with channel_id, channel_name, or error
        """
        if not all([workspace_token, channel_name]):
            return {"error": "Missing required parameters"}

        headers = {
            "Authorization": f"Bearer {workspace_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "name": channel_name.lower().replace(" ", "-").replace("_", "-"),
            "is_private": is_private,
        }

        try:
            response = requests.post(
                f"{SLACK_API_BASE}/conversations.create",
                json=payload,
                headers=headers,
                timeout=10,
            )

            data = response.json()

            if data.get("ok"):
                return {
                    "success": True,
                    "channel_id": data.get("channel", {}).get("id"),
                    "channel_name": data.get("channel", {}).get("name"),
                    "message": f"✅ Slack channel created: #{data.get('channel', {}).get('name')}",
                }
            else:
                error = data.get("error", "Unknown error")
                logger.error(f"Slack channel creation failed: {error}")
                return {"error": f"Failed to create channel: {error}"}

        except Exception as e:
            logger.error(f"Error creating Slack channel: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def add_bot_to_channel(workspace_token: str, channel_id: str) -> Dict[str, Any]:
        """
        Add bot to a Slack channel

        Args:
            workspace_token: Slack bot token
            channel_id: Channel ID to add bot to

        Returns:
            dict with success or error
        """
        if not all([workspace_token, channel_id]):
            return {"error": "Missing required parameters"}

        headers = {
            "Authorization": f"Bearer {workspace_token}",
            "Content-Type": "application/json",
        }

        payload = {"channel": channel_id}

        try:
            response = requests.post(
                f"{SLACK_API_BASE}/conversations.members",
                json=payload,
                headers=headers,
                timeout=10,
            )

            data = response.json()

            if data.get("ok"):
                return {"success": True, "message": "✅ Bot added to Slack channel"}
            else:
                error = data.get("error", "Unknown error")
                logger.error(f"Failed to add bot to channel: {error}")
                # If bot is already in channel, it's not an error
                if "already_in_channel" in error or "cant_invite_self" in error:
                    return {"success": True, "message": "✅ Bot already in channel"}
                return {"error": f"Failed to add bot: {error}"}

        except Exception as e:
            logger.error(f"Error adding bot to Slack channel: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def provision_channel(workspace_token: str, project_name: str) -> Dict[str, Any]:
        """
        Complete Slack setup: create channel + add bot

        Args:
            workspace_token: Slack bot token
            project_name: Project name for channel naming

        Returns:
            dict with channel_id, bot_token, or error
        """
        # Create channel
        channel_result = SlackAPI.create_channel(
            workspace_token, f"project-{project_name}"
        )

        if "error" in channel_result:
            return channel_result

        channel_id = channel_result["channel_id"]

        # Add bot to channel
        bot_result = SlackAPI.add_bot_to_channel(workspace_token, channel_id)

        if "error" in bot_result:
            return bot_result

        return {
            "success": True,
            "channel_id": channel_id,
            "channel_name": channel_result["channel_name"],
            "bot_token": workspace_token,
            "message": "✅ Slack channel created and bot added",
        }


# ============================================================================
# MICROSOFT TEAMS INTEGRATION
# ============================================================================


class TeamsAPI:
    """Microsoft Teams Graph API operations for channel creation"""

    @staticmethod
    def create_channel(
        team_id: str, access_token: str, channel_name: str, description: str = ""
    ) -> Dict[str, Any]:
        """
        Create a Microsoft Teams channel

        Args:
            team_id: Teams team ID
            access_token: Microsoft Graph access token
            channel_name: Channel name
            description: Channel description

        Returns:
            dict with channel_id, channel_name, or error
        """
        if not all([team_id, access_token, channel_name]):
            return {"error": "Missing required parameters"}

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "displayName": channel_name,
            "description": description or f"Channel for {channel_name}",
            "membershipType": "standard",
        }

        try:
            response = requests.post(
                f"{TEAMS_GRAPH_API_BASE}/teams/{team_id}/channels",
                json=payload,
                headers=headers,
                timeout=10,
            )

            if response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "channel_id": data.get("id"),
                    "channel_name": data.get("displayName"),
                    "message": f"✅ Teams channel created: {data.get('displayName')}",
                }
            else:
                logger.error(f"Teams channel creation failed: {response.text}")
                return {"error": f"Failed to create channel: {response.text}"}

        except Exception as e:
            logger.error(f"Error creating Teams channel: {str(e)}")
            return {"error": str(e)}

    @staticmethod
    def send_message(
        team_id: str, channel_id: str, access_token: str, message_body: str
    ) -> Dict[str, Any]:
        """
        Send a message to a Teams channel using Graph API

        Args:
            team_id: Teams team ID
            channel_id: Teams channel ID
            access_token: Microsoft Graph access token
            message_body: Message content

        Returns:
            dict with message_id or error
        """
        if not all([team_id, channel_id, access_token, message_body]):
            return {"error": "Missing required parameters"}

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        payload = {"body": {"content": message_body}}

        try:
            response = requests.post(
                f"{TEAMS_GRAPH_API_BASE}/teams/{team_id}/channels/{channel_id}/messages",
                json=payload,
                headers=headers,
                timeout=10,
            )

            if response.status_code == 201:
                data = response.json()
                return {
                    "success": True,
                    "message_id": data.get("id"),
                    "message": "✅ Message sent to Teams",
                }
            else:
                logger.error(f"Teams message failed: {response.text}")
                return {"error": f"Failed to send message: {response.text}"}

        except Exception as e:
            logger.error(f"Error sending Teams message: {str(e)}")
            return {"error": str(e)}


# ============================================================================
# GENERIC PROVISIONING HELPER
# ============================================================================


def auto_provision_channel(platform: str, **kwargs) -> Dict[str, Any]:
    """
    Universal function to auto-provision channels based on platform

    Args:
        platform: "discord", "slack", or "teams"
        **kwargs: Platform-specific parameters

    Returns:
        dict with provisioning results or error
    """
    if platform == "discord":
        return DiscordAPI.provision_channel_and_webhook(
            kwargs.get("guild_id"),
            kwargs.get("bot_token"),
            kwargs.get("project_name", "project"),
        )
    elif platform == "slack":
        return SlackAPI.provision_channel(
            kwargs.get("workspace_token") or kwargs.get("bot_token"),
            kwargs.get("project_name", "project"),
        )
    elif platform == "teams":
        result = TeamsAPI.create_channel(
            kwargs.get("team_id"),
            kwargs.get("access_token"),
            f"project-{kwargs.get('project_name', 'project')}",
        )
        # For Teams, don't return bot_token (it's stored elsewhere)
        return result
    else:
        return {"error": f"Unsupported platform: {platform}"}
