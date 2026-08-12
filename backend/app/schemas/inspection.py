from pydantic import BaseModel
from typing import Optional, Literal
from app.models.answer import ProofFile


class DomainProgress(BaseModel):
    domain_id: str
    title: str
    order: int
    passing_criteria_percent: int
    answered_count: int
    total_count: int
    domain_status: Literal["in_progress", "failed", "complete"]


class InspectionProgressResponse(BaseModel):
    inspection_status: Literal["in_progress", "submitted"]
    overall_status: Literal["in_progress", "passed", "failed"]
    domains: list[DomainProgress]


class QuestionWithAnswerResponse(BaseModel):
    id: str
    title: str
    domain_id: str
    options: list[str]
    is_critical: bool
    proof_required: bool
    order: int
    reference_code: Optional[str] = None
    regulation_tag: Optional[str] = None
    value: Optional[str] = None
    proof_files: list[ProofFile] = []