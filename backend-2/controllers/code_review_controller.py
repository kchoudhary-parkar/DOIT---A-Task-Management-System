"""
Code Review Controller
Handles code review operations and orchestration
"""
from fastapi import HTTPException
from database import db
from bson import ObjectId
from datetime import datetime
from typing import List, Dict, Any, Optional
from models.code_review import CodeReview, CodeReviewSummary
import requests
import os


async def create_code_review_from_pr(
    project_id: str,
    task_id: str,
    pr_url: str,
    trigger_analysis: bool = True
) -> Dict[str, Any]:
    """
    Create a new code review for a pull request
    
    Args:
        project_id: Project ID
        task_id: Task/ticket ID
        pr_url: GitHub PR URL
        trigger_analysis: Whether to start background analysis immediately
    
    Returns:
        Created code review document
    """
    try:
        # Parse PR URL to extract owner, repo, and PR number
        pr_info = parse_github_pr_url(pr_url)
        
        if not pr_info:
            raise HTTPException(status_code=400, detail="Invalid GitHub PR URL")
        
        # Fetch PR details from GitHub API
        pr_data = fetch_github_pr_details(
            pr_info['owner'],
            pr_info['repo'],
            pr_info['pr_number']
        )
        
        # Create code review document
        review_doc = {
            "project_id": project_id,
            "task_id": task_id,
            "pr_number": pr_data['number'],
            "pr_title": pr_data['title'],
            "pr_url": pr_url,
            "pr_branch": pr_data['head']['ref'],
            "pr_author": pr_data['user']['login'],
            "pr_created_at": datetime.fromisoformat(pr_data['created_at'].replace('Z', '+00:00')),
            "pr_merged": pr_data.get('merged', False),
            "pr_merged_at": datetime.fromisoformat(pr_data['merged_at'].replace('Z', '+00:00')) if pr_data.get('merged_at') else None,
            "review_status": "pending",
            "files_reviewed": [],
            "security_findings": [],
            "quality_score": 0.0,
            "security_score": 0.0,
            "total_files_changed": 0,
            "total_additions": 0,
            "total_deletions": 0,
            "critical_issues_count": 0,
            "high_issues_count": 0,
            "medium_issues_count": 0,
            "low_issues_count": 0,
            "scan_duration_seconds": 0.0,
            "ai_analysis_duration_seconds": 0.0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = db.code_reviews.insert_one(review_doc)
        review_id = str(result.inserted_id)
        
        print(f"[CODE REVIEW] Created review {review_id} for PR #{pr_data['number']}")
        
        # Trigger background analysis
        if trigger_analysis:
            from tasks.code_review_tasks import analyze_pr_code_review
            
            # Prepare PR data for background task
            task_pr_data = {
                'repo_owner': pr_info['owner'],
                'repo_name': pr_info['repo'],
                'pr_number': pr_info['pr_number'],
                'title': pr_data['title'],
                'description': pr_data.get('body', ''),
                'author': pr_data['user']['login']
            }
            
            # Queue Celery task
            task = analyze_pr_code_review.delay(review_id, task_pr_data)
            print(f"[CODE REVIEW] Queued analysis task: {task.id}")
            
            # Update with task ID
            db.code_reviews.update_one(
                {"_id": result.inserted_id},
                {"$set": {"celery_task_id": task.id}}
            )
        
        # Return created review
        review_doc['_id'] = review_id
        return review_doc
    
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_code_review_by_id(review_id: str) -> Optional[Dict[str, Any]]:
    """Get code review by ID"""
    try:
        review = db.code_reviews.find_one({"_id": ObjectId(review_id)})
        
        if not review:
            return None
        
        review['_id'] = str(review['_id'])
        return review
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_code_reviews_by_task(task_id: str) -> List[Dict[str, Any]]:
    """Get all code reviews for a task"""
    try:
        reviews = list(db.code_reviews.find({"task_id": task_id}).sort("created_at", -1))
        
        for review in reviews:
            review['_id'] = str(review['_id'])
        
        return reviews
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_code_reviews_by_project(
    project_id: str,
    status: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Get code reviews for a project"""
    try:
        query = {"project_id": project_id}
        
        if status:
            query["review_status"] = status
        
        reviews = list(
            db.code_reviews.find(query)
            .sort("created_at", -1)
            .limit(limit)
        )
        
        for review in reviews:
            review['_id'] = str(review['_id'])
        
        return reviews
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def get_review_statistics(project_id: str) -> Dict[str, Any]:
    """Get code review statistics for a project"""
    try:
        pipeline = [
            {"$match": {"project_id": project_id}},
            {"$group": {
                "_id": None,
                "total_reviews": {"$sum": 1},
                "completed_reviews": {
                    "$sum": {"$cond": [{"$eq": ["$review_status", "completed"]}, 1, 0]}
                },
                "pending_reviews": {
                    "$sum": {"$cond": [{"$eq": ["$review_status", "pending"]}, 1, 0]}
                },
                "in_progress_reviews": {
                    "$sum": {"$cond": [{"$eq": ["$review_status", "in_progress"]}, 1, 0]}
                },
                "failed_reviews": {
                    "$sum": {"$cond": [{"$eq": ["$review_status", "failed"]}, 1, 0]}
                },
                "avg_quality_score": {"$avg": "$quality_score"},
                "avg_security_score": {"$avg": "$security_score"},
                "total_critical_issues": {"$sum": "$critical_issues_count"},
                "total_high_issues": {"$sum": "$high_issues_count"},
                "total_files_reviewed": {"$sum": "$total_files_changed"}
            }}
        ]
        
        result = list(db.code_reviews.aggregate(pipeline))
        
        if not result:
            return {
                "total_reviews": 0,
                "completed_reviews": 0,
                "pending_reviews": 0,
                "in_progress_reviews": 0,
                "failed_reviews": 0,
                "avg_quality_score": 0.0,
                "avg_security_score": 0.0,
                "total_critical_issues": 0,
                "total_high_issues": 0,
                "total_files_reviewed": 0
            }
        
        stats = result[0]
        stats.pop('_id', None)
        
        # Round averages
        stats['avg_quality_score'] = round(stats.get('avg_quality_score', 0), 1)
        stats['avg_security_score'] = round(stats.get('avg_security_score', 0), 1)
        
        return stats
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def retry_failed_review(review_id: str) -> Dict[str, Any]:
    """Retry a failed code review"""
    try:
        review = db.code_reviews.find_one({"_id": ObjectId(review_id)})
        
        if not review:
            raise HTTPException(status_code=404, detail="Code review not found")
        
        if review['review_status'] != 'failed':
            raise HTTPException(status_code=400, detail="Can only retry failed reviews")
        
        # Reset review status
        db.code_reviews.update_one(
            {"_id": ObjectId(review_id)},
            {
                "$set": {
                    "review_status": "pending",
                    "error_message": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Trigger analysis
        from tasks.code_review_tasks import analyze_pr_code_review
        
        task_pr_data = {
            'repo_owner': parse_github_pr_url(review['pr_url'])['owner'],
            'repo_name': parse_github_pr_url(review['pr_url'])['repo'],
            'pr_number': review['pr_number'],
            'title': review['pr_title'],
            'description': '',
            'author': review['pr_author']
        }
        
        task = analyze_pr_code_review.delay(review_id, task_pr_data)
        
        db.code_reviews.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": {"celery_task_id": task.id}}
        )
        
        return {"status": "success", "message": "Review analysis restarted", "task_id": task.id}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def parse_github_pr_url(pr_url: str) -> Optional[Dict[str, Any]]:
    """
    Parse GitHub PR URL to extract owner, repo, and PR number
    
    Example: https://github.com/owner/repo/pull/123
    """
    import re
    
    pattern = r'github\.com/([^/]+)/([^/]+)/pull/(\d+)'
    match = re.search(pattern, pr_url)
    
    if match:
        return {
            'owner': match.group(1),
            'repo': match.group(2),
            'pr_number': int(match.group(3))
        }
    
    return None


def fetch_github_pr_details(owner: str, repo: str, pr_number: int) -> Dict[str, Any]:
    """Fetch PR details from GitHub API"""
    github_token = os.getenv("GITHUB_TOKEN")
    
    if not github_token:
        raise Exception("GITHUB_TOKEN not configured")
    
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    
    return response.json()


async def handle_github_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handle GitHub webhook for PR events
    Automatically trigger code review when PR is opened or updated
    """
    try:
        action = payload.get('action')
        pr_data = payload.get('pull_request')
        
        if not pr_data:
            return {"status": "ignored", "reason": "No PR data in webhook"}
        
        # Only process opened, synchronize (updated), or reopened PRs
        if action not in ['opened', 'synchronize', 'reopened']:
            return {"status": "ignored", "reason": f"Action '{action}' not relevant"}
        
        pr_url = pr_data['html_url']
        
        # Extract task ID from PR title or branch name
        # Format: [GTP-001] PR Title or branch: feature/GTP-001-description
        task_id = extract_task_id_from_pr(pr_data)
        
        if not task_id:
            return {"status": "ignored", "reason": "No task ID found in PR"}
        
        # Find task in database
        task = db.tasks.find_one({"ticket_id": task_id})
        
        if not task:
            return {"status": "error", "reason": f"Task {task_id} not found"}
        
        project_id = str(task['project_id'])
        task_id_str = str(task['_id'])
        
        # Check if review already exists for this PR
        existing_review = db.code_reviews.find_one({
            "task_id": task_id_str,
            "pr_number": pr_data['number']
        })
        
        if existing_review and existing_review['review_status'] not in ['failed']:
            return {
                "status": "skipped",
                "reason": "Review already exists",
                "review_id": str(existing_review['_id'])
            }
        
        # Create code review
        review = await create_code_review_from_pr(
            project_id=project_id,
            task_id=task_id_str,
            pr_url=pr_url,
            trigger_analysis=True
        )
        
        return {
            "status": "success",
            "action": "code_review_created",
            "review_id": review['_id'],
            "pr_number": pr_data['number']
        }
    
    except Exception as e:
        print(f"[WEBHOOK ERROR] {str(e)}")
        return {"status": "error", "reason": str(e)}


def extract_task_id_from_pr(pr_data: Dict[str, Any]) -> Optional[str]:
    """Extract task ID from PR title or branch name"""
    import re
    
    # Pattern to match task IDs like GTP-001, TASK-123, etc.
    pattern = r'([A-Z]+-\d+)'
    
    # Check PR title first
    title = pr_data.get('title', '')
    match = re.search(pattern, title)
    if match:
        return match.group(1)
    
    # Check branch name
    branch = pr_data.get('head', {}).get('ref', '')
    match = re.search(pattern, branch)
    if match:
        return match.group(1)
    
    return None
