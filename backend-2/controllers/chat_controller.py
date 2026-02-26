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
import re
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from typing import Dict, Any, List, Optional

from database import db
from utils.response import success_response, error_response
from utils.azure_ai_utils import (
    chat_completion,
    chat_completion_streaming,
    get_context_with_system_prompt,
    truncate_context,
    azure_client,
    AZURE_OPENAI_DEPLOYMENT,
)
from utils.ai_data_analyzer import (
    analyze_user_data_for_ai,
    build_ai_system_prompt,
    extract_insights_from_data,
)
from fastapi.responses import StreamingResponse
import asyncio


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
        "system_prompt": """You are DOIT-AI Voice Assistant, a friendly AI Project Manager powered by GPT-5.2.
You help teams succeed by providing real-time insights, smart recommendations, and proactive risk detection.
You're helpful, concise, and always focused on getting things done."""
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
            "velocity_check", "recommendation", "project_inquiry"
        ]
        
        print(f"🎯 Intent: {intent} | PM Query: {is_pm_query}")
        
        # ── 2. Extract entities (sprint name, project name, etc.) ─────────
        sprint_name = None
        project_name = None
        
        if intent == "sprint_status":
            sprint_name = extract_sprint_name(user_message)
            if sprint_name:
                print(f"🎯 [Entity Extraction] Sprint: '{sprint_name}'")
        
        if intent == "project_inquiry":
            project_name = extract_project_name(user_message)
            if project_name:
                print(f"🎯 [Entity Extraction] Project: '{project_name}'")
        
        # ── 3. Gather Context ──────────────────────────────────────────────
        if is_pm_query:
            # PM mode: Get project context + team data
            context = gather_pm_context(user_id, project_id, intent, sprint_name=sprint_name, project_name=project_name)
            system_prompt = build_pm_system_prompt(persona, context)
        else:
            # General mode: Get personal task/project data with AI-optimized analyzer
            user_data = analyze_user_data_for_ai(user_id)
            if not user_data:
                return error_response("Failed to analyze user data", 500)
            system_prompt = build_ai_system_prompt(user_data)
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
# PUBLIC API: Streaming Chat (for Voice)
# ══════════════════════════════════════════════════════════════════════════════

def chat_ask_streaming(body_str: str, user_id: str):
    """
    Streaming version of chat_ask for voice interface.
    Returns SSE stream with word-by-word generation for immediate TTS playback.
    """
    if not user_id:
        return error_response("Unauthorized. Please login.", 401)
    
    if not _azure_ready():
        return error_response("Azure OpenAI not initialized", 500)
    
    try:
        data = json.loads(body_str)
        user_message = data.get("message", "").strip()
        conversation_history = data.get("conversationHistory", [])
        persona = data.get("persona", "friendly")
        project_id = data.get("project_id")
        
        if not user_message:
            return error_response("Message is required", 400)
        
        print(f"💬 [Streaming Chat] User: {user_id}, Message: {user_message[:60]}...")
        
        # ── 1. Detect intent ────────────────────────────────────────────
        intent = detect_intent(user_message)
        is_pm_query = intent in [
            "risk_analysis", "assignment_suggestion", "team_inquiry",
            "sprint_status", "workload_check", "blocker_analysis",
            "velocity_check", "recommendation", "project_inquiry"
        ]
        
        # ── 2. Extract entities (sprint name, project name, etc.) ──────
        sprint_name = None
        project_name = None
        
        if intent == "sprint_status":
            sprint_name = extract_sprint_name(user_message)
            if sprint_name:
                print(f"🎯 [Entity Extraction] Sprint: '{sprint_name}'")
        
        if intent == "project_inquiry":
            project_name = extract_project_name(user_message)
            if project_name:
                print(f"🎯 [Entity Extraction] Project: '{project_name}'")
        
        # ── 3. Gather Context ───────────────────────────────────────────
        if is_pm_query:
            context = gather_pm_context(user_id, project_id, intent, sprint_name=sprint_name, project_name=project_name)
            system_prompt = build_pm_system_prompt(persona, context)
        else:
            # Use AI-optimized data analyzer for better performance
            user_data = analyze_user_data_for_ai(user_id)
            if not user_data:
                return error_response("Failed to analyze user data", 500)
            system_prompt = build_ai_system_prompt(user_data)
            context = user_data
        
        # ── 4. Build Messages ───────────────────────────────────────────
        prior_messages = build_messages(conversation_history, user_message)
        messages = get_context_with_system_prompt(
            prior_messages[:-1],
            system_prompt=system_prompt
        )
        messages.append({"role": "user", "content": user_message})
        messages = truncate_context(messages, max_tokens=8000)
        
        # ── 4. Return Streaming Response ───────────────────────────────
        return StreamingResponse(
            stream_chat_response(messages, context, is_pm_query, user_message),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )
    
    except json.JSONDecodeError:
        return error_response("Invalid JSON body", 400)
    except Exception as e:
        print(f"❌ [Streaming Chat] Error: {e}")
        import traceback
        traceback.print_exc()
        return error_response(f"Chat failed: {str(e)}", 500)


