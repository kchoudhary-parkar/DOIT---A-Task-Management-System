"""
Team Integration Controller - Manage project-level communication integrations
Handles setup, provisioning, and management of Discord, Slack, Teams channels
"""

import requests
from models.team_integration import TeamIntegration
from models.project import Project
from utils.platform_apis import auto_provision_channel, TeamsAPI
from utils.response import success_response, error_response


# ============================================================================
# SETUP & AUTO-PROVISIONING
# ============================================================================


def setup_discord_integration(
    project_id: str, user_id: str, guild_id: str, bot_token: str
):
    """
    Set up Discord integration for a project
    Auto-provisions channel and webhook

    Args:
        project_id: Project ID
        user_id: User ID who's setting up (should be admin)
        guild_id: Discord server ID
        bot_token: Discord bot token
    """
    try:
        # Get project for name
        project = Project.find_by_id(project_id)
        if not project:
            return error_response("Project not found", 404)

        # Provision channel and webhook
        result = auto_provision_channel(
            "discord",
            guild_id=guild_id,
            bot_token=bot_token,
            project_name=project.get("name", "project"),
        )

        if "error" in result:
            return error_response(
                f"Failed to provision Discord channel: {result['error']}", 400
            )

        # Store integration in DB
        credentials = {
            "guild_id": guild_id,
            "bot_token": bot_token,
            "webhook_url": result.get("webhook_url"),
            "auto_provisioned": True,
        }

        integration = TeamIntegration.create(
            project_id=project_id,
            created_by=user_id,
            platform="discord",
            integration_type="webhook",
            credentials=credentials,
        )

        # Update channel info
        TeamIntegration.update_channel_info(
            str(integration["_id"]),
            result.get("channel_id"),
            result.get("channel_name"),
        )

        integration["_id"] = str(integration["_id"])
        return success_response(
            {"message": result.get("message"), "integration": integration}
        )

    except Exception as e:
        print(f"Error setting up Discord integration: {str(e)}")
        return error_response(f"Failed to set up Discord: {str(e)}", 500)


