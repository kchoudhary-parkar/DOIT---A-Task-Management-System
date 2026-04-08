"""
Real Slack integration debug script.

What it does:
- Finds project by name in MongoDB
- Creates or reuses Slack channel
- Ensures bot joins channel
- Saves/updates Slack integration in MongoDB
- Invites a user to the channel by email
- Verifies if user is in channel (best effort)

Usage:
  python create_real_slack_channel_for_ingredion_main.py "Ingredion Main" --email someone@company.com
  python create_real_slack_channel_for_ingredion_main.py "Ingredion Main"

Environment variables:
  SLACK_DEFAULT_WORKSPACE_TOKEN   Required (xoxb-...)
  SLACK_INVITE_USER_TOKEN         Optional (xoxp-... fallback for lookup/invite)
  SLACK_TEST_USER_EMAIL           Optional fallback email when --email is omitted
"""

import argparse
import os
import re
from datetime import datetime

import requests
from pymongo import MongoClient

from config import MONGO_URI


SLACK_API_BASE = "https://slack.com/api"
WORKSPACE_TOKEN = os.getenv("SLACK_DEFAULT_WORKSPACE_TOKEN")
INVITE_USER_TOKEN = os.getenv("SLACK_INVITE_USER_TOKEN")


def _mask_token(token: str) -> str:
    if not token:
        return "<missing>"
    if len(token) < 10:
        return "***"
    return f"{token[:6]}...{token[-4:]}"


def _slack_get(method: str, token: str, params=None):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(
        f"{SLACK_API_BASE}/{method}", headers=headers, params=params or {}, timeout=15
    )
    return resp.json()


