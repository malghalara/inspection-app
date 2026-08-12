from typing import Optional
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.models.user import User
from app.models.domain import Domain
from app.models.question import Question
from app.models.answer import Answer
from app.models.inspection import Inspection
from app.schemas.inspection import AdminUserSubmissionResponse
from app.api.deps import get_current_admin

router = APIRouter(prefix="/admin/users", tags=["admin-users"])

class UserListItem(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool
    is_verified: bool
    inspection_status: Optional[str] = None
    overall_status: Optional[str] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None

class UserListResponse(BaseModel):
    items: list[UserListItem]
    total: int
    page: int
    page_size: int

class RoleUpdateRequest(BaseModel):
    role: str

class ActiveUpdateRequest(BaseModel):
    is_active: bool

@router.get("", response_model=UserListResponse)
async def list_users(
    admin: User = Depends(get_current_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    has_inspection: Optional[bool] = Query(None),
    inspection_status: Optional[str] = Query(None),
    overall_status: Optional[str] = Query(None),
):
    if role is not None and role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role filter")
    if inspection_status is not None and inspection_status not in ("in_progress", "submitted"):
        raise HTTPException(status_code=400, detail="Invalid inspection_status filter")
    if overall_status is not None and overall_status not in ("in_progress", "passed", "failed"):
        raise HTTPException(status_code=400, detail="Invalid overall_status filter")

    query_filters: dict = {}
    if role:
        query_filters["role"] = role
    if is_active is not None:
        query_filters["is_active"] = is_active
    if search:
        query_filters["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    inspection_filters: dict = {}
    if inspection_status is not None:
        inspection_filters["status"] = inspection_status
    if overall_status is not None:
        inspection_filters["overall_status"] = overall_status

    if has_inspection or inspection_filters:
        inspections = await Inspection.find(inspection_filters).to_list()
        if not inspections:
            return UserListResponse(items=[], total=0, page=page, page_size=page_size)

        user_ids = [ObjectId(i.user_id) for i in inspections if ObjectId.is_valid(i.user_id)]
        if not user_ids:
            return UserListResponse(items=[], total=0, page=page, page_size=page_size)

        query_filters["_id"] = {"$in": user_ids}

    total = await User.find(query_filters).count()
    skip = (page - 1) * page_size
    users = await User.find(query_filters).sort(-User.created_at).skip(skip).limit(page_size).to_list()

    user_ids_str = [str(u.id) for u in users]
    inspections = await Inspection.find({"user_id": {"$in": user_ids_str}}).to_list() if users else []
    inspection_map = {i.user_id: i for i in inspections}

    items = [
        UserListItem(
            id=str(u.id),
            name=u.name,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            is_verified=u.is_verified,
            inspection_status=inspection_map.get(str(u.id)).status if inspection_map.get(str(u.id)) else None,
            overall_status=inspection_map.get(str(u.id)).overall_status if inspection_map.get(str(u.id)) else None,
            created_at=u.created_at,
            last_login_at=u.last_login_at,
        )
        for u in users
    ]

    return UserListResponse(items=items, total=total, page=page, page_size=page_size)

@router.get("/{user_id}/inspection", response_model=AdminUserSubmissionResponse)
async def get_user_inspection_submission(user_id: str, admin: User = Depends(get_current_admin)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    inspection = await Inspection.find_one(Inspection.user_id == user_id)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found for user")

    domains = await Domain.find(Domain.is_active == True).sort(Domain.order).to_list()
    questions = await Question.find(Question.is_active == True).sort(Question.order).to_list()
    answers = await Answer.find(Answer.user_id == user_id).to_list()
    answer_map = {a.question_id: a for a in answers}

    domains_payload = []
    for domain in domains:
        domain_questions = [q for q in questions if q.domain_id == str(domain.id)]
        question_payload = [
            {
                "id": str(q.id),
                "title": q.title,
                "options": q.options,
                "is_critical": q.is_critical,
                "proof_required": q.proof_required,
                "order": q.order,
                "reference_code": q.reference_code,
                "regulation_tag": q.regulation_tag,
                "value": answer_map.get(str(q.id)).value if answer_map.get(str(q.id)) else None,
                "proof_files": answer_map.get(str(q.id)).proof_files if answer_map.get(str(q.id)) else [],
            }
            for q in domain_questions
        ]
        domains_payload.append(
            {
                "domain_id": str(domain.id),
                "title": domain.title,
                "order": domain.order,
                "passing_criteria_percent": domain.passing_criteria_percent,
                "questions": question_payload,
            }
        )

    return AdminUserSubmissionResponse(
        user_id=str(user.id),
        user_name=user.name,
        user_email=user.email,
        inspection_status=inspection.status,
        overall_status=inspection.overall_status,
        domains=domains_payload,
    )

@router.patch("/{user_id}/role")
async def update_role(user_id: str, payload: RoleUpdateRequest, admin: User = Depends(get_current_admin)):
    if payload.role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    await user.save()
    return {"message": f"Role updated to {payload.role}"}

@router.patch("/{user_id}/active")
async def update_active(user_id: str, payload: ActiveUpdateRequest, admin: User = Depends(get_current_admin)):
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = payload.is_active
    await user.save()
    return {"message": f"is_active set to {payload.is_active}"}