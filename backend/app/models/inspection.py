from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, Literal


class Inspection(Document):
    user_id: str
    status: Literal["in_progress", "submitted"] = "in_progress"
    submitted_at: Optional[datetime] = None
    overall_status: Literal["in_progress", "passed", "failed"] = "in_progress"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "inspections"