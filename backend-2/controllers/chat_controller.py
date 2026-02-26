"""
chat_controller.py
──────────────────
DOIT Unified AI Assistant Controller
Combines General Chat + AI PM capabilities powered by Azure OpenAI GPT-5.2

Features:
- General productivity chat with full user context
- AI PM mode with project/sprint/team analysis
- Automatic intent detection (chat vs PM queries)
- Voice + text interface support
- Persona-based responses (professional, friendly, direct)
"""

import json
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from typing import Dict, Any, List, Optional

from database import db
from utils.response import success_response, error_response
from utils.azure_ai_utils import (
    chat_completion,
    get_context_with_system_prompt,
    truncate_context,
    azure_client,
    AZURE_OPENAI_DEPLOYMENT,
)


# ══════════════════════════════════════════════════════════════════════════════
# PERSONAS (for AI PM mode)
# ══════════════════════════════════════════════════════════════════════════════

PM_PERSONAS = {
    "professional": {
        "name": "Professional",
        "tone": "formal, data-driven, executive-ready",
        "system_prompt": """You are a senior AI Project Manager with 15+ years of experience.
You communicate with precision, back every statement with data, and provide executive-level insights.
Your recommendations are actionable, prioritized, and risk-aware."""
    },
    "friendly": {
        "name": "Friendly",
        "tone": "casual, supportive, encouraging",
        "system_prompt": """You are a friendly AI Project Manager who balances professionalism with warmth.
You celebrate wins, empathize with challenges, and make complex data feel approachable.
Your goal is to motivate teams while keeping projects on track."""
    },
    "direct": {
        "name": "Direct",
        "tone": "concise, action-focused, no-nonsense",
        "system_prompt": """You are a direct, results-oriented AI Project Manager.
You cut through noise, highlight what matters most, and give clear next steps.
No fluff—just facts, priorities, and actions."""
    }
}


# ══════════════════════════════════════════════════════════════════════════════
# GUARD: Azure Client Check
# ══════════════════════════════════════════════════════════════════════════════

def _azure_ready():
    return azure_client is not None



# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API: Chat Ask (General + PM Combined)
# ══════════════════════════════════════════════════════════════════════════════

