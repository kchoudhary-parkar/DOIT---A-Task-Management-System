"""
models/meeting.py

MongoDB document model for meetings — follows DOIT model conventions.
"""

from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field
from bson import ObjectId


class MeetingNote(BaseModel):
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # user_id string


class MeetingDocument(BaseModel):
    """Mirrors the MongoDB document shape for a meeting."""
    user_id:      str
    title:        str
    description:  str                   = ""
    start_time:   datetime
    duration:     int                   = 60   # minutes
    participants: List[str]             = []
    notes:        List[MeetingNote]     = []
    created_at:   datetime              = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at:   Optional[datetime]    = None