import json
from models.project import Project
from models.user import User
from utils.response import success_response, error_response
from utils.validators import validate_required_fields
from bson import ObjectId


def create_project(body_str, user_id):
    """
    Create a new project with optional auto-provisioning of integrations

    Requires admin or super-admin role

    Body:
        {
            "name": "Project name",
            "description": "Optional description",
            "integrations": {
                "discord": {
                    "guild_id": "...",
                    "bot_token": "..."
                },
                "slack": {
                    "workspace_token": "..."
                },
                "teams": {
                    "team_id": "...",
                    "access_token": "..."
                }
            }
        }
    """
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Check if user has admin or super-admin role
    user = User.find_by_id(user_id)
    if not user:
        return error_response("User not found", 404)

    user_role = user.get("role", "member")
    if user_role not in ["admin", "super-admin"]:
        return error_response("Access denied. Only admins can create projects.", 403)

    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)

    # Validate required fields
    required = ["name"]
    validation_error = validate_required_fields(data, required)
    if validation_error:
        return error_response(validation_error, 400)

    # Validate name length
    if len(data["name"].strip()) < 3:
        return error_response("Project name must be at least 3 characters", 400)

    # Create project with user_id
    project_data = {
        "name": data["name"].strip(),
        "description": data.get("description", "").strip(),
        "user_id": user_id,
    }

    project = Project.create(project_data)

    # Convert ObjectId to string for JSON response
    project["_id"] = str(project["_id"])
    project["created_at"] = project["created_at"].isoformat()
    project["updated_at"] = project["updated_at"].isoformat()

    # Auto-provision integrations if provided

    from controllers import team_integration_controller

    integrations_to_provision = data.get("integrations", {})
    provisioning_results = {}

    # Always auto-provision Slack channel using default token if not provided
    import os

    default_slack_token = os.getenv("SLACK_DEFAULT_WORKSPACE_TOKEN")
    slack_token = None
    if "slack" in integrations_to_provision:
        slack_token = integrations_to_provision["slack"].get("workspace_token")
    if not slack_token:
        slack_token = default_slack_token
    if slack_token:
        result = team_integration_controller.setup_slack_integration(
            str(project["_id"]), user_id, slack_token
        )
        if "error" not in result:
            provisioning_results["slack"] = result.get("data", {}).get(
                "message", "Provisioned"
            )

    # Discord (optional, only if provided)
    if "discord" in integrations_to_provision:
        discord_config = integrations_to_provision["discord"]
        result = team_integration_controller.setup_discord_integration(
            str(project["_id"]),
            user_id,
            discord_config.get("guild_id"),
            discord_config.get("bot_token"),
        )
        if "error" not in result:
            provisioning_results["discord"] = result.get("data", {}).get(
                "message", "Provisioned"
            )

    # Teams (optional, only if provided)
    if "teams" in integrations_to_provision:
        teams_config = integrations_to_provision["teams"]
        if teams_config.get("webhook_url"):
            result = team_integration_controller.setup_teams_integration(
                str(project["_id"]),
                user_id,
                webhook_url=teams_config.get("webhook_url"),
            )
        else:
            result = team_integration_controller.setup_teams_integration(
                str(project["_id"]),
                user_id,
                team_id=teams_config.get("team_id"),
                access_token=teams_config.get("access_token"),
            )
        if "error" not in result:
            provisioning_results["teams"] = result.get("data", {}).get(
                "message", "Provisioned"
            )

    response_data = {"message": "Project created successfully", "project": project}

    if provisioning_results:
        response_data["integrations_provisioned"] = provisioning_results

    return success_response(response_data, 201)


def get_user_projects(user_id):
    """Get all projects for the logged-in user (owned or member)"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Get projects where user is owner or member
    projects_list = Project.find_by_user_or_member(user_id)

    # Convert ObjectId and datetime to strings
    for project in projects_list:
        project["_id"] = str(project["_id"])
        project["created_at"] = project["created_at"].isoformat()
        project["updated_at"] = project["updated_at"].isoformat()
        # Add owner_id for frontend
        project["owner_id"] = project["user_id"]
        # Add flag to indicate if current user is the owner
        project["is_owner"] = project["user_id"] == user_id

    return success_response({"projects": projects_list, "count": len(projects_list)})


def get_project_by_id(project_id, user_id):
    """Get a specific project by ID"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    project = Project.find_by_id(project_id)

    if not project:
        return error_response("Project not found", 404)

    # Check if user is owner or member of this project
    if not Project.is_member(project_id, user_id):
        return error_response(
            "Access denied. You are not a member of this project.", 403
        )

    # Convert ObjectId and datetime to strings
    project["_id"] = str(project["_id"])
    project["created_at"] = project["created_at"].isoformat()
    project["updated_at"] = project["updated_at"].isoformat()

    # Add owner_id for frontend to determine permissions
    project["owner_id"] = project["user_id"]

    return success_response({"project": project})


def update_project(body_str, project_id, user_id):
    """Update a project - only owner can update"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    try:
        data = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)

    # Check if project exists and user owns it
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)

    if project["user_id"] != user_id:
        return error_response("Access denied. You don't own this project.", 403)

    # Prepare update data
    update_data = {}
    if "name" in data and data["name"].strip():
        if len(data["name"].strip()) < 3:
            return error_response("Project name must be at least 3 characters", 400)
        update_data["name"] = data["name"].strip()

    if "description" in data:
        update_data["description"] = data["description"].strip()

    if not update_data:
        return error_response("No valid fields to update", 400)

    # Update project
    success = Project.update(project_id, update_data)

    if success:
        updated_project = Project.find_by_id(project_id)
        updated_project["_id"] = str(updated_project["_id"])
        updated_project["created_at"] = updated_project["created_at"].isoformat()
        updated_project["updated_at"] = updated_project["updated_at"].isoformat()

        return success_response(
            {"message": "Project updated successfully", "project": updated_project}
        )
    else:
        return error_response("Failed to update project", 500)


def delete_project(project_id, user_id):
    """Delete a project - only owner can delete"""
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)

    # Check if project exists and user owns it
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)

    if project["user_id"] != user_id:
        return error_response("Access denied. You don't own this project.", 403)

    # Delete project
    success = Project.delete(project_id)

    if success:
        return success_response({"message": "Project deleted successfully"})
    else:
        return error_response("Failed to delete project", 500)
