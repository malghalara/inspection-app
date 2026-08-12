from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class QuestionCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    domain_id: str
    is_critical: bool = False
    proof_required: bool = False
    order: Optional[int] = None
    reference_code: Optional[str] = Field(None, max_length=50)
    regulation_tag: Optional[str] = Field(None, max_length=50)

class QuestionUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    domain_id: Optional[str] = None
    is_critical: Optional[bool] = None
    proof_required: Optional[bool] = None
    order: Optional[int] = None
    reference_code: Optional[str] = Field(None, max_length=50)
    regulation_tag: Optional[str] = Field(None, max_length=50)

class QuestionResponse(BaseModel):
    id: str
    title: str
    domain_id: str
    options: list[str]
    is_critical: bool
    proof_required: bool
    order: int
    reference_code: Optional[str] = None
    regulation_tag: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

class ReorderRequest(BaseModel):
    ordered_ids: list[str]