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
    yes_count: int
    no_count: int
    na_count: int
    score_percent: float
    domain_status: Literal["in_progress", "passed", "failed"]


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


class AdminQuestionSubmission(BaseModel):
    id: str
    title: str
    options: list[str]
    is_critical: bool
    proof_required: bool
    order: int
    reference_code: Optional[str] = None
    regulation_tag: Optional[str] = None
    value: Optional[str] = None
    proof_files: list[ProofFile] = []


class AdminDomainSubmission(BaseModel):
    domain_id: str
    title: str
    order: int
    passing_criteria_percent: int
    questions: list[AdminQuestionSubmission]


class AdminUserSubmissionResponse(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    inspection_status: Literal["in_progress", "submitted"]
    overall_status: Literal["in_progress", "passed", "failed"]
    domains: list[AdminDomainSubmission]