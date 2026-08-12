from pydantic import BaseModel
from typing import Optional, Literal


class AnswerUpsertRequest(BaseModel):
    question_id: str
    value: Literal["Yes", "No", "N/A"]


class AnswerResponse(BaseModel):
    question_id: str
    domain_id: str
    value: Optional[str] = None