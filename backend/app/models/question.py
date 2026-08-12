from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional

class Question(Document):
    title: str
    domain_id: str
    options: list[str] = Field(default=["Yes", "No", "N/A"])
    is_critical: bool = False
    proof_required: bool = False
    order: int
    reference_code: Optional[str] = None
    regulation_tag: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "questions"