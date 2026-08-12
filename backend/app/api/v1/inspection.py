from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.models.domain import Domain
from app.models.question import Question
from app.models.answer import Answer
from app.models.inspection import Inspection
from app.schemas.answer import AnswerUpsertRequest, AnswerResponse
from app.schemas.inspection import DomainProgress, InspectionProgressResponse, QuestionWithAnswerResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/inspection", tags=["inspection"])


def is_answered(question: Question, answer: Answer | None) -> bool:
    if not answer or answer.value is None:
        return False
    if question.proof_required and len(answer.proof_files) == 0:
        return False
    return True


async def get_or_create_inspection(user_id: str) -> Inspection:
    inspection = await Inspection.find_one(Inspection.user_id == user_id)
    if not inspection:
        inspection = Inspection(user_id=user_id)
        await inspection.insert()
    return inspection


async def compute_domain_progress(user_id: str) -> list[DomainProgress]:
    """
    FR-8.1/8.2 scoring engine. Computed live on every call (FR-8.4 option (a)) —
    no cached projection, so results are always consistent with the current
    domains/questions/answers state, at the cost of recomputing on every read.
    """
    domains = await Domain.find(Domain.is_active == True).sort(Domain.order).to_list()
    answers = await Answer.find(Answer.user_id == user_id).to_list()
    answer_map = {a.question_id: a for a in answers}

    result: list[DomainProgress] = []
    for d in domains:
        questions = await Question.find(
            Question.domain_id == str(d.id), Question.is_active == True
        ).to_list()

        total = len(questions)
        answered = 0
        yes_count = 0
        no_count = 0
        na_count = 0
        has_critical_no = False

        for q in questions:
            a = answer_map.get(str(q.id))
            if is_answered(q, a):
                answered += 1
                if a.value == "Yes":
                    yes_count += 1
                elif a.value == "No":
                    no_count += 1
                    if q.is_critical:
                        has_critical_no = True
                elif a.value == "N/A":
                    na_count += 1

        applicable = total - na_count
        # FR-8.1: guard divide-by-zero when every question is N/A -> treat as 100%
        score_percent = 100.0 if applicable <= 0 else round((yes_count / applicable) * 100, 1)

        # FR-8.2 precedence
        if has_critical_no:
            status = "failed"
        elif answered < total:
            status = "in_progress"
        elif score_percent >= d.passing_criteria_percent:
            status = "passed"
        else:
            status = "failed"

        result.append(
            DomainProgress(
                domain_id=str(d.id),
                title=d.title,
                order=d.order,
                passing_criteria_percent=d.passing_criteria_percent,
                answered_count=answered,
                total_count=total,
                yes_count=yes_count,
                no_count=no_count,
                na_count=na_count,
                score_percent=score_percent,
                domain_status=status,
            )
        )
    return result


@router.get("/progress", response_model=InspectionProgressResponse)
async def get_progress(user: User = Depends(get_current_user)):
    user_id = str(user.id)
    inspection = await get_or_create_inspection(user_id)
    domain_progress = await compute_domain_progress(user_id)

    # FR-8.3
    if any(d.domain_status == "failed" for d in domain_progress):
        overall_status = "failed"
    elif all(d.domain_status == "passed" for d in domain_progress):
        overall_status = "passed"
    else:
        overall_status = "in_progress"

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

    result = []
    for q in questions:
        a = answer_map.get(str(q.id))
        result.append(
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
                value=(a.value if a else None),
                proof_files=(a.proof_files if a else []),
            )
        )
    return result


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
    domain_progress = await compute_domain_progress(user_id)

    if any(d.answered_count < d.total_count for d in domain_progress):
        raise HTTPException(status_code=400, detail="All questions must be answered before final submission")

    # FR-8.3
    if any(d.domain_status == "failed" for d in domain_progress):
        overall_status = "failed"
    else:
        overall_status = "passed"

    inspection.status = "submitted"
    inspection.submitted_at = datetime.utcnow()
    inspection.overall_status = overall_status
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