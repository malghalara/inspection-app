from beanie import Document
from pydantic import BaseModel, Field
from pymongo import IndexModel, ASCENDING
from datetime import datetime
from typing import Optional, Literal


class ProofFile(BaseModel):
    url: str
    filename: str
    size_bytes: int
    mime_type: str
    uploaded_at: datetime


class Answer(Document):
    user_id: str
    question_id: str
    domain_id: str
    value: Optional[Literal["Yes", "No", "N/A"]] = None
    proof_files: list[ProofFile] = Field(default_factory=list)  # populated in M7
    answered_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "answers"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("question_id", ASCENDING)], unique=True),
        ]