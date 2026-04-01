"""
Celery Background Tasks for Code Review Analysis
Processes PR code reviews asynchronously
"""
import time
import requests
from datetime import datetime
from typing import Dict, Any, List
from celery_app import celery_app
from database import db
from bson import ObjectId
from models.code_review import (
    CodeReview,
    FileReview,
    SecurityFinding,
    AIReviewInsight,
    CodeQualityMetric
)
from utils.code_scanners import SecurityScanner, CodeQualityAnalyzer
from utils.ai_code_reviewer import AICodeReviewer
import os


@celery_app.task(bind=True, name="tasks.code_review_tasks.analyze_pr_code_review")
def analyze_pr_code_review(self, review_id: str, pr_data: Dict[str, Any]):
    """
    Background task to analyze a PR and generate code review
    
    Args:
        review_id: MongoDB ObjectId of the CodeReview document
        pr_data: Dictionary containing PR information from GitHub API
    
    Returns:
        Dictionary with review results
    """
    print(f"[CELERY TASK] Starting code review analysis for review_id: {review_id}")
    start_time = time.time()
    
    try:
        # Update review status to in_progress
        db.code_reviews.update_one(
            {"_id": ObjectId(review_id)},
            {
                "$set": {
                    "review_status": "in_progress",
                    "review_started_at": datetime.utcnow(),
                    "celery_task_id": self.request.id
                }
            }
        )
        
        # Fetch changed files from GitHub API
        print(f"[CELERY TASK] Fetching changed files for PR #{pr_data['pr_number']}")
        changed_files = fetch_pr_files(
            pr_data['repo_owner'],
            pr_data['repo_name'],
            pr_data['pr_number']
        )
        
        if not changed_files:
            raise Exception("No files found in PR")
        
        print(f"[CELERY TASK] Found {len(changed_files)} changed files")
        
        # Step 1: Run security scans
        print(f"[CELERY TASK] Running security scans...")
        scan_start = time.time()
        scanner = SecurityScanner()
        security_findings = []
        
        # Run async scan synchronously in Celery context
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        security_findings = loop.run_until_complete(scanner.scan_pr_changes(changed_files))
        loop.close()
        
        scan_duration = time.time() - scan_start
        print(f"[CELERY TASK] Security scan completed in {scan_duration:.2f}s - Found {len(security_findings)} issues")
        
        # Step 2: Analyze code quality
        print(f"[CELERY TASK] Analyzing code quality...")
        quality_analyzer = CodeQualityAnalyzer()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        quality_metrics = loop.run_until_complete(quality_analyzer.analyze_code_quality(changed_files))
        loop.close()
        
        # Step 3: AI-powered code review
        print(f"[CELERY TASK] Running AI code review with GPT-5.2...")
        ai_start = time.time()
        ai_reviewer = AICodeReviewer()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        ai_insights = loop.run_until_complete(
            ai_reviewer.analyze_pr(pr_data, changed_files, security_findings, quality_metrics)
        )
        loop.close()
        ai_duration = time.time() - ai_start
        print(f"[CELERY TASK] AI analysis completed in {ai_duration:.2f}s")
        
        # Step 4: Process file-level reviews
        file_reviews = []
        for file_info in changed_files:
            # Find security findings for this file
            file_findings = [
                f for f in security_findings 
                if f.file_path == file_info['filename']
            ]
            
            file_review = FileReview(
                file_path=file_info['filename'],
                additions=file_info.get('additions', 0),
                deletions=file_info.get('deletions', 0),
                changes=file_info.get('changes', 0),
                security_findings=file_findings,
                quality_metrics=[],  # Can be enhanced with per-file metrics
                ai_comments=[]  # Can be enhanced with per-file AI comments
            )
            file_reviews.append(file_review)
        
        # Step 5: Calculate scores
        quality_score = calculate_quality_score(quality_metrics, len(changed_files))
        security_score = calculate_security_score(security_findings)
        
        # Step 6: Count issues by severity
        critical_count = sum(1 for f in security_findings if f.severity == 'critical')
        high_count = sum(1 for f in security_findings if f.severity == 'high')
        medium_count = sum(1 for f in security_findings if f.severity == 'medium')
        low_count = sum(1 for f in security_findings if f.severity == 'low')
        
        # Step 7: Calculate totals
        total_additions = sum(f.get('additions', 0) for f in changed_files)
        total_deletions = sum(f.get('deletions', 0) for f in changed_files)
        
        total_duration = time.time() - start_time
        
        # Step 8: Update review document with results
        update_data = {
            "review_status": "completed",
            "review_completed_at": datetime.utcnow(),
            "files_reviewed": [fr.dict() for fr in file_reviews],
            "security_findings": [sf.dict() for sf in security_findings],
            "quality_score": quality_score,
            "security_score": security_score,
            "ai_insights": ai_insights.dict() if ai_insights else None,
            "total_files_changed": len(changed_files),
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "critical_issues_count": critical_count,
            "high_issues_count": high_count,
            "medium_issues_count": medium_count,
            "low_issues_count": low_count,
            "scan_duration_seconds": scan_duration,
            "ai_analysis_duration_seconds": ai_duration,
            "updated_at": datetime.utcnow()
        }
        
        db.code_reviews.update_one(
            {"_id": ObjectId(review_id)},
            {"$set": update_data}
        )
        
        print(f"[CELERY TASK] ✅ Code review completed successfully in {total_duration:.2f}s")
        print(f"[CELERY TASK]    Quality Score: {quality_score:.1f}/10")
        print(f"[CELERY TASK]    Security Score: {security_score:.1f}/10")
        print(f"[CELERY TASK]    Issues: {critical_count} critical, {high_count} high, {medium_count} medium")
        
        return {
            "status": "success",
            "review_id": review_id,
            "quality_score": quality_score,
            "security_score": security_score,
            "total_issues": len(security_findings),
            "duration_seconds": total_duration
        }
    
    except Exception as e:
        print(f"[CELERY TASK] ❌ Error during code review: {str(e)}")
        
        # Update review with error status
        db.code_reviews.update_one(
            {"_id": ObjectId(review_id)},
            {
                "$set": {
                    "review_status": "failed",
                    "error_message": str(e),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Re-raise exception for Celery to handle
        raise


def fetch_pr_files(repo_owner: str, repo_name: str, pr_number: int) -> List[Dict[str, Any]]:
    """
    Fetch changed files from GitHub PR API
    
    Returns:
        List of file dicts with filename, status, additions, deletions, patch
    """
    github_token = os.getenv("GITHUB_TOKEN")
    
    if not github_token:
        raise Exception("GITHUB_TOKEN not found in environment variables")
    
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/pulls/{pr_number}/files"
    
    headers = {
        "Authorization": f"token {github_token}",
        "Accept": "application/vnd.github.v3+json"
    }
    
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    
    files = response.json()
    
    # Format files for analysis
    formatted_files = []
    for file in files:
        formatted_files.append({
            "filename": file["filename"],
            "status": file["status"],  # added, modified, removed, renamed
            "additions": file["additions"],
            "deletions": file["deletions"],
            "changes": file["changes"],
            "patch": file.get("patch", "")  # Diff content
        })
    
    return formatted_files


def calculate_quality_score(quality_metrics: Dict[str, Any], file_count: int) -> float:
    """Calculate overall quality score from metrics"""
    if not quality_metrics:
        return 5.0  # Neutral score
    
    # Weighted average of different quality dimensions
    complexity = quality_metrics.get('complexity_score', 5.0)
    documentation = quality_metrics.get('documentation_score', 5.0)
    maintainability = quality_metrics.get('maintainability_score', 5.0)
    
    # Weight: complexity (30%), documentation (30%), maintainability (40%)
    score = (complexity * 0.3) + (documentation * 0.3) + (maintainability * 0.4)
    
    return round(score, 1)


def calculate_security_score(security_findings: List[SecurityFinding]) -> float:
    """Calculate security score based on findings"""
    if not security_findings:
        return 10.0  # Perfect score if no issues
    
    # Deduct points based on severity
    score = 10.0
    
    for finding in security_findings:
        if finding.severity == 'critical':
            score -= 2.0
        elif finding.severity == 'high':
            score -= 1.0
        elif finding.severity == 'medium':
            score -= 0.5
        elif finding.severity == 'low':
            score -= 0.2
    
    # Minimum score is 0
    return max(0.0, round(score, 1))
