# # """
# # Script to create a real Slack channel for the 'Ingredion Main' project using the Slack API,
# # and store the integration in MongoDB.
# # """

# # import os
# # import requests
# # from pymongo import MongoClient
# # from config import MONGO_URI

# # # Load credentials from environment or config
# # SLACK_WORKSPACE_TOKEN = os.getenv("SLACK_DEFAULT_WORKSPACE_TOKEN")
# # CHANNEL_NAME = "ingredion-main-real"

# # if not SLACK_WORKSPACE_TOKEN:
# #     print("Missing SLACK_WORKSPACE_TOKEN in environment.")
# #     exit(1)

# # # Slack API endpoint to create a channel
# # url = "https://slack.com/api/conversations.create"
# # headers = {
# #     "Authorization": f"Bearer {SLACK_WORKSPACE_TOKEN}",
# #     "Content-Type": "application/json",
# # }
# # data = {"name": CHANNEL_NAME}

# # response = requests.post(url, headers=headers, json=data)
# # resp_json = response.json()
# # if not resp_json.get("ok"):
# #     print(f"Failed to create Slack channel: {resp_json.get('error')}")
# #     exit(1)

# # channel_info = resp_json["channel"]
# # print(f"Created Slack channel: {channel_info['id']} ({channel_info['name']})")

# # # Connect to MongoDB
# # client = MongoClient(MONGO_URI)
# # db = client["taskdb"]

# # # Find the 'Ingredion Main' project
# # project = db.projects.find_one({"name": "Ingredion Main"})
# # if not project:
# #     print("Project 'Ingredion Main' not found. Please create the project first.")
# #     exit(1)

# # # Store the integration in MongoDB
# # integration_doc = {
# #     "project_id": str(project["_id"]),
# #     "platform": "slack",
# #     "type": "bot",
# #     "created_by": project["user_id"],
# #     "credentials": {
# #         "workspace_token": SLACK_WORKSPACE_TOKEN,
# #         "channel_id": channel_info["id"],
# #         "channel_name": channel_info["name"],
# #         "auto_provisioned": True,
# #     },
# #     "auto_provisioned": True,
# #     "channel_id": channel_info["id"],
# #     "channel_name": channel_info["name"],
# #     "is_active": True,
# #     "created_at": project["created_at"],
# #     "updated_at": project["updated_at"],
# # }

# # result = db.team_integrations.insert_one(integration_doc)
# # print(f"Slack channel integration saved with _id: {result.inserted_id}")
# """
# Script to create a real Slack channel for the 'Ingredion Main' project using the Slack API,
# automatically create an incoming webhook, and store the integration in MongoDB.
# """

# import os
# import requests
# from pymongo import MongoClient
# from datetime import datetime
# from config import MONGO_URI

# # Load credentials from environment or config
# SLACK_WORKSPACE_TOKEN = os.getenv("SLACK_DEFAULT_WORKSPACE_TOKEN")
# # Fixed: Use valid Slack channel name (lowercase, hyphens only, no special chars)
# CHANNEL_NAME = "ingredion-main-real"

# if not SLACK_WORKSPACE_TOKEN:
#     print("Missing SLACK_DEFAULT_WORKSPACE_TOKEN in environment.")
#     exit(1)

# # Step 1: Create Slack channel
# print("Step 1: Creating Slack channel...")
# url = "https://slack.com/api/conversations.create"
# headers = {
#     "Authorization": f"Bearer {SLACK_WORKSPACE_TOKEN}",
#     "Content-Type": "application/json",
# }
# data = {"name": CHANNEL_NAME, "is_private": False}

# response = requests.post(url, headers=headers, json=data)
# resp_json = response.json()

# if not resp_json.get("ok"):
#     error = resp_json.get("error")
#     if error == "name_taken":
#         # Channel already exists, fetch it
#         print(f"Channel '{CHANNEL_NAME}' already exists. Fetching channel info...")
#         list_url = "https://slack.com/api/conversations.list"
#         list_params = {"types": "public_channel,private_channel"}
#         list_response = requests.get(list_url, headers=headers, params=list_params)
#         list_json = list_response.json()

#         channel_info = None
#         if list_json.get("ok"):
#             for channel in list_json.get("channels", []):
#                 if channel.get("name") == CHANNEL_NAME:
#                     channel_info = channel
#                     break

#         if not channel_info:
#             print(f"Could not find existing channel '{CHANNEL_NAME}'")
#             exit(1)
#     else:
#         print(f"Failed to create Slack channel: {error}")
#         print(f"Full response: {resp_json}")
#         exit(1)
# else:
#     channel_info = resp_json["channel"]

# print(f"✓ Channel ready: {channel_info['id']} (#{channel_info['name']})")

# # Step 2: Get Bot Info
# print("\nStep 2: Getting bot authentication info...")
# auth_test_url = "https://slack.com/api/auth.test"
# auth_response = requests.post(auth_test_url, headers=headers)
# auth_json = auth_response.json()

