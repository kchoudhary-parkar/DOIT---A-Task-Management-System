import requests
import logging
import json
import os

logger = logging.getLogger(__name__)

# ============================================================================
# DISCORD (Webhook-based)
# ============================================================================


def send_discord_notification(
    webhook_url: str,
    content: str,
    title: str = "DOIT Notification",
    color: int = 0x6366F1,
):
    """Send a notification to a Discord channel via webhook."""
    if not webhook_url:
        return "❌ Discord Webhook URL is missing."

    payload = {
        "embeds": [
            {
                "title": title,
                "description": content,
                "color": color,
                "footer": {"text": "DOIT AI Assistant"},
            }
        ]
    }

    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        return f"✅ Discord notification sent successfully!"
    except Exception as e:
        logger.error(f"Error sending Discord notification: {e}")
        return f"❌ Failed to reach Discord: {str(e)}"


# ============================================================================
# MICROSOFT TEAMS (Webhook-based OR Graph API-based)
# ============================================================================


def send_teams_notification_webhook(
    webhook_url: str, text: str, title: str = "DOIT Alert"
):
    """Send a notification to a Microsoft Teams channel via webhook (legacy)."""
    if not webhook_url:
        return "❌ Teams Webhook URL is missing."

    # Simple actionable message card or standard text
    payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "6366F1",
        "summary": title,
        "sections": [{"activityTitle": title, "text": text}],
    }

    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        return f"✅ Teams notification sent successfully!"
    except Exception as e:
        logger.error(f"Error sending Teams notification: {e}")
        return f"❌ Failed to reach Teams: {str(e)}"


def send_teams_notification_graph_api(
    team_id: str,
    channel_id: str,
    access_token: str,
    text: str,
    title: str = "DOIT Alert",
):
    """Send a notification to a Microsoft Teams channel via Graph API (recommended)."""
    if not all([team_id, channel_id, access_token]):
        return "❌ Teams Graph API credentials missing."

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    message_body = f"**{title}**\n\n{text}"

    payload = {"body": {"content": message_body}}

    try:
        response = requests.post(
            f"https://graph.microsoft.com/v1.0/teams/{team_id}/channels/{channel_id}/messages",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        return f"✅ Teams notification sent successfully!"
    except Exception as e:
        logger.error(f"Error sending Teams notification via Graph API: {e}")
        return f"❌ Failed to reach Teams: {str(e)}"


def send_teams_notification(
    webhook_url: str = None,
    text: str = "",
    title: str = "DOIT Alert",
    team_id: str = None,
    channel_id: str = None,
    access_token: str = None,
):
    """
    Send a Teams notification using either webhook or Graph API
    Prefers Graph API if credentials available, falls back to webhook
    """
    # Try Graph API first (preferred)
    if all([team_id, channel_id, access_token]):
        return send_teams_notification_graph_api(
            team_id, channel_id, access_token, text, title
        )

    # Fall back to webhook
    if webhook_url:
        return send_teams_notification_webhook(webhook_url, text, title)

    return "❌ Teams credentials missing (need webhook OR team_id/channel_id/access_token)."


# ============================================================================
# SLACK (Webhook-based OR Bot-based)
# ============================================================================


def send_slack_notification_webhook(webhook_url: str, text: str):
    """Send a notification to a Slack channel via webhook (legacy)."""
    if not webhook_url:
        return "❌ Slack Webhook URL is missing."

    payload = {"text": text}

    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        return f"✅ Slack notification sent successfully!"
    except Exception as e:
        logger.error(f"Error sending Slack webhook notification: {e}")
        return f"❌ Failed to reach Slack: {str(e)}"


def send_slack_notification_bot(
    bot_token: str, channel_id: str, text: str, title: str = "DOIT Notification"
):
    """Send a notification to a Slack channel via bot (recommended)."""
    if not all([bot_token, channel_id]):
        return "❌ Slack bot credentials missing."

    headers = {
        "Authorization": f"Bearer {bot_token}",
        "Content-Type": "application/json",
    }

    message = f"*{title}*\n{text}"

    payload = {"channel": channel_id, "text": message}

    try:
        response = requests.post(
            "https://slack.com/api/chat.postMessage", json=payload, headers=headers
        )
        data = response.json()

        if not data.get("ok"):
            error = data.get("error", "Unknown error")
            logger.error(f"Slack API error: {error}")
            return f"❌ Failed to send to Slack: {error}"

        return f"✅ Slack notification sent successfully!"
    except Exception as e:
        logger.error(f"Error sending Slack bot notification: {e}")
        return f"❌ Failed to reach Slack: {str(e)}"


def send_slack_notification(
    webhook_url: str = None,
    text: str = "",
    bot_token: str = None,
    channel_id: str = None,
    title: str = "DOIT Notification",
):
    """
    Send a Slack notification using either bot or webhook
    Prefers bot (xoxb) if credentials available, falls back to webhook
    """
    # Try bot first (recommended)
    if all([bot_token, channel_id]):
        return send_slack_notification_bot(bot_token, channel_id, text, title)

    # Fall back to webhook
    if webhook_url:
        return send_slack_notification_webhook(webhook_url, text)

    return "❌ Slack credentials missing (need webhook OR bot_token/channel_id)."


# ============================================================================
# WHATSAPP
# ============================================================================


def send_whatsapp_notification(instance_id: str, token: str, to: str, message: str):
    """Send a WhatsApp message via UltraMsg API."""
    if not all([instance_id, token, to, message]):
        return "❌ Missing required WhatsApp credentials."

    url = f"https://api.ultramsg.com/{instance_id}/messages/chat"
    payload = f"token={token}&to={to}&body={message}"

    # UltraMsg specific encoding as suggested in their documentation
    payload = payload.encode("utf8").decode("iso-8859-1")
    headers = {"content-type": "application/x-www-form-urlencoded"}

    try:
        response = requests.post(url, data=payload, headers=headers)
        response.raise_for_status()
        return "✅ WhatsApp notification sent successfully!"
    except Exception as e:
        logger.error(f"Error sending WhatsApp notification: {e}")
        return f"❌ Failed to reach WhatsApp: {str(e)}"


# ============================================================================
# GENERIC NOTIFICATION (ROUTER)
# ============================================================================


def send_notification(
    platform: str, message: str, title: str = "DOIT Notification", **kwargs
):
    """
    Universal notification sender

    Args:
        platform: "discord", "slack", "teams", "whatsapp"
        message: Message content
        title: Message title
        **kwargs: Platform-specific parameters
            discord: webhook_url
            slack: webhook_url OR bot_token + channel_id
            teams: webhook_url OR team_id + channel_id + access_token
            whatsapp: instance_id, token, to
    """
    if platform == "discord":
        return send_discord_notification(
            kwargs.get("webhook_url"), message, title, kwargs.get("color", 0x6366F1)
        )
    elif platform == "slack":
        return send_slack_notification(
            webhook_url=kwargs.get("webhook_url"),
            text=message,
            bot_token=kwargs.get("bot_token"),
            channel_id=kwargs.get("channel_id"),
            title=title,
        )
    elif platform == "teams":
        return send_teams_notification(
            webhook_url=kwargs.get("webhook_url"),
            text=message,
            title=title,
            team_id=kwargs.get("team_id"),
            channel_id=kwargs.get("channel_id"),
            access_token=kwargs.get("access_token"),
        )
    elif platform == "whatsapp":
        return send_whatsapp_notification(
            kwargs.get("instance_id"), kwargs.get("token"), kwargs.get("to"), message
        )
    else:
        return f"❌ Unsupported platform: {platform}"
