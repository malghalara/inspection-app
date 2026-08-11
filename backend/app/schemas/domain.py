from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class DomainCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    passing_criteria_percent: int = Field(..., ge=1, le=100)
    order: Optional[int] = None

class DomainUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    passing_criteria_percent: Optional[int] = Field(None, ge=1, le=100)
    order: Optional[int] = None

class DomainResponse(BaseModel):
    id: str
    title: str
    passing_criteria_percent: int
    order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

class ReorderRequest(BaseModel):
    ordered_ids: list[str]