def setup_slack_integration(project_id: str, user_id: str, workspace_token: str):
    """
    Set up Slack integration for a project
    Auto-provisions channel and adds bot

    Args:
        project_id: Project ID
        user_id: User ID who's setting up (should be admin)
        workspace_token: Slack workspace bot token (xoxb-...)
    """
    try:
        import requests
        from config import MONGO_URI
        from pymongo import MongoClient
        from datetime import datetime

        # Get project for name
        project = Project.find_by_id(project_id)
        if not project:
            return error_response("Project not found", 404)

        channel_name = (
            f"project-{project.get('name', 'project').lower().replace(' ', '-')}"
        )
        headers = {
            "Authorization": f"Bearer {workspace_token}",
            "Content-Type": "application/json",
        }
        # Step 1: Create Slack channel
        url = "https://slack.com/api/conversations.create"
        data = {"name": channel_name, "is_private": False}
        response = requests.post(url, headers=headers, json=data)
        resp_json = response.json()

        if not resp_json.get("ok"):
            error = resp_json.get("error")
            if error == "name_taken":
                # Channel already exists, fetch it
                list_url = "https://slack.com/api/conversations.list"
                list_params = {"types": "public_channel,private_channel"}
                list_response = requests.get(
                    list_url, headers=headers, params=list_params
                )
                list_json = list_response.json()
                channel_info = None
                if list_json.get("ok"):
                    for channel in list_json.get("channels", []):
                        if channel.get("name") == channel_name:
                            channel_info = channel
                            break
                if not channel_info:
                    return error_response(
                        f"Could not find existing channel '{channel_name}'", 400
                    )
            else:
                return error_response(f"Failed to create Slack channel: {error}", 400)
        else:
            channel_info = resp_json["channel"]

        # Step 2: Get Bot Info
        auth_test_url = "https://slack.com/api/auth.test"
        auth_response = requests.post(auth_test_url, headers=headers)
        auth_json = auth_response.json()

        # Step 3: Invite bot to channel (if not already a member)
        invite_url = "https://slack.com/api/conversations.join"
        invite_data = {"channel": channel_info["id"]}
        invite_response = requests.post(invite_url, headers=headers, json=invite_data)
        invite_response.json()  # Response is not used further

        # Step 4: Store the integration in MongoDB
        client = MongoClient(MONGO_URI)
        db = client["taskdb"]
        webhook_url_created = None
        integration_doc = {
            "project_id": str(project["_id"]),
            "platform": "slack",
            "type": "bot",
            "created_by": project["user_id"],
            "credentials": {
                "workspace_token": workspace_token,
                "channel_id": channel_info["id"],
                "channel_name": channel_info["name"],
                "webhook_url": webhook_url_created,
                "bot_user_id": auth_json.get("user_id"),
                "team_id": auth_json.get("team_id"),
                "auto_provisioned": True,
            },
            "auto_provisioned": True,
            "channel_id": channel_info["id"],
            "channel_name": channel_info["name"],
            "webhook_url": webhook_url_created,
            "is_active": True,
            "created_at": project.get("created_at", datetime.utcnow()),
            "updated_at": datetime.utcnow(),
        }
        existing = db.team_integrations.find_one(
            {
                "project_id": str(project["_id"]),
                "platform": "slack",
                "channel_id": channel_info["id"],
            }
        )
        if existing:
            db.team_integrations.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "updated_at": datetime.utcnow(),
                        "is_active": True,
                        "credentials.bot_user_id": auth_json.get("user_id"),
                        "credentials.team_id": auth_json.get("team_id"),
                    }
                },
            )
            integration_id = existing["_id"]
            message = f"Integration already exists with _id: {integration_id} (updated)"
        else:
            result = db.team_integrations.insert_one(integration_doc)
            integration_id = result.inserted_id
            message = f"New integration saved with _id: {integration_id}"

        # Step 5: Send test message to Slack channel
        test_message_url = "https://slack.com/api/chat.postMessage"
        test_data = {
            "channel": channel_info["id"],
            "text": f"✅ DOIT-Agent integration successfully configured for #{channel_info['name']}!",
            "blocks": [
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "🎉 Integration Active"},
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"DOIT-Agent is now connected to *#{channel_info['name']}*\n\nYou'll receive notifications here for:\n• New tasks\n• Task updates\n• Mentions and comments",
                    },
                },
            ],
        }
        test_response = requests.post(test_message_url, headers=headers, json=test_data)
        test_json = test_response.json()
        if test_json.get("ok"):
            test_message_status = "Test message sent successfully!"
        else:
            test_message_status = f"Test message failed: {test_json.get('error')}"

        return success_response(
            {
                "message": message,
                "integration": {"_id": str(integration_id), **integration_doc},
                "test_message_status": test_message_status,
            }
        )
    except Exception as e:
        print(f"Error setting up Slack integration: {str(e)}")
        return error_response(f"Failed to set up Slack: {str(e)}", 500)


