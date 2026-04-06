import requests
import logging
import json
import os

logger = logging.getLogger(__name__)

def send_discord_notification(webhook_url: str, content: str, title: str = "DOIT Notification", color: int = 0x6366F1):
    """Send a notification to a Discord channel via webhook."""
    if not webhook_url:
        return "❌ Discord Webhook URL is missing."
    
    payload = {
        "embeds": [
            {
                "title": title,
                "description": content,
                "color": color,
                "footer": {"text": "DOIT AI Assistant"}
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

def send_teams_notification(webhook_url: str, text: str, title: str = "DOIT Alert"):
    """Send a notification to a Microsoft Teams channel via webhook."""
    if not webhook_url:
        return "❌ Teams Webhook URL is missing."
    
    # Simple actionable message card or standard text
    payload = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "6366F1",
        "summary": title,
        "sections": [{
            "activityTitle": title,
            "text": text
        }]
    }
    
    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        return f"✅ Teams notification sent successfully!"
    except Exception as e:
        logger.error(f"Error sending Teams notification: {e}")
        return f"❌ Failed to reach Teams: {str(e)}"

def send_slack_notification(webhook_url: str, text: str):
    """Send a notification to a Slack channel via webhook."""
    if not webhook_url:
        return "❌ Slack Webhook URL is missing."
    
    payload = {"text": text}
    
    try:
        response = requests.post(webhook_url, json=payload)
        response.raise_for_status()
        return f"✅ Slack notification sent successfully!"
    except Exception as e:
        logger.error(f"Error sending Slack notification: {e}")
        return f"❌ Failed to reach Slack: {str(e)}"