def _slack_post(method: str, token: str, payload=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    resp = requests.post(
        f"{SLACK_API_BASE}/{method}", headers=headers, json=payload or {}, timeout=15
    )
    return resp.json()


def generate_channel_name(project_name: str) -> str:
    name = project_name.lower().strip()
    name = re.sub(r"[^a-z0-9\- ]", "", name)
    name = name.replace(" ", "-")
    return name[:80]


def get_or_create_channel(workspace_token: str, channel_name: str):
    created = _slack_post(
        "conversations.create",
        workspace_token,
        {"name": channel_name, "is_private": False},
    )
    if created.get("ok"):
        return created["channel"], "created"

    if created.get("error") == "name_taken":
        listed = _slack_get(
            "conversations.list",
            workspace_token,
            {"types": "public_channel,private_channel", "limit": 1000},
        )
        if listed.get("ok"):
            for ch in listed.get("channels", []):
                if ch.get("name") == channel_name:
                    return ch, "existing"
        raise RuntimeError(f"Channel exists but could not fetch it. Response: {listed}")

    raise RuntimeError(f"conversations.create failed: {created}")


def join_channel(workspace_token: str, channel_id: str):
    return _slack_post("conversations.join", workspace_token, {"channel": channel_id})


def auth_test(workspace_token: str):
    return _slack_post("auth.test", workspace_token, {})


def save_integration(db, project, channel, auth_info, workspace_token):
    now = datetime.utcnow()
    integration_doc = {
        "project_id": str(project["_id"]),
        "platform": "slack",
        "type": "bot",
        "created_by": project["user_id"],
        "credentials": {
            "workspace_token": workspace_token,
            "channel_id": channel["id"],
            "channel_name": channel["name"],
            "webhook_url": None,
            "bot_user_id": auth_info.get("user_id"),
            "team_id": auth_info.get("team_id"),
            "auto_provisioned": True,
        },
        "auto_provisioned": True,
        "channel_id": channel["id"],
        "channel_name": channel["name"],
        "is_active": True,
        "created_at": project.get("created_at", now),
        "updated_at": now,
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
            {"_id": existing["_id"]},
            {
                "$set": {
                    "updated_at": now,
                    "is_active": True,
                    "credentials.workspace_token": workspace_token,
                    "credentials.channel_id": channel["id"],
                    "credentials.channel_name": channel["name"],
                    "credentials.bot_user_id": auth_info.get("user_id"),
                    "credentials.team_id": auth_info.get("team_id"),
                }
            },
        )
        return existing["_id"], "updated"

    result = db.team_integrations.insert_one(integration_doc)
    return result.inserted_id, "inserted"


def lookup_user_id_by_email(email: str):
    lookup_token = INVITE_USER_TOKEN or WORKSPACE_TOKEN
    result = _slack_get("users.lookupByEmail", lookup_token, {"email": email})
    if result.get("ok"):
        return result.get("user", {}).get("id"), lookup_token, result
    return None, lookup_token, result


def invite_user(channel_id: str, user_id: str):
    errors = []
    tokens = [WORKSPACE_TOKEN]
    if INVITE_USER_TOKEN and INVITE_USER_TOKEN != WORKSPACE_TOKEN:
        tokens.append(INVITE_USER_TOKEN)

    for token in tokens:
        invite_result = _slack_post(
            "conversations.invite", token, {"channel": channel_id, "users": user_id}
        )
        if invite_result.get("ok") or invite_result.get("error") in [
            "already_in_channel",
            "cant_invite_self",
        ]:
            return True, token, invite_result, errors
        errors.append({"token": _mask_token(token), "response": invite_result})

    return False, None, None, errors


def verify_membership(channel_id: str, user_id: str):
    tokens = [WORKSPACE_TOKEN]
    if INVITE_USER_TOKEN and INVITE_USER_TOKEN != WORKSPACE_TOKEN:
        tokens.append(INVITE_USER_TOKEN)

    for token in tokens:
        members = _slack_get(
            "conversations.members", token, {"channel": channel_id, "limit": 1000}
        )
        if members.get("ok"):
            return user_id in set(members.get("members", [])), token, members

    return None, None, {"error": "Could not read channel members with available tokens"}


def get_default_test_email(project: dict):
    env_email = os.getenv("SLACK_TEST_USER_EMAIL")
    if env_email:
        return env_email.strip().lower(), "env"

    members = project.get("members", [])
    for member in members:
        email = (member.get("email") or "").strip().lower()
        if email:
            return email, "project_member"

    # Fallback to project owner email if available.
    try:
        client = MongoClient(MONGO_URI)
        db = client["taskdb"]
        owner = db.users.find_one(
            {"_id": __import__("bson").ObjectId(project.get("user_id"))}
        )
        owner_email = (owner or {}).get("email", "").strip().lower()
        if owner_email:
            return owner_email, "project_owner"
    except Exception:
        pass

    return None, "none"


def main():
    parser = argparse.ArgumentParser(
        description="Debug Slack channel + member invite for a project"
    )
    parser.add_argument("project_name", nargs="?", default="Ingredion Main")
    parser.add_argument(
        "--email",
        dest="email",
        default=None,
        help="User email to invite to project Slack channel",
    )
    args = parser.parse_args()

    if not WORKSPACE_TOKEN:
        raise ValueError("Missing SLACK_DEFAULT_WORKSPACE_TOKEN")

    print("=== Slack Debug Runner ===")
    print(f"Workspace token: {_mask_token(WORKSPACE_TOKEN)}")
    print(f"Invite user token: {_mask_token(INVITE_USER_TOKEN)}")

    client = MongoClient(MONGO_URI)
    db = client["taskdb"]

    project = db.projects.find_one({"name": args.project_name})
    if not project:
        raise ValueError(f"Project '{args.project_name}' not found")

    print(f"Project found: {project.get('name')} ({project.get('_id')})")

    channel_name = generate_channel_name(args.project_name)
    channel, mode = get_or_create_channel(WORKSPACE_TOKEN, channel_name)
    print(f"Channel {mode}: #{channel['name']} ({channel['id']})")

    join_result = join_channel(WORKSPACE_TOKEN, channel["id"])
    print(f"Join result: {join_result.get('ok')} error={join_result.get('error')}")

    auth_info = auth_test(WORKSPACE_TOKEN)
    print(
        f"Auth test: ok={auth_info.get('ok')} user_id={auth_info.get('user_id')} team={auth_info.get('team')}"
    )

    integration_id, save_mode = save_integration(
        db, project, channel, auth_info, WORKSPACE_TOKEN
    )
    print(f"Integration {save_mode}: {integration_id}")

    test_message = _slack_post(
        "chat.postMessage",
        WORKSPACE_TOKEN,
        {
            "channel": channel["id"],
            "text": f"✅ Debug setup confirmed for #{channel['name']}",
        },
    )
    print(
        f"Message post: ok={test_message.get('ok')} error={test_message.get('error')}"
    )

    invite_email = (args.email or "").strip().lower()
    if not invite_email:
        invite_email, source = get_default_test_email(project)
        print(f"Invite email source: {source}")

    if not invite_email:
        print(
            "No test email provided and no project member email available. Skipping invite test."
        )
        return

    print(f"Invite target email: {invite_email}")

    user_id, used_lookup_token, lookup_resp = lookup_user_id_by_email(invite_email)
    print(f"Lookup token used: {_mask_token(used_lookup_token)}")
    if not user_id:
        print(f"Lookup failed: {lookup_resp}")
        return

    print(f"Resolved Slack user_id: {user_id}")

    invited, invite_token, invite_resp, invite_errors = invite_user(
        channel["id"], user_id
    )
    if invited:
        print(
            f"Invite success with token: {_mask_token(invite_token)} response={invite_resp}"
        )
    else:
        print("Invite failed with all available tokens.")
        print(f"Invite attempts: {invite_errors}")

    in_channel, verify_token, verify_resp = verify_membership(channel["id"], user_id)
    print(f"Membership verification token: {_mask_token(verify_token)}")
    print(f"Membership result: {in_channel}")
    if in_channel is None:
        print(f"Verify response: {verify_resp}")


if __name__ == "__main__":
    main()