def chat_ask(body_str: str, user_id: str):
    """
    Unified AI chat endpoint supporting:
    - General productivity queries (tasks, project overview, etc.)
    - AI PM queries (risk analysis, workload, sprint health, etc.)
    
    Automatically detects intent and switches context.
    """
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    if not _azure_ready():
        return error_response(
            "Azure OpenAI client not initialized. Check environment variables.",
            500
        )
    
    try:
        data = json.loads(body_str)
        user_message = data.get("message", "").strip()
        conversation_history = data.get("conversationHistory", [])
        persona = data.get("persona", "friendly")  # For PM mode
        project_id = data.get("project_id")  # Optional project context
        
        if not user_message:
            return error_response("Message is required", 400)
        
        print(f"💬 [Chat] User: {user_id}, Message: {user_message[:60]}...")
        
        # ── 1. Detect intent: General Chat vs PM Query ────────────────────
        intent = detect_intent(user_message)
        is_pm_query = intent in [
            "risk_analysis", "assignment_suggestion", "team_inquiry",
            "sprint_status", "workload_check", "blocker_analysis",
            "velocity_check", "recommendation"
        ]
        
        print(f"🎯 Intent: {intent} | PM Query: {is_pm_query}")
        
        # ── 2. Gather Context ──────────────────────────────────────────────
        if is_pm_query:
            # PM mode: Get project context + team data
            context = gather_pm_context(user_id, project_id, intent)
            system_prompt = build_pm_system_prompt(persona, context)
        else:
            # General mode: Get personal task/project data
            user_data = analyze_user_data(user_id)
            if not user_data:
                return error_response("Failed to analyze user data", 500)
            system_prompt = build_general_system_prompt(user_data)
            context = user_data
        
        # ── 3. Build Message List ──────────────────────────────────────────
        prior_messages = build_messages(conversation_history, user_message)
        messages = get_context_with_system_prompt(
            prior_messages[:-1],
            system_prompt=system_prompt
        )
        messages.append({"role": "user", "content": user_message})
        
        # ── 4. Truncate to Fit Context Window ─────────────────────────────
        messages = truncate_context(messages, max_tokens=8000)
        
        # ── 5. Call Azure OpenAI GPT-5.2 ───────────────────────────────────
        print(f"📤 Sending {len(messages)} messages to {AZURE_OPENAI_DEPLOYMENT}")
        response_data = chat_completion(messages, max_tokens=1500)
        
        ai_response = response_data.get("content", "")
        tokens = response_data.get("tokens", {})
        
        print(f"✅ Reply received ({tokens.get('total', '?')} tokens)")
        
        # ── 6. Extract Insights ────────────────────────────────────────────
        insights = extract_insights(context, user_message.lower(), is_pm_query)
        
        return success_response({
            "response": ai_response,
            "insights": insights,
            "data": context,
            "success": True,
            "mode": "pm" if is_pm_query else "general",
            "intent": intent,
            "model": f"Azure OpenAI {AZURE_OPENAI_DEPLOYMENT}",
            "tokens": tokens,
        })
    
    except json.JSONDecodeError:
        return error_response("Invalid JSON body", 400)
    except Exception as e:
        print(f"❌ [Chat] Error: {e}")
        import traceback
        traceback.print_exc()
        return error_response(f"Chat failed: {str(e)}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC API: Get Suggestions
# ══════════════════════════════════════════════════════════════════════════════

def get_chat_suggestions(user_id: str):
    """
    Rule-based productivity suggestions from MongoDB data.
    No LLM call required.
    """
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    try:
        user_data = analyze_user_data(user_id)
        if not user_data:
            return error_response("Failed to analyze user data", 500)
        
        suggestions = []
        tasks = user_data["stats"]["tasks"]
        projects = user_data["stats"]["projects"]
        sprints = user_data["stats"]["sprints"]
        
        # Critical: Overdue tasks
        if tasks["overdue"] > 0:
            suggestions.append({
                "type": "critical",
                "icon": "🚨",
                "title": f"{tasks['overdue']} Overdue Task(s)",
                "message": "Immediate action required. Review and update overdue items.",
                "action": "View Overdue Tasks",
                "priority": 1,
            })
        
        # Warning: Due soon
        if tasks["dueSoon"] > 0:
            suggestions.append({
                "type": "warning",
                "icon": "⏰",
                "title": f"{tasks['dueSoon']} Task(s) Due This Week",
                "message": "Plan your time wisely for upcoming deadlines.",
                "action": "View Upcoming",
                "priority": 2,
            })
        
        # Success: Weekly wins
        if tasks["completedWeek"] >= 3:
            suggestions.append({
                "type": "success",
                "icon": "🌟",
                "title": "Excellent Weekly Performance!",
                "message": f"You've completed {tasks['completedWeek']} tasks this week. Keep it up!",
                "action": None,
                "priority": 3,
            })
        
        # Info: Idle projects
        idle_projects = projects["total"] - projects["withTasks"]
        if idle_projects > 0:
            suggestions.append({
                "type": "info",
                "icon": "📌",
                "title": f"{idle_projects} Project(s) Inactive",
                "message": "Some projects have no active tasks. Consider planning next steps.",
                "action": "View Projects",
                "priority": 4,
            })
        
        # Tip: No active sprints
        if sprints["active"] == 0 and sprints["total"] > 0:
            suggestions.append({
                "type": "tip",
                "icon": "🏃",
                "title": "No Active Sprints",
                "message": "Consider starting a new sprint to organize your work.",
                "action": "View Sprints",
                "priority": 5,
            })
        
        suggestions.sort(key=lambda x: x["priority"])
        
        return success_response({
            "suggestions": suggestions,
            "summary": {
                "totalTasks": tasks["total"],
                "completedTasks": tasks["statusBreakdown"].get("Done", 0) + tasks["statusBreakdown"].get("Closed", 0),
                "totalProjects": projects["total"],
                "activeSprints": sprints["active"],
            },
            "note": f"Powered by Azure OpenAI {AZURE_OPENAI_DEPLOYMENT}",
        })
    
    except Exception as e:
        print(f"❌ [Suggestions] Error: {e}")
        return error_response(f"Failed to get suggestions: {str(e)}", 500)


# ══════════════════════════════════════════════════════════════════════════════
# HELPER: Intent Detection
# ══════════════════════════════════════════════════════════════════════════════

def detect_intent(message: str) -> str:
    """
    Detect user intent from message text.
    Returns: general, risk_analysis, assignment_suggestion, team_inquiry, etc.
    """
    msg_lower = message.lower()
    
    # PM-specific intents
    if any(word in msg_lower for word in ["risk", "delay", "sprint health", "on track", "miss deadline"]):
        return "risk_analysis"
    
    if any(word in msg_lower for word in ["assign", "who should", "best person", "recommend assignee"]):
        return "assignment_suggestion"
    
    if any(word in msg_lower for word in ["workload", "team capacity", "distribution", "overloaded", "bandwidth"]):
        return "team_inquiry"
    
    if any(word in msg_lower for word in ["sprint status", "sprint progress", "how's sprint", "sprint looking"]):
        return "sprint_status"
    
    if any(word in msg_lower for word in ["blocked", "blocker", "dependency", "waiting on"]):
        return "blocker_analysis"
    
    if any(word in msg_lower for word in ["velocity", "burn", "completion rate", "throughput"]):
        return "velocity_check"
    
    if any(word in msg_lower for word in ["overdue", "late", "past due"]):
        return "overdue_check"
    
    if any(word in msg_lower for word in ["recommend", "suggest", "what should", "action plan"]):
        return "recommendation"
    
    # General intents
    if any(word in msg_lower for word in ["task", "todo", "assignment"]):
        return "task_inquiry"
    
    if any(word in msg_lower for word in ["project", "initiative"]):
        return "project_inquiry"
    
    return "general"


# ══════════════════════════════════════════════════════════════════════════════
# CONTEXT GATHERING: PM Mode (Project/Team Focus)
# ══════════════════════════════════════════════════════════════════════════════

def gather_pm_context(user_id: str, project_id: Optional[str], intent: str) -> Dict[str, Any]:
    """
    Gather comprehensive PM context: projects, sprints, tasks, team workload.
    Similar to ai_pm_controller's gather_comprehensive_context but adapted for chat.
    """
    context = {}
    
    try:
        # Auto-select project if not provided
        if not project_id:
            user_projects = list(db.projects.find({
                "$or": [
                    {"user_id": user_id},
                    {"members.user_id": user_id}
                ]
            }).sort("updated_at", -1).limit(1))
            
            if user_projects:
                project_id = str(user_projects[0]['_id'])
                print(f"📊 Auto-selected project: {project_id}")
        
        if not project_id:
            return {"error": "No project found for user"}
        
        # Get project details
        project = db.projects.find_one({"_id": ObjectId(project_id)})
        if project:
            context['project_name'] = project.get('name', 'Unknown')
            context['project_description'] = project.get('description', '')
            context['project_status'] = project.get('status', 'active')
            
            # Get team members
            members = project.get('members', [])
            context['team_size'] = len(members)
            context['team_members'] = [m.get('name', 'Unknown') for m in members[:5]]
        
        # Get sprints (last 3)
        sprints = list(db.sprints.find({"project_id": project_id}).sort("created_at", -1).limit(3))
        if sprints:
            sprint_info = []
            for sprint in sprints:
                sprint_tasks = list(db.tasks.find({"sprint_id": str(sprint['_id'])}))
                completed = len([t for t in sprint_tasks if t.get('status') in ['completed', 'Done', 'Closed']])
                total = len(sprint_tasks)
                sprint_info.append({
                    "name": sprint.get('name', 'Unknown'),
                    "status": sprint.get('status', 'active'),
                    "progress": f"{completed}/{total} tasks",
                    "start_date": str(sprint.get('start_date', ''))[:10],
                    "end_date": str(sprint.get('end_date', ''))[:10]
                })
            context['sprints'] = sprint_info
        
        # Get all tasks for project
        all_tasks = list(db.tasks.find({"project_id": project_id}))
        if all_tasks:
            context['total_tasks'] = len(all_tasks)
            context['completed_tasks'] = len([t for t in all_tasks if t.get('status') in ['completed', 'Done', 'Closed']])
            context['in_progress_tasks'] = len([t for t in all_tasks if t.get('status') in ['in_progress', 'In Progress']])
            context['pending_tasks'] = len([t for t in all_tasks if t.get('status') in ['pending', 'To Do']])
            context['blocked_tasks'] = len([t for t in all_tasks if t.get('status') == 'blocked'])
            
            # Overdue tasks
            now = datetime.utcnow()
            overdue = [t for t in all_tasks 
                      if t.get('due_date') and isinstance(t['due_date'], datetime) 
                      and t['due_date'] < now 
                      and t.get('status') not in ['completed', 'Done', 'Closed']]
            context['overdue_tasks'] = len(overdue)
            
            # Priority distribution
            context['high_priority'] = len([t for t in all_tasks if t.get('priority') in ['high', 'High']])
            context['medium_priority'] = len([t for t in all_tasks if t.get('priority') in ['medium', 'Medium']])
            context['low_priority'] = len([t for t in all_tasks if t.get('priority') in ['low', 'Low']])
            
            # Recent tasks
            recent_tasks = sorted(all_tasks, key=lambda x: x.get('created_at', datetime.min), reverse=True)[:5]
            context['recent_tasks'] = [
                {
                    "title": t.get('title', 'Untitled'),
                    "status": t.get('status', 'pending'),
                    "priority": t.get('priority', 'medium'),
                    "assignee": t.get('assignee_name', 'Unassigned')
                }
                for t in recent_tasks
            ]
        
        # Get team workload
        if project and members:
            member_ids = []
            for m in members:
                if 'user_id' in m:
                    try:
                        member_ids.append(ObjectId(m['user_id']))
                    except:
                        pass
            
            team_members = list(db.users.find({"_id": {"$in": member_ids}}))
            workload_data = []
            
            for member in team_members[:5]:
                member_id_str = str(member['_id'])
                member_tasks = [
                    t for t in all_tasks
                    if str(t.get('assignee_id')) == member_id_str
                ]
                
                active_tasks = len([t for t in member_tasks if t.get('status') in ['in_progress', 'In Progress', 'pending', 'To Do']])
                completed_tasks = len([t for t in member_tasks if t.get('status') in ['completed', 'Done', 'Closed']])
                
                workload_data.append({
                    "name": member.get('name', 'Unknown'),
                    "active_tasks": active_tasks,
                    "completed_tasks": completed_tasks,
                    "total_tasks": len(member_tasks)
                })
            
            context['team_workload'] = workload_data
        
        return context
    
    except Exception as e:
        print(f"❌ [PM Context] Error: {e}")
        import traceback
        traceback.print_exc()
        return {}


# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

def build_pm_system_prompt(persona: str, context: Dict[str, Any]) -> str:
    """Build AI PM system prompt with project context."""
    persona_data = PM_PERSONAS.get(persona, PM_PERSONAS['friendly'])
    
    base_prompt = persona_data["system_prompt"] + "\n\n"
    base_prompt += """Your core capabilities as DOIT AI PM:
- Analyze sprint risks and predict delays
- Recommend task assignments based on team workload and skills
- Identify bottlenecks and workload imbalances
- Provide sprint health insights and recommendations
- Answer questions about project status and team performance

When analyzing data:
1. Reference specific numbers from the context
2. Explain your reasoning clearly
3. Provide actionable recommendations with priorities
4. Highlight risks early and suggest mitigation
"""
    
    # Add project context
    if context:
        base_prompt += "\n\n**Current Project Context:**\n"
        base_prompt += format_pm_context(context)
    
    return base_prompt


def build_general_system_prompt(user_data: dict) -> str:
    """Build general chat system prompt with user's personal data."""
    tasks = user_data["stats"]["tasks"]
    projects = user_data["stats"]["projects"]
    sprints = user_data["stats"]["sprints"]
    
    return f"""You are DOIT-AI, an intelligent productivity assistant for {user_data["user"]["name"]}.

## USER PROFILE
- Name: {user_data["user"]["name"]}
- Role: {user_data["user"]["role"]}
- Email: {user_data["user"]["email"]}

## TASK SNAPSHOT
- Total: {tasks["total"]}  |  Overdue: {tasks["overdue"]}  |  Due Soon: {tasks["dueSoon"]}
- Completed This Week: {tasks["completedWeek"]}  |  This Month: {tasks["completedMonth"]}
- Status: Done={tasks["statusBreakdown"].get("Done", 0)}, In Progress={tasks["statusBreakdown"].get("In Progress", 0)}, To Do={tasks["statusBreakdown"].get("To Do", 0)}
- Priority: High={tasks["priorityBreakdown"].get("High", 0)}, Medium={tasks["priorityBreakdown"].get("Medium", 0)}, Low={tasks["priorityBreakdown"].get("Low", 0)}

## PROJECTS
- Total: {projects["total"]}  |  Owned: {projects["owned"]}  |  Member: {projects["memberOf"]}  |  Active: {projects["withTasks"]}

## SPRINTS
- Total: {sprints["total"]}  |  Active: {sprints["active"]}  |  Completed: {sprints["completed"]}

## RECENT TASKS
{format_recent_tasks(user_data["recentTasks"])}

## HOW TO RESPOND
- Lead with the most important insight
- Reference specific task titles and numbers
- Use emojis sparingly (✅ ⚠️ 🚀 📊 🔴)
- Keep answers to 3-4 focused paragraphs
- Always suggest a concrete next action
- If overdue tasks exist, mention them early
- Speak directly to {user_data["user"]["name"]} - be helpful, not robotic
"""


def format_pm_context(context: Dict[str, Any]) -> str:
    """Format PM context for GPT."""
    lines = []
    
    if 'project_name' in context:
        lines.append(f"📊 **Project:** {context['project_name']}")
        if 'project_description' in context:
            lines.append(f"   {context['project_description'][:100]}")
    
    if 'team_size' in context:
        lines.append(f"\n👥 **Team:** {context['team_size']} members")
        if 'team_members' in context:
            lines.append(f"   {', '.join(context['team_members'])}")
    
    if 'sprints' in context:
        lines.append("\n🏃 **Sprints:**")
        for sprint in context['sprints']:
            lines.append(f"   • {sprint['name']} ({sprint['status']}): {sprint['progress']}")
            lines.append(f"     {sprint['start_date']} → {sprint['end_date']}")
    
    if 'total_tasks' in context:
        lines.append("\n✅ **Tasks:**")
        lines.append(f"   Total: {context['total_tasks']}, Completed: {context['completed_tasks']}, In Progress: {context['in_progress_tasks']}, Pending: {context['pending_tasks']}")
        if context.get('blocked_tasks', 0) > 0:
            lines.append(f"   ⚠️ Blocked: {context['blocked_tasks']}")
        if context.get('overdue_tasks', 0) > 0:
            lines.append(f"   🚨 Overdue: {context['overdue_tasks']}")
    
    if 'team_workload' in context:
        lines.append("\n⚡ **Team Workload:**")
        for member in context['team_workload']:
            lines.append(f"   • {member['name']}: {member['total_tasks']} tasks ({member['active_tasks']} active)")
    
    return '\n'.join(lines) if lines else "No project context available."


def format_recent_tasks(tasks: list) -> str:
    """Format recent tasks list."""
    if not tasks:
        return "  (none)"
    lines = []
    for t in tasks[:8]:
        due = t.get("dueDate") or "no due date"
        lines.append(f"  • {t['title']} [{t['status']}] priority={t['priority']} due={due}")
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════════════════
# INSIGHTS EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════

def extract_insights(context: dict, query_lower: str, is_pm_query: bool) -> list:
    """Generate insight cards based on context."""
    insights = []
    
    if is_pm_query:
        # PM insights
        if 'overdue_tasks' in context and context['overdue_tasks'] > 0:
            insights.append({
                "type": "warning",
                "icon": "⚠️",
                "title": f"{context['overdue_tasks']} Overdue Task(s)",
                "description": "Tasks past due date need immediate attention.",
            })
        
        if 'blocked_tasks' in context and context['blocked_tasks'] > 0:
            insights.append({
                "type": "warning",
                "icon": "🚧",
                "title": f"{context['blocked_tasks']} Blocked Task(s)",
                "description": "Resolve dependencies to keep velocity up.",
            })
        
        if 'team_workload' in context:
            max_load = max((m['total_tasks'] for m in context['team_workload']), default=0)
            if max_load > 5:
                insights.append({
                    "type": "info",
                    "icon": "⚖️",
                    "title": "Workload Imbalance Detected",
                    "description": f"Some team members have {max_load}+ tasks assigned.",
                })
    else:
        # General insights
        tasks = context.get("stats", {}).get("tasks", {})
        
        if tasks.get("overdue", 0) > 0:
            insights.append({
                "type": "warning",
                "icon": "⚠️",
                "title": f"{tasks['overdue']} Overdue Task(s)",
                "description": "Immediate action required.",
            })
        
        if tasks.get("dueSoon", 0) > 0:
            insights.append({
                "type": "info",
                "icon": "📅",
                "title": f"{tasks['dueSoon']} Task(s) Due Soon",
                "description": "Coming due within 7 days.",
            })
        
        if tasks.get("completedWeek", 0) > 0:
            insights.append({
                "type": "success",
                "icon": "✅",
                "title": f"{tasks['completedWeek']} Tasks Completed This Week",
                "description": "Great progress!",
            })
    
    return insights


# ══════════════════════════════════════════════════════════════════════════════
# MESSAGE BUILDING
# ══════════════════════════════════════════════════════════════════════════════

def build_messages(conversation_history: list, user_message: str) -> list:
    """Convert conversation history to OpenAI message format."""
    messages = []
    for msg in conversation_history[-10:]:
        role = msg.get("role")
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_message})
    return messages




