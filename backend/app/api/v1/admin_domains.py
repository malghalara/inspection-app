from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.user import User
from app.models.domain import Domain
from app.models.question import Question
from app.schemas.domain import DomainCreateRequest, DomainUpdateRequest, DomainResponse, ReorderRequest
from app.api.deps import get_current_admin

router = APIRouter(prefix="/admin/domains", tags=["admin-domains"])

def to_response(d: Domain) -> DomainResponse:
    return DomainResponse(
        id=str(d.id),
        title=d.title,
        passing_criteria_percent=d.passing_criteria_percent,
        order=d.order,
        is_active=d.is_active,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )

@router.get("", response_model=list[DomainResponse])
async def list_domains(admin: User = Depends(get_current_admin), include_inactive: bool = Query(False)):
    query_filters = {} if include_inactive else {"is_active": True}
    domains = await Domain.find(query_filters).sort(Domain.order).to_list()
    return [to_response(d) for d in domains]

@router.post("", response_model=DomainResponse, status_code=201)
async def create_domain(payload: DomainCreateRequest, admin: User = Depends(get_current_admin)):
    existing = await Domain.find_one(Domain.title == payload.title, Domain.is_active == True)
    if existing:
        raise HTTPException(status_code=409, detail="A domain with this title already exists")

    order = payload.order
    if order is None:
        last_list = await Domain.find(Domain.is_active == True).sort(-Domain.order).limit(1).to_list()
        order = (last_list[0].order + 1) if last_list else 1

    domain = Domain(title=payload.title, passing_criteria_percent=payload.passing_criteria_percent, order=order)
    await domain.insert()
    return to_response(domain)

@router.get("/{domain_id}", response_model=DomainResponse)
async def get_domain(domain_id: str, admin: User = Depends(get_current_admin)):
    domain = await Domain.get(domain_id)
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    return to_response(domain)

@router.patch("/{domain_id}", response_model=DomainResponse)
async def update_domain(domain_id: str, payload: DomainUpdateRequest, admin: User = Depends(get_current_admin)):
    domain = await Domain.get(domain_id)
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    if payload.title is not None and payload.title != domain.title:
        existing = await Domain.find_one(Domain.title == payload.title, Domain.is_active == True)
        if existing and str(existing.id) != domain_id:
            raise HTTPException(status_code=409, detail="A domain with this title already exists")
        domain.title = payload.title

    if payload.passing_criteria_percent is not None:
        domain.passing_criteria_percent = payload.passing_criteria_percent

    if payload.order is not None:
        domain.order = payload.order

    domain.updated_at = datetime.utcnow()
    await domain.save()
    return to_response(domain)

@router.delete("/{domain_id}")
async def delete_domain(domain_id: str, force: bool = Query(False), admin: User = Depends(get_current_admin)):
    domain = await Domain.get(domain_id)
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    if not force:
        question_count = await Question.find(
            Question.domain_id == domain_id, Question.is_active == True
        ).count()
        if question_count > 0:
            raise HTTPException(
                status_code=409,
                detail=f"Domain has {question_count} active question(s). Pass ?force=true to delete anyway.",
            )

    domain.is_active = False
    domain.updated_at = datetime.utcnow()
    await domain.save()
    return {"message": "Domain deleted"}

@router.post("/reorder")
async def reorder_domains(payload: ReorderRequest, admin: User = Depends(get_current_admin)):
    domains = await Domain.find(Domain.is_active == True).to_list()
    domain_map = {str(d.id): d for d in domains}

    if set(payload.ordered_ids) != set(domain_map.keys()):
        raise HTTPException(status_code=400, detail="ordered_ids must include exactly all active domain IDs")

    for index, domain_id in enumerate(payload.ordered_ids):
        domain = domain_map[domain_id]
        domain.order = index + 1
        domain.updated_at = datetime.utcnow()
        await domain.save()

    return {"message": "Domains reordered"}