async def stream_chat_response(messages, context, is_pm_query, user_message):
    """
    Stream GPT-5.2 response word-by-word for immediate TTS playback.
    Yields SSE-formatted chunks.
    """
    try:
        print(f"📤 [Streaming] Starting stream with {len(messages)} messages")
        
        # Send initial metadata
        yield f"data: {json.dumps({'type': 'start', 'mode': 'pm' if is_pm_query else 'general'})}\n\n"
        
        # Stream GPT-5.2 response
        full_response = ""
        word_buffer = ""
        
        for chunk in chat_completion_streaming(messages, max_tokens=1500):
            full_response += chunk
            word_buffer += chunk
            
            # Send word-by-word when we hit spaces/punctuation
            if ' ' in word_buffer or any(p in word_buffer for p in ['.', '!', '?', ',', '\n']):
                words = word_buffer.split()
                for i, word in enumerate(words[:-1]):  # Keep last word in buffer
                    yield f"data: {json.dumps({'type': 'chunk', 'content': word + ' '})}\n\n"
                    await asyncio.sleep(0.01)  # Tiny delay for smoother streaming
                
                # Keep last incomplete word in buffer
                word_buffer = words[-1] if words else ""
        
        # Send remaining buffer
        if word_buffer:
            yield f"data: {json.dumps({'type': 'chunk', 'content': word_buffer})}\n\n"
        
        # Extract insights
        insights = extract_insights(context, user_message.lower(), is_pm_query)
        
        # Send completion event
        yield f"data: {json.dumps({'type': 'done', 'full_response': full_response, 'insights': insights})}\n\n"
        
        print(f"✅ [Streaming] Completed ({len(full_response)} chars)")
    
    except Exception as e:
        print(f"❌ [Streaming] Error: {e}")
        import traceback
        traceback.print_exc()
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"


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
        user_data = analyze_user_data_for_ai(user_id)
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

def extract_sprint_name(message: str) -> Optional[str]:
    """
    Extract sprint name from user message using pattern matching.
    Examples:
      - "how is the sprint image generation core looking" → "image generation core"
      - "status of sprint API integration" → "API integration"  
      - "what's sprint auth system progress" → "auth system"
    """
    msg_lower = message.lower()
    
    # Pattern 1: "sprint X" or "the sprint X"
    if "sprint " in msg_lower:
        # Find the word after "sprint"
        parts = msg_lower.split("sprint ")
        if len(parts) > 1:
            # Extract potential sprint name (everything after "sprint" until common end words)
            after_sprint = parts[1].strip()
            
            # Stop at common question words or actions
            stop_words = ["looking", "going", "doing", "status", "progress", "?", "how", "what", "when", "is"]
            
            words = []
            for word in after_sprint.split():
                if word in stop_words:
                    break
                words.append(word)
            
            if words:
                return " ".join(words).strip()
    
    return None