# ══════════════════════════════════════════════════════════════════════════════
# ANALYZE USER DATA (Comprehensive MongoDB Aggregation)
# ══════════════════════════════════════════════════════════════════════════════

def analyze_user_data(user_id):
    """
    Comprehensive user data analysis with team, workload and process insights
    """
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None

        # Get all projects where user is owner or member
        user_projects = list(
            db.projects.find(
                {"$or": [{"user_id": user_id}, {"members.user_id": user_id}]}
            )
        )

        project_ids = [str(p["_id"]) for p in user_projects]
        project_ids_obj = [
            ObjectId(pid) for pid in project_ids
        ]  # useful for queries if needed

        # Fetch relevant collections
        my_tasks = list(db.tasks.find({"assignee_id": user_id}))
        all_tasks = list(db.tasks.find({"project_id": {"$in": project_ids}}))
        sprints = list(db.sprints.find({"project_id": {"$in": project_ids}}))

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # ─── Helper functions ──────────────────────────────────────
        def format_date(dt):
            if not dt:
                return None
            if isinstance(dt, str):
                try:
                    dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
                except:
                    return dt
            return dt.strftime("%Y-%m-%d")

        def days_ago(dt):
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

        # ─── Original Task Statistics (personal scope) ─────────────
        task_stats = {
            "total": len(my_tasks),
            "by_status": {},
            "by_priority": {},
            "overdue_count": 0,
            "due_soon_count": 0,
            "completed_this_week": 0,
            "completed_this_month": 0,
        }

        for task in my_tasks:
            status = task.get("status", "To Do")
            priority = task.get("priority", "Medium")

            task_stats["by_status"][status] = task_stats["by_status"].get(status, 0) + 1
            task_stats["by_priority"][priority] = (
                task_stats["by_priority"].get(priority, 0) + 1
            )

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

            completed = task.get("updated_at")
            if status in ["Done", "Closed"] and isinstance(completed, datetime):
                if completed > now - timedelta(days=7):
                    task_stats["completed_this_week"] += 1
                if completed > now - timedelta(days=30):
                    task_stats["completed_this_month"] += 1

        # ─── Team & Collaboration ──────────────────────────────────
        team_stats = {}
        for proj in user_projects:
            owner_id = proj.get("user_id")
            members = proj.get("members", [])
            member_ids = [m.get("user_id") for m in members if m.get("user_id")]

            team_stats[str(proj["_id"])] = {
                "name": proj.get("name", "Unnamed Project"),
                "owner_id": owner_id,
                "total_members": len(set(member_ids))
                + (1 if owner_id and owner_id not in member_ids else 0),
                "members_list": member_ids[:8],  # limited for prompt size
            }

        # Unique collaborators across all projects (excluding self)
        all_assignees = {t["assignee_id"] for t in all_tasks if t.get("assignee_id")}
        total_collaborators = len(all_assignees - {user_id})  # safely exclude self

        # ─── Workload distribution across team ─────────────────────
        assignee_workload = {}
        for task in all_tasks:
            assignee = task.get("assignee_id")
            if assignee:
                assignee_workload[assignee] = assignee_workload.get(assignee, 0) + 1

        top_assignees = sorted(
            assignee_workload.items(), key=lambda x: x[1], reverse=True
        )[:5]

        # ─── Blocked / Blocker tasks ───────────────────────────────
        blocked_count = 0
        blocking_count = 0
        for task in all_tasks:
            links = task.get("links", [])
            if any(l.get("type") == "blocked-by" for l in links):
                blocked_count += 1
            if any(l.get("type") == "blocks" for l in links):
                blocking_count += 1

        # ─── Simple velocity (last 30 days, all projects) ──────────
        completed_last_30d = sum(
            1
            for t in all_tasks
            if t.get("status") in ["Done", "Closed"]
            and t.get("updated_at")
            and days_ago(t["updated_at"]) is not None
            and days_ago(t["updated_at"]) <= 30
        )

        # ─── Final return structure ────────────────────────────────
        return {
            "user": {
                "name": user.get("name", "User"),
                "email": user.get("email"),
                "role": user.get("role", "Member"),
            },
            "team": {
                "total_collaborators": total_collaborators,
                "projects_team_info": team_stats,
            },
            "workload_distribution": {
                "total_tasks_in_projects": len(all_tasks),
                "top_assignees": [
                    {"user_id": uid, "task_count": count}
                    for uid, count in top_assignees
                ],
            },
            "blockers": {
                "blocked_tasks": blocked_count,
                "blocking_tasks": blocking_count,
            },
            "velocity": {"completed_last_30_days_all_projects": completed_last_30d},
            "stats": {
                "tasks": {
                    "total": task_stats["total"],
                    "overdue": task_stats["overdue_count"],
                    "dueSoon": task_stats["due_soon_count"],
                    "completedWeek": task_stats["completed_this_week"],
                    "completedMonth": task_stats["completed_this_month"],
                    "statusBreakdown": task_stats["by_status"],
                    "priorityBreakdown": task_stats["by_priority"],
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
                "sprints": {
                    "total": len(sprints),
                    "active": sum(1 for s in sprints if s.get("status") == "active"),
                    "completed": sum(
                        1 for s in sprints if s.get("status") == "completed"
                    ),
                },
            },
            "recentTasks": [
                {
                    "title": t.get("title", "Untitled"),
                    "status": t.get("status", "To Do"),
                    "priority": t.get("priority", "Medium"),
                    "dueDate": format_date(t.get("due_date")),
                    "projectId": t.get("project_id"),
                }
                for t in sorted(
                    my_tasks,
                    key=lambda x: x.get("updated_at", datetime.min),
                    reverse=True,
                )[:8]
            ],
            "topProjects": [
                {
                    "name": p.get("name", "Unnamed Project"),
                    "id": str(p["_id"]),
                    "taskCount": sum(
                        1 for t in all_tasks if t.get("project_id") == str(p["_id"])
                    ),
                }
                for p in user_projects[:6]
            ],
        }

    except Exception as e:
        print(f"Error analyzing user data: {str(e)}")
        import traceback

        traceback.print_exc()
        return None
