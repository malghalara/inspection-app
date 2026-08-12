from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.models.domain import Domain
from app.models.question import Question
from app.models.answer import Answer
from app.models.inspection import Inspection
from app.schemas.answer import AnswerUpsertRequest, AnswerResponse
from app.schemas.inspection import DomainProgress, InspectionProgressResponse, QuestionWithAnswerResponse
from app.api.deps import get_current_user  # NOTE: confirm this is the actual name in your deps.py —
# it should be the dependency used for a logged-in, verified, active user (not admin-only).
# If yours is named differently (e.g. get_current_active_user), just swap the import/usage below.

router = APIRouter(prefix="/inspection", tags=["inspection"])


async def get_or_create_inspection(user_id: str) -> Inspection:
    inspection = await Inspection.find_one(Inspection.user_id == user_id)
    if not inspection:
        inspection = Inspection(user_id=user_id)
        await inspection.insert()
    return inspection


@router.get("/progress", response_model=InspectionProgressResponse)
async def get_progress(user: User = Depends(get_current_user)):
    user_id = str(user.id)
    inspection = await get_or_create_inspection(user_id)

    domains = await Domain.find(Domain.is_active == True).sort(Domain.order).to_list()
    answers = await Answer.find(Answer.user_id == user_id).to_list()
    answer_map = {a.question_id: a for a in answers}

    domain_progress: list[DomainProgress] = []
    for d in domains:
        questions = await Question.find(
            Question.domain_id == str(d.id), Question.is_active == True
        ).to_list()
        total = len(questions)
        answered = 0
        has_critical_no = False
        for q in questions:
            a = answer_map.get(str(q.id))
            if a and a.value is not None:
                # TODO (M7): once file uploads exist, proof_required questions should only
                # count as answered once at least one proof file is attached (FR-6.5).
                answered += 1
                if q.is_critical and a.value == "No":
                    has_critical_no = True

        if has_critical_no:
            status = "failed"
        elif answered < total:
            status = "in_progress"
        else:
            status = "complete"  # real pass/fail % scoring is M8

        domain_progress.append(
            DomainProgress(
                domain_id=str(d.id),
                title=d.title,
                order=d.order,
                passing_criteria_percent=d.passing_criteria_percent,
                answered_count=answered,
                total_count=total,
                domain_status=status,
            )
        )

    overall_status = inspection.overall_status if inspection.status == "submitted" else "in_progress"

    return InspectionProgressResponse(
        inspection_status=inspection.status,
        overall_status=overall_status,
        domains=domain_progress,
    )


@router.get("/domains/{domain_id}/questions", response_model=list[QuestionWithAnswerResponse])
async def get_domain_questions(domain_id: str, user: User = Depends(get_current_user)):
    domain = await Domain.get(domain_id)
    if not domain or not domain.is_active:
        raise HTTPException(status_code=404, detail="Domain not found")

    questions = await Question.find(
        Question.domain_id == domain_id, Question.is_active == True
    ).sort(Question.order).to_list()

    user_id = str(user.id)
    answers = await Answer.find(Answer.user_id == user_id, Answer.domain_id == domain_id).to_list()
    answer_map = {a.question_id: a for a in answers}

    return [
        QuestionWithAnswerResponse(
            id=str(q.id),
            title=q.title,
            domain_id=q.domain_id,
            options=q.options,
            is_critical=q.is_critical,
            proof_required=q.proof_required,
            order=q.order,
            reference_code=q.reference_code,
            regulation_tag=q.regulation_tag,
            value=(answer_map[str(q.id)].value if str(q.id) in answer_map else None),
        )
        for q in questions
    ]


@router.put("/answers", response_model=AnswerResponse)
async def upsert_answer(payload: AnswerUpsertRequest, user: User = Depends(get_current_user)):
    inspection = await get_or_create_inspection(str(user.id))
    if inspection.status == "submitted":
        raise HTTPException(status_code=403, detail="Inspection is submitted; reopen it to edit answers")

    question = await Question.get(payload.question_id)
    if not question or not question.is_active:
        raise HTTPException(status_code=404, detail="Question not found")

    user_id = str(user.id)
    answer = await Answer.find_one(Answer.user_id == user_id, Answer.question_id == payload.question_id)
    now = datetime.utcnow()
    if answer:
        answer.value = payload.value
        answer.answered_at = now
        answer.updated_at = now
        await answer.save()
    else:
        answer = Answer(
            user_id=user_id,
            question_id=payload.question_id,
            domain_id=question.domain_id,
            value=payload.value,
            answered_at=now,
            updated_at=now,
        )
        await answer.insert()

    return AnswerResponse(question_id=answer.question_id, domain_id=answer.domain_id, value=answer.value)


@router.post("/submit")
async def submit_inspection(user: User = Depends(get_current_user)):
    user_id = str(user.id)
    inspection = await get_or_create_inspection(user_id)

    domains = await Domain.find(Domain.is_active == True).to_list()
    answers = await Answer.find(Answer.user_id == user_id).to_list()
    answer_map = {a.question_id: a for a in answers}

    any_incomplete = False
    any_failed = False
    for d in domains:
        questions = await Question.find(
            Question.domain_id == str(d.id), Question.is_active == True
        ).to_list()
        for q in questions:
            a = answer_map.get(str(q.id))
            if not a or a.value is None:
                any_incomplete = True
            if q.is_critical and a and a.value == "No":
                any_failed = True

    if any_incomplete:
        raise HTTPException(status_code=400, detail="All questions must be answered before final submission")

    inspection.status = "submitted"
    inspection.submitted_at = datetime.utcnow()
    # TODO (M8): replace this critical-fail-only check with real percentage-based
    # domain/overall scoring per FR-8.1-8.3 once the scoring engine is built.
    inspection.overall_status = "failed" if any_failed else "passed"
    inspection.updated_at = datetime.utcnow()
    await inspection.save()

    return {"message": "Inspection submitted", "overall_status": inspection.overall_status}


@router.post("/reopen")
async def reopen_inspection(user: User = Depends(get_current_user)):
    inspection = await get_or_create_inspection(str(user.id))
    inspection.status = "in_progress"
    inspection.submitted_at = None
    inspection.updated_at = datetime.utcnow()
    await inspection.save()
    return {"message": "Inspection reopened"}