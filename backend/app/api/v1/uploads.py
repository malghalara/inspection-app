import uuid
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer, ProofFile
from app.api.deps import get_current_user

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads"
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

@router.post("/proof")
async def upload_proof_file(
    question_id: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    question = await Question.get(question_id)
    if not question or not question.is_active:
        raise HTTPException(status_code=404, detail="Question not found")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP, or PDF files are allowed")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    user_id = str(user.id)
    user_dir = UPLOAD_DIR / user_id / question_id
    user_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = user_dir / safe_filename
    with open(file_path, "wb") as f:
        f.write(contents)

    url = f"/uploads/{user_id}/{question_id}/{safe_filename}"

    answer = await Answer.find_one(Answer.user_id == user_id, Answer.question_id == question_id)
    now = datetime.utcnow()
    proof_entry = ProofFile(
        url=url,
        filename=file.filename,
        size_bytes=len(contents),
        mime_type=file.content_type,
        uploaded_at=now,
    )

    if answer:
        answer.proof_files.append(proof_entry)
        answer.updated_at = now
        await answer.save()
    else:
        answer = Answer(
            user_id=user_id,
            question_id=question_id,
            domain_id=question.domain_id,
            proof_files=[proof_entry],
            updated_at=now,
        )
        await answer.insert()

    return {
        "question_id": answer.question_id,
        "domain_id": answer.domain_id,
        "value": answer.value,
        "proof_files": [pf.model_dump() for pf in answer.proof_files],
    }