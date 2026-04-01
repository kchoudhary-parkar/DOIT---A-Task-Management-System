"""
Code Review Model
Stores AI-generated code reviews with security findings and quality metrics
"""
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class SecurityFinding(BaseModel):
    """Individual security issue found by scanners"""
    severity: str  # critical, high, medium, low, info
    type: str  # e.g., "SQL Injection", "Hardcoded Secret", "XSS"
    message: str
    file_path: str
    line_number: int
    code_snippet: str
    recommendation: str
    scanner: str  # bandit, semgrep, pattern-match


class CodeQualityMetric(BaseModel):
    """Code quality metrics calculated during review"""
    category: str  # complexity, maintainability, documentation, testing
    score: float  # 0-10
    issues: List[str]
    recommendations: List[str]


class AIReviewInsight(BaseModel):
    """AI-generated insights from GPT-5.2"""
    summary: str
    strengths: List[str]
    weaknesses: List[str]
    architecture_feedback: str
    best_practices: List[Dict[str, str]]  # [{issue: str, suggestion: str}]
    estimated_risk_level: str  # low, medium, high, critical


class FileReview(BaseModel):
    """Review data for a single file"""
    file_path: str
    additions: int
    deletions: int
    changes: int
    security_findings: List[SecurityFinding] = []
    quality_metrics: List[CodeQualityMetric] = []
    ai_comments: List[str] = []


class CodeReview(BaseModel):
    """Main code review document"""
    id: Optional[str] = Field(None, alias="_id")
    project_id: str
    task_id: str  # Link to the ticket/task
    pr_number: int
    pr_title: str
    pr_url: str
    pr_branch: str
    pr_author: str
    pr_created_at: datetime
    pr_merged: bool = False
    pr_merged_at: Optional[datetime] = None
    
    # Review metadata
    review_status: str = "pending"  # pending, in_progress, completed, failed
    review_started_at: Optional[datetime] = None
    review_completed_at: Optional[datetime] = None
    
    # Analysis results
    files_reviewed: List[FileReview] = []
    security_findings: List[SecurityFinding] = []
    quality_score: float = 0.0  # Overall score 0-10
    security_score: float = 0.0  # Security score 0-10
    ai_insights: Optional[AIReviewInsight] = None
    
    # Statistics
    total_files_changed: int = 0
    total_additions: int = 0
    total_deletions: int = 0
    critical_issues_count: int = 0
    high_issues_count: int = 0
    medium_issues_count: int = 0
    low_issues_count: int = 0
    
    # Execution metadata
    scan_duration_seconds: float = 0.0
    ai_analysis_duration_seconds: float = 0.0
    celery_task_id: Optional[str] = None
    error_message: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }
        populate_by_name = True


class CodeReviewSummary(BaseModel):
    """Lightweight summary for dashboard lists"""
    id: str = Field(..., alias="_id")
    task_id: str
    pr_number: int
    pr_title: str
    review_status: str
    quality_score: float
    security_score: float
    critical_issues_count: int
    created_at: datetime

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        populate_by_name = True