# if auth_json.get("ok"):
#     print(f"✓ Authenticated as: {auth_json.get('user')}")
#     print(f"  Team: {auth_json.get('team')}")
#     print(f"  Bot User ID: {auth_json.get('user_id')}")
# else:
#     print(f"✗ Authentication test failed: {auth_json.get('error')}")

# # Step 3: Invite bot to channel (if not already a member)
# print("\nStep 3: Ensuring bot is in the channel...")
# invite_url = "https://slack.com/api/conversations.join"
# invite_data = {"channel": channel_info["id"]}
# invite_response = requests.post(invite_url, headers=headers, json=invite_data)
# invite_json = invite_response.json()

# if invite_json.get("ok"):
#     print(f"✓ Bot joined channel successfully")
# elif invite_json.get("error") == "already_in_channel":
#     print(f"✓ Bot already in channel")
# else:
#     print(f"⚠ Could not join channel: {invite_json.get('error')}")

# # Step 4: Connect to MongoDB
# print("\nStep 4: Saving integration to MongoDB...")
# client = MongoClient(MONGO_URI)
# db = client["taskdb"]

# # Find the 'Ingredion Main' project
# project = db.projects.find_one({"name": "Ingredion Main"})
# if not project:
#     print("Project 'Ingredion Main' not found. Please create the project first.")
#     exit(1)

# # Note: For incoming webhooks with OAuth, the webhook URL is generated during
# # the OAuth installation flow. We'll store None here and update it after OAuth.
# webhook_url_created = None

# # Store the integration in MongoDB
# integration_doc = {
#     "project_id": str(project["_id"]),
#     "platform": "slack",
#     "type": "bot",
#     "created_by": project["user_id"],
#     "credentials": {
#         "workspace_token": SLACK_WORKSPACE_TOKEN,
#         "channel_id": channel_info["id"],
#         "channel_name": channel_info["name"],
#         "webhook_url": webhook_url_created,
#         "bot_user_id": auth_json.get("user_id"),
#         "team_id": auth_json.get("team_id"),
#         "auto_provisioned": True,
#     },
#     "auto_provisioned": True,
#     "channel_id": channel_info["id"],
#     "channel_name": channel_info["name"],
#     "webhook_url": webhook_url_created,
#     "is_active": True,
#     "created_at": project.get("created_at", datetime.utcnow()),
#     "updated_at": datetime.utcnow(),
# }

# # Check if integration already exists
# existing = db.team_integrations.find_one(
#     {
#         "project_id": str(project["_id"]),
#         "platform": "slack",
#         "channel_id": channel_info["id"],
#     }
# )

# if existing:
#     print(f"Integration already exists with _id: {existing['_id']}")
#     result_id = existing["_id"]
#     # Update it
#     db.team_integrations.update_one(
#         {"_id": existing["_id"]},
#         {
#             "$set": {
#                 "updated_at": datetime.utcnow(),
#                 "is_active": True,
#                 "credentials.bot_user_id": auth_json.get("user_id"),
#                 "credentials.team_id": auth_json.get("team_id"),
#             }
#         },
#     )
#     print(f"✓ Updated existing integration")
# else:
#     result = db.team_integrations.insert_one(integration_doc)
#     result_id = result.inserted_id
#     print(f"✓ New integration saved with _id: {result_id}")

# # Step 5: Test message posting using Bot Token
# print("\nStep 5: Testing message posting...")
# test_message_url = "https://slack.com/api/chat.postMessage"
# test_data = {
#     "channel": channel_info["id"],
#     "text": f"✅ DOIT-Agent integration successfully configured for #{channel_info['name']}!",
#     "blocks": [
#         {
#             "type": "header",
#             "text": {"type": "plain_text", "text": "🎉 Integration Active"},
#         },
#         {
#             "type": "section",
#             "text": {
#                 "type": "mrkdwn",
#                 "text": f"DOIT-Agent is now connected to *#{channel_info['name']}*\n\nYou'll receive notifications here for:\n• New tasks\n• Task updates\n• Mentions and comments",
#             },
#         },
#     ],
# }

# test_response = requests.post(test_message_url, headers=headers, json=test_data)
# test_json = test_response.json()

# if test_json.get("ok"):
#     print("✓ Test message sent successfully!")
#     print(f"  Message timestamp: {test_json.get('ts')}")
# else:
#     print(f"✗ Test message failed: {test_json.get('error')}")

