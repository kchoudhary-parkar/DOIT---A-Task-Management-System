import json
import os
from models.task import Task
from models.project import Project
from models.git_activity import GitBranch, GitCommit, GitPullRequest
from models.team_integration import TeamIntegration
from utils.response import success_response, error_response
from utils.github_utils import extract_ticket_id, decrypt_token, calculate_time_ago
from utils.notification_utils import send_slack_notification
from datetime import datetime, timezone


def _get_project_slack_bot_credentials(project_id):
    """Fetch Slack bot credentials for a project integration."""
    integration = TeamIntegration.find_by_project_and_platform(project_id, "slack")
    if not integration:
        return None, None

    credentials = integration.get("credentials", {}) or {}
    bot_token = credentials.get("workspace_token") or credentials.get("bot_token")
    channel_id = credentials.get("channel_id") or integration.get("channel_id")

    if not all([bot_token, channel_id]):
        return None, None

    return bot_token, channel_id


def _notify_git_event_to_slack(task, event_type, event_payload):
    """Best-effort Slack bot notification for git commit/PR events tied to a task."""
    if not task:
        return

    project_id = task.get("project_id")
    if not project_id:
        return

    bot_token, channel_id = _get_project_slack_bot_credentials(project_id)
    if not all([bot_token, channel_id]):
        return

    ticket_id = task.get("ticket_id", "-")
    task_title = task.get("title", "Untitled task")

    if event_type == "commit":
        commit_sha = event_payload.get("commit_sha", "")
        short_sha = commit_sha[:7] if commit_sha else "-"
        commit_msg = event_payload.get("message", "")
        commit_author = event_payload.get("author", "Unknown")
        branch_name = event_payload.get("branch_name", "-")
        commit_url = event_payload.get("commit_url", "")

        title = "Git Commit Linked"
        body = (
            f"*Ticket {ticket_id}* ({task_title})\n"
            f"A commit was pushed by *{commit_author}* on branch `{branch_name}`\n"
            f"• Commit: `{short_sha}`\n"
            f"• Message: {commit_msg}"
        )
        if commit_url:
            body += f"\n• URL: {commit_url}"

    elif event_type == "pull_request":
        action = event_payload.get("action", "updated")
        pr_number = event_payload.get("pr_number", "-")
        pr_title = event_payload.get("title", "Untitled PR")
        pr_author = event_payload.get("author", "Unknown")
        pr_state = event_payload.get("status", "open")
        pr_url = event_payload.get("pr_url", "")

        title = "Git Pull Request Activity"
        body = (
            f"*Ticket {ticket_id}* ({task_title})\n"
            f"PR #{pr_number} was *{action}* by *{pr_author}*\n"
            f"• Title: {pr_title}\n"
            f"• Status: {pr_state}"
        )
        if pr_url:
            body += f"\n• URL: {pr_url}"

    else:
        return

    notify_result = send_slack_notification(
        bot_token=bot_token,
        channel_id=channel_id,
        text=body,
        title=title,
    )
    print(f"[GIT->SLACK] {event_type} notify result: {notify_result}")


def _pick_latest_commit_event(commits):
    """Return normalized latest commit payload from GitHub commit search results."""
    if not commits:
        return None

    def _commit_ts(item):
        return item.get("commit", {}).get("author", {}).get("date") or ""

    latest = max(commits, key=_commit_ts)
    commit_data = latest.get("commit", {})
    return {
        "commit_sha": latest.get("sha", ""),
        "message": commit_data.get("message", ""),
        "author": commit_data.get("author", {}).get("name", "Unknown"),
        "timestamp": commit_data.get("author", {}).get("date") or "",
        "commit_url": latest.get("html_url", ""),
    }


def _pick_latest_pr_event(pull_requests):
    """Return normalized latest PR payload from GitHub PR search results."""
    if not pull_requests:
        return None

    def _pr_ts(item):
        return item.get("created_at") or item.get("updated_at") or ""

    latest = max(pull_requests, key=_pr_ts)
    status = "open"
    if latest.get("merged"):
        status = "merged"
    elif latest.get("state") == "closed":
        status = "closed"

    return {
        "pr_number": latest.get("number"),
        "title": latest.get("title", "Untitled PR"),
        "author": latest.get("user", {}).get("login", "Unknown"),
        "status": status,
        "pr_url": latest.get("html_url", ""),
        "created_at": latest.get("created_at") or latest.get("updated_at") or "",
    }