def setup_teams_integration(
    project_id: str,
    user_id: str,
    webhook_url: str = None,
    team_id: str = None,
    access_token: str = None,
):
    """
    Set up Microsoft Teams integration for a project
    Supports manual webhook storage or Graph API channel provisioning.

    Args:
        project_id: Project ID
        user_id: User ID who's setting up (should be admin)
        webhook_url: Teams incoming webhook URL for manual setup
        team_id: Teams team ID for Graph API channel creation
        access_token: Microsoft Graph API access token
    """
    try:
        # Get project for name
        project = Project.find_by_id(project_id)
        if not project:
            return error_response("Project not found", 404)

        # Manual Teams webhook URL support
        if webhook_url:
            credentials = {
                "webhook_url": webhook_url,
                "auto_provisioned": False,
            }

            integration = TeamIntegration.create(
                project_id=project_id,
                created_by=user_id,
                platform="teams",
                integration_type="webhook",
                credentials=credentials,
            )

            TeamIntegration.update_channel_info(
                str(integration["_id"]),
                None,
                "Teams Webhook",
            )

            integration["_id"] = str(integration["_id"])
            return success_response(
                {
                    "message": "✅ Teams webhook integration saved",
                    "integration": integration,
                }
            )

        # Fallback to Graph API provisioning when webhook_url not provided
        if not all([team_id, access_token]):
            return error_response(
                "Missing required Teams configuration: webhook_url or team_id + access_token",
                400,
            )

        result = auto_provision_channel(
            "teams",
            team_id=team_id,
            access_token=access_token,
            project_name=project.get("name", "project"),
        )

        if "error" in result:
            return error_response(
                f"Failed to provision Teams channel: {result['error']}", 400
            )

        credentials = {
            "team_id": team_id,
            "access_token": access_token,
            "channel_id": result.get("channel_id"),
            "auto_provisioned": True,
        }

        integration = TeamIntegration.create(
            project_id=project_id,
            created_by=user_id,
            platform="teams",
            integration_type="bot",
            credentials=credentials,
        )

        TeamIntegration.update_channel_info(
            str(integration["_id"]),
            result.get("channel_id"),
            result.get("channel_name"),
        )

        integration["_id"] = str(integration["_id"])
        return success_response(
            {"message": result.get("message"), "integration": integration}
        )

    except Exception as e:
        print(f"Error setting up Teams integration: {str(e)}")
        return error_response(f"Failed to set up Teams: {str(e)}", 500)


# ============================================================================
# INTEGRATION MANAGEMENT
# ============================================================================


def get_project_integrations(project_id: str):
    """Get all integrations for a project"""
    try:
        integrations = TeamIntegration.find_by_project(project_id)

        # Sanitize credentials (don't expose tokens)
        for integration in integrations:
            integration["_id"] = str(integration.get("_id"))
            credentials = integration.get("credentials", {})

            # Remove sensitive data
            if "bot_token" in credentials:
                del credentials["bot_token"]
            if "access_token" in credentials:
                del credentials["access_token"]
            if "webhook_url" in credentials:
                # Keep webhook_url but might mask it
                pass

            integration["credentials"] = credentials

        summary = TeamIntegration.get_project_integrations_summary(project_id)

        return success_response({"integrations": integrations, "summary": summary})

    except Exception as e:
        print(f"Error fetching integrations: {str(e)}")
        return error_response(f"Failed to fetch integrations: {str(e)}", 500)


def get_integration_details(integration_id: str):
    """Get details of a specific integration"""
    try:
        integration = TeamIntegration.find_by_id(integration_id)

        if not integration:
            return error_response("Integration not found", 404)

        integration["_id"] = str(integration["_id"])

        # Sanitize credentials
        credentials = integration.get("credentials", {})
        if "bot_token" in credentials:
            del credentials["bot_token"]
        if "access_token" in credentials:
            del credentials["access_token"]

        integration["credentials"] = credentials

        return success_response({"integration": integration})

    except Exception as e:
        print(f"Error fetching integration: {str(e)}")
        return error_response(f"Failed to fetch integration: {str(e)}", 500)


def update_integration_status(integration_id: str, is_active: bool):
    """Update integration active status"""
    try:
        integration = TeamIntegration.find_by_id(integration_id)

        if not integration:
            return error_response("Integration not found", 404)

        success = TeamIntegration.update_credentials(
            integration_id,
            {**integration.get("credentials", {}), "is_active": is_active},
        )

        if not success:
            return error_response("Failed to update integration", 500)

        status_text = "activated" if is_active else "deactivated"
        return success_response({"message": f"Integration {status_text}"})

    except Exception as e:
        print(f"Error updating integration: {str(e)}")
        return error_response(f"Failed to update integration: {str(e)}", 500)


def disconnect_integration(integration_id: str):
    """Disconnect/delete an integration"""
    try:
        integration = TeamIntegration.find_by_id(integration_id)

        if not integration:
            return error_response("Integration not found", 404)

        success = TeamIntegration.deactivate(integration_id)

        if not success:
            return error_response("Failed to disconnect integration", 500)

        return success_response(
            {
                "message": "Integration disconnected",
                "platform": integration.get("platform"),
            }
        )

    except Exception as e:
        print(f"Error disconnecting integration: {str(e)}")
        return error_response(f"Failed to disconnect integration: {str(e)}", 500)