def extract_project_name(message: str) -> Optional[str]:
    """
    Extract project name from user message.
    Examples:
      - "provide me details about the project AI image generation platform" → "AI image generation platform"
      - "how's the project FastAPI Testing going" → "FastAPI Testing"
      - "tell me about project DOIT" → "DOIT"
    """
    msg_lower = message.lower()
    
    # Pattern 1: "project X" or "the project X"
    if "project " in msg_lower:
        parts = msg_lower.split("project ")
        if len(parts) > 1:
            after_project = parts[1].strip()
            
            # Stop at common question words
            stop_words = ["?", "how", "what", "when", "is", "going", "looking", "doing", "status"]
            
            words = []
            for word in after_project.split():
                if word in stop_words:
                    break
                words.append(word)
            
            if words:
                return " ".join(words).strip()
    
    # Pattern 2: Just look for project names without "project" keyword
    # This is more aggressive - look for capitalized phrases
    # We can enhance this later with entity recognition
    
    return None


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

def gather_pm_context(user_id: str, project_id: Optional[str], intent: str, sprint_name: Optional[str] = None, project_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Gather comprehensive PM context: projects, sprints, tasks, team workload.
    Similar to ai_pm_controller's gather_comprehensive_context but adapted for chat.
    
    Args:
        user_id: Current user's ID
        project_id: Optional specific project (auto-selected if None)
        intent: User intent for targeted data gathering
        sprint_name: Optional specific sprint name to search for and prioritize
        project_name: Optional specific project name to search for (overrides project_id)
    """
    context = {}
    
    try:
        # ── 1. Find project (by name if provided, otherwise auto-select) ──
        
        # If user asks about a specific project by name, search for it
        if project_name:
            project = db.projects.find_one({
                "$and": [
                    {
                        "$or": [
                            {"owner_id": user_id},
                            {"members": user_id}
                        ]
                    },
                    {
                        "name": {"$regex": f".*{project_name}.*", "$options": "i"}
                    }
                ]
            })
            
            if project:
                project_id = str(project['_id'])
                print(f"🎯 Found project by name '{project_name}': {project.get('name')}")
                context['_is_requested_project'] = True  # Mark this as the specific project user asked about
            else:
                print(f"⚠️ Project not found with name '{project_name}'")
                return {
                    "error": f"Project not found", 
                    "message": f"I couldn't find a project matching '{project_name}' in your workspace. You have access to these projects:",
                    "available_projects": [p.get('name', 'Unknown') for p in db.projects.find({
                        "$or": [{"owner_id": user_id}, {"members": user_id}]
                    }).limit(5)]
                }
        
        # Auto-select project if not provided
        if not project_id:
            user_projects = list(db.projects.find({
                "$or": [
                    {"owner_id": user_id},
                    {"members": user_id}
                ]
            }).sort("updated_at", -1).limit(1))
            
            if user_projects:
                project_id = str(user_projects[0]['_id'])
                print(f"📊 Auto-selected project: {project_id}")
        
        if not project_id:
            return {"error": "No project found for user"}
        
        # ── 2. Get comprehensive project details ──────────────────────────
        if not project_name:  # Only fetch if we didn't already fetch by name
            project = db.projects.find_one({"_id": ObjectId(project_id)})
        
        if project:
            context['project_name'] = project.get('name', 'Unknown')
            context['project_description'] = project.get('description', '')
            context['project_status'] = project.get('status', 'active')
            context['project_created'] = str(project.get('created_at', ''))[:10] if project.get('created_at') else 'Unknown'
            
            # Get owner info
            if project.get('owner_id'):
                owner = db.users.find_one({"_id": ObjectId(project['owner_id'])})
                if owner:
                    context['project_owner'] = owner.get('name', 'Unknown')
            
            # Get team members with actual user data
            members_ids = project.get('members', [])
            if project.get('owner_id') and project.get('owner_id') not in members_ids:
                members_ids.append(project.get('owner_id'))
            
            team_members_data = []
            for member_id in members_ids:
                try:
                    user = db.users.find_one({"_id": ObjectId(member_id)})
                    if user:
                        # Count tasks assigned to this member in this project
                        assigned_tasks = db.tasks.count_documents({
                            "project_id": project_id,
                            "assignee_id": str(user['_id']),
                            "status": {"$nin": ["completed", "Done", "Closed"]}
                        })
                        team_members_data.append({
                            "name": user.get('name', 'Unknown'),
                            "email": user.get('email', ''),
                            "active_tasks": assigned_tasks
                        })
                except:
                    pass
            
            context['team_size'] = len(team_members_data)
            context['team_members'] = [m['name'] for m in team_members_data[:10]]
            
            # If this is a requested project, add detailed team breakdown
            if context.get('_is_requested_project'):
                context['team_details'] = team_members_data
        
        # ── 3. Get comprehensive task data for project ────────────────────
        all_tasks = list(db.tasks.find({"project_id": project_id}))
        if all_tasks:
            context['total_tasks'] = len(all_tasks)
            context['completed_tasks'] = len([t for t in all_tasks if t.get('status') in ['completed', 'Done', 'Closed']])
            context['in_progress_tasks'] = len([t for t in all_tasks if t.get('status') in ['in_progress', 'In Progress']])
            context['pending_tasks'] = len([t for t in all_tasks if t.get('status') in ['pending', 'To Do']])
            context['blocked_tasks'] = len([t for t in all_tasks if t.get('status') == 'blocked'])
            
            # Priority breakdown
            context['high_priority_tasks'] = len([t for t in all_tasks if t.get('priority') in ['high', 'High']])
            context['medium_priority_tasks'] = len([t for t in all_tasks if t.get('priority') in ['medium', 'Medium']])
            context['low_priority_tasks'] = len([t for t in all_tasks if t.get('priority') in ['low', 'Low']])
            
            # Overdue tasks
            now = datetime.utcnow()
            overdue_tasks = [t for t in all_tasks 
                           if t.get('due_date') and isinstance(t['due_date'], datetime) 
                           and t['due_date'] < now 
                           and t.get('status') not in ['completed', 'Done', 'Closed']]
            context['overdue_tasks'] = len(overdue_tasks)
            
            # Recent tasks (if requested project)
            if context.get('_is_requested_project'):
                recent_tasks = sorted(all_tasks, key=lambda x: x.get('created_at', datetime.min), reverse=True)[:8]
                context['recent_tasks'] = []
                for t in recent_tasks:
                    assignee_name = "Unassigned"
                    if t.get('assignee_id'):
                        assignee = db.users.find_one({"_id": ObjectId(t['assignee_id'])})
                        if assignee:
                            assignee_name = assignee.get('name', 'Unknown')
                    
                    context['recent_tasks'].append({
                        "title": t.get('title', 'Untitled'),
                        "status": t.get('status', 'pending'),
                        "priority": t.get('priority', 'medium'),
                        "assignee": assignee_name,
                        "due_date": str(t.get('due_date', ''))[:10] if t.get('due_date') else 'No deadline'
                    })
        
        # ── 4. Get sprint summary ──────────────────────────────────────────
        # Get sprints - prioritize specific sprint if requested
        sprint_info = []
        specific_sprint = None
        
        # If sprint_name provided, search for it first
        if sprint_name:
            specific_sprint = db.sprints.find_one({
                "project_id": project_id,
                "name": {"$regex": f".*{sprint_name}.*", "$options": "i"}
            })
            
            if specific_sprint:
                # Get detailed breakdown for requested sprint
                sprint_tasks = list(db.tasks.find({"sprint_id": str(specific_sprint['_id'])}))
                completed = len([t for t in sprint_tasks if t.get('status') in ['completed', 'Done', 'Closed']])
                in_progress = len([t for t in sprint_tasks if t.get('status') in ['in_progress', 'In Progress']])
                blocked = len([t for t in sprint_tasks if t.get('status') == 'blocked'])
                
                # Check for overdue tasks
                now = datetime.utcnow()
                overdue_count = 0
                for task in sprint_tasks:
                    if (task.get('due_date') and isinstance(task['due_date'], datetime) 
                        and task['due_date'] < now 
                        and task.get('status') not in ['completed', 'Done', 'Closed']):
                        overdue_count += 1
                
                total = len(sprint_tasks)
                progress_pct = round((completed / total * 100) if total > 0 else 0, 1)
                
                # Get task details (top 10 most important)
                task_details = []
                for t in sprint_tasks[:10]:
                    assignee_name = "Unassigned"
                    if t.get('assignee_id'):
                        assignee = db.users.find_one({"_id": ObjectId(t['assignee_id'])})
                        if assignee:
                            assignee_name = assignee.get('name', 'Unknown')
                    
                    task_details.append({
                        "title": t.get('title', 'Untitled'),
                        "status": t.get('status', 'pending'),
                        "assignee": assignee_name,
                        "priority": t.get('priority', 'medium'),
                        "due_date": str(t.get('due_date', ''))[:10] if t.get('due_date') else 'No deadline'
                    })
                
                sprint_info.append({
                    "name": specific_sprint.get('name', 'Unknown'),
                    "status": specific_sprint.get('status', 'active'),
                    "progress": f"{completed}/{total} tasks ({progress_pct}% complete)",
                    "start_date": str(specific_sprint.get('start_date', ''))[:10],
                    "end_date": str(specific_sprint.get('end_date', ''))[:10],
                    "in_progress": in_progress,
                    "blocked": blocked,
                    "overdue": overdue_count,
                    "task_details": task_details,
                    "_is_requested": True  # Mark as the user's requested sprint
                })
        
        # Get last 3 sprints for context (exclude specific sprint if already added)
        sprints_query = {"project_id": project_id}
        if specific_sprint:
            sprints_query["_id"] = {"$ne": specific_sprint['_id']}
        
        sprints = list(db.sprints.find(sprints_query).sort("created_at", -1).limit(3))
        if sprints:
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
    base_prompt += """## YOUR CORE CAPABILITIES
🎯 Sprint Risk Analysis - Predict delays before they happen
👥 Smart Task Assignment - Match tasks to team members based on skills & workload
🚧 Bottleneck Detection - Identify blockers and workload imbalances
📊 Sprint Health Insights - Real-time status with actionable recommendations
💡 Proactive Monitoring - Alert teams about risks automatically

## RESPONSE INTELLIGENCE
You understand user intent and adapt your responses:

**When user asks for brief info** (e.g., "just names", "quick list", "summary only"):
→ Respond with ONLY what was requested. No explanations. Just facts.
   Example: "Sarah, John, Alex" (not paragraphs about each person)

**When user asks "How's [Sprint/Project]?":**
→ **ALWAYS use the specific sprint data from the context (marked with 🎯 REQUESTED SPRINT)**
→ Reference ACTUAL task details: which tasks are blocked, who's assigned, specific due dates
→ Give structured analysis with:
   1. Progress (use exact percentages: "45% complete with 12/27 tasks done")
   2. Risk Areas (mention SPECIFIC tasks that are blocked/overdue)
   3. Team Status (who's working on what, who has too many tasks)
   4. Next Actions (concrete steps with task names)
→ Example: "Sprint Image Gen Core is 45% complete. Sarah's task 'API Integration' is 3 days overdue and blocking 2 other tasks. John has 8 tasks—3x the team average. I recommend reassigning his 'UI Polish' tasks to Alex who has bandwidth. Want me to create that plan?"

**When user says "Yes" or "Do it":**
→ Confirm the action you'll take
→ Execute (or explain what would be done)
→ Report results with metrics

**For assignment suggestions:**
→ Give top 3 candidates with:
   • Score (0-100)
   • Expertise (relevant past work)
   • Current workload
   • Recommendation (why they're the best choice)

## VOICE MODE RULES (CRITICAL)
Since you're being used as a VOICE assistant:
✓ Keep responses CONCISE - 3-4 sentences max unless asked for details
✓ Start with the KEY INSIGHT first (most important fact)
✓ Use natural, conversational language (like talking to a colleague)
✓ Avoid long lists - summarize (e.g., "3 major issues" then list briefly)
✓ End with a CLEAR QUESTION or NEXT STEP
✓ Use emojis sparingly (only for critical alerts: 🚨⚠️✅)

## DATA ANALYSIS APPROACH ⚠️ CRITICAL
1. **USE THE DETAILED TASK DATA PROVIDED** - When context shows "Task Details" with specific task names, assignees, and due dates, REFERENCE THEM BY NAME
2. Always mention SPECIFIC NUMBERS from the context (not vague estimates)
3. For sprint queries, cite ACTUAL TASK TITLES when discussing blockers/risks
4. Compare against team averages (if team average is 3 tasks but Sarah has 8, SAY THAT)
5. Provide ACTIONABLE recommendations with task names (e.g., "Move 'API Polish' task to Sprint 6")
6. Prioritize actions (what to do FIRST, with specific tasks/people)
7. NEVER give generic responses when detailed data is available

## PROACTIVE BEHAVIOR
If you detect:
- High risk (>70%): Alert immediately with specific numbers
- Workload imbalance: Suggest redistribution
- Blocked tasks: Identify blockers and next steps
- Sprint delays: Recommend task moves or deadline adjustments

## EXAMPLE CONVERSATIONS (Learn from these patterns)

**Example 1: Sprint Status Query (with detailed data)**
User: "How's the sprint image generation core looking?"
You: "Sprint Image Gen Core is 45% complete—12 of 27 tasks done. 🚨 Critical issue: Sarah's 'API Integration' task is 3 days overdue and blocking 'Frontend UI' and 'Testing Suite'. Also, John has 8 tasks assigned vs team average of 3. I recommend: 1) Prioritize unblocking API Integration today, 2) Reassign John's 'Documentation' tasks to Alex who has bandwidth. Want me to create that action plan?"

**Example 2: Brief Response**
User: "Who's on the design team? Just names."
You: "Sarah Kumar, John Smith, Alex Chen."

**Example 3: Project Details Query (with real data)**
User: "Provide me details about the project AI Image Generation Platform"
You: "AI Image Generation Platform is active with 27 tasks total—15 done, 8 in progress, 4 pending. Team has 5 members: Sarah (8 tasks), John (5 tasks), Alex (2 tasks), Lisa (1 task), Mike (0 tasks). 🚨 Alert: 3 tasks are overdue and 2 are blocked. Main areas: 12 high-priority tasks focused on Stable Diffusion integration and API development. Recent work includes 'Image Upscaling API' by Sarah and 'Prompt Engineering Module' by John. Want me to break down the blockers or suggest task redistribution?"

**Example 4: Assignment Suggestion**
User: "Who should I assign the React optimization task to?"
You: "Top pick: Sarah Kumar (92/100). She's completed 15 React tasks with 95% success rate and has light workload (4 tasks). John Smith is also good (78/100) but he's busy with 9 tasks. Want me to assign it to Sarah?"

**Example 5: Confirmation**
User: "Yes, do it."
You: "✅ Done! Task assigned to Sarah Kumar. I've notified her and added it to Sprint 5. Expected completion: 3 days."

**Example 6: Risk Alert**
User: "What should I focus on today?"
You: "🚨 Priority 1: Unblock GTP-045—it's blocking 3 other tasks. Priority 2: Review Sarah's workload (8 tasks vs team avg of 3). Priority 3: Sprint 5 ends in 3 days with 40% incomplete. Start with GTP-045?"
"""
    
    # Add project context
    if context:
        base_prompt += "\n\n## CURRENT PROJECT DATA\n"
        base_prompt += format_pm_context(context)
    
    return base_prompt


# ══════════════════════════════════════════════════════════════════════════════
# NOTE: analyze_user_data_for_ai() and build_ai_system_prompt() are now imported
# from utils.ai_data_analyzer.py for better optimization and richer context
# ══════════════════════════════════════════════════════════════════════════════


def format_pm_context(context: Dict[str, Any]) -> str:
    """Format PM context for GPT."""
    lines = []
    
    # ── If user asked about a SPECIFIC PROJECT, show detailed breakdown ──
    if context.get('_is_requested_project'):
        lines.append(f"🎯 **REQUESTED PROJECT: {context.get('project_name', 'Unknown')}**")
        lines.append(f"Status: {context.get('project_status', 'active')} | Created: {context.get('project_created', 'Unknown')}")
        
        if 'project_description' in context and context['project_description']:
            lines.append(f"Description: {context['project_description']}")
        
        if 'project_owner' in context:
            lines.append(f"Owner: {context['project_owner']}")
        
        # Team breakdown with task counts
        if 'team_details' in context:
            lines.append(f"\n**Team Members ({context.get('team_size', 0)} total):**")
            for member in context['team_details'][:8]:
                lines.append(f"  • {member['name']} - {member['active_tasks']} active tasks")
        
        # Comprehensive task statistics
        if 'total_tasks' in context:
            lines.append(f"\n**Task Overview:**")
            total = context['total_tasks']
            completed = context.get('completed_tasks', 0)
            in_progress = context.get('in_progress_tasks', 0)
            pending = context.get('pending_tasks', 0)
            blocked = context.get('blocked_tasks', 0)
            overdue = context.get('overdue_tasks', 0)
            
            completion_pct = int((completed / total * 100)) if total > 0 else 0
            lines.append(f"  Total: {total} tasks | {completion_pct}% complete")
            lines.append(f"  Status: ✅ {completed} done | 🏃 {in_progress} in progress | 📋 {pending} pending")
            
            if blocked > 0:
                lines.append(f"  🚧 BLOCKED: {blocked} tasks need attention")
            if overdue > 0:
                lines.append(f"  🚨 OVERDUE: {overdue} tasks past deadline")
            
            # Priority breakdown
            if 'high_priority_tasks' in context:
                high = context.get('high_priority_tasks', 0)
                medium = context.get('medium_priority_tasks', 0)
                low = context.get('low_priority_tasks', 0)
                lines.append(f"  Priority: 🔴 {high} high | 🟡 {medium} medium | 🟢 {low} low")
        
        # Recent tasks with details
        if 'recent_tasks' in context and context['recent_tasks']:
            lines.append(f"\n**Recent Tasks:**")
            for task in context['recent_tasks'][:5]:
                status_emoji = "✅" if task['status'] in ['completed', 'Done'] else ("🏃" if task['status'] == 'in_progress' else "📋")
                priority_emoji = "🔴" if task['priority'] == 'high' else ("🟡" if task['priority'] == 'medium' else "🟢")
                lines.append(f"  {priority_emoji} {status_emoji} {task['title']}")
                lines.append(f"      Assignee: {task['assignee']} | Due: {task['due_date']}")
        
        lines.append("\n" + "="*60 + "\n")
    
    # ── Standard project info (for non-specific queries) ──
    elif 'project_name' in context:
        lines.append(f"**Project:** {context['project_name']}")
        if 'project_description' in context:
            lines.append(f"Description: {context['project_description'][:120]}")
    
    if 'team_size' in context:
        lines.append(f"\n**Team Size:** {context['team_size']} members")
        if 'team_members' in context:
            member_list = ', '.join(context['team_members'][:5])
            if len(context['team_members']) > 5:
                member_list += f" (+{len(context['team_members']) - 5} more)"
            lines.append(f"Members: {member_list}")
    
    if 'sprints' in context:
        lines.append("\n**Sprint Status:**")
        for sprint in context['sprints'][:3]:  # Limit to 3 most relevant
            # Check if this is the specific sprint user asked about
            is_requested = sprint.get('_is_requested', False)
            
            # Extract progress percentage from 'progress' field
            progress_pct = 0
            if 'progress' in sprint:
                # Parse "X/Y tasks (Z% complete)" or "X/Y tasks"
                if '%' in sprint['progress']:
                    match = re.search(r'(\d+)%', sprint['progress'])
                    if match:
                        progress_pct = int(match.group(1))
                elif '/' in sprint['progress']:
                    parts = sprint['progress'].split('/')
                    if len(parts) == 2:
                        try:
                            completed = int(parts[0])
                            total = int(parts[1].split()[0])
                            progress_pct = int((completed / total) * 100) if total > 0 else 0
                        except:
                            pass
            
            status_emoji = "🏃" if sprint['status'] == 'active' else ("✅" if sprint['status'] == 'completed' else "📋")
            
            # Format header
            if is_requested:
                lines.append(f"\n🎯 **REQUESTED SPRINT: {sprint['name']}** ({sprint['status']}) - {sprint.get('progress', 'N/A')}")
            else:
                lines.append(f"{status_emoji} {sprint['name']} ({sprint['status']}) - {sprint.get('progress', 'N/A')}")
            
            # Add detailed breakdown for requested sprint
            if is_requested:
                if 'in_progress' in sprint:
                    lines.append(f"   🏃 In Progress: {sprint['in_progress']}")
                if sprint.get('blocked', 0) > 0:
                    lines.append(f"   🚧 BLOCKED: {sprint['blocked']} tasks")
                if sprint.get('overdue', 0) > 0:
                    lines.append(f"   🚨 OVERDUE: {sprint['overdue']} tasks")
                
                # Show task details
                if 'task_details' in sprint and sprint['task_details']:
                    lines.append(f"\n   **Task Details:**")
                    for task in sprint['task_details'][:5]:  # Show top 5 tasks
                        priority_emoji = "🔴" if task['priority'] == 'high' else ("🟡" if task['priority'] == 'medium' else "🟢")
                        status_marker = "✅" if task['status'] in ['completed', 'Done'] else ("🏃" if task['status'] == 'in_progress' else "📋")
                        lines.append(f"     {priority_emoji} {status_marker} {task['title']}")
                        lines.append(f"        Assignee: {task['assignee']} | Due: {task['due_date']}")
                
                # Show dates
                if 'start_date' in sprint and 'end_date' in sprint:
                    lines.append(f"   📅 {sprint['start_date']} to {sprint['end_date']}")
            else:
                # Basic info for other sprints
                if 'days_remaining' in sprint:
                    lines.append(f"   ⏱️ Days remaining: {sprint['days_remaining']}")
                if sprint.get('pending_tasks', 0) > 0:
                    lines.append(f"   📋 Pending: {sprint['pending_tasks']} tasks")
    
    if 'total_tasks' in context:
        lines.append("\n**Task Breakdown:**")
        task_summary = f"Total: {context['total_tasks']}"
        if 'completed_tasks' in context:
            completion_rate = int((context['completed_tasks'] / context['total_tasks']) * 100) if context['total_tasks'] > 0 else 0
            task_summary += f"  |  ✅ Completed: {context['completed_tasks']} ({completion_rate}%)"
        if 'in_progress_tasks' in context:
            task_summary += f"  |  🏃 In Progress: {context['in_progress_tasks']}"
        if 'pending_tasks' in context:
            task_summary += f"  |  📋 Pending: {context['pending_tasks']}"
        lines.append(task_summary)
        
        # Critical alerts
        if context.get('blocked_tasks', 0) > 0:
            lines.append(f"🚧 BLOCKED: {context['blocked_tasks']} tasks need unblocking")
        if context.get('overdue_tasks', 0) > 0:
            lines.append(f"🚨 OVERDUE: {context['overdue_tasks']} tasks past due date")
    
    if 'team_workload' in context:
        lines.append("\n**Team Workload Distribution:**")
        # Sort by task count to show imbalances
        sorted_workload = sorted(context['team_workload'], key=lambda x: x.get('total_tasks', 0), reverse=True)
        
        total_tasks_sum = sum(m.get('total_tasks', 0) for m in sorted_workload)
        avg_tasks = total_tasks_sum / len(sorted_workload) if sorted_workload else 0
        
        for member in sorted_workload[:5]:  # Show top 5
            task_count = member.get('total_tasks', 0)
            active = member.get('active_tasks', 0)
            
            # Add warning emoji if significantly above average
            warning = "⚠️ " if task_count > avg_tasks * 1.5 else ""
            
            lines.append(f"{warning}{member['name']}: {task_count} total ({active} active)")
        
        if avg_tasks > 0:
            lines.append(f"📊 Team average: {avg_tasks:.1f} tasks/person")
    
    # Add velocity/performance metrics if available
    if 'velocity' in context:
        lines.append(f"\n**Team Velocity:** {context['velocity']} tasks/sprint (last 3 sprints)")
    
    return '\n'.join(lines) if lines else "No project data available."


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
    # For general queries, use the AI data analyzer's insights
    if not is_pm_query:
        return extract_insights_from_data(context)
    
    # For PM queries, use the existing logic
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
# NOTE: analyze_user_data() is now replaced with analyze_user_data_for_ai()
# from utils.ai_data_analyzer.py for better performance and richer context
# - Optimizes MongoDB queries by excluding large arrays (activities, attachments)
# - Provides more comprehensive user insights and task automation capabilities
# ══════════════════════════════════════════════════════════════════════════════