def sync_project_git_notifications(project_id, tasks_list):
    """On project visit, notify Slack with latest unseen commit/PR per ticket."""
    try:
        if not project_id or not tasks_list:
            return

        project = Project.find_by_id(project_id)
        if not project:
            return

        git_repo_url = project.get("git_repo_url", "")
        git_access_token = project.get("git_access_token", "")
        if not git_repo_url:
            return

        token = decrypt_token(git_access_token) if git_access_token else os.getenv("GITHUB_TOKEN")
        if not token:
            return

        from database import tasks as tasks_collection
        from utils.github_utils import search_commits, search_pull_requests

        for task in tasks_list:
            ticket_id = task.get("ticket_id")
            task_id = str(task.get("_id") or "")
            if not ticket_id or not task_id:
                continue

            latest_commit = _pick_latest_commit_event(search_commits(git_repo_url, token, ticket_id))
            latest_pr = _pick_latest_pr_event(search_pull_requests(git_repo_url, token, ticket_id))

            db_task = Task.find_by_id(task_id)
            if not db_task:
                continue

            update_fields = {}

            if latest_commit:
                latest_sha = (latest_commit.get("commit_sha") or "")[:7]
                if latest_sha and db_task.get("last_git_commit_slack_sha") != latest_sha:
                    branch_name = db_task.get("ticket_id", "-")
                    _notify_git_event_to_slack(
                        db_task,
                        "commit",
                        {
                            "commit_sha": latest_commit.get("commit_sha", ""),
                            "message": latest_commit.get("message", ""),
                            "author": latest_commit.get("author", "Unknown"),
                            "branch_name": branch_name,
                            "commit_url": latest_commit.get("commit_url", ""),
                        },
                    )
                    update_fields["last_git_commit_slack_sha"] = latest_sha

            if latest_pr:
                latest_pr_number = latest_pr.get("pr_number")
                latest_pr_status = latest_pr.get("status", "open")
                latest_pr_signature = (
                    f"{latest_pr_number}:{latest_pr_status}"
                    if latest_pr_number is not None
                    else ""
                )
                if latest_pr_number is not None and db_task.get("last_git_pr_slack_signature") != latest_pr_signature:
                    action = "opened"
                    if latest_pr_status == "merged":
                        action = "merged"
                    elif latest_pr_status == "closed":
                        action = "closed"

                    _notify_git_event_to_slack(
                        db_task,
                        "pull_request",
                        {
                            "action": action,
                            "pr_number": latest_pr_number,
                            "title": latest_pr.get("title", "Untitled PR"),
                            "author": latest_pr.get("author", "Unknown"),
                            "status": latest_pr_status,
                            "pr_url": latest_pr.get("pr_url", ""),
                        },
                    )
                    update_fields["last_git_pr_slack_number"] = latest_pr_number
                    update_fields["last_git_pr_slack_signature"] = latest_pr_signature

            if update_fields:
                update_fields["last_git_slack_synced_at"] = datetime.now(timezone.utc).replace(tzinfo=None)
                tasks_collection.update_one({"_id": db_task.get("_id")}, {"$set": update_fields})
    except Exception as e:
        print(f"[GIT->SLACK] project visit sync failed: {e}")

def github_webhook(body_str, headers_or_event):
    """
    Handle GitHub webhook events
    
    Events handled:
    - create: Branch created
    - push: Commits pushed
    - pull_request: PR opened/closed/merged
    """
    try:
        payload = json.loads(body_str)
    except:
        return error_response("Invalid JSON", 400)
    
    # Accept either full headers dict or direct event type string.
    event_type = None
    if isinstance(headers_or_event, dict):
        event_type = headers_or_event.get("X-GitHub-Event", headers_or_event.get("x-github-event"))
    elif isinstance(headers_or_event, str):
        event_type = headers_or_event
    
    if not event_type:
        return error_response("Missing X-GitHub-Event header", 400)
    
    print(f"[GITHUB WEBHOOK] Received event: {event_type}")
    
    # Get repository info
    repo_full_name = payload.get("repository", {}).get("full_name")
    repo_url = payload.get("repository", {}).get("html_url")
    
    # Find project by repo URL
    project = Project.find_by_repo_url(repo_url)
    if not project:
        print(f"No project found for repo: {repo_url}")
        return success_response({"message": "Repository not tracked"})
    
    project_id = str(project["_id"])
    
    # Handle different event types
    if event_type == "create" and payload.get("ref_type") == "branch":
        handle_branch_created(payload, project_id)
    
    elif event_type == "push":
        handle_push_event(payload, project_id, repo_full_name)
    
    elif event_type == "pull_request":
        handle_pull_request_event(payload, project_id)
    
    elif event_type == "delete" and payload.get("ref_type") == "branch":
        handle_branch_deleted(payload, project_id)
    
    return success_response({"message": "Webhook processed successfully"})