# ============================================================================
# SEND NOTIFICATIONS VIA INTEGRATIONS
# ============================================================================


def send_notification_to_platform(
    project_id: str, platform: str, message: str, title: str = "DOIT Notification"
):
    """
    Send a notification via a project's platform integration

    Args:
        project_id: Project ID
        platform: Platform name (discord, slack, teams)
        message: Message content
        title: Message title (optional)
    """
    try:
        # Find integration
        integration = TeamIntegration.find_by_project_and_platform(project_id, platform)

        if not integration:
            return {"error": f"No active {platform} integration for this project"}

        credentials = integration.get("credentials", {})

        if platform == "discord":
            # Discord webhook
            webhook_url = credentials.get("webhook_url")
            if not webhook_url:
                return {"error": "Discord webhook URL not found"}

            payload = {
                "embeds": [
                    {
                        "title": title,
                        "description": message,
                        "color": 0x6366F1,
                        "footer": {"text": "DOIT AI Assistant"},
                    }
                ]
            }

            response = requests.post(webhook_url, json=payload)
            if response.status_code == 204:
                return {"success": True, "message": "✅ Sent to Discord"}
            else:
                return {"error": f"Failed to send to Discord: {response.text}"}

        elif platform == "slack":
            # Slack bot
            bot_token = credentials.get("bot_token")
            channel_id = credentials.get("channel_id")

            if not all([bot_token, channel_id]):
                return {"error": "Slack credentials incomplete"}

            headers = {
                "Authorization": f"Bearer {bot_token}",
                "Content-Type": "application/json",
            }

            payload = {"channel": channel_id, "text": f"*{title}*\n{message}"}

            response = requests.post(
                "https://slack.com/api/chat.postMessage", json=payload, headers=headers
            )
            data = response.json()

            if data.get("ok"):
                return {"success": True, "message": "✅ Sent to Slack"}
            else:
                return {"error": f"Failed to send to Slack: {data.get('error')}"}

        elif platform == "teams":
            webhook_url = credentials.get("webhook_url")
            if webhook_url:
                payload = {"text": f"{title}\n{message}"}
                response = requests.post(webhook_url, json=payload)
                if response.status_code in [200, 201, 204]:
                    return {"success": True, "message": "✅ Sent to Teams via webhook"}
                return {"error": f"Failed to send to Teams webhook: {response.text}"}

            # Teams Graph API fallback
            team_id = credentials.get("team_id")
            channel_id = credentials.get("channel_id")
            access_token = credentials.get("access_token")

            if not all([team_id, channel_id, access_token]):
                return {"error": "Teams credentials incomplete"}

            result = TeamsAPI.send_message(
                team_id, channel_id, access_token, f"{title}\n{message}"
            )

            if result.get("success"):
                return {"success": True, "message": "✅ Sent to Teams"}
            else:
                return result

        else:
            return {"error": f"Unsupported platform: {platform}"}

    except Exception as e:
        print(f"Error sending notification: {str(e)}")
        return {"error": f"Failed to send notification: {str(e)}"}


def send_discord_message(
    project_id: str, message: str, title: str = "DOIT Notification"
):
    """Send a message through the project's Discord integration."""
    return send_notification_to_platform(project_id, "discord", message, title)


# ============================================================================
# HELPER: TEST INTEGRATION
# ============================================================================


def test_integration(integration_id: str):
    """Test an integration by sending a test message"""
    try:
        integration = TeamIntegration.find_by_id(integration_id)

        if not integration:
            return error_response("Integration not found", 404)

        project_id = integration.get("project_id")
        platform = integration.get("platform")

        result = send_notification_to_platform(
            project_id,
            platform,
            "This is a test message from DOIT",
            "DOIT Integration Test",
        )

        if "error" in result:
            return error_response(result["error"], 400)

        return success_response({"message": result.get("message")})

    except Exception as e:
        print(f"Error testing integration: {str(e)}")
        return error_response(f"Failed to test integration: {str(e)}", 500)
