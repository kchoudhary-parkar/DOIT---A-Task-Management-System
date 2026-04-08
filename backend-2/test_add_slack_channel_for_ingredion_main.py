"""
Test script to create a test Slack channel integration for the 'Ingredion Main' project.
This will create a document in the 'team_integrations' collection for Slack, simulating a new channel for the project.
"""

from pymongo import MongoClient
from config import MONGO_URI

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client["taskdb"]

# Find the 'Ingredion Main' project
project = db.projects.find_one({"name": "Ingredion Main"})
if not project:
    print("Project 'Ingredion Main' not found. Please create the project first.")
    exit(1)

# Simulate a new Slack channel integration for the project
integration_doc = {
    "project_id": str(project["_id"]),
    "platform": "slack",
    "type": "bot",
    "created_by": project["user_id"],
    "credentials": {
        "workspace_token": "TEST_WORKSPACE_TOKEN",
        "channel_id": "TEST_SLACK_CHANNEL_ID",
        "channel_name": "ingredion-main-slack-test",
        "auto_provisioned": True,
    },
    "auto_provisioned": True,
    "channel_id": "TEST_SLACK_CHANNEL_ID",
    "channel_name": "ingredion-main-slack-test",
    "is_active": True,
    "created_at": project["created_at"],
    "updated_at": project["updated_at"],
}

result = db.team_integrations.insert_one(integration_doc)
print(
    f"Test Slack channel integration created for 'Ingredion Main' with _id: {result.inserted_id}"
)