def handle_branch_created(payload, project_id):
    """Handle branch creation event"""
    branch_name = payload.get("ref")
    repo_url = payload.get("repository", {}).get("html_url")
    
    # Extract ticket ID from branch name
    ticket_id = extract_ticket_id(branch_name)
    if not ticket_id:
        print(f"No ticket ID found in branch: {branch_name}")
        return
    
    # Find task by ticket ID
    task = Task.find_by_ticket_id(ticket_id)
    if not task:
        print(f"No task found for ticket: {ticket_id}")
        return
    
    # Create branch record
    GitBranch.create({
        "task_id": str(task["_id"]),
        "project_id": project_id,
        "branch_name": branch_name,
        "repo_url": repo_url,
        "status": "active"
    })
    
    print(f"Branch created: {branch_name} for task {ticket_id}")

def handle_push_event(payload, project_id, repo_full_name):
    """Handle push event with commits"""
    commits = payload.get("commits", [])
    branch_name = payload.get("ref", "").replace("refs/heads/", "")
    latest_event_by_task = {}
    
    for commit in commits:
        message = commit.get("message", "")
        ticket_id = extract_ticket_id(message)
        
        if not ticket_id:
            # Also check branch name
            ticket_id = extract_ticket_id(branch_name)
        
        if not ticket_id:
            continue
        
        # Find task
        task = Task.find_by_ticket_id(ticket_id)
        if not task:
            continue
        
        # Create commit record
        GitCommit.create({
            "task_id": str(task["_id"]),
            "project_id": project_id,
            "commit_sha": commit.get("id"),
            "message": message,
            "author": commit.get("author", {}).get("name", "Unknown"),
            "author_email": commit.get("author", {}).get("email", ""),
            "branch_name": branch_name,
            "timestamp": commit.get("timestamp")
        })

        commit_sha = commit.get("id", "")
        commit_url = (
            f"https://github.com/{repo_full_name}/commit/{commit_sha}"
            if repo_full_name and commit_sha
            else ""
        )

        task_id = str(task.get("_id"))
        current_timestamp = commit.get("timestamp") or ""
        prev = latest_event_by_task.get(task_id)
        if not prev or current_timestamp > (prev.get("timestamp") or ""):
            latest_event_by_task[task_id] = {
                "timestamp": current_timestamp,
                "task": task,
                "payload": {
                    "commit_sha": commit_sha,
                    "message": message,
                    "author": commit.get("author", {}).get("name", "Unknown"),
                    "branch_name": branch_name,
                    "commit_url": commit_url,
                },
            }
        
        print(f"Commit logged: {commit.get('id')[:7]} for task {ticket_id}")

    # Notify Slack once per ticket for only the latest commit in this push.
    for event in latest_event_by_task.values():
        _notify_git_event_to_slack(event.get("task"), "commit", event.get("payload", {}))

def handle_pull_request_event(payload, project_id):
    """Handle pull request event"""
    action = payload.get("action")  # opened, closed, reopened, etc.
    pr = payload.get("pull_request", {})
    
    branch_name = pr.get("head", {}).get("ref")
    pr_title = pr.get("title", "")
    
    # Extract ticket ID from branch or title
    ticket_id = extract_ticket_id(branch_name) or extract_ticket_id(pr_title)
    
    if not ticket_id:
        print(f"No ticket ID found in PR: {pr_title}")
        return
    
    # Find task
    task = Task.find_by_ticket_id(ticket_id)
    if not task:
        print(f"No task found for ticket: {ticket_id}")
        return
    
    # Determine status
    status = "open"
    merged_at = None
    closed_at = None
    
    if pr.get("merged"):
        status = "merged"
        merged_at = pr.get("merged_at")
    elif pr.get("state") == "closed":
        status = "closed"
        closed_at = pr.get("closed_at")
    
    # Create or update PR record
    GitPullRequest.update_or_create({
        "task_id": str(task["_id"]),
        "project_id": project_id,
        "pr_number": pr.get("number"),
        "title": pr_title,
        "branch_name": branch_name,
        "status": status,
        "author": pr.get("user", {}).get("login", "Unknown"),
        "created_at_github": pr.get("created_at"),
        "merged_at": merged_at,
        "closed_at": closed_at
    })

    _notify_git_event_to_slack(
        task,
        "pull_request",
        {
            "action": action,
            "pr_number": pr.get("number"),
            "title": pr_title,
            "author": pr.get("user", {}).get("login", "Unknown"),
            "status": status,
            "pr_url": pr.get("html_url", ""),
        },
    )
    
    print(f"PR {action}: #{pr.get('number')} for task {ticket_id}")

