from beanie import Document
from pydantic import Field
from datetime import datetime

class Domain(Document):
    title: str
    passing_criteria_percent: int
    order: int
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "domains"