"""
Team Integration Router - API endpoints for managing project integrations
Handles Discord, Slack, Teams setup and management
"""

from fastapi import APIRouter
from fastapi.requests import Request
from utils.router_helpers import get_user_id_from_request
from controllers import team_integration_controller
import json

router = APIRouter()


# ============================================================================
# SETUP INTEGRATIONS
# ============================================================================


@router.post("/{project_id}/integrations/discord/setup")
async def setup_discord(project_id: str, request: Request):
    """
    Set up Discord integration for a project
    Auto-provisions channel and webhook

    Body:
        {
            "guild_id": "Discord server ID",
            "bot_token": "Discord bot token"
        }
    """
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    try:
        body_str = await request.body()
        body = json.loads(body_str.decode("utf-8"))
    except Exception:
        from utils.response import error_response

        return error_response("Invalid JSON", 400)

    guild_id = body.get("guild_id")
    bot_token = body.get("bot_token")

    if not all([guild_id, bot_token]):
        from utils.response import error_response

        return error_response("Missing required: guild_id, bot_token", 400)

    return team_integration_controller.setup_discord_integration(
        project_id, user_id, guild_id, bot_token
    )


@router.post("/{project_id}/integrations/slack/setup")
async def setup_slack(project_id: str, request: Request):
    """
    Set up Slack integration for a project
    Auto-provisions channel and adds bot

    Body:
        {
            "workspace_token": "Slack bot token (xoxb-...)"
        }
    """
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    try:
        body_str = await request.body()
        body = json.loads(body_str.decode("utf-8"))
    except Exception:
        from utils.response import error_response

        return error_response("Invalid JSON", 400)

    workspace_token = body.get("workspace_token")

    if not workspace_token:
        from utils.response import error_response

        return error_response("Missing required: workspace_token", 400)

    return team_integration_controller.setup_slack_integration(
        project_id, user_id, workspace_token
    )


@router.post("/{project_id}/integrations/teams/setup")
async def setup_teams(project_id: str, request: Request):
    """
    Set up Microsoft Teams integration for a project
    Accepts either a manual incoming webhook URL or Graph API credentials

    Body:
        {
            "webhook_url": "Microsoft Teams incoming webhook URL"
        }

    Or:
        {
            "team_id": "Teams team ID",
            "access_token": "Microsoft Graph API access token"
        }
    """
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    try:
        body_str = await request.body()
        body = json.loads(body_str.decode("utf-8"))
    except Exception:
        from utils.response import error_response

        return error_response("Invalid JSON", 400)

    webhook_url = body.get("webhook_url")
    team_id = body.get("team_id")
    access_token = body.get("access_token")

    if not webhook_url and not all([team_id, access_token]):
        from utils.response import error_response

        return error_response(
            "Missing required Teams configuration: webhook_url or team_id + access_token",
            400,
        )

    return team_integration_controller.setup_teams_integration(
        project_id,
        user_id,
        webhook_url=webhook_url,
        team_id=team_id,
        access_token=access_token,
    )


# ============================================================================
# GET INTEGRATIONS
# ============================================================================


@router.get("/{project_id}/integrations")
async def get_integrations(project_id: str, request: Request):
    """Get all integrations for a project"""
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    return team_integration_controller.get_project_integrations(project_id)


@router.get("/{project_id}/integrations/{integration_id}")
async def get_integration(project_id: str, integration_id: str, request: Request):
    """Get details of a specific integration"""
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    return team_integration_controller.get_integration_details(integration_id)


# ============================================================================
# MANAGE INTEGRATIONS
# ============================================================================


@router.put("/{project_id}/integrations/{integration_id}/toggle")
async def toggle_integration(project_id: str, integration_id: str, request: Request):
    """Toggle integration active/inactive status"""
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    try:
        body_str = await request.body()
        body = json.loads(body_str.decode("utf-8"))
    except Exception:
        from utils.response import error_response

        return error_response("Invalid JSON", 400)

    is_active = body.get("is_active", True)

    return team_integration_controller.update_integration_status(
        integration_id, is_active
    )


@router.delete("/{project_id}/integrations/{integration_id}")
async def disconnect_integration(
    project_id: str, integration_id: str, request: Request
):
    """Disconnect an integration"""
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    return team_integration_controller.disconnect_integration(integration_id)


# ============================================================================
# TEST & SEND
# ============================================================================


@router.post("/{project_id}/integrations/{integration_id}/test")
async def test_integration(project_id: str, integration_id: str, request: Request):
    """Test an integration by sending a test message"""
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    return team_integration_controller.test_integration(integration_id)


@router.post("/{project_id}/integrations/discord/send")
async def send_discord_message(project_id: str, request: Request):
    """
    Send a message to the project's Discord integration

    Body:
        {
            "message": "Message content",
            "title": "Optional title"
        }
    """
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    try:
        body_str = await request.body()
        body = json.loads(body_str.decode("utf-8"))
    except Exception:
        from utils.response import error_response

        return error_response("Invalid JSON", 400)

    message = body.get("message")
    title = body.get("title", "DOIT Notification")

    if not message:
        from utils.response import error_response

        return error_response("Missing required: message", 400)

    from utils.response import success_response

    result = team_integration_controller.send_discord_message(
        project_id, message, title
    )

    if "error" in result:
        from utils.response import error_response

        return error_response(result["error"], 400)

    return success_response(result)


@router.post("/{project_id}/integrations/send")
async def send_to_platform(project_id: str, request: Request):
    """
    Send a notification to project integrations

    Body:
        {
            "platform": "discord|slack|teams",
            "message": "Message content",
            "title": "Optional title"
        }
    """
    user_id = get_user_id_from_request(request)
    if not user_id:
        from utils.response import error_response

        return error_response("Unauthorized", 401)

    try:
        body_str = await request.body()
        body = json.loads(body_str.decode("utf-8"))
    except Exception:
        from utils.response import error_response

        return error_response("Invalid JSON", 400)

    platform = body.get("platform")
    message = body.get("message")
    title = body.get("title", "DOIT Notification")

    if not all([platform, message]):
        from utils.response import error_response

        return error_response("Missing required: platform, message", 400)

    from utils.response import success_response

    result = team_integration_controller.send_notification_to_platform(
        project_id, platform, message, title
    )

    if "error" in result:
        from utils.response import error_response

        return error_response(result["error"], 400)

    return success_response(result)
