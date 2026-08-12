from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.user import User
from app.models.question import Question
from app.models.domain import Domain
from app.schemas.question import (
    QuestionCreateRequest,
    QuestionUpdateRequest,
    QuestionResponse,
    ReorderRequest,
)
from app.api.deps import get_current_admin

router = APIRouter(prefix="/admin/questions", tags=["admin-questions"])


def to_response(q: Question) -> QuestionResponse:
    return QuestionResponse(
        id=str(q.id),
        title=q.title,
        domain_id=q.domain_id,
        options=q.options,
        is_critical=q.is_critical,
        proof_required=q.proof_required,
        order=q.order,
        reference_code=q.reference_code,
        regulation_tag=q.regulation_tag,
        is_active=q.is_active,
        created_at=q.created_at,
        updated_at=q.updated_at,
    )


async def get_active_domain_or_404(domain_id: str) -> Domain:
    domain = await Domain.get(domain_id)
    if not domain or not domain.is_active:
        raise HTTPException(status_code=404, detail="Domain not found")
    return domain


@router.get("", response_model=list[QuestionResponse])
async def list_questions(
    admin: User = Depends(get_current_admin),
    domain_id: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
):
    query_filters: dict = {} if include_inactive else {"is_active": True}
    if domain_id:
        query_filters["domain_id"] = domain_id
    questions = await Question.find(query_filters).sort(Question.order).to_list()
    return [to_response(q) for q in questions]


@router.post("", response_model=QuestionResponse, status_code=201)
async def create_question(payload: QuestionCreateRequest, admin: User = Depends(get_current_admin)):
    await get_active_domain_or_404(payload.domain_id)

    order = payload.order
    if order is None:
        last_list = (
            await Question.find(Question.domain_id == payload.domain_id, Question.is_active == True)
            .sort(-Question.order)
            .limit(1)
            .to_list()
        )
        order = (last_list[0].order + 1) if last_list else 1

    question = Question(
        title=payload.title,
        domain_id=payload.domain_id,
        is_critical=payload.is_critical,
        proof_required=payload.proof_required,
        order=order,
        reference_code=payload.reference_code,
        regulation_tag=payload.regulation_tag,
    )
    await question.insert()
    return to_response(question)


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(question_id: str, admin: User = Depends(get_current_admin)):
    question = await Question.get(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return to_response(question)


@router.patch("/{question_id}", response_model=QuestionResponse)
async def update_question(
    question_id: str, payload: QuestionUpdateRequest, admin: User = Depends(get_current_admin)
):
    question = await Question.get(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if payload.domain_id is not None and payload.domain_id != question.domain_id:
        await get_active_domain_or_404(payload.domain_id)
        question.domain_id = payload.domain_id

    if payload.title is not None:
        question.title = payload.title
    if payload.is_critical is not None:
        question.is_critical = payload.is_critical
    if payload.proof_required is not None:
        question.proof_required = payload.proof_required
    if payload.order is not None:
        question.order = payload.order
    if payload.reference_code is not None:
        question.reference_code = payload.reference_code
    if payload.regulation_tag is not None:
        question.regulation_tag = payload.regulation_tag

    question.updated_at = datetime.utcnow()
    await question.save()
    return to_response(question)


@router.delete("/{question_id}")
async def delete_question(question_id: str, force: bool = Query(False), admin: User = Depends(get_current_admin)):
    question = await Question.get(question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # TODO (M6): once the Submission/Answer model exists, block deletion with 409 if this
    # question has submitted answers, unless force=true (per FR-5.2). Not yet implemented
    # because M6 (Inspection Submission) hasn't been built yet.

    question.is_active = False
    question.updated_at = datetime.utcnow()
    await question.save()
    return {"message": "Question deleted"}


@router.post("/reorder")
async def reorder_questions(payload: ReorderRequest, admin: User = Depends(get_current_admin)):
    if not payload.ordered_ids:
        raise HTTPException(status_code=400, detail="ordered_ids cannot be empty")

    id_set = set(payload.ordered_ids)
    questions = await Question.find(Question.is_active == True).to_list()
    relevant = [q for q in questions if str(q.id) in id_set]
    question_map = {str(q.id): q for q in relevant}

    if set(question_map.keys()) != id_set:
        raise HTTPException(status_code=400, detail="ordered_ids must reference existing active questions")

    domain_ids = {q.domain_id for q in relevant}
    if len(domain_ids) > 1:
        raise HTTPException(status_code=400, detail="ordered_ids must all belong to the same domain")

    for index, question_id in enumerate(payload.ordered_ids):
        question = question_map[question_id]
        question.order = index + 1
        question.updated_at = datetime.utcnow()
        await question.save()

    return {"message": "Questions reordered"}