def handle_branch_deleted(payload, project_id):
    """Handle branch deletion event"""
    branch_name = payload.get("ref")
    
    # Update branch status to deleted
    GitBranch.update_status(branch_name, project_id, "deleted")
    print(f"Branch deleted: {branch_name}")

def get_task_git_activity(task_id, user_id):
    """Get Git activity for a specific task - fetches from GitHub API in real-time"""
    if not user_id:
        return error_response("Unauthorized", 401)
    
    # Get task
    task = Task.find_by_identifier(task_id)
    if not task:
        return error_response("Task not found", 404)
    
    # Get project to access GitHub repo info
    project = Project.find_by_id(task.get("project_id"))
    if not project:
        return error_response("Project not found", 404)
    
    # Check if project has GitHub integration
    git_repo_url = project.get("git_repo_url", "")
    git_access_token = project.get("git_access_token", "")
    
    if not git_repo_url:
        # No GitHub repo linked, return empty activity
        return success_response({
            "branches_count": 0,
            "commits_count": 0,
            "pull_requests_count": 0,
            "branches": [],
            "commits": [],
            "pull_requests": []
        })
    
    # Get token (decrypt if stored, or use default)
    from utils.github_utils import (
        decrypt_token, get_branches, search_commits,
        search_pull_requests, calculate_time_ago
    )
    
    token = decrypt_token(git_access_token) if git_access_token else os.getenv("GITHUB_TOKEN")
    
    print(f"[GIT] Using token from: {'project (encrypted)' if git_access_token else 'environment variable'}")
    print(f"[GIT] Token exists: {bool(token)}")
    print(f"[GIT] Token preview: {token[:15] if token else 'NONE'}...")
    
    if not token:
        return error_response("GitHub token not configured", 400)
    
    # Get task ticket ID
    ticket_id = task.get("ticket_id")
    if not ticket_id:
        return success_response({
            "branches_count": 0,
            "commits_count": 0,
            "pull_requests_count": 0,
            "branches": [],
            "commits": [],
            "pull_requests": []
        })
    
    # Fetch data from GitHub API
    try:
        print(f"[GIT] Fetching GitHub activity for ticket: {ticket_id}")
        print(f"[GIT] Repo URL: {git_repo_url}")
        print(f"[GIT] Token exists: {bool(token)}")
        
        # Use ThreadPoolExecutor to fetch all data in parallel
        from concurrent.futures import ThreadPoolExecutor, as_completed
        import time
        
        start_time = time.time()
        branches = []
        commits = []
        pull_requests = []
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            # Submit all three API calls simultaneously
            future_branches = executor.submit(get_branches, git_repo_url, token, ticket_id)
            future_commits = executor.submit(search_commits, git_repo_url, token, ticket_id)
            future_prs = executor.submit(search_pull_requests, git_repo_url, token, ticket_id)
            
            # Collect results as they complete
            branches = future_branches.result()
            commits = future_commits.result()
            pull_requests = future_prs.result()

        # Fallback path: if webhook delivery is missing/unreachable, persist newly
        # discovered GitHub events. To avoid Slack spam, notify only incrementally.
        existing_commits_before_sync = len(GitCommit.find_by_task(str(task["_id"])))
        existing_prs_before_sync = len(GitPullRequest.find_by_task(str(task["_id"])))

        fallback_branch_name = None
        if branches:
            fallback_branch_name = branches[0].get("name")

        new_commit_events = []

        for commit in commits:
            commit_sha = commit.get("sha")
            if not commit_sha:
                continue

            exists = GitCommit.find_by_sha(commit_sha)
            if exists:
                continue

            commit_data = commit.get("commit", {})
            commit_message = commit_data.get("message", "")
            commit_author = commit_data.get("author", {}).get("name", "Unknown")
            commit_timestamp = commit_data.get("author", {}).get("date")
            commit_url = commit.get("html_url", "")

            GitCommit.create({
                "task_id": str(task["_id"]),
                "project_id": str(project["_id"]),
                "commit_sha": commit_sha,
                "message": commit_message,
                "author": commit_author,
                "author_email": "",
                "branch_name": fallback_branch_name or "",
                "timestamp": commit_timestamp,
            })

            new_commit_events.append({
                "commit_sha": commit_sha,
                "message": commit_message,
                "author": commit_author,
                "branch_name": fallback_branch_name or "-",
                "commit_url": commit_url,
                "timestamp": commit_timestamp or "",
            })

        # Development section should not trigger Slack notifications.
        # Slack notifications are handled by webhook/project-visit sync only.
        if new_commit_events:
            print(
                f"[GIT->SLACK] Development fetch synced {len(new_commit_events)} new commits without notifying Slack"
            )

        new_pr_events = []
        for pr in pull_requests:
            pr_number = pr.get("number")
            if pr_number is None:
                continue

            existing_pr = GitPullRequest.find_by_project_and_number(str(project["_id"]), pr_number)

            status = "open"
            merged_at = pr.get("merged_at")
            closed_at = pr.get("closed_at")
            if pr.get("merged"):
                status = "merged"
            elif pr.get("state") == "closed":
                status = "closed"

            GitPullRequest.update_or_create({
                "task_id": str(task["_id"]),
                "project_id": str(project["_id"]),
                "pr_number": pr_number,
                "title": pr.get("title", ""),
                "branch_name": pr.get("head", {}).get("ref", ""),
                "status": status,
                "author": pr.get("user", {}).get("login", "Unknown"),
                "created_at_github": pr.get("created_at"),
                "merged_at": merged_at,
                "closed_at": closed_at,
            })

            if not existing_pr:
                new_pr_events.append({
                    "action": "opened",
                    "pr_number": pr_number,
                    "title": pr.get("title", "Untitled PR"),
                    "author": pr.get("user", {}).get("login", "Unknown"),
                    "status": status,
                    "pr_url": pr.get("html_url", ""),
                    "created_at": pr.get("created_at") or "",
                })

        # Development section should not trigger Slack notifications.
        if new_pr_events:
            print(
                f"[GIT->SLACK] Development fetch synced {len(new_pr_events)} new PRs without notifying Slack"
            )
        
        elapsed_time = time.time() - start_time
        print(f"[GIT] Parallel fetch completed in {elapsed_time:.2f}s")
        print(f"[GIT] Branches found: {len(branches)}")
        print(f"[GIT] Commits found: {len(commits)}")
        print(f"[GIT] Pull requests found: {len(pull_requests)}")
        
        # Format pull requests (latest first)
        formatted_prs = []
        for pr in pull_requests:
            merged_at = pr.get("merged_at")
            closed_at = pr.get("closed_at")
            created_at = pr.get("created_at")
            
            status = "open"
            if pr.get("merged"):
                status = "merged"
            elif pr.get("state") == "closed":
                status = "closed"
            
            pr_data = {
                "pr_number": pr.get("number"),
                "title": pr.get("title"),
                "status": status,
                "author": pr.get("user", {}).get("login", "Unknown"),
                "created_at": created_at,
                "merged_at": merged_at,
                "time_ago": calculate_time_ago(merged_at or closed_at or created_at)
            }
            formatted_prs.append(pr_data)

        formatted_prs.sort(key=lambda item: item.get("created_at") or "", reverse=True)
        latest_prs = formatted_prs[:10]
        
        # Format commits (latest first)
        formatted_commits = []
        for commit in commits:
            commit_data = commit.get("commit", {})
            formatted_commits.append({
                "sha": commit.get("sha", "")[:7],
                "message": commit_data.get("message", ""),
                "author": commit_data.get("author", {}).get("name", "Unknown"),
                "timestamp": commit_data.get("author", {}).get("date"),
                "time_ago": calculate_time_ago(commit_data.get("author", {}).get("date")),
                "url": commit.get("html_url", ""),
            })

        formatted_commits.sort(key=lambda item: item.get("timestamp") or "", reverse=True)
        latest_commits = formatted_commits[:10]
        
        # Format branches
        formatted_branches = [{"name": b.get("name"), "status": "active"} for b in branches]
        
        return success_response({
            "ticket_id": ticket_id,
            "branches_count": len(branches),
            "commits_count": len(commits),
            "pull_requests_count": len(pull_requests),
            "branches": formatted_branches,
            "commits": latest_commits,
            "pull_requests": latest_prs,
            "latest_commits": latest_commits,
            "latest_pull_requests": latest_prs,
        })
    
    except Exception as e:
        print(f"Error fetching Git activity: {e}")
        import traceback
        traceback.print_exc()
        # Return empty activity if API call fails
        return success_response({
            "branches_count": 0,
            "commits_count": 0,
            "pull_requests_count": 0,
            "branches": [],
            "commits": [],
            "pull_requests": []
        })
