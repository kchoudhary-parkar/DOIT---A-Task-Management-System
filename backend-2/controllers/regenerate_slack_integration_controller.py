import os
from models.project import Project
from models.team_integration import TeamIntegration
from utils.response import success_response, error_response
from controllers.team_integration_controller import setup_slack_integration


def regenerate_slack_integration(
    project_id: str, user_id: str, new_workspace_token: str
):
    """
    Allows admin to regenerate Slack integration for a project with a new workspace token.
    Deletes old integration and provisions a new one.
    """
    project = Project.find_by_id(project_id)
    if not project:
        return error_response("Project not found", 404)

    # Remove old Slack integration(s)
    old_integrations = TeamIntegration.find_by_project_and_platform(project_id, "slack")
    if old_integrations:
        if isinstance(old_integrations, list):
            for integ in old_integrations:
                TeamIntegration.delete(str(integ["_id"]))
        else:
            TeamIntegration.delete(str(old_integrations["_id"]))

    # Provision new Slack integration
    result = setup_slack_integration(project_id, user_id, new_workspace_token)
    if "error" in result:
        return error_response(
            f"Failed to regenerate Slack integration: {result['error']}", 400
        )
    return success_response(
        {
            "message": "Slack integration regenerated",
            "integration": result.get("data", {}).get("integration"),
        }
    )
