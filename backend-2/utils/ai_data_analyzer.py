"""
Enhanced AI Data Analyzer for Azure AI Foundry Assistant
Provides comprehensive intelligent data analysis and insights based on user's MongoDB data
Fetches: Projects, Tasks, Sprints, Profile, Git Activity, Team Collaboration, and more
"""

from datetime import datetime, timedelta, timezone
from bson import ObjectId
from database import db
from typing import Dict, List, Optional, Any


def analyze_user_data_for_ai(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Comprehensive user data analysis for AI Assistant context
    Returns structured data that AI can use to provide intelligent insights

    Fetches:
    - User profile & personal info
    - Projects (owned & member)
    - Tasks (all statuses, priorities, dates)
    - Sprints (active, completed, planned)
    - Team collaboration metrics
    - Git activity (branches, commits, PRs)
    - Performance metrics & velocity
    """
    try:
        # ========== USER DATA ==========
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None

        # Get user profile (personal info, education, certificates, organization)
        profile = db.profiles.find_one({"user_id": user_id})

        # ========== PROJECTS DATA ==========
        # Get all projects where user is owner or member
        user_projects = list(
            db.projects.find(
                {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
            ).sort("created_at", -1)
        )

        project_ids = [str(p["_id"]) for p in user_projects]

        # 🚀 OPTIMIZATION: Exclude large arrays (activities, attachments, links)
        # This reduces data transfer by 60-70% for typical tasks
        task_projection = {
            "activities": 0,  # Exclude activity logs (can be large)
            "attachments": 0,  # Exclude attachments
            "links": 0,  # Exclude task links
        }

        # ========== TASKS DATA ==========
        # Fetch tasks assigned to user
        my_tasks = list(
            db.tasks.find({"assignee_id": user_id}, task_projection).sort(
                "created_at", -1
            )
        )

        # Fetch all tasks in user's projects
        all_tasks = list(
            db.tasks.find({"project_id": {"$in": project_ids}}, task_projection).sort(
                "created_at", -1
            )
        )

        # ========== SPRINTS DATA ==========
        sprints = list(
            db.sprints.find({"project_id": {"$in": project_ids}}).sort("created_at", -1)
        )

        # ========== GIT ACTIVITY DATA ==========
        git_branches = list(
            db.git_branches.find({"project_id": {"$in": project_ids}})
            .sort("created_at", -1)
            .limit(50)
        )
        git_commits = list(
            db.git_commits.find({"project_id": {"$in": project_ids}})
            .sort("timestamp", -1)
            .limit(100)
        )
        git_prs = list(
            db.git_pull_requests.find({"project_id": {"$in": project_ids}})
            .sort("created_at_github", -1)
            .limit(50)
        )

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # ========== HELPER FUNCTIONS ==========
        def format_date(dt):
            """Format datetime to YYYY-MM-DD string"""
            if not dt:
                return None
            if isinstance(dt, str):
                try:
                    dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                except:
                    return dt
            return dt.strftime("%Y-%m-%d")

        def days_ago(dt):
            """Calculate days ago from datetime"""
            if not dt:
                return None
            if isinstance(dt, str):
                try:
                    dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                except:
                    return None
            if isinstance(dt, datetime):
                return (now - dt).days
            return None

        # ========== TASK STATISTICS ==========
        task_stats = {
            "total": len(my_tasks),
            "by_status": {},
            "by_priority": {},
            "by_type": {},
            "overdue_count": 0,
            "due_soon_count": 0,
            "completed_this_week": 0,
            "completed_this_month": 0,
            "created_this_week": 0,
            "created_this_month": 0,
        }

        for task in my_tasks:
            status = task.get("status", "To Do")
            priority = task.get("priority", "Medium")
            issue_type = task.get("issue_type", "task")

            task_stats["by_status"][status] = task_stats["by_status"].get(status, 0) + 1
            task_stats["by_priority"][priority] = (
                task_stats["by_priority"].get(priority, 0) + 1
            )
            task_stats["by_type"][issue_type] = (
                task_stats["by_type"].get(issue_type, 0) + 1
            )

            # Check overdue/due soon
            due = task.get("due_date")
            if due and status not in ["Done", "Closed"]:
                due_dt = None
                if isinstance(due, str):
                    try:
                        due_dt = datetime.fromisoformat(due.replace("Z", "+00:00"))
                    except:
                        pass
                elif isinstance(due, datetime):
                    due_dt = due

                if due_dt:
                    if due_dt < now:
                        task_stats["overdue_count"] += 1
                    elif due_dt < now + timedelta(days=7):
                        task_stats["due_soon_count"] += 1

            # Track completed tasks
            updated = task.get("updated_at")
            if status in ["Done", "Closed"] and isinstance(updated, datetime):
                if updated > now - timedelta(days=7):
                    task_stats["completed_this_week"] += 1
                if updated > now - timedelta(days=30):
                    task_stats["completed_this_month"] += 1

            # Track created tasks
            created = task.get("created_at")
            if isinstance(created, datetime):
                if created > now - timedelta(days=7):
                    task_stats["created_this_week"] += 1
                if created > now - timedelta(days=30):
                    task_stats["created_this_month"] += 1

        # ========== TEAM & COLLABORATION ==========
        team_stats = {}
        for proj in user_projects:
            owner_id = proj.get("user_id")
            members = proj.get("members", [])
            member_ids = [m.get("user_id") for m in members if m.get("user_id")]

            # Get tasks in this project
            project_tasks = [
                t for t in all_tasks if t.get("project_id") == str(proj["_id"])
            ]

            team_stats[str(proj["_id"])] = {
                "name": proj.get("name", "Unnamed Project"),
                "description": proj.get("description", ""),
                "prefix": proj.get("prefix", ""),
                "owner_id": owner_id,
                "total_members": len(set(member_ids))
                + (1 if owner_id and owner_id not in member_ids else 0),
                "members_list": member_ids[:10],
                "task_count": len(project_tasks),
                "created_at": format_date(proj.get("created_at")),
            }

        # Unique collaborators
        all_assignees = {t["assignee_id"] for t in all_tasks if t.get("assignee_id")}
        total_collaborators = len(all_assignees - {user_id})

        # Workload distribution
        assignee_workload = {}
        for task in all_tasks:
            assignee = task.get("assignee_id")
            if assignee:
                assignee_workload[assignee] = assignee_workload.get(assignee, 0) + 1

        top_assignees = sorted(
            assignee_workload.items(), key=lambda x: x[1], reverse=True
        )[:10]

        # Blocked / Blocker tasks (need to fetch from full tasks if needed)
        blocked_count = 0
        blocking_count = 0
        # Note: links are excluded in projection, so this will be 0 unless we fetch separately

        # ========== VELOCITY METRICS ==========
        completed_last_7d = sum(
            1
            for t in all_tasks
            if t.get("status") in ["Done", "Closed"]
            and t.get("updated_at")
            and days_ago(t["updated_at"]) is not None
            and days_ago(t["updated_at"]) <= 7
        )

        completed_last_30d = sum(
            1
            for t in all_tasks
            if t.get("status") in ["Done", "Closed"]
            and t.get("updated_at")
            and days_ago(t["updated_at"]) is not None
            and days_ago(t["updated_at"]) <= 30
        )

        completed_last_90d = sum(
            1
            for t in all_tasks
            if t.get("status") in ["Done", "Closed"]
            and t.get("updated_at")
            and days_ago(t["updated_at"]) is not None
            and days_ago(t["updated_at"]) <= 90
        )

        # ========== RECENT TASKS ==========
        recent_tasks = []
        for task in sorted(
            my_tasks, key=lambda x: x.get("updated_at", datetime.min), reverse=True
        )[:15]:
            recent_tasks.append(
                {
                    "ticket_id": task.get("ticket_id", ""),
                    "title": task.get("title", "Untitled"),
                    "status": task.get("status", "To Do"),
                    "priority": task.get("priority", "Medium"),
                    "issue_type": task.get("issue_type", "task"),
                    "dueDate": format_date(task.get("due_date")),
                    "projectId": task.get("project_id"),
                    "labels": task.get("labels", []),
                    "created_at": format_date(task.get("created_at")),
                    "updated_at": format_date(task.get("updated_at")),
                }
            )

        # ========== TOP PROJECTS ==========
        top_projects = []
        for p in user_projects[:10]:
            project_tasks = [
                t for t in all_tasks if t.get("project_id") == str(p["_id"])
            ]
            completed = len(
                [t for t in project_tasks if t.get("status") in ["Done", "Closed"]]
            )
            in_progress = len(
                [t for t in project_tasks if t.get("status") == "In Progress"]
            )

            top_projects.append(
                {
                    "name": p.get("name", "Unnamed Project"),
                    "id": str(p["_id"]),
                    "description": p.get("description", ""),
                    "prefix": p.get("prefix", ""),
                    "taskCount": len(project_tasks),
                    "completedCount": completed,
                    "inProgressCount": in_progress,
                    "progress": round(
                        (completed / len(project_tasks) * 100) if project_tasks else 0,
                        1,
                    ),
                    "created_at": format_date(p.get("created_at")),
                    "is_owner": p.get("user_id") == user_id,
                }
            )

        # ========== SPRINT INSIGHTS ==========
        sprint_insights = {
            "total": len(sprints),
            "active": sum(1 for s in sprints if s.get("status") == "active"),
            "completed": sum(1 for s in sprints if s.get("status") == "completed"),
            "planned": sum(1 for s in sprints if s.get("status") == "planned"),
        }

        # Active sprint details
        active_sprint = None
        for s in sprints:
            if s.get("status") == "active":
                sprint_tasks = [
                    t for t in all_tasks if t.get("sprint_id") == str(s["_id"])
                ]
                completed_sprint_tasks = [
                    t for t in sprint_tasks if t.get("status") == "Done"
                ]

                active_sprint = {
                    "name": s.get("name"),
                    "goal": s.get("goal", ""),
                    "start_date": format_date(s.get("start_date")),
                    "end_date": format_date(s.get("end_date")),
                    "total_tasks": len(sprint_tasks),
                    "completed_tasks": len(completed_sprint_tasks),
                    "progress": round(
                        (len(completed_sprint_tasks) / len(sprint_tasks) * 100)
                        if sprint_tasks
                        else 0,
                        1,
                    ),
                    "project_id": s.get("project_id"),
                }
                break

        # Completed sprints (last 5)
        completed_sprints = []
        for s in sprints:
            if s.get("status") == "completed":
                completed_sprints.append(
                    {
                        "name": s.get("name"),
                        "completed_at": format_date(s.get("completed_at")),
                        "total_tasks": s.get("total_tasks_snapshot", 0),
                        "completed_tasks": s.get("completed_tasks_snapshot", 0),
                    }
                )
                if len(completed_sprints) >= 5:
                    break

        # ========== GIT ACTIVITY ==========
        git_activity = {
            "total_branches": len(git_branches),
            "active_branches": sum(
                1 for b in git_branches if b.get("status") == "active"
            ),
            "merged_branches": sum(
                1 for b in git_branches if b.get("status") == "merged"
            ),
            "total_commits": len(git_commits),
            "total_prs": len(git_prs),
            "open_prs": sum(1 for pr in git_prs if pr.get("status") == "open"),
            "merged_prs": sum(1 for pr in git_prs if pr.get("status") == "merged"),
            "recent_commits": [
                {
                    "sha": c.get("commit_sha", "")[:8],
                    "message": c.get("message", "")[:100],
                    "author": c.get("author", ""),
                    "branch": c.get("branch_name", ""),
                    "timestamp": format_date(c.get("timestamp")),
                }
                for c in git_commits[:10]
            ],
            "recent_prs": [
                {
                    "number": pr.get("pr_number"),
                    "title": pr.get("title", ""),
                    "status": pr.get("status", ""),
                    "author": pr.get("author", ""),
                    "branch": pr.get("branch_name", ""),
                    "created_at": format_date(pr.get("created_at_github")),
                }
                for pr in git_prs[:10]
            ],
        }

        # ========== USER PROFILE ==========
        profile_data = {
            "has_profile": profile is not None,
            "personal": profile.get("personal", {}) if profile else {},
            "education": profile.get("education", []) if profile else [],
            "certificates": profile.get("certificates", []) if profile else [],
            "organization": profile.get("organization", {}) if profile else {},
        }

        # ========== LABELS & CATEGORIES ==========
        all_labels = set()
        label_usage = {}
        for task in my_tasks:
            for label in task.get("labels", []):
                all_labels.add(label)
                label_usage[label] = label_usage.get(label, 0) + 1

        top_labels = sorted(label_usage.items(), key=lambda x: x[1], reverse=True)[:10]

        # ========== COMPILE FINAL DATA ==========
        return {
            "user": {
                "id": str(user["_id"]),
                "name": user.get("name", "User"),
                "email": user.get("email"),
                "role": user.get("role", "Member"),
                "created_at": format_date(user.get("created_at")),
            },
            "profile": profile_data,
            "team": {
                "total_collaborators": total_collaborators,
                "projects_team_info": team_stats,
            },
            "workload_distribution": {
                "total_tasks_in_projects": len(all_tasks),
                "my_tasks": len(my_tasks),
                "top_assignees": [
                    {"user_id": uid, "task_count": count}
                    for uid, count in top_assignees
                ],
            },
            "blockers": {
                "blocked_tasks": blocked_count,
                "blocking_tasks": blocking_count,
            },
            "velocity": {
                "completed_last_7_days": completed_last_7d,
                "completed_last_30_days": completed_last_30d,
                "completed_last_90_days": completed_last_90d,
                "avg_per_week_30d": round(completed_last_30d / 4.3, 1)
                if completed_last_30d > 0
                else 0,
                "avg_per_week_90d": round(completed_last_90d / 12.9, 1)
                if completed_last_90d > 0
                else 0,
            },
            "stats": {
                "tasks": {
                    "total": task_stats["total"],
                    "overdue": task_stats["overdue_count"],
                    "dueSoon": task_stats["due_soon_count"],
                    "completedWeek": task_stats["completed_this_week"],
                    "completedMonth": task_stats["completed_this_month"],
                    "createdWeek": task_stats["created_this_week"],
                    "createdMonth": task_stats["created_this_month"],
                    "statusBreakdown": task_stats["by_status"],
                    "priorityBreakdown": task_stats["by_priority"],
                    "typeBreakdown": task_stats["by_type"],
                },
                "projects": {
                    "total": len(user_projects),
                    "owned": sum(
                        1 for p in user_projects if p.get("user_id") == user_id
                    ),
                    "memberOf": sum(
                        1 for p in user_projects if p.get("user_id") != user_id
                    ),
                    "withTasks": sum(
                        1
                        for p in user_projects
                        if any(t["project_id"] == str(p["_id"]) for t in all_tasks)
                    ),
                },
                "sprints": sprint_insights,
                "labels": {
                    "total_unique": len(all_labels),
                    "top_labels": [
                        {"label": label, "count": count} for label, count in top_labels
                    ],
                },
            },
            "recentTasks": recent_tasks,
            "topProjects": top_projects,
            "activeSprint": active_sprint,
            "completedSprints": completed_sprints,
            "gitActivity": git_activity,
        }

    except Exception as e:
        print(f"Error analyzing user data for AI: {str(e)}")
        import traceback

        traceback.print_exc()
        return None


def build_ai_system_prompt(user_data: Optional[Dict[str, Any]]) -> str:
    """
    Build comprehensive system prompt with user's data context
    This helps AI provide personalized, data-driven insights
    """
    if not user_data:
        return """You are DOIT AI Assistant, a helpful and intelligent AI integrated into the DOIT project management system.

You help users with:
- Answering questions about project management
- Providing general assistance with any queries
- Generating images when requested

Be concise, helpful, and professional."""

    tasks = user_data["stats"]["tasks"]
    projects = user_data["stats"]["projects"]
    sprints = user_data["stats"]["sprints"]
    user_info = user_data["user"]
    profile = user_data["profile"]
    git = user_data["gitActivity"]
    velocity = user_data["velocity"]

    prompt = f"""You are DOIT AI Assistant, an intelligent AI integrated into the DOIT project management system. You have access to the user's complete project and task data to provide personalized insights and recommendations.

## USER PROFILE
- **Name:** {user_info["name"]}
- **Role:** {user_info["role"]}
- **Email:** {user_info["email"]}
- **Member Since:** {user_info["created_at"]}
"""

    # Add profile information if available
    if profile["has_profile"]:
        if profile["personal"]:
            prompt += f"\n### Personal Info\n"
            for key, value in profile["personal"].items():
                if value:
                    prompt += f"- {key.replace('_', ' ').title()}: {value}\n"

        if profile["education"]:
            prompt += f"\n### Education\n"
            for edu in profile["education"][:3]:
                prompt += f"- {edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('institution', '')} ({edu.get('year', '')})\n"

        if profile["certificates"]:
            prompt += f"\n### Certificates\n"
            for cert in profile["certificates"][:5]:
                prompt += f"- {cert.get('name', '')} ({cert.get('year', '')})\n"

        if profile["organization"]:
            org = profile["organization"]
            if org.get("name"):
                prompt += f"\n### Organization\n"
                prompt += f"- Company: {org.get('name', '')}\n"
                if org.get("department"):
                    prompt += f"- Department: {org.get('department', '')}\n"
                if org.get("position"):
                    prompt += f"- Position: {org.get('position', '')}\n"

    prompt += f"""
## TASK ANALYTICS
- **Total Tasks Assigned:** {tasks["total"]}
- **Status Distribution:** Done: {tasks["statusBreakdown"].get("Done", 0)}, In Progress: {tasks["statusBreakdown"].get("In Progress", 0)}, To Do: {tasks["statusBreakdown"].get("To Do", 0)}, Closed: {tasks["statusBreakdown"].get("Closed", 0)}
- **Priority Distribution:** High: {tasks["priorityBreakdown"].get("High", 0)}, Medium: {tasks["priorityBreakdown"].get("Medium", 0)}, Low: {tasks["priorityBreakdown"].get("Low", 0)}
- **Type Distribution:** Bug: {tasks["typeBreakdown"].get("bug", 0)}, Task: {tasks["typeBreakdown"].get("task", 0)}, Story: {tasks["typeBreakdown"].get("story", 0)}, Epic: {tasks["typeBreakdown"].get("epic", 0)}
- **Critical Metrics:**
  - Overdue Tasks: {tasks["overdue"]}
  - Due Within 7 Days: {tasks["dueSoon"]}
  - Completed This Week: {tasks["completedWeek"]}
  - Completed This Month: {tasks["completedMonth"]}
  - Created This Week: {tasks["createdWeek"]}
  - Created This Month: {tasks["createdMonth"]}

## PROJECT OVERVIEW
- **Total Projects:** {projects["total"]}
- **Owned Projects:** {projects["owned"]}
- **Member In:** {projects["memberOf"]}
- **Active Projects:** {projects["withTasks"]}

## SPRINT STATUS
- **Total Sprints:** {sprints["total"]}
- **Active Sprints:** {sprints["active"]}
- **Completed Sprints:** {sprints["completed"]}
- **Planned Sprints:** {sprints["planned"]}

## TEAM COLLABORATION
- **Total Collaborators:** {user_data["team"]["total_collaborators"]}
- **Blocked Tasks:** {user_data["blockers"]["blocked_tasks"]}
- **Blocking Tasks:** {user_data["blockers"]["blocking_tasks"]}

## VELOCITY METRICS
- **Last 7 Days:** {velocity["completed_last_7_days"]} tasks
- **Last 30 Days:** {velocity["completed_last_30_days"]} tasks
- **Last 90 Days:** {velocity["completed_last_90_days"]} tasks
- **Average Per Week (30d):** {velocity["avg_per_week_30d"]} tasks
- **Average Per Week (90d):** {velocity["avg_per_week_90d"]} tasks

## GIT ACTIVITY
- **Total Branches:** {git["total_branches"]} ({git["active_branches"]} active, {git["merged_branches"]} merged)
- **Total Commits:** {git["total_commits"]}
- **Pull Requests:** {git["total_prs"]} ({git["open_prs"]} open, {git["merged_prs"]} merged)

## RECENT ACTIVITY (Last 15 Tasks)
{format_recent_tasks(user_data["recentTasks"])}

## TOP PROJECTS
{format_top_projects(user_data["topProjects"])}
"""

    if user_data.get("activeSprint"):
        sprint = user_data["activeSprint"]
        prompt += f"""
## ACTIVE SPRINT
- **Name:** {sprint["name"]}
- **Goal:** {sprint["goal"]}
- **Duration:** {sprint["start_date"]} to {sprint["end_date"]}
- **Progress:** {sprint["completed_tasks"]}/{sprint["total_tasks"]} tasks completed ({sprint["progress"]}%)
"""

    if user_data.get("completedSprints"):
        prompt += f"\n## RECENT COMPLETED SPRINTS\n"
        for sprint in user_data["completedSprints"][:3]:
            prompt += f"- {sprint['name']}: {sprint['completed_tasks']}/{sprint['total_tasks']} tasks completed (Finished: {sprint['completed_at']})\n"

    if git["recent_commits"]:
        prompt += f"\n## RECENT GIT COMMITS (Last 10)\n"
        for commit in git["recent_commits"][:5]:
            prompt += f"- [{commit['sha']}] {commit['message']} - {commit['author']} ({commit['timestamp']})\n"

    if git["recent_prs"]:
        prompt += f"\n## RECENT PULL REQUESTS (Last 10)\n"
        for pr in git["recent_prs"][:5]:
            prompt += f"- PR#{pr['number']}: {pr['title']} - {pr['status']} ({pr['created_at']})\n"

    # Add label insights
    labels_data = user_data["stats"]["labels"]
    if labels_data["top_labels"]:
        prompt += f"\n## MOST USED LABELS\n"
        for label_info in labels_data["top_labels"][:5]:
            prompt += f"- {label_info['label']}: {label_info['count']} tasks\n"

    prompt += """
## RESPONSE GUIDELINES
1. **Be Data-Driven:** Reference actual metrics, task names, and project details
2. **Provide Actionable Insights:** Give concrete recommendations based on their data
3. **Celebrate Progress:** Acknowledge completed tasks and achievements with genuine enthusiasm
4. **Flag Risks:** Highlight overdue tasks, bottlenecks, or concerning patterns proactively
5. **Suggest Optimizations:** Recommend priority adjustments, sprint planning improvements
6. **Use Context:** Understand the user's complete workload when answering questions
7. **Be Concise:** Keep responses focused and valuable (2-4 paragraphs typically)
8. **Personalize:** Address the user by name and acknowledge their specific situation
9. **Visual Aids:** Use emojis strategically (📊 📈 ⚠️ ✅ 🚀) for clarity
10. **Image Generation:** When asked to generate images, acknowledge and describe what you're creating

## CAPABILITIES
- Answer questions about projects, tasks, sprints with specific data
- Provide productivity insights and recommendations
- Generate images using FLUX-1.1-pro when requested
- Analyze trends and patterns in their work
- Suggest task prioritization and time management strategies
- Help with project planning and sprint organization
- Track git activity and code contributions
- Analyze team collaboration and workload distribution

## TASK AUTOMATION CAPABILITIES

You can execute task management commands on behalf of the user. When the user asks you to perform actions, you can:

**Available Commands:**

1. **Create Task:**
   - "Create a task titled 'X' in Project Y"
   - "Make a high priority bug for Z, assign to user@example.com"
   - Extracts: title, project, priority, assignee, description, labels, due date

2. **Assign Task:**
   - "Assign task ABC-123 to John"
   - "Give the login bug task to sarah@example.com"

3. **Update Task:**
   - "Change status of task ABC-123 to In Progress"
   - "Update the priority of X to High"
   - "Mark task Y as Done"

4. **Create Sprint:** (Admin only)
   - "Create a sprint called Sprint 23 for Project Beta from 2026-03-01 to 2026-03-14"

5. **List Tasks:**
   - "Show me all my tasks"
   - "List overdue tasks"
   - "What are my high priority tasks?"

6. **List Projects:**
   - "Show my projects"
   - "List all projects I'm part of"

**Command Detection:**
When you detect a request to perform an action (create, assign, update, list), acknowledge the command and execute it. The system will automatically handle the execution and provide results.

**Example Interactions:**

User: "Create a high priority task for fixing the login bug in Project Alpha, assign it to john@example.com"
Assistant: "I'll create that task for you right away!"
[System executes command]
Assistant: "✅ Task 'Fix login bug' created successfully in Project Alpha and assigned to john@example.com!"

User: "Show me all my overdue tasks"
Assistant: "Let me fetch your overdue tasks..."
[System executes command]
Assistant: "You have 3 overdue tasks:
- [ABC-001] Fix API endpoint - High priority
- [ABC-002] Update documentation - Medium priority
- [ABC-003] Review PR #45 - Low priority"

Remember: Always acknowledge commands and provide clear feedback on execution results.

You have complete visibility into their task ecosystem. Use this to provide holistic, intelligent assistance that considers their entire workload and helps them be more productive.
"""

    return prompt


def format_recent_tasks(tasks: List[Dict[str, Any]]) -> str:
    """Format recent tasks for AI prompt"""
    if not tasks:
        return "No recent tasks"

    formatted = []
    for task in tasks:
        due = task.get("dueDate", "No due date")
        ticket = task.get("ticket_id", "")
        labels = ", ".join(task.get("labels", [])) if task.get("labels") else "none"
        issue_type = task.get("issue_type", "task")

        formatted.append(
            f"- [{ticket}] ({issue_type.upper()}) {task['title']} ({task['status']}) - Priority: {task['priority']} - Due: {due} - Labels: {labels}"
        )

    return "\n".join(formatted)


def format_top_projects(projects: List[Dict[str, Any]]) -> str:
    """Format top projects for AI prompt"""
    if not projects:
        return "No projects"

    formatted = []
    for proj in projects:
        progress = proj.get("progress", 0)
        role = "Owner" if proj.get("is_owner") else "Member"
        formatted.append(
            f"- [{proj.get('prefix', '')}] {proj['name']} ({role}) - {proj['taskCount']} tasks ({proj['completedCount']} done, {proj['inProgressCount']} in progress, {progress}% complete)"
        )

    return "\n".join(formatted)


def extract_insights_from_data(
    user_data: Optional[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Extract key insights and alerts from user data
    Returns list of insight objects for highlighting in UI
    """
    if not user_data:
        return []

    insights = []
    tasks = user_data["stats"]["tasks"]
    projects = user_data["stats"]["projects"]
    velocity = user_data["velocity"]
    git = user_data["gitActivity"]

    # Performance insights
    if velocity["completed_last_7_days"] > 10:
        insights.append(
            {
                "type": "success",
                "icon": "🔥",
                "title": "Outstanding Performance!",
                "description": f"You've completed {velocity['completed_last_7_days']} tasks this week - exceptional productivity!",
                "priority": 1,
            }
        )

    # Git activity insights
    if git["open_prs"] > 0:
        insights.append(
            {
                "type": "info",
                "icon": "🔀",
                "title": f"{git['open_prs']} Open Pull Request(s)",
                "description": "Don't forget to review and merge pending PRs",
                "priority": 2,
            }
        )

    # Velocity trend analysis
    if velocity["completed_last_7_days"] > velocity["avg_per_week_30d"] * 1.5:
        insights.append(
            {
                "type": "success",
                "icon": "📈",
                "title": "Velocity Increasing!",
                "description": "Your completion rate is significantly above your 30-day average",
                "priority": 3,
            }
        )

    # Sort by priority
    insights.sort(key=lambda x: x["priority"])

    return insights
