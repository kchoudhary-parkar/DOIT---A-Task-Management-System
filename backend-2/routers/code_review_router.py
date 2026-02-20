"""
Code Review API Router
Endpoints for AI-powered code review functionality
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from pydantic import BaseModel
from controllers import code_review_controller
from dependencies import get_current_user
from models.user import User

router = APIRouter(prefix="/api/code-review", tags=["Code Review"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================


class CreateCodeReviewRequest(BaseModel):
    project_id: str
    task_id: str
    pr_url: str
    trigger_analysis: bool = True


class CodeReviewResponse(BaseModel):
    status: str
    data: dict


class RetryReviewRequest(BaseModel):
    review_id: str


# ============================================================================
# CODE REVIEW ENDPOINTS
# ============================================================================


@router.post("/create")
async def create_code_review(
    request: CreateCodeReviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new code review for a pull request
    
    - **project_id**: Project ID
    - **task_id**: Task/ticket ID
    - **pr_url**: GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)
    - **trigger_analysis**: Start analysis immediately (default: true)
    """
    try:
        review = await code_review_controller.create_code_review_from_pr(
            project_id=request.project_id,
            task_id=request.task_id,
            pr_url=request.pr_url,
            trigger_analysis=request.trigger_analysis
        )
        
        return {
            "status": "success",
            "message": "Code review created successfully",
            "data": review
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/review/{review_id}")
async def get_code_review(
    review_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get code review by ID"""
    try:
        review = await code_review_controller.get_code_review_by_id(review_id)
        
        if not review:
            raise HTTPException(status_code=404, detail="Code review not found")
        
        return {
            "status": "success",
            "data": review
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}")
async def get_task_code_reviews(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all code reviews for a specific task"""
    try:
        reviews = await code_review_controller.get_code_reviews_by_task(task_id)
        
        return {
            "status": "success",
            "count": len(reviews),
            "data": reviews
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}")
async def get_project_code_reviews(
    project_id: str,
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """
    Get code reviews for a project
    
    - **status**: Filter by review status (pending, in_progress, completed, failed)
    - **limit**: Maximum number of reviews to return (default: 50)
    """
    try:
        reviews = await code_review_controller.get_code_reviews_by_project(
            project_id=project_id,
            status=status,
            limit=limit
        )
        
        return {
            "status": "success",
            "count": len(reviews),
            "data": reviews
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}/statistics")
async def get_project_review_statistics(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get code review statistics for a project"""
    try:
        stats = await code_review_controller.get_review_statistics(project_id)
        
        return {
            "status": "success",
            "data": stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/retry")
async def retry_failed_review(
    request: RetryReviewRequest,
    current_user: User = Depends(get_current_user)
):
    """Retry a failed code review"""
    try:
        result = await code_review_controller.retry_failed_review(request.review_id)
        
        return result
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def github_webhook(request: Request):
    """
    GitHub webhook endpoint for automatic PR code reviews
    
    Configure this webhook in your GitHub repository settings:
    - Payload URL: https://your-domain.com/api/code-review/webhook
    - Content type: application/json
    - Events: Pull requests
    """
    try:
        # Verify GitHub webhook signature (optional but recommended)
        # signature = request.headers.get("X-Hub-Signature-256")
        # Implement HMAC verification here
        
        payload = await request.json()
        
        result = await code_review_controller.handle_github_webhook(payload)
        
        return result
    
    except Exception as e:
        print(f"[WEBHOOK ERROR] {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK
# ============================================================================


@router.get("/health")
async def health_check():
    """Check if code review service is operational"""
    try:
        # Check Celery connection
        from celery_app import celery_app
        
        celery_status = "operational"
        try:
            celery_app.control.inspect().ping()
        except Exception as e:
            celery_status = f"error: {str(e)}"
        
        return {
            "status": "healthy",
            "celery": celery_status,
            "features": {
                "security_scanning": True,
                "ai_analysis": True,
                "quality_metrics": True,
                "github_integration": True
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