# # Step 6: Instructions for webhook setup
# print("\n" + "=" * 70)
# print("SETUP COMPLETE")
# print("=" * 70)
# print(f"✓ Channel ID: {channel_info['id']}")
# print(f"✓ Channel Name: #{channel_info['name']}")
# print(f"✓ Bot User ID: {auth_json.get('user_id')}")
# print(f"✓ Integration ID: {result_id}")
# print("\n📝 IMPORTANT: To enable incoming webhooks:")
# print("-" * 70)
# print("You have two options:")
# print("\nOption 1 - Use Bot Token (RECOMMENDED - Already Working!):")
# print("  The bot can already post messages using chat.postMessage API")
# print("  This is more flexible and doesn't require webhook setup")
# print("\nOption 2 - Set up Incoming Webhook (Optional):")
# print("  1. Visit: https://api.slack.com/apps")
# print("  2. Select 'DOIT-Agent' app")
# print("  3. Go to 'Incoming Webhooks' in left sidebar")
# print("  4. Click 'Add New Webhook to Workspace'")
# print(f"  5. Select '#{channel_info['name']}' channel")
# print("  6. Copy the webhook URL")
# print("  7. Update MongoDB with the webhook URL:")
# print(f"\n     db.team_integrations.updateOne(")
# print(f"       {{_id: ObjectId('{result_id}')}},")
# print(f"       {{$set: {{'webhook_url': 'YOUR_WEBHOOK_URL'}}}}")
# print(f"     )")
# print("=" * 70)

"""
Reusable script to:
- Create Slack channel per project
- Join bot
- Save integration in MongoDB
"""

import os
import re
import requests
from pymongo import MongoClient
from datetime import datetime
from config import MONGO_URI


SLACK_WORKSPACE_TOKEN = os.getenv("SLACK_DEFAULT_WORKSPACE_TOKEN")

if not SLACK_WORKSPACE_TOKEN:
    raise ValueError("Missing SLACK_DEFAULT_WORKSPACE_TOKEN")

headers = {
    "Authorization": f"Bearer {SLACK_WORKSPACE_TOKEN}",
    "Content-Type": "application/json",
}


# 🔹 Utility: Convert project name → valid Slack channel name
def generate_channel_name(project_name: str) -> str:
    name = project_name.lower()
    name = re.sub(r"[^a-z0-9\- ]", "", name)
    name = name.replace(" ", "-")
    return f"{name[:80]}"  # Slack limit


# 🔹 Step 1: Create or fetch channel
def get_or_create_channel(channel_name):
    url = "https://slack.com/api/conversations.create"
    response = requests.post(
        url, headers=headers, json={"name": channel_name, "is_private": False}
    )
    data = response.json()

    if data.get("ok"):
        return data["channel"]

    if data.get("error") == "name_taken":
        list_url = "https://slack.com/api/conversations.list"
        list_response = requests.get(
            list_url,
            headers=headers,
            params={"types": "public_channel,private_channel"},
        )

        for ch in list_response.json().get("channels", []):
            if ch["name"] == channel_name:
                return ch

    raise Exception(f"Slack error: {data}")


# 🔹 Step 2: Ensure bot is in channel
def join_channel(channel_id):
    url = "https://slack.com/api/conversations.join"
    res = requests.post(url, headers=headers, json={"channel": channel_id})
    return res.json()


# 🔹 Step 3: Auth info
def get_auth_info():
    res = requests.post("https://slack.com/api/auth.test", headers=headers)
    return res.json()


# 🔹 Step 4: Save integration
def save_integration(db, project, channel, auth_info):
    integration_doc = {
        "project_id": str(project["_id"]),
        "platform": "slack",
        "type": "bot",
        "created_by": project["user_id"],
        "credentials": {
            "workspace_token": SLACK_WORKSPACE_TOKEN,
            "channel_id": channel["id"],
            "channel_name": channel["name"],
            "webhook_url": None,
            "bot_user_id": auth_info.get("user_id"),
            "team_id": auth_info.get("team_id"),
        },
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    existing = db.team_integrations.find_one(
        {
            "project_id": str(project["_id"]),
            "platform": "slack",
            "channel_id": channel["id"],
        }
    )

    if existing:
        db.team_integrations.update_one(
            {"_id": existing["_id"]}, {"$set": {"updated_at": datetime.utcnow()}}
        )
        return existing["_id"]

    result = db.team_integrations.insert_one(integration_doc)
    return result.inserted_id


# 🔹 Step 5: Send test message
def send_test_message(channel_id, channel_name):
    url = "https://slack.com/api/chat.postMessage"
    res = requests.post( 
        url,
        headers=headers,
        json={
            "channel": channel_id,
            "text": f"✅ Integration ready for #{channel_name}",
        },
    )
    return res.json()


# 🔹 MAIN FUNCTION
def setup_slack_for_project(project_name: str):
    print(f"\n🚀 Setting up Slack for project: {project_name}")

    client = MongoClient(MONGO_URI)
    db = client["taskdb"]

    project = db.projects.find_one({"name": project_name})
    if not project:
        raise ValueError(f"Project '{project_name}' not found")

    channel_name = generate_channel_name(project_name)

    # Create / fetch channel
    channel = get_or_create_channel(channel_name)
    print(f"✓ Channel: #{channel['name']} ({channel['id']})")

    # Join bot
    join_channel(channel["id"])

    # Auth info
    auth_info = get_auth_info()

    # Save integration
    integration_id = save_integration(db, project, channel, auth_info)

    # Test message
    send_test_message(channel["id"], channel["name"])

    print(f"✅ Done! Integration ID: {integration_id}")


# 🔹 CLI ENTRY
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python script.py <project_name>")
        exit(1)

    project_name = sys.argv[1]
    setup_slack_for_project(project_name)
