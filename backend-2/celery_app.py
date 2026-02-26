"""
Celery Configuration for Background Task Processing
Used for asynchronous code review analysis
"""
import os
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

# Redis configuration for Celery broker and result backend
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Initialize Celery app
celery_app = Celery(
    "doit_worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks.code_review_tasks", "tasks.ai_pm_tasks"]
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution settings
    task_track_started=True,
    task_time_limit=600,  # 10 minutes max per task
    task_soft_time_limit=540,  # 9 minutes soft limit
    
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_extended=True,
    
    # Worker settings
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
    
    # Rate limiting
    task_default_rate_limit="10/m",  # Max 10 tasks per minute
)

# Task routing (optional - for multiple queues)
celery_app.conf.task_routes = {
    "tasks.code_review_tasks.analyze_pr_code_review": {
        "queue": "code_review",
        "routing_key": "code_review.analyze",
    },
    "tasks.ai_pm_tasks.scan_projects_for_risks": {
        "queue": "ai_pm",
        "routing_key": "ai_pm.scan_risks",
    },
    "tasks.ai_pm_tasks.update_team_insights": {
        "queue": "ai_pm",
        "routing_key": "ai_pm.insights",
    },
}

print("✅ Celery app initialized")
print(f"   Broker: {REDIS_URL}")
print(f"   Tasks included: tasks.code_review_tasks, tasks.ai_pm_tasks")
